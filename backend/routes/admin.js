const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const adminOnly = require('../middleware/admin');
const User = require('../models/User');
const LoginActivity = require('../models/LoginActivity');
const Workout = require('../models/Workout');

// All admin routes require auth + admin role
router.use(auth, adminOnly);

// GET /api/admin/stats — overview numbers
router.get('/stats', async (req, res) => {
  try {
    const now = Date.now();
    const day = 86400000;
    const [totalUsers, newToday, new7d, activeToday, active7d, totalWorkouts, totalLogins] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ createdAt: { $gte: new Date(now - day) } }),
      User.countDocuments({ createdAt: { $gte: new Date(now - 7 * day) } }),
      User.countDocuments({ lastLogin: { $gte: new Date(now - day) } }),
      User.countDocuments({ lastLogin: { $gte: new Date(now - 7 * day) } }),
      Workout.countDocuments({ status: 'approved' }),
      LoginActivity.countDocuments()
    ]);
    res.json({
      totalUsers, newToday, new7d,
      activeToday, active7d,
      totalApprovedWorkouts: totalWorkouts,
      totalLogins
    });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// GET /api/admin/users — list of accounts
router.get('/users', async (req, res) => {
  try {
    const users = await User.find()
      .select('name email role createdAt lastLogin loginCount sports coachId')
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
