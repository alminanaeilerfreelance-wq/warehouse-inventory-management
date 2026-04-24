const express = require('express');
const router = express.Router();
const Transfer = require('../models/Transfer');
const Inventory = require('../models/Inventory');
const { protect, adminOnly } = require('../middleware/auth');
const { updateStockStatus } = require('../utils/stockStatus');

// Generate transfer number: TRF-MMYYDD-XXXX
function generateTransferNo() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const year = String(now.getFullYear()).slice(-2);
  const day = String(now.getDate()).padStart(2, '0');
  const random = String(Math.floor(Math.random() * 9000) + 1000);
  return `TRF-${month}${year}${day}-${random}`;
}

// POST / — create transfer, status=pending, no inventory movement yet
router.post('/', protect, async (req, res) => {
  try {
    const {
      fromWarehouse,
      toWarehouse,
      fromBranch,
      toBranch,
      items,
      notes,
    } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'At least one item is required' });
    }

    const transferNo = generateTransferNo();

    const transfer = await Transfer.create({
      transferNo,
      fromWarehouse,
      toWarehouse,
      fromBranch,
      toBranch,
      items,
      notes,
      status: 'pending',
      requestedBy: req.user._id,
    });

    res.status(201).json(transfer);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// GET / — list with pagination, filter by status
router.get('/', protect, async (req, res) => {
  try {
    const { page = 1, limit = 20, status, search, noPagination } = req.query;
    const query = {};
    if (status) query.status = status;
    if (search) query.transferNo = { $regex: search, $options: 'i' };

    const total = await Transfer.countDocuments(query);
    
    // If noPagination=true, return all items without pagination
    if (noPagination) {
      const items = await Transfer.find(query)
        .populate('fromWarehouse', 'name')
        .populate('toWarehouse', 'name')
        .populate('fromBranch', 'name')
        .populate('toBranch', 'name')
        .populate('requestedBy', 'username customerName')
        .populate('approvedBy', 'username customerName')
        .populate('items.product')
        .sort({ createdAt: -1 });
      return res.json({ items, total: items.length });
    }

    const items = await Transfer.find(query)
      .populate('fromWarehouse', 'name')
      .populate('toWarehouse', 'name')
      .populate('fromBranch', 'name')
      .populate('toBranch', 'name')
      .populate('requestedBy', 'username customerName')
      .populate('approvedBy', 'username customerName')
      .populate('items.product')
      .sort({ createdAt: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit));

    res.json({ items, total, page: Number(page), pages: Math.ceil(total / Number(limit)) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /:id — single transfer with full population
router.get('/:id', protect, async (req, res) => {
  try {
    const transfer = await Transfer.findById(req.params.id)
      .populate('fromWarehouse', 'name')
      .populate('toWarehouse', 'name')
      .populate('fromBranch', 'name')
      .populate('toBranch', 'name')
      .populate('requestedBy', 'username customerName')
      .populate('approvedBy', 'username customerName')
      .populate({
        path: 'items.product',
        populate: [
          { path: 'productName', select: 'name' },
          { path: 'warehouse', select: 'name' },
          { path: 'brand', select: 'name' },
        ],
      });

    if (!transfer) return res.status(404).json({ message: 'Transfer not found' });
    res.json(transfer);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /:id/approve — admin only: move inventory, set status=completed
router.put('/:id/approve', protect, adminOnly, async (req, res) => {
  try {
    const transfer = await Transfer.findById(req.params.id).populate('items.product');

    if (!transfer) return res.status(404).json({ message: 'Transfer not found' });
    if (transfer.status !== 'pending') {
      return res.status(400).json({ message: `Transfer is already ${transfer.status}` });
    }

    // Process each item: decrease source qty, increase destination qty
    for (const item of transfer.items) {
      const sourceInventory = await Inventory.findById(item.product._id || item.product);

      if (!sourceInventory) {
        return res.status(404).json({ message: `Source inventory item not found for product: ${item.product}` });
      }

      // Validate source has enough qty
      if (sourceInventory.quantity < item.qty) {
        return res.status(400).json({
          message: `Insufficient quantity for item. Available: ${sourceInventory.quantity}, Requested: ${item.qty}`,
        });
      }

      // Decrease source qty
      const newSourceQty = Math.max(0, sourceInventory.quantity - item.qty);
      sourceInventory.quantity = newSourceQty;
      sourceInventory.stockStatus = updateStockStatus(newSourceQty, sourceInventory.lowStockThreshold || 10);
      await sourceInventory.save();

      // Find existing inventory at destination (same product + target warehouse/branch)
      const destinationQuery = { productName: sourceInventory.productName };
      if (transfer.toWarehouse) destinationQuery.warehouse = transfer.toWarehouse;

      let destInventory = await Inventory.findOne(destinationQuery);

      if (destInventory) {
        // Increase destination qty
        const newDestQty = destInventory.quantity + item.qty;
        destInventory.quantity = newDestQty;
        destInventory.stockStatus = updateStockStatus(newDestQty, destInventory.lowStockThreshold || 10);
        await destInventory.save();
      } else {
        // Clone source inventory doc to destination with new qty
        const cloneData = sourceInventory.toObject();
        delete cloneData._id;
        delete cloneData.__v;
        cloneData.quantity = item.qty;
        cloneData.stockStatus = updateStockStatus(item.qty, cloneData.lowStockThreshold || 10);
        if (transfer.toWarehouse) cloneData.warehouse = transfer.toWarehouse;
        if (transfer.toBranch) cloneData.storeBranch = transfer.toBranch;
        await Inventory.create(cloneData);
      }
    }

    // Mark transfer as completed
    transfer.status = 'completed';
    transfer.approvedBy = req.user._id;
    transfer.approvedAt = new Date();
    await transfer.save();

    res.json({ message: 'Transfer approved and inventory updated', transfer });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /:id/reject — admin only: set status=rejected
router.put('/:id/reject', protect, adminOnly, async (req, res) => {
  try {
    const transfer = await Transfer.findById(req.params.id);

    if (!transfer) return res.status(404).json({ message: 'Transfer not found' });
    if (transfer.status !== 'pending') {
      return res.status(400).json({ message: `Transfer is already ${transfer.status}` });
    }

    transfer.status = 'rejected';
    transfer.approvedBy = req.user._id;
    transfer.approvedAt = new Date();
    await transfer.save();

    res.json({ message: 'Transfer rejected', transfer });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE /:id — admin only, only if status=pending
router.delete('/:id', protect, adminOnly, async (req, res) => {
  try {
    const transfer = await Transfer.findById(req.params.id);

    if (!transfer) return res.status(404).json({ message: 'Transfer not found' });
    if (transfer.status !== 'pending') {
      return res.status(400).json({ message: 'Only pending transfers can be deleted' });
    }

    await Transfer.findByIdAndDelete(req.params.id);
    res.json({ message: 'Transfer deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
