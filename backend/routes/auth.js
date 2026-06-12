const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const authMW = require('../middleware/auth');
const LoginActivity = require('../models/LoginActivity');
const bcrypt = require('bcryptjs');
const { sendMail } = require('../utils/mailer');
const { validatePassword } = require('../utils/password');
const Pending = require('../models/PendingRegistration');
const { athleteLimitFor } = require('../utils/plans');
const COACH_FULL_MSG = 'Tu profesor alcanzó el límite de alumnos de su plan. Pedile que actualice su plan.';
const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || 'brnab84@gmail.com').toLowerCase();
const JWT_SECRET = process.env.JWT_SECRET || 'funcional_jwt_secret_2024';
const sign = (id) => jwt.sign({ id }, JWT_SECRET, { expiresIn: '30d' });
const CODE_TTL_MS = 15 * 60 * 1000;
const genCode = () => String(Math.floor(100000 + Math.random() * 900000));
const userPayload = (u) => ({ id: u._id, name: u.name, email: u.email, role: u.role, coachId: u.coachId, plan: u.plan, planStatus: u.planStatus, settings: u.settings, sports: u.sports });

function verificationEmail(name, code) {
  return {
    subject: 'Tu código de verificación — Functional WOD',
    text: 'Hola ' + name + ',\n\nTu código de verificación es: ' + code + '\n\nVence en 15 minutos. Si no creaste esta cuenta, ignorá este correo.',
    html: '<div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#1c2026">'
      + '<h2 style="color:#0d0f12">Functional WOD</h2>'
      + '<p>Hola <strong>' + name + '</strong>, gracias por registrarte.</p>'
      + '<p>Tu código de verificación es:</p>'
      + '<div style="font-size:32px;font-weight:bold;letter-spacing:8px;background:#f4f5f7;border-radius:10px;padding:16px;text-align:center;margin:16px 0">' + code + '</div>'
      + '<p style="color:#6b7280;font-size:13px">Vence en 15 minutos. Si no creaste esta cuenta, ignorá este correo.</p>'
      + '</div>'
  };
}

function resetEmail(name, code) {
  return {
    subject: 'Código para restablecer tu contraseña — Functional WOD',
    text: 'Hola ' + name + ',\n\nTu código para restablecer la contraseña es: ' + code + '\n\nVence en 15 minutos. Si no lo pediste, ignorá este correo (tu contraseña no cambia).',
    html: '<div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#1c2026">'
      + '<h2 style="color:#0d0f12">Functional WOD</h2>'
      + '<p>Hola <strong>' + name + '</strong>, pediste restablecer tu contraseña.</p>'
      + '<p>Tu código es:</p>'
      + '<div style="font-size:32px;font-weight:bold;letter-spacing:8px;background:#f4f5f7;border-radius:10px;padding:16px;text-align:center;margin:16px 0">' + code + '</div>'
      + '<p style="color:#6b7280;font-size:13px">Vence en 15 minutos. Si no lo pediste, ignorá este correo (tu contraseña no cambia).</p>'
      + '</div>'
  };
}

router.post('/register', async (req, res) => {
  try {
    const { name, email, password, role, inviteCode } = req.body;
    if (!name || !email || !password) return res.status(400).json({ message: 'All fields required' });
    const pwErr = validatePassword(password);
    if (pwErr) return res.status(400).json({ message: pwErr });
    const lowEmail = String(email).toLowerCase();

    // Public signup = coach or solo-athlete. Coached athletes ONLY via a coach's invite link.
    let safeRole = role === 'coach' ? 'coach' : 'athlete';
    let coachId = null;
    if (inviteCode) {
      const coach = await User.findOne({ inviteCode: inviteCode });
      if (!coach) return res.status(400).json({ message: 'Invalid or expired invite link' });
      safeRole = 'athlete';
      coachId = coach._id;
      const limit = athleteLimitFor(coach.plan);
      if (limit !== Infinity && (await User.countDocuments({ coachId: coach._id })) >= limit) {
        return res.status(403).json({ message: COACH_FULL_MSG });
      }
    }

    const code = genCode();
    const expires = new Date(Date.now() + CODE_TTL_MS);

    // A verified account already owns this email
    const existing = await User.findOne({ email: lowEmail });
    if (existing && existing.emailVerified) return res.status(400).json({ message: 'Email already registered' });
    // Clean up any legacy unverified User (old flow) so it doesn't block the new pending one
    if (existing && !existing.emailVerified) await User.deleteOne({ _id: existing._id });

    // Do NOT create the account yet — store a pending signup; the User is created
    // only after the code is confirmed (POST /verify).
    const passwordHash = await bcrypt.hash(password, 12);
    await Pending.findOneAndUpdate(
      { email: lowEmail },
      { name, email: lowEmail, passwordHash, role: safeRole, coachId: coachId, code, expiresAt: expires, createdAt: new Date() },
      { upsert: true, setDefaultsOnInsert: true }
    );
    const m = verificationEmail(name, code);
    const sent = await sendMail({ to: lowEmail, subject: m.subject, text: m.text, html: m.html });
    res.status(201).json({ needsVerification: true, email: lowEmail, mailSent: !!sent.ok });
  } catch(err) { res.status(500).json({ message: err.message }); }
});

