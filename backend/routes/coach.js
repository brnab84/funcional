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
const { sendMail } = require('../utils/mailer');
const APP_URL = process.env.APP_URL || '';

// Build a plain-text + HTML summary of an assigned workout for the email
function workoutSummary(workout, coachName) {
  const lines = [];
  const htmlParts = [];
  if (workout.warmup && workout.warmup.exercises && workout.warmup.exercises.length) {
    lines.push('Entrada en calor (' + (workout.warmup.rounds || 1) + ' rounds):');
    htmlParts.push('<h3 style="margin:14px 0 6px">Entrada en calor <span style="color:#6b7280;font-weight:normal">(' + (workout.warmup.rounds || 1) + ' rounds)</span></h3><ul style="margin:0;padding-left:18px">');
    workout.warmup.exercises.forEach(e => {
      lines.push('  - ' + e.name + (e.reps ? ' — ' + e.reps : ''));
      htmlParts.push('<li>' + e.name + (e.reps ? ' <strong>' + e.reps + '</strong>' : '') + '</li>');
    });
    htmlParts.push('</ul>');
  }
  (workout.blocks || []).forEach(b => {
    lines.push('');
    lines.push('Bloque ' + (b.label || '') + ' (' + (b.modality || '') + ')' + (b.config ? ' — ' + b.config : '') + ':');
    htmlParts.push('<h3 style="margin:14px 0 6px">Bloque ' + (b.label || '') + ' <span style="color:#6b7280;font-weight:normal">' + (b.modality || '') + (b.config ? ' · ' + b.config : '') + '</span></h3><ul style="margin:0;padding-left:18px">');
    (b.exercises || []).forEach(e => {
      lines.push('  - ' + e.name + (e.reps ? ' — ' + e.reps : ''));
      htmlParts.push('<li>' + e.name + (e.reps ? ' <strong>' + e.reps + '</strong>' : '') + '</li>');
    });
    htmlParts.push('</ul>');
  });
  if (workout.pattern) lines.push('\nPatrón: ' + workout.pattern);

  const text = coachName + ' te envió un entrenamiento:\n\n' + lines.join('\n')
    + (APP_URL ? '\n\nAbrilo en la app: ' + APP_URL : '');
  const html = '<div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;padding:24px;color:#1c2026">'
    + '<h2 style="color:#0d0f12;margin:0 0 4px">Functional WOD</h2>'
    + '<p><strong>' + coachName + '</strong> te envió un entrenamiento 💪</p>'
    + htmlParts.join('')
    + (workout.pattern ? '<p style="margin-top:12px;color:#6b7280">Patrón: ' + workout.pattern + '</p>' : '')
    + (APP_URL ? '<p style="margin-top:18px"><a href="' + APP_URL + '" style="background:#f5c518;color:#0d0f12;text-decoration:none;padding:10px 18px;border-radius:8px;font-weight:bold">Abrir en la app</a></p>' : '')
    + '</div>';
  return { text, html };
}

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
    // Notify the athlete by email with a summary (non-blocking — never fail the assign)
    try {
      const sum = workoutSummary(workout, req.user.name);
      sendMail({ to: student.email, subject: req.user.name + ' te envió un entrenamiento — Functional WOD', text: sum.text, html: sum.html });
    } catch (e) { console.log('Assign email error:', e.message); }
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
