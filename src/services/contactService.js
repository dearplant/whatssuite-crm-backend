import crypto from 'crypto';
import ContactModel from '../models/contact.js';
import WhatsAppAccountModel from '../models/whatsappAccount.js';
import logger from '../utils/logger.js';
import prisma from '../config/database.js';

/**
 * Contact Service - Business logic for contact operations
 */
class ContactService {
  /**
   * Load tags for a contact
   * @param {string} contactId - Contact ID
   * @returns {Promise<Array>} Array of tag names
   */
  async loadContactTags(contactId) {
    const contactTags = await prisma.contact_tags.findMany({
      where: { contact_id: contactId },
      include: {
        tags: true,
      },
    });
    return contactTags.map((ct) => ct.tags.name);
  }

  /**
   * Load tags for multiple contacts
   * @param {Array} contactIds - Array of contact IDs
   * @returns {Promise<Object>} Map of contactId to tags array
   */
  async loadContactTagsMap(contactIds) {
    const contactTags = await prisma.contact_tags.findMany({
      where: { contact_id: { in: contactIds } },
      include: {
        tags: true,
      },
    });

    const tagsMap = {};
    for (const ct of contactTags) {
      if (!tagsMap[ct.contact_id]) {
        tagsMap[ct.contact_id] = [];
      }
      tagsMap[ct.contact_id].push(ct.tags.name);
    }
    return tagsMap;
  }

  /**
   * Create a new contact with duplicate detection
   * @param {Object} data - Contact data
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Created contact
   */
  async createContact(data, userId) {
    try {
      // Verify WhatsApp account belongs to user
      const whatsappAccount = await WhatsAppAccountModel.findById(
        data.whatsappAccountId
      );

      if (!whatsappAccount) {
        throw new Error('WhatsApp account not found');
      }

      if (whatsappAccount.userId !== userId) {
        throw new Error('Unauthorized access to WhatsApp account');
      }

      // Check for duplicate contact
      const existingContact = await ContactModel.findByPhone(
        whatsappAccount.teamId,
        data.phone
      );

      if (existingContact) {
        throw new Error('Contact with this phone number already exists');
      }

      // Create contact
      const contact = await ContactModel.create({
        id: crypto.randomUUID(),
        teamId: whatsappAccount.teamId,
        phone: data.phone,
        email: data.email,
        firstName: data.name ? data.name.split(' ')[0] : undefined,
        lastName: data.name ? data.name.split(' ').slice(1).join(' ') : undefined,
        company: data.company,
        city: data.city,
        country: data.country,
        customFields: data.customFields || {},
        source: data.source || 'Manual',
        notes: data.notes,
      });

      // Handle tags if provided
      if (data.tags && Array.isArray(data.tags) && data.tags.length > 0) {
        const tagIds = [];
        
        for (const tagName of data.tags) {
          // Find or create tag
          let tag = await prisma.tags.findFirst({
            where: {
              team_id: whatsappAccount.teamId,
              name: tagName,
            },
          });

          if (!tag) {
            tag = await prisma.tags.create({
              data: {
                id: crypto.randomUUID(),
                team_id: whatsappAccount.teamId,
                name: tagName,
                color: '#3B82F6',
                created_at: new Date(),
                updated_at: new Date(),
              },
            });
          }

          tagIds.push(tag.id);

          // Create contact_tag relationship
          await prisma.contact_tags.create({
            data: {
              id: crypto.randomUUID(),
              contact_id: contact.id,
              tag_id: tag.id,
              created_at: new Date(),
            },
          });
        }

        // Add tags to contact object
        contact.tags = data.tags;
      }

      logger.info('Contact created', {
        contactId: contact.id,
        userId,
        phone: contact.phone,
      });

      return contact;
    } catch (error) {
      logger.error('Error creating contact', {
        error: error.message,
        userId,
        data,
      });
      throw error;
    }
  }

