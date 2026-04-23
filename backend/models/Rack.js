const mongoose = require('mongoose');

const rackSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    bin: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Bin',
    },
    description: {
      type: String,
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Rack', rackSchema);
