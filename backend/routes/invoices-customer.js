const express = require('express');
const router = express.Router();
const InvoiceCustomer = require('../models/InvoiceCustomer');
const QRCode = require('qrcode');
const adminPasswordAuth = require('../middleware/adminPassword');
const { protect } = require('../middleware/auth');

// Generate invoice number with date format MMYYDATE
const generateInvoiceNo = async () => {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const year = String(now.getFullYear()).slice(-2);
  const date = String(now.getDate()).padStart(2, '0');
  const prefix = `INV${month}${year}${date}`;
  
  const lastInvoice = await InvoiceCustomer.findOne({ invoiceNo: new RegExp(`^${prefix}`) })
    .sort({ invoiceNo: -1 });
  
  const sequence = lastInvoice 
    ? parseInt(lastInvoice.invoiceNo.slice(-3)) + 1 
    : 1;
  
  return `${prefix}${String(sequence).padStart(3, '0')}`;
};

// GET all invoices
router.get('/', protect, async (req, res) => {
  try {
    const { customerId, status, startDate, endDate, page = 1, limit = 20, search } = req.query;
    
    let query = {};
    if (customerId) query.customer = customerId;
    if (status) query.paymentStatus = status;
    if (startDate && endDate) {
      query.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }
    if (search) {
      query.invoiceNo = new RegExp(search, 'i');
    }

    const skip = (page - 1) * limit;
    const invoices = await InvoiceCustomer.find(query)
      .populate('customer', 'name contact')
      .populate('employee', 'name')
      .populate('storeBranch', 'name')
      .populate('createdBy', 'name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await InvoiceCustomer.countDocuments(query);
    res.json({ data: invoices, total, page, pages: Math.ceil(total / limit) });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET single invoice
router.get('/:id', protect, async (req, res) => {
  try {
    const invoice = await InvoiceCustomer.findById(req.params.id)
      .populate('customer')
      .populate('employee')
      .populate('storeBranch')
      .populate('items.product')
      .populate('createdBy', 'name');
    if (!invoice) return res.status(404).json({ message: 'Invoice not found' });
    res.json(invoice);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// CREATE invoice (requires admin password)
router.post('/', protect, async (req, res) => {
  try {
    const { customer, employee, storeBranch, items, discount, discountType, vat, vatInclusive, notes } = req.body;
    
    if (!customer || !items || items.length === 0) {
      return res.status(400).json({ message: 'Customer and items are required' });
    }

    let subtotal = 0;
    let totalQty = 0;
    
    for (const item of items) {
      const itemTotal = item.quantity * item.price;
      const discountAmount = discountType === 'percentage' ? (itemTotal * item.discount / 100) : item.discount;
      item.total = itemTotal - discountAmount;
      subtotal += item.total;
      totalQty += item.quantity;
    }

    const discountAmount = discountType === 'percentage' ? (subtotal * discount / 100) : discount;
    const afterDiscount = subtotal - discountAmount;
    const vatAmount = vatInclusive ? (afterDiscount * vat / (100 + vat)) : (afterDiscount * vat / 100);
    const total = vatInclusive ? afterDiscount : (afterDiscount + vatAmount);

    // Generate invoice number and QR code
    const invoiceNo = await generateInvoiceNo();
    const qrData = await QRCode.toDataURL(invoiceNo);

    const invoice = new InvoiceCustomer({
      invoiceNo,
      customer,
      employee,
      storeBranch,
      items,
      subtotal,
      discount: discountAmount,
      discountType,
      vat: vatAmount,
      vatInclusive,
      total,
      totalQty,
      notes,
      qrCode: qrData,
      createdBy: req.user.id,
    });

    const savedInvoice = await invoice.save();
    res.status(201).json(savedInvoice);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// UPDATE invoice (requires admin password)
router.put('/:id', protect, async (req, res) => {
  try {
    const { items, discount, discountType, vat, vatInclusive, notes, paymentStatus, scheduledDate } = req.body;
    const invoice = await InvoiceCustomer.findById(req.params.id);
    
    if (!invoice) return res.status(404).json({ message: 'Invoice not found' });

    if (items && items.length > 0) {
      let subtotal = 0;
      let totalQty = 0;
      
      for (const item of items) {
        const itemTotal = item.quantity * item.price;
        const discountAmount = discountType === 'percentage' ? (itemTotal * item.discount / 100) : item.discount;
        item.total = itemTotal - discountAmount;
        subtotal += item.total;
        totalQty += item.quantity;
      }

      const discountAmount = discountType === 'percentage' ? (subtotal * discount / 100) : discount;
      const afterDiscount = subtotal - discountAmount;
      const vatAmount = vatInclusive ? (afterDiscount * vat / (100 + vat)) : (afterDiscount * vat / 100);
      const total = vatInclusive ? afterDiscount : (afterDiscount + vatAmount);

      invoice.items = items;
      invoice.subtotal = subtotal;
      invoice.discount = discountAmount;
      invoice.discountType = discountType;
      invoice.vat = vatAmount;
      invoice.vatInclusive = vatInclusive;
      invoice.total = total;
      invoice.totalQty = totalQty;
    }

    Object.assign(invoice, {
      notes: notes || invoice.notes,
      paymentStatus: paymentStatus || invoice.paymentStatus,
      scheduledDate: scheduledDate ? new Date(scheduledDate) : invoice.scheduledDate,
      updatedBy: req.user.id,
    });

    const updatedInvoice = await invoice.save();
    res.json(updatedInvoice);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// DELETE invoice (requires admin password)
router.delete('/:id', protect, adminPasswordAuth, async (req, res) => {
  try {
    const invoice = await InvoiceCustomer.findByIdAndDelete(req.params.id);
    if (!invoice) return res.status(404).json({ message: 'Invoice not found' });
    res.json({ message: 'Invoice deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
