// Message data storage module

const { v4: uuidv4 } = require('uuid');

// Messages storage
let messages = [
  {
    id: '1',
    roomId: 'general',
    userId: 'user1',
    username: 'alice',
    content: 'Welcome to the chat!',
    timestamp: new Date('2024-01-01T10:00:00Z').toISOString(),
    edited: false,
    deleted: false,
    editHistory: []
  },
  {
    id: '2', 
    roomId: 'general',
    userId: 'user2',
    username: 'bob',
    content: 'Hello everyone!',
    timestamp: new Date('2024-01-01T10:01:00Z').toISOString(),
    edited: false,
    deleted: false,
    editHistory: []
  },
  {
    id: '3',
    roomId: 'private',
    userId: 'user1',
    username: 'alice',
    content: 'This is a private message',
    timestamp: new Date('2024-01-01T10:02:00Z').toISOString(),
    edited: false,
    deleted: false,
    editHistory: []
  }
];

/**
 * Get messages for a room
 * @param {string} roomId
 * @param {Object} options - { limit, offset, includeDeleted }
 * @returns {Object} - { messages, total }
 */
function getByRoom(roomId, options = {}) {
  const { limit = 50, offset = 0, includeDeleted = false } = options;
  
  let roomMessages = messages.filter(m => m.roomId === roomId);
  
  if (!includeDeleted) {
    roomMessages = roomMessages.filter(m => !m.deleted);
  }
  
  const total = roomMessages.length;
  const paginatedMessages = roomMessages.slice(offset, offset + limit);
  
  return { messages: paginatedMessages, total };
}

/**
 * Find message by ID
 * @param {string} messageId
 * @param {string} roomId - Optional room ID for validation
 * @returns {Object|null}
 */
function findById(messageId, roomId = null) {
  let message = messages.find(m => m.id === messageId && !m.deleted);
  
  if (message && roomId && message.roomId !== roomId) {
    return null;
  }
  
  return message || null;
}

/**
 * Create new message
 * @param {Object} messageData
 * @returns {Object}
 */
function createMessage(messageData) {
  const newMessage = {
    id: messageData.id || uuidv4(),
    roomId: messageData.roomId,
    userId: messageData.userId,
    username: messageData.username,
    content: messageData.content,
    timestamp: new Date().toISOString(),
    edited: false,
    deleted: false,
    editHistory: []
  };
  
  messages.push(newMessage);
  return newMessage;
}

/**
 * Update message content
 * @param {string} messageId
 * @param {string} newContent
 * @param {string} editedBy - User ID of editor
 * @returns {Object|null}
 */
function updateMessage(messageId, newContent, editedBy) {
  const message = messages.find(m => m.id === messageId && !m.deleted);
  
  if (!message) return null;
  
  // Store edit history
  message.editHistory.push({
    previousContent: message.content,
    editedAt: new Date().toISOString(),
    editedBy: editedBy
  });
  
  message.content = newContent;
  message.edited = true;
  message.lastEditedAt = new Date().toISOString();
  
  return message;
}

/**
 * Delete message (soft delete)
 * @param {string} messageId
 * @param {string} deletedBy - User ID of deleter
 * @returns {boolean}
 */
function deleteMessage(messageId, deletedBy) {
  const message = messages.find(m => m.id === messageId && !m.deleted);
  
  if (!message) return false;
  
  message.deleted = true;
  message.deletedAt = new Date().toISOString();
  message.deletedBy = deletedBy;
  
  return true;
}

/**
 * Check if user owns message
 * @param {string} messageId
 * @param {string} userId
 * @returns {boolean}
 */
function isOwner(messageId, userId) {
  const message = findById(messageId);
  if (!message) return false;
  return message.userId === userId;
}

/**
 * Get messages by user
 * @param {string} userId
 * @returns {Array}
 */
function getByUser(userId) {
  return messages.filter(m => m.userId === userId && !m.deleted);
}

/**
 * Search messages
 * @param {string} query
 * @param {string} roomId - Optional room filter
 * @returns {Array}
 */
function searchMessages(query, roomId = null) {
  const lowerQuery = query.toLowerCase();
  
  return messages.filter(m => {
    if (m.deleted) return false;
    if (roomId && m.roomId !== roomId) return false;
    return m.content.toLowerCase().includes(lowerQuery);
  });
}

module.exports = {
  getByRoom,
  findById,
  createMessage,
  updateMessage,
  deleteMessage,
  isOwner,
  getByUser,
  searchMessages
};
