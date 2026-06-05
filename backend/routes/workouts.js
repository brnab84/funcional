const express = require('express');
const router = express.Router();
const Workout = require('../models/Workout');
const ExerciseLibrary = require('../models/ExerciseLibrary');
const auth = require('../middleware/auth');
const { generateWorkout } = require('../generator');
router.use(auth);

// GET /today — only return current SUGGESTIONS (not approved/rejected)
router.get('/today', async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const sport = req.query.sport || req.user.settings.defaultSport || 'functional';
    const uid = req.user._id;

    // Only get suggestions — approved/rejected stay in history
    let suggestions = await Workout.find({ user: uid, date: today, sport, status: 'suggestion' }).sort('variant');

    if (suggestions.length === 0) {
      const exercises = await ExerciseLibrary.find({ sport, user: uid });
      if (exercises.length < 8) return res.status(400).json({ message: 'Need at least 8 exercises. Go to Library and Seed defaults first.' });

      const days = req.user.settings.avoidRepeatDays || 7;
      const since = new Date(Date.now() - days * 86400000);
      const recent = await Workout.find({ user: uid, status: 'approved', sport, createdAt: { $gte: since } });
      const recentEx = recent.flatMap(w => w.blocks.flatMap(b => b.exercises.map(e => e.name)));

      suggestions = [];
      for (let v = 1; v <= 3; v++) {
        const { warmup, blocks, pattern } = generateWorkout(exercises, today + '-' + Date.now(), v, recentEx, req.user.settings);
        suggestions.push(await Workout.create({ user: uid, sport, date: today, warmup, blocks, pattern, variant: v, status: 'suggestion', source: 'local' }));
      }
    }

    const approvedToday = await Workout.countDocuments({ user: uid, date: today, sport, status: 'approved' });
    res.json({ workouts: suggestions, approvedToday });
  } catch(err) { res.status(500).json({ message: err.message }); }
});

// APPROVE — only marks this one, does NOT reject others
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

// REGENERATE — delete current suggestions, frontend calls GET /today after
router.post('/regenerate', async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const sport = (req.body && req.body.sport) || 'functional';
    await Workout.deleteMany({ user: req.user._id, date: today, sport, status: 'suggestion' });
    res.json({ ok: true });
  } catch(err) { res.status(500).json({ message: err.message }); }
});

// EDIT a workout (exercises, reps, config)
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

// HISTORY — approved workouts
router.get('/history', async (req, res) => {
  try {
    const sport = req.query.sport || req.user.settings.defaultSport || 'functional';
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const query = { user: req.user._id, status: 'approved', sport };
    const workouts = await Workout.find(query).sort({ date: -1 }).skip((page-1)*limit).limit(limit);
    const total = await Workout.countDocuments(query);
    res.json({ workouts, total, page, pages: Math.ceil(total / limit) });
  } catch(err) { res.status(500).json({ message: err.message }); }
});

// DELETE from history — one at a time
router.delete('/:id', async (req, res) => {
  try {
    await Workout.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    res.json({ ok: true });
  } catch(err) { res.status(500).json({ message: err.message }); }
});

// BULK DELETE from history
router.post('/bulk-delete', async (req, res) => {
  try {
    const ids = req.body.ids || [];
    await Workout.deleteMany({ _id: { $in: ids }, user: req.user._id });
    res.json({ ok: true, deleted: ids.length });
  } catch(err) { res.status(500).json({ message: err.message }); }
});

// AI variant
router.post('/ai', async (req, res) => {
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) return res.status(503).json({ message: 'ANTHROPIC_API_KEY not configured' });
    const sport = req.body.sport || 'functional';
    const today = new Date().toISOString().split('T')[0];
    const exercises = await ExerciseLibrary.find({ sport, user: req.user._id });
    const recent = await Workout.find({ user: req.user._id, status: 'approved', sport }).sort({ createdAt: -1 }).limit(7);
    const exList = exercises.map(e => e.name + ' (' + e.category + ')').join('\n');
    const recentList = recent.map(w => w.date+': '+w.blocks.map(b=>b.modality+' - '+b.exercises.map(e=>e.name).join(', ')).join(' | ')).join('\n');
    const prompt = 'You are a functional fitness coach. Generate a workout for '+today+'.\nUser settings: '+JSON.stringify(req.user.settings)+'\nExercises:\n'+exList+'\nRecent (avoid repeating):\n'+(recentList||'None')+'\nChoose ONE pattern: EC+MultiBlock(EMOM/OTM/AMRAP/ROUNDS A+B+C), EC+ForTime, EC+Tabata(45x15), EC+Zones, EC+RoundsInOut.\nReturn ONLY JSON:\n{"pattern":"EC+ABC","warmup":{"rounds":3,"exercises":[{"name":"..","reps":"20","category":"conditioning"}]},"blocks":[{"label":"A","modality":"EMOM","config":"7\'","exercises":[{"name":"..","reps":"10","category":"lower"}]}]}';
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: process.env.CLAUDE_MODEL || 'claude-haiku-4-5-20251001', max_tokens: 2000, messages: [{ role: 'user', content: prompt }] })
    });
    const d = await r.json();
    if (!d || !d.content || !d.content[0] || !d.content[0].text) {
      return res.status(500).json({ message: 'AI returned empty response: ' + JSON.stringify(d).substring(0, 200) });
    }
    const rawText = d.content[0].text.replace(/```json|```/g, '').trim();
    var parsed;
    try { parsed = JSON.parse(rawText); } catch(pe) {
      return res.status(500).json({ message: 'AI returned invalid JSON: ' + rawText.substring(0, 200) });
    }
    const workout = await Workout.create({ user: req.user._id, sport, date: today, warmup: parsed.warmup, blocks: parsed.blocks, pattern: parsed.pattern, variant: 99, status: 'suggestion', source: 'ai' });
    res.json({ workout });
  } catch(err) { res.status(500).json({ message: err.message }); }
});

// STATS
router.get('/stats', async (req, res) => {
  try {
    const sport = req.query.sport || 'functional';
    const total = await Workout.countDocuments({ user: req.user._id, status: 'approved', sport });
    const lastMonth = await Workout.countDocuments({ user: req.user._id, status: 'approved', sport, createdAt: { $gte: new Date(Date.now()-2592000000) } });
    res.json({ total, lastMonth });
  } catch(err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;



