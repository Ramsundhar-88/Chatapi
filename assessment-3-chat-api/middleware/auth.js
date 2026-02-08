// Authentication middleware
// Proper JWT verification with token blacklist checking

const jwt = require('jsonwebtoken');
const config = require('../config');
const sessions = require('../data/sessions');
const users = require('../data/users');

/**
 * Require authentication middleware
 * Verifies JWT token and attaches user to request
 */
function requireAuth(req, res, next) {
  try {
    const authHeader = req.get('authorization');
    
    if (!authHeader) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Invalid authorization format' });
    }

    const token = authHeader.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    // Verify token
    let decoded;
    try {
      decoded = jwt.verify(token, config.jwt.secret);
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({ error: 'Token expired' });
      }
      return res.status(401).json({ error: 'Invalid token' });
    }

    // Check if token is blacklisted (logged out)
    if (decoded.jti && sessions.isTokenBlacklisted(decoded.jti)) {
      return res.status(401).json({ error: 'Token has been revoked' });
    }

    // Check if session is still valid
    if (decoded.sessionId && !sessions.isValidSession(decoded.sessionId)) {
      return res.status(401).json({ error: 'Session expired' });
    }

    // Verify user still exists
    const user = users.findById(decoded.userId);
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    // Update session activity
    if (decoded.sessionId) {
      sessions.updateActivity(decoded.sessionId);
    }

    // Attach user info to request
    req.user = {
      userId: decoded.userId,
      username: decoded.username,
      role: decoded.role,
      sessionId: decoded.sessionId,
      jti: decoded.jti
    };

    next();
  } catch (error) {
    console.error('Auth middleware error:', error.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Optional authentication middleware
 * Attaches user to request if token is valid, but doesn't require it
 */
function optionalAuth(req, res, next) {
  try {
    const authHeader = req.get('authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      req.user = null;
      return next();
    }

    const token = authHeader.split(' ')[1];
    
    if (!token) {
      req.user = null;
      return next();
    }

    try {
      const decoded = jwt.verify(token, config.jwt.secret);
      
      // Check if token is blacklisted
      if (decoded.jti && sessions.isTokenBlacklisted(decoded.jti)) {
        req.user = null;
        return next();
      }

      // Check session validity
      if (decoded.sessionId && !sessions.isValidSession(decoded.sessionId)) {
        req.user = null;
        return next();
      }

      req.user = {
        userId: decoded.userId,
        username: decoded.username,
        role: decoded.role,
        sessionId: decoded.sessionId,
        jti: decoded.jti
      };
    } catch (error) {
      req.user = null;
    }

    next();
  } catch (error) {
    req.user = null;
    next();
  }
}

/**
 * Require specific role(s) middleware
 * Must be used after requireAuth
 * @param {string|string[]} roles - Required role(s)
 */
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    next();
  };
}

/**
 * Generate JWT token
 * @param {Object} user - User object
 * @param {string} sessionId - Session ID
 * @returns {Object} - { token, jti, expiresAt }
 */
function generateToken(user, sessionId) {
  const jti = require('uuid').v4();
  const expiresIn = config.jwt.expiresIn;
  
  // Calculate expiry time
  const expiresAt = new Date();
  const hours = parseInt(expiresIn) || 24;
  expiresAt.setHours(expiresAt.getHours() + hours);

  const token = jwt.sign(
    {
      userId: user.id,
      username: user.username,
      role: user.role,
      sessionId,
      jti
    },
    config.jwt.secret,
    { expiresIn }
  );

  return { token, jti, expiresAt };
}

/**
 * Verify token without middleware (for WebSocket auth)
 * @param {string} token
 * @returns {Object|null} - Decoded token or null
 */
function verifyToken(token) {
  try {
    const decoded = jwt.verify(token, config.jwt.secret);
    
    // Check blacklist
    if (decoded.jti && sessions.isTokenBlacklisted(decoded.jti)) {
      return null;
    }

    // Check session
    if (decoded.sessionId && !sessions.isValidSession(decoded.sessionId)) {
      return null;
    }

    return decoded;
  } catch (error) {
    return null;
  }
}

module.exports = {
  requireAuth,
  optionalAuth,
  requireRole,
  generateToken,
  verifyToken
};
