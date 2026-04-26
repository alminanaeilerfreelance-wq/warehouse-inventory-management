const mongoose = require('mongoose');

const payrollSchema = new mongoose.Schema(
  {
    payrollNo: {
      type: String,
      unique: true,
      trim: true,
    },
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      required: true,
    },
    period: {
      startDate: Date,
      endDate: Date,
    },
    baseSalary: Number,
    allowances: Number,
    deductions: [
      {
        deductionType: String,
        amount: Number,
      },
    ],
    grossPay: Number,
    netPay: Number,
    paymentStatus: {
      type: String,
      enum: ['pending', 'approved', 'paid', 'cancelled'],
      default: 'pending',
    },
    paymentMethod: { type: String, enum: ['cash', 'bank_transfer', 'check'], default: 'bank_transfer' },
    paymentDate: Date,
    remarks: String,
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Payroll', payrollSchema);
