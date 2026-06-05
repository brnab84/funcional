const mongoose = require('mongoose');
const exerciseLibrarySchema = new mongoose.Schema({
  name: { type: String, required: true },
  category: { type: String, required: true },
  equipment: { type: String, default: 'none' },
  sport: { type: String, default: 'functional' },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  createdAt: { type: Date, default: Date.now }
});
module.exports = mongoose.model('ExerciseLibrary', exerciseLibrarySchema);
