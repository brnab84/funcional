const mongoose = require('mongoose');

// A signup that has NOT been confirmed yet. The real User is only created
// once the emailed code is verified. Expired pendings are auto-removed by the
// TTL index, so abandoned signups never become accounts.
const pendingSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  passwordHash: { type: String, required: true },
  role: { type: String, enum: ['athlete', 'coach'], default: 'athlete' },
  coachId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  code: { type: String, required: true },
  expiresAt: { type: Date, required: true },
  createdAt: { type: Date, default: Date.now }
});

// TTL: MongoDB removes the doc once expiresAt passes.
pendingSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('PendingRegistration', pendingSchema);
