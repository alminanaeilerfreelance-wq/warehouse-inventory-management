const express = require('express');
const router = express.Router();
const Employee = require('../models/Employee');
const { protect, adminOnly } = require('../middleware/auth');

// GET all with search + pagination (+ noPagination support)
router.get('/', protect, async (req, res) => {
  try {
    const { search = '', page = 1, limit = 10, noPagination } = req.query;
    const query = search
      ? {
          $or: [
            { firstName: { $regex: search, $options: 'i' } },
            { lastName: { $regex: search, $options: 'i' } },
            { employeeId: { $regex: search, $options: 'i' } },
          ],
        }
      : {};
    const total = await Employee.countDocuments(query);
    
    // If noPagination=true, return all items without pagination
    if (noPagination) {
      const items = await Employee.find(query)
        .sort({ createdAt: -1 });
      return res.json({ items, total: items.length });
    }

    const items = await Employee.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));
    res.json({ items, total, page: Number(page), pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET single
router.get('/:id', protect, async (req, res) => {
  try {
    const item = await Employee.findById(req.params.id);
    if (!item) return res.status(404).json({ message: 'Not found' });
    res.json(item);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST create
router.post('/', protect, adminOnly, async (req, res) => {
  try {
    const {
      employeeId,
      name,
      position,
      department,
      email,
      contact,
      address,
      hireDate,
      salary,
      status,
    } = req.body;

    // VALIDATION
    if (!name) {
      return res.status(400).json({ message: "Name is required" });
    }

    // OPTIONAL: auto-generate employeeId
    let finalEmployeeId = employeeId;

    if (!finalEmployeeId) {
      const count = await require('../models/Employee').countDocuments();
      finalEmployeeId = `EMP-${String(count + 1).padStart(4, '0')}`;
    }

    // ✅ CHECK DUPLICATE
    const exists = await Employee.findOne({ employeeId: finalEmployeeId });

    if (exists) {
      return res.status(400).json({ message: "Employee ID already exists" });
    }

    // ✅ CREATE
    const employee = await Employee.create({
      employeeId: finalEmployeeId,
      name,
      position,
      department,
      email,
      contact,
      address,
      hireDate,
      salary,
      status: status || "Active",
    });

    res.status(201).json(employee);
  } catch (err) {
    console.error("❌ CREATE EMPLOYEE ERROR:", err);
    res.status(400).json({ message: err.message });
  }
});

// PUT update
router.put('/:id', protect, adminOnly, async (req, res) => {
  try {
    const item = await Employee.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!item) return res.status(404).json({ message: 'Not found' });
    res.json(item);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// DELETE
router.delete('/:id', protect, adminOnly, async (req, res) => {
  try {
    const item = await Employee.findByIdAndDelete(req.params.id);
    if (!item) return res.status(404).json({ message: 'Not found' });
    res.json({ message: 'Deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
