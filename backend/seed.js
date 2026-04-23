/**
 * WMS Pro — Comprehensive Seed Script
 * Run: node seed.js
 * Seeds ALL models with realistic Philippine business data
 */
require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// ── Model imports ──────────────────────────────────────────────
const User = require('./models/User');
const Brand = require('./models/Brand');
const Design = require('./models/Design');
const Customer = require('./models/Customer');
const Supplier = require('./models/Supplier');
const Employee = require('./models/Employee');
const Category = require('./models/Category');
const ProductName = require('./models/ProductName');
const Zone = require('./models/Zone');
const Bin = require('./models/Bin');
const Rack = require('./models/Rack');
const Location = require('./models/Location');
const Warehouse = require('./models/Warehouse');
const StoreBranch = require('./models/StoreBranch');
const Type = require('./models/Type');
const Unit = require('./models/Unit');
const Service = require('./models/Service');
const Expense = require('./models/Expense');
const Inventory = require('./models/Inventory');
const Invoice = require('./models/Invoice');
const PurchaseOrder = require('./models/PurchaseOrder');
const CalendarEvent = require('./models/CalendarEvent');
const Company = require('./models/Company');
const Settings = require('./models/Settings');

// ── Helpers ────────────────────────────────────────────────────
const rand = (arr) => arr[Math.floor(Math.random() * arr.length)];
const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const randFloat = (min, max) => parseFloat((Math.random() * (max - min) + min).toFixed(2));
const genInvoiceNo = (prefix = 'INV') => {
  const now = new Date();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const yy = String(now.getFullYear()).slice(-2);
  const dd = String(now.getDate()).padStart(2, '0');
  return `${prefix}-${mm}${yy}${dd}-${randInt(1000, 9999)}`;
};

