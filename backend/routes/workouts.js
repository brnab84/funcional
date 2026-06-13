const express = require('express');
const router = express.Router();
const Workout = require('../models/Workout');
const ExerciseLibrary = require('../models/ExerciseLibrary');
const auth = require('../middleware/auth');
const TrainingStats = require('../models/TrainingStats');
const { categoriesFor } = require('../utils/constants');
const { generateWorkout } = require('../generator');
const { generateSwimWorkout } = require('../swim-generator');
const { generateStrongWorkout } = require('../strong-generator');
const { sportMeta } = require('../config/sports');
// Generator registry — keyed by the `generator` field in config/sports.js
const GENERATORS = { functional: generateWorkout, swim: generateSwimWorkout, strong: generateStrongWorkout };
function generatorFor(sport) { return GENERATORS[sportMeta(sport).generator] || generateWorkout; }
const sportAccess = require('../middleware/sportAccess');
router.use(auth);
router.use(sportAccess);

// Athletes linked to a coach don't generate their own workouts — they only
// follow what the coach assigns. Blocks self-generation routes for them.
const COACHED_MSG = 'Your coach assigns your workouts. Check the Assigned tab.';
function blockIfCoached(req, res, next) {
  if (req.user && req.user.coachId) return res.status(403).json({ message: COACHED_MSG });
  next();
}

// GET /today — READ ONLY
router.get('/today', async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const sport = req.query.sport || 'functional';
    const suggestions = await Workout.find({ user: req.user._id, date: today, sport: sport, status: 'suggestion', source: { $ne: 'assigned' } }).sort('variant').lean();
    const approvedToday = await Workout.countDocuments({ user: req.user._id, date: today, sport: sport, status: 'approved' });
    res.json({ workouts: suggestions, approvedToday: approvedToday });
  } catch(err) { res.status(500).json({ message: err.message }); }
});

// POST /regenerate — generate 3 new options
router.post('/regenerate', blockIfCoached, async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const sport = (req.body && req.body.sport) || 'functional';
    const uid = req.user._id;

    // Delete old suggestions (never touch coach-assigned workouts)
    await Workout.deleteMany({ user: uid, date: today, sport: sport, status: 'suggestion', source: { $ne: 'assigned' } });

    // Get exercises for this user + sport
    const exercises = await ExerciseLibrary.find({ sport: sport, user: uid }).lean();
    if (exercises.length < 8) {
      return res.status(400).json({ message: 'Need at least 8 exercises for ' + sport + '. Go to Library > Seed defaults.' });
    }

    // Validate categories match the sport
    const validCats = categoriesFor(sport);
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

    // Load training stats for smart generation
    var stats = null;
    try { stats = await TrainingStats.findOne({ user: uid, sport: sport }).lean(); } catch(e) {}

    // Generate 3 variants
    const gen = generatorFor(sport);
    const seed = today + '-' + uid;
    const created = [];
    for (var v = 1; v <= 3; v++) {
      const result = gen(valid, seed, v, recentEx, req.user.settings, approvedMods, stats);
      created.push(await Workout.create({
        user: uid, sport: sport, date: today,
        warmup: result.warmup, blocks: result.blocks, pattern: result.pattern,
        variant: v, status: 'suggestion', source: 'local'
      }));
    }
    res.json({ workouts: created });
  } catch(err) { res.status(500).json({ message: err.message }); }
});


// POST /manual — create workout manually
router.post('/manual', blockIfCoached, async (req, res) => {
  try {
    const { sport, warmup, blocks, pattern, notes, source } = req.body;
    var validSources = ['local','ai','manual','imported'];
    var finalSource = validSources.includes(source) ? source : 'manual';
    const today = new Date().toISOString().split('T')[0];
    const workout = await Workout.create({
      user: req.user._id,
      sport: sport || 'functional',
      date: today,
      warmup: warmup || { rounds: 1, exercises: [] },
      blocks: blocks || [],
      pattern: pattern || 'MANUAL',
      variant: 98,
      status: 'suggestion',
      source: finalSource,
      notes: notes || ''
    });
    res.json({ workout });
  } catch(err) { res.status(500).json({ message: err.message }); }
});

// APPROVE + LEARN
router.put('/:id/approve', async (req, res) => {
  try {
    const workout = await Workout.findOne({ _id: req.params.id, user: req.user._id });
    if (!workout) return res.status(404).json({ message: 'Not found' });
    workout.status = 'approved';
    if (req.body && req.body.notes) workout.notes = req.body.notes;
    await workout.save();

    // LEARN: update training stats from this approved workout
    try {
      var inc = { totalApproved: 1 };
      inc[workout.source === 'ai' ? 'aiApproved' : 'localApproved'] = 1;
      var setOps = { updatedAt: new Date() };
      var incFreq = {};

      // Extract exercises, modalities, categories, reps
      (workout.blocks || []).forEach(function(block) {
        if (block.modality) incFreq['modalityFreq.' + block.modality.replace(/[.$]/g, '_')] = (incFreq['modalityFreq.' + block.modality.replace(/[.$]/g, '_')] || 0) + 1;
        (block.exercises || []).forEach(function(ex) {
          if (ex.name) incFreq['exerciseFreq.' + ex.name.replace(/[.$]/g, '_')] = (incFreq['exerciseFreq.' + ex.name.replace(/[.$]/g, '_')] || 0) + 1;
          if (ex.category) incFreq['categoryFreq.' + ex.category] = (incFreq['categoryFreq.' + ex.category] || 0) + 1;
          if (ex.reps) incFreq['repsFreq.' + String(ex.reps).replace(/[.$]/g, '_')] = (incFreq['repsFreq.' + String(ex.reps).replace(/[.$]/g, '_')] || 0) + 1;
        });
      });
      if (workout.pattern) incFreq['patternFreq.' + workout.pattern.replace(/[.$]/g, '_')] = 1;

      // Warmup exercises too
      if (workout.warmup && workout.warmup.exercises) {
        workout.warmup.exercises.forEach(function(ex) {
          if (ex.name) incFreq['exerciseFreq.' + ex.name.replace(/[.$]/g, '_')] = (incFreq['exerciseFreq.' + ex.name.replace(/[.$]/g, '_')] || 0) + 1;
        });
      }

      await TrainingStats.findOneAndUpdate(
        { user: req.user._id, sport: workout.sport },
        { $inc: { ...inc, ...incFreq }, $set: setOps },
        { upsert: true }
      );
    } catch(statsErr) { console.log('Stats update error:', statsErr.message); }

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

// ASSIGNED — workouts a coach sent to this athlete (read-only inbox)
router.get('/assigned', async (req, res) => {
  try {
    const sport = req.query.sport || 'functional';
    const workouts = await Workout.find({ user: req.user._id, sport: sport, source: 'assigned' })
      .sort({ createdAt: -1 })
      .limit(50)
      .populate('assignedBy', 'name email')
      .lean();
    res.json({ workouts });
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
router.post('/ai', blockIfCoached, async (req, res) => {
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

// GET /learning — show training intelligence data
router.get('/learning', async (req, res) => {
  try {
    const sport = req.query.sport || 'functional';
    const stats = await TrainingStats.findOne({ user: req.user._id, sport: sport }).lean();
    if (!stats) return res.json({ message: 'No training data yet', stats: null });
    res.json({ stats: stats });
  } catch(err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;




