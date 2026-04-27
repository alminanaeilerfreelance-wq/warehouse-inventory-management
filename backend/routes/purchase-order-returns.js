const express = require('express');
const router = express.Router();
const PurchaseOrderReturn = require('../models/PurchaseOrderReturn');
const QRCode = require('qrcode');
const adminPasswordAuth = require('../middleware/adminPassword');
const { protect } = require('../middleware/auth');

// Generate return number with date format MMYYDATE
const generateReturnNo = async () => {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const year = String(now.getFullYear()).slice(-2);
  const date = String(now.getDate()).padStart(2, '0');
  const prefix = `RET${month}${year}${date}`;
  
  const lastReturn = await PurchaseOrderReturn.findOne({ returnNo: new RegExp(`^${prefix}`) })
    .sort({ returnNo: -1 });
  
  const sequence = lastReturn 
    ? parseInt(lastReturn.returnNo.slice(-3)) + 1 
    : 1;
  
  return `${prefix}${String(sequence).padStart(3, '0')}`;
};

// GET all returns
router.get('/', protect, async (req, res) => {
  try {
    const { supplierId, status, startDate, endDate, page = 1, limit = 20 } = req.query;
    
    let query = {};
    if (supplierId) query.supplier = supplierId;
    if (status) query.approvalStatus = status;
    if (startDate && endDate) {
      query.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }

    const skip = (page - 1) * limit;
    const returns = await PurchaseOrderReturn.find(query)
      .populate('purchaseOrder', 'poNo')
      .populate('supplier', 'name contact')
      .populate('employee', 'name')
      .populate('warehouse', 'name')
      .populate('items.product')
      .populate('createdBy', 'name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await PurchaseOrderReturn.countDocuments(query);
    res.json({ data: returns, total, page, pages: Math.ceil(total / limit) });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET single return
router.get('/:id', protect, async (req, res) => {
  try {
    const ret = await PurchaseOrderReturn.findById(req.params.id)
      .populate('purchaseOrder')
      .populate('supplier')
      .populate('employee')
      .populate('warehouse')
      .populate('items.product')
      .populate('createdBy', 'name');
    if (!ret) return res.status(404).json({ message: 'Return not found' });
    res.json(ret);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// CREATE return (requires admin password)
router.post('/', protect, async (req, res) => {
  try {
    const { purchaseOrder, supplier, employee, warehouse, items, discount, discountType, vat, vatInclusive, notes } = req.body;
    
    if (!purchaseOrder || !supplier || !items || items.length === 0) {
      return res.status(400).json({ message: 'PO, supplier, and items are required' });
    }

    let subtotal = 0;
    let totalQty = 0;
    
    // Process items - map frontend field names to schema field names
    const processedItems = items.map((item) => ({
      product: item.inventoryId || item.product,
      productName: item.productName || '',
      quantity: Number(item.qty) || Number(item.quantity) || 0,
      price: Number(item.price) || 0,
      discount: Number(item.discount) || 0,
      discountType: item.discountType || 'percentage',
      total: (Number(item.qty) || Number(item.quantity) || 0) * (Number(item.price) || 0),
    }));

    for (const item of processedItems) {
      const itemTotal = item.quantity * item.price;
      const discountAmount = item.discountType === 'percentage' ? (itemTotal * item.discount / 100) : item.discount;
      item.total = itemTotal - discountAmount;
      subtotal += item.total;
      totalQty += item.quantity;
    }

    const discountAmount = discountType === 'percentage' ? (subtotal * discount / 100) : discount;
    const afterDiscount = subtotal - discountAmount;
    const vatAmount = vatInclusive ? (afterDiscount * vat / (100 + vat)) : (afterDiscount * vat / 100);
    const total = vatInclusive ? afterDiscount : (afterDiscount + vatAmount);

    // Generate return number and QR code
    const returnNo = await generateReturnNo();
    const qrData = await QRCode.toDataURL(returnNo);

    const ret = new PurchaseOrderReturn({
      returnNo,
      purchaseOrder,
      supplier,
      employee,
      warehouse,
      items: processedItems,
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

    const savedReturn = await ret.save();
    res.status(201).json(savedReturn);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// APPROVE return (deducts from inventory, requires admin password)
router.post('/:id/approve', protect, adminPasswordAuth, async (req, res) => {
  try {
    const ret = await PurchaseOrderReturn.findById(req.params.id);
    if (!ret) return res.status(404).json({ message: 'Return not found' });

    if (ret.approvalStatus !== 'pending') {
      return res.status(400).json({ message: 'Return already processed' });
    }

    ret.approvalStatus = 'approved';
    ret.approvedBy = req.user.id;
    await ret.save();

    // TODO: Deduct inventory items
    // Update inventory for each item in ret.items

    res.json({ message: 'Return approved successfully', return: ret });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// UPDATE return (requires admin password)
router.put('/:id', protect, async (req, res) => {
  try {
    const { items, discount, discountType, vat, vatInclusive, notes, paymentStatus } = req.body;
    const ret = await PurchaseOrderReturn.findById(req.params.id);
    
    if (!ret) return res.status(404).json({ message: 'Return not found' });

    if (items && items.length > 0) {
      // Process items - map frontend field names to schema field names
      const processedItems = items.map((item) => ({
        product: item.inventoryId || item.product,
        productName: item.productName || '',
        quantity: Number(item.qty) || Number(item.quantity) || 0,
        price: Number(item.price) || 0,
        discount: Number(item.discount) || 0,
        discountType: item.discountType || 'percentage',
        total: (Number(item.qty) || Number(item.quantity) || 0) * (Number(item.price) || 0),
      }));
      
      let subtotal = 0;
      let totalQty = 0;
      
      for (const item of processedItems) {
        const itemTotal = item.quantity * item.price;
        const discountAmount = item.discountType === 'percentage' ? (itemTotal * item.discount / 100) : item.discount;
        item.total = itemTotal - discountAmount;
        subtotal += item.total;
        totalQty += item.quantity;
      }

      const discountAmount = discountType === 'percentage' ? (subtotal * discount / 100) : discount;
      const afterDiscount = subtotal - discountAmount;
      const vatAmount = vatInclusive ? (afterDiscount * vat / (100 + vat)) : (afterDiscount * vat / 100);
      const total = vatInclusive ? afterDiscount : (afterDiscount + vatAmount);

      ret.items = processedItems;
      ret.subtotal = subtotal;
      ret.discount = discountAmount;
      ret.discountType = discountType;
      ret.vat = vatAmount;
      ret.vatInclusive = vatInclusive;
      ret.total = total;
      ret.totalQty = totalQty;
    }

    Object.assign(ret, {
      notes: notes || ret.notes,
      paymentStatus: paymentStatus || ret.paymentStatus,
      updatedBy: req.user.id,
    });

    const updatedReturn = await ret.save();
    res.json(updatedReturn);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// DELETE return (requires admin password)
router.delete('/:id', protect, adminPasswordAuth, async (req, res) => {
  try {
    const ret = await PurchaseOrderReturn.findByIdAndDelete(req.params.id);
    if (!ret) return res.status(404).json({ message: 'Return not found' });
    res.json({ message: 'Return deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
