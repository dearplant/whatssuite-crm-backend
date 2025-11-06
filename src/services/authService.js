import crypto from 'crypto';
import userModel from '../models/user.js';
import { hashPassword, verifyPassword } from '../utils/password.js';
import { generateTokens, verifyRefreshToken, revokeRefreshToken } from '../utils/jwt.js';
import config from '../config/index.js';
import logger from '../utils/logger.js';
import {
  queueVerificationEmail,
  queuePasswordResetEmail,
  queueWelcomeEmail,
  queueAccountLockoutEmail,
  queuePasswordChangedEmail,
} from '../queues/emailQueue.js';

/**
 * Authentication Service - Business logic for authentication operations
 */
class AuthService {
  /**
   * Handle user login with account lockout
   * @param {string} email - User email
   * @param {string} password - User password
   * @returns {Promise<Object>} User and tokens
   * @throws {Error} If credentials are invalid or account is locked
   */
  async login(email, password) {
    // Find user with password
    const user = await userModel.findByEmail(email, true);

    if (!user) {
      logger.warn('Login attempt with non-existent email', { email });
      throw new Error('Invalid email or password');
    }

    // Check if account is locked
    if (user.lockedUntil && new Date() < user.lockedUntil) {
      const remainingTime = Math.ceil((user.lockedUntil - new Date()) / 1000 / 60);
      logger.warn('Login attempt on locked account', { userId: user.id, email, remainingTime });
      throw new Error(`Account is locked. Try again in ${remainingTime} minutes`);
    }

    // Check if account is active
    if (!user.isActive) {
      logger.warn('Login attempt on inactive account', { userId: user.id, email });
      throw new Error('Account is inactive');
    }

    // Check if account is deleted
    if (user.deletedAt) {
      logger.warn('Login attempt on deleted account', { userId: user.id, email });
      throw new Error('Account has been deleted');
    }

    // Verify password
    const isPasswordValid = await verifyPassword(password, user.password);

    if (!isPasswordValid) {
      // Increment login attempts
      await userModel.incrementLoginAttempts(user.id);

      // Check if we need to lock the account
      const updatedUser = await userModel.findById(user.id);
      if (updatedUser.loginAttempts >= config.security.maxLoginAttempts) {
        await userModel.lockAccount(user.id, config.security.lockoutDuration);

        // Send account lockout notification email
        await queueAccountLockoutEmail(updatedUser).catch((err) => {
          logger.error('Failed to queue account lockout email', { error: err.message });
        });

        logger.warn('Account locked due to failed login attempts', {
          userId: user.id,
          email,
          attempts: updatedUser.loginAttempts,
        });
        throw new Error(
          `Account locked due to too many failed login attempts. Try again in ${config.security.lockoutDuration / 60000} minutes`
        );
      }

      logger.warn('Failed login attempt', {
        userId: user.id,
        email,
        attempts: updatedUser.loginAttempts,
      });
      throw new Error('Invalid email or password');
    }

    // Reset login attempts on successful login
    await userModel.resetLoginAttempts(user.id);

    // Update last login timestamp
    await userModel.updateLastLogin(user.id);

    // Generate tokens
    const tokens = await generateTokens(user);

    // Remove password from user object
    delete user.password;

    logger.info('User logged in successfully', { userId: user.id, email });

    return {
      user,
      ...tokens,
    };
  }

