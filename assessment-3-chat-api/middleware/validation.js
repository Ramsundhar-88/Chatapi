// Input validation middleware
// Comprehensive validation for all inputs

const validator = require('validator');

/**
 * Validate login request
 */
function validateLogin(req, res, next) {
  const { username, email, password } = req.body;

  // Must have password
  if (!password || typeof password !== 'string') {
    return res.status(400).json({ error: 'Password is required' });
  }

  // Must have either username or email
  if (!username && !email) {
    return res.status(400).json({ error: 'Username or email is required' });
  }

  // Validate username format if provided
  if (username && typeof username !== 'string') {
    return res.status(400).json({ error: 'Invalid username format' });
  }

  // Validate email format if provided
  if (email && !validator.isEmail(email)) {
    return res.status(400).json({ error: 'Invalid email format' });
  }

  // Sanitize inputs
  if (username) {
    req.body.username = validator.trim(username);
  }
  if (email) {
    req.body.email = validator.normalizeEmail(email);
  }

  next();
}

/**
 * Validate registration request
 */
function validateRegister(req, res, next) {
  const { username, email, password } = req.body;

  // All fields required
  if (!username || !email || !password) {
    return res.status(400).json({ error: 'Username, email, and password are required' });
  }

  // Validate username
  if (typeof username !== 'string') {
    return res.status(400).json({ error: 'Invalid username format' });
  }

  const trimmedUsername = validator.trim(username);
  
  if (trimmedUsername.length < 3 || trimmedUsername.length > 30) {
    return res.status(400).json({ error: 'Username must be between 3 and 30 characters' });
  }

  if (!validator.isAlphanumeric(trimmedUsername, 'en-US', { ignore: '_-' })) {
    return res.status(400).json({ error: 'Username can only contain letters, numbers, underscores, and hyphens' });
  }

  // Validate email
  if (!validator.isEmail(email)) {
    return res.status(400).json({ error: 'Invalid email format' });
  }

  // Validate password
  if (typeof password !== 'string') {
    return res.status(400).json({ error: 'Invalid password format' });
  }

  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }

  if (password.length > 128) {
    return res.status(400).json({ error: 'Password is too long' });
  }

  // Sanitize inputs
  req.body.username = trimmedUsername;
  req.body.email = validator.normalizeEmail(email);

  next();
}

/**
 * Validate message content
 */
function validateMessage(req, res, next) {
  const { content } = req.body;

  if (!content) {
    return res.status(400).json({ error: 'Message content is required' });
  }

  if (typeof content !== 'string') {
    return res.status(400).json({ error: 'Invalid message format' });
  }

  const trimmedContent = validator.trim(content);

  if (trimmedContent === '') {
    return res.status(400).json({ error: 'Message content cannot be empty' });
  }

  if (trimmedContent.length > 5000) {
    return res.status(400).json({ error: 'Message is too long (max 5000 characters)' });
  }

  // Sanitize - escape HTML to prevent XSS
  req.body.content = validator.escape(trimmedContent);

  next();
}

/**
 * Validate status update
 */
function validateStatus(req, res, next) {
  const { status } = req.body;

  if (!status) {
    return res.status(400).json({ error: 'Status is required' });
  }

  const validStatuses = ['online', 'offline', 'away', 'busy'];
  
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: 'Invalid status. Must be: online, offline, away, or busy' });
  }

  next();
}

/**
 * Validate whisper message
 */
function validateWhisper(req, res, next) {
  const { content, recipient } = req.body;

  if (!content || !recipient) {
    return res.status(400).json({ error: 'Content and recipient are required' });
  }

  if (typeof content !== 'string' || typeof recipient !== 'string') {
    return res.status(400).json({ error: 'Invalid format' });
  }

  const trimmedContent = validator.trim(content);
  const trimmedRecipient = validator.trim(recipient);

  if (trimmedContent === '') {
    return res.status(400).json({ error: 'Content cannot be empty' });
  }

  if (trimmedRecipient === '') {
    return res.status(400).json({ error: 'Recipient cannot be empty' });
  }

  req.body.content = trimmedContent;
  req.body.recipient = trimmedRecipient;

  next();
}

/**
 * Validate room ID parameter
 */
function validateRoomId(req, res, next) {
  const { roomId } = req.params;

  if (!roomId) {
    return res.status(400).json({ error: 'Room ID is required' });
  }

  if (typeof roomId !== 'string' || roomId.length > 50) {
    return res.status(400).json({ error: 'Invalid room ID' });
  }

  // Sanitize
  req.params.roomId = validator.trim(roomId);

  next();
}

/**
 * Validate message ID parameter
 */
function validateMessageId(req, res, next) {
  const { messageId } = req.params;

  if (!messageId) {
    return res.status(400).json({ error: 'Message ID is required' });
  }

  if (typeof messageId !== 'string' || messageId.length > 50) {
    return res.status(400).json({ error: 'Invalid message ID' });
  }

  // Sanitize
  req.params.messageId = validator.trim(messageId);

  next();
}

/**
 * Sanitize query parameters for pagination
 */
function sanitizePagination(req, res, next) {
  if (req.query.limit) {
    const limit = parseInt(req.query.limit);
    req.query.limit = isNaN(limit) ? undefined : limit;
  }
  
  if (req.query.offset) {
    const offset = parseInt(req.query.offset);
    req.query.offset = isNaN(offset) ? undefined : offset;
  }

  next();
}

module.exports = {
  validateLogin,
  validateRegister,
  validateMessage,
  validateStatus,
  validateWhisper,
  validateRoomId,
  validateMessageId,
  sanitizePagination
};
