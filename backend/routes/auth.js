const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const authMW = require('../middleware/auth');
const JWT_SECRET = process.env.JWT_SECRET || 'funcional_jwt_secret_2024';
const sign = (id) => jwt.sign({ id }, JWT_SECRET, { expiresIn: '30d' });

router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) return res.status(400).json({ message: 'All fields required' });
    if (await User.findOne({ email })) return res.status(400).json({ message: 'Email already registered' });
    const user = await User.create({ name, email, password, sports: [{ type: 'functional', active: true }] });
    res.status(201).json({ token: sign(user._id), user: { id: user._id, name: user.name, email: user.email, role: user.role, settings: user.settings, sports: user.sports } });
  } catch(err) { res.status(500).json({ message: err.message }); }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user || !(await user.comparePassword(password))) return res.status(401).json({ message: 'Invalid email or password' });
    res.json({ token: sign(user._id), user: { id: user._id, name: user.name, email: user.email, role: user.role, settings: user.settings, sports: user.sports } });
  } catch(err) { res.status(500).json({ message: err.message }); }
});

router.get('/me', authMW, (req, res) => res.json({ user: req.user }));

router.put('/settings', authMW, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    const { blockCount, blockModalities, avoidRepeatDays, defaultSport } = req.body;
    if (blockCount !== undefined) user.settings.blockCount = blockCount;
    if (blockModalities) user.settings.blockModalities = { ...user.settings.blockModalities, ...blockModalities };
    if (avoidRepeatDays !== undefined) user.settings.avoidRepeatDays = avoidRepeatDays;
    if (defaultSport) user.settings.defaultSport = defaultSport;
    if (req.body.theme) user.settings.theme = req.body.theme;
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
    if (newPassword.length < 6) return res.status(400).json({ message: 'Password must be at least 6 characters' });
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) return res.status(404).json({ message: 'No account found with that email' });
    user.password = newPassword;
    await user.save();
    res.json({ message: 'Password updated successfully' });
  } catch(err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;



