import { jest } from '@jest/globals';
import { hashPassword, verifyPassword, validatePasswordStrength } from '../src/utils/password.js';
import { generateAccessToken, verifyToken, extractTokenFromHeader } from '../src/utils/jwt.js';

// Mock config
jest.unstable_mockModule('../src/config/index.js', () => ({
  default: {
    jwt: {
      secret: 'test-secret-key-at-least-32-characters-long',
      accessExpiry: '7d',
      algorithm: 'HS256',
      issuer: 'WhatsApp CRM Backend',
    },
    security: {
      maxLoginAttempts: 5,
      lockoutDuration: 900000,
    },
  },
}));

describe('Authentication Core', () => {
  describe('Password Utilities', () => {
    test('should hash password with bcrypt', async () => {
      const password = 'TestPassword123!';
      const hash = await hashPassword(password);

      expect(hash).toBeDefined();
      expect(hash).not.toBe(password);
      expect(hash.length).toBeGreaterThan(50);
    });

    test('should verify correct password', async () => {
      const password = 'TestPassword123!';
      const hash = await hashPassword(password);
      const isValid = await verifyPassword(password, hash);

      expect(isValid).toBe(true);
    });

    test('should reject incorrect password', async () => {
      const password = 'TestPassword123!';
      const hash = await hashPassword(password);
      const isValid = await verifyPassword('WrongPassword123!', hash);

      expect(isValid).toBe(false);
    });

    test('should validate strong password', () => {
      const result = validatePasswordStrength('StrongPass123!');
      expect(result.valid).toBe(true);
    });

    test('should reject weak password - too short', () => {
      const result = validatePasswordStrength('Short1!');
      expect(result.valid).toBe(false);
      expect(result.message).toContain('at least 8 characters');
    });

    test('should reject weak password - missing requirements', () => {
      const result = validatePasswordStrength('weakpassword');
      expect(result.valid).toBe(false);
      expect(result.message).toContain('uppercase, lowercase, number, and special character');
    });
  });

  describe('JWT Utilities', () => {
    const mockUser = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      email: 'test@example.com',
      role: 'Owner',
    };

    test('should generate valid access token', () => {
      const token = generateAccessToken(mockUser);

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3);
    });

    test('should verify valid token', () => {
      const token = generateAccessToken(mockUser);
      const decoded = verifyToken(token);

      expect(decoded.sub).toBe(mockUser.id);
      expect(decoded.email).toBe(mockUser.email);
      expect(decoded.role).toBe(mockUser.role);
    });

    test('should throw error for invalid token', () => {
      expect(() => {
        verifyToken('invalid.token.here');
      }).toThrow('Invalid token');
    });

    test('should extract token from Bearer header', () => {
      const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test.token';
      const authHeader = `Bearer ${token}`;
      const extracted = extractTokenFromHeader(authHeader);

      expect(extracted).toBe(token);
    });

    test('should return null for invalid header format', () => {
      const extracted = extractTokenFromHeader('InvalidFormat token');
      expect(extracted).toBeNull();
    });

    test('should return null for missing header', () => {
      const extracted = extractTokenFromHeader(null);
      expect(extracted).toBeNull();
    });
  });
});
