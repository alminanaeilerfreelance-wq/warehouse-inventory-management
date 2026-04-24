// GET /api/audit-logs — admin only, paginated with filters
const express = require('express');
const router = express.Router();
const AuditLog = require('../models/AuditLog');
const { protect, adminOnly } = require('../middleware/auth');

router.get('/', protect, adminOnly, async (req, res) => {
  try {
    const { page = 1, limit = 20, action, module, user, search } = req.query;
    const query = {};
    if (action) query.action = action;
    if (module) query.module = { $regex: module, $options: 'i' };
    if (user) query.user = user;
    if (search) query.description = { $regex: search, $options: 'i' };

    const total = await AuditLog.countDocuments(query);
    const items = await AuditLog.find(query)
      .populate('user', 'username customerName')
      .sort({ createdAt: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit));

    res.json({ items, total, page: Number(page), pages: Math.ceil(total / limit) });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.delete('/clear', protect, adminOnly, async (req, res) => {
  try {
    const { before } = req.query; // date string
    const q = before ? { createdAt: { $lt: new Date(before) } } : {};
    const result = await AuditLog.deleteMany(q);
    res.json({ message: `Deleted ${result.deletedCount} audit log entries` });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;
