// WebSocket server for real-time features
// Handles: message broadcasting, presence, typing indicators

const WebSocket = require('ws');
const { verifyToken } = require('../middleware/auth');
const config = require('../config');
const users = require('../data/users');
const rooms = require('../data/rooms');

class WebSocketServer {
  constructor() {
    this.wss = null;
    this.clients = new Map(); // Map<userId, Set<WebSocket>>
    this.roomSubscriptions = new Map(); // Map<roomId, Set<userId>>
    this.typingUsers = new Map(); // Map<roomId, Map<userId, timeout>>
    this.heartbeatInterval = null;
  }

  /**
   * Initialize WebSocket server
   * @param {http.Server} server - HTTP server to attach to
   */
  init(server) {
    this.wss = new WebSocket.Server({ server });

    this.wss.on('connection', (ws, req) => {
      this.handleConnection(ws, req);
    });

    // Start heartbeat
    this.startHeartbeat();

    console.log('✅ WebSocket server initialized');
    return this;
  }

  /**
   * Handle new WebSocket connection
   */
  handleConnection(ws, req) {
    let userId = null;
    let username = null;

    // Parse token from query string or first message
    const url = new URL(req.url, 'http://localhost');
    const token = url.searchParams.get('token');

    if (token) {
      const decoded = verifyToken(token);
      if (decoded) {
        userId = decoded.userId;
        username = decoded.username;
        this.registerClient(userId, ws);
        this.sendToClient(ws, { type: 'connected', userId, username });
        this.broadcastPresence(userId, 'online');
      } else {
        ws.close(4001, 'Invalid token');
        return;
      }
    }

    ws.isAlive = true;

    ws.on('pong', () => {
      ws.isAlive = true;
    });

    ws.on('message', (data) => {
      this.handleMessage(ws, data, userId, username);
    });

    ws.on('close', () => {
      if (userId) {
        this.unregisterClient(userId, ws);
        this.handleDisconnect(userId);
      }
    });

    ws.on('error', (error) => {
      console.error('WebSocket error:', error.message);
    });
  }

  /**
   * Handle incoming WebSocket message
   */
  handleMessage(ws, data, userId, username) {
    try {
      const message = JSON.parse(data);

      // If not authenticated, first message must be auth
      if (!userId && message.type === 'auth') {
        const decoded = verifyToken(message.token);
        if (decoded) {
          userId = decoded.userId;
          username = decoded.username;
          this.registerClient(userId, ws);
          this.sendToClient(ws, { type: 'authenticated', userId, username });
          this.broadcastPresence(userId, 'online');
        } else {
          this.sendToClient(ws, { type: 'error', message: 'Invalid token' });
          ws.close(4001, 'Invalid token');
        }
        return;
      }

      if (!userId) {
        this.sendToClient(ws, { type: 'error', message: 'Authentication required' });
        return;
      }

      switch (message.type) {
        case 'join_room':
          this.handleJoinRoom(userId, message.roomId);
          break;
        case 'leave_room':
          this.handleLeaveRoom(userId, message.roomId);
          break;
        case 'typing':
          this.handleTyping(userId, username, message.roomId, message.isTyping);
          break;
        case 'presence':
          this.handlePresenceUpdate(userId, message.status);
          break;
        case 'ping':
          this.sendToClient(ws, { type: 'pong', timestamp: Date.now() });
          break;
        default:
          this.sendToClient(ws, { type: 'error', message: 'Unknown message type' });
      }
    } catch (error) {
      console.error('WebSocket message error:', error.message);
      this.sendToClient(ws, { type: 'error', message: 'Invalid message format' });
    }
  }

  /**
   * Register client connection
   */
  registerClient(userId, ws) {
    if (!this.clients.has(userId)) {
      this.clients.set(userId, new Set());
    }
    this.clients.get(userId).add(ws);
  }

  /**
   * Unregister client connection
   */
  unregisterClient(userId, ws) {
    const userClients = this.clients.get(userId);
    if (userClients) {
      userClients.delete(ws);
      if (userClients.size === 0) {
        this.clients.delete(userId);
      }
    }
  }

  /**
   * Handle user disconnect
   */
  handleDisconnect(userId) {
    // If no more connections, mark offline
    if (!this.clients.has(userId)) {
      this.broadcastPresence(userId, 'offline');
      users.updateStatus(userId, 'offline');
      
      // Clear typing indicators
      for (const [roomId, typingMap] of this.typingUsers) {
        if (typingMap.has(userId)) {
          clearTimeout(typingMap.get(userId));
          typingMap.delete(userId);
          this.broadcastToRoom(roomId, {
            type: 'typing_stop',
            userId,
            roomId
          });
        }
      }

      // Remove from room subscriptions
      for (const [roomId, members] of this.roomSubscriptions) {
        members.delete(userId);
      }
    }
  }

