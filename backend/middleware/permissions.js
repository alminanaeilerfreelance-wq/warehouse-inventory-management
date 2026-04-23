/**
 * Permission middleware factory.
 * Usage: router.post('/', protect, requirePermission('inventory', 'create'), handler)
 * Admins always pass. Users must have the specific flag set to true.
 */
const requirePermission = (module, action) => (req, res, next) => {
  // Admins bypass all permission checks
  if (req.user && req.user.role === 'admin') return next();

  const perms = req.user?.permissions;
  if (!perms || !perms[module] || !perms[module][action]) {
    return res.status(403).json({
      message: `Access denied. You do not have ${action} permission for ${module}.`,
    });
  }
  next();
};

module.exports = { requirePermission };
