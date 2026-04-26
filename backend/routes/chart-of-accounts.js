const express = require('express');
const router = express.Router();
const ChartOfAccounts = require('../models/ChartOfAccounts');
const adminPasswordAuth = require('../middleware/adminPassword');
const { protect } = require('../middleware/auth');

// GET all accounts
router.get('/', protect, async (req, res) => {
  try {
    const { type, status, page = 1, limit = 20 } = req.query;
    
    let query = { status: 'active' };
    if (type) query.type = type;
    if (status) query.status = status;

    const skip = (page - 1) * limit;
    const accounts = await ChartOfAccounts.find(query)
      .populate('createdBy', 'name')
      .sort({ code: 1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await ChartOfAccounts.countDocuments(query);
    res.json({ data: accounts, total, page, pages: Math.ceil(total / limit) });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET single account
router.get('/:id', protect, async (req, res) => {
  try {
    const account = await ChartOfAccounts.findById(req.params.id)
      .populate('createdBy', 'name');
    if (!account) return res.status(404).json({ message: 'Account not found' });
    res.json(account);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// CREATE account (requires admin password)
router.post('/', protect, async (req, res) => {
  try {
    const { code, name, type, subType, description } = req.body;
    
    if (!code || !name || !type) {
      return res.status(400).json({ message: 'Code, name, and type are required' });
    }

    const existingAccount = await ChartOfAccounts.findOne({ code });
    if (existingAccount) {
      return res.status(400).json({ message: 'Account code already exists' });
    }

    const account = new ChartOfAccounts({
      code,
      name,
      type,
      subType,
      description,
      createdBy: req.user.id,
    });

    const savedAccount = await account.save();
    res.status(201).json(savedAccount);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// UPDATE account (requires admin password)
router.put('/:id', protect, async (req, res) => {
  try {
    const { name, subType, description, status } = req.body;
    const account = await ChartOfAccounts.findById(req.params.id);
    
    if (!account) return res.status(404).json({ message: 'Account not found' });

    Object.assign(account, {
      name: name || account.name,
      subType: subType || account.subType,
      description: description || account.description,
      status: status || account.status,
      updatedBy: req.user.id,
    });

    const updatedAccount = await account.save();
    res.json(updatedAccount);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// DELETE account (requires admin password)
router.delete('/:id', protect, adminPasswordAuth, async (req, res) => {
  try {
    const account = await ChartOfAccounts.findByIdAndDelete(req.params.id);
    if (!account) return res.status(404).json({ message: 'Account not found' });
    res.json({ message: 'Account deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
