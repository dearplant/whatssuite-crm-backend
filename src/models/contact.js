import prisma from '../config/database.js';

/**
 * Contact Model - Maps between camelCase API and snake_case database
 */
class ContactModel {
  /**
   * Map database fields to camelCase
   */
  mapToModel(dbContact) {
    if (!dbContact) return null;

    // Combine first and last name into name field
    const name = [dbContact.first_name, dbContact.last_name].filter(Boolean).join(' ') || undefined;

    return {
      id: dbContact.id,
      teamId: dbContact.team_id,
      phone: dbContact.phone,
      email: dbContact.email,
      name,
      firstName: dbContact.first_name,
      lastName: dbContact.last_name,
      company: dbContact.company,
      city: dbContact.city,
      country: dbContact.country,
      customFields: dbContact.custom_fields,
      engagementScore: dbContact.engagement_score,
      source: dbContact.source,
      notes: dbContact.notes,
      isBlocked: dbContact.is_blocked,
      lastContactedAt: dbContact.last_contacted_at,
      createdAt: dbContact.created_at,
      updatedAt: dbContact.updated_at,
      deletedAt: dbContact.deleted_at,
    };
  }

  /**
   * Create a new contact
   */
  async create(data) {
    const dbContact = await prisma.contacts.create({
      data: {
        id: data.id,
        team_id: data.teamId || data.team_id,
        phone: data.phone,
        email: data.email,
        first_name: data.firstName || data.first_name,
        last_name: data.lastName || data.last_name,
        company: data.company,
        city: data.city,
        country: data.country,
        custom_fields: data.customFields || data.custom_fields || {},
        engagement_score: data.engagementScore || data.engagement_score || 0,
        source: data.source,
        notes: data.notes,
        is_blocked: data.isBlocked || data.is_blocked || false,
        last_contacted_at: data.lastContactedAt || data.last_contacted_at,
        created_at: data.createdAt || data.created_at || new Date(),
        updated_at: data.updatedAt || data.updated_at || new Date(),
      },
    });
    return this.mapToModel(dbContact);
  }

  /**
   * Find contact by ID
   */
  async findById(id) {
    const dbContact = await prisma.contacts.findUnique({
      where: { id },
    });
    return this.mapToModel(dbContact);
  }

  /**
   * Find contact by phone number
   */
  async findByPhone(teamId, phone) {
    const dbContact = await prisma.contacts.findUnique({
      where: {
        team_id_phone: {
          team_id: teamId,
          phone,
        },
      },
    });
    return this.mapToModel(dbContact);
  }

  /**
   * Find contacts by team ID
   */
  async findByTeamId(teamId, options = {}) {
    const { skip = 0, take = 50, orderBy = { created_at: 'desc' } } = options;

    const dbContacts = await prisma.contacts.findMany({
      where: {
        team_id: teamId,
        deleted_at: null,
      },
      skip,
      take,
      orderBy,
    });
    return dbContacts.map((c) => this.mapToModel(c));
  }

  /**
   * Update contact
   */
  async update(id, data) {
    const updateData = { updated_at: new Date() };

    if (data.phone !== undefined) updateData.phone = data.phone;
    if (data.email !== undefined) updateData.email = data.email;
    if (data.firstName !== undefined) updateData.first_name = data.firstName;
    if (data.first_name !== undefined) updateData.first_name = data.first_name;
    if (data.lastName !== undefined) updateData.last_name = data.lastName;
    if (data.last_name !== undefined) updateData.last_name = data.last_name;
    if (data.company !== undefined) updateData.company = data.company;
    if (data.city !== undefined) updateData.city = data.city;
    if (data.country !== undefined) updateData.country = data.country;
    if (data.customFields !== undefined) updateData.custom_fields = data.customFields;
    if (data.custom_fields !== undefined) updateData.custom_fields = data.custom_fields;
    if (data.engagementScore !== undefined) updateData.engagement_score = data.engagementScore;
    if (data.engagement_score !== undefined) updateData.engagement_score = data.engagement_score;
    if (data.source !== undefined) updateData.source = data.source;
    if (data.notes !== undefined) updateData.notes = data.notes;
    if (data.isBlocked !== undefined) updateData.is_blocked = data.isBlocked;
    if (data.is_blocked !== undefined) updateData.is_blocked = data.is_blocked;
    if (data.lastContactedAt !== undefined) updateData.last_contacted_at = data.lastContactedAt;
    if (data.last_contacted_at !== undefined) updateData.last_contacted_at = data.last_contacted_at;

    const dbContact = await prisma.contacts.update({
      where: { id },
      data: updateData,
    });
    return this.mapToModel(dbContact);
  }

  /**
   * Delete contact (soft delete)
   */
  async delete(id) {
    const dbContact = await prisma.contacts.update({
      where: { id },
      data: {
        deleted_at: new Date(),
        updated_at: new Date(),
      },
    });
    return this.mapToModel(dbContact);
  }

  /**
   * Count contacts by team ID
   */
  async countByTeamId(teamId) {
    return await prisma.contacts.count({
      where: {
        team_id: teamId,
        deleted_at: null,
      },
    });
  }

  /**
   * Search contacts
   */
  async search(teamId, searchTerm, options = {}) {
    const { skip = 0, take = 50 } = options;

    const dbContacts = await prisma.contacts.findMany({
      where: {
        team_id: teamId,
        deleted_at: null,
        OR: [
          { first_name: { contains: searchTerm, mode: 'insensitive' } },
          { last_name: { contains: searchTerm, mode: 'insensitive' } },
          { email: { contains: searchTerm, mode: 'insensitive' } },
          { phone: { contains: searchTerm } },
          { company: { contains: searchTerm, mode: 'insensitive' } },
        ],
      },
      skip,
      take,
      orderBy: { created_at: 'desc' },
    });
    return dbContacts.map((c) => this.mapToModel(c));
  }
}

export default new ContactModel();
