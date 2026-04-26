#!/usr/bin/env node
/**
 * Initialize WMS System
 * Sets up admin password, default chart of accounts, and initial settings
 */

require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const Settings = require('./models/Settings');
const ChartOfAccounts = require('./models/ChartOfAccounts');

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      dbName: process.env.MONGODB_DB,
    });
    console.log('✓ MongoDB connected for initialization');
  } catch (error) {
    console.error('✗ MongoDB connection failed:', error.message);
    process.exit(1);
  }
};

const initializeAdminPassword = async () => {
  try {
    const settings = await Settings.findOne();
    
    if (settings && settings.adminPasswordHash) {
      console.log('✓ Admin password already set');
      return;
    }

    // Default admin password (should be changed immediately)
    const defaultPassword = 'admin123';
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(defaultPassword, salt);

    if (!settings) {
      await Settings.create({
        adminPasswordHash: hashedPassword,
        adminPasswordLastChanged: new Date(),
        company: {
          name: 'Your Company Name',
          slogan: 'Warehouse Management System',
          contact: '+1-234-567-8900',
          address: '123 Business Street',
          tinNo: '',
          licenseNo: '',
        },
        vatAmount: 12,
        vatType: 'exclusive',
        defaultLanguage: 'english',
        supportedLanguages: ['english', 'filipino', 'arabic'],
        currencySymbol: '₱',
        currencyCode: 'PHP',
      });
    } else {
      settings.adminPasswordHash = hashedPassword;
      settings.adminPasswordLastChanged = new Date();
      await settings.save();
    }

    console.log('✓ Admin password initialized (default: admin123)');
    console.log('⚠️  IMPORTANT: Change this password immediately in production!');
  } catch (error) {
    console.error('✗ Failed to initialize admin password:', error.message);
    process.exit(1);
  }
};

const initializeChartOfAccounts = async () => {
  try {
    const existingAccounts = await ChartOfAccounts.countDocuments();
    
    if (existingAccounts > 0) {
      console.log(`✓ Chart of accounts already initialized (${existingAccounts} accounts)`);
      return;
    }

    const accounts = [
      // Assets
      { code: '1000', name: 'Cash', type: 'asset', subType: 'current' },
      { code: '1100', name: 'Accounts Receivable', type: 'asset', subType: 'current' },
      { code: '1200', name: 'Inventory', type: 'asset', subType: 'current' },
      { code: '1300', name: 'Equipment', type: 'asset', subType: 'fixed' },
      { code: '1400', name: 'Accumulated Depreciation', type: 'asset', subType: 'fixed' },
      
      // Liabilities
      { code: '2000', name: 'Accounts Payable', type: 'liability', subType: 'current' },
      { code: '2100', name: 'Short-term Loan', type: 'liability', subType: 'current' },
      { code: '2200', name: 'Long-term Loan', type: 'liability', subType: 'non-current' },
      
      // Equity
      { code: '3000', name: 'Capital', type: 'equity', subType: 'owner-equity' },
      { code: '3100', name: 'Retained Earnings', type: 'equity', subType: 'owner-equity' },
      
      // Revenue
      { code: '4000', name: 'Product Sales', type: 'revenue', subType: 'operating' },
      { code: '4100', name: 'Service Revenue', type: 'revenue', subType: 'operating' },
      { code: '4200', name: 'Other Income', type: 'revenue', subType: 'non-operating' },
      
      // Expenses
      { code: '5000', name: 'Cost of Goods Sold', type: 'cost-of-goods-sold', subType: 'cogs' },
      { code: '6000', name: 'Salaries & Wages', type: 'expense', subType: 'operating' },
      { code: '6100', name: 'Utilities', type: 'expense', subType: 'operating' },
      { code: '6200', name: 'Office Supplies', type: 'expense', subType: 'operating' },
      { code: '6300', name: 'Depreciation', type: 'expense', subType: 'operating' },
      { code: '6400', name: 'Marketing', type: 'expense', subType: 'operating' },
      { code: '6500', name: 'Rent', type: 'expense', subType: 'operating' },
    ];

    await ChartOfAccounts.insertMany(accounts);
    console.log(`✓ Chart of accounts initialized (${accounts.length} accounts)`);
  } catch (error) {
    console.error('✗ Failed to initialize chart of accounts:', error.message);
    process.exit(1);
  }
};

const main = async () => {
  console.log('\n🚀 Initializing WMS System...\n');
  
  await connectDB();
  await initializeAdminPassword();
  await initializeChartOfAccounts();
  
  console.log('\n✅ System initialization complete!\n');
  console.log('📌 Next steps:');
  console.log('   1. Change the admin password immediately');
  console.log('   2. Set up your company details in Settings');
  console.log('   3. Configure email settings for notifications');
  console.log('   4. Create master data (brands, categories, products, etc.)\n');
  
  process.exit(0);
};

main();
