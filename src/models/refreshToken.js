/**
 * Refresh Token Model - In-memory implementation
 * Note: This should be replaced with a proper database table
 */

// In-memory storage for refresh tokens
const tokens = new Map();

class RefreshTokenModel {
  /**
   * Create a new refresh token
   * @param {Object} data - Token data
   * @returns {Promise<Object>} Created token
   */
  async create(data) {
    const token = {
      id: data.id,
      userId: data.userId,
      token: data.token,
      expiresAt: data.expiresAt,
      createdAt: new Date(),
    };
    
    tokens.set(data.id, token);
    return token;
  }

  /**
   * Find token by ID
   * @param {string} id - Token ID
   * @returns {Promise<Object|null>} Token or null
   */
  async findById(id) {
    return tokens.get(id) || null;
  }

  /**
   * Find token by token string
   * @param {string} tokenString - Token string
   * @returns {Promise<Object|null>} Token or null
   */
  async findByToken(tokenString) {
    for (const token of tokens.values()) {
      if (token.token === tokenString) {
        return token;
      }
    }
    return null;
  }

  /**
   * Delete token by ID
   * @param {string} id - Token ID
   * @returns {Promise<void>}
   */
  async delete(id) {
    tokens.delete(id);
  }

  /**
   * Delete all tokens for a user
   * @param {string} userId - User ID
   * @returns {Promise<void>}
   */
  async deleteByUserId(userId) {
    for (const [id, token] of tokens.entries()) {
      if (token.userId === userId) {
        tokens.delete(id);
      }
    }
  }

  /**
   * Delete expired tokens
   * @returns {Promise<number>} Number of deleted tokens
   */
  async deleteExpired() {
    const now = new Date();
    let count = 0;
    
    for (const [id, token] of tokens.entries()) {
      if (token.expiresAt < now) {
        tokens.delete(id);
        count++;
      }
    }
    
    return count;
  }
}

export default new RefreshTokenModel();
