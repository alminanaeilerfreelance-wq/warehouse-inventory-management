const express = require('express');
const router = express.Router();
const XLSX = require('xlsx');
const Invoice = require('../models/Invoice');
const PurchaseOrder = require('../models/PurchaseOrder');
const { protect } = require('../middleware/auth');

// Build date match stage from query params
const buildDateMatch = (dateFrom, dateTo, field = 'createdAt') => {
  const match = {};
  if (dateFrom || dateTo) {
    match[field] = {};
    if (dateFrom) match[field].$gte = new Date(dateFrom);
    if (dateTo) {
      const end = new Date(dateTo);
      end.setHours(23, 59, 59, 999);
      match[field].$lte = end;
    }
  }
  return match;
};

// Build group-by expression based on period param
const buildGroupId = (period = 'day') => {
  if (period === 'month') {
    return { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } };
  }
  if (period === 'year') {
    return { year: { $year: '$createdAt' } };
  }
  // default: day
  return {
    year: { $year: '$createdAt' },
    month: { $month: '$createdAt' },
    day: { $dayOfMonth: '$createdAt' },
  };
};

// GET /api/reports/sales — aggregate customer invoices
router.get('/sales', protect, async (req, res) => {
  try {
    const { dateFrom, dateTo, branch, period = 'day' } = req.query;

    const matchStage = {
      invoiceType: 'customer',
      ...buildDateMatch(dateFrom, dateTo),
    };
    if (branch) matchStage.storeBranch = require('mongoose').Types.ObjectId.createFromHexString(branch);

    const pipeline = [
      { $match: matchStage },
      {
        $group: {
          _id: buildGroupId(period),
          subtotal: { $sum: '$subtotal' },
          total: { $sum: '$total' },
          qty: { $sum: { $size: { $ifNull: ['$items', []] } } },
          count: { $sum: 1 },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } },
    ];

    const items = await Invoice.aggregate(pipeline);

    const totals = items.reduce(
      (acc, cur) => {
        acc.subtotal += cur.subtotal || 0;
        acc.total += cur.total || 0;
        acc.qty += cur.qty || 0;
        return acc;
      },
      { subtotal: 0, total: 0, qty: 0 }
    );

    res.json({ items, totals });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/reports/services — aggregate service invoices
router.get('/services', protect, async (req, res) => {
  try {
    const { dateFrom, dateTo, branch, period = 'day' } = req.query;

    const matchStage = {
      invoiceType: 'service',
      ...buildDateMatch(dateFrom, dateTo),
    };
    if (branch) matchStage.storeBranch = require('mongoose').Types.ObjectId.createFromHexString(branch);

    const pipeline = [
      { $match: matchStage },
      {
        $group: {
          _id: buildGroupId(period),
          subtotal: { $sum: '$subtotal' },
          total: { $sum: '$total' },
          qty: { $sum: { $size: { $ifNull: ['$items', []] } } },
          count: { $sum: 1 },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } },
    ];

    const items = await Invoice.aggregate(pipeline);

    const totals = items.reduce(
      (acc, cur) => {
        acc.subtotal += cur.subtotal || 0;
        acc.total += cur.total || 0;
        acc.qty += cur.qty || 0;
        return acc;
      },
      { subtotal: 0, total: 0, qty: 0 }
    );

    res.json({ items, totals });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/reports/supplier — aggregate purchase orders
router.get('/supplier', protect, async (req, res) => {
  try {
    const { dateFrom, dateTo, supplier, period = 'day' } = req.query;

    const matchStage = { ...buildDateMatch(dateFrom, dateTo) };
    if (supplier) matchStage.supplier = require('mongoose').Types.ObjectId.createFromHexString(supplier);

    const pipeline = [
      { $match: matchStage },
      {
        $group: {
          _id: buildGroupId(period),
          subtotal: { $sum: '$subtotal' },
          total: { $sum: '$totalAmount' },
          qty: { $sum: { $size: { $ifNull: ['$items', []] } } },
          count: { $sum: 1 },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } },
    ];

    const items = await PurchaseOrder.aggregate(pipeline);

    const totals = items.reduce(
      (acc, cur) => {
        acc.subtotal += cur.subtotal || 0;
        acc.total += cur.total || 0;
        acc.qty += cur.qty || 0;
        return acc;
      },
      { subtotal: 0, total: 0, qty: 0 }
    );

    res.json({ items, totals });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/reports/export/:type — export report as Excel
router.get('/export/:type', protect, async (req, res) => {
  try {
    const { type } = req.params;
    const { dateFrom, dateTo, branch, supplier, period = 'day' } = req.query;

    let items = [];
    let sheetName = 'Report';

    if (type === 'sales' || type === 'services') {
      const invoiceType = type === 'sales' ? 'customer' : 'service';
      const matchStage = { invoiceType, ...buildDateMatch(dateFrom, dateTo) };
      if (branch) matchStage.storeBranch = require('mongoose').Types.ObjectId.createFromHexString(branch);

      const rawItems = await Invoice.find(matchStage)
        .populate('customer', 'name email')
        .populate('employee', 'firstName lastName')
        .populate('storeBranch', 'name')
        .sort({ createdAt: -1 })
        .lean();

      items = rawItems.map((inv) => ({
        InvoiceNo: inv.invoiceNo,
        Date: new Date(inv.createdAt).toLocaleDateString(),
        Customer: inv.customer?.name || '',
        Employee: inv.employee ? `${inv.employee.firstName} ${inv.employee.lastName}` : '',
        Branch: inv.storeBranch?.name || '',
        Subtotal: inv.subtotal || 0,
        Discount: inv.discount || 0,
        VAT: inv.vatAmount || 0,
        Total: inv.total || 0,
        Status: inv.paymentStatus || '',
      }));
      sheetName = type === 'sales' ? 'Sales' : 'Services';
    } else if (type === 'supplier') {
      const matchStage = { ...buildDateMatch(dateFrom, dateTo) };
      if (supplier) matchStage.supplier = require('mongoose').Types.ObjectId.createFromHexString(supplier);

      const rawItems = await PurchaseOrder.find(matchStage)
        .populate('supplier', 'name')
        .populate('warehouse', 'name')
        .sort({ createdAt: -1 })
        .lean();

      items = rawItems.map((po) => ({
        InvoiceNo: po.invoiceNo,
        Date: new Date(po.createdAt).toLocaleDateString(),
        Supplier: po.supplier?.name || '',
        Warehouse: po.warehouse?.name || '',
        Type: po.type || '',
        Subtotal: po.subtotal || 0,
        VAT: po.vatAmount || 0,
        TotalAmount: po.totalAmount || 0,
        Status: po.status || '',
      }));
      sheetName = 'SupplierOrders';
    } else {
      return res.status(400).json({ message: 'Invalid report type. Use: sales, services, or supplier' });
    }

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(items);
    XLSX.utils.book_append_sheet(wb, ws, sheetName);

    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    res.setHeader('Content-Disposition', `attachment; filename="${type}-report.xlsx"`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buffer);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
