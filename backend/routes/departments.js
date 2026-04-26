const express = require('express');
const router = express.Router();
const Department = require('../models/Department');
const adminPasswordAuth = require('../middleware/adminPassword');
const { protect } = require('../middleware/auth');

// GET all departments
router.get('/', protect, async (req, res) => {
  try {
    const departments = await Department.find()
      .populate('manager', 'name')
      .populate('createdBy', 'name')
      .sort({ createdAt: -1 });
    res.json(departments);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET single department
router.get('/:id', protect, async (req, res) => {
  try {
    const department = await Department.findById(req.params.id)
      .populate('manager', 'name')
      .populate('createdBy', 'name');
    if (!department) return res.status(404).json({ message: 'Department not found' });
    res.json(department);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// CREATE department
router.post('/', protect, async (req, res) => {
  try {
    const { code, name, description, manager, budget } = req.body;
    
    if (!code || !name) {
      return res.status(400).json({ message: 'Code and name are required' });
    }

    const existingDept = await Department.findOne({ code });
    if (existingDept) {
      return res.status(400).json({ message: 'Department code already exists' });
    }

    const department = new Department({
      code,
      name,
      description,
      manager,
      budget,
      createdBy: req.user.id,
    });

    const savedDepartment = await department.save();
    res.status(201).json(savedDepartment);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// UPDATE department
router.put('/:id', protect, async (req, res) => {
  try {
    const { code, name, description, manager, budget, status } = req.body;
    const department = await Department.findById(req.params.id);
    
    if (!department) return res.status(404).json({ message: 'Department not found' });

    if (code && code !== department.code) {
      const existingDept = await Department.findOne({ code });
      if (existingDept) {
        return res.status(400).json({ message: 'Department code already exists' });
      }
    }

    Object.assign(department, {
      code: code || department.code,
      name: name || department.name,
      description: description || department.description,
      manager: manager || department.manager,
      budget: budget || department.budget,
      status: status || department.status,
      updatedBy: req.user.id,
    });

    const updatedDepartment = await department.save();
    res.json(updatedDepartment);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// DELETE department (requires admin password)
router.delete('/:id', protect, adminPasswordAuth, async (req, res) => {
  try {
    const department = await Department.findByIdAndDelete(req.params.id);
    if (!department) return res.status(404).json({ message: 'Department not found' });
    res.json({ message: 'Department deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
