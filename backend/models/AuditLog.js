// Tracks every critical action in the system
const mongoose = require('mongoose');
const auditLogSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  username: String,
  action: { type: String, enum: ['CREATE','UPDATE','DELETE','LOGIN','LOGOUT','APPROVE','REJECT','EXPORT','IMPORT','LOGIN_FAILED'], required: true },
  module: String, // e.g. 'Inventory', 'Invoice', 'PurchaseOrder'
  recordId: mongoose.Schema.Types.ObjectId,
  description: String,
  before: mongoose.Schema.Types.Mixed, // snapshot before change
  after: mongoose.Schema.Types.Mixed,  // snapshot after change
  ip: String,
  userAgent: String,
  status: { type: String, enum: ['success','failed'], default: 'success' },
}, { timestamps: true });

// Index for fast queries
auditLogSchema.index({ user: 1, createdAt: -1 });
auditLogSchema.index({ module: 1, createdAt: -1 });
auditLogSchema.index({ action: 1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);
