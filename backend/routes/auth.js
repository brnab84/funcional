const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const authMW = require('../middleware/auth');
const LoginActivity = require('../models/LoginActivity');
const { sendMail } = require('../utils/mailer');
const { validatePassword } = require('../utils/password');
const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || 'brnab84@gmail.com').toLowerCase();
const JWT_SECRET = process.env.JWT_SECRET || 'funcional_jwt_secret_2024';
const sign = (id) => jwt.sign({ id }, JWT_SECRET, { expiresIn: '30d' });
const CODE_TTL_MS = 15 * 60 * 1000;
const genCode = () => String(Math.floor(100000 + Math.random() * 900000));
const userPayload = (u) => ({ id: u._id, name: u.name, email: u.email, role: u.role, coachId: u.coachId, settings: u.settings, sports: u.sports });

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
    }

    const code = genCode();
    const expires = new Date(Date.now() + CODE_TTL_MS);
    const existing = await User.findOne({ email: lowEmail });

    if (existing) {
      if (existing.emailVerified) return res.status(400).json({ message: 'Email already registered' });
      // Unverified account already exists — refresh code and resend so they can finish
      existing.verificationCode = code;
      existing.verificationExpires = expires;
      await existing.save();
      const m = verificationEmail(existing.name, code);
      const sent = await sendMail({ to: existing.email, subject: m.subject, text: m.text, html: m.html });
      return res.status(200).json({ needsVerification: true, email: existing.email, mailSent: !!sent.ok });
    }

    const user = await User.create({
      name, email: lowEmail, password, role: safeRole, coachId: coachId,
      emailVerified: false, verificationCode: code, verificationExpires: expires,
      sports: [{ type: 'functional', active: true }]
    });
    const m = verificationEmail(user.name, code);
    const sent = await sendMail({ to: user.email, subject: m.subject, text: m.text, html: m.html });
    res.status(201).json({ needsVerification: true, email: user.email, mailSent: !!sent.ok });
  } catch(err) { res.status(500).json({ message: err.message }); }
});

// POST /api/auth/verify — confirm the 6-digit code, then log in
router.post('/verify', async (req, res) => {
  try {
    const { email, code } = req.body;
    if (!email || !code) return res.status(400).json({ message: 'Email and code required' });
    const user = await User.findOne({ email: String(email).toLowerCase() });
    if (!user) return res.status(404).json({ message: 'Account not found' });
    if (user.emailVerified) return res.json({ token: sign(user._id), user: userPayload(user) });
    if (!user.verificationCode || user.verificationCode !== String(code).trim()) return res.status(400).json({ message: 'Incorrect code' });
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
    const { email } = req.body;
    const user = await User.findOne({ email: String(email || '').toLowerCase() });
    if (!user) return res.status(404).json({ message: 'Account not found' });
    if (user.emailVerified) return res.status(400).json({ message: 'Already verified — please log in' });
    const code = genCode();
    user.verificationCode = code;
    user.verificationExpires = new Date(Date.now() + CODE_TTL_MS);
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
    if (!user || !(await user.comparePassword(password))) return res.status(401).json({ message: 'Invalid email or password' });

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

    res.json({ token: sign(user._id), user: { id: user._id, name: user.name, email: user.email, role: user.role, coachId: user.coachId, settings: user.settings, sports: user.sports } });
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


// POST /api/auth/reset-password (simple - email + new password)
router.post('/reset-password', async (req, res) => {
  try {
    const { email, newPassword } = req.body;
    if (!email || !newPassword) return res.status(400).json({ message: 'Email and new password required' });
    const pwErr = validatePassword(newPassword);
    if (pwErr) return res.status(400).json({ message: pwErr });
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) return res.status(404).json({ message: 'No account found with that email' });
    user.password = newPassword;
    await user.save();
    res.json({ message: 'Password updated successfully' });
  } catch(err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;





