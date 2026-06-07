const mongoose = require('mongoose');
const exerciseSchema = new mongoose.Schema({ name: String, reps: String, category: String });
const blockSchema = new mongoose.Schema({ label: String, modality: String, config: String, exercises: [exerciseSchema] });
const workoutSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  sport: { type: String, default: 'functional' },
  date: { type: String, required: true },
  pattern: String,
  warmup: { rounds: { type: Number, default: 3 }, exercises: [exerciseSchema] },
  blocks: [blockSchema],
  status: { type: String, enum: ['suggestion','approved','rejected'], default: 'suggestion' },
  variant: { type: Number, default: 1 },
  notes: String,
  source: { type: String, enum: ['ai','local'], default: 'local' },
  createdAt: { type: Date, default: Date.now }
});
module.exports = mongoose.model('Workout', workoutSchema);

