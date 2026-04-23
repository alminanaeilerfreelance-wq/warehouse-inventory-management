const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const User = require('../models/User');
const SecurityAlert = require('../models/SecurityAlert');
const AuditLog = require('../models/AuditLog');
const { protect } = require('../middleware/auth');
const { sendEmail } = require('../utils/email');

const router = express.Router();
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const MAX_ATTEMPTS = 5;
const LOCK_MINUTES = 15;

const signToken = (user) =>
  jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, {
    expiresIn: '7d',
  });

const sanitizeUser = (user) => ({
  _id: user._id,
  customerName: user.customerName,
  email: user.email,
  contact: user.contact,
  address: user.address,
  username: user.username,
  image: user.image,
  role: user.role,
  isActive: user.isActive,
  lastLoginAt: user.lastLoginAt,
  isSuspicious: user.isSuspicious,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
  permissions: user.permissions,
});

// Helper — record a security alert
async function recordAlert(ip, username, action, userAgent, req) {
  try {
    // Upsert: increment attempts for same IP + action in last hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    await SecurityAlert.findOneAndUpdate(
      { ip, action, resolved: false, createdAt: { $gte: oneHourAgo } },
      { $inc: { attempts: 1 }, username, userAgent },
      { upsert: true, new: true }
    );

    // Emit real-time alert to admin room
    if (req && req.io) {
      req.io.to('admin_room').emit('security_alert', { ip, username, action, time: new Date() });
    }
  } catch (e) {
    console.error('[SecurityAlert] Failed to record:', e.message);
  }
}

// Helper — check if IP is suspicious (> 10 failed attempts in last hour)
async function isIpSuspicious(ip) {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const doc = await SecurityAlert.findOne({ ip, createdAt: { $gte: oneHourAgo }, resolved: false });
  return doc && doc.attempts >= 10;
}

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { customerName, email, contact, address, username, password, image } = req.body;
    if (!username || !email || !password)
      return res.status(400).json({ message: 'Username, email, and password are required' });
    if (password.length < 6)
      return res.status(400).json({ message: 'Password must be at least 6 characters' });

    const existing = await User.findOne({ $or: [{ email: email.toLowerCase() }, { username }] });
    if (existing) {
      const field = existing.email === email.toLowerCase() ? 'Email' : 'Username';
      return res.status(409).json({ message: `${field} is already taken` });
    }

    const hash = await bcrypt.hash(password, 12);
    const user = await User.create({ customerName, email, contact, address, username, password: hash, image });
    const token = signToken(user);

    await AuditLog.create({
      user: user._id, username: user.username, action: 'CREATE', module: 'Auth',
      description: `New user registered: ${username}`, ip: req.ip, userAgent: req.headers['user-agent'], status: 'success',
    });

    return res.status(201).json({ token, user: sanitizeUser(user) });
  } catch (err) {
    console.error('Register error:', err);
    return res.status(500).json({ message: 'Server error during registration' });
  }
});

// POST /api/auth/login  — with 5-attempt lockout + intruder detection
router.post('/login', async (req, res) => {
  const ip = req.ip || req.connection?.remoteAddress || 'unknown';
  const userAgent = req.headers['user-agent'] || '';
  const { username, email, password } = req.body;
  const identifier = username || email;

  try {
    if (!identifier || !password)
      return res.status(400).json({ message: 'Username/email and password are required' });

    // Check if this IP is already flagged as suspicious
    const suspicious = await isIpSuspicious(ip);
    if (suspicious) {
      await recordAlert(ip, identifier, 'suspicious_activity', userAgent, req);
      return res.status(429).json({
        message: 'Too many failed attempts from your IP. Please wait 1 hour or contact an administrator.',
        suspicious: true,
      });
    }

    // Find user
    const query = username ? { username } : { email: email.toLowerCase() };
    const user = await User.findOne(query);

    if (!user) {
      // User not found — still track attempt
      await recordAlert(ip, identifier, 'login_failed', userAgent, req);
      await AuditLog.create({
        username: identifier, action: 'LOGIN_FAILED', module: 'Auth',
        description: `Failed login — user not found: ${identifier}`, ip, userAgent, status: 'failed',
      });
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Check if account is locked
    if (user.lockUntil && user.lockUntil > Date.now()) {
      const minutesLeft = Math.ceil((user.lockUntil - Date.now()) / 60000);
      await recordAlert(ip, user.username, 'account_locked', userAgent, req);
      return res.status(423).json({
        message: `Account is locked due to too many failed attempts. Try again in ${minutesLeft} minute${minutesLeft > 1 ? 's' : ''}.`,
        locked: true,
        minutesLeft,
        unlockAt: user.lockUntil,
      });
    }

    if (!user.isActive)
      return res.status(401).json({ message: 'Account is deactivated. Contact an administrator.' });

    // Check password
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      // Wrong password — increment attempts
      await user.incFailedAttempts();
      const attemptsLeft = Math.max(0, MAX_ATTEMPTS - user.failedLoginAttempts);
      await recordAlert(ip, user.username, 'login_failed', userAgent, req);
      await AuditLog.create({
        user: user._id, username: user.username, action: 'LOGIN_FAILED', module: 'Auth',
        description: `Wrong password attempt ${user.failedLoginAttempts}/${MAX_ATTEMPTS} from IP: ${ip}`,
        ip, userAgent, status: 'failed',
      });

      // Just got locked now?
      if (user.lockUntil && user.lockUntil > Date.now()) {
        // Send admin email alert
        sendEmail({
          to: process.env.ALERT_EMAIL || process.env.EMAIL_USER,
          subject: `WMS Security Alert - Account Locked: ${user.username}`,
          html: `<h2>Account Locked</h2>
          <p>User <strong>${user.username}</strong> has been locked for ${LOCK_MINUTES} minutes after ${MAX_ATTEMPTS} failed login attempts.</p>
          <p><strong>IP:</strong> ${ip}<br><strong>Time:</strong> ${new Date().toISOString()}<br><strong>User Agent:</strong> ${userAgent}</p>`,
        });
        if (req.io) req.io.to('admin_room').emit('account_locked', { username: user.username, ip, time: new Date() });

        return res.status(423).json({
          message: `Account locked for ${LOCK_MINUTES} minutes after ${MAX_ATTEMPTS} failed attempts. An admin has been notified.`,
          locked: true,
          minutesLeft: LOCK_MINUTES,
        });
      }

      return res.status(401).json({
        message: `Invalid credentials. ${attemptsLeft > 0 ? `${attemptsLeft} attempt${attemptsLeft !== 1 ? 's' : ''} remaining before lockout.` : 'Account will be locked on next attempt.'}`,
        attemptsLeft,
        failedAttempts: user.failedLoginAttempts,
      });
    }

    // SUCCESS — reset failed attempts, log in
    await user.resetFailedAttempts(ip);
    const token = signToken(user);

    await AuditLog.create({
      user: user._id, username: user.username, action: 'LOGIN', module: 'Auth',
      description: `Successful login from IP: ${ip}`, ip, userAgent, status: 'success',
    });

    // Emit to admin room if user was previously suspicious
    if (user.isSuspicious && req.io) {
      req.io.to('admin_room').emit('suspicious_user_login', { username: user.username, ip });
    }

    return res.status(200).json({ token, user: sanitizeUser(user) });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ message: 'Server error during login' });
  }
});

