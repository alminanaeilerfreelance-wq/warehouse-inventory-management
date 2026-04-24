require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');

const connectDB = require('./config/db');
const applySecurityMiddleware = require('./middleware/security');

const app = express();
const server = http.createServer(app);

// ─────────────────────────────────────────────────────────────
// 🔌 Socket.io Setup
// ─────────────────────────────────────────────────────────────
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || '*',
    methods: ['GET', 'POST'],
    credentials: true,
  },
  transports: ['websocket', 'polling'], // important for Render
});

// Make io accessible in routes
app.use((req, res, next) => {
  req.io = io;
  next();
});

// ─────────────────────────────────────────────────────────────
// 🔐 Security Middleware
// ─────────────────────────────────────────────────────────────
applySecurityMiddleware(app);

// ─────────────────────────────────────────────────────────────
// 🌐 CORS Setup
// ─────────────────────────────────────────────────────────────
app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  credentials: true,
}));

// ─────────────────────────────────────────────────────────────
// 📦 Body Parsers
// ─────────────────────────────────────────────────────────────
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// ─────────────────────────────────────────────────────────────
// 📁 Static Files
// ─────────────────────────────────────────────────────────────
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ─────────────────────────────────────────────────────────────
// 🚀 Routes
// ─────────────────────────────────────────────────────────────
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/brands', require('./routes/brands'));
app.use('/api/designs', require('./routes/designs'));
app.use('/api/customers', require('./routes/customers'));
app.use('/api/suppliers', require('./routes/suppliers'));
app.use('/api/employees', require('./routes/employees'));
app.use('/api/categories', require('./routes/categories'));
app.use('/api/products', require('./routes/products'));
app.use('/api/zones', require('./routes/zones'));
app.use('/api/bins', require('./routes/bins'));
app.use('/api/racks', require('./routes/racks'));
app.use('/api/locations', require('./routes/locations'));
app.use('/api/warehouses', require('./routes/warehouses'));
app.use('/api/store-branches', require('./routes/storeBranches'));
app.use('/api/calendar', require('./routes/calendar'));
app.use('/api/types', require('./routes/types'));
app.use('/api/units', require('./routes/units'));
app.use('/api/services', require('./routes/services'));
app.use('/api/expenses', require('./routes/expenses'));
app.use('/api/inventory', require('./routes/inventory'));
app.use('/api/adjustments', require('./routes/adjustments'));
app.use('/api/invoices', require('./routes/invoices'));
app.use('/api/purchase-orders', require('./routes/purchaseOrders'));
app.use('/api/transfers', require('./routes/transfers'));
app.use('/api/payments', require('./routes/payments'));
app.use('/api/reports', require('./routes/reports'));
app.use('/api/settings', require('./routes/settings'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/notify', require('./routes/notifications-email'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/audit-logs', require('./routes/auditLogs'));
app.use('/api/security-alerts', require('./routes/securityAlerts'));

// ─────────────────────────────────────────────────────────────
// 🏠 Health Check Route (IMPORTANT for Render)
// ─────────────────────────────────────────────────────────────
app.get('/', (req, res) => {
  res.status(200).json({
    status: 'OK',
    message: 'WMS API running',
    uptime: process.uptime(),
    timestamp: new Date(),
  });
});

// ─────────────────────────────────────────────────────────────
// ❌ 404 Handler
// ─────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

// ─────────────────────────────────────────────────────────────
// ⚠️ Global Error Handler
// ─────────────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('[Error]', err.stack);
  res.status(err.status || 500).json({
    message: err.message || 'Internal Server Error',
  });
});

// ─────────────────────────────────────────────────────────────
// 🔌 Socket Events
// ─────────────────────────────────────────────────────────────
io.on('connection', (socket) => {
  console.log(`[Socket] Connected: ${socket.id}`);

  socket.on('join', (userId) => {
    socket.join(`user_${userId}`);
  });

  socket.on('join_admin', () => {
    socket.join('admin_room');
  });

  socket.on('disconnect', () => {
    console.log(`[Socket] Disconnected: ${socket.id}`);
  });
});

// Make io globally accessible
app.set('io', io);

// ─────────────────────────────────────────────────────────────
// 🚀 Start Server (FIXED for Render)
// ─────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    await connectDB();
    console.log('✅ MongoDB connected');

    server.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });

  } catch (error) {
    console.error('❌ Startup error:', error);
    process.exit(1);
  }
};

startServer();

// ─────────────────────────────────────────────────────────────
// 🛑 Crash Handlers (IMPORTANT)
// ─────────────────────────────────────────────────────────────
process.on('uncaughtException', (err) => {
  console.error('🔥 Uncaught Exception:', err);
});

process.on('unhandledRejection', (err) => {
  console.error('🔥 Unhandled Rejection:', err);
});

module.exports = { app, io };