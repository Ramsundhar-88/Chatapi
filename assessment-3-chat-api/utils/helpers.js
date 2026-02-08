// Helper utility functions

/**
 * Sanitize user object for auth responses (minimal data - NO email, NO ID)
 * Used in login/register responses
 * @param {Object} user - Full user object
 * @returns {Object} - Minimal sanitized user object
 */
function sanitizeUserForAuth(user) {
  if (!user) return null;
  
  return {
    username: user.username,
    role: user.role,
    status: user.status,
    avatar: user.avatar
  };
}

/**
 * Sanitize user object for own profile view (includes more fields)
 * Used in GET /api/auth/profile - NEVER include email or ID
 * @param {Object} user - Full user object
 * @returns {Object} - Profile sanitized user object
 */
function sanitizeUserForProfile(user) {
  if (!user) return null;
  
  return {
    username: user.username,
    role: user.role,
    status: user.status,
    avatar: user.avatar,
    lastSeen: user.lastSeen,
    createdAt: user.createdAt
  };
}

/**
 * Sanitize user object for admin user list (minimal, NO email, NO ID)
 * @param {Object} user - Full user object
 * @returns {Object} - Admin list sanitized user object
 */
function sanitizeUserForAdminList(user) {
  if (!user) return null;
  
  return {
    username: user.username,
    role: user.role,
    status: user.status
  };
}

/**
 * Legacy sanitize user - kept for backward compatibility but now secure
 * @param {Object} user - Full user object
 * @param {boolean} includeEmail - IGNORED for security
 * @returns {Object} - Sanitized user object
 */
function sanitizeUser(user, includeEmail = false) {
  // SECURITY: Never include email regardless of parameter
  return sanitizeUserForAuth(user);
}

/**
 * Sanitize message object for response
 * @param {Object} message - Full message object
 * @param {boolean} isOwner - Whether requester owns the message
 * @returns {Object} - Sanitized message object
 */
function sanitizeMessage(message, isOwner = false) {
  if (!message) return null;

  const sanitized = {
    id: message.id,
    content: message.content,
    username: message.username,
    timestamp: message.timestamp,
    edited: message.edited
  };

  if (message.lastEditedAt) {
    sanitized.lastEditedAt = message.lastEditedAt;
  }

  // Only show edit history to message owner
  if (isOwner && message.editHistory && message.editHistory.length > 0) {
    sanitized.editHistory = message.editHistory;
  }

  return sanitized;
}

/**
 * Sanitize room object for response
 * @param {Object} room - Full room object
 * @param {boolean} isMember - Whether requester is a member
 * @returns {Object} - Sanitized room object
 */
function sanitizeRoom(room, isMember = false) {
  if (!room) return null;

  const sanitized = {
    id: room.id,
    name: room.name,
    type: room.type,
    memberCount: room.members ? room.members.length : 0,
    createdAt: room.createdAt
  };

  // Only show member list to room members
  if (isMember) {
    sanitized.members = room.members;
  }

  return sanitized;
}

/**
 * Create safe error response (no internal details)
 * @param {string} message - User-friendly error message
 * @param {number} statusCode - HTTP status code
 * @returns {Object} - Error response object
 */
function createErrorResponse(message, statusCode = 500) {
  return {
    error: message
  };
}

/**
 * Parse pagination parameters with safe defaults
 * @param {Object} query - Request query object
 * @param {Object} config - Pagination config
 * @returns {Object} - Parsed pagination parameters
 */
function parsePagination(query, config = { defaultLimit: 50, maxLimit: 100 }) {
  let limit = parseInt(query.limit) || config.defaultLimit;
  let offset = parseInt(query.offset) || 0;

  // Enforce limits
  if (limit > config.maxLimit) {
    limit = config.maxLimit;
  }
  if (limit < 1) {
    limit = 1;
  }
  if (offset < 0) {
    offset = 0;
  }

  return { limit, offset };
}

/**
 * Check if user has required role
 * @param {Object} user - User object with role
 * @param {string[]} allowedRoles - Array of allowed roles
 * @returns {boolean} - Whether user has required role
 */
function hasRole(user, allowedRoles) {
  if (!user || !user.role) return false;
  return allowedRoles.includes(user.role);
}

module.exports = {
  sanitizeUser,
  sanitizeUserForAuth,
  sanitizeUserForProfile,
  sanitizeUserForAdminList,
  sanitizeMessage,
  sanitizeRoom,
  createErrorResponse,
  parsePagination,
  hasRole
};
