// Whisper messages data storage module

const crypto = require('crypto');
const cryptoUtils = require('../utils/crypto');

// Mock encrypted messages storage
const whisperMessages = [
  {
    id: 'w1',
    encrypted: true,
    content: crypto.createHash('sha256').update('Secret admin meeting at midnight').digest('hex'),
    originalContent: 'Secret admin meeting at midnight',
    sender: 'admin',
    recipient: 'moderator',
    timestamp: new Date().toISOString(),
    decryptionHint: 'Use key: "chat-master-key-2024"'
  },
  {
    id: 'w2',
    encrypted: true,
    content: crypto.createHash('sha256').update('Password reset for user alice: temp123').digest('hex'),
    originalContent: 'Password reset for user alice: temp123',
    caesarEncoded: cryptoUtils.caesarEncode('Password reset for user alice: temp123', 7),
    sender: 'system',
    recipient: 'admin',
    timestamp: new Date().toISOString(),
    decryptionHint: 'Caesar cipher with shift 7'
  }
];

// ROT13 encoded final puzzle
const FINAL_CIPHER = 'Pbatenghyngvbaf! Lbh qrpelcgrq gur juvfcre zrffntrf. Svany pyhrf: ERNY_GVZR_JROFBPXRG_2024';

/**
 * Get all whisper messages
 * @returns {Array}
 */
function getAll() {
  return whisperMessages;
}

/**
 * Get whisper messages for basic access (limited info)
 * @returns {Array}
 */
function getBasicMessages() {
  return [
    {
      id: 'sample',
      content: 'This is a sample whisper message',
      sender: 'system',
      encrypted: false
    }
  ];
}

/**
 * Get whisper messages for authenticated users
 * @returns {Array}
 */
function getAuthenticatedMessages() {
  return whisperMessages.map(msg => ({
    id: msg.id,
    content: msg.content,
    sender: msg.sender,
    recipient: msg.recipient,
    encrypted: msg.encrypted,
    timestamp: msg.timestamp,
    decryptionHint: msg.decryptionHint
  }));
}

/**
 * Get whisper messages for admin/system access (with decryption)
 * @returns {Array}
 */
function getAdminMessages() {
  return whisperMessages.map(msg => ({
    id: msg.id,
    encryptedContent: msg.content,
    decryptedContent: msg.originalContent,
    sender: msg.sender,
    recipient: msg.recipient,
    timestamp: msg.timestamp,
    decryptionMethod: msg.id === 'w1' ? 'Original hash comparison' : 'Caesar cipher shift 7'
  }));
}

/**
 * Get decryption tools info for admin access
 * @returns {Object}
 */
function getDecryptionTools() {
  return {
    xorDecrypt: 'Use xorEncryptDecrypt function with key',
    caesarDecrypt: 'Use caesarDecode function with shift value',
    finalPuzzle: FINAL_CIPHER,
    puzzleHint: 'Decode with ROT13'
  };
}

/**
 * Get the final cipher puzzle
 * @returns {string}
 */
function getFinalCipher() {
  return FINAL_CIPHER;
}

/**
 * Create new whisper message
 * @param {Object} messageData
 * @param {string} encryptionKey - Key for XOR encryption if encrypt=true
 * @returns {Object}
 */
function createWhisper(messageData, encryptionKey) {
  const whisper = {
    id: `w${Date.now()}`,
    content: messageData.encrypt ? 
      cryptoUtils.xorEncryptDecrypt(messageData.content, encryptionKey) : 
      messageData.content,
    originalContent: messageData.content,
    sender: messageData.sender,
    recipient: messageData.recipient,
    encrypted: messageData.encrypt || false,
    timestamp: new Date().toISOString(),
    encryptionMethod: messageData.encrypt ? 'xor' : 'none'
  };
  
  whisperMessages.push(whisper);
  return whisper;
}

/**
 * Find whisper by recipient
 * @param {string} recipient
 * @returns {Array}
 */
function getByRecipient(recipient) {
  return whisperMessages.filter(m => m.recipient === recipient);
}

module.exports = {
  getAll,
  getBasicMessages,
  getAuthenticatedMessages,
  getAdminMessages,
  getDecryptionTools,
  getFinalCipher,
  createWhisper,
  getByRecipient
};
