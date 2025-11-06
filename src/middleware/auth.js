import { extractTokenFromHeader, verifyToken } from '../utils/jwt.js';
import userModel from '../models/user.js';
import logger from '../utils/logger.js';
import prisma from '../config/database.js';

/**
 * Authentication middleware - Verify JWT and load user
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
export async function authenticate(req, res, next) {
  try {
    // Extract token from Authorization header
    const token = extractTokenFromHeader(req.headers.authorization);

    if (!token) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'No authentication token provided',
        code: 'NO_TOKEN',
      });
    }

    // Verify token
    let decoded;
    try {
      decoded = verifyToken(token);
    } catch (error) {
      logger.warn('Token verification failed', { error: error.message });
      return res.status(401).json({
        error: 'Unauthorized',
        message: error.message,
        code: error.message.includes('expired') ? 'TOKEN_EXPIRED' : 'INVALID_TOKEN',
      });
    }

    // Load user from database
    const user = await userModel.findById(decoded.sub);

    if (!user) {
      logger.warn('User not found for token', { userId: decoded.sub });
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'User not found',
        code: 'USER_NOT_FOUND',
      });
    }

    // Load user's team and role (either owned team or team membership)
    const ownedTeam = await prisma.teams.findFirst({
      where: { owner_id: user.id },
      select: { id: true },
    });

    if (ownedTeam) {
      user.teamId = ownedTeam.id;
      user.role = 'Owner'; // Team owner has Owner role
    } else {
      const teamMembership = await prisma.team_members.findFirst({
        where: { user_id: user.id },
        select: { team_id: true, role: true },
      });
      if (teamMembership) {
        user.teamId = teamMembership.team_id;
        user.role = teamMembership.role;
      }
    }

    // Check if user is active
    if (!user.isActive) {
      logger.warn('Inactive user attempted access', { userId: user.id });
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Account is inactive',
        code: 'ACCOUNT_INACTIVE',
      });
    }

    // Check if user is deleted
    if (user.deletedAt) {
      logger.warn('Deleted user attempted access', { userId: user.id });
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Account has been deleted',
        code: 'ACCOUNT_DELETED',
      });
    }

    // Check if account is locked
    if (user.lockedUntil && new Date() < user.lockedUntil) {
      const remainingTime = Math.ceil((user.lockedUntil - new Date()) / 1000 / 60);
      logger.warn('Locked user attempted access', { userId: user.id, remainingTime });
      return res.status(403).json({
        error: 'Forbidden',
        message: `Account is locked. Try again in ${remainingTime} minutes`,
        code: 'ACCOUNT_LOCKED',
        retryAfter: remainingTime * 60,
      });
    }

    // Attach user to request object
    req.user = user;
    req.userId = user.id;

    next();
  } catch (error) {
    logger.error('Authentication middleware error', { error: error.message, stack: error.stack });
    return res.status(500).json({
      error: 'InternalServerError',
      message: 'Authentication failed',
      code: 'AUTH_ERROR',
    });
  }
}

/**
 * Optional authentication middleware - Load user if token is present
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
export async function optionalAuthenticate(req, res, next) {
  try {
    const token = extractTokenFromHeader(req.headers.authorization);

    if (!token) {
      return next();
    }

    try {
      const decoded = verifyToken(token);
      const user = await userModel.findById(decoded.sub);

      if (user && user.isActive && !user.deletedAt) {
        req.user = user;
        req.userId = user.id;
      }
    } catch (error) {
      // Silently fail for optional auth
      logger.debug('Optional authentication failed', { error: error.message });
    }

    next();
  } catch (error) {
    logger.error('Optional authentication middleware error', {
      error: error.message,
      stack: error.stack,
    });
    next();
  }
}

/**
 * Require email verification middleware
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
export function requireEmailVerification(req, res, next) {
  if (!req.user) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Authentication required',
      code: 'AUTH_REQUIRED',
    });
  }

  if (!req.user.isEmailVerified) {
    return res.status(403).json({
      error: 'Forbidden',
      message: 'Email verification required',
      code: 'EMAIL_NOT_VERIFIED',
    });
  }

  next();
}

export default {
  authenticate,
  optionalAuthenticate,
  requireEmailVerification,
};
