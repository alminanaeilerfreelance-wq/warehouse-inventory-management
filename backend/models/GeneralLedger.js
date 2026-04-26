const mongoose = require('mongoose');

const generalLedgerSchema = new mongoose.Schema(
  {
    journalEntry: { type: mongoose.Schema.Types.ObjectId, ref: 'JournalEntry', required: true },
    account: { type: mongoose.Schema.Types.ObjectId, ref: 'ChartOfAccounts', required: true },
    description: String,
    debit: { type: Number, default: 0 },
    credit: { type: Number, default: 0 },
    date: { type: Date, required: true },
    reference: String,
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('GeneralLedger', generalLedgerSchema);
