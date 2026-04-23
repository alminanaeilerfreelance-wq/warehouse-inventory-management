const express = require('express');
const { protect, adminOnly } = require('../middleware/auth');

// These models will be created separately; import them here so the route
// file is wired up and ready to use once the models exist.
let Company, Settings;
try {
  Company = require('../models/Company');
} catch {
  // model not yet created — will throw at runtime only if the route is hit
}
try {
  Settings = require('../models/Settings');
} catch {
  // model not yet created
}

const router = express.Router();

// GET /api/settings
// Returns merged company info and general settings
router.get('/', protect, async (req, res) => {
  try {
    const CompanyModel = Company || require('../models/Company');
    const SettingsModel = Settings || require('../models/Settings');

    const [company, settings] = await Promise.all([
      CompanyModel.findOne(),
      SettingsModel.findOne(),
    ]);

    return res.status(200).json({
      company: company || {},
      settings: settings || {},
    });
  } catch (error) {
    console.error('Get settings error:', error);
    return res.status(500).json({ message: 'Server error fetching settings' });
  }
});

// PUT /api/settings/company  (admin only)
// Upserts the single Company document
router.put('/company', protect, adminOnly, async (req, res) => {
  try {
    const CompanyModel = Company || require('../models/Company');

    const updated = await CompanyModel.findOneAndUpdate(
      {},
      { $set: req.body },
      { new: true, upsert: true, runValidators: true }
    );

    return res.status(200).json({
      message: 'Company information updated successfully',
      company: updated,
    });
  } catch (error) {
    console.error('Update company error:', error);
    return res.status(500).json({ message: 'Server error updating company information' });
  }
});

// PUT /api/settings/general  (admin only)
// Upserts the single Settings document
router.put('/general', protect, adminOnly, async (req, res) => {
  try {
    const SettingsModel = Settings || require('../models/Settings');

    const updated = await SettingsModel.findOneAndUpdate(
      {},
      { $set: req.body },
      { new: true, upsert: true, runValidators: true }
    );

    return res.status(200).json({
      message: 'General settings updated successfully',
      settings: updated,
    });
  } catch (error) {
    console.error('Update settings error:', error);
    return res.status(500).json({ message: 'Server error updating general settings' });
  }
});

module.exports = router;
