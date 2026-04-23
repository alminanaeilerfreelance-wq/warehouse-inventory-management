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
      return res.status(400).json({ message: 'Items are required' });
    }

    const invoiceNo = generateInvoiceNo();

    // Process each item — adjust inventory quantity
    for (const cartItem of items) {
      const { inventory: inventoryId, quantity } = cartItem;
      const qty = Number(quantity) || 0;

      const inventoryDoc = await Inventory.findById(inventoryId);
      if (!inventoryDoc) continue;

      if (type === 'increment') {
        inventoryDoc.quantity = (inventoryDoc.quantity || 0) + qty;
      } else if (type === 'decrement') {
        inventoryDoc.quantity = Math.max(0, (inventoryDoc.quantity || 0) - qty);
      }

      const cost = inventoryDoc.cost || 0;
      const srp = inventoryDoc.srp || 0;
      inventoryDoc.totalCost = cost * inventoryDoc.quantity;
      inventoryDoc.totalSrp = srp * inventoryDoc.quantity;
      inventoryDoc.stockStatus = updateStockStatus(inventoryDoc.quantity, inventoryDoc.lowStockThreshold || 10);

      await inventoryDoc.save();
    }

    const adjustment = await InventoryAdjustment.create({
      invoiceNo,
      type,
      items,
      notes,
      adjustedBy: req.user._id,
    });

    // Generate QR for the adjustment
    try {
      const { generateQRCode } = require('../utils/qrCode');
      const qr = await generateQRCode({ invoiceNo: adjustment.invoiceNo, type: 'adjustment', id: adjustment._id });
      adjustment.qrCode = qr;
      await adjustment.save();
    } catch (qrErr) {
      console.error('[QR] Adjustment QR failed:', qrErr.message);
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
