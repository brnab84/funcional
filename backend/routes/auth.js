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

module.exports = router;
