const express = require('express');
const router = express.Router();
const Workout = require('../models/Workout');
const ExerciseLibrary = require('../models/ExerciseLibrary');
const auth = require('../middleware/auth');
const { generateWorkout } = require('../generator');
router.use(auth);

router.get('/today', async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const sport = req.query.sport || req.user.settings.defaultSport || 'functional';
    let existing = await Workout.find({ user: req.user._id, date: today, sport }).sort('variant');
    if (existing.length >= 3) return res.json({ workouts: existing, generated: false });
    // Use this user's exercises
    const exercises = await ExerciseLibrary.find({ sport, user: req.user._id });
    if (exercises.length < 8) return res.status(400).json({ message: 'Need at least 8 exercises. Go to Library and Seed defaults first.' });
    const days = req.user.settings.avoidRepeatDays || 7;
    const since = new Date(Date.now() - days * 86400000);
    const recent = await Workout.find({ user: req.user._id, status: 'approved', sport, createdAt: { $gte: since } });
    const recentEx = recent.flatMap(w => w.blocks.flatMap(b => b.exercises.map(e => e.name)));
    await Workout.deleteMany({ user: req.user._id, date: today, sport, status: 'suggestion' });
    const created = [];
    for (let v = 1; v <= 3; v++) {
      const { warmup, blocks, pattern } = generateWorkout(exercises, today, v, recentEx, req.user.settings);
      created.push(await Workout.create({ user: req.user._id, sport, date: today, warmup, blocks, pattern, variant: v, status: 'suggestion', source: 'local' }));
    }
    res.json({ workouts: created, generated: true });
  } catch(err) { res.status(500).json({ message: err.message }); }
});

router.get('/history', async (req, res) => {
  try {
    const sport = req.query.sport || req.user.settings.defaultSport || 'functional';
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const query = { user: req.user._id, status: 'approved', sport };
    const workouts = await Workout.find(query).sort({ date: -1 }).skip((page-1)*limit).limit(limit);
    const total = await Workout.countDocuments(query);
    res.json({ workouts, total, page, pages: Math.ceil(total / limit) });
  } catch(err) { res.status(500).json({ message: err.message }); }
});

router.put('/:id/approve', async (req, res) => {
  try {
    const workout = await Workout.findOne({ _id: req.params.id, user: req.user._id });
    if (!workout) return res.status(404).json({ message: 'Not found' });
    await Workout.updateMany(
      { user: req.user._id, date: workout.date, sport: workout.sport, _id: { $ne: workout._id }, status: 'suggestion' },
      { status: 'rejected' }
    );
    workout.status = 'approved';
    if (req.body && req.body.notes) workout.notes = req.body.notes;
    await workout.save();
    res.json({ workout });
  } catch(err) { res.status(500).json({ message: err.message }); }
});

router.put('/:id/reject', async (req, res) => {
  try {
    await Workout.findOneAndUpdate({ _id: req.params.id, user: req.user._id }, { status: 'rejected' });
    res.json({ ok: true });
  } catch(err) { res.status(500).json({ message: err.message }); }
});

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
      body: JSON.stringify({ model: 'claude-sonnet-4-20250514', max_tokens: 2000, messages: [{ role: 'user', content: prompt }] })
    });
    const d = await r.json();
    const parsed = JSON.parse(d.content[0].text.replace(/```json|```/g,'').trim());
    const variantNum = req.body.variant || 3;
    await Workout.findOneAndDelete({ user: req.user._id, date: today, sport, variant: variantNum });
    const workout = await Workout.create({ user: req.user._id, sport, date: today, warmup: parsed.warmup, blocks: parsed.blocks, pattern: parsed.pattern, variant: variantNum, status: 'suggestion', source: 'ai' });
    res.json({ workout });
  } catch(err) { res.status(500).json({ message: err.message }); }
});

router.get('/stats', async (req, res) => {
  try {
    const sport = req.query.sport || 'functional';
    const total = await Workout.countDocuments({ user: req.user._id, status: 'approved', sport });
    const lastMonth = await Workout.countDocuments({ user: req.user._id, status: 'approved', sport, createdAt: { $gte: new Date(Date.now()-2592000000) } });
    res.json({ total, lastMonth });
  } catch(err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;
