const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['admin','coach','athlete'], default: 'athlete' },
  sports: [{ type: { type: String, default: 'functional' }, active: { type: Boolean, default: true } }],
  settings: {
    blockCount: { type: Number, default: 2, min: 1, max: 4 },
    blockModalities: { A: { type: String, default: 'random' }, B: { type: String, default: 'random' }, C: { type: String, default: 'random' }, D: { type: String, default: 'random' } },
    avoidRepeatDays: { type: Number, default: 7 },
    defaultSport: { type: String, default: 'functional' }
  },
  createdAt: { type: Date, default: Date.now }
});
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12); next();
});
userSchema.methods.comparePassword = async function(c) { return bcrypt.compare(c, this.password); };
module.exports = mongoose.model('User', userSchema);
