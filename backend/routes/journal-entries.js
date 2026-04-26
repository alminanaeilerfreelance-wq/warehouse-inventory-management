const express = require('express');
const router = express.Router();
const JournalEntry = require('../models/JournalEntry');
const GeneralLedger = require('../models/GeneralLedger');
const adminPasswordAuth = require('../middleware/adminPassword');
const { protect } = require('../middleware/auth');

// GET all journal entries
router.get('/', protect, async (req, res) => {
  try {
    const { status, reference, startDate, endDate, page = 1, limit = 20 } = req.query;
    
    let query = {};
    if (status) query.status = status;
    if (reference) query.reference = reference;
    if (startDate && endDate) {
      query.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }

    const skip = (page - 1) * limit;
    const entries = await JournalEntry.find(query)
      .populate('entries.account', 'code name')
      .populate('approvedBy', 'name')
      .populate('createdBy', 'name')
      .sort({ date: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await JournalEntry.countDocuments(query);
    res.json({ data: entries, total, page, pages: Math.ceil(total / limit) });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// CREATE journal entry (requires admin password)
router.post('/', protect, async (req, res) => {
  try {
    const { date, reference, referenceId, description, entries } = req.body;
    
    if (!date || !reference || !entries || entries.length === 0) {
      return res.status(400).json({ message: 'Date, reference, and entries are required' });
    }

    let totalDebit = 0;
    let totalCredit = 0;
    
    for (const entry of entries) {
      totalDebit += entry.debit || 0;
      totalCredit += entry.credit || 0;
    }

    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      return res.status(400).json({ message: 'Debits and credits must balance' });
    }

    const journalEntry = new JournalEntry({
      date: new Date(date),
      reference,
      referenceId,
      description,
      entries,
      totalDebit,
      totalCredit,
      createdBy: req.user.id,
    });

    const savedEntry = await journalEntry.save();
    res.status(201).json(savedEntry);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// POST journal entry (move from draft to posted, requires admin password)
router.post('/:id/post', protect, adminPasswordAuth, async (req, res) => {
  try {
    const journalEntry = await JournalEntry.findById(req.params.id);
    if (!journalEntry) return res.status(404).json({ message: 'Journal entry not found' });

    if (journalEntry.status !== 'draft') {
      return res.status(400).json({ message: 'Only draft entries can be posted' });
    }

    journalEntry.status = 'posted';
    journalEntry.approvedBy = req.user.id;
    journalEntry.postedDate = new Date();
    await journalEntry.save();

    // Create general ledger entries
    for (const entry of journalEntry.entries) {
      await GeneralLedger.create({
        journalEntry: journalEntry._id,
        account: entry.account,
        description: journalEntry.description,
        debit: entry.debit || 0,
        credit: entry.credit || 0,
        date: journalEntry.date,
        reference: `${journalEntry.reference}-${journalEntry._id}`,
        createdBy: req.user.id,
      });
    }

    res.json({ message: 'Journal entry posted successfully', journalEntry });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// UPDATE journal entry (only draft entries, requires admin password)
router.put('/:id', protect, async (req, res) => {
  try {
    const { description, entries } = req.body;
    const journalEntry = await JournalEntry.findById(req.params.id);
    
    if (!journalEntry) return res.status(404).json({ message: 'Journal entry not found' });
    if (journalEntry.status !== 'draft') {
      return res.status(400).json({ message: 'Only draft entries can be edited' });
    }

    if (entries && entries.length > 0) {
      let totalDebit = 0;
      let totalCredit = 0;
      
      for (const entry of entries) {
        totalDebit += entry.debit || 0;
        totalCredit += entry.credit || 0;
      }

      if (Math.abs(totalDebit - totalCredit) > 0.01) {
        return res.status(400).json({ message: 'Debits and credits must balance' });
      }

      journalEntry.entries = entries;
      journalEntry.totalDebit = totalDebit;
      journalEntry.totalCredit = totalCredit;
    }

    journalEntry.description = description || journalEntry.description;
    journalEntry.updatedBy = req.user.id;
    await journalEntry.save();

    res.json(journalEntry);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// DELETE journal entry (only draft entries, requires admin password)
router.delete('/:id', protect, adminPasswordAuth, async (req, res) => {
  try {
    const journalEntry = await JournalEntry.findById(req.params.id);
    if (!journalEntry) return res.status(404).json({ message: 'Journal entry not found' });
    
    if (journalEntry.status !== 'draft') {
      return res.status(400).json({ message: 'Only draft entries can be deleted' });
    }

    await JournalEntry.findByIdAndDelete(req.params.id);
    res.json({ message: 'Journal entry deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
