const mongoose = require('mongoose');

const journalEntrySchema = new mongoose.Schema(
  {
    journalNo: {
      type: String,
      unique: true,
      trim: true,
    },
    date: {
      type: Date,
      required: true,
    },
    reference: {
      type: String,
      enum: ['invoice', 'purchase_order', 'expense', 'payroll', 'other'],
      required: true,
    },
    referenceId: mongoose.Schema.Types.ObjectId,
    description: String,
    entries: [
      {
        account: { type: mongoose.Schema.Types.ObjectId, ref: 'ChartOfAccounts' },
        debit: Number,
        credit: Number,
      },
    ],
    totalDebit: Number,
    totalCredit: Number,
    status: {
      type: String,
      enum: ['draft', 'posted', 'reversed'],
      default: 'draft',
    },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    postedDate: Date,
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('JournalEntry', journalEntrySchema);
