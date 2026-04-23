const mongoose = require('mongoose');

const inventorySchema = new mongoose.Schema(
  {
    brand: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Brand',
    },
    design: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Design',
    },
    supplier: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Supplier',
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
    },
    productName: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ProductName',
    },
    zone: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Zone',
    },
    bin: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Bin',
    },
    rack: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Rack',
    },
    location: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Location',
    },
    warehouse: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Warehouse',
    },
    type: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Type',
    },
    unit: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Unit',
    },
    expirationDate: {
      type: Date,
    },
    dateReceived: {
      type: Date,
    },
    cost: {
      type: Number,
    },
    srp: {
      type: Number,
    },
    quantity: {
      type: Number,
      default: 0,
    },
    totalCost: {
      type: Number,
    },
    totalSrp: {
      type: Number,
    },
    vatType: {
      type: String,
      enum: ['inclusive', 'exclusive', 'none'],
      default: 'none',
    },
    vatAmount: {
      type: Number,
      default: 0,
    },
    stockStatus: {
      type: String,
      enum: ['in_stock', 'low_stock', 'out_of_stock'],
      default: 'in_stock',
    },
    lowStockThreshold: {
      type: Number,
      default: 10,
    },
    sku: {
      type: String,
      trim: true,
    },
    barcode: {
      type: String,
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Inventory', inventorySchema);
