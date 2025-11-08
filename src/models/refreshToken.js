import prisma from '../config/database.js';

/**
 * Refresh Token Model - Prisma implementation
 */
class RefreshTokenModel {
  /**
   * Create a new refresh token
   * @param {Object} data - Token data
   * @returns {Promise<Object>} Created token
   */
  async create(data) {
    return await prisma.refresh_tokens.create({
      data: {
        id: data.id,
        user_id: data.userId,
        token: data.token,
        expires_at: data.expiresAt,
      },
    });
  }

  /**
   * Find token by ID
   * @param {string} id - Token ID
   * @returns {Promise<Object|null>} Token or null
   */
  async findById(id) {
    const token = await prisma.refresh_tokens.findUnique({
      where: { id },
      include: { user: true },
    });

    if (!token) return null;

    return {
      id: token.id,
      userId: token.user_id,
      token: token.token,
      expiresAt: token.expires_at,
      createdAt: token.created_at,
      user: token.user
        ? {
            id: token.user.id,
            email: token.user.email,
            firstName: token.user.first_name,
            lastName: token.user.last_name,
            isActive: token.user.is_active,
          }
        : null,
    };
  }

  /**
   * Find token by token string
   * @param {string} tokenString - Token string
   * @returns {Promise<Object|null>} Token or null with user
   */
  async findByToken(tokenString) {
    const token = await prisma.refresh_tokens.findFirst({
      where: { token: tokenString },
      include: { user: true },
    });

    if (!token) return null;

    return {
      id: token.id,
      userId: token.user_id,
      token: token.token,
      expiresAt: token.expires_at,
      createdAt: token.created_at,
      revokedAt: null, // Add if you have this field
      user: token.user
        ? {
            id: token.user.id,
            email: token.user.email,
            firstName: token.user.first_name,
            lastName: token.user.last_name,
            isActive: token.user.is_active,
          }
        : null,
    };
  }

  /**
   * Delete token by ID
   * @param {string} id - Token ID
   * @returns {Promise<void>}
   */
  async delete(id) {
    await prisma.refresh_tokens.delete({
      where: { id },
    });
  }

  /**
   * Revoke token by token string
   * @param {string} tokenString - Token string
   * @returns {Promise<void>}
   */
  async revoke(tokenString) {
    await prisma.refresh_tokens.deleteMany({
      where: { token: tokenString },
    });
  }

  /**
   * Delete all tokens for a user
   * @param {string} userId - User ID
   * @returns {Promise<void>}
   */
  async deleteByUserId(userId) {
    await prisma.refresh_tokens.deleteMany({
      where: { user_id: userId },
    });
  }

  /**
   * Revoke all tokens for a user
   * @param {string} userId - User ID
   * @returns {Promise<void>}
   */
  async revokeAllForUser(userId) {
    await prisma.refresh_tokens.deleteMany({
      where: { user_id: userId },
    });
  }

  /**
   * Delete expired tokens
   * @returns {Promise<number>} Number of deleted tokens
   */
  async deleteExpired() {
    const result = await prisma.refresh_tokens.deleteMany({
      where: {
        expires_at: {
          lt: new Date(),
        },
      },
    });

    return result.count;
  }
}

export default new RefreshTokenModel();
