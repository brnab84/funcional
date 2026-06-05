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

router.get('/', async (req, res) => {
  try {
    const sport = req.query.sport || 'functional';
    res.json({ exercises: await ExerciseLibrary.find({ sport }).sort('category name') });
  } catch(err) { res.status(500).json({ message: err.message }); }
});

router.get('/categories', async (req, res) => {
  try {
    const sport = req.query.sport || 'functional';
    const cats = await ExerciseLibrary.distinct('category', { sport });
    const all = [...new Set(['lower','upper','core','conditioning','power', ...cats])];
    res.json({ categories: all });
  } catch(err) { res.status(500).json({ message: err.message }); }
});

// Seed: delete ALL old ones for this sport and insert fresh
router.post('/seed', async (req, res) => {
  const sport = (req.body && req.body.sport) || 'functional';
  try {
    await ExerciseLibrary.deleteMany({ sport });
    const docs = DEFAULTS.map(e => ({ name: e.name, category: e.category, sport }));
    await ExerciseLibrary.insertMany(docs);
    const count = await ExerciseLibrary.countDocuments({ sport });
    res.json({ message: 'Seeded', count });
  } catch(err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/', auth, async (req, res) => {
  try {
    const { name, category, equipment, sport } = req.body;
    const ex = await ExerciseLibrary.create({ name, category, equipment: equipment||'none', sport: sport||'functional' });
    res.status(201).json({ exercise: ex });
  } catch(err) { res.status(400).json({ message: err.message }); }
});

router.delete('/:id', auth, async (req, res) => {
  try { await ExerciseLibrary.findByIdAndDelete(req.params.id); res.json({ ok: true }); }
  catch(err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;
