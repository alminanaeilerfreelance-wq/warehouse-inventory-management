const express = require('express');
const router = express.Router();
const Deduction = require('../models/Deduction');
const adminPasswordAuth = require('../middleware/adminPassword');
const { protect } = require('../middleware/auth');

// GET all deductions
router.get('/', protect, async (req, res) => {
  try {
    const deductions = await Deduction.find()
      .populate('createdBy', 'name')
      .sort({ createdAt: -1 });
    res.json(deductions);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET single deduction
router.get('/:id', protect, async (req, res) => {
  try {
    const deduction = await Deduction.findById(req.params.id)
      .populate('createdBy', 'name');
    if (!deduction) return res.status(404).json({ message: 'Deduction not found' });
    res.json(deduction);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// CREATE deduction (requires admin password)
router.post('/', protect, async (req, res) => {
  try {
    const { code, name, type, amount, description } = req.body;
    
    if (!code || !name || !amount) {
      return res.status(400).json({ message: 'Code, name, and amount are required' });
    }

    const existingDeduction = await Deduction.findOne({ code });
    if (existingDeduction) {
      return res.status(400).json({ message: 'Deduction code already exists' });
    }

    const deduction = new Deduction({
      code,
      name,
      type: type || 'fixed',
      amount,
      description,
      createdBy: req.user.id,
    });

    const savedDeduction = await deduction.save();
    res.status(201).json(savedDeduction);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// UPDATE deduction
router.put('/:id', protect, async (req, res) => {
  try {
    const { code, name, type, amount, description, status } = req.body;
    const deduction = await Deduction.findById(req.params.id);
    
    if (!deduction) return res.status(404).json({ message: 'Deduction not found' });

    if (code && code !== deduction.code) {
      const existingDeduction = await Deduction.findOne({ code });
      if (existingDeduction) {
        return res.status(400).json({ message: 'Deduction code already exists' });
      }
    }

    Object.assign(deduction, {
      code: code || deduction.code,
      name: name || deduction.name,
      type: type || deduction.type,
      amount: amount || deduction.amount,
      description: description || deduction.description,
      status: status || deduction.status,
      updatedBy: req.user.id,
    });

    const updatedDeduction = await deduction.save();
    res.json(updatedDeduction);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// DELETE deduction (requires admin password)
router.delete('/:id', protect, adminPasswordAuth, async (req, res) => {
  try {
    const deduction = await Deduction.findByIdAndDelete(req.params.id);
    if (!deduction) return res.status(404).json({ message: 'Deduction not found' });
    res.json({ message: 'Deduction deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