// POST /api/auth/verify — confirm the 6-digit code; creates the account, then logs in
router.post('/verify', async (req, res) => {
  try {
    const { email, code } = req.body;
    if (!email || !code) return res.status(400).json({ message: 'Email and code required' });
    const lowEmail = String(email).toLowerCase();
    const inputCode = String(code).trim();

    // New flow: a pending signup
    const pending = await Pending.findOne({ email: lowEmail });
    if (pending) {
      if (pending.code !== inputCode) return res.status(400).json({ message: 'Incorrect code' });
      if (pending.expiresAt && pending.expiresAt < new Date()) { await Pending.deleteOne({ _id: pending._id }); return res.status(400).json({ message: 'Code expired — request a new one' }); }
      // Guard against a race where the account already exists
      let user = await User.findOne({ email: lowEmail });
      if (!user) {
        if (pending.coachId) {
          const coach = await User.findById(pending.coachId);
          const limit = athleteLimitFor(coach ? coach.plan : 'free');
          if (limit !== Infinity && (await User.countDocuments({ coachId: pending.coachId })) >= limit) {
            return res.status(403).json({ message: COACH_FULL_MSG });
          }
        }
        user = await User.create({
          name: pending.name, email: lowEmail, password: pending.passwordHash,
          role: pending.role, coachId: pending.coachId, emailVerified: true,
          sports: [{ type: 'functional', active: true }]
        });
      }
      await Pending.deleteOne({ _id: pending._id });
      user.lastLogin = new Date();
      user.loginCount = (user.loginCount || 0) + 1;
      await user.save();
      return res.json({ token: sign(user._id), user: userPayload(user) });
    }

    // Legacy flow: an unverified User created before pending registrations existed
    const user = await User.findOne({ email: lowEmail });
    if (!user) return res.status(404).json({ message: 'Account not found' });
    if (user.emailVerified) return res.json({ token: sign(user._id), user: userPayload(user) });
    if (!user.verificationCode || user.verificationCode !== inputCode) return res.status(400).json({ message: 'Incorrect code' });
    if (user.verificationExpires && user.verificationExpires < new Date()) return res.status(400).json({ message: 'Code expired — request a new one' });
    user.emailVerified = true;
    user.verificationCode = null;
    user.verificationExpires = null;
    user.lastLogin = new Date();
    user.loginCount = (user.loginCount || 0) + 1;
    await user.save();
    res.json({ token: sign(user._id), user: userPayload(user) });
  } catch(err) { res.status(500).json({ message: err.message }); }
});

// POST /api/auth/resend-code — send a fresh verification code
router.post('/resend-code', async (req, res) => {
  try {
    const lowEmail = String(req.body.email || '').toLowerCase();
    const code = genCode();
    const expires = new Date(Date.now() + CODE_TTL_MS);

    const pending = await Pending.findOne({ email: lowEmail });
    if (pending) {
      pending.code = code;
      pending.expiresAt = expires;
      await pending.save();
      const m = verificationEmail(pending.name, code);
      const sent = await sendMail({ to: pending.email, subject: m.subject, text: m.text, html: m.html });
      return res.json({ message: 'Code sent', mailSent: !!sent.ok });
    }

    const user = await User.findOne({ email: lowEmail });
    if (!user) return res.status(404).json({ message: 'Account not found' });
    if (user.emailVerified) return res.status(400).json({ message: 'Already verified — please log in' });
    user.verificationCode = code;
    user.verificationExpires = expires;
    await user.save();
    const m = verificationEmail(user.name, code);
    const sent = await sendMail({ to: user.email, subject: m.subject, text: m.text, html: m.html });
    res.json({ message: 'Code sent', mailSent: !!sent.ok });
  } catch(err) { res.status(500).json({ message: err.message }); }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
      // They may have started signing up but never confirmed the code
      const pend = await Pending.findOne({ email: String(email || '').toLowerCase() });
      if (pend) return res.status(403).json({ message: 'Confirmá tu email para activar la cuenta.', needsVerification: true, email: pend.email });
      return res.status(401).json({ message: 'Invalid email or password' });
    }
    if (!(await user.comparePassword(password))) return res.status(401).json({ message: 'Invalid email or password' });

    // Block login until the email is verified (legacy accounts default to verified)
    if (user.emailVerified === false) {
      return res.status(403).json({ message: 'Verificá tu email para continuar.', needsVerification: true, email: user.email });
    }

    // Auto-grant admin role to the configured root email
    if (user.email.toLowerCase() === ADMIN_EMAIL && user.role !== 'admin') {
      user.role = 'admin';
    }

    // Track login
    user.lastLogin = new Date();
    user.loginCount = (user.loginCount || 0) + 1;
    await user.save();

    // Record activity (non-blocking — don't fail login if this errors)
    try {
      await LoginActivity.create({
        user: user._id,
        email: user.email,
        name: user.name,
        ip: req.headers['x-forwarded-for'] || req.socket.remoteAddress || '',
        userAgent: req.headers['user-agent'] || ''
      });
    } catch (e) { console.log('Activity log error:', e.message); }

    res.json({ token: sign(user._id), user: { id: user._id, name: user.name, email: user.email, role: user.role, coachId: user.coachId, plan: user.plan, planStatus: user.planStatus, settings: user.settings, sports: user.sports } });
  } catch(err) { res.status(500).json({ message: err.message }); }
});