  /**
   * Refresh access token using refresh token
   * @param {string} refreshToken - Refresh token
   * @returns {Promise<Object>} New access token
   * @throws {Error} If refresh token is invalid
   */
  async refreshAccessToken(refreshToken) {
    try {
      // Verify refresh token
      const tokenData = await verifyRefreshToken(refreshToken);

      // Check if user is still active
      if (!tokenData.user.isActive) {
        throw new Error('Account is inactive');
      }

      // Generate new access token
      const { generateAccessToken } = await import('../utils/jwt.js');
      const accessToken = generateAccessToken(tokenData.user);

      logger.info('Access token refreshed', { userId: tokenData.user.id });

      return {
        accessToken,
        user: tokenData.user,
      };
    } catch (error) {
      logger.warn('Refresh token verification failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Logout user by revoking refresh token
   * @param {string} refreshToken - Refresh token
   * @returns {Promise<void>}
   */
  async logout(refreshToken) {
    try {
      await revokeRefreshToken(refreshToken);
      logger.info('User logged out successfully');
    } catch (error) {
      logger.error('Logout failed', { error: error.message });
      throw new Error('Logout failed');
    }
  }

  /**
   * Register a new user
   * @param {Object} userData - User registration data
   * @returns {Promise<Object>} Created user and tokens
   * @throws {Error} If email already exists
   */
  async register(userData) {
    // Check if user already exists
    const existingUser = await userModel.findByEmail(userData.email);
    if (existingUser) {
      logger.warn('Registration attempt with existing email', { email: userData.email });
      throw new Error('Email already registered');
    }

    // Hash password
    const hashedPassword = await hashPassword(userData.password);

    // Generate email verification token
    const emailVerificationToken = crypto.randomBytes(32).toString('hex');

    // Create user
    const user = await userModel.create({
      email: userData.email,
      password: hashedPassword,
      firstName: userData.firstName,
      lastName: userData.lastName,
      phone: userData.phone,
      role: userData.role || 'Owner',
      emailVerificationToken,
      language: userData.language || 'en',
      timezone: userData.timezone || 'UTC',
    });

    // Generate tokens
    const tokens = await generateTokens(user);

    // Queue verification email
    await queueVerificationEmail(user, emailVerificationToken).catch((err) => {
      logger.error('Failed to queue verification email', { error: err.message });
    });

    // Queue welcome email (optional, can be sent after verification)
    await queueWelcomeEmail(user).catch((err) => {
      logger.error('Failed to queue welcome email', { error: err.message });
    });

    logger.info('User registered successfully', { userId: user.id, email: user.email });

    return {
      user,
      ...tokens,
      emailVerificationToken, // Return for email sending
    };
  }

  /**
   * Request password reset
   * @param {string} email - User email
   * @returns {Promise<Object>} Reset token
   * @throws {Error} If user not found
   */
  async requestPasswordReset(email) {
    const user = await userModel.findByEmail(email);

    if (!user) {
      // Don't reveal if email exists
      logger.warn('Password reset requested for non-existent email', { email });
      return { message: 'If the email exists, a reset link has been sent' };
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetExpires = new Date(Date.now() + 3600000); // 1 hour

    await userModel.setPasswordResetToken(email, resetToken, resetExpires);

    // Queue password reset email
    await queuePasswordResetEmail(user, resetToken).catch((err) => {
      logger.error('Failed to queue password reset email', { error: err.message });
    });

    logger.info('Password reset requested', { userId: user.id, email });

    return {
      resetToken,
      email: user.email,
      message: 'If the email exists, a reset link has been sent',
    };
  }

  /**
   * Reset password using reset token
   * @param {string} token - Reset token
   * @param {string} newPassword - New password
   * @returns {Promise<Object>} Success message
   * @throws {Error} If token is invalid or expired
   */
  async resetPassword(token, newPassword) {
    const user = await userModel.findByPasswordResetToken(token);

    if (!user) {
      logger.warn('Password reset attempted with invalid token');
      throw new Error('Invalid or expired reset token');
    }

    // Hash new password
    const hashedPassword = await hashPassword(newPassword);

    // Update password and clear reset token
    await userModel.update(user.id, {
      password: hashedPassword,
    });
    await userModel.clearPasswordResetToken(user.id);

    // Reset login attempts
    await userModel.resetLoginAttempts(user.id);

    // Queue password changed notification email
    const updatedUser = await userModel.findById(user.id);
    await queuePasswordChangedEmail(updatedUser).catch((err) => {
      logger.error('Failed to queue password changed email', { error: err.message });
    });

    logger.info('Password reset successfully', { userId: user.id });

    return {
      message: 'Password reset successfully',
    };
  }

  /**
   * Verify email using verification token
   * @param {string} token - Verification token
   * @returns {Promise<Object>} Success message
   * @throws {Error} If token is invalid
   */
  async verifyEmail(token) {
    const result = await userModel.verifyEmail(token);

    if (result.count === 0) {
      logger.warn('Email verification attempted with invalid token');
      throw new Error('Invalid verification token');
    }

    logger.info('Email verified successfully');

    return {
      message: 'Email verified successfully',
    };
  }

  /**
   * Change user password (authenticated)
   * @param {string} userId - User ID
   * @param {string} currentPassword - Current password
   * @param {string} newPassword - New password
   * @returns {Promise<Object>} Success message
   * @throws {Error} If current password is incorrect
   */
  async changePassword(userId, currentPassword, newPassword) {
    const user = await userModel.findByEmail((await userModel.findById(userId)).email, true);

    if (!user) {
      throw new Error('User not found');
    }

    // Verify current password
    const isPasswordValid = await verifyPassword(currentPassword, user.password);

    if (!isPasswordValid) {
      logger.warn('Password change failed - incorrect current password', { userId });
      throw new Error('Current password is incorrect');
    }

    // Hash new password
    const hashedPassword = await hashPassword(newPassword);

    // Update password
    await userModel.update(userId, {
      password: hashedPassword,
    });

    // Queue password changed notification email
    const updatedUser = await userModel.findById(userId);
    await queuePasswordChangedEmail(updatedUser).catch((err) => {
      logger.error('Failed to queue password changed email', { error: err.message });
    });

    logger.info('Password changed successfully', { userId });

    return {
      message: 'Password changed successfully',
    };
  }
}

export default new AuthService();
