const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['sales', 'services', 'supplier'],
    },
    dateFrom: {
      type: Date,
    },
    dateTo: {
      type: Date,
    },
    branch: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'StoreBranch',
    },
    supplier: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Supplier',
    },
    data: {
      type: mongoose.Schema.Types.Mixed,
    },
    generatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Report', reportSchema);
