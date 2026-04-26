const mongoose = require('mongoose');

const purchaseOrderReturnSchema = new mongoose.Schema(
  {
    returnNo: {
      type: String,
      unique: true,
      trim: true,
    },
    purchaseOrder: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PurchaseOrder',
      required: true,
    },
    supplier: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Supplier',
      required: true,
    },
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
    },
    warehouse: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Warehouse',
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
      enum: ['pending', 'open', 'paid', 'cancelled', 'due'],
      default: 'pending',
    },
    notes: String,
    qrCode: String,
    approvalStatus: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
    },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('PurchaseOrderReturn', purchaseOrderReturnSchema);
