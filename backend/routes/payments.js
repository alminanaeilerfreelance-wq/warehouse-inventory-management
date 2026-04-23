// Payment routes for invoices
const express = require('express');
const router = express.Router();
const Payment = require('../models/Payment');
const Invoice = require('../models/Invoice');
const { protect } = require('../middleware/auth');
const { sendEmail, invoiceDueEmail } = require('../utils/email');

// GET /api/payments?invoice=:id — list payments for an invoice
router.get('/', protect, async (req, res) => {
  try {
    const { invoice } = req.query;
    const q = invoice ? { invoice } : {};
    const items = await Payment.find(q)
      .populate('recordedBy', 'username customerName')
      .sort({ createdAt: -1 });
    res.json({ items });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// POST /api/payments — record a payment
router.post('/', protect, async (req, res) => {
  try {
    const { invoice: invoiceId, amount, method, reference, notes } = req.body;
    if (!invoiceId || !amount) return res.status(400).json({ message: 'invoice and amount required' });

    const invoice = await Invoice.findById(invoiceId);
    if (!invoice) return res.status(404).json({ message: 'Invoice not found' });

    const payment = await Payment.create({
      invoice: invoiceId,
      amount: Number(amount),
      method,
      reference,
      notes,
      recordedBy: req.user._id,
    });

    // Recalculate invoice payment status
    const allPayments = await Payment.find({ invoice: invoiceId });
    const totalPaid = allPayments.reduce((s, p) => s + p.amount, 0);
    let paymentStatus = invoice.paymentStatus;
    if (totalPaid <= 0) paymentStatus = 'pending';
    else if (totalPaid < invoice.total) paymentStatus = 'open'; // partial
    else paymentStatus = 'paid';

    await Invoice.findByIdAndUpdate(invoiceId, { paymentStatus, totalPaid });

    res.status(201).json({ payment, totalPaid, paymentStatus });
  } catch (err) { res.status(400).json({ message: err.message }); }
});

// DELETE /api/payments/:id
router.delete('/:id', protect, async (req, res) => {
  try {
    await Payment.findByIdAndDelete(req.params.id);
    res.json({ message: 'Payment deleted' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;
