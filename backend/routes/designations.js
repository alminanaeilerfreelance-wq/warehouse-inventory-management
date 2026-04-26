const express = require('express');
const router = express.Router();
const Designation = require('../models/Designation');
const adminPasswordAuth = require('../middleware/adminPassword');
const { protect } = require('../middleware/auth');

// GET all designations
router.get('/', protect, async (req, res) => {
  try {
    const designations = await Designation.find()
      .populate('department', 'name')
      .populate('createdBy', 'name')
      .sort({ createdAt: -1 });
    res.json(designations);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET single designation
router.get('/:id', protect, async (req, res) => {
  try {
    const designation = await Designation.findById(req.params.id)
      .populate('department', 'name')
      .populate('createdBy', 'name');
    if (!designation) return res.status(404).json({ message: 'Designation not found' });
    res.json(designation);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// CREATE designation
router.post('/', protect, async (req, res) => {
  try {
    const { code, title, description, department, salary, allowances } = req.body;
    
    if (!code || !title) {
      return res.status(400).json({ message: 'Code and title are required' });
    }

    const existingDesig = await Designation.findOne({ code });
    if (existingDesig) {
      return res.status(400).json({ message: 'Designation code already exists' });
    }

    const designation = new Designation({
      code,
      title,
      description,
      department,
      salary,
      allowances,
      createdBy: req.user.id,
    });

    const savedDesignation = await designation.save();
    res.status(201).json(savedDesignation);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// UPDATE designation
router.put('/:id', protect, async (req, res) => {
  try {
    const { code, title, description, department, salary, allowances, status } = req.body;
    const designation = await Designation.findById(req.params.id);
    
    if (!designation) return res.status(404).json({ message: 'Designation not found' });

    if (code && code !== designation.code) {
      const existingDesig = await Designation.findOne({ code });
      if (existingDesig) {
        return res.status(400).json({ message: 'Designation code already exists' });
      }
    }

    Object.assign(designation, {
      code: code || designation.code,
      title: title || designation.title,
      description: description || designation.description,
      department: department || designation.department,
      salary: salary !== undefined ? salary : designation.salary,
      allowances: allowances !== undefined ? allowances : designation.allowances,
      status: status || designation.status,
      updatedBy: req.user.id,
    });

    const updatedDesignation = await designation.save();
    res.json(updatedDesignation);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// DELETE designation (requires admin password)
router.delete('/:id', protect, adminPasswordAuth, async (req, res) => {
  try {
    const designation = await Designation.findByIdAndDelete(req.params.id);
    if (!designation) return res.status(404).json({ message: 'Designation not found' });
    res.json({ message: 'Designation deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
