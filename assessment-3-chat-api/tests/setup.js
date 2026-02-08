// Test setup file
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-key-for-testing';
process.env.WHISPER_DECRYPTION_KEY = 'shadow-key-alpha-7';
process.env.WHISPER_SYSTEM_CODE = 'shadow-key-alpha-7';
process.env.PORT = '0'; // Use random available port for testing

const users = require('../data/users');

// Initialize users before tests run
beforeAll(async () => {
  await users.initializeUsers();
});

// Increase timeout for async operations
jest.setTimeout(10000);
