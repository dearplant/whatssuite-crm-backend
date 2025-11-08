import contactService from '../services/contactService.js';
import logger from '../utils/logger.js';

/**
 * Contact Controller - Handle contact-related HTTP requests
 */
class ContactController {
  /**
   * Create a new contact
   * POST /api/v1/contacts
   */
  async createContact(req, res) {
    try {
      const contact = await contactService.createContact(req.validatedData, req.user.id);

      return res.status(201).json({
        success: true,
        message: 'Contact created successfully',
        data: contact,
      });
    } catch (error) {
      logger.error('Error in createContact controller', {
        error: error.message,
        userId: req.user.id,
      });

      if (error.message === 'WhatsApp account not found') {
        return res.status(404).json({
          error: 'NotFound',
          message: error.message,
        });
      }

      if (
        error.message === 'Unauthorized access to WhatsApp account' ||
        error.message === 'Unauthorized access to contact'
      ) {
        return res.status(403).json({
          error: 'Forbidden',
          message: error.message,
        });
      }

      if (error.message === 'Contact with this phone number already exists') {
        return res.status(409).json({
          error: 'Conflict',
          message: error.message,
        });
      }

      return res.status(500).json({
        error: 'InternalServerError',
        message: 'Failed to create contact',
      });
    }
  }

  /**
   * Get contacts with filters and pagination
   * GET /api/v1/contacts
   */
  async getContacts(req, res) {
    try {
      const { page, limit, ...filters } = req.validatedData;

      const result = await contactService.getContacts(filters, { page, limit }, req.user.id);

      return res.status(200).json({
        success: true,
        data: result.contacts,
        pagination: {
          page: result.page,
          limit: result.limit,
          total: result.total,
          totalPages: result.totalPages,
        },
      });
    } catch (error) {
      logger.error('Error in getContacts controller', {
        error: error.message,
        userId: req.user.id,
      });

      return res.status(500).json({
        error: 'InternalServerError',
        message: 'Failed to retrieve contacts',
      });
    }
  }

  /**
   * Get contact by ID with related data
   * GET /api/v1/contacts/:id
   */
  async getContactById(req, res) {
    try {
      const contact = await contactService.getContactById(req.params.id, req.user.id);

      return res.status(200).json({
        success: true,
        data: contact,
      });
    } catch (error) {
      logger.error('Error in getContactById controller', {
        error: error.message,
        contactId: req.params.id,
        userId: req.user.id,
      });

      if (error.message === 'Contact not found') {
        return res.status(404).json({
          error: 'NotFound',
          message: error.message,
        });
      }

      if (error.message === 'Unauthorized access to contact') {
        return res.status(403).json({
          error: 'Forbidden',
          message: error.message,
        });
      }

      return res.status(500).json({
        error: 'InternalServerError',
        message: 'Failed to retrieve contact',
      });
    }
  }

  /**
   * Update contact
   * PUT /api/v1/contacts/:id
   */
  async updateContact(req, res) {
    try {
      const contact = await contactService.updateContact(
        req.params.id,
        req.validatedData,
        req.user.id
      );

      return res.status(200).json({
        success: true,
        message: 'Contact updated successfully',
        data: contact,
      });
    } catch (error) {
      logger.error('Error in updateContact controller', {
        error: error.message,
        contactId: req.params.id,
        userId: req.user.id,
      });

      if (error.message === 'Contact not found') {
        return res.status(404).json({
          error: 'NotFound',
          message: error.message,
        });
      }

      if (error.message === 'Unauthorized access to contact') {
        return res.status(403).json({
          error: 'Forbidden',
          message: error.message,
        });
      }

      return res.status(500).json({
        error: 'InternalServerError',
        message: 'Failed to update contact',
      });
    }
  }

  /**
   * Delete contact (soft delete)
   * DELETE /api/v1/contacts/:id
   */
  async deleteContact(req, res) {
    try {
      await contactService.deleteContact(req.params.id, req.user.id);

      return res.status(200).json({
        success: true,
        message: 'Contact deleted successfully',
      });
    } catch (error) {
      logger.error('Error in deleteContact controller', {
        error: error.message,
        contactId: req.params.id,
        userId: req.user.id,
      });

      if (error.message === 'Contact not found') {
        return res.status(404).json({
          error: 'NotFound',
          message: error.message,
        });
      }

      if (error.message === 'Unauthorized access to contact') {
        return res.status(403).json({
          error: 'Forbidden',
          message: error.message,
        });
      }

      return res.status(500).json({
        error: 'InternalServerError',
        message: 'Failed to delete contact',
      });
    }
  }