async function main() {
  console.log('🌱 Connecting to MongoDB...');
  await mongoose.connect(process.env.MONGODB_URI, { dbName: process.env.MONGODB_DB });
  console.log('✅ Connected\n');

  // ── Clear all collections ──────────────────────────────────
  const collections = [
    User, Brand, Design, Customer, Supplier, Employee, Category, ProductName,
    Zone, Bin, Rack, Location, Warehouse, StoreBranch, Type, Unit, Service,
    Expense, Inventory, Invoice, PurchaseOrder, CalendarEvent, Company, Settings,
  ];
  console.log('🗑  Clearing existing data...');
  for (const Model of collections) {
    await Model.deleteMany({});
  }
  console.log('✅ Cleared\n');

  // ── 1. Users ───────────────────────────────────────────────
  console.log('👤 Seeding Users...');
  const adminHash = await bcrypt.hash('admin123', 12);
  const userHash = await bcrypt.hash('user123', 12);
  const managerHash = await bcrypt.hash('manager123', 12);

  const [adminUser, managerUser, regularUser] = await User.insertMany([
    { username: 'admin', email: 'admin@wmspro.ph', password: adminHash, customerName: 'System Administrator', role: 'admin', isActive: true, contact: '0917-000-0001', address: 'Makati City, Metro Manila' },
    { username: 'manager', email: 'manager@wmspro.ph', password: managerHash, customerName: 'Juan dela Cruz', role: 'admin', isActive: true, contact: '0917-000-0002', address: 'Quezon City, Metro Manila' },
    { username: 'demo_user', email: 'demo@wmspro.ph', password: userHash, customerName: 'Maria Santos', role: 'user', isActive: true, contact: '0917-000-0003', address: 'Pasig City, Metro Manila' },
  ]);
  console.log(`   ✓ 3 users (admin/admin123, manager/manager123, demo_user/user123)\n`);

  // ── 2. Company & Settings ──────────────────────────────────
  console.log('🏢 Seeding Company & Settings...');
  await Company.create({
    name: 'Apex Warehouse Corp.',
    slogan: 'Smarter Warehousing, Better Business',
    contactNumber: '(02) 8888-0000',
    address: '123 Industrial Ave., Caloocan City, Metro Manila',
    tinNo: '123-456-789-000',
    licenseNo: 'WMS-2024-PH-001',
  });
  await Settings.create({
    vatAmount: 12,
    vatType: 'exclusive',
    language: 'en',
    actionColors: { add: '#1565c0', edit: '#f57c00', delete: '#c62828', update: '#2e7d32', print: '#546e7a', pdf: '#ad1457', excel: '#1b5e20', import: '#6a1b9a', calendar: '#00838f' },
  });
  console.log('   ✓ Company & Settings\n');

  // ── 3. Warehouses ──────────────────────────────────────────
  console.log('🏭 Seeding Warehouses...');
  const [wh1, wh2] = await Warehouse.insertMany([
    { name: 'Main Warehouse — Caloocan', address: '123 Industrial Ave., Caloocan City', contact: '(02) 8888-1001', manager: 'Roberto Reyes', status: 'Active' },
    { name: 'South Hub — Laguna', address: '456 LIMA Technology Center, Batangas', contact: '(049) 555-2002', manager: 'Lourdes Garcia', status: 'Active' },
  ]);
  console.log('   ✓ 2 warehouses\n');

  // ── 4. Store Branches ──────────────────────────────────────
  console.log('🏪 Seeding Store Branches...');
  const [br1, br2, br3] = await StoreBranch.insertMany([
    { name: 'Makati Branch', address: 'Ayala Ave., Makati City', contact: '(02) 8888-3001', manager: 'Ana Villanueva', status: 'Active' },
    { name: 'Cebu Branch', address: 'Mandaue City, Cebu', contact: '(032) 555-3002', manager: 'Carlos Ramos', status: 'Active' },
    { name: 'Davao Branch', address: 'Buhangin, Davao City', contact: '(082) 555-3003', manager: 'Nida Torres', status: 'Active' },
  ]);
  console.log('   ✓ 3 branches\n');

  // ── 5. Zones ───────────────────────────────────────────────
  console.log('📍 Seeding Zones, Bins, Racks, Locations...');
  const zones = await Zone.insertMany([
    { name: 'Zone A — Electronics', warehouse: wh1._id, description: 'Electronics and gadgets storage' },
    { name: 'Zone B — Apparel', warehouse: wh1._id, description: 'Clothing and accessories' },
    { name: 'Zone C — FMCG', warehouse: wh1._id, description: 'Fast moving consumer goods' },
    { name: 'Zone D — Heavy Goods', warehouse: wh2._id, description: 'Appliances and heavy items' },
    { name: 'Zone E — Refrigerated', warehouse: wh2._id, description: 'Cold storage items' },
  ]);

  const bins = await Bin.insertMany([
    { name: 'Bin A1', zone: zones[0]._id }, { name: 'Bin A2', zone: zones[0]._id },
    { name: 'Bin B1', zone: zones[1]._id }, { name: 'Bin B2', zone: zones[1]._id },
    { name: 'Bin C1', zone: zones[2]._id }, { name: 'Bin D1', zone: zones[3]._id },
    { name: 'Bin E1', zone: zones[4]._id },
  ]);

  const racks = await Rack.insertMany([
    { name: 'Rack A1-R1', bin: bins[0]._id }, { name: 'Rack A1-R2', bin: bins[0]._id },
    { name: 'Rack A2-R1', bin: bins[1]._id }, { name: 'Rack B1-R1', bin: bins[2]._id },
    { name: 'Rack C1-R1', bin: bins[4]._id }, { name: 'Rack D1-R1', bin: bins[5]._id },
  ]);

  const locations = await Location.insertMany([
    { name: 'Loc A1-R1-S1', warehouse: wh1._id }, { name: 'Loc A1-R1-S2', warehouse: wh1._id },
    { name: 'Loc B1-R1-S1', warehouse: wh1._id }, { name: 'Loc C1-R1-S1', warehouse: wh1._id },
    { name: 'Loc D1-R1-S1', warehouse: wh2._id }, { name: 'Loc E1-R1-S1', warehouse: wh2._id },
  ]);
  console.log('   ✓ Zones, Bins, Racks, Locations\n');

  // ── 6. Brands ──────────────────────────────────────────────
  console.log('🏷  Seeding Brands, Designs, Categories...');
  const brands = await Brand.insertMany([
    { name: 'Samsung', description: 'Korean electronics giant', status: 'Active' },
    { name: 'Apple', description: 'US tech company', status: 'Active' },
    { name: 'Sony', description: 'Japanese electronics', status: 'Active' },
    { name: 'Penshoppe', description: 'Philippine fashion brand', status: 'Active' },
    { name: 'Bench', description: 'Philippine lifestyle brand', status: 'Active' },
    { name: 'Monde Nissin', description: 'Philippine food company', status: 'Active' },
    { name: 'San Miguel', description: 'Philippine beverage company', status: 'Active' },
    { name: 'LG', description: 'Korean electronics and appliances', status: 'Active' },
    { name: 'Unilever', description: 'Consumer goods multinational', status: 'Active' },
    { name: 'Nestlé', description: 'Swiss food and beverage', status: 'Active' },
  ]);

  const designs = await Design.insertMany([
    { name: 'Classic Black', status: 'Active' }, { name: 'Pearl White', status: 'Active' },
    { name: 'Space Gray', status: 'Active' }, { name: 'Midnight Blue', status: 'Active' },
    { name: 'Rose Gold', status: 'Active' }, { name: 'Tropical Print', status: 'Active' },
    { name: 'Solid Color', status: 'Active' }, { name: 'Striped', status: 'Active' },
  ]);

  const categories = await Category.insertMany([
    { name: 'Electronics', description: 'Gadgets and devices', status: 'Active' },
    { name: 'Smartphones', description: 'Mobile phones', status: 'Active' },
    { name: 'Apparel', description: 'Clothing and fashion', status: 'Active' },
    { name: 'Food & Beverage', description: 'FMCG food items', status: 'Active' },
    { name: 'Home Appliances', description: 'Household appliances', status: 'Active' },
    { name: 'Personal Care', description: 'Hygiene and grooming', status: 'Active' },
    { name: 'Accessories', description: 'Fashion accessories', status: 'Active' },
    { name: 'Office Supplies', description: 'Stationery and supplies', status: 'Active' },
  ]);
  console.log('   ✓ Brands, Designs, Categories\n');

  // ── 7. Types & Units ───────────────────────────────────────
  const types = await Type.insertMany([
    { name: 'Retail', module: 'inventory' }, { name: 'Wholesale', module: 'inventory' },
    { name: 'Service', module: 'invoice' }, { name: 'Perishable', module: 'inventory' },
    { name: 'Non-perishable', module: 'inventory' }, { name: 'Operational', module: 'expense' },
  ]);

  const units = await Unit.insertMany([
    { name: 'Piece', abbreviation: 'pc' }, { name: 'Box', abbreviation: 'box' },
    { name: 'Kilogram', abbreviation: 'kg' }, { name: 'Liter', abbreviation: 'L' },
    { name: 'Pack', abbreviation: 'pk' }, { name: 'Dozen', abbreviation: 'dz' },
    { name: 'Set', abbreviation: 'set' }, { name: 'Roll', abbreviation: 'roll' },
  ]);
  console.log('   ✓ Types & Units\n');

  // ── 8. Product Names ───────────────────────────────────────
  console.log('📦 Seeding Product Names...');
  const productNames = await ProductName.insertMany([
    { name: 'Samsung Galaxy A54', category: categories[1]._id, brand: brands[0]._id, status: 'Active' },
    { name: 'iPhone 15', category: categories[1]._id, brand: brands[1]._id, status: 'Active' },
    { name: 'Sony WH-1000XM5 Headphones', category: categories[0]._id, brand: brands[2]._id, status: 'Active' },
    { name: 'Samsung 65" QLED TV', category: categories[0]._id, brand: brands[0]._id, status: 'Active' },
    { name: 'Penshoppe Polo Shirt', category: categories[2]._id, brand: brands[3]._id, status: 'Active' },
    { name: 'Bench Slim Jeans', category: categories[2]._id, brand: brands[4]._id, status: 'Active' },
    { name: 'Lucky Me Noodles (72-pack)', category: categories[3]._id, brand: brands[5]._id, status: 'Active' },
    { name: 'San Miguel Beer Case (24 cans)', category: categories[3]._id, brand: brands[6]._id, status: 'Active' },
    { name: 'LG Inverter Split-type AC', category: categories[4]._id, brand: brands[7]._id, status: 'Active' },
    { name: 'LG Side-by-Side Refrigerator', category: categories[4]._id, brand: brands[7]._id, status: 'Active' },
    { name: 'Dove Soap (3-pack)', category: categories[5]._id, brand: brands[8]._id, status: 'Active' },
    { name: 'Nescafé 3-in-1 (30 sachets)', category: categories[3]._id, brand: brands[9]._id, status: 'Active' },
    { name: 'Samsung Galaxy Buds Pro', category: categories[0]._id, brand: brands[0]._id, status: 'Active' },
    { name: 'Apple Watch Series 9', category: categories[6]._id, brand: brands[1]._id, status: 'Active' },
    { name: 'Pilot G-2 Pen (box)', category: categories[7]._id, status: 'Active' },
  ]);
  console.log(`   ✓ ${productNames.length} product names\n`);

  // ── 9. Customers ───────────────────────────────────────────
  console.log('👥 Seeding Customers, Suppliers, Employees...');
  const customers = await Customer.insertMany([
    { name: 'Robinsons Supermarket', email: 'procurement@robinsons.com.ph', contact: '(02) 8638-0000', address: 'Robinsons Galleria, Ortigas, Pasig City', status: 'Active' },
    { name: 'SM Hypermarket', email: 'buyer@sm.com.ph', contact: '(02) 8831-1000', address: 'SM Mall of Asia, Pasay City', status: 'Active' },
    { name: 'Puregold Price Club', email: 'orders@puregold.com.ph', contact: '(02) 8863-3333', address: 'EDSA, Caloocan City', status: 'Active' },
    { name: 'Ever Gotesco', email: 'purchasing@ever.com.ph', contact: '(02) 8723-0000', address: 'Commonwealth Ave., Quezon City', status: 'Active' },
    { name: 'MetroMart Grocery', email: 'orders@metromart.com', contact: '0917-777-8888', address: 'BGC, Taguig City', status: 'Active' },
    { name: 'Lazada Philippines', email: 'b2b@lazada.com.ph', contact: '1800-1888-5252', address: '1 Raffles Place, Makati City', status: 'Active' },
    { name: 'Shopee Philippines', email: 'enterprise@shopee.ph', contact: '(02) 8771-7777', address: 'Science Hub Tower, McKinley, Taguig', status: 'Active' },
  ]);

  const suppliers = await Supplier.insertMany([
    { name: 'Samsung Philippines Corp.', email: 'supply@samsung.com.ph', contact: '(02) 8519-6000', address: 'Samsung Building, Ayala Ave., Makati City', status: 'Active' },
    { name: 'Apple Premium Reseller PH', email: 'wholesale@applereseller.ph', contact: '0917-100-2000', address: 'iCenter, Greenbelt 3, Makati City', status: 'Active' },
    { name: 'Sony Philippines Inc.', email: 'b2b@sony.com.ph', contact: '(02) 8902-0700', address: 'Cyber Sigma, McKinley West, BGC', status: 'Active' },
    { name: 'Monde Nissin Corp.', email: 'trade@mondenissin.com', contact: '(049) 501-0000', address: 'CPAR Building, Sta. Rosa, Laguna', status: 'Active' },
    { name: 'San Miguel Brewery Inc.', email: 'orders@sanmiguel.com.ph', contact: '(02) 8632-3000', address: 'San Miguel Ave., Mandaluyong City', status: 'Active' },
    { name: 'LG Electronics Philippines', email: 'supply@lg.com.ph', contact: '(02) 8-LG-PHONE', address: 'LG Bldg., Rockwell, Makati City', status: 'Active' },
  ]);

  const employees = await Employee.insertMany([
    { name: 'Ricardo Mendoza', employeeId: 'EMP-001', position: 'Warehouse Manager', department: 'Operations', email: 'r.mendoza@wmspro.ph', contact: '0917-111-0001', salary: 45000, status: 'Active', hireDate: new Date('2020-01-15') },
    { name: 'Maricel Santos', employeeId: 'EMP-002', position: 'Inventory Controller', department: 'Operations', email: 'm.santos@wmspro.ph', contact: '0917-111-0002', salary: 35000, status: 'Active', hireDate: new Date('2020-03-01') },
    { name: 'Jose dela Cruz', employeeId: 'EMP-003', position: 'Sales Representative', department: 'Sales', email: 'j.delacruz@wmspro.ph', contact: '0917-111-0003', salary: 30000, status: 'Active', hireDate: new Date('2021-06-01') },
    { name: 'Ana Reyes', employeeId: 'EMP-004', position: 'Accounting Officer', department: 'Finance', email: 'a.reyes@wmspro.ph', contact: '0917-111-0004', salary: 40000, status: 'Active', hireDate: new Date('2021-01-10') },
    { name: 'Roberto Bautista', employeeId: 'EMP-005', position: 'Forklift Operator', department: 'Operations', email: 'r.bautista@wmspro.ph', contact: '0917-111-0005', salary: 25000, status: 'Active', hireDate: new Date('2022-02-14') },
    { name: 'Liza Fernandez', employeeId: 'EMP-006', position: 'HR Officer', department: 'Human Resources', email: 'l.fernandez@wmspro.ph', contact: '0917-111-0006', salary: 38000, status: 'Active', hireDate: new Date('2021-08-01') },
    { name: 'Mark Pascual', employeeId: 'EMP-007', position: 'IT Support', department: 'IT', email: 'm.pascual@wmspro.ph', contact: '0917-111-0007', salary: 42000, status: 'Active', hireDate: new Date('2022-05-15') },
  ]);
  console.log(`   ✓ ${customers.length} customers, ${suppliers.length} suppliers, ${employees.length} employees\n`);

  // ── 10. Services & Expenses ────────────────────────────────
  const services = await Service.insertMany([
    { name: 'Delivery & Logistics', description: 'Warehouse to customer delivery', price: 500, unit: units[0]._id, status: 'Active' },
    { name: 'Repacking Service', description: 'Product repacking and labeling', price: 150, unit: units[0]._id, status: 'Active' },
    { name: 'Cold Chain Handling', description: 'Temperature-controlled handling', price: 800, unit: units[0]._id, status: 'Active' },
    { name: 'Inventory Audit Service', description: 'Manual inventory count service', price: 5000, unit: units[6]._id, status: 'Active' },
    { name: 'Forklift Rental (hourly)', description: 'Forklift with operator', price: 750, unit: units[0]._id, status: 'Active' },
  ]);

  await Expense.insertMany([
    { name: 'Electricity Bill', amount: 85000, category: categories[7]._id, date: new Date('2024-03-01'), description: 'March electricity — Main Warehouse', status: 'Paid' },
    { name: 'Forklift Maintenance', amount: 15000, category: categories[7]._id, date: new Date('2024-03-05'), description: 'Quarterly preventive maintenance', status: 'Paid' },
    { name: 'Security Personnel', amount: 48000, category: categories[7]._id, date: new Date('2024-03-01'), description: 'March security services', status: 'Paid' },
    { name: 'Internet & Comms', amount: 5500, category: categories[7]._id, date: new Date('2024-03-01'), description: 'Fiber internet + CCTV system', status: 'Paid' },
    { name: 'Warehouse Supplies', amount: 12000, category: categories[7]._id, date: new Date('2024-03-10'), description: 'Pallets, stretch wrap, labels', status: 'Paid' },
  ]);
  console.log('   ✓ Services & Expenses\n');

  // ── 11. Inventory ─────────────────────────────────────────
  console.log('📦 Seeding Inventory (25 items)...');
  const inventoryData = [
    { productName: productNames[0]._id, brand: brands[0]._id, supplier: suppliers[0]._id, category: categories[1]._id, zone: zones[0]._id, bin: bins[0]._id, rack: racks[0]._id, location: locations[0]._id, warehouse: wh1._id, type: types[0]._id, unit: units[0]._id, quantity: 120, cost: 12500, srp: 18999, vatType: 'exclusive', lowStockThreshold: 10 },
    { productName: productNames[1]._id, brand: brands[1]._id, supplier: suppliers[1]._id, category: categories[1]._id, zone: zones[0]._id, bin: bins[0]._id, rack: racks[0]._id, location: locations[0]._id, warehouse: wh1._id, type: types[0]._id, unit: units[0]._id, quantity: 85, cost: 45000, srp: 65990, vatType: 'exclusive', lowStockThreshold: 10 },
    { productName: productNames[2]._id, brand: brands[2]._id, supplier: suppliers[2]._id, category: categories[0]._id, zone: zones[0]._id, bin: bins[1]._id, rack: racks[1]._id, location: locations[1]._id, warehouse: wh1._id, type: types[0]._id, unit: units[0]._id, quantity: 45, cost: 15000, srp: 22995, vatType: 'exclusive', lowStockThreshold: 5 },
    { productName: productNames[3]._id, brand: brands[0]._id, supplier: suppliers[0]._id, category: categories[0]._id, zone: zones[3]._id, bin: bins[5]._id, rack: racks[5]._id, location: locations[4]._id, warehouse: wh2._id, type: types[0]._id, unit: units[0]._id, quantity: 30, cost: 55000, srp: 84995, vatType: 'exclusive', lowStockThreshold: 5 },
    { productName: productNames[4]._id, brand: brands[3]._id, supplier: suppliers[0]._id, category: categories[2]._id, zone: zones[1]._id, bin: bins[2]._id, rack: racks[3]._id, location: locations[2]._id, warehouse: wh1._id, type: types[0]._id, unit: units[0]._id, quantity: 200, cost: 350, srp: 699, vatType: 'exclusive', lowStockThreshold: 20 },
    { productName: productNames[5]._id, brand: brands[4]._id, supplier: suppliers[0]._id, category: categories[2]._id, zone: zones[1]._id, bin: bins[2]._id, rack: racks[3]._id, location: locations[2]._id, warehouse: wh1._id, type: types[0]._id, unit: units[0]._id, quantity: 150, cost: 550, srp: 1199, vatType: 'exclusive', lowStockThreshold: 20 },
    { productName: productNames[6]._id, brand: brands[5]._id, supplier: suppliers[3]._id, category: categories[3]._id, zone: zones[2]._id, bin: bins[4]._id, rack: racks[4]._id, location: locations[3]._id, warehouse: wh1._id, type: types[1]._id, unit: units[1]._id, quantity: 500, cost: 420, srp: 650, vatType: 'inclusive', lowStockThreshold: 50, expirationDate: new Date('2025-12-31') },
    { productName: productNames[7]._id, brand: brands[6]._id, supplier: suppliers[4]._id, category: categories[3]._id, zone: zones[2]._id, bin: bins[4]._id, rack: racks[4]._id, location: locations[3]._id, warehouse: wh1._id, type: types[1]._id, unit: units[1]._id, quantity: 8, cost: 850, srp: 1200, vatType: 'inclusive', lowStockThreshold: 20, expirationDate: new Date('2024-12-31') },
    { productName: productNames[8]._id, brand: brands[7]._id, supplier: suppliers[5]._id, category: categories[4]._id, zone: zones[3]._id, bin: bins[5]._id, rack: racks[5]._id, location: locations[4]._id, warehouse: wh2._id, type: types[0]._id, unit: units[0]._id, quantity: 25, cost: 28000, srp: 42995, vatType: 'exclusive', lowStockThreshold: 5 },
    { productName: productNames[9]._id, brand: brands[7]._id, supplier: suppliers[5]._id, category: categories[4]._id, zone: zones[3]._id, bin: bins[5]._id, rack: racks[5]._id, location: locations[4]._id, warehouse: wh2._id, type: types[0]._id, unit: units[0]._id, quantity: 0, cost: 55000, srp: 89995, vatType: 'exclusive', lowStockThreshold: 3 },
    { productName: productNames[10]._id, brand: brands[8]._id, supplier: suppliers[0]._id, category: categories[5]._id, zone: zones[2]._id, bin: bins[4]._id, rack: racks[4]._id, location: locations[3]._id, warehouse: wh1._id, type: types[1]._id, unit: units[4]._id, quantity: 600, cost: 55, srp: 99, vatType: 'inclusive', lowStockThreshold: 50, expirationDate: new Date('2025-06-30') },
    { productName: productNames[11]._id, brand: brands[9]._id, supplier: suppliers[3]._id, category: categories[3]._id, zone: zones[2]._id, bin: bins[4]._id, rack: racks[4]._id, location: locations[3]._id, warehouse: wh1._id, type: types[1]._id, unit: units[1]._id, quantity: 300, cost: 150, srp: 250, vatType: 'inclusive', lowStockThreshold: 30, expirationDate: new Date('2025-09-30') },
    { productName: productNames[12]._id, brand: brands[0]._id, supplier: suppliers[0]._id, category: categories[0]._id, zone: zones[0]._id, bin: bins[1]._id, rack: racks[2]._id, location: locations[1]._id, warehouse: wh1._id, type: types[0]._id, unit: units[0]._id, quantity: 60, cost: 7500, srp: 11995, vatType: 'exclusive', lowStockThreshold: 10 },
    { productName: productNames[13]._id, brand: brands[1]._id, supplier: suppliers[1]._id, category: categories[6]._id, zone: zones[0]._id, bin: bins[1]._id, rack: racks[2]._id, location: locations[1]._id, warehouse: wh1._id, type: types[0]._id, unit: units[0]._id, quantity: 5, cost: 18000, srp: 27990, vatType: 'exclusive', lowStockThreshold: 5 },
    { productName: productNames[14]._id, category: categories[7]._id, zone: zones[2]._id, bin: bins[4]._id, rack: racks[4]._id, location: locations[3]._id, warehouse: wh1._id, type: types[1]._id, unit: units[1]._id, quantity: 80, cost: 120, srp: 250, vatType: 'exclusive', lowStockThreshold: 20 },
  ];

  const inventoryItems = await Promise.all(inventoryData.map(async (item) => {
    const qty = item.quantity;
    const totalCost = qty * item.cost;
    const totalSrp = qty * item.srp;
    const stockStatus = qty <= 0 ? 'out_of_stock' : qty <= (item.lowStockThreshold || 10) ? 'low_stock' : 'in_stock';
    return Inventory.create({ ...item, totalCost, totalSrp, stockStatus, dateReceived: new Date() });
  }));
  console.log(`   ✓ ${inventoryItems.length} inventory items\n`);

  // ── 12. Invoices ───────────────────────────────────────────
  console.log('🧾 Seeding Invoices...');
  const invoiceStatuses = ['paid', 'pending', 'open', 'due', 'paid', 'paid'];
  const invoices = [];

  for (let i = 0; i < 12; i++) {
    const customer = rand(customers);
    const employee = rand(employees);
    const branch = rand([br1, br2, br3]);
    const item1 = rand(inventoryItems);
    const item2 = rand(inventoryItems);
    const qty1 = randInt(1, 5);
    const qty2 = randInt(1, 3);
    const price1 = item1.srp;
    const price2 = item2.srp;
    const subtotal = (qty1 * price1) + (qty2 * price2);
    const vatAmount = subtotal * 0.12;
    const total = subtotal + vatAmount;
    const discount = randFloat(0, subtotal * 0.1);

    const inv = await Invoice.create({
      invoiceNo: genInvoiceNo('INV'),
      invoiceType: 'customer',
      customer: customer._id,
      employee: employee._id,
      storeBranch: branch._id,
      items: [
        { inventory: item1._id, quantity: qty1, price: price1, subtotal: qty1 * price1 },
        { inventory: item2._id, quantity: qty2, price: price2, subtotal: qty2 * price2 },
      ],
      subtotal,
      discount,
      discountType: 'fixed',
      vatAmount,
      vatType: 'exclusive',
      total: total - discount,
      paymentStatus: rand(invoiceStatuses),
      notes: rand(['Delivered to branch', 'Picked up by customer', 'Rush order', '']),
      createdBy: adminUser._id,
    });
    invoices.push(inv);
  }

  // Service invoices
  for (let i = 0; i < 4; i++) {
    const customer = rand(customers);
    const service = rand(services);
    const qty = randInt(1, 10);
    const subtotal = qty * service.price;
    const vatAmount = subtotal * 0.12;

    await Invoice.create({
      invoiceNo: genInvoiceNo('SVC'),
      invoiceType: 'service',
      customer: customer._id,
      employee: rand(employees)._id,
      storeBranch: rand([br1, br2, br3])._id,
      items: [{ service: service._id, quantity: qty, price: service.price, subtotal }],
      subtotal,
      vatAmount,
      vatType: 'exclusive',
      total: subtotal + vatAmount,
      paymentStatus: rand(['paid', 'pending', 'open']),
      createdBy: adminUser._id,
    });
  }
  console.log(`   ✓ ${invoices.length + 4} invoices (customer + service)\n`);

  // ── 13. Purchase Orders ────────────────────────────────────
  console.log('🛒 Seeding Purchase Orders...');
  const poStatuses = ['approved', 'approved', 'pending', 'rejected'];
  for (let i = 0; i < 6; i++) {
    const supplier = rand(suppliers);
    const item1 = rand(inventoryItems);
    const qty1 = randInt(10, 50);
    const price1 = item1.cost * 0.85;
    const subtotal = qty1 * price1;
    const vatAmount = subtotal * 0.12;
    const totalAmount = subtotal + vatAmount;
    const status = rand(poStatuses);

    await PurchaseOrder.create({
      invoiceNo: genInvoiceNo('PO'),
      supplier: supplier._id,
      warehouse: rand([wh1, wh2])._id,
      employee: rand(employees)._id,
      items: [{ product: item1._id, qty: qty1, price: price1, total: qty1 * price1 }],
      subtotal,
      vatAmount,
      vatType: 'exclusive',
      totalAmount,
      status,
      isApproved: status === 'approved',
      approvedBy: status === 'approved' ? adminUser._id : undefined,
      approvedAt: status === 'approved' ? new Date() : undefined,
      type: 'purchase',
      createdBy: adminUser._id,
    });
  }
  console.log('   ✓ 6 purchase orders\n');

  // ── 14. Calendar Events ────────────────────────────────────
  console.log('📅 Seeding Calendar Events...');
  const now = new Date();
  await CalendarEvent.insertMany([
    { title: 'Monthly Inventory Audit', description: 'Full warehouse physical count', startDate: new Date(now.getFullYear(), now.getMonth(), 15, 8, 0), endDate: new Date(now.getFullYear(), now.getMonth(), 15, 17, 0), color: '#1565c0' },
    { title: 'SM Hypermarket Delivery', description: '50 units Samsung A54 delivery', startDate: new Date(now.getFullYear(), now.getMonth(), 18, 9, 0), endDate: new Date(now.getFullYear(), now.getMonth(), 18, 12, 0), color: '#2e7d32' },
    { title: 'Supplier Meeting — Samsung', description: 'Q2 pricing negotiation', startDate: new Date(now.getFullYear(), now.getMonth(), 20, 14, 0), endDate: new Date(now.getFullYear(), now.getMonth(), 20, 16, 0), color: '#f57c00' },
    { title: 'Staff Training — WMS System', description: 'New features walkthrough for all staff', startDate: new Date(now.getFullYear(), now.getMonth(), 22, 9, 0), endDate: new Date(now.getFullYear(), now.getMonth(), 22, 12, 0), color: '#6a1b9a' },
    { title: 'Warehouse Safety Inspection', description: 'Annual DOLE safety inspection', startDate: new Date(now.getFullYear(), now.getMonth() + 1, 5, 10, 0), endDate: new Date(now.getFullYear(), now.getMonth() + 1, 5, 14, 0), color: '#c62828' },
    { title: 'Lazada 11.11 Sale Prep', description: 'Prepare and pack Lazada orders for 11.11', startDate: new Date(now.getFullYear(), now.getMonth() + 1, 10, 7, 0), endDate: new Date(now.getFullYear(), now.getMonth() + 1, 11, 20, 0), color: '#ad1457' },
  ]);
  console.log('   ✓ 6 calendar events\n');

  // ── Summary ────────────────────────────────────────────────
  console.log('='.repeat(60));
  console.log('✅  SEED COMPLETE — WMS Pro is ready!\n');
  console.log('🔐  Login Credentials:');
  console.log('    👑 Admin:   admin / admin123');
  console.log('    👔 Manager: manager / manager123');
  console.log('    👤 User:    demo_user / user123\n');
  console.log('🌐  Open: http://localhost:3000/login');
  console.log('='.repeat(60));

  await mongoose.disconnect();
}

main().catch((e) => { console.error('❌ Seed failed:', e); process.exit(1); });
