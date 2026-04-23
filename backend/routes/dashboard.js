const express = require('express');
const router = express.Router();
const Inventory = require('../models/Inventory');
const Customer = require('../models/Customer');
const Supplier = require('../models/Supplier');
const StoreBranch = require('../models/StoreBranch');
const Invoice = require('../models/Invoice');
const PurchaseOrder = require('../models/PurchaseOrder');
const User = require('../models/User');
const { protect } = require('../middleware/auth');

// GET /api/dashboard
router.get('/', protect, async (req, res) => {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    const isAdmin = req.user.role === 'admin';

    // For regular users, get their assigned branch
    let branchId = null;
    if (!isAdmin) {
      const userDoc = await User.findById(req.user._id).populate('assignedBranch');
      if (!userDoc?.assignedBranch) {
        return res.json({
          noBranchAssigned: true,
          message: 'No store branch assigned to your account. Contact your administrator.',
        });
      }
      branchId = userDoc.assignedBranch._id;
    }

    // Invoice filter: admin = all, user = their branch
    const invoiceFilter = isAdmin ? { invoiceType: 'customer' } : { invoiceType: 'customer', storeBranch: branchId };
    const monthlyFilter = isAdmin
      ? { invoiceType: 'customer', createdAt: { $gte: startOfMonth, $lte: endOfMonth } }
      : { invoiceType: 'customer', storeBranch: branchId, createdAt: { $gte: startOfMonth, $lte: endOfMonth } };

    const [
      totalInventoryItems,
      totalCustomers,
      totalSuppliers,
      totalBranches,
      recentInvoices,
      lowStockCount,
      monthlySalesResult,
      pendingPOs,
      branchInfo,
    ] = await Promise.all([
      isAdmin ? Inventory.countDocuments() : Inventory.countDocuments({ warehouse: { $exists: true } }),
      isAdmin ? Customer.countDocuments() : Customer.countDocuments(),
      isAdmin ? Supplier.countDocuments() : Supplier.countDocuments(),
      isAdmin ? StoreBranch.countDocuments() : 1,
      Invoice.find(invoiceFilter)
        .populate('customer', 'name email')
        .select('invoiceNo customer total paymentStatus createdAt storeBranch')
        .sort({ createdAt: -1 })
        .limit(5),
      Inventory.countDocuments({ stockStatus: { $ne: 'in_stock' } }),
      Invoice.aggregate([
        { $match: monthlyFilter },
        { $group: { _id: null, totalSales: { $sum: '$total' }, count: { $sum: 1 } } },
      ]),
      isAdmin
        ? PurchaseOrder.countDocuments({ status: 'pending' })
        : PurchaseOrder.countDocuments({ status: 'pending', warehouse: { $exists: true } }),
      !isAdmin && branchId ? StoreBranch.findById(branchId).lean() : null,
    ]);

    const monthlySales = monthlySalesResult.length > 0 ? monthlySalesResult[0].totalSales : 0;
    const monthlyInvoiceCount = monthlySalesResult.length > 0 ? monthlySalesResult[0].count : 0;

    res.json({
      totalInventoryItems,
      totalCustomers,
      totalSuppliers,
      totalBranches,
      recentInvoices,
      lowStockCount,
      monthlySales,
      monthlyInvoiceCount,
      pendingPOs,
      isAdmin,
      branchInfo: branchInfo || null,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
