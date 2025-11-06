import crypto from 'crypto';
import config from '../config/index.js';

const ALGORITHM = 'aes-256-gcm';
const ENCRYPTION_KEY = Buffer.from(config.encryptionKey, 'hex');

/**
 * Encrypt sensitive data using AES-256-GCM
 * @param {string} text - Plain text to encrypt
 * @returns {Object} - Object containing encrypted data, IV, and auth tag
 */
export function encrypt(text) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, ENCRYPTION_KEY, iv);

  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag();

  return {
    encrypted,
    iv: iv.toString('hex'),
    authTag: authTag.toString('hex'),
  };
}

/**
 * Decrypt encrypted data
 * @param {string} encrypted - Encrypted text
 * @param {string} iv - Initialization vector
 * @param {string} authTag - Authentication tag
 * @returns {string} - Decrypted plain text
 */
export function decrypt(encrypted, iv, authTag) {
  const decipher = crypto.createDecipheriv(
    ALGORITHM,
    ENCRYPTION_KEY,
    Buffer.from(iv, 'hex')
  );

  decipher.setAuthTag(Buffer.from(authTag, 'hex'));

  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

/**
 * Encrypt credentials for storage
 * @param {Object} credentials - Credentials object to encrypt
 * @returns {Object} - Encrypted credentials object
 */
export function encryptCredentials(credentials) {
  const jsonString = JSON.stringify(credentials);
  return encrypt(jsonString);
}

/**
 * Decrypt credentials from storage
 * @param {Object} encryptedData - Object containing encrypted, iv, and authTag
 * @returns {Object} - Decrypted credentials object
 */
export function decryptCredentials(encryptedData) {
  const { encrypted, iv, authTag } = encryptedData;
  const decrypted = decrypt(encrypted, iv, authTag);
  return JSON.parse(decrypted);
}
