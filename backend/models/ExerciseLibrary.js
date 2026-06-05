const mongoose = require('mongoose');

const exerciseLibrarySchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  category: { type: String, enum: ['lower', 'upper', 'core', 'conditioning', 'power'], required: true },
  equipment: { type: String, default: 'none' }, // none, kb, barbell, box, rope, wall_ball, rings
  active: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('ExerciseLibrary', exerciseLibrarySchema);
