// Inventory transfer between warehouses/branches
const mongoose = require('mongoose');
const transferSchema = new mongoose.Schema({
  transferNo: { type: String, required: true, unique: true },
  fromWarehouse: { type: mongoose.Schema.Types.ObjectId, ref: 'Warehouse' },
  toWarehouse: { type: mongoose.Schema.Types.ObjectId, ref: 'Warehouse' },
  fromBranch: { type: mongoose.Schema.Types.ObjectId, ref: 'StoreBranch' },
  toBranch: { type: mongoose.Schema.Types.ObjectId, ref: 'StoreBranch' },
  items: [{
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Inventory' },
    qty: Number,
    notes: String,
  }],
  status: { type: String, enum: ['pending','approved','rejected','completed'], default: 'pending' },
  notes: String,
  requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  approvedAt: Date,
}, { timestamps: true });
module.exports = mongoose.model('Transfer', transferSchema);
