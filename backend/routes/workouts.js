const express = require('express');
const router = express.Router();
const Workout = require('../models/Workout');
const ExerciseLibrary = require('../models/ExerciseLibrary');
const auth = require('../middleware/auth');
const { generateWorkout } = require('../generator');
const { generateSwimWorkout } = require('../swim-generator');
router.use(auth);

// GET /today — READ ONLY
router.get('/today', async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const sport = req.query.sport || 'functional';
    const suggestions = await Workout.find({ user: req.user._id, date: today, sport: sport, status: 'suggestion' }).sort('variant').lean();
    const approvedToday = await Workout.countDocuments({ user: req.user._id, date: today, sport: sport, status: 'approved' });
    res.json({ workouts: suggestions, approvedToday: approvedToday });
  } catch(err) { res.status(500).json({ message: err.message }); }
});

// POST /regenerate — generate 3 new options
router.post('/regenerate', async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const sport = (req.body && req.body.sport) || 'functional';
    const uid = req.user._id;

    // Delete old suggestions
    await Workout.deleteMany({ user: uid, date: today, sport: sport, status: 'suggestion' });

    // Get exercises for this user + sport
    const exercises = await ExerciseLibrary.find({ sport: sport, user: uid }).lean();
    if (exercises.length < 8) {
      return res.status(400).json({ message: 'Need at least 8 exercises for ' + sport + '. Go to Library > Seed defaults.' });
    }

    // Validate categories match the sport
    const swimCats = ['stroke','kick','drill','pull','sprint','endurance'];
    const funcCats = ['lower','upper','core','conditioning','power'];
    const validCats = sport === 'swimming' ? swimCats : funcCats;
    const valid = exercises.filter(e => validCats.includes(e.category));
    if (valid.length < 8) {
      return res.status(400).json({ message: 'Exercises have wrong categories for ' + sport + '. Re-seed defaults in Library.' });
    }

    // Get recent approved for pattern weighting (single query)
    const days = req.user.settings.avoidRepeatDays || 7;
    const recent = await Workout.find({ user: uid, status: 'approved', sport: sport, createdAt: { $gte: new Date(Date.now() - days * 86400000) } }).lean();
    const recentEx = [];
    const approvedMods = [];
    recent.forEach(function(w) {
      (w.blocks || []).forEach(function(b) {
        approvedMods.push(b.modality);
        (b.exercises || []).forEach(function(e) { recentEx.push(e.name); });
      });
    });

    // Generate 3 variants
    const gen = sport === 'swimming' ? generateSwimWorkout : generateWorkout;
    const seed = today + '-' + uid;
    const created = [];
    for (var v = 1; v <= 3; v++) {
      const result = gen(valid, seed, v, recentEx, req.user.settings, approvedMods);
      created.push(await Workout.create({
        user: uid, sport: sport, date: today,
        warmup: result.warmup, blocks: result.blocks, pattern: result.pattern,
        variant: v, status: 'suggestion', source: 'local'
      }));
    }
    res.json({ workouts: created });
  } catch(err) { res.status(500).json({ message: err.message }); }
});

// APPROVE
router.put('/:id/approve', async (req, res) => {
  try {
    const workout = await Workout.findOne({ _id: req.params.id, user: req.user._id });
    if (!workout) return res.status(404).json({ message: 'Not found' });
    workout.status = 'approved';
    if (req.body && req.body.notes) workout.notes = req.body.notes;
    await workout.save();
    res.json({ workout });
  } catch(err) { res.status(500).json({ message: err.message }); }
});

// REJECT
router.put('/:id/reject', async (req, res) => {
  try {
    await Workout.findOneAndUpdate({ _id: req.params.id, user: req.user._id, status: 'suggestion' }, { status: 'rejected' });
    res.json({ ok: true });
  } catch(err) { res.status(500).json({ message: err.message }); }
});

// EDIT
router.put('/:id/edit', async (req, res) => {
  try {
    const workout = await Workout.findOne({ _id: req.params.id, user: req.user._id });
    if (!workout) return res.status(404).json({ message: 'Not found' });
    if (req.body.warmup) workout.warmup = req.body.warmup;
    if (req.body.blocks) workout.blocks = req.body.blocks;
    if (req.body.notes !== undefined) workout.notes = req.body.notes;
    await workout.save();
    res.json({ workout });
  } catch(err) { res.status(500).json({ message: err.message }); }
});

// HISTORY
router.get('/history', async (req, res) => {
  try {
    const sport = req.query.sport || 'functional';
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const query = { user: req.user._id, status: 'approved', sport: sport };
    const [workouts, total] = await Promise.all([
      Workout.find(query).sort({ date: -1 }).skip((page-1)*limit).limit(limit).lean(),
      Workout.countDocuments(query)
    ]);
    res.json({ workouts, total, page, pages: Math.ceil(total / limit) });
  } catch(err) { res.status(500).json({ message: err.message }); }
});

// DELETE
router.delete('/:id', async (req, res) => {
  try {
    await Workout.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    res.json({ ok: true });
  } catch(err) { res.status(500).json({ message: err.message }); }
});

// AI
router.post('/ai', async (req, res) => {
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) return res.status(503).json({ message: 'ANTHROPIC_API_KEY not configured' });
    const sport = req.body.sport || 'functional';
    const today = new Date().toISOString().split('T')[0];
    const exercises = await ExerciseLibrary.find({ sport: sport, user: req.user._id }).lean();
    const recent = await Workout.find({ user: req.user._id, status: 'approved', sport: sport }).sort({ createdAt: -1 }).limit(5).lean();
    const exList = exercises.map(e => e.name + ' (' + e.category + ')').join(', ');
    const recentList = recent.map(w => w.date + ': ' + w.blocks.map(b => b.modality).join('+')).join('; ');
    const prompt = 'Generate a ' + sport + ' workout for ' + today + '. Exercises: ' + exList + '. Recent: ' + (recentList || 'None') + '. Return ONLY JSON: {"pattern":"...","warmup":{"rounds":1,"exercises":[{"name":"..","reps":"..","category":".."}]},"blocks":[{"label":"A","modality":"..","config":"..","exercises":[{"name":"..","reps":"..","category":".."}]}]}';
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: process.env.CLAUDE_MODEL || 'claude-haiku-4-5-20251001', max_tokens: 1500, messages: [{ role: 'user', content: prompt }] })
    });
    const d = await r.json();
    if (!d || !d.content || !d.content[0]) return res.status(500).json({ message: 'AI error' });
    var parsed;
    try { parsed = JSON.parse(d.content[0].text.replace(/```json|```/g, '').trim()); } catch(pe) { return res.status(500).json({ message: 'AI invalid response' }); }
    const workout = await Workout.create({ user: req.user._id, sport: sport, date: today, warmup: parsed.warmup, blocks: parsed.blocks, pattern: parsed.pattern, variant: 99, status: 'suggestion', source: 'ai' });
    res.json({ workout });
  } catch(err) { res.status(500).json({ message: err.message }); }
});

// STATS
router.get('/stats', async (req, res) => {
  try {
    const sport = req.query.sport || 'functional';
    const q = { user: req.user._id, status: 'approved', sport: sport };
    const [total, lastMonth] = await Promise.all([
      Workout.countDocuments(q),
      Workout.countDocuments({ ...q, createdAt: { $gte: new Date(Date.now() - 2592000000) } })
    ]);
    res.json({ total, lastMonth });
  } catch(err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;
