const mongoose = require('mongoose');

const invoiceCustomerSchema = new mongoose.Schema(
  {
    invoiceNo: {
      type: String,
      unique: true,
      trim: true,
    },
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
      required: true,
    },
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
    },
    storeBranch: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'StoreBranch',
    },
    items: [
      {
        product: { type: mongoose.Schema.Types.ObjectId, ref: 'ProductName' },
        quantity: Number,
        price: Number,
        discount: Number,
        discountType: { type: String, enum: ['percentage', 'fixed'], default: 'percentage' },
        total: Number,
      },
    ],
    subtotal: Number,
    discount: Number,
    discountType: { type: String, enum: ['percentage', 'fixed'], default: 'percentage' },
    vat: Number,
    vatInclusive: { type: Boolean, default: false },
    total: Number,
    totalQty: Number,
    paymentStatus: {
      type: String,
      enum: ['pending', 'open', 'paid', 'cancelled', 'due', 'overdue'],
      default: 'pending',
    },
    notes: String,
    qrCode: String,
    scheduledDate: Date,
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('InvoiceCustomer', invoiceCustomerSchema);
