const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema(
  {
    vatAmount: {
      type: Number,
      default: 12,
    },
    vatType: {
      type: String,
      enum: ['inclusive', 'exclusive'],
      default: 'exclusive',
    },
    language: {
      type: String,
      default: 'en',
    },
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
  },
  { timestamps: true }
);

module.exports = mongoose.model('Settings', settingsSchema);
