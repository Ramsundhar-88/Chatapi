// Rate limiting middleware
// Prevent brute force attacks and spam

const config = require('../config');

// Store for rate limiting (in-memory)
const rateLimitStore = new Map();

/**
 * Create rate limiter with custom options
 * @param {Object} options - { windowMs, max, message }
 * @returns {Function} - Express middleware
 */
function createRateLimiter(options = {}) {
  const {
    windowMs = 60000,
    max = 100,
    message = 'Too many requests, please try again later',
    keyGenerator = (req) => req.ip || req.connection.remoteAddress || 'unknown'
  } = options;

  return (req, res, next) => {
    // Skip rate limiting in test environment
    if (process.env.NODE_ENV === 'test') {
      return next();
    }
    const key = `${keyGenerator(req)}:${req.path}`;
    const now = Date.now();

    // Clean up old entries
    for (const [storedKey, data] of rateLimitStore) {
      if (now - data.startTime > windowMs) {
        rateLimitStore.delete(storedKey);
      }
    }

    // Get or create rate limit data for this key
    let limitData = rateLimitStore.get(key);
    
    if (!limitData || now - limitData.startTime > windowMs) {
      limitData = {
        count: 0,
        startTime: now
      };
      rateLimitStore.set(key, limitData);
    }

    limitData.count++;

    // Set rate limit headers
    const remaining = Math.max(0, max - limitData.count);
    const resetTime = new Date(limitData.startTime + windowMs);
    
    res.set({
      'X-RateLimit-Limit': max.toString(),
      'X-RateLimit-Remaining': remaining.toString(),
      'X-RateLimit-Reset': resetTime.toISOString()
    });

    // Check if limit exceeded
    if (limitData.count > max) {
      return res.status(429).json({ 
        error: message,
        retryAfter: Math.ceil((limitData.startTime + windowMs - now) / 1000)
      });
    }

    next();
  };
}

// Pre-configured rate limiters
const loginLimiter = createRateLimiter({
  windowMs: config.rateLimit.login.windowMs,
  max: config.rateLimit.login.max,
  message: 'Too many login attempts, please try again later'
});

const messageLimiter = createRateLimiter({
  windowMs: config.rateLimit.message.windowMs,
  max: config.rateLimit.message.max,
  message: 'Too many messages, please slow down'
});

const generalLimiter = createRateLimiter({
  windowMs: config.rateLimit.general.windowMs,
  max: config.rateLimit.general.max,
  message: 'Too many requests, please try again later'
});

// User-based rate limiter (uses user ID instead of IP)
function userRateLimiter(options = {}) {
  const limiter = createRateLimiter({
    ...options,
    keyGenerator: (req) => {
      if (req.user && req.user.userId) {
        return `user:${req.user.userId}`;
      }
      return req.ip || req.connection.remoteAddress || 'unknown';
    }
  });
  
  return limiter;
}

module.exports = {
  createRateLimiter,
  loginLimiter,
  messageLimiter,
  generalLimiter,
  userRateLimiter
};
