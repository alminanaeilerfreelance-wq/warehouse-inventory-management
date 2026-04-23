// POST /api/notify/low-stock — trigger low stock emails
// POST /api/notify/overdue — trigger overdue invoice emails
const express = require('express');
const router = express.Router();
const Inventory = require('../models/Inventory');
const Invoice = require('../models/Invoice');
const { protect, adminOnly } = require('../middleware/auth');
const { sendEmail, lowStockEmail, invoiceDueEmail } = require('../utils/email');

router.post('/low-stock', protect, adminOnly, async (req, res) => {
  try {
    const items = await Inventory.find({ stockStatus: { $in: ['low_stock', 'out_of_stock'] } })
      .populate('productName', 'name').limit(50);

    const to = process.env.ALERT_EMAIL || process.env.EMAIL_USER;
    if (to && items.length > 0) {
      const { subject, html } = lowStockEmail(items);
      await sendEmail({ to, subject, html });
    }
    res.json({ sent: items.length > 0, count: items.length });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.post('/overdue', protect, adminOnly, async (req, res) => {
  try {
    const overdue = await Invoice.find({
      paymentStatus: { $in: ['pending', 'open'] },
      createdAt: { $lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
    }).populate('customer', 'name').limit(50);

    let sent = 0;
    for (const invoice of overdue) {
      const to = invoice.customer?.email || process.env.ALERT_EMAIL;
      if (to) {
        const { subject, html } = invoiceDueEmail(invoice);
        await sendEmail({ to, subject, html });
        sent++;
      }
      await Invoice.findByIdAndUpdate(invoice._id, { paymentStatus: 'due' });
    }
    res.json({ sent, total: overdue.length });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;
