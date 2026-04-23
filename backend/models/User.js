const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    password: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      enum: ['admin', 'user'],
      default: 'user',
    },
    customerName: {
      type: String,
      trim: true,
    },
    contact: {
      type: String,
      trim: true,
    },
    address: {
      type: String,
      trim: true,
    },
    image: {
      type: String,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    failedLoginAttempts: { type: Number, default: 0 },
    lockUntil: { type: Date, default: null },
    lastLoginAt: { type: Date },
    lastLoginIp: { type: String },
    isSuspicious: { type: Boolean, default: false },
    suspiciousReason: { type: String },
    assignedBranch: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'StoreBranch',
      default: null,
    },
    permissions: {
      type: {
        inventory:     { view: { type: Boolean, default: true }, create: { type: Boolean, default: false }, edit: { type: Boolean, default: false }, delete: { type: Boolean, default: false } },
        invoices:      { view: { type: Boolean, default: true }, create: { type: Boolean, default: true },  edit: { type: Boolean, default: false }, delete: { type: Boolean, default: false } },
        purchaseOrders:{ view: { type: Boolean, default: true }, create: { type: Boolean, default: false }, edit: { type: Boolean, default: false }, delete: { type: Boolean, default: false } },
        returnOrders:  { view: { type: Boolean, default: true }, create: { type: Boolean, default: false }, edit: { type: Boolean, default: false }, delete: { type: Boolean, default: false } },
        transfers:     { view: { type: Boolean, default: true }, create: { type: Boolean, default: false }, edit: { type: Boolean, default: false }, delete: { type: Boolean, default: false } },
        reports:       { view: { type: Boolean, default: true }, create: { type: Boolean, default: false }, edit: { type: Boolean, default: false }, delete: { type: Boolean, default: false } },
        masterData:    { view: { type: Boolean, default: true }, create: { type: Boolean, default: false }, edit: { type: Boolean, default: false }, delete: { type: Boolean, default: false } },
        settings:      { view: { type: Boolean, default: false }, create: { type: Boolean, default: false }, edit: { type: Boolean, default: false }, delete: { type: Boolean, default: false } },
        users:         { view: { type: Boolean, default: false }, create: { type: Boolean, default: false }, edit: { type: Boolean, default: false }, delete: { type: Boolean, default: false } },
        adjustments:   { view: { type: Boolean, default: true }, create: { type: Boolean, default: false }, edit: { type: Boolean, default: false }, delete: { type: Boolean, default: false } },
      },
      default: {},
    },
    googleId: { type: String },
  },
  { timestamps: true }
);

userSchema.virtual('isLocked').get(function () {
  return this.lockUntil && this.lockUntil > Date.now();
});

userSchema.methods.incFailedAttempts = async function () {
  const MAX_ATTEMPTS = 5;
  const LOCK_TIME = 15 * 60 * 1000; // 15 minutes

  this.failedLoginAttempts += 1;

  if (this.failedLoginAttempts >= MAX_ATTEMPTS) {
    this.lockUntil = new Date(Date.now() + LOCK_TIME);
    this.isSuspicious = true;
    this.suspiciousReason = `Account locked after ${MAX_ATTEMPTS} failed attempts`;
  }

  return this.save();
};

userSchema.methods.resetFailedAttempts = async function (ip) {
  this.failedLoginAttempts = 0;
  this.lockUntil = null;
  this.lastLoginAt = new Date();
  if (ip) this.lastLoginIp = ip;
  return this.save();
};

module.exports = mongoose.model('User', userSchema);
