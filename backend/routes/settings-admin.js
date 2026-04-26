const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const Settings = require('../models/Settings');
const adminPasswordAuth = require('../middleware/adminPassword');
const { protect } = require('../middleware/auth');

// GET settings
router.get('/', protect, async (req, res) => {
  try {
    let settings = await Settings.findOne();
    
    if (!settings) {
      settings = new Settings();
      await settings.save();
    }

    // Remove sensitive data before sending
    const settingsObj = settings.toObject();
    delete settingsObj.adminPasswordHash;
    
    res.json(settingsObj);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// UPDATE settings
router.put('/', protect, async (req, res) => {
  try {
    let settings = await Settings.findOne();
    
    if (!settings) {
      settings = new Settings();
    }

    const {
      company,
      vatAmount,
      vatType,
      defaultLanguage,
      supportedLanguages,
      actionColors,
      stockStatusColors,
      paymentStatusColors,
      decimalPlaces,
      timeFormat,
      dateFormat,
      currencySymbol,
      currencyCode,
      invoicePrefix,
      invoiceStartNumber,
      poPrefix,
      poStartNumber,
      emailHost,
      emailPort,
      emailUser,
      emailPass,
      emailFromAddress,
      enableEmailNotifications,
      enableSmsNotifications,
      stockLowThreshold,
      sendNotificationsEmail,
    } = req.body;

    if (company) Object.assign(settings.company || {}, company);
    if (vatAmount !== undefined) settings.vatAmount = vatAmount;
    if (vatType) settings.vatType = vatType;
    if (defaultLanguage) settings.defaultLanguage = defaultLanguage;
    if (supportedLanguages) settings.supportedLanguages = supportedLanguages;
    if (actionColors) Object.assign(settings.actionColors, actionColors);
    if (stockStatusColors) Object.assign(settings.stockStatusColors, stockStatusColors);
    if (paymentStatusColors) Object.assign(settings.paymentStatusColors, paymentStatusColors);
    if (decimalPlaces !== undefined) settings.decimalPlaces = decimalPlaces;
    if (timeFormat) settings.timeFormat = timeFormat;
    if (dateFormat) settings.dateFormat = dateFormat;
    if (currencySymbol) settings.currencySymbol = currencySymbol;
    if (currencyCode) settings.currencyCode = currencyCode;
    if (invoicePrefix) settings.invoicePrefix = invoicePrefix;
    if (invoiceStartNumber) settings.invoiceStartNumber = invoiceStartNumber;
    if (poPrefix) settings.poPrefix = poPrefix;
    if (poStartNumber) settings.poStartNumber = poStartNumber;
    if (emailHost) settings.emailHost = emailHost;
    if (emailPort) settings.emailPort = emailPort;
    if (emailUser) settings.emailUser = emailUser;
    if (emailPass) settings.emailPass = emailPass;
    if (emailFromAddress) settings.emailFromAddress = emailFromAddress;
    if (enableEmailNotifications !== undefined) settings.enableEmailNotifications = enableEmailNotifications;
    if (enableSmsNotifications !== undefined) settings.enableSmsNotifications = enableSmsNotifications;
    if (stockLowThreshold) settings.stockLowThreshold = stockLowThreshold;
    if (sendNotificationsEmail) settings.sendNotificationsEmail = sendNotificationsEmail;
    
    settings.updatedBy = req.user.id;
    const updatedSettings = await settings.save();

    // Remove sensitive data before sending
    const settingsObj = updatedSettings.toObject();
    delete settingsObj.adminPasswordHash;
    delete settingsObj.emailPass;

    res.json(settingsObj);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// SET admin password (requires current valid admin password in header)
router.post('/admin-password/set', protect, adminPasswordAuth, async (req, res) => {
  try {
    const { newPassword } = req.body;
    
    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }

    let settings = await Settings.findOne();
    if (!settings) {
      settings = new Settings();
    }

    const salt = await bcrypt.genSalt(10);
    settings.adminPasswordHash = await bcrypt.hash(newPassword, salt);
    settings.adminPasswordLastChanged = new Date();
    settings.updatedBy = req.user.id;

    await settings.save();
    res.json({ message: 'Admin password updated successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Initialize admin password (only if not set)
router.post('/admin-password/initialize', async (req, res) => {
  try {
    const { password } = req.body;
    
    if (!password || password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }

    let settings = await Settings.findOne();
    if (!settings) {
      settings = new Settings();
    }

    if (settings.adminPasswordHash) {
      return res.status(400).json({ message: 'Admin password already set' });
    }

    const salt = await bcrypt.genSalt(10);
    settings.adminPasswordHash = await bcrypt.hash(password, salt);
    settings.adminPasswordLastChanged = new Date();

    await settings.save();
    res.json({ message: 'Admin password initialized successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
