const mongoose = require('mongoose');

const exerciseSchema = new mongoose.Schema({
  name: { type: String, required: true },
  reps: { type: String },
  category: { type: String, enum: ['lower', 'upper', 'core', 'conditioning', 'power'] }
});

const blockSchema = new mongoose.Schema({
  label: String, // A, B, C...
  modality: String, // EMOM, OTM, AMRAP, FOR TIME, ROUNDS, TABATA, DESCENDING, ZONES, 45x15
  config: String, // "7'", "21-15-9", "3 Rounds", "45x15 3 series", etc.
  exercises: [exerciseSchema]
});

const workoutSchema = new mongoose.Schema({
  date: { type: String, required: true }, // YYYY-MM-DD
  warmup: {
    rounds: { type: Number, default: 3 },
    exercises: [exerciseSchema]
  },
  blocks: [blockSchema],
  status: { type: String, enum: ['suggestion', 'approved', 'rejected'], default: 'suggestion' },
  variant: { type: Number, default: 1 }, // 1, 2, 3
  notes: String,
  source: { type: String, enum: ['ai', 'local'], default: 'local' },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Workout', workoutSchema);
