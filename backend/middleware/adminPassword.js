const bcrypt = require('bcryptjs');

// Admin password verification middleware
// Usage: router.post('/api/resource', adminPasswordAuth, handler)
const adminPasswordAuth = async (req, res, next) => {
  try {
    const adminPassword = req.headers['admin-password'];
    
    if (!adminPassword) {
      return res.status(401).json({ message: 'Admin password required' });
    }

    // Get the admin password hash from Settings
    const Settings = require('../models/Settings');
    const settings = await Settings.findOne();
    
    if (!settings || !settings.adminPasswordHash) {
      return res.status(500).json({ message: 'Admin password not configured' });
    }

    // Compare provided password with stored hash
    const isValidPassword = await bcrypt.compare(adminPassword, settings.adminPasswordHash);
    
    if (!isValidPassword) {
      return res.status(401).json({ message: 'Invalid admin password' });
    }

    // Store admin verification in request
    req.adminVerified = true;
    next();
  } catch (error) {
    res.status(500).json({ message: 'Password verification failed', error: error.message });
  }
};

module.exports = adminPasswordAuth;
