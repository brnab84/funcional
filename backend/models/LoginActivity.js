const mongoose = require('mongoose');

// Records each login event for admin monitoring.
const loginActivitySchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  email: { type: String, required: true },
  name: { type: String },
  ip: { type: String },
  userAgent: { type: String },
  timestamp: { type: Date, default: Date.now }
});
loginActivitySchema.index({ timestamp: -1 });
module.exports = mongoose.model('LoginActivity', loginActivitySchema);