  /**
   * Import contacts from CSV/Excel file
   */
  async importContacts(req, res) {
    try {
      const userId = req.user.id;
      const teamId = req.user.teamId;
      const { whatsappAccountId } = req.validatedData;
      const file = req.file;

      if (!file) {
        return res.status(400).json({
          error: 'ValidationError',
          message: 'File is required',
        });
      }

      const result = await contactService.importContacts(file, userId, whatsappAccountId, teamId);

      logger.info('Contact import initiated', {
        userId,
        whatsappAccountId,
        importId: result.importId,
      });

      return res.status(202).json({
        success: true,
        message: 'Contact import started',
        data: result,
      });
    } catch (error) {
      logger.error('Error importing contacts', {
        error: error.message,
        userId: req.user.id,
      });

      return res.status(500).json({
        error: 'InternalServerError',
        message: error.message || 'Failed to import contacts',
      });
    }
  }

  /**
   * Get import status
   */
  async getImportStatus(req, res) {
    try {
      const userId = req.user.id;
      const { importId } = req.params;

      const status = await contactService.getImportStatus(importId, userId);

      return res.status(200).json({
        success: true,
        data: status,
      });
    } catch (error) {
      logger.error('Error getting import status', {
        error: error.message,
        importId: req.params.importId,
        userId: req.user.id,
      });

      if (error.message === 'Import not found') {
        return res.status(404).json({
          error: 'NotFound',
          message: error.message,
        });
      }

      if (error.message === 'Unauthorized access to import') {
        return res.status(403).json({
          error: 'Forbidden',
          message: error.message,
        });
      }

      return res.status(500).json({
        error: 'InternalServerError',
        message: 'Failed to get import status',
      });
    }
  }

  /**
   * Export contacts to CSV
   */
  async exportContacts(req, res) {
    try {
      const userId = req.user.id;
      const teamId = req.user.teamId;
      const filters = req.validatedData;

      const csv = await contactService.exportContacts(userId, teamId, filters);

      // Set headers for CSV download
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=contacts.csv');

      logger.info('Contacts exported', {
        userId,
        teamId,
      });

      return res.status(200).send(csv);
    } catch (error) {
      logger.error('Error exporting contacts', {
        error: error.message,
        userId: req.user.id,
      });

      return res.status(500).json({
        error: 'InternalServerError',
        message: 'Failed to export contacts',
      });
    }
  }

  /**
   * Get all tags
   * GET /api/v1/contacts/tags
   */
  async getTags(req, res) {
    try {
      const teamId = req.user.teamId;
      const { search, page = 1, limit = 50 } = req.validatedQuery || req.query;

      const tags = await contactService.getTags(teamId, {
        search,
        page: parseInt(page),
        limit: parseInt(limit),
      });

      return res.status(200).json({
        success: true,
        data: tags.tags,
        pagination: tags.pagination,
      });
    } catch (error) {
      logger.error('Error fetching tags', {
        error: error.message,
        userId: req.user.id,
      });

      return res.status(500).json({
        error: 'InternalServerError',
        message: 'Failed to fetch tags',
      });
    }
  }

  /**
   * Perform bulk action on contacts
   * POST /api/v1/contacts/bulk-action
   */
  async bulkAction(req, res) {
    try {
      const teamId = req.user.teamId;
      const { action, contactIds, segmentId, data } = req.validatedData;

      const result = await contactService.bulkAction(teamId, {
        action,
        contactIds,
        segmentId,
        data,
      });

      return res.status(200).json({
        success: true,
        message: `Bulk action '${action}' completed successfully`,
        data: result,
      });
    } catch (error) {
      logger.error('Error performing bulk action', {
        error: error.message,
        userId: req.user.id,
      });

      return res.status(500).json({
        error: 'InternalServerError',
        message: error.message || 'Failed to perform bulk action',
      });
    }
  }
}

export default new ContactController();
