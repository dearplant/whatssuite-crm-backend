/**
 * Account Ownership Verification Middleware
 * 
 * This middleware verifies that a WhatsApp account belongs to the authenticated user
 * before allowing operations on that account.
 */

import prisma from '../config/database.js';
import logger from '../utils/logger.js';

/**
 * Verify WhatsApp account ownership
 * Checks if the account specified in req.params.accountId belongs to req.user.id
 * 
 * @param {string} paramName - The name of the parameter containing the account ID (default: 'accountId')
 * @returns {Function} Express middleware function
 */
export function verifyAccountOwnership(paramName = 'accountId') {
  return async (req, res, next) => {
    try {
      const accountId = req.params[paramName] || req.body[paramName];
      const userId = req.user.id;
      const teamId = req.user.teamId;

      if (!accountId) {
        return res.status(400).json({
          error: 'BadRequest',
          message: `${paramName} is required`,
        });
      }

      // Check if account exists and belongs to user or user's team
      const account = await prisma.whatsapp_accounts.findFirst({
        where: {
          id: accountId,
          OR: [
            { user_id: userId },
            { team_id: teamId },
          ],
        },
        select: {
          id: true,
          user_id: true,
          team_id: true,
          phone: true,
          name: true,
          status: true,
        },
      });

      if (!account) {
        logger.warn(`Account ownership verification failed`, {
          accountId,
          userId,
          teamId,
        });

        return res.status(404).json({
          error: 'NotFound',
          message: 'WhatsApp account not found or you do not have access to it',
        });
      }

      // Attach account to request for use in controller
      req.whatsappAccount = account;

      next();
    } catch (error) {
      logger.error('Error in verifyAccountOwnership middleware:', error);
      return res.status(500).json({
        error: 'InternalServerError',
        message: 'Failed to verify account ownership',
      });
    }
  };
}

/**
 * Verify account ownership for body parameter
 * Useful when accountId is in request body instead of params
 */
export function verifyAccountOwnershipFromBody(fieldName = 'accountId') {
  return async (req, res, next) => {
    try {
      const accountId = req.body[fieldName];
      const userId = req.user.id;
      const teamId = req.user.teamId;

      if (!accountId) {
        return res.status(400).json({
          error: 'BadRequest',
          message: `${fieldName} is required in request body`,
        });
      }

      // Check if account exists and belongs to user or user's team
      const account = await prisma.whatsapp_accounts.findFirst({
        where: {
          id: accountId,
          OR: [
            { user_id: userId },
            { team_id: teamId },
          ],
        },
        select: {
          id: true,
          user_id: true,
          team_id: true,
          phone: true,
          name: true,
          status: true,
        },
      });

      if (!account) {
        logger.warn(`Account ownership verification failed (from body)`, {
          accountId,
          userId,
          teamId,
        });

        return res.status(404).json({
          error: 'NotFound',
          message: 'WhatsApp account not found or you do not have access to it',
        });
      }

      // Attach account to request for use in controller
      req.whatsappAccount = account;

      next();
    } catch (error) {
      logger.error('Error in verifyAccountOwnershipFromBody middleware:', error);
      return res.status(500).json({
        error: 'InternalServerError',
        message: 'Failed to verify account ownership',
      });
    }
  };
}

export default {
  verifyAccountOwnership,
  verifyAccountOwnershipFromBody,
};
