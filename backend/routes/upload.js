const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const ExerciseLibrary = require('../models/ExerciseLibrary');

// POST /api/upload/photo — extract exercises for library (legacy)
router.post('/photo', auth, async (req, res) => {
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) return res.status(503).json({ message: 'API key not configured' });
    const { images, sport } = req.body;
    if (!images || !images.length) return res.status(400).json({ message: 'No images' });
    const content = images.map(img => ({
      type: 'image', source: { type: 'base64', media_type: img.mediaType || 'image/jpeg', data: img.data }
    }));
    content.push({ type: 'text', text: 'Extract exercise names from this whiteboard. Return JSON array: [{"name":"...","category":"..."}]. Categories for ' + (sport || 'functional') + ': ' + (sport === 'swimming' ? 'stroke,kick,drill,pull,sprint,endurance' : 'lower,upper,core,conditioning,power') });
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: process.env.CLAUDE_MODEL || 'claude-haiku-4-5-20251001', max_tokens: 1500, messages: [{ role: 'user', content }] })
    });
    const d = await r.json();
    if (!d || !d.content || !d.content[0]) return res.status(500).json({ message: 'AI error' });
    const parsed = JSON.parse(d.content[0].text.replace(/```json|```/g, '').trim());
    const added = [], skipped = [];
    for (const ex of parsed) {
      const exists = await ExerciseLibrary.findOne({ name: ex.name, sport: sport || 'functional', user: req.user._id });
      if (exists) { skipped.push(ex.name); continue; }
      await ExerciseLibrary.create({ name: ex.name, category: ex.category, sport: sport || 'functional', user: req.user._id });
      added.push(ex.name);
    }
    res.json({ added, skipped });
  } catch(err) { res.status(500).json({ message: err.message }); }
});

// POST /api/upload/import — parse photo or text into full workout structure
router.post('/import', auth, async (req, res) => {
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) return res.status(503).json({ message: 'API key not configured' });
    const { images, text, sport } = req.body;
    if ((!images || !images.length) && !text) return res.status(400).json({ message: 'Send images or text' });

    const swimCats = 'stroke,kick,drill,pull,sprint,endurance,rest';
    const funcCats = 'lower,upper,core,conditioning,power';
    const cats = sport === 'swimming' ? swimCats : funcCats;
    const swimMods = 'A1-A2, A2-A3, A3 SPRINT, A3 QUEBRADO, TECHNIQUE, ENDURANCE, PROGRESSIVE, DESCENDING, INTERVALS, RECOVERY';
    const funcMods = 'EMOM, OTM, AMRAP, ROUNDS, FOR TIME, TABATA';
    const mods = sport === 'swimming' ? swimMods : funcMods;

    var content = [];
    if (images && images.length) {
      images.forEach(function(img) {
        content.push({ type: 'image', source: { type: 'base64', media_type: img.mediaType || 'image/jpeg', data: img.data } });
      });
    }

    var prompt = 'Parse this ' + (sport || 'functional') + ' workout into a structured JSON format.\n';
    if (text) prompt += 'Workout text:\n' + text + '\n';
    if (images && images.length) prompt += 'The image contains a workout to parse.\n';
    prompt += 'Categories: ' + cats + '\n';
    prompt += 'Modalities: ' + mods + '\n';
    prompt += 'Return ONLY valid JSON (no markdown, no explanation):\n';
    prompt += '{"pattern":"...","warmup":{"rounds":1,"exercises":[{"name":"...","reps":"...","category":"..."}]},"blocks":[{"label":"A","modality":"...","config":"...","exercises":[{"name":"...","reps":"...","category":"..."}]}]}';

    content.push({ type: 'text', text: prompt });

    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: process.env.CLAUDE_MODEL || 'claude-haiku-4-5-20251001', max_tokens: 2000, messages: [{ role: 'user', content }] })
    });
    const d = await r.json();
    if (!d || !d.content || !d.content[0]) return res.status(500).json({ message: 'AI could not parse the workout' });

    var parsed;
    try {
      parsed = JSON.parse(d.content[0].text.replace(/```json|```/g, '').trim());
    } catch(pe) {
      return res.status(500).json({ message: 'AI returned invalid format', raw: d.content[0].text.substring(0, 300) });
    }

    res.json({ workout: parsed });
  } catch(err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;
