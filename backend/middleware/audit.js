const AuditLog = require('../models/AuditLog');

module.exports = function auditLog(action, module, getDescription) {
  return async (req, res, next) => {
    // Capture original json method to intercept response
    const originalJson = res.json.bind(res);
    let responseData = null;
    res.json = (data) => {
      responseData = data;
      return originalJson(data);
    };

    res.on('finish', async () => {
      try {
        const status = res.statusCode < 400 ? 'success' : 'failed';
        await AuditLog.create({
          user: req.user?._id,
          username: req.user?.username,
          action,
          module,
          recordId: req.params?.id || responseData?._id,
          description: typeof getDescription === 'function'
            ? getDescription(req, responseData)
            : getDescription,
          after: status === 'success' ? responseData : undefined,
          ip: req.ip || req.connection?.remoteAddress,
          userAgent: req.headers['user-agent'],
          status,
        });
      } catch (e) {
        // Never let audit logging crash the app
        console.error('[AuditLog] Failed to write:', e.message);
      }
    });

    next();
  };
};