// GET /api/auth/me
router.get('/me', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });
    return res.status(200).json({ user: sanitizeUser(user) });
  } catch (err) {
    return res.status(500).json({ message: 'Server error' });
  }
});

// PUT /api/auth/change-password
router.put('/change-password', protect, async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    if (!oldPassword || !newPassword)
      return res.status(400).json({ message: 'Both old and new passwords are required' });
    if (newPassword.length < 6)
      return res.status(400).json({ message: 'New password must be at least 6 characters' });

    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch) return res.status(401).json({ message: 'Current password is incorrect' });

    user.password = await bcrypt.hash(newPassword, 12);
    await user.save();

    await AuditLog.create({
      user: user._id, username: user.username, action: 'UPDATE', module: 'Auth',
      description: 'User changed their password', ip: req.ip, status: 'success',
    });

    return res.status(200).json({ message: 'Password changed successfully' });
  } catch (err) {
    return res.status(500).json({ message: 'Server error' });
  }
});

// PUT /api/auth/profile
router.put('/profile', protect, async (req, res) => {
  try {
    const { customerName, email, contact, address, image } = req.body;
    const updates = {};
    if (customerName !== undefined) updates.customerName = customerName;
    if (email !== undefined) {
      const existing = await User.findOne({ email: email.toLowerCase(), _id: { $ne: req.user._id } });
      if (existing) return res.status(409).json({ message: 'Email already in use' });
      updates.email = email.toLowerCase();
    }
    if (contact !== undefined) updates.contact = contact;
    if (address !== undefined) updates.address = address;
    if (image !== undefined) updates.image = image;

    const user = await User.findByIdAndUpdate(req.user._id, updates, { new: true }).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });
    return res.status(200).json({ user: sanitizeUser(user) });
  } catch (err) {
    return res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/auth/google
router.post('/google', async (req, res) => {
  try {
    const { credential } = req.body;
    if (!credential) return res.status(400).json({ message: 'Google credential required' });

    const ticket = await googleClient.verifyIdToken({ idToken: credential, audience: process.env.GOOGLE_CLIENT_ID });
    const { email, name, picture, sub: googleId } = ticket.getPayload();

    let user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      const hash = await bcrypt.hash(Math.random().toString(36), 12);
      user = await User.create({
        username: email.split('@')[0] + '_' + googleId.slice(-4),
        email: email.toLowerCase(), password: hash,
        customerName: name, image: picture, role: 'user', isActive: true, googleId,
      });
    } else if (!user.googleId) {
      user.googleId = googleId;
      if (!user.image) user.image = picture;
      await user.save();
    }

    if (!user.isActive) return res.status(401).json({ message: 'Account is deactivated' });

    await user.resetFailedAttempts(req.ip);
    const token = signToken(user);
    return res.status(200).json({ token, user: sanitizeUser(user) });
  } catch (err) {
    console.error('Google auth error:', err);
    return res.status(401).json({ message: 'Invalid Google credential' });
  }
});

// POST /api/auth/admin-verify
router.post('/admin-verify', protect, async (req, res) => {
  try {
    const { password } = req.body;
    if (!password) return res.status(400).json({ message: 'Password is required' });

    const user = await User.findById(req.user._id);
    if (!user || user.role !== 'admin')
      return res.status(403).json({ message: 'Admin access required' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ message: 'Incorrect admin password' });

    return res.status(200).json({ message: 'Verified' });
  } catch (err) {
    return res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
