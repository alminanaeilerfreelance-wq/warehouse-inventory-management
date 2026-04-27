const express = require('express');
const bcrypt = require('bcryptjs');
const router = express.Router();
const User = require('../models/User');
const { protect, adminOnly } = require('../middleware/auth');

const sanitize = (user) => ({
  _id: user._id,
  customerName: user.customerName,
  username: user.username,
  email: user.email,
  contact: user.contact,
  address: user.address,
  image: user.image,
  role: user.role,
  isActive: user.isActive,
  assignedBranch: user.assignedBranch,
  lastLoginAt: user.lastLoginAt,
  isSuspicious: user.isSuspicious,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
  permissions: user.permissions,
});

// GET /api/users — list all (admin only)
router.get('/', protect, adminOnly, async (req, res) => {
  try {
    // Input validation
    let { page = 1, limit = 20, search = '' } = req.query;
    
    page = Math.max(1, Math.min(Number(page) || 1, 10000));
    limit = Math.max(1, Math.min(Number(limit) || 20, 100));
    
    // Sanitize search parameter - remove special characters that could cause issues
    search = String(search).trim().substring(0, 100);
    if (!/^[a-zA-Z0-9@._\s-]*$/.test(search)) {
      search = '';
    }
    
    const query = search
      ? {
          $or: [
            { username: { $regex: search, $options: 'i' } },
            { customerName: { $regex: search, $options: 'i' } },
            { email: { $regex: search, $options: 'i' } },
          ],
        }
      : {};
    
    const total = await User.countDocuments(query);
    const users = await User.find(query)
      .populate('assignedBranch', 'name code')
      .select('-password')
      .sort({ createdAt: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit));
    
    res.json({ users, total, page: Number(page), pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/users/:id — single user (admin only)
router.get('/:id', protect, adminOnly, async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .populate('assignedBranch', 'name code')
      .select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(sanitize(user));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/users — create user (admin only)
router.post('/', protect, adminOnly, async (req, res) => {
  try {
    const { customerName, username, email, contact, address, image, password, role, isActive, assignedBranch, permissions } = req.body;
    if (!username || !email || !password) return res.status(400).json({ message: 'Username, email, and password are required' });
    const existing = await User.findOne({ $or: [{ email: email.toLowerCase() }, { username }] });
    if (existing) {
      const field = existing.email === email.toLowerCase() ? 'Email' : 'Username';
      return res.status(409).json({ message: `${field} is already taken` });
    }
    const hash = await bcrypt.hash(password, 12);
    const user = await User.create({
      customerName, username, email: email.toLowerCase(), contact, address, image,
      password: hash, role: role || 'user',
      isActive: isActive !== undefined ? isActive : true,
      assignedBranch: assignedBranch || null,
      permissions: permissions || {},
    });
    const populated = await User.findById(user._id).populate('assignedBranch', 'name code').select('-password');
    res.status(201).json(sanitize(populated));
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// PUT /api/users/:id — update user (admin only)
router.put('/:id', protect, adminOnly, async (req, res) => {
  try {
    const { customerName, email, contact, address, image, role, isActive, assignedBranch, password, permissions } = req.body;
    const updates = {};
    if (customerName !== undefined) updates.customerName = customerName;
    if (email !== undefined) {
      const existing = await User.findOne({ email: email.toLowerCase(), _id: { $ne: req.params.id } });
      if (existing) return res.status(409).json({ message: 'Email already in use' });
      updates.email = email.toLowerCase();
    }
    if (contact !== undefined) updates.contact = contact;
    if (address !== undefined) updates.address = address;
    if (image !== undefined) updates.image = image;
    if (role !== undefined) updates.role = role;
    if (isActive !== undefined) updates.isActive = isActive;
    if (assignedBranch !== undefined) updates.assignedBranch = assignedBranch || null;
    if (permissions !== undefined) updates.permissions = permissions;
    if (password && password.length >= 6) {
      updates.password = await bcrypt.hash(password, 12);
    }
    const user = await User.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true })
      .populate('assignedBranch', 'name code')
      .select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(sanitize(user));
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// DELETE /api/users/:id — delete user (admin only, cannot delete self)
router.delete('/:id', protect, adminOnly, async (req, res) => {
  try {
    if (req.params.id === req.user._id.toString()) {
      return res.status(400).json({ message: 'Cannot delete your own account' });
    }
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json({ message: 'User deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
