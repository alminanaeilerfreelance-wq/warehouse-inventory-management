const mongoose = require('mongoose');

const expenseSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    amount: {
      type: Number,
      default: 0,
    },
    date: {
      type: Date,
    },
    category: {
      type: String,
      trim: true,
    },
    storeBranch: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'StoreBranch',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Expense', expenseSchema);
