const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['admin','coach','athlete'], default: 'athlete' },
  // If set, this athlete is linked to a coach (joined via the coach's invite link). Unset (null) = trains solo.
  coachId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  // Reusable invite code for coaches — athletes who register via /?invite=CODE join this coach.
  inviteCode: { type: String, default: null, index: true },
  // Email verification. Default true so PRE-EXISTING accounts are never locked out;
  // new registrations explicitly set false until they confirm the emailed code.
  emailVerified: { type: Boolean, default: true },
  verificationCode: { type: String, default: null },
  verificationExpires: { type: Date, default: null },
  // Password reset (code emailed to the user)
  resetCode: { type: String, default: null },
  resetExpires: { type: Date, default: null },
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
  // Skip if the value is already a bcrypt hash (e.g. created from a pending registration)
  if (/^\$2[aby]\$/.test(this.password)) return next();
  this.password = await bcrypt.hash(this.password, 12); next();
});
userSchema.methods.comparePassword = async function(c) { return bcrypt.compare(c, this.password); };
module.exports = mongoose.model('User', userSchema);




