const express = require('express');
const router = express.Router();
const ExerciseLibrary = require('../models/ExerciseLibrary');
const auth = require('../middleware/auth');
const DEFAULTS = [
  {name:'Air Squats',category:'lower',equipment:'none',sport:'functional'},{name:'Goblet Squats',category:'lower',equipment:'kb',sport:'functional'},
  {name:'Jump Squats',category:'lower',equipment:'none',sport:'functional'},{name:'Reverse Lunges',category:'lower',equipment:'none',sport:'functional'},
  {name:'Walking Lunges',category:'lower',equipment:'none',sport:'functional'},{name:'Deficit Lunges',category:'lower',equipment:'none',sport:'functional'},
  {name:'Jump Lunges',category:'lower',equipment:'none',sport:'functional'},{name:'Bulgarian Squats',category:'lower',equipment:'none',sport:'functional'},
  {name:'Deadlift',category:'lower',equipment:'barbell',sport:'functional'},{name:'Hip Thrust',category:'lower',equipment:'none',sport:'functional'},
  {name:'Box Jump',category:'lower',equipment:'box',sport:'functional'},{name:'Wall Sit',category:'lower',equipment:'none',sport:'functional'},
  {name:'Push Up',category:'upper',equipment:'none',sport:'functional'},{name:'Shoulder Press',category:'upper',equipment:'kb',sport:'functional'},
  {name:'Dips',category:'upper',equipment:'none',sport:'functional'},{name:'Pull Up',category:'upper',equipment:'rings',sport:'functional'},
  {name:'Ring Row',category:'upper',equipment:'rings',sport:'functional'},{name:'Row',category:'upper',equipment:'none',sport:'functional'},
  {name:'Triceps',category:'upper',equipment:'none',sport:'functional'},{name:'Sit Up',category:'core',equipment:'none',sport:'functional'},
  {name:'V-Ups',category:'core',equipment:'none',sport:'functional'},{name:'Abs Crunch',category:'core',equipment:'none',sport:'functional'},
  {name:'Abs Bike',category:'core',equipment:'none',sport:'functional'},{name:'Abs Ball',category:'core',equipment:'none',sport:'functional'},
  {name:'Hollow Rock',category:'core',equipment:'none',sport:'functional'},{name:'Plank Get Up',category:'core',equipment:'none',sport:'functional'},
  {name:'Roll Up',category:'core',equipment:'none',sport:'functional'},{name:'Russian Twist',category:'core',equipment:'none',sport:'functional'},
  {name:'K2E',category:'core',equipment:'none',sport:'functional'},{name:'Burpees',category:'conditioning',equipment:'none',sport:'functional'},
  {name:'Burpee Box Jump',category:'conditioning',equipment:'box',sport:'functional'},{name:'Burpee to Plate',category:'conditioning',equipment:'none',sport:'functional'},
  {name:'Burpee L',category:'conditioning',equipment:'none',sport:'functional'},{name:'Jumping Jacks',category:'conditioning',equipment:'none',sport:'functional'},
  {name:'Jump Rope',category:'conditioning',equipment:'rope',sport:'functional'},{name:'Mountain Climbers',category:'conditioning',equipment:'none',sport:'functional'},
  {name:'Sprawl',category:'conditioning',equipment:'none',sport:'functional'},{name:'Run',category:'conditioning',equipment:'none',sport:'functional'},
  {name:'WC/WK',category:'conditioning',equipment:'none',sport:'functional'},{name:'Thruster',category:'power',equipment:'kb',sport:'functional'},
  {name:'KB Snatch',category:'power',equipment:'kb',sport:'functional'},{name:'KB Swing',category:'power',equipment:'kb',sport:'functional'},
  {name:'Wall Ball',category:'power',equipment:'wall_ball',sport:'functional'},
];
router.get('/', auth, async (req, res) => {
  try {
    const sport = req.query.sport || 'functional';
    res.json({ exercises: await ExerciseLibrary.find({ active: true, sport }).sort('category name') });
  } catch(err) { res.status(500).json({ message: err.message }); }
});
router.post('/seed', auth, async (req, res) => {
  try {
    const sport = req.body.sport || 'functional';
    const count = await ExerciseLibrary.countDocuments({ sport });
    if (count > 0) return res.json({ message: 'Already seeded', count });
    const toSeed = DEFAULTS.filter(e => e.sport === sport);
    await ExerciseLibrary.insertMany(toSeed);
    res.json({ message: 'Seeded', count: toSeed.length });
  } catch(err) { res.status(500).json({ message: err.message }); }
});
router.post('/', auth, async (req, res) => {
  try {
    const { name, category, equipment, sport } = req.body;
    res.status(201).json({ exercise: await ExerciseLibrary.create({ name, category, equipment: equipment||'none', sport: sport||'functional' }) });
  } catch(err) { res.status(400).json({ message: err.message }); }
});
router.delete('/:id', auth, async (req, res) => {
  try { await ExerciseLibrary.findByIdAndUpdate(req.params.id, { active: false }); res.json({ ok: true }); }
  catch(err) { res.status(500).json({ message: err.message }); }
});
module.exports = router;
