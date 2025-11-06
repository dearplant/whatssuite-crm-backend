import bcrypt from 'bcryptjs';

/**
 * Password utility functions using bcrypt
 */

const SALT_ROUNDS = 12;

/**
 * Hash a password using bcrypt with 12 rounds
 * @param {string} password - Plain text password
 * @returns {Promise<string>} Hashed password
 */
export async function hashPassword(password) {
  return await bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * Verify a password against a hash
 * @param {string} password - Plain text password
 * @param {string} hash - Hashed password
 * @returns {Promise<boolean>} True if password matches
 */
export async function verifyPassword(password, hash) {
  return await bcrypt.compare(password, hash);
}

/**
 * Validate password strength
 * @param {string} password - Password to validate
 * @returns {Object} Validation result with valid flag and message
 */
export function validatePasswordStrength(password) {
  const minLength = 8;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumbers = /\d/.test(password);
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

  if (password.length < minLength) {
    return {
      valid: false,
      message: 'Password must be at least 8 characters long',
    };
  }

  if (!hasUpperCase || !hasLowerCase || !hasNumbers || !hasSpecialChar) {
    return {
      valid: false,
      message: 'Password must contain uppercase, lowercase, number, and special character',
    };
  }

  return { valid: true };
}
