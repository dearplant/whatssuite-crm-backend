import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import config from '../config/index.js';
import refreshTokenModel from '../models/refreshToken.js';

/**
 * JWT utility functions for token generation and verification
 */

/**
 * Generate access token
 * @param {Object} user - User object
 * @returns {string} JWT access token
 */
export function generateAccessToken(user) {
  const payload = {
    sub: user.id,
    email: user.email,
    role: user.role,
  };

  return jwt.sign(payload, config.jwt.secret, {
    expiresIn: config.jwt.accessExpiry,
    algorithm: config.jwt.algorithm,
    issuer: config.jwt.issuer,
  });
}

/**
 * Generate refresh token and store in database
 * @param {Object} user - User object
 * @returns {Promise<string>} JWT refresh token
 */
export async function generateRefreshToken(user) {
  const tokenId = crypto.randomUUID();

  const payload = {
    sub: user.id,
    tokenId,
  };

  const token = jwt.sign(payload, config.jwt.secret, {
    expiresIn: config.jwt.refreshExpiry,
    algorithm: config.jwt.algorithm,
    issuer: config.jwt.issuer,
  });

  // Calculate expiration date (30 days from now)
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 30);

  // Store refresh token in database
  await refreshTokenModel.create({
    id: tokenId,
    userId: user.id,
    token,
    expiresAt,
  });

  return token;
}

/**
 * Generate both access and refresh tokens
 * @param {Object} user - User object
 * @returns {Promise<Object>} Object with accessToken and refreshToken
 */
export async function generateTokens(user) {
  const accessToken = generateAccessToken(user);
  const refreshToken = await generateRefreshToken(user);

  return {
    accessToken,
    refreshToken,
  };
}

/**
 * Verify JWT token
 * @param {string} token - JWT token
 * @returns {Object} Decoded token payload
 * @throws {Error} If token is invalid or expired
 */
export function verifyToken(token) {
  try {
    return jwt.verify(token, config.jwt.secret, {
      algorithms: [config.jwt.algorithm],
      issuer: config.jwt.issuer,
    });
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw new Error('Token has expired');
    }
    if (error.name === 'JsonWebTokenError') {
      throw new Error('Invalid token');
    }
    throw error;
  }
}

/**
 * Decode JWT token without verification (for debugging)
 * @param {string} token - JWT token
 * @returns {Object|null} Decoded token payload or null
 */
export function decodeToken(token) {
  try {
    return jwt.decode(token);
  } catch (error) {
    return null;
  }
}

/**
 * Extract token from Authorization header
 * @param {string} authHeader - Authorization header value
 * @returns {string|null} Token or null
 */
export function extractTokenFromHeader(authHeader) {
  if (!authHeader) {
    return null;
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return null;
  }

  return parts[1];
}

/**
 * Verify refresh token and check if it's valid in database
 * @param {string} token - Refresh token
 * @returns {Promise<Object>} Token data with user
 * @throws {Error} If token is invalid, expired, or revoked
 */
export async function verifyRefreshToken(token) {
  // Verify JWT signature and expiration
  const decoded = verifyToken(token);

  // Check if token exists in database and is not revoked
  const tokenData = await refreshTokenModel.findByToken(token);

  if (!tokenData) {
    throw new Error('Refresh token not found');
  }

  if (tokenData.revokedAt) {
    throw new Error('Refresh token has been revoked');
  }

  if (new Date() > tokenData.expiresAt) {
    throw new Error('Refresh token has expired');
  }

  return tokenData;
}

/**
 * Revoke refresh token
 * @param {string} token - Refresh token
 * @returns {Promise<void>}
 */
export async function revokeRefreshToken(token) {
  await refreshTokenModel.revoke(token);
}

/**
 * Revoke all refresh tokens for a user
 * @param {string} userId - User ID
 * @returns {Promise<void>}
 */
export async function revokeAllUserTokens(userId) {
  await refreshTokenModel.revokeAllForUser(userId);
}
