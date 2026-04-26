const express = require('express');
const router = express.Router();
const Payroll = require('../models/Payroll');
const Deduction = require('../models/Deduction');
const adminPasswordAuth = require('../middleware/adminPassword');
const { protect } = require('../middleware/auth');

// GET all payroll records
router.get('/', protect, async (req, res) => {
  try {
    const { employeeId, status, startDate, endDate, page = 1, limit = 20 } = req.query;
    
    let query = {};
    if (employeeId) query.employee = employeeId;
    if (status) query.paymentStatus = status;
    if (startDate && endDate) {
      query.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }

    const skip = (page - 1) * limit;
    const payrolls = await Payroll.find(query)
      .populate('employee', 'name employeeId')
      .populate('approvedBy', 'name')
      .populate('createdBy', 'name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Payroll.countDocuments(query);
    res.json({ data: payrolls, total, page, pages: Math.ceil(total / limit) });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// CREATE payroll (requires admin password)
router.post('/', protect, async (req, res) => {
  try {
    const { employee, period, baseSalary, allowances, deductions, paymentMethod } = req.body;
    
    if (!employee || !baseSalary) {
      return res.status(400).json({ message: 'Employee and salary are required' });
    }

    let totalDeductions = 0;
    if (deductions && deductions.length > 0) {
      for (const ded of deductions) {
        totalDeductions += ded.amount || 0;
      }
    }

    const grossPay = baseSalary + (allowances || 0);
    const netPay = grossPay - totalDeductions;

    const payroll = new Payroll({
      employee,
      period,
      baseSalary,
      allowances: allowances || 0,
      deductions: deductions || [],
      grossPay,
      netPay,
      paymentMethod,
      createdBy: req.user.id,
    });

    const savedPayroll = await payroll.save();
    res.status(201).json(savedPayroll);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// UPDATE payroll (requires admin password)
router.put('/:id', protect, async (req, res) => {
  try {
    const { baseSalary, allowances, deductions, paymentStatus, paymentMethod, paymentDate, remarks } = req.body;
    const payroll = await Payroll.findById(req.params.id);
    
    if (!payroll) return res.status(404).json({ message: 'Payroll record not found' });

    if (baseSalary || allowances || deductions) {
      let totalDeductions = 0;
      if (deductions && deductions.length > 0) {
        for (const ded of deductions) {
          totalDeductions += ded.amount || 0;
        }
      }

      const grossPay = (baseSalary || payroll.baseSalary) + (allowances || payroll.allowances || 0);
      payroll.grossPay = grossPay;
      payroll.netPay = grossPay - totalDeductions;
    }

    Object.assign(payroll, {
      baseSalary: baseSalary !== undefined ? baseSalary : payroll.baseSalary,
      allowances: allowances !== undefined ? allowances : payroll.allowances,
      deductions: deductions || payroll.deductions,
      paymentStatus: paymentStatus || payroll.paymentStatus,
      paymentMethod: paymentMethod || payroll.paymentMethod,
      paymentDate: paymentDate ? new Date(paymentDate) : payroll.paymentDate,
      remarks: remarks || payroll.remarks,
      updatedBy: req.user.id,
    });

    const updatedPayroll = await payroll.save();
    res.json(updatedPayroll);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// APPROVE payroll (requires admin password)
router.post('/:id/approve', protect, adminPasswordAuth, async (req, res) => {
  try {
    const payroll = await Payroll.findById(req.params.id);
    if (!payroll) return res.status(404).json({ message: 'Payroll record not found' });

    payroll.paymentStatus = 'approved';
    payroll.approvedBy = req.user.id;
    await payroll.save();
    res.json({ message: 'Payroll approved', payroll });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// DELETE payroll (requires admin password)
router.delete('/:id', protect, adminPasswordAuth, async (req, res) => {
  try {
    const payroll = await Payroll.findByIdAndDelete(req.params.id);
    if (!payroll) return res.status(404).json({ message: 'Payroll record not found' });
    res.json({ message: 'Payroll record deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
