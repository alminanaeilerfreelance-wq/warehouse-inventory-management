const mongoose = require('mongoose');

const inventoryAdjustmentItemSchema = new mongoose.Schema(
  {
    inventory: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Inventory',
    },
    quantity: {
      type: Number,
    },
    price: {
      type: Number,
    },
    reason: {
      type: String,
      trim: true,
    },
  },
  { _id: false }
);

const inventoryAdjustmentSchema = new mongoose.Schema(
  {
    invoiceNo: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    type: {
      type: String,
      enum: ['increment', 'decrement'],
    },
    items: [inventoryAdjustmentItemSchema],
    notes: {
      type: String,
      trim: true,
    },
    adjustedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    qrCode: { type: String },
  },
  { timestamps: true }
);

module.exports = mongoose.model('InventoryAdjustment', inventoryAdjustmentSchema);
