const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const InventoryAdjustment = require('../models/InventoryAdjustment');
const Inventory = require('../models/Inventory');
const User = require('../models/User');
const { protect, adminOnly } = require('../middleware/auth');
const { generateInvoiceNo } = require('../utils/invoiceNumber');
const { updateStockStatus } = require('../utils/stockStatus');

// GET /api/adjustments — list all, paginate, populate product (+ noPagination support)
router.get('/', protect, async (req, res) => {
  try {
    const { page = 1, limit = 10, noPagination } = req.query;
    const total = await InventoryAdjustment.countDocuments();
    
    // If noPagination=true, return all items without pagination
    if (noPagination) {
      const items = await InventoryAdjustment.find()
        .populate({ path: 'items.inventory', populate: { path: 'productName brand' } })
        .populate('adjustedBy', 'username customerName email')
        .sort({ createdAt: -1 });
      return res.json({ items, total: items.length });
    }

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

// DELETE /api/adjustments/:id — admin only with password verification
router.delete('/:id', protect, adminOnly, async (req, res) => {
  try {
    const { adminPassword } = req.body;

    // Verify admin password
    if (!adminPassword) {
      return res.status(400).json({ message: 'Admin password is required' });
    }

    const admin = await User.findById(req.user._id);
    if (!admin) {
      return res.status(404).json({ message: 'User not found' });
    }

    const isPasswordValid = await bcrypt.compare(adminPassword, admin.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Invalid admin password' });
    }

    const item = await InventoryAdjustment.findByIdAndDelete(req.params.id);
    if (!item) return res.status(404).json({ message: 'Not found' });
    res.json({ message: 'Deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PATCH /api/adjustments/:id — update adjustment notes and/or items (admin only with password) + update inventory
router.patch('/:id', protect, adminOnly, async (req, res) => {
  try {
    const { notes, items, adminPassword } = req.body;

    // Verify admin password
    if (!adminPassword) {
      return res.status(400).json({ message: 'Admin password is required' });
    }

    const admin = await User.findById(req.user._id);
    if (!admin) {
      return res.status(404).json({ message: 'User not found' });
    }

    const isPasswordValid = await bcrypt.compare(adminPassword, admin.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Invalid admin password' });
    }

    // Get the old adjustment to calculate inventory deltas
    const oldAdjustment = await InventoryAdjustment.findById(req.params.id);
    if (!oldAdjustment) {
      return res.status(404).json({ message: 'Adjustment not found' });
    }

    // If items are being updated, recalculate inventory quantities
    if (items && Array.isArray(items)) {
      // Create a map of old quantities by inventory ID
      const oldQuantityMap = {};
      oldAdjustment.items.forEach((item) => {
        oldQuantityMap[item.inventory.toString()] = item.quantity;
      });

      // Update inventory based on quantity changes
      for (const newItem of items) {
        const inventoryId = newItem.inventoryId || newItem.inventory;
        const oldQuantity = oldQuantityMap[inventoryId] || 0;
        const newQuantity = Number(newItem.quantity || newItem.adjustQty || 0);
        const quantityDelta = newQuantity - oldQuantity;

        // Update inventory quantity based on adjustment type
        const inv = await Inventory.findById(inventoryId);
        if (inv) {
          if (oldAdjustment.type === 'increment') {
            inv.quantity += quantityDelta;
          } else if (oldAdjustment.type === 'decrement') {
            inv.quantity -= quantityDelta;
          }
          inv.quantity = Math.max(0, inv.quantity);
          inv.stockStatus = updateStockStatus(inv.quantity, inv.lowStockThreshold);
          await inv.save();
        }
      }
    }

    const updateData = {};
    if (notes !== undefined) updateData.notes = notes;
    
    // If items are provided, update the items array
    if (items && Array.isArray(items)) {
      updateData.items = items.map((item) => ({
        inventory: item.inventoryId || item.inventory,
        quantity: Number(item.quantity || item.adjustQty || 0),
        price: item.price || 0,
        reason: item.reason || '',
      }));
    }

    const adjustment = await InventoryAdjustment.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    )
      .populate({ path: 'items.inventory', populate: { path: 'productName brand' } })
      .populate('adjustedBy', 'username customerName email');
    
    if (!adjustment) return res.status(404).json({ message: 'Not found' });
    res.json(adjustment);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

module.exports = router;
