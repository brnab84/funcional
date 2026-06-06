const express = require('express');
const router = express.Router();
const Workout = require('../models/Workout');
const ExerciseLibrary = require('../models/ExerciseLibrary');
const auth = require('../middleware/auth');
const { generateWorkout } = require('../generator');
const { generateSwimWorkout } = require('../swim-generator');
router.use(auth);

// GET /today — READ ONLY, no auto-generate
router.get('/today', async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const sport = req.query.sport || req.user.settings.defaultSport || 'functional';
    const suggestions = await Workout.find({ user: req.user._id, date: today, sport, status: 'suggestion' }).sort('variant');
    const approvedToday = await Workout.countDocuments({ user: req.user._id, date: today, sport, status: 'approved' });
    res.json({ workouts: suggestions, approvedToday });
  } catch(err) { res.status(500).json({ message: err.message }); }
});

// POST /regenerate — generates 3 new suggestions (only writes when user clicks)
router.post('/regenerate', async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const sport = (req.body && req.body.sport) || req.user.settings.defaultSport || 'functional';
    const uid = req.user._id;
    await Workout.deleteMany({ user: uid, date: today, sport, status: 'suggestion' });
    const exercises = await ExerciseLibrary.find({ sport, user: uid });
    if (exercises.length < 8) return res.status(400).json({ message: 'Need at least 8 exercises. Seed defaults first.' });
    const days = req.user.settings.avoidRepeatDays || 7;
    const since = new Date(Date.now() - days * 86400000);
    const recent = await Workout.find({ user: uid, status: 'approved', sport, createdAt: { $gte: since } });
    const recentEx = recent.flatMap(w => w.blocks.flatMap(b => b.exercises.map(e => e.name)));
    const created = [];
    for (let v = 1; v <= 3; v++) {
      var gen = (sport === 'swimming') ? generateSwimWorkout : generateWorkout;
      const { warmup, blocks, pattern } = gen(exercises, today + '-' + Date.now(), v, recentEx, req.user.settings);
      created.push(await Workout.create({ user: uid, sport, date: today, warmup, blocks, pattern, variant: v, status: 'suggestion', source: 'local' }));
    }
    res.json({ workouts: created });
  } catch(err) { res.status(500).json({ message: err.message }); }
});

// PUT /approve
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

// PUT /reject
router.put('/:id/reject', async (req, res) => {
  try {
    await Workout.findOneAndUpdate({ _id: req.params.id, user: req.user._id, status: 'suggestion' }, { status: 'rejected' });
    res.json({ ok: true });
  } catch(err) { res.status(500).json({ message: err.message }); }
});

// PUT /edit
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

// GET /history
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

// DELETE single
router.delete('/:id', async (req, res) => {
  try {
    await Workout.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    res.json({ ok: true });
  } catch(err) { res.status(500).json({ message: err.message }); }
});

// POST /ai
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
    const prompt = 'You are a functional fitness coach. Generate a workout for '+today+'.\nUser settings: '+JSON.stringify(req.user.settings)+'\nExercises:\n'+exList+'\nRecent (avoid repeating):\n'+(recentList||'None')+'\nReturn ONLY JSON:\n{"pattern":"EC+ABC","warmup":{"rounds":3,"exercises":[{"name":"..","reps":"20","category":"conditioning"}]},"blocks":[{"label":"A","modality":"EMOM","config":"7\'","exercises":[{"name":"..","reps":"10","category":"lower"}]}]}';
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: process.env.CLAUDE_MODEL || 'claude-haiku-4-5-20251001', max_tokens: 2000, messages: [{ role: 'user', content: prompt }] })
    });
    const d = await r.json();
    if (!d || !d.content || !d.content[0] || !d.content[0].text) {
      return res.status(500).json({ message: 'AI error: ' + JSON.stringify(d).substring(0, 200) });
    }
    const raw = d.content[0].text.replace(/```json|```/g, '').trim();
    let parsed;
    try { parsed = JSON.parse(raw); } catch(pe) {
      return res.status(500).json({ message: 'AI invalid JSON: ' + raw.substring(0, 200) });
    }
    const workout = await Workout.create({ user: req.user._id, sport, date: today, warmup: parsed.warmup, blocks: parsed.blocks, pattern: parsed.pattern, variant: 99, status: 'suggestion', source: 'ai' });
    res.json({ workout });
  } catch(err) { res.status(500).json({ message: err.message }); }
});

// GET /stats
router.get('/stats', async (req, res) => {
  try {
    const sport = req.query.sport || 'functional';
    const total = await Workout.countDocuments({ user: req.user._id, status: 'approved', sport });
    const lastMonth = await Workout.countDocuments({ user: req.user._id, status: 'approved', sport, createdAt: { $gte: new Date(Date.now()-2592000000) } });
    res.json({ total, lastMonth });
  } catch(err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;



