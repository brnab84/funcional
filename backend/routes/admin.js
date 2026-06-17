const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const adminOnly = require('../middleware/admin');
const User = require('../models/User');
const LoginActivity = require('../models/LoginActivity');
const Workout = require('../models/Workout');
const ExerciseLibrary = require('../models/ExerciseLibrary');
const TrainingStats = require('../models/TrainingStats');
const { adminOnlySports } = require('../config/sports');
const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || 'brnab84@gmail.com').toLowerCase();

// All admin routes require auth + admin role
router.use(auth, adminOnly);

// GET /api/admin/stats — overview numbers
router.get('/stats', async (req, res) => {
  try {
    const now = Date.now();
    const day = 86400000;
    const [totalUsers, newToday, new7d, activeToday, active7d, totalWorkouts, totalLogins, coaches, coachedAthletes, soloAthletes] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ createdAt: { $gte: new Date(now - day) } }),
      User.countDocuments({ createdAt: { $gte: new Date(now - 7 * day) } }),
      User.countDocuments({ lastLogin: { $gte: new Date(now - day) } }),
      User.countDocuments({ lastLogin: { $gte: new Date(now - 7 * day) } }),
      Workout.countDocuments({ status: 'approved' }),
      LoginActivity.countDocuments(),
      User.countDocuments({ role: 'coach' }),
      User.countDocuments({ role: 'athlete', coachId: { $ne: null } }),
      User.countDocuments({ role: 'athlete', coachId: null })
    ]);
    res.json({
      totalUsers, newToday, new7d,
      activeToday, active7d,
      totalApprovedWorkouts: totalWorkouts,
      totalLogins,
      coaches, coachedAthletes, soloAthletes
    });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// GET /api/admin/users — list of accounts
router.get('/users', async (req, res) => {
  try {
    const users = await User.find()
      .select('name email role createdAt lastLogin loginCount sports coachId plan extraSports')
      .sort({ createdAt: -1 })
      .limit(500)
      .lean();
    // Resolve coach names + per-coach student counts so the dashboard can show who is who
    const nameById = {};
    const studentCount = {};
    users.forEach(u => { nameById[String(u._id)] = u.name; });
    users.forEach(u => {
      if (u.coachId) {
        const cid = String(u.coachId);
        u.coachName = nameById[cid] || 'Unknown';
        studentCount[cid] = (studentCount[cid] || 0) + 1;
      }
    });
    users.forEach(u => { u.studentCount = studentCount[String(u._id)] || 0; });
    res.json({ users });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// PUT /api/admin/users/:id/plan — manually set a coach's plan (comps / pre-payments)
router.put('/users/:id/plan', async (req, res) => {
  try {
    const plan = req.body.plan;
    if (!['free', 'pro', 'studio'].includes(plan)) return res.status(400).json({ message: 'Invalid plan' });
    const user = await User.findByIdAndUpdate(req.params.id, { $set: { plan: plan, planStatus: 'active' } }, { new: true }).select('name plan');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json({ message: 'Plan updated', name: user.name, plan: user.plan });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// POST /api/admin/strong-starter — pre-seed the calling admin's Strong learning
// (TrainingStats) so the generator favours the main compound lifts from day one.
const STRONG_STARTER = {
  'Sentadilla': 4, 'Peso Muerto': 4, 'Press Banca Plano': 4, 'Press Militar Barra': 3, 'Dominadas': 3,
  'Hip Thrust': 3, 'Remo T': 3, 'Pecho Inclinado Mancuerna': 3, 'Dorsal al Pecho': 3, 'Peso Muerto Rumano': 3,
  'Sentadilla Búlgara': 2, 'Curl Barra Recta': 2, 'Extensión Tríceps Polea': 2, 'Vuelos Laterales Mancuerna': 2, 'Sillón Cuádriceps': 2
};
router.post('/strong-starter', async (req, res) => {
  try {
    const incFreq = {};
    Object.keys(STRONG_STARTER).forEach(function (name) {
      incFreq['exerciseFreq.' + name.replace(/[.$]/g, '_')] = STRONG_STARTER[name];
    });
    await TrainingStats.findOneAndUpdate(
      { user: req.user._id, sport: 'strong' },
      { $inc: incFreq, $set: { updatedAt: new Date() } },
      { upsert: true }
    );
    res.json({ message: 'Strong learning seeded', exercises: Object.keys(STRONG_STARTER).length });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// PUT /api/admin/users/:id/sport-access — grant/revoke an admin-only sport for a user
router.put('/users/:id/sport-access', async (req, res) => {
  try {
    const sport = req.body.sport;
    const allow = !!req.body.allow;
    if (adminOnlySports().indexOf(sport) < 0) return res.status(400).json({ message: 'Invalid sport' });
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    const set = {};
    (user.extraSports || []).forEach(function (s) { set[s] = true; });
    if (allow) set[sport] = true; else delete set[sport];
    user.extraSports = Object.keys(set);
    await user.save();
    res.json({ message: 'Updated', name: user.name, extraSports: user.extraSports });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// DELETE /api/admin/users/:id — delete an account + its data (cascade)
router.delete('/users/:id', async (req, res) => {
  try {
    const target = await User.findById(req.params.id);
    if (!target) return res.status(404).json({ message: 'User not found' });
    if (target._id.equals(req.user._id)) return res.status(400).json({ message: 'You cannot delete your own account' });
    if (target.role === 'admin' || target.email.toLowerCase() === ADMIN_EMAIL) return res.status(400).json({ message: 'Cannot delete an admin account' });

    await Promise.all([
      Workout.deleteMany({ user: target._id }),
      ExerciseLibrary.deleteMany({ user: target._id }),
      TrainingStats.deleteMany({ user: target._id }),
      LoginActivity.deleteMany({ user: target._id }),
      // If this was a coach, unlink their athletes (they become solo athletes)
      User.updateMany({ coachId: target._id }, { $set: { coachId: null } })
    ]);
    await User.deleteOne({ _id: target._id });
    res.json({ message: 'Account deleted', name: target.name });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// GET /api/admin/activity — recent login events
router.get('/activity', async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 100, 500);
    const activity = await LoginActivity.find()
      .sort({ timestamp: -1 })
      .limit(limit)
      .lean();
    res.json({ activity });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;
