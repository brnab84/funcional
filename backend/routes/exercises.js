const express = require('express');
const router = express.Router();
const ExerciseLibrary = require('../models/ExerciseLibrary');
const auth = require('../middleware/auth');

const DEFAULTS = [
  // Lower
  {name:'Air Squats',category:'lower',equipment:'none'},{name:'Goblet Squats',category:'lower',equipment:'kb'},
  {name:'Jump Squats',category:'lower',equipment:'none'},{name:'Reverse Lunges',category:'lower',equipment:'none'},
  {name:'Walking Lunges',category:'lower',equipment:'none'},{name:'Deficit Lunges',category:'lower',equipment:'none'},
  {name:'Jump Lunges',category:'lower',equipment:'none'},{name:'Bulgarian Squats',category:'lower',equipment:'none'},
  {name:'Deadlift',category:'lower',equipment:'barbell'},{name:'Hip Thrust',category:'lower',equipment:'none'},
  {name:'Box Jump',category:'lower',equipment:'box'},{name:'Wall Sit',category:'lower',equipment:'none'},
  // Upper
  {name:'Push Up',category:'upper',equipment:'none'},{name:'Shoulder Press',category:'upper',equipment:'kb'},
  {name:'Dips',category:'upper',equipment:'none'},{name:'Pull Up',category:'upper',equipment:'rings'},
  {name:'Ring Row',category:'upper',equipment:'rings'},{name:'Row',category:'upper',equipment:'none'},
  {name:'Triceps',category:'upper',equipment:'none'},
  // Core
  {name:'Sit Up',category:'core',equipment:'none'},{name:'V-Ups',category:'core',equipment:'none'},
  {name:'Abs Crunch',category:'core',equipment:'none'},{name:'Abs Bike',category:'core',equipment:'none'},
  {name:'Abs Ball',category:'core',equipment:'none'},{name:'Hollow Rock',category:'core',equipment:'none'},
  {name:'Plank Get Up',category:'core',equipment:'none'},{name:'Roll Up',category:'core',equipment:'none'},
  {name:'Russian Twist',category:'core',equipment:'none'},{name:'K2E',category:'core',equipment:'none'},
  // Conditioning
  {name:'Burpees',category:'conditioning',equipment:'none'},{name:'Burpee Box Jump',category:'conditioning',equipment:'box'},
  {name:'Burpee to Plate',category:'conditioning',equipment:'none'},{name:'Burpee L',category:'conditioning',equipment:'none'},
  {name:'Jumping Jacks',category:'conditioning',equipment:'none'},{name:'Jump Rope',category:'conditioning',equipment:'rope'},
  {name:'Mountain Climbers',category:'conditioning',equipment:'none'},{name:'Sprawl',category:'conditioning',equipment:'none'},
  {name:'Run',category:'conditioning',equipment:'none'},{name:'WC/WK',category:'conditioning',equipment:'none'},
  // Power
  {name:'Thruster',category:'power',equipment:'kb'},{name:'KB Snatch',category:'power',equipment:'kb'},
  {name:'KB Swing',category:'power',equipment:'kb'},{name:'Wall Ball',category:'power',equipment:'wall_ball'},
];

router.get('/', auth, async (req, res) => {
  try {
    const sport = req.query.sport || 'functional';
    const exercises = await ExerciseLibrary.find({ active: true, sport }).sort('category name');
    res.json({ exercises });
  } catch(err) { res.status(500).json({ message: err.message }); }
});

router.post('/seed', auth, async (req, res) => {
  try {
    const sport = req.body.sport || 'functional';
    // Delete inactive and re-seed to ensure clean state
    const existing = await ExerciseLibrary.find({ sport });
    if (existing.length > 0) {
      // Already has exercises, just activate them all
      await ExerciseLibrary.updateMany({ sport }, { active: true });
      const count = await ExerciseLibrary.countDocuments({ sport, active: true });
      return res.json({ message: 'Already seeded', count });
    }
    const toInsert = DEFAULTS.map(e => ({ ...e, sport, active: true }));
    await ExerciseLibrary.insertMany(toInsert, { ordered: false });
    const count = await ExerciseLibrary.countDocuments({ sport, active: true });
    res.json({ message: 'Seeded', count });
  } catch(err) {
    // If duplicate key errors, some were inserted - count what we have
    const count = await ExerciseLibrary.countDocuments({ sport: req.body.sport || 'functional', active: true });
    if (count > 0) return res.json({ message: 'Seeded', count });
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
  try {
    await ExerciseLibrary.findByIdAndUpdate(req.params.id, { active: false });
    res.json({ ok: true });
  } catch(err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;
