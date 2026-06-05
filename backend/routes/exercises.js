const express = require('express');
const router = express.Router();
const ExerciseLibrary = require('../models/ExerciseLibrary');
const auth = require('../middleware/auth');

const DEFAULTS = [
  {name:'Air Squats',category:'lower'},{name:'Goblet Squats',category:'lower'},{name:'Jump Squats',category:'lower'},
  {name:'Reverse Lunges',category:'lower'},{name:'Walking Lunges',category:'lower'},{name:'Deficit Lunges',category:'lower'},
  {name:'Jump Lunges',category:'lower'},{name:'Bulgarian Squats',category:'lower'},{name:'Deadlift',category:'lower'},
  {name:'Hip Thrust',category:'lower'},{name:'Box Jump',category:'lower'},{name:'Wall Sit',category:'lower'},
  {name:'Push Up',category:'upper'},{name:'Shoulder Press',category:'upper'},{name:'Dips',category:'upper'},
  {name:'Pull Up',category:'upper'},{name:'Ring Row',category:'upper'},{name:'Row',category:'upper'},{name:'Triceps',category:'upper'},
  {name:'Sit Up',category:'core'},{name:'V-Ups',category:'core'},{name:'Abs Crunch',category:'core'},
  {name:'Abs Bike',category:'core'},{name:'Abs Ball',category:'core'},{name:'Hollow Rock',category:'core'},
  {name:'Plank Get Up',category:'core'},{name:'Roll Up',category:'core'},{name:'Russian Twist',category:'core'},{name:'K2E',category:'core'},
  {name:'Burpees',category:'conditioning'},{name:'Burpee Box Jump',category:'conditioning'},{name:'Burpee to Plate',category:'conditioning'},
  {name:'Burpee L',category:'conditioning'},{name:'Jumping Jacks',category:'conditioning'},{name:'Jump Rope',category:'conditioning'},
  {name:'Mountain Climbers',category:'conditioning'},{name:'Sprawl',category:'conditioning'},{name:'Run',category:'conditioning'},{name:'WC/WK',category:'conditioning'},
  {name:'Thruster',category:'power'},{name:'KB Snatch',category:'power'},{name:'KB Swing',category:'power'},{name:'Wall Ball',category:'power'},
];

router.get('/', auth, async (req, res) => {
  try {
    const sport = req.query.sport || 'functional';
    const exercises = await ExerciseLibrary.find({ active: true, sport }).sort('category name');
    res.json({ exercises });
  } catch(err) { res.status(500).json({ message: 'GET error: ' + err.message }); }
});

// Distinct categories for a sport (for dropdown)
router.get('/categories', auth, async (req, res) => {
  try {
    const sport = req.query.sport || 'functional';
    const cats = await ExerciseLibrary.distinct('category', { active: true, sport });
    const defaults = ['lower','upper','core','conditioning','power'];
    const all = [...new Set([...defaults, ...cats])];
    res.json({ categories: all });
  } catch(err) { res.status(500).json({ message: err.message }); }
});

router.post('/seed', auth, async (req, res) => {
  const sport = req.body.sport || 'functional';
  let added = 0, skipped = 0;
  const errors = [];
  try {
    for (const ex of DEFAULTS) {
      try {
        const exists = await ExerciseLibrary.findOne({ name: ex.name, sport });
        if (exists) {
          if (!exists.active) { exists.active = true; await exists.save(); }
          skipped++;
        } else {
          await ExerciseLibrary.create({ name: ex.name, category: ex.category, sport, active: true });
          added++;
        }
      } catch(e) { errors.push(`${ex.name}: ${e.message}`); }
    }
    const count = await ExerciseLibrary.countDocuments({ sport, active: true });
    res.json({ message: 'Seeded', added, skipped, count, errors: errors.slice(0,5) });
  } catch(err) {
    res.status(500).json({ message: 'Seed error: ' + err.message, added, skipped, errors: errors.slice(0,5) });
  }
});

router.post('/', auth, async (req, res) => {
  try {
    const { name, category, equipment, sport } = req.body;
    if (!name || !category) return res.status(400).json({ message: 'Name and category required' });
    const ex = await ExerciseLibrary.create({ name, category, equipment: equipment||'none', sport: sport||'functional' });
    res.status(201).json({ exercise: ex });
  } catch(err) { res.status(400).json({ message: err.message }); }
});

router.delete('/:id', auth, async (req, res) => {
  try { await ExerciseLibrary.findByIdAndUpdate(req.params.id, { active: false }); res.json({ ok: true }); }
  catch(err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;