  /**
   * Get contacts with filters and pagination
   * @param {Object} filters - Filter criteria
   * @param {Object} pagination - Pagination options
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Contacts and metadata
   */
  async getContacts(filters, pagination, userId) {
    try {
      // Get user's team
      const user = await prisma.users.findUnique({
        where: { id: userId },
      });

      if (!user) {
        throw new Error('User not found');
      }

      // Get team ID
      const ownedTeam = await prisma.teams.findFirst({
        where: { owner_id: userId },
      });

      const teamId = ownedTeam
        ? ownedTeam.id
        : (
            await prisma.team_members.findFirst({
              where: { user_id: userId },
            })
          )?.team_id;

      if (!teamId) {
        throw new Error('User has no team');
      }

      const { page = 1, limit = 50 } = pagination;
      const skip = (page - 1) * limit;

      // Build where clause
      const where = {
        team_id: teamId,
        deleted_at: null,
      };

      // Add search filter
      if (filters.search) {
        where.OR = [
          { first_name: { contains: filters.search, mode: 'insensitive' } },
          { last_name: { contains: filters.search, mode: 'insensitive' } },
          { email: { contains: filters.search, mode: 'insensitive' } },
          { phone: { contains: filters.search } },
          { company: { contains: filters.search, mode: 'insensitive' } },
        ];
      }

      // Get contacts
      const [contacts, total] = await Promise.all([
        prisma.contacts.findMany({
          where,
          skip,
          take: limit,
          orderBy: { created_at: 'desc' },
        }),
        prisma.contacts.count({ where }),
      ]);

      // Map contacts and load tags
      const contactIds = contacts.map((c) => c.id);
      const tagsMap = await this.loadContactTagsMap(contactIds);

      const mappedContacts = contacts.map((c) => {
        const contact = ContactModel.mapToModel.call(ContactModel, c);
        contact.tags = tagsMap[c.id] || [];
        return contact;
      });

      logger.info('Contacts retrieved', {
        userId,
        count: mappedContacts.length,
        total,
      });

      return {
        contacts: mappedContacts,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    } catch (error) {
      logger.error('Error retrieving contacts', {
        error: error.message,
        userId,
        filters,
      });
      throw error;
    }
  }

  /**
   * Get contact by ID with related data
   * @param {string} contactId - Contact ID
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Contact with related data
   */
  async getContactById(contactId, userId) {
    try {
      const contact = await ContactModel.findById(contactId);

      if (!contact) {
        throw new Error('Contact not found');
      }

      // Load tags for the contact
      const tags = await this.loadContactTags(contactId);
      contact.tags = tags;

      // Load WhatsApp account through conversations
      const conversation = await prisma.conversations.findFirst({
        where: { contact_id: contactId },
        include: {
          whatsapp_accounts: {
            select: {
              id: true,
              name: true,
              phone: true,
              type: true,
              status: true,
            },
          },
        },
        orderBy: { created_at: 'desc' },
      });

      contact.whatsappAccount = conversation?.whatsapp_accounts || null;

      // Load message count
      const messageCount = await prisma.messages.count({
        where: { contact_id: contactId },
      });

      // Load recent messages
      const messages = await prisma.messages.findMany({
        where: { contact_id: contactId },
        orderBy: { created_at: 'desc' },
        take: 10,
        select: {
          id: true,
          content: true,
          senderType: true,
          status: true,
          created_at: true,
        },
      });

      contact.messages = messages;
      contact._count = { messages: messageCount };

      logger.info('Contact retrieved', {
        contactId,
        userId,
      });

      return contact;
    } catch (error) {
      logger.error('Error retrieving contact', {
        error: error.message,
        contactId,
        userId,
      });
      throw error;
    }
  }

  /**
   * Update contact
   * @param {string} contactId - Contact ID
   * @param {Object} data - Update data
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Updated contact
   */
  async updateContact(contactId, data, userId) {
    try {
      const contact = await ContactModel.findById(contactId);

      if (!contact) {
        throw new Error('Contact not found');
      }

      // Parse name if provided
      if (data.name) {
        const nameParts = data.name.split(' ');
        data.firstName = nameParts[0];
        data.lastName = nameParts.slice(1).join(' ') || undefined;
      }

      const updatedContact = await ContactModel.update(contactId, data);

      // Handle tags if provided
      if (data.tags && Array.isArray(data.tags)) {
        // Remove existing tags
        await prisma.contact_tags.deleteMany({
          where: { contact_id: contactId },
        });

        // Add new tags
        const teamId = contact.teamId;
        for (const tagName of data.tags) {
          // Find or create tag
          let tag = await prisma.tags.findFirst({
            where: {
              team_id: teamId,
              name: tagName,
            },
          });

          if (!tag) {
            tag = await prisma.tags.create({
              data: {
                id: crypto.randomUUID(),
                team_id: teamId,
                name: tagName,
                color: '#3B82F6',
                created_at: new Date(),
                updated_at: new Date(),
              },
            });
          }

          // Create contact_tag relationship
          await prisma.contact_tags.create({
            data: {
              id: crypto.randomUUID(),
              contact_id: contactId,
              tag_id: tag.id,
              created_at: new Date(),
            },
          });
        }

        updatedContact.tags = data.tags;
      } else {
        // Load existing tags
        updatedContact.tags = await this.loadContactTags(contactId);
      }

      logger.info('Contact updated', {
        contactId,
        userId,
        updates: Object.keys(data),
      });

      return updatedContact;
    } catch (error) {
      logger.error('Error updating contact', {
        error: error.message,
        contactId,
        userId,
      });
      throw error;
    }
  }

  /**
   * Delete contact (soft delete)
   * @param {string} contactId - Contact ID
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Deleted contact
   */
  async deleteContact(contactId, userId) {
    try {
      const contact = await ContactModel.findById(contactId);

      if (!contact) {
        throw new Error('Contact not found');
      }

      // Get user's team to verify access
      const user = await prisma.users.findUnique({
        where: { id: userId },
      });

      if (!user) {
        throw new Error('User not found');
      }

      const ownedTeam = await prisma.teams.findFirst({
        where: { owner_id: userId },
      });

      const userTeamId = ownedTeam?.id;

      if (contact.teamId !== userTeamId) {
        throw new Error('Unauthorized access to contact');
      }

      const deletedContact = await ContactModel.delete(contactId);

      logger.info('Contact deleted', {
        contactId,
        userId,
      });

      return deletedContact;
    } catch (error) {
      logger.error('Error deleting contact', {
        error: error.message,
        contactId,
        userId,
      });
      throw error;
    }
  }

  /**
   * Import contacts from file
   * @param {Object} file - Uploaded file
   * @param {string} userId - User ID
   * @param {string} whatsappAccountId - WhatsApp account ID
   * @param {string} teamId - Team ID
   * @returns {Promise<Object>} Import job details
   */
  async importContacts(file, userId, whatsappAccountId, teamId) {
    try {
      const { parseCSV, parseExcel } = await import('../utils/fileParser.js');
      const contactImportQueue = (await import('../queues/contactImportQueue.js')).default;
      const { v4: uuidv4 } = await import('uuid');

      // Parse file based on type
      let contacts = [];
      const fileType = file.mimetype;

      if (fileType === 'text/csv' || file.originalname.endsWith('.csv')) {
        contacts = await parseCSV(file.buffer);
      } else if (
        fileType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
        fileType === 'application/vnd.ms-excel' ||
        file.originalname.endsWith('.xlsx') ||
        file.originalname.endsWith('.xls')
      ) {
        contacts = parseExcel(file.buffer);
      } else {
        throw new Error('Unsupported file type. Please upload CSV or Excel file.');
      }

      if (!contacts || contacts.length === 0) {
        throw new Error('No contacts found in file');
      }

      if (contacts.length > 100000) {
        throw new Error('File contains too many contacts. Maximum 100,000 contacts allowed.');
      }

      // Create import record
      const importId = uuidv4();
      await prisma.contact_imports.create({
        data: {
          id: importId,
          team_id: teamId,
          user_id: userId,
          account_id: whatsappAccountId,
          filename: file.originalname,
          file_type: fileType,
          total_count: contacts.length,
          status: 'Pending',
        },
      });

      // Queue import job
      const job = await contactImportQueue.add({
        userId,
        whatsappAccountId,
        teamId,
        contacts,
        importId,
      });

      logger.info('Contact import queued', {
        userId,
        whatsappAccountId,
        totalContacts: contacts.length,
        importId,
        jobId: job.id,
      });

      return {
        importId,
        jobId: job.id,
        totalContacts: contacts.length,
        status: 'Pending',
      };
    } catch (error) {
      logger.error('Error importing contacts', {
        error: error.message,
        userId,
        whatsappAccountId,
      });
      throw error;
    }
  }

  /**
   * Get import status
   * @param {string} importId - Import ID
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Import status
   */
  async getImportStatus(importId, userId) {
    try {
      const importRecord = await prisma.contact_imports.findUnique({
        where: { id: importId },
      });

      if (!importRecord) {
        throw new Error('Import not found');
      }

      if (importRecord.user_id !== userId) {
        throw new Error('Unauthorized access to import');
      }

      return {
        id: importRecord.id,
        filename: importRecord.filename,
        totalCount: importRecord.total_count,
        processedCount: importRecord.processed_count,
        importedCount: importRecord.imported_count,
        skippedCount: importRecord.skipped_count,
        failedCount: importRecord.failed_count,
        status: importRecord.status,
        errors: importRecord.errors,
        startedAt: importRecord.started_at,
        completedAt: importRecord.completed_at,
        createdAt: importRecord.created_at,
      };
    } catch (error) {
      logger.error('Error getting import status', {
        error: error.message,
        importId,
        userId,
      });
      throw error;
    }
  }

  /**
   * Export contacts to CSV
   * @param {string} userId - User ID
   * @param {string} teamId - Team ID
   * @param {Object} filters - Export filters
   * @returns {Promise<string>} CSV string
   */
  async exportContacts(userId, teamId, filters = {}) {
    try {
      const { generateCSV } = await import('../utils/fileParser.js');

      // Build query
      const where = {
        team_id: teamId,
        deleted_at: null,
      };

      if (filters.whatsappAccountId) {
        // Note: Need to join with conversations or messages to filter by account
        // For now, we'll export all contacts for the team
      }

      if (filters.search) {
        where.OR = [
          { first_name: { contains: filters.search, mode: 'insensitive' } },
          { last_name: { contains: filters.search, mode: 'insensitive' } },
          { phone: { contains: filters.search } },
          { email: { contains: filters.search, mode: 'insensitive' } },
        ];
      }

      if (filters.source) {
        where.source = filters.source;
      }

      if (filters.startDate || filters.endDate) {
        where.created_at = {};
        if (filters.startDate) {
          where.created_at.gte = new Date(filters.startDate);
        }
        if (filters.endDate) {
          where.created_at.lte = new Date(filters.endDate);
        }
      }

      // Fetch contacts
      const contacts = await prisma.contacts.findMany({
        where,
        select: {
          phone: true,
          first_name: true,
          last_name: true,
          email: true,
          company: true,
          city: true,
          country: true,
          source: true,
          engagement_score: true,
          last_contacted_at: true,
          created_at: true,
          notes: true,
        },
        orderBy: {
          created_at: 'desc',
        },
      });

      // Transform contacts for CSV
      const transformedContacts = contacts.map((contact) => ({
        phone: contact.phone,
        name: `${contact.first_name || ''} ${contact.last_name || ''}`.trim(),
        email: contact.email || '',
        company: contact.company || '',
        city: contact.city || '',
        country: contact.country || '',
        source: contact.source || '',
        engagement_score: contact.engagement_score || 0,
        lastMessageAt: contact.last_contacted_at || '',
        totalMessages: 0, // Would need to count from messages table
        createdAt: contact.created_at,
      }));

      const csv = generateCSV(transformedContacts);

      logger.info('Contacts exported', {
        userId,
        teamId,
        totalContacts: contacts.length,
      });

      return csv;
    } catch (error) {
      logger.error('Error exporting contacts', {
        error: error.message,
        userId,
        teamId,
      });
      throw error;
    }
  }

  /**
   * Get all tags for a team
   */
  async getTags(teamId, options = {}) {
    try {
      const { search, page = 1, limit = 50 } = options;

      const where = { team_id: teamId };

      if (search) {
        where.name = {
          contains: search,
          mode: 'insensitive',
        };
      }

      const [tags, total] = await Promise.all([
        prisma.tags.findMany({
          where,
          skip: (page - 1) * limit,
          take: limit,
          orderBy: { name: 'asc' },
          include: {
            _count: {
              select: { contact_tags: true },
            },
          },
        }),
        prisma.tags.count({ where }),
      ]);

      return {
        tags: tags.map((tag) => ({
          ...tag,
          contactCount: tag._count.contact_tags,
        })),
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      logger.error('Error fetching tags', {
        error: error.message,
        teamId,
      });
      throw error;
    }
  }

  /**
   * Perform bulk action on contacts
   */
  async bulkAction(teamId, options) {
    try {
      const { action, contactIds, segmentId, data } = options;

      let targetContactIds = contactIds;

      // If segmentId is provided, get contacts from segment
      if (segmentId) {
        const segmentService = (await import('./segmentService.js')).default;
        const segment = await segmentService.getSegmentById(segmentId, teamId);
        const where = segmentService.buildSegmentQuery(segment.conditions, teamId);

        const contacts = await prisma.contacts.findMany({
          where,
          select: { id: true },
        });

        targetContactIds = contacts.map((c) => c.id);
      }

      if (!targetContactIds || targetContactIds.length === 0) {
        throw new Error('No contacts to process');
      }

      let result = {};

      switch (action) {
        case 'add_tags':
          result = await this.addTagsToContacts(teamId, targetContactIds, data.tagIds);
          break;

        case 'remove_tags':
          result = await this.removeTagsFromContacts(teamId, targetContactIds, data.tagIds);
          break;

        case 'delete':
          result = await this.deleteContacts(teamId, targetContactIds);
          break;

        case 'update_field':
          result = await this.updateContactsField(teamId, targetContactIds, data);
          break;

        default:
          throw new Error(`Unknown action: ${action}`);
      }

      logger.info('Bulk action completed', {
        teamId,
        action,
        contactCount: targetContactIds.length,
      });

      return result;
    } catch (error) {
      logger.error('Error performing bulk action', {
        error: error.message,
        teamId,
      });
      throw error;
    }
  }

  /**
   * Add tags to multiple contacts
   */
  async addTagsToContacts(teamId, contactIds, tagIds) {
    const tags = await prisma.tags.findMany({
      where: {
        id: { in: tagIds },
        team_id: teamId,
      },
    });

    if (tags.length !== tagIds.length) {
      throw new Error('Some tags not found');
    }

    const operations = [];
    for (const contactId of contactIds) {
      for (const tagId of tagIds) {
        operations.push(
          prisma.contact_tags.upsert({
            where: {
              contact_id_tag_id: {
                contact_id: contactId,
                tag_id: tagId,
              },
            },
            create: {
              id: crypto.randomUUID(),
              contact_id: contactId,
              tag_id: tagId,
              created_at: new Date(),
            },
            update: {},
          })
        );
      }
    }

    await Promise.all(operations);

    return {
      contactsUpdated: contactIds.length,
      tagsAdded: tagIds.length,
    };
  }

  /**
   * Remove tags from multiple contacts
   */
  async removeTagsFromContacts(teamId, contactIds, tagIds) {
    const result = await prisma.contact_tags.deleteMany({
      where: {
        contact_id: { in: contactIds },
        tag_id: { in: tagIds },
      },
    });

    return {
      contactsUpdated: contactIds.length,
      tagsRemoved: result.count,
    };
  }

  /**
   * Delete multiple contacts (soft delete)
   */
  async deleteContacts(teamId, contactIds) {
    const result = await prisma.contacts.updateMany({
      where: {
        id: { in: contactIds },
        team_id: teamId,
      },
      data: {
        deleted_at: new Date(),
      },
    });

    return {
      contactsDeleted: result.count,
    };
  }

  /**
   * Update a field on multiple contacts
   */
  async updateContactsField(teamId, contactIds, data) {
    const { field, value } = data;

    const allowedFields = [
      'first_name',
      'last_name',
      'email',
      'company',
      'city',
      'country',
      'source',
      'notes',
      'is_blocked',
    ];

    if (!allowedFields.includes(field)) {
      throw new Error(`Field '${field}' cannot be bulk updated`);
    }

    const result = await prisma.contacts.updateMany({
      where: {
        id: { in: contactIds },
        team_id: teamId,
      },
      data: {
        [field]: value,
        updated_at: new Date(),
      },
    });

    return {
      contactsUpdated: result.count,
      field,
      value,
    };
  }

  /**
   * Add a tag to a contact
   * @param {string} contactId - Contact ID
   * @param {string} tagName - Tag name
   * @param {string} teamId - Team ID
   * @returns {Promise<Object>} Tag
   */
  async addTagToContact(contactId, tagName, teamId) {
    try {
      // Find or create tag
      let tag = await prisma.tags.findFirst({
        where: {
          team_id: teamId,
          name: tagName,
        },
      });

      if (!tag) {
        tag = await prisma.tags.create({
          data: {
            id: crypto.randomUUID(),
            team_id: teamId,
            name: tagName,
            color: '#3B82F6',
            created_at: new Date(),
            updated_at: new Date(),
          },
        });
      }

      // Check if relationship already exists
      const existing = await prisma.contact_tags.findFirst({
        where: {
          contact_id: contactId,
          tag_id: tag.id,
        },
      });

      if (!existing) {
        await prisma.contact_tags.create({
          data: {
            id: crypto.randomUUID(),
            contact_id: contactId,
            tag_id: tag.id,
            created_at: new Date(),
          },
        });

        // Trigger flow event
        const contact = await ContactModel.findById(contactId);
        if (contact) {
          const { triggerOnTagAdded } = await import('./flowTriggers.js');
          await triggerOnTagAdded(contact, tagName);
        }
      }

      return tag;
    } catch (error) {
      logger.error('Error adding tag to contact', {
        error: error.message,
        contactId,
        tagName,
      });
      throw error;
    }
  }

  /**
   * Remove a tag from a contact
   * @param {string} contactId - Contact ID
   * @param {string} tagName - Tag name
   * @param {string} teamId - Team ID
   * @returns {Promise<void>}
   */
  async removeTagFromContact(contactId, tagName, teamId) {
    try {
      // Find tag
      const tag = await prisma.tags.findFirst({
        where: {
          team_id: teamId,
          name: tagName,
        },
      });

      if (tag) {
        await prisma.contact_tags.deleteMany({
          where: {
            contact_id: contactId,
            tag_id: tag.id,
          },
        });

        // Trigger flow event
        const contact = await ContactModel.findById(contactId);
        if (contact) {
          const { triggerOnTagRemoved } = await import('./flowTriggers.js');
          await triggerOnTagRemoved(contact, tagName);
        }
      }
    } catch (error) {
      logger.error('Error removing tag from contact', {
        error: error.message,
        contactId,
        tagName,
      });
      throw error;
    }
  }
}

export default new ContactService();
