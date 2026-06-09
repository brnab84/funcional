const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['admin','coach','athlete'], default: 'athlete' },
  // If set, this athlete is linked to a coach (added by that coach). Unset (null) = trains solo.
  coachId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  sports: [{ type: { type: String, default: 'functional' }, active: { type: Boolean, default: true } }],
  settings: {
    blockCount: { type: Number, default: 2, min: 1, max: 4 },
    blockModalities: { A: { type: String, default: 'random' }, B: { type: String, default: 'random' }, C: { type: String, default: 'random' }, D: { type: String, default: 'random' } },
    avoidRepeatDays: { type: Number, default: 7 },
    defaultSport: { type: String, default: 'functional' },
    theme: { type: String, default: 'dark' },
    poolLength: { type: Number, default: 25 },
    swimRestTimes: {
      d50: { type: Number, default: 30 },
      d100: { type: Number, default: 45 },
      d200: { type: Number, default: 60 },
      d300: { type: Number, default: 75 },
      d400: { type: Number, default: 90 },
      d500: { type: Number, default: 120 }
    }
  },
  lastLogin: { type: Date },
  loginCount: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now }
});
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12); next();
});
userSchema.methods.comparePassword = async function(c) { return bcrypt.compare(c, this.password); };
module.exports = mongoose.model('User', userSchema);




