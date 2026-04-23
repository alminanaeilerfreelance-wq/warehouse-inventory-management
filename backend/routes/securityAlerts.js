const express = require('express');
const router = express.Router();
const SecurityAlert = require('../models/SecurityAlert');
const { protect, adminOnly } = require('../middleware/auth');

// GET /api/security-alerts — admin only
router.get('/', protect, adminOnly, async (req, res) => {
  try {
    const { page = 1, limit = 20, resolved, action } = req.query;
    const q = {};
    if (resolved !== undefined) q.resolved = resolved === 'true';
    if (action) q.action = action;
    const total = await SecurityAlert.countDocuments(q);
    const items = await SecurityAlert.find(q)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));
    res.json({ items, total, page: Number(page), pages: Math.ceil(total / limit) });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// PUT /api/security-alerts/:id/resolve
router.put('/:id/resolve', protect, adminOnly, async (req, res) => {
  try {
    const alert = await SecurityAlert.findByIdAndUpdate(req.params.id, {
      resolved: true,
      resolvedBy: req.user._id,
      resolvedAt: new Date(),
      notes: req.body.notes,
    }, { new: true });
    res.json(alert);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// GET /api/security-alerts/stats
router.get('/stats', protect, adminOnly, async (req, res) => {
  try {
    const total = await SecurityAlert.countDocuments();
    const unresolved = await SecurityAlert.countDocuments({ resolved: false });
    const locked = await SecurityAlert.countDocuments({ action: 'account_locked', resolved: false });
    const topIps = await SecurityAlert.aggregate([
      { $match: { resolved: false } },
      { $group: { _id: '$ip', count: { $sum: '$attempts' } } },
      { $sort: { count: -1 } },
      { $limit: 5 },
    ]);
    res.json({ total, unresolved, locked, topIps });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;