router.get('/me', authMW, (req, res) => res.json({ user: req.user }));

// GET /api/auth/invite/:code — public: validate a coach invite link, return coach name
router.get('/invite/:code', async (req, res) => {
  try {
    const coach = await User.findOne({ inviteCode: req.params.code }).select('name').lean();
    if (!coach) return res.status(404).json({ message: 'Invalid invite link' });
    res.json({ coachName: coach.name });
  } catch(err) { res.status(500).json({ message: err.message }); }
});

router.put('/settings', authMW, async (req, res) => {
  try {
    // Coached athletes don't manage settings (their coach drives their training)
    if (req.user.coachId) return res.status(403).json({ message: 'Settings are managed by your coach.' });
    const user = await User.findById(req.user._id);
    const { blockCount, blockModalities, avoidRepeatDays, defaultSport } = req.body;
    if (blockCount !== undefined) user.settings.blockCount = blockCount;
    if (blockModalities) user.settings.blockModalities = { ...user.settings.blockModalities, ...blockModalities };
    if (avoidRepeatDays !== undefined) user.settings.avoidRepeatDays = avoidRepeatDays;
    if (defaultSport) user.settings.defaultSport = defaultSport;
    if (req.body.theme) user.settings.theme = req.body.theme;
    if (req.body.poolLength) user.settings.poolLength = parseInt(req.body.poolLength);
    if (req.body.swimRestTimes) {
      var srt = req.body.swimRestTimes;
      if (srt.d50 !== undefined) user.settings.swimRestTimes.d50 = srt.d50;
      if (srt.d100 !== undefined) user.settings.swimRestTimes.d100 = srt.d100;
      if (srt.d200 !== undefined) user.settings.swimRestTimes.d200 = srt.d200;
      if (srt.d300 !== undefined) user.settings.swimRestTimes.d300 = srt.d300;
      if (srt.d400 !== undefined) user.settings.swimRestTimes.d400 = srt.d400;
      if (srt.d500 !== undefined) user.settings.swimRestTimes.d500 = srt.d500;
    }
    await user.save();
    res.json({ settings: user.settings });
  } catch(err) { res.status(500).json({ message: err.message }); }
});

router.post('/add-sport', authMW, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    const { sport } = req.body;
    if (!user.sports.find(s => s.type === sport)) { user.sports.push({ type: sport, active: true }); await user.save(); }
    res.json({ sports: user.sports });
  } catch(err) { res.status(500).json({ message: err.message }); }
});


// POST /api/auth/forgot-password — email a reset code (generic response, no email enumeration)
router.post('/forgot-password', async (req, res) => {
  try {
    const lowEmail = String(req.body.email || '').toLowerCase();
    if (!lowEmail) return res.status(400).json({ message: 'Email required' });
    const user = await User.findOne({ email: lowEmail });
    if (user && user.emailVerified !== false) {
      const code = genCode();
      user.resetCode = code;
      user.resetExpires = new Date(Date.now() + CODE_TTL_MS);
      await user.save();
      const m = resetEmail(user.name, code);
      await sendMail({ to: user.email, subject: m.subject, text: m.text, html: m.html });
    }
    // Always succeed so we don't reveal whether the email exists
    res.json({ message: 'If that email has an account, a reset code was sent.' });
  } catch(err) { res.status(500).json({ message: err.message }); }
});

// POST /api/auth/reset-password — verify the emailed code, then set the new password
router.post('/reset-password', async (req, res) => {
  try {
    const { email, code, newPassword } = req.body;
    if (!email || !code || !newPassword) return res.status(400).json({ message: 'Email, code and new password required' });
    const pwErr = validatePassword(newPassword);
    if (pwErr) return res.status(400).json({ message: pwErr });
    const user = await User.findOne({ email: String(email).toLowerCase() });
    if (!user || !user.resetCode || user.resetCode !== String(code).trim()) return res.status(400).json({ message: 'Incorrect or expired code' });
    if (user.resetExpires && user.resetExpires < new Date()) return res.status(400).json({ message: 'Code expired — request a new one' });
    user.password = newPassword;
    user.resetCode = null;
    user.resetExpires = null;
    await user.save();
    res.json({ message: 'Password updated successfully' });
  } catch(err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;





