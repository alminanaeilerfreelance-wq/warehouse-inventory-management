// Payment records for invoices
const mongoose = require('mongoose');
const paymentSchema = new mongoose.Schema({
  invoice: { type: mongoose.Schema.Types.ObjectId, ref: 'Invoice', required: true },
  amount: { type: Number, required: true },
  method: { type: String, enum: ['cash','card','bank_transfer','gcash','maya','check','other'], default: 'cash' },
  reference: String,  // check number, transaction ID, etc.
  notes: String,
  recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });
module.exports = mongoose.model('Payment', paymentSchema);
