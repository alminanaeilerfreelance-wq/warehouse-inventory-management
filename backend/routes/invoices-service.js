const express = require('express');
const router = express.Router();
const ServiceInvoice = require('../models/ServiceInvoice');
const QRCode = require('qrcode');
const adminPasswordAuth = require('../middleware/adminPassword');
const { protect } = require('../middleware/auth');

// Generate invoice number with date format MMYYDATE
const generateInvoiceNo = async () => {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const year = String(now.getFullYear()).slice(-2);
  const date = String(now.getDate()).padStart(2, '0');
  const prefix = `SRV${month}${year}${date}`;
  
  const lastInvoice = await ServiceInvoice.findOne({ invoiceNo: new RegExp(`^${prefix}`) })
    .sort({ invoiceNo: -1 });
  
  const sequence = lastInvoice 
    ? parseInt(lastInvoice.invoiceNo.slice(-3)) + 1 
    : 1;
  
  return `${prefix}${String(sequence).padStart(3, '0')}`;
};

// GET all service invoices
router.get('/', protect, async (req, res) => {
  try {
    const { customerId, status, startDate, endDate, page = 1, limit = 20 } = req.query;
    
    let query = {};
    if (customerId) query.customer = customerId;
    if (status) query.paymentStatus = status;
    if (startDate && endDate) {
      query.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }

    const skip = (page - 1) * limit;
    const invoices = await ServiceInvoice.find(query)
      .populate('customer', 'name contact')
      .populate('employee', 'name')
      .populate('services.service', 'name')
      .populate('createdBy', 'name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await ServiceInvoice.countDocuments(query);
    res.json({ data: invoices, total, page, pages: Math.ceil(total / limit) });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET single service invoice
router.get('/:id', protect, async (req, res) => {
  try {
    const invoice = await ServiceInvoice.findById(req.params.id)
      .populate('customer')
      .populate('employee')
      .populate('services.service')
      .populate('createdBy', 'name');
    if (!invoice) return res.status(404).json({ message: 'Service invoice not found' });
    res.json(invoice);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// CREATE service invoice (requires admin password)
router.post('/', protect, async (req, res) => {
  try {
    const { customer, employee, services, discount, discountType, vat, vatInclusive, notes } = req.body;
    
    if (!customer || !services || services.length === 0) {
      return res.status(400).json({ message: 'Customer and services are required' });
    }

    let subtotal = 0;
    let totalQty = 0;
    
    for (const svc of services) {
      const svcTotal = svc.quantity * svc.price;
      const discountAmount = discountType === 'percentage' ? (svcTotal * svc.discount / 100) : svc.discount;
      svc.total = svcTotal - discountAmount;
      subtotal += svc.total;
      totalQty += svc.quantity;
    }

    const discountAmount = discountType === 'percentage' ? (subtotal * discount / 100) : discount;
    const afterDiscount = subtotal - discountAmount;
    const vatAmount = vatInclusive ? (afterDiscount * vat / (100 + vat)) : (afterDiscount * vat / 100);
    const total = vatInclusive ? afterDiscount : (afterDiscount + vatAmount);

    // Generate invoice number and QR code
    const invoiceNo = await generateInvoiceNo();
    const qrData = await QRCode.toDataURL(invoiceNo);

    const invoice = new ServiceInvoice({
      invoiceNo,
      customer,
      employee,
      services,
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

// UPDATE service invoice (requires admin password)
router.put('/:id', protect, async (req, res) => {
  try {
    const { services, discount, discountType, vat, vatInclusive, notes, paymentStatus, scheduledDate } = req.body;
    const invoice = await ServiceInvoice.findById(req.params.id);
    
    if (!invoice) return res.status(404).json({ message: 'Service invoice not found' });

    if (services && services.length > 0) {
      let subtotal = 0;
      let totalQty = 0;
      
      for (const svc of services) {
        const svcTotal = svc.quantity * svc.price;
        const discountAmount = discountType === 'percentage' ? (svcTotal * svc.discount / 100) : svc.discount;
        svc.total = svcTotal - discountAmount;
        subtotal += svc.total;
        totalQty += svc.quantity;
      }

      const discountAmount = discountType === 'percentage' ? (subtotal * discount / 100) : discount;
      const afterDiscount = subtotal - discountAmount;
      const vatAmount = vatInclusive ? (afterDiscount * vat / (100 + vat)) : (afterDiscount * vat / 100);
      const total = vatInclusive ? afterDiscount : (afterDiscount + vatAmount);

      invoice.services = services;
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

// DELETE service invoice (requires admin password)
router.delete('/:id', protect, adminPasswordAuth, async (req, res) => {
  try {
    const invoice = await ServiceInvoice.findByIdAndDelete(req.params.id);
    if (!invoice) return res.status(404).json({ message: 'Service invoice not found' });
    res.json({ message: 'Service invoice deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
