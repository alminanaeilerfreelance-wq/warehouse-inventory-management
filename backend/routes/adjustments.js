const express = require('express');
const router = express.Router();
const InventoryAdjustment = require('../models/InventoryAdjustment');
const Inventory = require('../models/Inventory');
const { protect, adminOnly } = require('../middleware/auth');
const { generateInvoiceNo } = require('../utils/invoiceNumber');
const { updateStockStatus } = require('../utils/stockStatus');

// GET /api/adjustments — list all, paginate, populate product
router.get('/', protect, async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const total = await InventoryAdjustment.countDocuments();
    const items = await InventoryAdjustment.find()
      .populate({ path: 'items.inventory', populate: { path: 'productName brand' } })
      .populate('adjustedBy', 'username customerName email')
      .sort({ createdAt: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit));
    res.json({ items, total, page: Number(page), pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/adjustments/:id/qr
router.get('/:id/qr', protect, async (req, res) => {
  try {
    const adj = await InventoryAdjustment.findById(req.params.id);
    if (!adj) return res.status(404).json({ message: 'Not found' });
    if (adj.qrCode) return res.json({ qr: adj.qrCode });
    const { generateQRCode } = require('../utils/qrCode');
    const qr = await generateQRCode({ invoiceNo: adj.invoiceNo, type: 'adjustment', id: adj._id });
    adj.qrCode = qr;
    await adj.save();
    res.json({ qr });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/adjustments/:id — single
router.get('/:id', protect, async (req, res) => {
  try {
    const item = await InventoryAdjustment.findById(req.params.id)
      .populate({ path: 'items.inventory', populate: { path: 'productName brand' } })
      .populate('adjustedBy', 'username customerName email');
    if (!item) return res.status(404).json({ message: 'Not found' });
    res.json(item);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/adjustments — create adjustment, update inventory quantities
router.post('/', protect, async (req, res) => {
  try {
    const { type, items, notes } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'items array is required' });
    }

    if (!type || !['increment', 'decrement'].includes(type)) {
      return res.status(400).json({ message: 'type must be increment or decrement' });
    }

    // Map inventory IDs if using old format
    const processedItems = items.map(item => ({
      ...item,
      inventory: item.inventoryId || item.inventory
    }));

    const invoiceNo = generateInvoiceNo();

    const adjustment = await InventoryAdjustment.create({
      invoiceNo,
      type,
      items: processedItems,
      notes,
      adjustedBy: req.user._id,
    });

    // Update inventory quantities
    for (const item of processedItems) {
      const inv = await Inventory.findById(item.inventory);
      if (!inv) continue;

      const newQty = type === 'increment' ? inv.quantity + item.quantity : inv.quantity - item.quantity;
      inv.quantity = Math.max(0, newQty);
      inv.stockStatus = updateStockStatus(inv.quantity, inv.lowStockThreshold);
      await inv.save();
    }

    const populated = await InventoryAdjustment.findById(adjustment._id)
      .populate({ path: 'items.inventory', populate: { path: 'productName brand' } })
      .populate('adjustedBy', 'username customerName email');

    res.status(201).json(populated);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// DELETE /api/adjustments/:id — admin only
router.delete('/:id', protect, adminOnly, async (req, res) => {
  try {
    const item = await InventoryAdjustment.findByIdAndDelete(req.params.id);
    if (!item) return res.status(404).json({ message: 'Not found' });
    res.json({ message: 'Deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
