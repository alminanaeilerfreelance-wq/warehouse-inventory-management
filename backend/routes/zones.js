const express = require('express');
const router = express.Router();
const Zone = require('../models/Zone');
const { protect, adminOnly } = require('../middleware/auth');

// GET all with search + pagination
router.get('/', protect, async (req, res) => {
  try {
    const { search = '', page = 1, limit = 10 } = req.query;
    const query = search ? { name: { $regex: search, $options: 'i' } } : {};
    const total = await Zone.countDocuments(query);
    const items = await Zone.find(query)
      .populate('warehouse')
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
    const item = await Zone.findById(req.params.id).populate('warehouse');
    if (!item) return res.status(404).json({ message: 'Not found' });
    res.json(item);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST create
router.post('/', protect, adminOnly, async (req, res) => {
  try {
    const { name, warehouseId, description } = req.body;

    // VALIDATION
    if (!name) {
      return res.status(400).json({ message: "Name is required" });
    }

    // Create zone data with proper field mapping
    const zoneData = {
      name,
      description,
      warehouse: warehouseId || null,
    };

    const item = await Zone.create(zoneData);
    const populated = await item.populate('warehouse');
    res.status(201).json(populated);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// PUT update
router.put('/:id', protect, adminOnly, async (req, res) => {
  try {
    const { name, warehouseId, description } = req.body;

    // Create update data with proper field mapping
    const updateData = {
      name,
      description,
      warehouse: warehouseId || null,
    };

    const item = await Zone.findByIdAndUpdate(req.params.id, updateData, { new: true, runValidators: true })
      .populate('warehouse');
    if (!item) return res.status(404).json({ message: 'Not found' });
    res.json(item);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// DELETE
router.delete('/:id', protect, adminOnly, async (req, res) => {
  try {
    const item = await Zone.findByIdAndDelete(req.params.id);
    if (!item) return res.status(404).json({ message: 'Not found' });
    res.json({ message: 'Deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
