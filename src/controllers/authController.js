import authService from '../services/authService.js';
import { logger } from '../utils/logger.js';

/**
 * Authentication Controller - Handles HTTP requests for authentication
 */
class AuthController {
  /**
   * POST /api/v1/auth/register
   * Register a new user
   */
  async register(req, res) {
    try {
      const result = await authService.register(req.validatedData);

      // TODO: Send verification email with result.emailVerificationToken
      // This will be implemented in Phase 2 Task 9

      logger.info('User registration successful', {
        userId: result.user.id,
        email: result.user.email,
      });

      res.status(201).json({
        success: true,
        message: 'Registration successful. Please check your email to verify your account.',
        data: {
          user: result.user,
          accessToken: result.accessToken,
          refreshToken: result.refreshToken,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Registration failed', {
        error: error.message,
        email: req.validatedData?.email,
      });

      if (error.message === 'Email already registered') {
        return res.status(409).json({
          error: 'ConflictError',
          message: error.message,
          timestamp: new Date().toISOString(),
        });
      }

      res.status(500).json({
        error: 'InternalServerError',
        message: 'Registration failed. Please try again later.',
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * POST /api/v1/auth/login
   * Authenticate user and return tokens
   */
  async login(req, res) {
    try {
      const result = await authService.login(req.validatedData.email, req.validatedData.password);

      logger.info('User login successful', {
        userId: result.user.id,
        email: result.user.email,
      });

      res.status(200).json({
        success: true,
        message: 'Login successful',
        data: {
          user: result.user,
          accessToken: result.accessToken,
          refreshToken: result.refreshToken,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.warn('Login failed', {
        error: error.message,
        email: req.validatedData?.email,
      });

      // Return generic error message for security
      if (
        error.message.includes('Invalid email or password') ||
        error.message.includes('Account is locked') ||
        error.message.includes('Account is inactive') ||
        error.message.includes('Account has been deleted')
      ) {
        return res.status(401).json({
          error: 'Unauthorized',
          message: error.message,
          timestamp: new Date().toISOString(),
        });
      }

      res.status(500).json({
        error: 'InternalServerError',
        message: 'Login failed. Please try again later.',
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * POST /api/v1/auth/refresh
   * Refresh access token using refresh token
   */
  async refresh(req, res) {
    try {
      const result = await authService.refreshAccessToken(req.validatedData.refreshToken);

      logger.info('Token refresh successful', {
        userId: result.user.id,
      });

      res.status(200).json({
        success: true,
        message: 'Token refreshed successfully',
        data: {
          accessToken: result.accessToken,
          user: result.user,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.warn('Token refresh failed', {
        error: error.message,
      });

      res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid or expired refresh token',
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * POST /api/v1/auth/logout
   * Logout user by revoking refresh token
   */
  async logout(req, res) {
    try {
      await authService.logout(req.validatedData.refreshToken);

      logger.info('User logout successful', {
        userId: req.user?.id,
      });

      res.status(200).json({
        success: true,
        message: 'Logout successful',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Logout failed', {
        error: error.message,
        userId: req.user?.id,
      });

      res.status(500).json({
        error: 'InternalServerError',
        message: 'Logout failed. Please try again later.',
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * POST /api/v1/auth/forgot-password
   * Request password reset
   */
  async forgotPassword(req, res) {
    try {
      const result = await authService.requestPasswordReset(req.validatedData.email);

      // TODO: Send password reset email with result.resetToken
      // This will be implemented in Phase 2 Task 9

      logger.info('Password reset requested', {
        email: req.validatedData.email,
      });

      // Always return success to prevent email enumeration
      res.status(200).json({
        success: true,
        message: 'If the email exists, a password reset link has been sent.',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Password reset request failed', {
        error: error.message,
        email: req.validatedData?.email,
      });

      // Return generic success message even on error to prevent email enumeration
      res.status(200).json({
        success: true,
        message: 'If the email exists, a password reset link has been sent.',
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * POST /api/v1/auth/reset-password
   * Reset password using reset token
   */
  async resetPassword(req, res) {
    try {
      await authService.resetPassword(req.validatedData.token, req.validatedData.password);

      logger.info('Password reset successful');

      res.status(200).json({
        success: true,
        message: 'Password reset successfully. You can now login with your new password.',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.warn('Password reset failed', {
        error: error.message,
      });

      res.status(400).json({
        error: 'BadRequest',
        message: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * POST /api/v1/auth/verify-email
   * Verify email using verification token
   */
  async verifyEmail(req, res) {
    try {
      await authService.verifyEmail(req.validatedData.token);

      logger.info('Email verification successful');

      res.status(200).json({
        success: true,
        message: 'Email verified successfully',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.warn('Email verification failed', {
        error: error.message,
      });

      res.status(400).json({
        error: 'BadRequest',
        message: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * GET /api/v1/auth/me
   * Get current authenticated user profile
   */
  async getProfile(req, res) {
    try {
      // User is already attached to req by auth middleware
      res.status(200).json({
        success: true,
        data: {
          user: req.user,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Get profile failed', {
        error: error.message,
        userId: req.user?.id,
      });

      res.status(500).json({
        error: 'InternalServerError',
        message: 'Failed to retrieve profile',
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * PUT /api/v1/auth/profile
   * Update authenticated user profile
   */
  async updateProfile(req, res) {
    try {
      const userModel = (await import('../models/user.js')).default;
      const updatedUser = await userModel.update(req.user.id, req.validatedData);

      logger.info('Profile updated successfully', {
        userId: req.user.id,
      });

      res.status(200).json({
        success: true,
        message: 'Profile updated successfully',
        data: {
          user: updatedUser,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Profile update failed', {
        error: error.message,
        userId: req.user?.id,
      });

      res.status(500).json({
        error: 'InternalServerError',
        message: 'Failed to update profile',
        timestamp: new Date().toISOString(),
      });
    }
  }
}

export default new AuthController();
