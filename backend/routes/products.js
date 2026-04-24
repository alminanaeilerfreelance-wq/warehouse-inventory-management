const express = require('express');
const router = express.Router();
const ProductName = require('../models/ProductName');
const { protect, adminOnly } = require('../middleware/auth');

// GET all with search + pagination
// router.get('/', protect, async (req, res) => {
//   try {
//     const { search = '', page = 1, limit = 10 } = req.query;
//     const query = search ? { name: { $regex: search, $options: 'i' } } : {};
//     const total = await ProductName.countDocuments(query);
//     const items = await ProductName.find(query)
//       .populate('category')
//       .populate('brand')
//       .sort({ createdAt: -1 })
//       .skip((page - 1) * limit)
//       .limit(Number(limit));
//     res.json({ items, total, page: Number(page), pages: Math.ceil(total / limit) });
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// });

router.get('/', protect, async (req, res) => {
  try {
    const { search = '', page = 1, limit = 10 } = req.query;
    const pagenumber = Number(page) || 1;
    const pagesize = Number(limit) || 10;
    const query = search ? { name: { $regex: search, $options: 'i' } } : {};
    const total = await ProductName.countDocuments(query);
    const items = await ProductName.find(query)
      .populate('category', 'name')
      .populate('brand', 'name')
      .sort({ createdAt: -1 })
      .skip((pagenumber - 1) * pagesize)
      .limit(pagesize);
    res.json({ items, total, page: pagenumber, pages: Math.ceil(total / pagesize) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET single
router.get('/:id', protect, async (req, res) => {
  try {
    const item = await ProductName.findById(req.params.id).populate('category').populate('brand');
    if (!item) return res.status(404).json({ message: 'Not found' });
    res.json(item);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST create
// router.post('/', protect, adminOnly, async (req, res) => {
//   try {
//     const item = await ProductName.create(req.body);
//     res.status(201).json(item);
//   } catch (err) {
//     res.status(400).json({ message: err.message });
//   }
// });

router.post('/', protect, adminOnly, async (req, res) => {
  try {
    const { name, categoryId, brandId, description } = req.body;
    if (!name || !categoryId || !brandId) {
      return res.status(400).json({ message: 'Name, categoryId and brandId are required' });
    }
    const item = await ProductName.create({
      name,
      category: categoryId,
      brand: brandId,
      description,
    });
    const populatedItem = await ProductName.findById(item._id).populate('category').populate('brand');


    res.status(201).json(populatedItem);
  } catch (err) {
    res.status(400).json({ message: err.message });
  } 
});

// PUT update
router.put('/:id', protect, adminOnly, async (req, res) => {
  try {
    const item = await ProductName.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true })
      .populate('category')
      .populate('brand');
    if (!item) return res.status(404).json({ message: 'Not found' });
    res.json(item);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// DELETE
router.delete('/:id', protect, adminOnly, async (req, res) => {
  try {
    const item = await ProductName.findByIdAndDelete(req.params.id);
    if (!item) return res.status(404).json({ message: 'Not found' });
    res.json({ message: 'Deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
