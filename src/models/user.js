import prisma from '../config/database.js';

/**
 * User Model - Database queries for user operations
 * Maps between camelCase API and snake_case database fields
 */
class UserModel {
  /**
   * Map database fields to camelCase
   */
  mapToModel(dbUser) {
    if (!dbUser) return null;
    return {
      id: dbUser.id,
      email: dbUser.email,
      password: dbUser.password_hash,
      firstName: dbUser.first_name,
      lastName: dbUser.last_name,
      phone: dbUser.phone,
      avatarUrl: dbUser.avatar_url,
      timezone: dbUser.timezone,
      language: dbUser.language,
      isActive: dbUser.is_active,
      emailVerifiedAt: dbUser.email_verified_at,
      lastLoginAt: dbUser.last_login_at,
      createdAt: dbUser.created_at,
      updatedAt: dbUser.updated_at,
      deletedAt: dbUser.deleted_at,
    };
  }

  /**
   * Create a new user
   * @param {Object} data - User data
   * @returns {Promise<Object>} Created user
   */
  async create(data) {
    const crypto = await import('crypto');
    const dbUser = await prisma.users.create({
      data: {
        id: data.id || crypto.randomUUID(),
        email: data.email,
        password_hash: data.password || data.password_hash,
        first_name: data.firstName || data.first_name,
        last_name: data.lastName || data.last_name,
        phone: data.phone,
        avatar_url: data.avatarUrl || data.avatar_url,
        timezone: data.timezone || 'UTC',
        language: data.language || 'en',
        is_active: data.isActive !== undefined ? data.isActive : true,
        email_verified_at: data.emailVerifiedAt || data.email_verified_at,
        created_at: data.createdAt || data.created_at || new Date(),
        updated_at: data.updatedAt || data.updated_at || new Date(),
      },
    });
    const user = this.mapToModel(dbUser);
    delete user.password; // Don't return password
    return user;
  }

  /**
   * Find user by email
   * @param {string} email - User email
   * @param {boolean} includePassword - Include password in result
   * @returns {Promise<Object|null>} User or null
   */
  async findByEmail(email, includePassword = false) {
    const dbUser = await prisma.users.findUnique({
      where: { email },
    });
    
    const user = this.mapToModel(dbUser);
    if (user && !includePassword) {
      delete user.password;
    }
    return user;
  }

  /**
   * Find user by ID
   * @param {string} id - User ID
   * @returns {Promise<Object|null>} User or null
   */
  async findById(id) {
    const dbUser = await prisma.users.findUnique({
      where: { id },
    });
    const user = this.mapToModel(dbUser);
    if (user) {
      delete user.password;
    }
    return user;
  }

  /**
   * Update user by ID
   * @param {string} id - User ID
   * @param {Object} data - Update data
   * @returns {Promise<Object>} Updated user
   */
  async update(id, data) {
    const updateData = {};
    
    if (data.email !== undefined) updateData.email = data.email;
    if (data.password !== undefined) updateData.password_hash = data.password;
    if (data.password_hash !== undefined) updateData.password_hash = data.password_hash;
    if (data.firstName !== undefined) updateData.first_name = data.firstName;
    if (data.first_name !== undefined) updateData.first_name = data.first_name;
    if (data.lastName !== undefined) updateData.last_name = data.lastName;
    if (data.last_name !== undefined) updateData.last_name = data.last_name;
    if (data.phone !== undefined) updateData.phone = data.phone;
    if (data.avatarUrl !== undefined) updateData.avatar_url = data.avatarUrl;
    if (data.avatar_url !== undefined) updateData.avatar_url = data.avatar_url;
    if (data.timezone !== undefined) updateData.timezone = data.timezone;
    if (data.language !== undefined) updateData.language = data.language;
    if (data.isActive !== undefined) updateData.is_active = data.isActive;
    if (data.is_active !== undefined) updateData.is_active = data.is_active;
    if (data.emailVerifiedAt !== undefined) updateData.email_verified_at = data.emailVerifiedAt;
    if (data.email_verified_at !== undefined) updateData.email_verified_at = data.email_verified_at;
    if (data.lastLoginAt !== undefined) updateData.last_login_at = data.lastLoginAt;
    if (data.last_login_at !== undefined) updateData.last_login_at = data.last_login_at;
    if (data.deletedAt !== undefined) updateData.deleted_at = data.deletedAt;
    if (data.deleted_at !== undefined) updateData.deleted_at = data.deleted_at;
    
    updateData.updated_at = new Date();

    const dbUser = await prisma.users.update({
      where: { id },
      data: updateData,
    });
    
    const user = this.mapToModel(dbUser);
    delete user.password;
    return user;
  }

  /**
   * Update last login timestamp
   * @param {string} id - User ID
   * @returns {Promise<Object>} Updated user
   */
  async updateLastLogin(id) {
    const dbUser = await prisma.users.update({
      where: { id },
      data: {
        last_login_at: new Date(),
        updated_at: new Date(),
      },
    });
    const user = this.mapToModel(dbUser);
    delete user.password;
    return user;
  }

  /**
   * Delete user (soft delete)
   * @param {string} id - User ID
   * @returns {Promise<Object>} Updated user
   */
  async delete(id) {
    const dbUser = await prisma.users.update({
      where: { id },
      data: {
        deleted_at: new Date(),
        updated_at: new Date(),
      },
    });
    const user = this.mapToModel(dbUser);
    delete user.password;
    return user;
  }

  /**
   * Increment login attempts
   * @param {string} id - User ID
   * @returns {Promise<Object>} Updated user
   */
  async incrementLoginAttempts(id) {
    // Note: login_attempts and locked_until fields don't exist in current schema
    // This is a placeholder for future implementation
    return this.findById(id);
  }

  /**
   * Reset login attempts
   * @param {string} id - User ID
   * @returns {Promise<Object>} Updated user
   */
  async resetLoginAttempts(id) {
    // Note: login_attempts and locked_until fields don't exist in current schema
    // This is a placeholder for future implementation
    return this.findById(id);
  }

  /**
   * Lock user account
   * @param {string} id - User ID
   * @param {number} duration - Lock duration in milliseconds
   * @returns {Promise<Object>} Updated user
   */
  async lockAccount(id, duration) {
    // Note: locked_until field doesn't exist in current schema
    // This is a placeholder for future implementation
    return this.findById(id);
  }

  /**
   * Set password reset token
   * @param {string} email - User email
   * @param {string} token - Reset token
   * @param {Date} expires - Token expiration
   * @returns {Promise<Object>} Updated user
   */
  async setPasswordResetToken(email, token, expires) {
    // Note: password_reset_token and password_reset_expires fields don't exist in current schema
    // This is a placeholder for future implementation
    return this.findByEmail(email);
  }

  /**
   * Clear password reset token
   * @param {string} id - User ID
   * @returns {Promise<Object>} Updated user
   */
  async clearPasswordResetToken(id) {
    // Note: password_reset_token and password_reset_expires fields don't exist in current schema
    // This is a placeholder for future implementation
    return this.findById(id);
  }

  /**
   * Find user by password reset token
   * @param {string} token - Reset token
   * @returns {Promise<Object|null>} User or null
   */
  async findByPasswordResetToken(token) {
    // Note: password_reset_token field doesn't exist in current schema
    // This is a placeholder for future implementation
    return null;
  }

  /**
   * Verify email
   * @param {string} token - Verification token
   * @returns {Promise<Object>} Result with count
   */
  async verifyEmail(token) {
    // Note: email_verification_token field doesn't exist in current schema
    // This is a placeholder for future implementation
    return { count: 0 };
  }
}

export default new UserModel();
