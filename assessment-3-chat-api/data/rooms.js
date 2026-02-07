// Room data storage module

// Chat rooms storage
const rooms = [
  {
    id: 'general',
    name: 'General Chat',
    type: 'public',
    createdBy: 'admin',
    members: ['user1', 'user2', 'user3'],
    createdAt: new Date('2024-01-01').toISOString()
  },
  {
    id: 'private',
    name: 'Private Room',
    type: 'private',
    createdBy: 'user1',
    members: ['user1'],
    createdAt: new Date('2024-01-01').toISOString()
  }
];

/**
 * Get all rooms
 * @returns {Array}
 */
function getAllRooms() {
  return rooms;
}

/**
 * Find room by ID
 * @param {string} roomId
 * @returns {Object|null}
 */
function findById(roomId) {
  return rooms.find(r => r.id === roomId) || null;
}

/**
 * Check if user is member of room
 * @param {string} roomId
 * @param {string} userId
 * @returns {boolean}
 */
function isMember(roomId, userId) {
  const room = findById(roomId);
  if (!room) return false;
  return room.members.includes(userId);
}

/**
 * Check if user can access room (public rooms = everyone, private = members only)
 * @param {string} roomId
 * @param {string} userId
 * @returns {boolean}
 */
function canAccess(roomId, userId) {
  const room = findById(roomId);
  if (!room) return false;
  
  // Public rooms are accessible to all authenticated users
  if (room.type === 'public') return true;
  
  // Private rooms require membership
  return room.members.includes(userId);
}

/**
 * Check if user is room owner/creator
 * @param {string} roomId
 * @param {string} userId
 * @returns {boolean}
 */
function isOwner(roomId, userId) {
  const room = findById(roomId);
  if (!room) return false;
  return room.createdBy === userId;
}

/**
 * Add member to room
 * @param {string} roomId
 * @param {string} userId
 * @returns {boolean}
 */
function addMember(roomId, userId) {
  const room = findById(roomId);
  if (!room) return false;
  
  if (!room.members.includes(userId)) {
    room.members.push(userId);
  }
  return true;
}

/**
 * Remove member from room
 * @param {string} roomId
 * @param {string} userId
 * @returns {boolean}
 */
function removeMember(roomId, userId) {
  const room = findById(roomId);
  if (!room) return false;
  
  const index = room.members.indexOf(userId);
  if (index > -1) {
    room.members.splice(index, 1);
    return true;
  }
  return false;
}

/**
 * Create new room
 * @param {Object} roomData
 * @returns {Object}
 */
function createRoom(roomData) {
  const newRoom = {
    id: roomData.id,
    name: roomData.name,
    type: roomData.type || 'public',
    createdBy: roomData.createdBy,
    members: roomData.members || [roomData.createdBy],
    createdAt: new Date().toISOString()
  };
  
  rooms.push(newRoom);
  return newRoom;
}

/**
 * Get rooms for user (rooms they are members of)
 * @param {string} userId
 * @returns {Array}
 */
function getRoomsForUser(userId) {
  return rooms.filter(r => r.type === 'public' || r.members.includes(userId));
}

module.exports = {
  getAllRooms,
  findById,
  isMember,
  canAccess,
  isOwner,
  addMember,
  removeMember,
  createRoom,
  getRoomsForUser
};
