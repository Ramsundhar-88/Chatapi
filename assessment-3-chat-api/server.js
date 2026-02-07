const express = require('express');
const cors = require('cors');
const path = require('path');
const http = require('http');

// Import configuration
const config = require('./config');

// Import data initialization
const users = require('./data/users');
const sessions = require('./data/sessions');

// Import routes
const authRoutes = require('./routes/auth');
const messagesRoutes = require('./routes/messages');
const whisperRoutes = require('./routes/whisper');

// Import WebSocket server
const wsServer = require('./websocket');

const app = express();
const server = http.createServer(app);

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Custom headers for puzzle hints
app.use((req, res, next) => {
  res.set({
    'X-Chat-Protocol': 'v1.0',
    'X-Message-Hint': 'whisper_endpoint_needs_decryption_key',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
  });
  next();
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/messages', messagesRoutes);
app.use('/api/whisper', whisperRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    websocket: wsServer.getStats ? wsServer.getStats() : { connected: 0 }
  });
});

// WebSocket stats endpoint
app.get('/api/ws/stats', (req, res) => {
  res.json(wsServer.getStats ? wsServer.getStats() : { connected: 0 });
});

// Serve static files
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Error handler
app.use((error, req, res, next) => {
  console.error('Error:', error.message);
  res.status(500).json({ error: 'Internal server error' });
});

// Initialize and start server
async function start() {
  try {
    // Initialize users with hashed passwords
    await users.initializeUsers();
    
    // Start session cleanup
    sessions.startCleanup();

    // Initialize WebSocket server
    wsServer.init(server);

    // Start HTTP server
    server.listen(config.port, () => {
      console.log(`💬 Assessment 3: Chat/Messaging API running on http://localhost:${config.port}`);
      console.log(`📋 View instructions: http://localhost:${config.port}`);
      console.log(`🔐 Real-time features and security challenges await!`);
      console.log(`🔌 WebSocket available at ws://localhost:${config.port}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  sessions.stopCleanup();
  if (wsServer.close) wsServer.close();
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received. Shutting down gracefully...');
  sessions.stopCleanup();
  if (wsServer.close) wsServer.close();
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

// Only start server if this is the main module (not required for testing)
if (require.main === module) {
  start();
}

module.exports = { app, server, start };
