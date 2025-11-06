/**
 * Message Controller
 * Handles HTTP requests for message operations
 */

import messageService from '../services/messageService.js';
import logger from '../utils/logger.js';

class MessageController {
  /**
   * Send a message
   * POST /api/v1/messages
   */
  async sendMessage(req, res, next) {
    try {
      const userId = req.user.id;
      const messageData = {
        userId,
        ...req.body,
      };

      const message = await messageService.sendMessage(messageData);

      res.status(202).json({
        success: true,
        message: 'Message queued for sending',
        data: message,
      });
    } catch (error) {
      logger.error('Error in sendMessage controller:', error);
      next(error);
    }
  }

  /**
   * Get messages with filters
   * GET /api/v1/messages
   */
  async getMessages(req, res, next) {
    try {
      const userId = req.user.id;
      const filters = {
        userId,
        whatsappAccountId: req.query.whatsappAccountId,
        contactId: req.query.contactId,
        direction: req.query.direction,
        type: req.query.type,
        status: req.query.status,
        startDate: req.query.startDate,
        endDate: req.query.endDate,
      };

      const pagination = {
        page: parseInt(req.query.page) || 1,
        limit: parseInt(req.query.limit) || 50,
      };

      const result = await messageService.getMessages(filters, pagination);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      logger.error('Error in getMessages controller:', error);
      next(error);
    }
  }

  /**
   * Get message by ID
   * GET /api/v1/messages/:id
   */
  async getMessageById(req, res, next) {
    try {
      const userId = req.user.id;
      const messageId = req.params.id;

      const message = await messageService.getMessageById(messageId, userId);

      res.status(200).json({
        success: true,
        data: message,
      });
    } catch (error) {
      logger.error('Error in getMessageById controller:', error);
      next(error);
    }
  }

  /**
   * Get message statistics
   * GET /api/v1/messages/statistics
   */
  async getStatistics(req, res, next) {
    try {
      const userId = req.user.id;
      const filters = {
        userId,
        whatsappAccountId: req.query.whatsappAccountId,
        startDate: req.query.startDate,
        endDate: req.query.endDate,
      };

      const statistics = await messageService.getStatistics(filters);

      res.status(200).json({
        success: true,
        data: statistics,
      });
    } catch (error) {
      logger.error('Error in getStatistics controller:', error);
      next(error);
    }
  }

  /**
   * Mark message as read
   * PUT /api/v1/messages/:id/read
   */
  async markAsRead(req, res, next) {
    try {
      const userId = req.user.id;
      const messageId = req.params.id;

      const message = await messageService.markAsRead(messageId, userId);

      res.status(200).json({
        success: true,
        message: 'Message marked as read',
        data: message,
      });
    } catch (error) {
      logger.error('Error in markAsRead controller:', error);
      next(error);
    }
  }

  /**
   * Retry failed message
   * POST /api/v1/messages/:id/retry
   */
  async retryMessage(req, res, next) {
    try {
      const userId = req.user.id;
      const messageId = req.params.id;

      const message = await messageService.retryMessage(messageId, userId);

      res.status(202).json({
        success: true,
        message: 'Message queued for retry',
        data: message,
      });
    } catch (error) {
      logger.error('Error in retryMessage controller:', error);
      next(error);
    }
  }
}

export default new MessageController();
