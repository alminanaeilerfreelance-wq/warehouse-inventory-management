const express = require('express');
const router = express.Router();
const Rack = require('../models/Rack');
const { protect, adminOnly } = require('../middleware/auth');

// GET all with search + pagination
router.get('/', protect, async (req, res) => {
  try {
    const { search = '', page = 1, limit = 10 } = req.query;
    const query = search ? { name: { $regex: search, $options: 'i' } } : {};
    const total = await Rack.countDocuments(query);
    const items = await Rack.find(query)
      .populate('bin')
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
    const item = await Rack.findById(req.params.id).populate('bin');
    if (!item) return res.status(404).json({ message: 'Not found' });
    res.json(item);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST create
router.post('/', protect, adminOnly, async (req, res) => {
  try {
    const { name, binId, description } = req.body;
    if (!name) return res.status(400).json({ message: 'Name is required' });
    
    const rackData = { name, description, bin: binId || null };
    const item = await Rack.create(rackData);
    const populated = await item.populate('bin');
    res.status(201).json(populated);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// PUT update
router.put('/:id', protect, adminOnly, async (req, res) => {
  try {
    const { name, binId, description } = req.body;
    const updateData = { name, description, bin: binId || null };
    
    const item = await Rack.findByIdAndUpdate(req.params.id, updateData, { new: true, runValidators: true })
      .populate('bin');
    if (!item) return res.status(404).json({ message: 'Not found' });
    res.json(item);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// DELETE
router.delete('/:id', protect, adminOnly, async (req, res) => {
  try {
    const item = await Rack.findByIdAndDelete(req.params.id);
    if (!item) return res.status(404).json({ message: 'Not found' });
    res.json({ message: 'Deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