  /**
   * Handle join room
   */
  handleJoinRoom(userId, roomId) {
    const room = rooms.findById(roomId);
    if (!room) {
      this.sendToUser(userId, { type: 'error', message: 'Room not found' });
      return;
    }

    if (!rooms.canAccess(roomId, userId)) {
      this.sendToUser(userId, { type: 'error', message: 'Access denied' });
      return;
    }

    if (!this.roomSubscriptions.has(roomId)) {
      this.roomSubscriptions.set(roomId, new Set());
    }
    this.roomSubscriptions.get(roomId).add(userId);

    this.sendToUser(userId, { type: 'joined_room', roomId });
    
    // Notify room members
    this.broadcastToRoom(roomId, {
      type: 'user_joined',
      userId,
      roomId
    }, userId);
  }

  /**
   * Handle leave room
   */
  handleLeaveRoom(userId, roomId) {
    const members = this.roomSubscriptions.get(roomId);
    if (members) {
      members.delete(userId);
    }

    this.sendToUser(userId, { type: 'left_room', roomId });
    
    // Notify room members
    this.broadcastToRoom(roomId, {
      type: 'user_left',
      userId,
      roomId
    });
  }

  /**
   * Handle typing indicator
   */
  handleTyping(userId, username, roomId, isTyping) {
    if (!this.typingUsers.has(roomId)) {
      this.typingUsers.set(roomId, new Map());
    }

    const roomTyping = this.typingUsers.get(roomId);

    // Clear existing timeout
    if (roomTyping.has(userId)) {
      clearTimeout(roomTyping.get(userId));
      roomTyping.delete(userId);
    }

    if (isTyping) {
      // Set timeout to auto-clear typing
      const timeout = setTimeout(() => {
        roomTyping.delete(userId);
        this.broadcastToRoom(roomId, {
          type: 'typing_stop',
          userId,
          username,
          roomId
        });
      }, config.websocket.typingTimeout);

      roomTyping.set(userId, timeout);

      this.broadcastToRoom(roomId, {
        type: 'typing_start',
        userId,
        username,
        roomId
      }, userId);
    } else {
      this.broadcastToRoom(roomId, {
        type: 'typing_stop',
        userId,
        username,
        roomId
      }, userId);
    }
  }

  /**
   * Handle presence update
   */
  handlePresenceUpdate(userId, status) {
    const validStatuses = ['online', 'offline', 'away', 'busy'];
    if (!validStatuses.includes(status)) {
      this.sendToUser(userId, { type: 'error', message: 'Invalid status' });
      return;
    }

    users.updateStatus(userId, status);
    this.broadcastPresence(userId, status);
  }

  /**
   * Broadcast presence change
   */
  broadcastPresence(userId, status) {
    const user = users.findById(userId);
    if (!user) return;

    this.broadcast({
      type: 'presence_update',
      userId,
      username: user.username,
      status,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Send message to specific client
   */
  sendToClient(ws, message) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }

  /**
   * Send message to all connections of a user
   */
  sendToUser(userId, message) {
    const userClients = this.clients.get(userId);
    if (userClients) {
      const data = JSON.stringify(message);
      for (const ws of userClients) {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(data);
        }
      }
    }
  }

  /**
   * Broadcast to all room subscribers
   */
  broadcastToRoom(roomId, message, excludeUserId = null) {
    const members = this.roomSubscriptions.get(roomId);
    if (!members) return;

    const data = JSON.stringify(message);
    for (const userId of members) {
      if (userId !== excludeUserId) {
        this.sendToUser(userId, message);
      }
    }
  }

  /**
   * Broadcast to all connected clients
   */
  broadcast(message, excludeUserId = null) {
    const data = JSON.stringify(message);
    for (const [userId, clients] of this.clients) {
      if (userId !== excludeUserId) {
        for (const ws of clients) {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(data);
          }
        }
      }
    }
  }

  /**
   * Broadcast new message to room (called from HTTP route)
   */
  broadcastNewMessage(roomId, messageData) {
    this.broadcastToRoom(roomId, {
      type: 'new_message',
      roomId,
      message: messageData,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Start heartbeat to detect dead connections
   */
  startHeartbeat() {
    this.heartbeatInterval = setInterval(() => {
      if (this.wss) {
        this.wss.clients.forEach((ws) => {
          if (ws.isAlive === false) {
            return ws.terminate();
          }
          ws.isAlive = false;
          ws.ping();
        });
      }
    }, config.websocket.heartbeatInterval);
  }

  /**
   * Stop heartbeat
   */
  stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  /**
   * Get connection stats
   */
  getStats() {
    return {
      totalConnections: this.wss ? this.wss.clients.size : 0,
      uniqueUsers: this.clients.size,
      activeRooms: this.roomSubscriptions.size
    };
  }

  /**
   * Close server
   */
  close() {
    this.stopHeartbeat();
    if (this.wss) {
      this.wss.close();
    }
  }
}

// Singleton instance
const wsServer = new WebSocketServer();

module.exports = wsServer;
