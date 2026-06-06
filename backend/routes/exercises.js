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

// List exercises for current user

const SWIM_DEFAULTS = [
  // Strokes
  {name:'Freestyle',category:'stroke'},{name:'Backstroke',category:'stroke'},
  {name:'Breaststroke',category:'stroke'},{name:'Butterfly',category:'stroke'},
  {name:'IM (Individual Medley)',category:'stroke'},{name:'Easy Freestyle',category:'stroke'},
  {name:'Build Freestyle',category:'stroke'},{name:'Easy Backstroke',category:'stroke'},
  {name:'Easy Mixed Strokes',category:'stroke'},
  // Kick
  {name:'Flutter Kick',category:'kick'},{name:'Dolphin Kick',category:'kick'},
  {name:'Breaststroke Kick',category:'kick'},{name:'Kick with Board',category:'kick'},
  {name:'Side Kick',category:'kick'},
  // Drill
  {name:'Catch-up Drill',category:'drill'},{name:'Fingertip Drag',category:'drill'},
  {name:'Superman Drill',category:'drill'},{name:'One-arm Drill',category:'drill'},
  {name:'Sculling',category:'drill'},{name:'Fist Drill',category:'drill'},
  {name:'K-D-S (Kick/Drill/Swim)',category:'drill'},{name:'IM Drill',category:'drill'},
  // Pull
  {name:'Pull with Buoy',category:'pull'},{name:'Pull with Paddles',category:'pull'},
  // Sprint
  {name:'Sprint Freestyle',category:'sprint'},{name:'Sprint Backstroke',category:'sprint'},
  {name:'Fast Freestyle',category:'sprint'},{name:'Freestyle Descending',category:'sprint'},
  // Endurance
  {name:'Distance Freestyle',category:'endurance'},{name:'Continuous Swim',category:'endurance'},
  {name:'Pyramid Set',category:'endurance'},
];

router.get('/', auth, async (req, res) => {
  try {
    const sport = req.query.sport || 'functional';
    const exercises = await ExerciseLibrary.find({ sport, user: req.user._id }).sort('category name');
    res.json({ exercises });
  } catch(err) { res.status(500).json({ message: err.message }); }
});

router.get('/categories', auth, async (req, res) => {
  try {
    const sport = req.query.sport || 'functional';
    const cats = await ExerciseLibrary.distinct('category', { sport, user: req.user._id });
    const all = [...new Set(['lower','upper','core','conditioning','power', ...cats])];
    res.json({ categories: all });
  } catch(err) { res.status(500).json({ message: err.message }); }
});

// Seed for current user - creates their own copy
router.post('/seed', auth, async (req, res) => {
  const sport = (req.body && req.body.sport) || 'functional';
  const userId = req.user._id;
  try {
    // Drop old unique index if exists
    try { await ExerciseLibrary.collection.dropIndex('name_1'); } catch(e) {}

    // Check if this user already has exercises
    const existing = await ExerciseLibrary.countDocuments({ sport, user: userId });
    if (existing > 0) {
      return res.json({ message: 'Already seeded', count: existing });
    }

    // Insert for this user
    var src = (sport === 'swimming') ? SWIM_DEFAULTS : DEFAULTS;
    const docs = src.map(e => ({ name: e.name, category: e.category, sport, user: userId }));
    await ExerciseLibrary.insertMany(docs);
    const count = await ExerciseLibrary.countDocuments({ sport, user: userId });
    res.json({ message: 'Seeded', count });
  } catch(err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/', auth, async (req, res) => {
  try {
    const { name, category, equipment, sport } = req.body;
    const ex = await ExerciseLibrary.create({ name, category, equipment: equipment||'none', sport: sport||'functional', user: req.user._id });
    res.status(201).json({ exercise: ex });
  } catch(err) { res.status(400).json({ message: err.message }); }
});

router.delete('/:id', auth, async (req, res) => {
  try { await ExerciseLibrary.findOneAndDelete({ _id: req.params.id, user: req.user._id }); res.json({ ok: true }); }
  catch(err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;



