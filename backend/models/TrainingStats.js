const mongoose = require('mongoose');

// Stores learning data per user per sport
// Updated every time a workout is approved (local or AI)
const trainingStatsSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  sport: { type: String, required: true },

  // Exercise frequency: { "Sprint Freestyle": 12, "Pull with Buoy": 8 }
  exerciseFreq: { type: Map, of: Number, default: {} },

  // Modality frequency: { "A1-A2": 5, "SPRINT": 8 }
  modalityFreq: { type: Map, of: Number, default: {} },

  // Category frequency: { "stroke": 30, "kick": 15, "drill": 10 }
  categoryFreq: { type: Map, of: Number, default: {} },

  // Pattern frequency: { "A1-A3": 3, "EC+ABC": 5 }
  patternFreq: { type: Map, of: Number, default: {} },

  // Reps/distance preferences: { "50m": 20, "100m": 15, "8": 10, "12": 8 }
  repsFreq: { type: Map, of: Number, default: {} },

  // Total approved count
  totalApproved: { type: Number, default: 0 },

  // Source tracking: how many from local vs AI
  localApproved: { type: Number, default: 0 },
  aiApproved: { type: Number, default: 0 },

  updatedAt: { type: Date, default: Date.now }
});

// Compound unique index
trainingStatsSchema.index({ user: 1, sport: 1 }, { unique: true });

module.exports = mongoose.model('TrainingStats', trainingStatsSchema);
