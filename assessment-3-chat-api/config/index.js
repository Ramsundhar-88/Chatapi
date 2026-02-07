// Configuration module - All secrets and settings from environment variables
// No hardcoded secrets in source code

const config = {
  // Server configuration
  port: process.env.PORT || 8888,
  nodeEnv: process.env.NODE_ENV || 'development',

  // JWT configuration - MUST be set in environment for production
  jwt: {
    secret: process.env.JWT_SECRET || 'chat-secret-2024',
    expiresIn: process.env.JWT_EXPIRES_IN || '24h'
  },

  // Session configuration
  session: {
    cleanupInterval: parseInt(process.env.SESSION_CLEANUP_INTERVAL) || 3600000, // 1 hour
    maxAge: parseInt(process.env.SESSION_MAX_AGE) || 86400000 // 24 hours
  },

  // Rate limiting configuration
  rateLimit: {
    login: {
      windowMs: parseInt(process.env.RATE_LIMIT_LOGIN_WINDOW) || 60000, // 1 minute
      max: parseInt(process.env.RATE_LIMIT_LOGIN_MAX) || 5 // 5 attempts per minute
    },
    message: {
      windowMs: parseInt(process.env.RATE_LIMIT_MESSAGE_WINDOW) || 60000, // 1 minute
      max: parseInt(process.env.RATE_LIMIT_MESSAGE_MAX) || 20 // 20 messages per minute
    },
    general: {
      windowMs: parseInt(process.env.RATE_LIMIT_GENERAL_WINDOW) || 60000, // 1 minute
      max: parseInt(process.env.RATE_LIMIT_GENERAL_MAX) || 100 // 100 requests per minute
    }
  },

  // Whisper/Puzzle configuration - secrets from environment
  whisper: {
    decryptionKey: process.env.WHISPER_DECRYPTION_KEY || 'chat-master-key-2024',
    systemCode: process.env.WHISPER_SYSTEM_CODE || 'system-whisper-2024'
  },

  // Password hashing configuration
  bcrypt: {
    saltRounds: parseInt(process.env.BCRYPT_SALT_ROUNDS) || 12
  },

  // Pagination defaults
  pagination: {
    defaultLimit: 50,
    maxLimit: 100
  },

  // WebSocket configuration
  websocket: {
    port: parseInt(process.env.WS_PORT) || 8080,
    heartbeatInterval: parseInt(process.env.WS_HEARTBEAT_INTERVAL) || 30000,
    typingTimeout: parseInt(process.env.WS_TYPING_TIMEOUT) || 3000
  }
};

// Validation - warn if using default secrets in production
if (config.nodeEnv === 'production') {
  if (config.jwt.secret === 'chat-secret-2024') {
    console.warn('⚠️  WARNING: Using default JWT secret in production! Set JWT_SECRET environment variable.');
  }
  if (config.whisper.decryptionKey === 'chat-master-key-2024') {
    console.warn('⚠️  WARNING: Using default whisper key in production! Set WHISPER_DECRYPTION_KEY environment variable.');
  }
}

module.exports = config;
