const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const auth = require('../middleware/auth');
const coachOnly = require('../middleware/coach');
const User = require('../models/User');
const Workout = require('../models/Workout');
const ExerciseLibrary = require('../models/ExerciseLibrary');
const { categoriesFor } = require('../utils/constants');
const { generateWorkout } = require('../generator');
const { generateSwimWorkout } = require('../swim-generator');

// All coach routes require auth + coach (or admin) role
router.use(auth, coachOnly);

// Helper: confirm an athlete belongs to this coach
async function findOwnStudent(coach, studentId) {
  return User.findOne({ _id: studentId, coachId: coach._id });
}

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

// GET /api/coach/invite — return this coach's reusable invite code (generate on first use)
router.get('/invite', async (req, res) => {
  try {
    const coach = await User.findById(req.user._id);
    if (!coach.inviteCode) {
      let code, exists = true, tries = 0;
      while (exists && tries < 6) { code = crypto.randomBytes(5).toString('hex').toUpperCase(); exists = await User.exists({ inviteCode: code }); tries++; }
      coach.inviteCode = code;
      await coach.save();
    }
    res.json({ code: coach.inviteCode });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// POST /api/coach/students/:id/generate — preview a WOD built from the COACH's
// own exercise library (not saved). Coach reviews/regenerates before sending.
router.post('/students/:id/generate', async (req, res) => {
  try {
    const student = await findOwnStudent(req.user, req.params.id);
    if (!student) return res.status(404).json({ message: 'Student not found' });

    const sport = req.body.sport || 'functional';
    const exercises = await ExerciseLibrary.find({ sport: sport, user: req.user._id }).lean();
    const validCats = categoriesFor(sport);
    const valid = exercises.filter(e => validCats.includes(e.category));
    if (valid.length < 8) {
      return res.status(400).json({ message: 'You need at least 8 ' + sport + ' exercises in your own Library to generate. Go to Library > Seed defaults.' });
    }

    const gen = sport === 'swimming' ? generateSwimWorkout : generateWorkout;
    const seed = Date.now() + '-' + req.user._id + '-' + Math.floor(Math.random() * 1e6);
    const result = gen(valid, seed, 1, [], req.user.settings, [], null);
    res.json({ workout: { sport: sport, warmup: result.warmup, blocks: result.blocks, pattern: result.pattern } });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// POST /api/coach/students/:id/assign — create the workout in the athlete's account
router.post('/students/:id/assign', async (req, res) => {
  try {
    const student = await findOwnStudent(req.user, req.params.id);
    if (!student) return res.status(404).json({ message: 'Student not found' });

    const { sport, warmup, blocks, pattern, notes } = req.body;
    if (!Array.isArray(blocks) || blocks.length === 0) {
      return res.status(400).json({ message: 'Workout has no blocks to send' });
    }
    const today = new Date().toISOString().split('T')[0];
    const workout = await Workout.create({
      user: student._id,
      sport: sport || 'functional',
      date: today,
      warmup: warmup || { rounds: 1, exercises: [] },
      blocks: blocks,
      pattern: pattern || 'COACH',
      variant: 97,
      status: 'suggestion',
      source: 'assigned',
      assignedBy: req.user._id,
      notes: notes || ''
    });
    res.json({ workout: workout });
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
