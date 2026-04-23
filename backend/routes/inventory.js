const express = require('express');
const router = express.Router();
const XLSX = require('xlsx');
const Inventory = require('../models/Inventory');
const { protect, adminOnly } = require('../middleware/auth');
const { updateStockStatus } = require('../utils/stockStatus');

const populateFields = [
  { path: 'brand' },
  { path: 'design' },
  { path: 'supplier' },
  { path: 'category' },
  { path: 'productName' },
  { path: 'zone' },
  { path: 'bin' },
  { path: 'rack' },
  { path: 'location' },
  { path: 'warehouse' },
  { path: 'type' },
  { path: 'unit' },
];

// GET /api/inventory/low-stock — items not in_stock
router.get('/low-stock', protect, async (req, res) => {
  try {
    const items = await Inventory.find({
      stockStatus: { $in: ['low_stock', 'out_of_stock'] },
    })
      .populate(populateFields)
      .sort({ stockStatus: 1, quantity: 1 });
    res.json({ items, total: items.length });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/inventory/export/excel — export all inventory as Excel file
router.post('/export/excel', protect, async (req, res) => {
  try {
    const items = await Inventory.find({})
      .populate(populateFields)
      .sort({ createdAt: -1 })
      .lean();

    const rows = items.map((item) => ({
      SKU: item.sku || '',
      Barcode: item.barcode || '',
      Brand: item.brand?.name || '',
      Design: item.design?.name || '',
      Category: item.category?.name || '',
      ProductName: item.productName?.name || '',
      Supplier: item.supplier?.name || '',
      Warehouse: item.warehouse?.name || '',
      Zone: item.zone?.name || '',
      Bin: item.bin?.name || '',
      Rack: item.rack?.name || '',
      Location: item.location?.name || '',
      Type: item.type?.name || '',
      Unit: item.unit?.name || '',
      Cost: item.cost || 0,
      SRP: item.srp || 0,
      Quantity: item.quantity || 0,
      TotalCost: item.totalCost || 0,
      TotalSRP: item.totalSrp || 0,
      VatType: item.vatType || '',
      VatAmount: item.vatAmount || 0,
      StockStatus: item.stockStatus || '',
      LowStockThreshold: item.lowStockThreshold || 0,
      ExpirationDate: item.expirationDate ? new Date(item.expirationDate).toLocaleDateString() : '',
      DateReceived: item.dateReceived ? new Date(item.dateReceived).toLocaleDateString() : '',
      IsActive: item.isActive ? 'Yes' : 'No',
    }));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, 'Inventory');

    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Disposition', 'attachment; filename="inventory.xlsx"');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buffer);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/inventory — search, filter, paginate
router.get('/', protect, async (req, res) => {
  try {
    const { search = '', page = 1, limit = 10, stock_status } = req.query;

    const query = {};

    if (stock_status) {
      query.stockStatus = stock_status;
    }

    if (search) {
      // We need to search by populated field names — use aggregation for that
      // For simplicity, build a pipeline that can match on ref'd doc names
      const pipeline = [
        {
          $lookup: { from: 'productnames', localField: 'productName', foreignField: '_id', as: 'productNameDoc' },
        },
        {
          $lookup: { from: 'brands', localField: 'brand', foreignField: '_id', as: 'brandDoc' },
        },
        {
          $lookup: { from: 'suppliers', localField: 'supplier', foreignField: '_id', as: 'supplierDoc' },
        },
        {
          $match: {
            $and: [
              stock_status ? { stockStatus: stock_status } : {},
              {
                $or: [
                  { 'productNameDoc.name': { $regex: search, $options: 'i' } },
                  { 'brandDoc.name': { $regex: search, $options: 'i' } },
                  { 'supplierDoc.name': { $regex: search, $options: 'i' } },
                  { sku: { $regex: search, $options: 'i' } },
                  { barcode: { $regex: search, $options: 'i' } },
                ],
              },
            ],
          },
        },
        { $sort: { createdAt: -1 } },
        {
          $facet: {
            metadata: [{ $count: 'total' }],
            data: [{ $skip: (Number(page) - 1) * Number(limit) }, { $limit: Number(limit) }],
          },
        },
      ];

      const result = await Inventory.aggregate(pipeline);
      const total = result[0].metadata[0]?.total || 0;
      const rawItems = result[0].data;

      // Populate the aggregation results properly
      const ids = rawItems.map((i) => i._id);
      const items = await Inventory.find({ _id: { $in: ids } })
        .populate(populateFields)
        .sort({ createdAt: -1 });

      return res.json({ items, total, page: Number(page), pages: Math.ceil(total / limit) });
    }

    const total = await Inventory.countDocuments(query);
    const items = await Inventory.find(query)
      .populate(populateFields)
      .sort({ createdAt: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit));

    res.json({ items, total, page: Number(page), pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/inventory/:id — single item
router.get('/:id', protect, async (req, res) => {
  try {
    const item = await Inventory.findById(req.params.id).populate(populateFields);
    if (!item) return res.status(404).json({ message: 'Not found' });
    res.json(item);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/inventory — create
router.post('/', protect, adminOnly, async (req, res) => {
  try {
    const data = { ...req.body };

    const cost = Number(data.cost) || 0;
    const srp = Number(data.srp) || 0;
    const quantity = Number(data.quantity) || 0;
    const lowStockThreshold = Number(data.lowStockThreshold) || 10;

    data.totalCost = cost * quantity;
    data.totalSrp = srp * quantity;
    data.stockStatus = updateStockStatus(quantity, lowStockThreshold);

    const item = await Inventory.create(data);
    const populated = await Inventory.findById(item._id).populate(populateFields);
    res.status(201).json(populated);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// PUT /api/inventory/:id — update
router.put('/:id', protect, adminOnly, async (req, res) => {
  try {
    const data = { ...req.body };

    const existing = await Inventory.findById(req.params.id);
    if (!existing) return res.status(404).json({ message: 'Not found' });

    const cost = data.cost !== undefined ? Number(data.cost) : existing.cost || 0;
    const srp = data.srp !== undefined ? Number(data.srp) : existing.srp || 0;
    const quantity = data.quantity !== undefined ? Number(data.quantity) : existing.quantity || 0;
    const lowStockThreshold =
      data.lowStockThreshold !== undefined ? Number(data.lowStockThreshold) : existing.lowStockThreshold || 10;

    data.totalCost = cost * quantity;
    data.totalSrp = srp * quantity;
    data.stockStatus = updateStockStatus(quantity, lowStockThreshold);

    const item = await Inventory.findByIdAndUpdate(req.params.id, data, { new: true, runValidators: true }).populate(
      populateFields
    );
    res.json(item);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// DELETE /api/inventory/:id — admin only
router.delete('/:id', protect, adminOnly, async (req, res) => {
  try {
    const item = await Inventory.findByIdAndDelete(req.params.id);
    if (!item) return res.status(404).json({ message: 'Not found' });
    res.json({ message: 'Deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/inventory/bulk-import — admin only
router.post('/bulk-import', protect, adminOnly, async (req, res) => {
  try {
    const { items } = req.body;
    if (!Array.isArray(items) || items.length === 0)
      return res.status(400).json({ message: 'items array is required' });

    const results = { imported: 0, failed: 0, errors: [] };

    for (let i = 0; i < items.length; i++) {
      const row = items[i];
      try {
        const qty = Number(row.quantity) || 0;
        const cost = Number(row.cost) || 0;
        const srp = Number(row.srp) || 0;
        await Inventory.create({
          ...row,
          quantity: qty,
          cost,
          srp,
          totalCost: qty * cost,
          totalSrp: qty * srp,
          stockStatus: updateStockStatus(qty, row.lowStockThreshold || 10),
        });
        results.imported++;
      } catch (err) {
        results.failed++;
        results.errors.push({ row: i + 1, message: err.message });
      }
    }

    res.status(201).json(results);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/inventory/export/excel — export all to Excel
router.get('/export/excel', protect, async (req, res) => {
  try {
    const items = await Inventory.find().populate(populateFields).lean();
    const XLSX = require('xlsx');
    const rows = items.map((it) => ({
      'Product Name': it.productName?.name || '',
      Brand: it.brand?.name || '',
      Supplier: it.supplier?.name || '',
      Category: it.category?.name || '',
      Zone: it.zone?.name || '',
      Bin: it.bin?.name || '',
      Rack: it.rack?.name || '',
      Location: it.location?.name || '',
      Warehouse: it.warehouse?.name || '',
      Type: it.type?.name || '',
      Unit: it.unit?.name || '',
      Quantity: it.quantity,
      Cost: it.cost,
      SRP: it.srp,
      'Total Cost': it.totalCost,
      'Total SRP': it.totalSrp,
      'VAT Type': it.vatType || '',
      'Stock Status': it.stockStatus,
      'Expiration Date': it.expirationDate ? new Date(it.expirationDate).toLocaleDateString() : '',
      'Date Received': it.dateReceived ? new Date(it.dateReceived).toLocaleDateString() : '',
    }));
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, 'Inventory');
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    res.setHeader('Content-Disposition', 'attachment; filename="inventory.xlsx"');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buf);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
