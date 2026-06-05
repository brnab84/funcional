const express = require('express');
const router = express.Router();
const Workout = require('../models/Workout');
const ExerciseLibrary = require('../models/ExerciseLibrary');
const { generateWorkout } = require('../generator');

// GET /api/workouts/today - Get or generate today's 3 variants
router.get('/today', async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    
    // Check if already generated today
    let existing = await Workout.find({ date: today }).sort('variant');
    
    if (existing.length >= 3) {
      return res.json({ workouts: existing, generated: false });
    }
    
    // Get exercise pool
    const exercises = await ExerciseLibrary.find({ active: true });
    if (exercises.length < 8) {
      return res.status(400).json({ message: 'Need at least 8 exercises in the library.' });
    }
    
    // Get recent approved workouts to avoid repeats
    const recent = await Workout.find({ status: 'approved' })
      .sort({ createdAt: -1 })
      .limit(5);
    const recentExercises = recent.flatMap(w => 
      w.blocks.flatMap(b => b.exercises.map(e => e.name))
    );
    
    // Delete any partial generation for today
    await Workout.deleteMany({ date: today });
    
    // Generate 3 variants
    const created = [];
    for (let v = 1; v <= 3; v++) {
      const { warmup, blocks } = generateWorkout(exercises, today, v, recentExercises);
      const workout = await Workout.create({
        date: today,
        warmup,
        blocks,
        variant: v,
        status: 'suggestion',
        source: 'local'
      });
      created.push(workout);
    }
    
    res.json({ workouts: created, generated: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/workouts/date/:date - Get workouts for specific date
router.get('/date/:date', async (req, res) => {
  try {
    const workouts = await Workout.find({ date: req.params.date }).sort('variant');
    res.json({ workouts });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/workouts/history - Get approved workouts
router.get('/history', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    
    const workouts = await Workout.find({ status: 'approved' })
      .sort({ date: -1 })
      .skip(skip)
      .limit(limit);
    
    const total = await Workout.countDocuments({ status: 'approved' });
    
    res.json({ workouts, total, page, pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /api/workouts/:id/approve - Approve a workout variant
router.put('/:id/approve', async (req, res) => {
  try {
    const workout = await Workout.findById(req.params.id);
    if (!workout) return res.status(404).json({ message: 'Workout not found' });
    
    // Reject other variants for same day
    await Workout.updateMany(
      { date: workout.date, _id: { $ne: workout._id } },
      { status: 'rejected' }
    );
    
    workout.status = 'approved';
    if (req.body.notes) workout.notes = req.body.notes;
    await workout.save();
    
    res.json({ workout });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /api/workouts/:id/reject
router.put('/:id/reject', async (req, res) => {
  try {
    await Workout.findByIdAndUpdate(req.params.id, { status: 'rejected' });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/workouts/ai - Generate with AI (Claude API)
router.post('/ai', async (req, res) => {
  try {
    const { date, variant } = req.body;
    const targetDate = date || new Date().toISOString().split('T')[0];
    
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return res.status(503).json({ message: 'ANTHROPIC_API_KEY not configured.' });
    }
    
    const exercises = await ExerciseLibrary.find({ active: true });
    const recent = await Workout.find({ status: 'approved' }).sort({ createdAt: -1 }).limit(7);
    
    const exerciseList = exercises.map(e => `${e.name} (${e.category})`).join('\n');
    const recentList = recent.map(w => 
      `${w.date}: ${w.blocks.map(b => `${b.modality} - ${b.exercises.map(e=>e.name).join(', ')}`).join(' | ')}`
    ).join('\n');
    
    const prompt = `You are a functional fitness coach. Generate a workout for ${targetDate}.

Available exercises:
${exerciseList}

Recent approved workouts (avoid repeating same exercises):
${recentList || 'None'}

Generate a workout with this EXACT JSON structure:
{
  "warmup": {
    "rounds": 3,
    "exercises": [
      {"name": "Jumping Jacks", "reps": "30", "category": "conditioning"}
    ]
  },
  "blocks": [
    {
      "label": "A",
      "modality": "EMOM",
      "config": "7'",
      "exercises": [
        {"name": "Wall Ball", "reps": "15", "category": "conditioning"}
      ]
    }
  ]
}

Rules:
- Warmup: 5-7 exercises, 3-7 rounds
- Use ONLY exercises from the list above
- Modalities: EMOM, OTM, AMRAP, FOR TIME, ROUNDS, TABATA, DESCENDING, ZONES, MINI AMRAP
- Balance categories: lower, upper, core, conditioning, power
- Don't repeat exercises from recent workouts
- Return ONLY the JSON, no explanation`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2000,
        messages: [{ role: 'user', content: prompt }]
      })
    });
    
    const data = await response.json();
    const text = data.content[0].text;
    const clean = text.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(clean);
    
    // Save as AI variant
    const variantNum = variant || 3;
    await Workout.findOneAndDelete({ date: targetDate, variant: variantNum });
    
    const workout = await Workout.create({
      date: targetDate,
      warmup: parsed.warmup,
      blocks: parsed.blocks,
      variant: variantNum,
      status: 'suggestion',
      source: 'ai'
    });
    
    res.json({ workout });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/workouts/stats - Stats for reports
router.get('/stats', async (req, res) => {
  try {
    const total = await Workout.countDocuments({ status: 'approved' });
    const byModality = await Workout.aggregate([
      { $match: { status: 'approved' } },
      { $unwind: '$blocks' },
      { $group: { _id: '$blocks.modality', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
    const lastMonth = await Workout.countDocuments({
      status: 'approved',
      createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
    });
    
    res.json({ total, byModality, lastMonth });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
