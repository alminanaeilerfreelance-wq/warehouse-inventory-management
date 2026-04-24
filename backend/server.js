require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
const connectDB = require('./config/db');
const applySecurityMiddleware = require('./middleware/security');

connectDB();

const app = express();
const server = http.createServer(app);

// Socket.io setup
const io = new Server(server, {
  cors: { origin: process.env.FRONTEND_URL || 'http://localhost:3000', methods: ['GET','POST'] },
});

// Make io accessible in routes via req.io
app.use((req, res, next) => { req.io = io; next(); });

// Security middleware (helmet, rate limit, mongo-sanitize, xss, hpp)
applySecurityMiddleware(app);

// CORS — allow frontend origin
app.use(cors({
  origin: [process.env.FRONTEND_URL || 'http://localhost:3000', 'http://localhost:3000'],
  credentials: true,
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ── Routes ──────────────────────────────────────────────────────────────
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

app.get('/', (req, res) => res.json({ message: 'WMS API running', secure: true }));

// 404 handler
app.use((req, res) => res.status(404).json({ message: 'Route not found' }));

// Global error handler
app.use((err, req, res, next) => {
  console.error('[Error]', err.stack);
  res.status(err.status || 500).json({ message: err.message || 'Internal Server Error' });
});

// Socket.io connection handling
io.on('connection', (socket) => {
  if (process.env.NODE_ENV !== 'production') {
    console.log(`[Socket] Client connected: ${socket.id}`);
  }

  socket.on('join', (userId) => {
    socket.join(`user_${userId}`);
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[Socket] User ${userId} joined their room`);
    }
  });

  socket.on('join_admin', () => {
    socket.join('admin_room');
  });

  socket.on('disconnect', () => {
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[Socket] Client disconnected: ${socket.id}`);
    }
  });
});

// Export io for use in routes
app.set('io', io);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Secure WMS API running on port ${PORT}`));

module.exports = { app, io };
