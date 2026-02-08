const express = require('express');
const { v4: uuidv4 } = require('uuid');

const config = require('../config');
const messages = require('../data/messages');
const rooms = require('../data/rooms');
const { requireAuth } = require('../middleware/auth');
const { validateMessage, validateRoomId, validateMessageId, sanitizePagination } = require('../middleware/validation');
const { messageLimiter } = require('../middleware/rateLimit');
const { sanitizeMessage, sanitizeRoom, parsePagination } = require('../utils/helpers');

const router = express.Router();

// Search messages - MUST be defined before /:roomId to avoid route collision
router.get('/search', requireAuth, async (req, res) => {
  try {
    const { q, roomId } = req.query;
    const { userId } = req.user;

    if (!q || q.trim() === '') {
      return res.status(400).json({ error: 'Search query is required' });
    }

    // If room specified, check access
    if (roomId) {
      const room = rooms.findById(roomId);
      if (!room) {
        return res.status(404).json({ error: 'Room not found' });
      }
      if (!rooms.canAccess(roomId, userId)) {
        return res.status(403).json({ error: 'Access denied to this room' });
      }
    }

    const results = messages.searchMessages(q.trim(), roomId);

    res.json({
      results: results.map(msg => sanitizeMessage(msg, msg.userId === userId)),
      total: results.length
    });
  } catch (error) {
    console.error('Search messages error:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all rooms - requires authentication
router.get('/', requireAuth, async (req, res) => {
  try {
    const allRooms = rooms.getAllRooms();
    const userId = req.user.userId;
    
    res.set({
      'X-Total-Rooms': allRooms.length.toString()
    });

    res.json({
      rooms: allRooms.map(room => {
        const isMember = rooms.isMember(room.id, userId);
        return sanitizeRoom(room, isMember);
      })
    });
  } catch (error) {
    console.error('Get rooms error:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get messages from room - requires authentication
router.get('/:roomId', validateRoomId, sanitizePagination, requireAuth, async (req, res) => {
  try {
    const { roomId } = req.params;
    const userId = req.user.userId;
    
    const room = rooms.findById(roomId);
    
    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    // Check room access for private rooms
    if (room.type === 'private' && !rooms.canAccess(roomId, userId)) {
      return res.status(403).json({ error: 'Access denied to private room' });
    }

    // Get pagination
    const { limit, offset } = parsePagination(req.query, config.pagination);
    
    // Get messages
    const result = messages.getByRoom(roomId, { limit, offset });
    
    res.set({
      'X-Message-Count': result.total.toString(),
      'X-Room-Type': room.type
    });

    res.json({
      messages: result.messages.map(msg => {
        const isOwner = msg.userId === userId;
        return sanitizeMessage(msg, isOwner);
      }),
      room: sanitizeRoom(room, rooms.isMember(roomId, userId)),
      pagination: {
        offset,
        limit,
        total: result.total
      }
    });
  } catch (error) {
    console.error('Get messages error:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get specific message - requires authentication
router.get('/:roomId/:messageId', validateRoomId, validateMessageId, requireAuth, async (req, res) => {
  try {
    const { roomId, messageId } = req.params;
    const userId = req.user.userId;
    
    const room = rooms.findById(roomId);
    
    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    // Check room access for private rooms
    if (room.type === 'private' && !rooms.canAccess(roomId, userId)) {
      return res.status(403).json({ error: 'Access denied to private room' });
    }

    const message = messages.findById(messageId, roomId);
    
    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    const isOwner = message.userId === userId;
    res.json(sanitizeMessage(message, isOwner));
  } catch (error) {
    console.error('Get message error:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Send message to room
router.post('/:roomId', requireAuth, validateRoomId, validateMessage, messageLimiter, async (req, res) => {
  try {
    const { roomId } = req.params;
    const { content } = req.body;
    const { userId, username } = req.user;

    const room = rooms.findById(roomId);
    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    // Check room access
    if (!rooms.canAccess(roomId, userId)) {
      return res.status(403).json({ error: 'You are not a member of this room' });
    }
    
    const newMessage = messages.createMessage({
      id: uuidv4(),
      roomId,
      userId,
      username,
      content
    });

    res.set('X-Message-Id', newMessage.id);

    res.status(201).json({
      message: 'Message sent successfully',
      messageData: sanitizeMessage(newMessage, true)
    });
  } catch (error) {
    console.error('Send message error:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Edit message
router.put('/:roomId/:messageId', requireAuth, validateRoomId, validateMessageId, validateMessage, async (req, res) => {
  try {
    const { roomId, messageId } = req.params;
    const { content } = req.body;
    const { userId } = req.user;

    const room = rooms.findById(roomId);
    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    const message = messages.findById(messageId, roomId);
    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    // Check ownership - only message owner can edit
    if (!messages.isOwner(messageId, userId)) {
      return res.status(403).json({ error: 'You can only edit your own messages' });
    }

    const updatedMessage = messages.updateMessage(messageId, content, userId);

    res.json({
      message: 'Message updated successfully',
      messageData: sanitizeMessage(updatedMessage, true)
    });
  } catch (error) {
    console.error('Edit message error:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete message
router.delete('/:roomId/:messageId', requireAuth, validateRoomId, validateMessageId, async (req, res) => {
  try {
    const { roomId, messageId } = req.params;
    const { userId, role } = req.user;

    const room = rooms.findById(roomId);
    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    const message = messages.findById(messageId, roomId);
    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    // Check permissions: owner, room owner, or admin/moderator
    const isMessageOwner = messages.isOwner(messageId, userId);
    const isRoomOwner = rooms.isOwner(roomId, userId);
    const isAdminOrMod = role === 'admin' || role === 'moderator';
    
    if (!isMessageOwner && !isRoomOwner && !isAdminOrMod) {
      return res.status(403).json({ error: 'Permission denied' });
    }

    messages.deleteMessage(messageId, userId);

    res.json({ message: 'Message deleted successfully' });
  } catch (error) {
    console.error('Delete message error:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
