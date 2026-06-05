const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const ExerciseLibrary = require('../models/ExerciseLibrary');

// POST /api/upload/photo - analyze whiteboard photo with Claude Vision
router.post('/photo', auth, async (req, res) => {
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) return res.status(503).json({ message: 'ANTHROPIC_API_KEY not configured' });

    const { images, sport } = req.body; // images: array of base64 strings
    if (!images || !images.length) return res.status(400).json({ message: 'No images provided' });

    const content = [
      ...images.map(img => ({
        type: 'image',
        source: { type: 'base64', media_type: img.mediaType || 'image/jpeg', data: img.data }
      })),
      {
        type: 'text',
        text: `Analyze these functional fitness whiteboard workout photos. Extract ALL exercises you can see.

For each exercise found, classify it as:
- category: "lower" (squats, lunges, deadlift, box jump, etc.), "upper" (push up, shoulder press, pull up, row, dips, etc.), "core" (sit up, v-ups, crunch, plank, etc.), "conditioning" (burpees, jumping jacks, jump rope, run, sprawl, etc.), or "power" (thruster, KB snatch, KB swing, wall ball, etc.)

Also identify the workout PATTERNS you see (E.C. = warmup, EMOM, OTM, AMRAP, For Time, Tabata/45x15, Rounds, Descending 21-15-9, Zones).

Return ONLY this JSON (no markdown, no explanation):
{
  "exercises": [
    {"name": "Wall Ball", "category": "power"},
    {"name": "Push Up", "category": "upper"}
  ],
  "patterns": ["EMOM", "FOR TIME"],
  "notes": "brief description of what was found"
}`
      }
    ];

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: 'claude-sonnet-4-20250514', max_tokens: 2000, messages: [{ role: 'user', content }] })
    });

    const data = await response.json();
    if (!data.content) return res.status(500).json({ message: 'AI API error' });

    const text = data.content[0].text.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(text);

    // Auto-add new exercises to library
    const targetSport = sport || 'functional';
    const added = [];
    const skipped = [];

    for (const ex of (parsed.exercises || [])) {
      const existing = await ExerciseLibrary.findOne({
        name: { $regex: new RegExp(`^${ex.name}$`, 'i') },
        sport: targetSport
      });
      if (!existing) {
        await ExerciseLibrary.create({ name: ex.name, category: ex.category, sport: targetSport, active: true });
        added.push(ex.name);
      } else {
        skipped.push(ex.name);
      }
    }

    res.json({ exercises: parsed.exercises, patterns: parsed.patterns, notes: parsed.notes, added, skipped });
  } catch(err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
