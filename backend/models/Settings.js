const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema(
  {
    // Company Details
    company: {
      name: String,
      logo: String,
      slogan: String,
      contact: String,
      address: String,
      tinNo: String,
      licenseNo: String,
    },
    // General Settings
    vatAmount: {
      type: Number,
      default: 12,
    },
    vatType: {
      type: String,
      enum: ['inclusive', 'exclusive'],
      default: 'exclusive',
    },
    // Language & Localization
    defaultLanguage: {
      type: String,
      enum: ['english', 'filipino', 'arabic'],
      default: 'english',
    },
    supportedLanguages: {
      type: [String],
      enum: ['english', 'filipino', 'arabic'],
      default: ['english'],
    },
    // Admin Password (hashed)
    adminPasswordHash: String,
    adminPasswordLastChanged: Date,
    // Action Colors
    actionColors: {
      type: Object,
      default: {
        add: '#2196f3',
        edit: '#ff9800',
        delete: '#f44336',
        update: '#4caf50',
        print: '#607d8b',
        pdf: '#e91e63',
        excel: '#4caf50',
        import: '#9c27b0',
        calendar: '#00bcd4',
      },
    },
    // Stock Status Colors
    stockStatusColors: {
      type: Object,
      default: {
        'in-stock': '#4caf50',
        'low-stock': '#ff9800',
        'out-of-stock': '#f44336',
      },
    },
    // Payment Status Colors
    paymentStatusColors: {
      type: Object,
      default: {
        pending: '#ffeb3b',
        open: '#2196f3',
        paid: '#4caf50',
        cancelled: '#f44336',
        due: '#ff9800',
        overdue: '#e91e63',
      },
    },
    // System Settings
    decimalPlaces: { type: Number, default: 2 },
    timeFormat: { type: String, enum: ['12h', '24h'], default: '24h' },
    dateFormat: { type: String, default: 'MM/DD/YYYY' },
    currencySymbol: { type: String, default: '₱' },
    currencyCode: { type: String, default: 'PHP' },
    // Auto Invoice Numbering
    invoicePrefix: { type: String, default: 'INV' },
    invoiceStartNumber: { type: Number, default: 1000 },
    poPrefix: { type: String, default: 'PO' },
    poStartNumber: { type: Number, default: 1000 },
    // Email Settings
    emailHost: String,
    emailPort: Number,
    emailUser: String,
    emailPass: String,
    emailFromAddress: String,
    // Notifications
    enableEmailNotifications: { type: Boolean, default: true },
    enableSmsNotifications: { type: Boolean, default: false },
    stockLowThreshold: { type: Number, default: 10 },
    sendNotificationsEmail: String,
    // Updated by
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Settings', settingsSchema);
