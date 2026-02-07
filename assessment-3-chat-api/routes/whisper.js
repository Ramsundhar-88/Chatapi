// SECRET WHISPER ENDPOINT - Discovered through header hint
// Header hint: "whisper_endpoint_needs_decryption_key"

const express = require('express');

const config = require('../config');
const whispers = require('../data/whispers');
const { optionalAuth } = require('../middleware/auth');
const { validateWhisper } = require('../middleware/validation');
const { caesarDecode, rot13 } = require('../utils/crypto');

const router = express.Router();

// Get whisper messages
router.get('/', optionalAuth, async (req, res) => {
  try {
    // Multiple authentication methods for the puzzle
    const decryptKey = req.get('x-decrypt-key');
    const whisperCode = req.query.code;
    
    let hasAccess = false;
    let accessLevel = 'basic';

    // Method 1: JWT Token (basic access)
    if (req.user) {
      hasAccess = true;
      accessLevel = 'authenticated';
    }

    // Method 2: Decryption Key (admin access) - from config
    if (decryptKey === config.whisper.decryptionKey) {
      hasAccess = true;
      accessLevel = 'admin';
    }

    // Method 3: Whisper Code (system access) - from config
    if (whisperCode === config.whisper.systemCode) {
      hasAccess = true;
      accessLevel = 'system';
    }

    if (!hasAccess) {
      return res.status(403).json({
        error: 'Access denied to whisper endpoint',
        hints: [
          'Try with valid JWT token',
          'Check for X-Decrypt-Key header',
          'Maybe a special query parameter?',
          'Header hint mentioned decryption_key...'
        ]
      });
    }

    let responseData = {
      accessLevel,
      whisperMessages: [],
      decryptionTools: {}
    };

    if (accessLevel === 'authenticated') {
      responseData.whisperMessages = whispers.getAuthenticatedMessages();
    } else if (accessLevel === 'admin' || accessLevel === 'system') {
      // Provide decryption tools for admin/system access
      responseData.whisperMessages = whispers.getAdminMessages();
      responseData.decryptionTools = whispers.getDecryptionTools();
    } else {
      responseData.whisperMessages = whispers.getBasicMessages();
    }

    res.set({
      'X-Access-Level': accessLevel,
      'X-Whisper-Count': responseData.whisperMessages.length.toString(),
      'X-Decryption-Available': (accessLevel === 'admin' || accessLevel === 'system') ? 'true' : 'false',
      'Cache-Control': 'no-cache'
    });

    res.json(responseData);
  } catch (error) {
    console.error('Get whispers error:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Send whisper message
router.post('/', optionalAuth, validateWhisper, async (req, res) => {
  try {
    const decryptKey = req.get('x-decrypt-key');
    const whisperCode = req.query.code;
    
    let accessLevel = 'basic';

    if (req.user) {
      accessLevel = 'authenticated';
    }

    if (decryptKey === config.whisper.decryptionKey) {
      accessLevel = 'admin';
    }

    if (whisperCode === config.whisper.systemCode) {
      accessLevel = 'system';
    }

    if (accessLevel === 'basic') {
      return res.status(403).json({ error: 'Insufficient privileges to send whisper messages' });
    }

    const { content, recipient, encrypt = false } = req.body;

    const whisperMessage = whispers.createWhisper({
      content,
      recipient,
      encrypt,
      sender: req.user ? req.user.username : 'anonymous'
    }, config.whisper.decryptionKey);

    res.status(201).json({
      message: 'Whisper message sent successfully',
      whisperData: {
        id: whisperMessage.id,
        encrypted: whisperMessage.encrypted,
        recipient: whisperMessage.recipient,
        timestamp: whisperMessage.timestamp
      }
    });
  } catch (error) {
    console.error('Send whisper error:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Decode endpoint for puzzle solving
router.post('/decode', async (req, res) => {
  try {
    const { text, method, shift } = req.body;

    if (!text || !method) {
      return res.status(400).json({ error: 'Text and method are required' });
    }

    let decoded;
    switch (method.toLowerCase()) {
      case 'caesar':
        decoded = caesarDecode(text, shift || 7);
        break;
      case 'rot13':
        decoded = rot13(text);
        break;
      default:
        return res.status(400).json({ error: 'Unknown decoding method. Use: caesar, rot13' });
    }

    res.json({
      original: text,
      method,
      decoded
    });
  } catch (error) {
    console.error('Decode error:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
