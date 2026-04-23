const express = require('express');
const { protect } = require('../middleware/auth');

// Models imported with a fallback so this route file is usable before all
// models are scaffolded; runtime errors surface clearly when a route is hit.
let Inventory, Invoice, PurchaseOrder;
try {
  Inventory = require('../models/Inventory');
} catch {
  /* will throw at runtime */
}
try {
  Invoice = require('../models/Invoice');
} catch {
  /* will throw at runtime */
}
try {
  PurchaseOrder = require('../models/PurchaseOrder');
} catch {
  /* will throw at runtime */
}

const router = express.Router();

// GET /api/notifications  (protected)
// Returns low-stock items, the 10 most recent invoices, and pending purchase orders
router.get('/', protect, async (req, res) => {
  try {
    const InventoryModel = Inventory || require('../models/Inventory');
    const InvoiceModel = Invoice || require('../models/Invoice');
    const PurchaseOrderModel = PurchaseOrder || require('../models/PurchaseOrder');

    const [lowStock, recentInvoices, pendingApprovals] = await Promise.all([
      // Items that are low_stock or out_of_stock
      InventoryModel.find({
        stock_status: { $in: ['low_stock', 'out_of_stock'] },
      }).sort({ stock_status: 1, quantity: 1 }),

      // 10 most recent invoices (newest first)
      InvoiceModel.find()
        .sort({ createdAt: -1 })
        .limit(10),

      // Purchase orders that have not been approved yet
      PurchaseOrderModel.find({ isApproved: false }).sort({ createdAt: -1 }),
    ]);

    return res.status(200).json({
      lowStock,
      recentInvoices,
      pendingApprovals,
    });
  } catch (error) {
    console.error('Notifications error:', error);
    return res.status(500).json({ message: 'Server error fetching notifications' });
  }
});

module.exports = router;
