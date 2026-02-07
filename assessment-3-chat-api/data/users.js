// User data storage module
// In-memory storage with bcrypt password hashing

const bcrypt = require('bcrypt');
const config = require('../config');

// Initial users with hashed passwords (will be hashed on first load)
let users = [];
let initialized = false;

// Initial user data (passwords will be hashed)
const initialUsers = [
  {
    id: 'user1',
    username: 'alice',
    email: 'alice@chat.com',
    plainPassword: 'password123',
    status: 'online',
    lastSeen: new Date().toISOString(),
    role: 'admin',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=alice'
  },
  {
    id: 'user2', 
    username: 'bob',
    email: 'bob@chat.com',
    plainPassword: 'bobsecret',
    status: 'offline',
    lastSeen: new Date(Date.now() - 3600000).toISOString(),
    role: 'user',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=bob'
  },
  {
    id: 'user3',
    username: 'charlie',
    email: 'charlie@chat.com',
    plainPassword: 'charlie2024',
    status: 'online',
    lastSeen: new Date().toISOString(),
    role: 'moderator',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=charlie'
  }
];

/**
 * Initialize users with hashed passwords
 */
async function initializeUsers() {
  if (initialized) return;

  for (const userData of initialUsers) {
    const passwordHash = await bcrypt.hash(userData.plainPassword, config.bcrypt.saltRounds);
    users.push({
      id: userData.id,
      username: userData.username,
      email: userData.email,
      passwordHash: passwordHash,
      status: userData.status,
      lastSeen: userData.lastSeen,
      role: userData.role,
      avatar: userData.avatar,
      createdAt: new Date().toISOString()
    });
  }

  initialized = true;
  console.log('✅ Users initialized with hashed passwords');
}

/**
 * Find user by username
 * @param {string} username
 * @returns {Object|null}
 */
function findByUsername(username) {
  return users.find(u => u.username === username) || null;
}

/**
 * Find user by email
 * @param {string} email
 * @returns {Object|null}
 */
function findByEmail(email) {
  return users.find(u => u.email === email) || null;
}

/**
 * Find user by ID
 * @param {string} id
 * @returns {Object|null}
 */
function findById(id) {
  return users.find(u => u.id === id) || null;
}

/**
 * Check if username or email exists
 * @param {string} username
 * @param {string} email
 * @returns {Object|null} - Returns existing user if found
 */
function findExisting(username, email) {
  return users.find(u => u.username === username || u.email === email) || null;
}

/**
 * Verify password against stored hash
 * @param {string} password - Plain text password
 * @param {string} passwordHash - Stored hash
 * @returns {Promise<boolean>}
 */
async function verifyPassword(password, passwordHash) {
  return bcrypt.compare(password, passwordHash);
}

/**
 * Create new user
 * @param {Object} userData - User data including plain password
 * @returns {Promise<Object>} - Created user (without password)
 */
async function createUser(userData) {
  const passwordHash = await bcrypt.hash(userData.password, config.bcrypt.saltRounds);
  
  const newUser = {
    id: userData.id,
    username: userData.username,
    email: userData.email,
    passwordHash: passwordHash,
    status: 'offline',
    lastSeen: new Date().toISOString(),
    role: 'user',
    avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${userData.username}`,
    createdAt: new Date().toISOString()
  };

  users.push(newUser);
  return newUser;
}

/**
 * Update user status
 * @param {string} userId
 * @param {string} status
 * @returns {Object|null}
 */
function updateStatus(userId, status) {
  const user = findById(userId);
  if (user) {
    user.status = status;
    user.lastSeen = new Date().toISOString();
  }
  return user;
}

/**
 * Get all users (sanitized for admin view - no passwords)
 * @returns {Array}
 */
function getAllUsers() {
  return users.map(u => ({
    id: u.id,
    username: u.username,
    email: u.email,
    status: u.status,
    role: u.role,
    lastSeen: u.lastSeen
  }));
}

/**
 * Check if initialization is complete
 * @returns {boolean}
 */
function isInitialized() {
  return initialized;
}

module.exports = {
  initializeUsers,
  isInitialized,
  findByUsername,
  findByEmail,
  findById,
  findExisting,
  verifyPassword,
  createUser,
  updateStatus,
  getAllUsers
};
