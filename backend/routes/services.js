const express = require('express');
const router = express.Router();
const Service = require('../models/Service');
const { protect, adminOnly } = require('../middleware/auth');

// GET all with search + pagination
router.get('/', protect, async (req, res) => {
  try {
    const { search = '', page = 1, limit = 10 } = req.query;
    const query = search ? { name: { $regex: search, $options: 'i' } } : {};
    const total = await Service.countDocuments(query);
    const items = await Service.find(query)
      .populate('unit')
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
    const item = await Service.findById(req.params.id).populate('unit');
    if (!item) return res.status(404).json({ message: 'Not found' });
    res.json(item);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST create
router.post('/', protect, adminOnly, async (req, res) => {
  try {
    const { name, description, price, unitId } = req.body;
    if (!name) return res.status(400).json({ message: 'Name is required' });
    
    const serviceData = { name, description, price, unit: unitId || null };
    const item = await Service.create(serviceData);
    const populated = await item.populate('unit');
    res.status(201).json(populated);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// PUT update
router.put('/:id', protect, adminOnly, async (req, res) => {
  try {
    const { name, description, price, unitId } = req.body;
    const updateData = { name, description, price, unit: unitId || null };
    
    const item = await Service.findByIdAndUpdate(req.params.id, updateData, { new: true, runValidators: true })
      .populate('unit');
    if (!item) return res.status(404).json({ message: 'Not found' });
    res.json(item);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// DELETE
router.delete('/:id', protect, adminOnly, async (req, res) => {
  try {
    const item = await Service.findByIdAndDelete(req.params.id);
    if (!item) return res.status(404).json({ message: 'Not found' });
    res.json({ message: 'Deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
