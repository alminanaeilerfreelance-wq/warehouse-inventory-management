const mongoose = require('mongoose');

const companySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      trim: true,
    },
    logo: {
      type: String,
      trim: true,
    },
    slogan: {
      type: String,
      trim: true,
    },
    contactNumber: {
      type: String,
      trim: true,
    },
    address: {
      type: String,
      trim: true,
    },
    tinNo: {
      type: String,
      trim: true,
    },
    licenseNo: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Company', companySchema);
