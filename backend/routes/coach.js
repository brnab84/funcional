const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const coachOnly = require('../middleware/coach');
const User = require('../models/User');

// All coach routes require auth + coach (or admin) role
router.use(auth, coachOnly);

// GET /api/coach/students — list athletes linked to this coach
router.get('/students', async (req, res) => {
  try {
    const students = await User.find({ coachId: req.user._id })
      .select('name email role sports lastLogin createdAt')
      .sort({ name: 1 })
      .lean();
    res.json({ students });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// POST /api/coach/students/add — link an already-registered athlete by email
router.post('/students/add', async (req, res) => {
  try {
    const email = (req.body.email || '').trim().toLowerCase();
    if (!email) return res.status(400).json({ message: 'Email required' });

    const student = await User.findOne({ email });
    if (!student) return res.status(404).json({ message: 'No account found with that email. The athlete must register first.' });
    if (student._id.equals(req.user._id)) return res.status(400).json({ message: 'You cannot add yourself as a student' });
    if (student.role === 'coach' || student.role === 'admin') return res.status(400).json({ message: 'That account is a coach, not an athlete' });
    if (student.coachId && student.coachId.equals(req.user._id)) return res.status(400).json({ message: 'This athlete is already your student' });
    if (student.coachId) return res.status(409).json({ message: 'This athlete is already linked to another coach' });

    student.coachId = req.user._id;
    await student.save();
    res.json({ student: { _id: student._id, name: student.name, email: student.email, role: student.role, sports: student.sports, lastLogin: student.lastLogin, createdAt: student.createdAt } });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// DELETE /api/coach/students/:id — unlink a student from this coach
router.delete('/students/:id', async (req, res) => {
  try {
    const student = await User.findOne({ _id: req.params.id, coachId: req.user._id });
    if (!student) return res.status(404).json({ message: 'Student not found' });
    student.coachId = null;
    await student.save();
    res.json({ message: 'Student removed' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;
