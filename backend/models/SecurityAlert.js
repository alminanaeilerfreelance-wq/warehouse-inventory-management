const mongoose = require('mongoose');
const schema = new mongoose.Schema({
  ip: { type: String, required: true },
  username: String,
  attempts: { type: Number, default: 1 },
  action: { type: String, enum: ['login_failed','account_locked','suspicious_activity'], default: 'login_failed' },
  userAgent: String,
  resolved: { type: Boolean, default: false },
  resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  resolvedAt: Date,
  notes: String,
}, { timestamps: true });

schema.index({ ip: 1, createdAt: -1 });
schema.index({ resolved: 1 });

module.exports = mongoose.model('SecurityAlert', schema);
