const express = require('express');
const router = express.Router();
const Invoice = require('../models/Invoice');
const { protect, adminOnly } = require('../middleware/auth');
const { generateInvoiceNo } = require('../utils/invoiceNumber');
const { generateQRCode } = require('../utils/qrCode');

const populateOptions = [
  { path: 'customer' },
  { path: 'supplier' },
  { path: 'employee' },
  { path: 'storeBranch' },
  { path: 'warehouse' },
  { path: 'items.inventory' },
  { path: 'items.service' },
  { path: 'createdBy', select: 'username customerName email' },
  { path: 'approvedBy', select: 'username customerName email' },
];

// Calculate VAT and total from subtotal + discount + vatType + vatRate
const calculateTotals = (subtotal, discount = 0, discountType = 'fixed', vatType = 'none', vatRate = 0) => {
  let afterDiscount = subtotal;

  if (discountType === 'percent') {
    afterDiscount = subtotal - (subtotal * discount) / 100;
  } else {
    afterDiscount = subtotal - discount;
  }

  if (afterDiscount < 0) afterDiscount = 0;

  let vatAmount = 0;
  let total = afterDiscount;

  if (vatType === 'exclusive') {
    vatAmount = (afterDiscount * vatRate) / 100;
    total = afterDiscount + vatAmount;
  } else if (vatType === 'inclusive') {
    // VAT is already inside the afterDiscount amount
    vatAmount = afterDiscount - afterDiscount / (1 + vatRate / 100);
    total = afterDiscount;
  }

  return {
    subtotal,
    vatAmount: parseFloat(vatAmount.toFixed(4)),
    total: parseFloat(total.toFixed(4)),
  };
};

// GET /api/invoices — list with filters + pagination
router.get('/', protect, async (req, res) => {
  try {
    const { page = 1, limit = 10, invoiceType, paymentStatus, search = '' } = req.query;
    const query = {};

    if (invoiceType) query.invoiceType = invoiceType;
    if (paymentStatus) query.paymentStatus = paymentStatus;
    if (search) query.invoiceNo = { $regex: search, $options: 'i' };

    const total = await Invoice.countDocuments(query);
    const items = await Invoice.find(query)
      .populate(populateOptions)
      .sort({ createdAt: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit));

    res.json({ items, total, page: Number(page), pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/invoices/:id/qr — generate QR code for invoice
router.get('/:id/qr', protect, async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) return res.status(404).json({ message: 'Not found' });

    const qrData = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/invoices/${invoice._id}`;
    const qrCode = await generateQRCode(qrData);

    res.json({ qrCode });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/invoices/:id — single with full population + QR
router.get('/:id', protect, async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id).populate(populateOptions);
    if (!invoice) return res.status(404).json({ message: 'Not found' });

    let qrCode = invoice.qrCode;
    if (!qrCode) {
      const qrData = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/invoices/${invoice._id}`;
      qrCode = await generateQRCode(qrData);
      await Invoice.findByIdAndUpdate(invoice._id, { qrCode });
    }

    res.json({ ...invoice.toObject(), qrCode });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/invoices — create invoice
router.post('/', protect, async (req, res) => {
  try {
    const {
      invoiceType,
      customer,
      supplier,
      employee,
      storeBranch,
      warehouse,
      items = [],
      discount = 0,
      discountType = 'fixed',
      vatType = 'none',
      vatRate = 0,
      notes,
    } = req.body;

    const invoiceNo = generateInvoiceNo();

    // Calculate subtotal from items
    const subtotal = items.reduce((sum, item) => {
      const qty = Number(item.quantity) || 0;
      const price = Number(item.price) || 0;
      const itemSubtotal = qty * price;
      item.subtotal = itemSubtotal;
      return sum + itemSubtotal;
    }, 0);

    const { vatAmount, total } = calculateTotals(subtotal, discount, discountType, vatType, vatRate);

    const qrData = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/invoices/preview/${invoiceNo}`;
    const qrCode = await generateQRCode(qrData);

    const invoice = await Invoice.create({
      invoiceNo,
      invoiceType,
      customer,
      supplier,
      employee,
      storeBranch,
      warehouse,
      items,
      subtotal,
      discount,
      discountType,
      vatAmount,
      vatType,
      total,
      notes,
      paymentStatus: 'pending',
      qrCode,
      createdBy: req.user._id,
    });

    // Auto-create calendar event if calendarDate is provided
    if (req.body.calendarDate && req.body.calendarTitle) {
      try {
        const CalendarEvent = require('../models/CalendarEvent');
        const calEvent = await CalendarEvent.create({
          title: req.body.calendarTitle || `Invoice ${invoice.invoiceNo}`,
          startDate: new Date(req.body.calendarDate),
          endDate: new Date(req.body.calendarDate),
          type: 'invoice',
          description: `Auto-created for invoice ${invoice.invoiceNo}`,
          color: '#1565c0',
          invoiceRef: invoice.invoiceNo,
        });
        invoice.calendarEventId = calEvent._id;
        await invoice.save();
      } catch (calErr) {
        console.error('[Calendar] Failed to create event:', calErr.message);
        // Non-fatal — don't fail the invoice creation
      }
    }

    const populated = await Invoice.findById(invoice._id).populate(populateOptions);
    res.status(201).json(populated);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// PUT /api/invoices/:id — update invoice fields
router.put('/:id', protect, adminOnly, async (req, res) => {
  try {
    const existing = await Invoice.findById(req.params.id);
    if (!existing) return res.status(404).json({ message: 'Not found' });

    const {
      items,
      discount,
      discountType,
      vatType,
      vatRate,
      ...rest
    } = req.body;

    const updateData = { ...rest };

    if (items) {
      const itemsWithSubtotals = items.map((item) => ({
        ...item,
        subtotal: (Number(item.quantity) || 0) * (Number(item.price) || 0),
      }));

      const subtotal = itemsWithSubtotals.reduce((sum, i) => sum + i.subtotal, 0);
      const { vatAmount, total } = calculateTotals(
        subtotal,
        discount !== undefined ? discount : existing.discount,
        discountType || existing.discountType,
        vatType || existing.vatType,
        vatRate !== undefined ? vatRate : 0
      );

      updateData.items = itemsWithSubtotals;
      updateData.subtotal = subtotal;
      updateData.vatAmount = vatAmount;
      updateData.total = total;
    }

    if (discount !== undefined) updateData.discount = discount;
    if (discountType) updateData.discountType = discountType;
    if (vatType) updateData.vatType = vatType;

    const invoice = await Invoice.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true,
    }).populate(populateOptions);

    res.json(invoice);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// PUT /api/invoices/:id/status — update payment status
router.put('/:id/status', protect, async (req, res) => {
  try {
    const { paymentStatus } = req.body;
    if (!paymentStatus) return res.status(400).json({ message: 'paymentStatus is required' });

    const invoice = await Invoice.findByIdAndUpdate(
      req.params.id,
      { paymentStatus },
      { new: true, runValidators: true }
    ).populate(populateOptions);

    if (!invoice) return res.status(404).json({ message: 'Not found' });
    res.json(invoice);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// DELETE /api/invoices/:id — admin only
router.delete('/:id', protect, adminOnly, async (req, res) => {
  try {
    const item = await Invoice.findByIdAndDelete(req.params.id);
    if (!item) return res.status(404).json({ message: 'Not found' });
    res.json({ message: 'Deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
