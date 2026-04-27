const mongoose = require('mongoose');

const purchaseOrderItemSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Inventory',
    },
    productName: {
      type: String,
      trim: true,
    },
    qty: {
      type: Number,
    },
    price: {
      type: Number,
    },
    total: {
      type: Number,
    },
  },
  { _id: false }
);

const purchaseOrderSchema = new mongoose.Schema(
  {
    invoiceNo: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    supplier: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Supplier',
    },
    warehouse: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Warehouse',
    },
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
    },
    items: [purchaseOrderItemSchema],
    subtotal: {
      type: Number,
    },
    totalAmount: {
      type: Number,
    },
    vatAmount: {
      type: Number,
    },
    vatType: {
      type: String,
      enum: ['inclusive', 'exclusive'],
    },
    notes: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
    },
    isApproved: {
      type: Boolean,
      default: false,
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    approvedAt: {
      type: Date,
    },
    type: {
      type: String,
      enum: ['purchase', 'return'],
      default: 'purchase',
    },
    qrCode: {
      type: String,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('PurchaseOrder', purchaseOrderSchema);
