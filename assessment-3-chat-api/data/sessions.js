// Session management module
// Proper session storage with cleanup and token blacklisting

const config = require('../config');

// Active sessions storage
const activeSessions = new Map();

// Token blacklist for logout (stores token hashes/jti until expiry)
const tokenBlacklist = new Map();

// Cleanup interval reference
let cleanupInterval = null;

/**
 * Create a new session
 * @param {string} sessionId - Unique session ID
 * @param {string} userId - User ID
 * @param {string} tokenJti - JWT token ID for blacklisting
 * @returns {Object} - Session object
 */
function createSession(sessionId, userId, tokenJti) {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + config.session.maxAge);
  
  const session = {
    sessionId,
    userId,
    tokenJti,
    loginTime: now.toISOString(),
    lastActivity: now.toISOString(),
    expiresAt: expiresAt.toISOString()
  };

  activeSessions.set(sessionId, session);
  return session;
}

/**
 * Get session by ID
 * @param {string} sessionId
 * @returns {Object|null}
 */
function getSession(sessionId) {
  const session = activeSessions.get(sessionId);
  
  if (session) {
    // Check if session is expired
    if (new Date(session.expiresAt) < new Date()) {
      activeSessions.delete(sessionId);
      return null;
    }
  }
  
  return session || null;
}

/**
 * Update session activity
 * @param {string} sessionId
 */
function updateActivity(sessionId) {
  const session = activeSessions.get(sessionId);
  if (session) {
    session.lastActivity = new Date().toISOString();
  }
}

/**
 * Delete session
 * @param {string} sessionId
 * @returns {boolean}
 */
function deleteSession(sessionId) {
  return activeSessions.delete(sessionId);
}

/**
 * Delete all sessions for a user
 * @param {string} userId
 * @returns {number} - Number of sessions deleted
 */
function deleteUserSessions(userId) {
  let deleted = 0;
  for (const [sessionId, session] of activeSessions) {
    if (session.userId === userId) {
      activeSessions.delete(sessionId);
      deleted++;
    }
  }
  return deleted;
}

/**
 * Check if session exists and is valid
 * @param {string} sessionId
 * @returns {boolean}
 */
function isValidSession(sessionId) {
  return getSession(sessionId) !== null;
}

/**
 * Add token to blacklist (for logout)
 * @param {string} tokenJti - JWT token ID
 * @param {Date} expiresAt - When the token expires (to auto-cleanup)
 */
function blacklistToken(tokenJti, expiresAt) {
  tokenBlacklist.set(tokenJti, {
    blacklistedAt: new Date().toISOString(),
    expiresAt: expiresAt.toISOString()
  });
}

/**
 * Check if token is blacklisted
 * @param {string} tokenJti
 * @returns {boolean}
 */
function isTokenBlacklisted(tokenJti) {
  const entry = tokenBlacklist.get(tokenJti);
  
  if (entry) {
    // Clean up if expired
    if (new Date(entry.expiresAt) < new Date()) {
      tokenBlacklist.delete(tokenJti);
      return false;
    }
    return true;
  }
  
  return false;
}

/**
 * Clean up expired sessions and blacklisted tokens
 */
function cleanup() {
  const now = new Date();
  
  // Clean up expired sessions
  for (const [sessionId, session] of activeSessions) {
    if (new Date(session.expiresAt) < now) {
      activeSessions.delete(sessionId);
    }
  }

  // Clean up expired blacklisted tokens
  for (const [tokenJti, entry] of tokenBlacklist) {
    if (new Date(entry.expiresAt) < now) {
      tokenBlacklist.delete(tokenJti);
    }
  }
}

/**
 * Start automatic cleanup interval
 */
function startCleanup() {
  if (cleanupInterval) return;
  
  cleanupInterval = setInterval(cleanup, config.session.cleanupInterval);
  console.log('✅ Session cleanup started');
}

/**
 * Stop automatic cleanup
 */
function stopCleanup() {
  if (cleanupInterval) {
    clearInterval(cleanupInterval);
    cleanupInterval = null;
  }
}

/**
 * Get session count (for monitoring)
 * @returns {number}
 */
function getSessionCount() {
  return activeSessions.size;
}

/**
 * Get blacklist count (for monitoring)
 * @returns {number}
 */
function getBlacklistCount() {
  return tokenBlacklist.size;
}

module.exports = {
  createSession,
  getSession,
  updateActivity,
  deleteSession,
  deleteUserSessions,
  isValidSession,
  blacklistToken,
  isTokenBlacklisted,
  cleanup,
  startCleanup,
  stopCleanup,
  getSessionCount,
  getBlacklistCount
};
