const express = require('express');
const router = express.Router();
const Expense = require('../models/Expense');
const { protect, adminOnly } = require('../middleware/auth');

// GET all with search + pagination (+ noPagination support)
router.get('/', protect, async (req, res) => {
  try {
    const { search = '', page = 1, limit = 10, noPagination } = req.query;
    const query = search
      ? {
          $or: [
            { name: { $regex: search, $options: 'i' } },
            { description: { $regex: search, $options: 'i' } },
          ],
        }
      : {};
    const total = await Expense.countDocuments(query);
    
    // If noPagination=true, return all items without pagination
    if (noPagination) {
      const items = await Expense.find(query)
        .populate('storeBranch')
        .sort({ createdAt: -1 });
      return res.json({ items, total: items.length });
    }

    const items = await Expense.find(query)
      .populate('storeBranch')
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
    const item = await Expense.findById(req.params.id).populate('storeBranch');
    if (!item) return res.status(404).json({ message: 'Not found' });
    res.json(item);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST create
router.post('/', protect, adminOnly, async (req, res) => {
  try {
    const { name, amount, date, category, storeBranchId } = req.body;
    if (!name) return res.status(400).json({ message: 'Name is required' });
    
    const expenseData = { name, amount, date, category, storeBranch: storeBranchId || null };
    const item = await Expense.create(expenseData);
    const populated = await item.populate('storeBranch');
    res.status(201).json(populated);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// PUT update
router.put('/:id', protect, adminOnly, async (req, res) => {
  try {
    const { name, description, amount, date, category, storeBranchId } = req.body;
    const updateData = { name, description, amount, date, category, storeBranch: storeBranchId || null };
    
    const item = await Expense.findByIdAndUpdate(req.params.id, updateData, { new: true, runValidators: true })
      .populate('storeBranch');
    if (!item) return res.status(404).json({ message: 'Not found' });
    res.json(item);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// DELETE
router.delete('/:id', protect, adminOnly, async (req, res) => {
  try {
    const item = await Expense.findByIdAndDelete(req.params.id);
    if (!item) return res.status(404).json({ message: 'Not found' });
    res.json({ message: 'Deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
