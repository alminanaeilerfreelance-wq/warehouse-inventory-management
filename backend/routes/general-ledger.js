const express = require('express');
const router = express.Router();
const GeneralLedger = require('../models/GeneralLedger');
const ChartOfAccounts = require('../models/ChartOfAccounts');
const { protect } = require('../middleware/auth');

// GET general ledger
router.get('/', protect, async (req, res) => {
  try {
    const { accountId, startDate, endDate, page = 1, limit = 50 } = req.query;
    
    let query = {};
    if (accountId) query.account = accountId;
    if (startDate && endDate) {
      query.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }

    const skip = (page - 1) * limit;
    const entries = await GeneralLedger.find(query)
      .populate('account', 'code name type')
      .populate('journalEntry', 'journalNo reference')
      .sort({ date: 1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await GeneralLedger.countDocuments(query);
    res.json({ data: entries, total, page, pages: Math.ceil(total / limit) });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET trial balance report
router.get('/report/trial-balance', protect, async (req, res) => {
  try {
    const { asOfDate } = req.query;
    
    const query = {};
    if (asOfDate) {
      query.date = { $lte: new Date(asOfDate) };
    }

    const accounts = await ChartOfAccounts.find({ status: 'active' });
    
    let trialBalance = [];
    let totalDebit = 0;
    let totalCredit = 0;

    for (const account of accounts) {
      const ledgerEntries = await GeneralLedger.find({
        ...query,
        account: account._id,
      });

      let debit = 0;
      let credit = 0;

      for (const entry of ledgerEntries) {
        debit += entry.debit || 0;
        credit += entry.credit || 0;
      }

      if (debit > 0 || credit > 0) {
        trialBalance.push({
          accountCode: account.code,
          accountName: account.name,
          accountType: account.type,
          debit,
          credit,
        });
        totalDebit += debit;
        totalCredit += credit;
      }
    }

    res.json({
      asOfDate: asOfDate || new Date(),
      trialBalance,
      totals: {
        debit: totalDebit,
        credit: totalCredit,
        balanced: Math.abs(totalDebit - totalCredit) < 0.01,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET income statement report
router.get('/report/income-statement', protect, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    if (!startDate || !endDate) {
      return res.status(400).json({ message: 'Start and end dates required' });
    }

    const query = {
      date: {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      },
    };

    const revenueAccounts = await ChartOfAccounts.find({ type: 'revenue', status: 'active' });
    const expenseAccounts = await ChartOfAccounts.find({ type: 'expense', status: 'active' });

    let revenues = [];
    let totalRevenue = 0;
    let expenses = [];
    let totalExpense = 0;

    for (const account of revenueAccounts) {
      const entries = await GeneralLedger.find({ ...query, account: account._id });
      let credit = entries.reduce((sum, e) => sum + (e.credit || 0), 0);
      if (credit > 0) {
        revenues.push({
          accountCode: account.code,
          accountName: account.name,
          amount: credit,
        });
        totalRevenue += credit;
      }
    }

    for (const account of expenseAccounts) {
      const entries = await GeneralLedger.find({ ...query, account: account._id });
      let debit = entries.reduce((sum, e) => sum + (e.debit || 0), 0);
      if (debit > 0) {
        expenses.push({
          accountCode: account.code,
          accountName: account.name,
          amount: debit,
        });
        totalExpense += debit;
      }
    }

    const netIncome = totalRevenue - totalExpense;

    res.json({
      period: { startDate, endDate },
      revenues,
      totalRevenue,
      expenses,
      totalExpense,
      netIncome,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET balance sheet report
router.get('/report/balance-sheet', protect, async (req, res) => {
  try {
    const { asOfDate } = req.query;
    
    const query = {};
    if (asOfDate) {
      query.date = { $lte: new Date(asOfDate) };
    }

    const assetAccounts = await ChartOfAccounts.find({ type: 'asset', status: 'active' });
    const liabilityAccounts = await ChartOfAccounts.find({ type: 'liability', status: 'active' });
    const equityAccounts = await ChartOfAccounts.find({ type: 'equity', status: 'active' });

    let assets = [];
    let totalAssets = 0;
    let liabilities = [];
    let totalLiabilities = 0;
    let equity = [];
    let totalEquity = 0;

    for (const account of assetAccounts) {
      const entries = await GeneralLedger.find({ ...query, account: account._id });
      let balance = entries.reduce((sum, e) => sum + (e.debit || 0) - (e.credit || 0), 0);
      if (balance !== 0) {
        assets.push({
          accountCode: account.code,
          accountName: account.name,
          balance,
        });
        totalAssets += balance;
      }
    }

    for (const account of liabilityAccounts) {
      const entries = await GeneralLedger.find({ ...query, account: account._id });
      let balance = entries.reduce((sum, e) => sum + (e.credit || 0) - (e.debit || 0), 0);
      if (balance !== 0) {
        liabilities.push({
          accountCode: account.code,
          accountName: account.name,
          balance,
        });
        totalLiabilities += balance;
      }
    }

    for (const account of equityAccounts) {
      const entries = await GeneralLedger.find({ ...query, account: account._id });
      let balance = entries.reduce((sum, e) => sum + (e.credit || 0) - (e.debit || 0), 0);
      if (balance !== 0) {
        equity.push({
          accountCode: account.code,
          accountName: account.name,
          balance,
        });
        totalEquity += balance;
      }
    }

    res.json({
      asOfDate: asOfDate || new Date(),
      assets,
      totalAssets,
      liabilities,
      totalLiabilities,
      equity,
      totalEquity,
      balanced: Math.abs(totalAssets - (totalLiabilities + totalEquity)) < 0.01,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
