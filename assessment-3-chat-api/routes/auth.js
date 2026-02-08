const express = require('express');
const { v4: uuidv4 } = require('uuid');

const config = require('../config');
const users = require('../data/users');
const sessions = require('../data/sessions');
const { requireAuth, generateToken } = require('../middleware/auth');
const { validateLogin, validateRegister, validateStatus } = require('../middleware/validation');
const { loginLimiter } = require('../middleware/rateLimit');
const { sanitizeUserForAuth, sanitizeUserForProfile, sanitizeUserForAdminList, parsePagination } = require('../utils/helpers');

const router = express.Router();

// Login endpoint
router.post('/login', loginLimiter, validateLogin, async (req, res) => {
  try {
    const { username, password, email } = req.body;

    // Find user by username or email
    let user;
    if (username) {
      user = users.findByUsername(username);
    } else if (email) {
      user = users.findByEmail(email);
    }

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Verify password with bcrypt
    const isValidPassword = await users.verifyPassword(password, user.passwordHash);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Create session
    const sessionId = uuidv4();
    const { token, jti, expiresAt } = generateToken(user, sessionId);
    
    // Store session with token info
    sessions.createSession(sessionId, user.id, jti);

    // Update user status
    users.updateStatus(user.id, 'online');

    // SECURITY: Return minimal user data - NO email, NO lastSeen, NO status
    res.json({
      message: 'Login successful',
      token,
      user: sanitizeUserForAuth(user)
    });
  } catch (error) {
    console.error('Login error:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Register endpoint
router.post('/register', validateRegister, async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // Check for existing user
    const existingUser = users.findExisting(username, email);
    
    if (existingUser) {
      return res.status(409).json({ error: 'User already exists' });
    }

    // Create new user with hashed password
    const newUser = await users.createUser({
      id: uuidv4(),
      username,
      email,
      password
    });

    // SECURITY: Return minimal user data - NO email, NO auto-login token
    res.status(201).json({
      message: 'User registered successfully',
      user: sanitizeUserForAuth(newUser)
    });
  } catch (error) {
    console.error('Register error:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Logout endpoint
router.post('/logout', requireAuth, async (req, res) => {
  try {
    const { userId, sessionId, jti } = req.user;

    // Update user status
    users.updateStatus(userId, 'offline');

    // Delete session
    if (sessionId) {
      sessions.deleteSession(sessionId);
    }

    // Blacklist the token
    if (jti) {
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24);
      sessions.blacklistToken(jti, expiresAt);
    }

    res.json({ message: 'Logout successful' });
  } catch (error) {
    console.error('Logout error:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Profile endpoint - ONLY returns authenticated user's own profile
router.get('/profile', requireAuth, async (req, res) => {
  try {
    const { userId } = req.user;
    
    const user = users.findById(userId);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // SECURITY: Return ONLY own profile data
    // NO email, NO internal IDs, NO allUsers list
    res.json(sanitizeUserForProfile(user));
  } catch (error) {
    console.error('Profile error:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Status update endpoint - JWT only, admin role required for updating other users
// SECURITY: X-Admin-Key is completely removed and ignored
router.put('/status', requireAuth, validateStatus, async (req, res) => {
  try {
    const { userId: authUserId, role: authRole } = req.user;
    const { status, userId: targetUserId } = req.body;

    // Determine which user's status to update
    let userIdToUpdate = authUserId;

    // If targeting another user, require admin role
    if (targetUserId && targetUserId !== authUserId) {
      if (authRole !== 'admin') {
        return res.status(403).json({ error: 'Forbidden: Admin role required to update other users' });
      }
      userIdToUpdate = targetUserId;
    }

    const user = users.updateStatus(userIdToUpdate, status);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      message: 'Status updated successfully',
      status: user.status
    });
  } catch (error) {
    console.error('Status update error:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Admin user list endpoint - secure version
router.get('/admin/users', requireAuth, async (req, res) => {
  try {
    const { userId } = req.user;
    const user = users.findById(userId);

    // SECURITY: Require admin role
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Pagination
    const { limit, offset } = parsePagination(req.query, config.pagination);
    const allUsers = users.getAllUsers();
    
    // SECURITY: Return only sanitized user data - NO emails, NO IDs
    const paginatedUsers = allUsers
      .slice(offset, offset + limit)
      .map(u => sanitizeUserForAdminList(u));

    res.json({
      users: paginatedUsers,
      pagination: {
        total: allUsers.length,
        limit,
        offset
      }
    });
  } catch (error) {
    console.error('Admin get users error:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
