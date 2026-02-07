// Utility functions for cryptographic operations
// Used by whisper endpoint for puzzles

const crypto = require('crypto');

/**
 * XOR encryption/decryption
 * @param {string} text - Text to encrypt/decrypt
 * @param {string} key - Encryption key
 * @returns {string} - Encrypted/decrypted text
 */
function xorEncryptDecrypt(text, key) {
  let result = '';
  for (let i = 0; i < text.length; i++) {
    result += String.fromCharCode(text.charCodeAt(i) ^ key.charCodeAt(i % key.length));
  }
  return result;
}

/**
 * Caesar cipher encoding
 * @param {string} text - Text to encode
 * @param {number} shift - Shift value
 * @returns {string} - Encoded text
 */
function caesarEncode(text, shift) {
  return text.replace(/[a-zA-Z]/g, (char) => {
    const start = char <= 'Z' ? 65 : 97;
    return String.fromCharCode((char.charCodeAt(0) - start + shift) % 26 + start);
  });
}

/**
 * Caesar cipher decoding
 * @param {string} text - Text to decode
 * @param {number} shift - Shift value
 * @returns {string} - Decoded text
 */
function caesarDecode(text, shift) {
  return text.replace(/[a-zA-Z]/g, (char) => {
    const start = char <= 'Z' ? 65 : 97;
    return String.fromCharCode((char.charCodeAt(0) - start - shift + 26) % 26 + start);
  });
}

/**
 * ROT13 encoding/decoding (shift of 13)
 * @param {string} text - Text to encode/decode
 * @returns {string} - ROT13 transformed text
 */
function rot13(text) {
  return caesarDecode(text, 13);
}

/**
 * Create SHA256 hash of text
 * @param {string} text - Text to hash
 * @returns {string} - Hex-encoded hash
 */
function sha256Hash(text) {
  return crypto.createHash('sha256').update(text).digest('hex');
}

/**
 * Generate a random token
 * @param {number} length - Length of token in bytes
 * @returns {string} - Hex-encoded random token
 */
function generateRandomToken(length = 32) {
  return crypto.randomBytes(length).toString('hex');
}

module.exports = {
  xorEncryptDecrypt,
  caesarEncode,
  caesarDecode,
  rot13,
  sha256Hash,
  generateRandomToken
};
