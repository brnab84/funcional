const express = require('express');
const router = express.Router();
const ExerciseLibrary = require('../models/ExerciseLibrary');

// Seed data from whiteboard photos
const DEFAULT_EXERCISES = [
  // Lower body
  { name: 'Air Squats', category: 'lower', equipment: 'none' },
  { name: 'Goblet Squats', category: 'lower', equipment: 'kb' },
  { name: 'Jump Squats', category: 'lower', equipment: 'none' },
  { name: 'Reverse Lunges', category: 'lower', equipment: 'none' },
  { name: 'Walking Lunges', category: 'lower', equipment: 'none' },
  { name: 'Deficit Lunges', category: 'lower', equipment: 'none' },
  { name: 'Jump Lunges', category: 'lower', equipment: 'none' },
  { name: 'Bulgarian Squats', category: 'lower', equipment: 'none' },
  { name: 'Deadlift', category: 'lower', equipment: 'barbell' },
  { name: 'Hip Thrust', category: 'lower', equipment: 'none' },
  { name: 'Box Jump', category: 'lower', equipment: 'box' },
  { name: 'Wall Sit', category: 'lower', equipment: 'none' },
  // Upper body
  { name: 'Push Up', category: 'upper', equipment: 'none' },
  { name: 'Shoulder Press', category: 'upper', equipment: 'kb' },
  { name: 'Dips', category: 'upper', equipment: 'none' },
  { name: 'Pull Up', category: 'upper', equipment: 'rings' },
  { name: 'Ring Row', category: 'upper', equipment: 'rings' },
  { name: 'Row', category: 'upper', equipment: 'none' },
  { name: 'Triceps', category: 'upper', equipment: 'none' },
  // Core
  { name: 'Sit Up', category: 'core', equipment: 'none' },
  { name: 'V-Ups', category: 'core', equipment: 'none' },
  { name: 'Abs Crunch', category: 'core', equipment: 'none' },
  { name: 'Abs Bike', category: 'core', equipment: 'none' },
  { name: 'Abs Ball', category: 'core', equipment: 'none' },
  { name: 'Hollow Rock', category: 'core', equipment: 'none' },
  { name: 'Plank Get Up', category: 'core', equipment: 'none' },
  { name: 'Roll Up', category: 'core', equipment: 'none' },
  { name: 'Russian Twist', category: 'core', equipment: 'none' },
  { name: 'K2E', category: 'core', equipment: 'none' },
  // Conditioning
  { name: 'Burpees', category: 'conditioning', equipment: 'none' },
  { name: 'Burpee Box Jump', category: 'conditioning', equipment: 'box' },
  { name: 'Burpee to Plate', category: 'conditioning', equipment: 'none' },
  { name: 'Burpee L', category: 'conditioning', equipment: 'none' },
  { name: 'Jumping Jacks', category: 'conditioning', equipment: 'none' },
  { name: 'Jump Rope', category: 'conditioning', equipment: 'rope' },
  { name: 'Mountain Climbers', category: 'conditioning', equipment: 'none' },
  { name: 'Sprawl', category: 'conditioning', equipment: 'none' },
  { name: 'Run', category: 'conditioning', equipment: 'none' },
  { name: 'WC/WK', category: 'conditioning', equipment: 'none' },
  // Power
  { name: 'Thruster', category: 'power', equipment: 'kb' },
  { name: 'KB Snatch', category: 'power', equipment: 'kb' },
  { name: 'KB Swing', category: 'power', equipment: 'kb' },
  { name: 'Wall Ball', category: 'power', equipment: 'wall_ball' },
];

// GET /api/exercises - List all
router.get('/', async (req, res) => {
  try {
    const exercises = await ExerciseLibrary.find().sort('category name');
    res.json({ exercises });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/exercises/seed - Seed default exercises
router.post('/seed', async (req, res) => {
  try {
    const count = await ExerciseLibrary.countDocuments();
    if (count > 0) return res.json({ message: 'Already seeded', count });
    
    await ExerciseLibrary.insertMany(DEFAULT_EXERCISES);
    res.json({ message: 'Seeded', count: DEFAULT_EXERCISES.length });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/exercises - Add exercise
router.post('/', async (req, res) => {
  try {
    const { name, category, equipment } = req.body;
    const ex = await ExerciseLibrary.create({ name, category, equipment: equipment || 'none' });
    res.status(201).json({ exercise: ex });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// DELETE /api/exercises/:id
router.delete('/:id', async (req, res) => {
  try {
    await ExerciseLibrary.findByIdAndUpdate(req.params.id, { active: false });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
