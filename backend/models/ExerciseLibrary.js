const mongoose = require('mongoose');
const exerciseLibrarySchema = new mongoose.Schema({
  name: { type: String, required: true },
  category: { type: String, required: true },
  equipment: { type: String, default: 'none' },
  sport: { type: String, default: 'functional' },
  active: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now }
});
module.exports = mongoose.model('ExerciseLibrary', exerciseLibrarySchema);
