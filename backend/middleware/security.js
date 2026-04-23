const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');

module.exports = function applySecurityMiddleware(app) {
  // 1. Helmet — sets 15+ HTTP security headers
  app.use(helmet({
    contentSecurityPolicy: false, // disabled so frontend can load
    crossOriginEmbedderPolicy: false,
  }));

  // 2. Global rate limiter — 300 req/15min per IP (DDoS protection)
  app.use(rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 300,
    message: { message: 'Too many requests from this IP, please try again later.' },
    standardHeaders: true,
    legacyHeaders: false,
  }));

  // 3. Auth rate limiter — 20 attempts/15min per IP (safety net; real 5-attempt lockout is in login route)
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    message: { message: 'Too many login attempts. Please try again in 15 minutes.' },
    skipSuccessfulRequests: true,
  });
  app.use('/api/auth/login', authLimiter);
  app.use('/api/auth/register', authLimiter);

  // 4. NoSQL injection prevention — sanitizes req.body, req.query, req.params
  app.use(mongoSanitize({
    replaceWith: '_',
    onSanitize: ({ req, key }) => {
      console.warn(`[SECURITY] NoSQL injection attempt blocked on key: ${key} — IP: ${req.ip}`);
    },
  }));

  // 5. XSS prevention — sanitizes user input to remove malicious HTML
  app.use(xss());

  // 6. HTTP Parameter Pollution prevention
  app.use(hpp({
    whitelist: ['sort', 'fields', 'page', 'limit', 'search', 'status', 'type'],
  }));
};
