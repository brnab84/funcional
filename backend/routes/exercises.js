const express = require('express');
const router = express.Router();
const ExerciseLibrary = require('../models/ExerciseLibrary');
const auth = require('../middleware/auth');
const { categoriesFor } = require('../utils/constants');

const FUNCTIONAL = [
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

const SWIMMING = [
  {name:'Freestyle',category:'stroke'},{name:'Backstroke',category:'stroke'},
  {name:'Breaststroke',category:'stroke'},{name:'Butterfly',category:'stroke'},
  {name:'IM (Individual Medley)',category:'stroke'},{name:'Easy Freestyle',category:'stroke'},
  {name:'Build Freestyle',category:'stroke'},{name:'Easy Backstroke',category:'stroke'},
  {name:'Easy Mixed Strokes',category:'stroke'},
  {name:'Flutter Kick',category:'kick'},{name:'Dolphin Kick',category:'kick'},
  {name:'Breaststroke Kick',category:'kick'},{name:'Kick with Board',category:'kick'},{name:'Side Kick',category:'kick'},
  {name:'Catch-up Drill',category:'drill'},{name:'Fingertip Drag',category:'drill'},
  {name:'Superman Drill',category:'drill'},{name:'One-arm Drill',category:'drill'},
  {name:'Sculling',category:'drill'},{name:'Fist Drill',category:'drill'},
  {name:'K-D-S (Kick/Drill/Swim)',category:'drill'},{name:'IM Drill',category:'drill'},
  {name:'Pull with Buoy',category:'pull'},{name:'Pull with Paddles',category:'pull'},
  {name:'Sprint Freestyle',category:'sprint'},{name:'Sprint Backstroke',category:'sprint'},
  {name:'Fast Freestyle',category:'sprint'},{name:'Freestyle Descending',category:'sprint'},
  {name:'Distance Freestyle',category:'endurance'},{name:'Continuous Swim',category:'endurance'},
  {name:'Pyramid Set',category:'endurance'},
];

// GET exercises for current user + sport
router.get('/', auth, async (req, res) => {
  try {
    const sport = req.query.sport || 'functional';
    const exercises = await ExerciseLibrary.find({ sport: sport, user: req.user._id }).sort('category name');
    res.json({ exercises });
  } catch(err) { res.status(500).json({ message: err.message }); }
});

// GET categories
router.get('/categories', auth, async (req, res) => {
  try {
    const sport = req.query.sport || 'functional';
    const defaults = categoriesFor(sport).filter(function(cat) { return cat !== 'rest'; });
    const custom = await ExerciseLibrary.distinct('category', { sport: sport, user: req.user._id });
    const all = [...new Set([...defaults, ...custom])];
    res.json({ categories: all });
  } catch(err) { res.status(500).json({ message: err.message }); }
});

// SEED - nuclear: delete ALL for this user+sport, insert correct defaults
router.post('/seed', auth, async (req, res) => {
  const sport = (req.body && req.body.sport) || 'functional';
  const userId = req.user._id;
  try {
    // Drop any old unique indexes
    try { await ExerciseLibrary.collection.dropIndex('name_1'); } catch(e) {}

    // Delete ALL exercises for this user + sport
    await ExerciseLibrary.deleteMany({ user: userId, sport: sport });

    // Also delete any orphan exercises without user (old data)
    await ExerciseLibrary.deleteMany({ user: null, sport: sport });
    await ExerciseLibrary.deleteMany({ user: { $exists: false }, sport: sport });

    // Insert correct defaults
    const src = sport === 'swimming' ? SWIMMING : FUNCTIONAL;
    const docs = src.map(e => ({ name: e.name, category: e.category, sport: sport, user: userId }));
    await ExerciseLibrary.insertMany(docs);

    // Cleanup: remove any exercises with wrong categories for this sport
    var validCats = categoriesFor(sport);
    await ExerciseLibrary.deleteMany({ sport: sport, user: userId, category: { $nin: validCats } });

    const count = await ExerciseLibrary.countDocuments({ sport: sport, user: userId });
    res.json({ message: 'Seeded', count: count, sport: sport });
  } catch(err) {
    res.status(500).json({ message: err.message });
  }
});

// ADD exercise
router.post('/', auth, async (req, res) => {
  try {
    const { name, category, sport } = req.body;
    if (!name || !category) return res.status(400).json({ message: 'Name and category required' });
    const ex = await ExerciseLibrary.create({ name, category, sport: sport || 'functional', user: req.user._id });
    res.status(201).json({ exercise: ex });
  } catch(err) { res.status(400).json({ message: err.message }); }
});

// DELETE exercise
router.delete('/:id', auth, async (req, res) => {
  try {
    await ExerciseLibrary.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    res.json({ ok: true });
  } catch(err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;


