const express = require('express');
const router = express.Router();
const PurchaseOrder = require('../models/PurchaseOrder');
const Inventory = require('../models/Inventory');
const { protect, adminOnly } = require('../middleware/auth');
const { generateInvoiceNo } = require('../utils/invoiceNumber');
const { generateQRCode } = require('../utils/qrCode');
const { updateStockStatus } = require('../utils/stockStatus');

const populateOptions = [
  { path: 'supplier' },
  { path: 'warehouse' },
  { path: 'employee' },
  { path: 'items.product', populate: { path: 'productName' } },
  { path: 'createdBy', select: 'username customerName email' },
  { path: 'approvedBy', select: 'username customerName email' },
];

// GET /api/purchase-orders — list with filters + pagination (+ noPagination support)
router.get('/', protect, async (req, res) => {
  try {
    const { page = 1, limit = 10, type, status, search = '', noPagination } = req.query;
    const query = {};

    if (type) query.type = type;
    if (status) query.status = status;
    if (search) query.invoiceNo = { $regex: search, $options: 'i' };

    const total = await PurchaseOrder.countDocuments(query);
    
    // If noPagination=true, return all items without pagination
    if (noPagination) {
      const items = await PurchaseOrder.find(query)
        .populate(populateOptions)
        .sort({ createdAt: -1 });
      return res.json({ items, total: items.length });
    }

    const items = await PurchaseOrder.find(query)
      .populate(populateOptions)
      .sort({ createdAt: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit));

    res.json({ items, total, page: Number(page), pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/purchase-orders/:id — single
router.get('/:id', protect, async (req, res) => {
  try {
    const item = await PurchaseOrder.findById(req.params.id).populate(populateOptions);
    if (!item) return res.status(404).json({ message: 'Not found' });
    res.json(item);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/purchase-orders — create PO
router.post('/', protect, async (req, res) => {
  try {
    const { invoiceNo, supplierId, supplier, warehouseId, warehouse, employeeId, employee, items = [], notes, type = 'purchase', vatType, vatAmount } = req.body;

    // Input validation
    if (!invoiceNo || String(invoiceNo).trim().length === 0) {
      return res.status(400).json({ message: 'Invoice number is required' });
    }

    if (!supplierId && !supplier) {
      return res.status(400).json({ message: 'Supplier is required' });
    }

    if (!warehouseId && !warehouse) {
      return res.status(400).json({ message: 'Warehouse is required' });
    }

    if (!employeeId && !employee) {
      return res.status(400).json({ message: 'Employee is required' });
    }

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'Purchase order must have at least one item' });
    }

    // Validate each item
    for (let item of items) {
      if (!item.productNameId && !item.productName) {
        return res.status(400).json({ message: 'All items must have a product' });
      }

      const price = Number(item.price) || 0;
      const qty = Number(item.qty) || 0;

      if (price <= 0) {
        return res.status(400).json({ message: 'Item unit price must be greater than 0' });
      }

      if (qty <= 0) {
        return res.status(400).json({ message: 'Item quantity must be greater than 0' });
      }
    }

    // Validate VAT amount if provided
    if (vatAmount !== undefined && isNaN(Number(vatAmount))) {
      return res.status(400).json({ message: 'VAT amount must be a valid number' });
    }

    // Calculate subtotal and totalAmount from items
    const processedItems = items.map((item) => ({
      product: item.inventoryId || item.product,
      productName: item.productName || '',
      qty: Number(item.qty) || 0,
      price: Number(item.price) || 0,
      total: (Number(item.qty) || 0) * (Number(item.price) || 0),
    }));

    const subtotal = processedItems.reduce((sum, item) => sum + item.total, 0);

    let totalAmount = subtotal;
    let calculatedVat = Number(vatAmount) || 0;

    if (vatType === 'exclusive') {
      totalAmount = subtotal + calculatedVat;
    } else if (vatType === 'inclusive') {
      totalAmount = subtotal;
    }

    const qrData = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/purchase-orders/preview/${invoiceNo}`;
    const qrCode = await generateQRCode(qrData);

    const po = await PurchaseOrder.create({
      invoiceNo,
      supplier: supplierId || supplier,
      warehouse: warehouseId || warehouse,
      employee: employeeId || employee,
      items: processedItems,
      subtotal,
      totalAmount,
      vatAmount: calculatedVat,
      vatType,
      notes,
      type,
      status: 'pending',
      isApproved: false,
      qrCode,
      createdBy: req.user._id,
    });

    const populated = await PurchaseOrder.findById(po._id).populate(populateOptions);
    res.status(201).json(populated);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// PUT /api/purchase-orders/:id — update (only if not approved)
router.put('/:id', protect, adminOnly, async (req, res) => {
  try {
    const existing = await PurchaseOrder.findById(req.params.id);
    if (!existing) return res.status(404).json({ message: 'Not found' });
    if (existing.isApproved) {
      return res.status(400).json({ message: 'Cannot edit an approved purchase order' });
    }

    const { items, vatType, vatAmount, ...rest } = req.body;
    const updateData = { ...rest };

    if (items) {
      const processedItems = items.map((item) => ({
        ...item,
        total: (Number(item.qty) || 0) * (Number(item.price) || 0),
      }));
      const subtotal = processedItems.reduce((sum, i) => sum + i.total, 0);
      let calculatedVat = Number(vatAmount) || existing.vatAmount || 0;
      let totalAmount = subtotal;

      const resolvedVatType = vatType || existing.vatType;
      if (resolvedVatType === 'exclusive') {
        totalAmount = subtotal + calculatedVat;
      } else {
        totalAmount = subtotal;
      }

      updateData.items = processedItems;
      updateData.subtotal = subtotal;
      updateData.totalAmount = totalAmount;
      updateData.vatAmount = calculatedVat;
    }

    if (vatType) updateData.vatType = vatType;

    const po = await PurchaseOrder.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true,
    }).populate(populateOptions);

    res.json(po);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// PUT /api/purchase-orders/:id/approve — admin only
router.put('/:id/approve', protect, adminOnly, async (req, res) => {
  try {
    const po = await PurchaseOrder.findById(req.params.id);
    if (!po) return res.status(404).json({ message: 'Not found' });
    if (po.isApproved) return res.status(400).json({ message: 'Purchase order already approved' });

    // Update inventory based on PO type
    for (const item of po.items) {
      if (!item.product) continue;

      const inventoryDoc = await Inventory.findById(item.product);
      if (!inventoryDoc) continue;

      const qty = Number(item.qty) || 0;

      if (po.type === 'purchase') {
        // Incoming items from supplier - add to inventory
        inventoryDoc.quantity = (inventoryDoc.quantity || 0) + qty;
      } else if (po.type === 'return') {
        // Items returned to supplier - decrement from inventory
        inventoryDoc.quantity = Math.max(0, (inventoryDoc.quantity || 0) - qty);
      }

      const cost = inventoryDoc.cost || 0;
      const srp = inventoryDoc.srp || 0;
      inventoryDoc.totalCost = cost * inventoryDoc.quantity;
      inventoryDoc.totalSrp = srp * inventoryDoc.quantity;
      inventoryDoc.stockStatus = updateStockStatus(inventoryDoc.quantity, inventoryDoc.lowStockThreshold || 10);

      await inventoryDoc.save();
    }

    const updated = await PurchaseOrder.findByIdAndUpdate(
      req.params.id,
      {
        isApproved: true,
        status: 'approved',
        approvedBy: req.user._id,
        approvedAt: new Date(),
      },
      { new: true }
    ).populate(populateOptions);

    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /api/purchase-orders/:id/reject — admin only
router.put('/:id/reject', protect, adminOnly, async (req, res) => {
  try {
    const po = await PurchaseOrder.findById(req.params.id);
    if (!po) return res.status(404).json({ message: 'Not found' });
    if (po.isApproved) return res.status(400).json({ message: 'Cannot reject an already approved purchase order' });

    const updated = await PurchaseOrder.findByIdAndUpdate(
      req.params.id,
      { status: 'rejected' },
      { new: true }
    ).populate(populateOptions);

    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE /api/purchase-orders/:id — admin only
router.delete('/:id', protect, adminOnly, async (req, res) => {
  try {
    const item = await PurchaseOrder.findByIdAndDelete(req.params.id);
    if (!item) return res.status(404).json({ message: 'Not found' });
    res.json({ message: 'Deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
