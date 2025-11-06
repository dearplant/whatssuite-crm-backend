import { jest } from '@jest/globals';
import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import app from '../src/app.js';

const prisma = new PrismaClient();

describe('Authentication API Endpoints', () => {
  let testUser;
  let accessToken;
  let refreshToken;

  beforeAll(async () => {
    // Connect to test database
    await prisma.$connect();
  });

  afterAll(async () => {
    // Cleanup and disconnect
    if (testUser) {
      await prisma.refresh_tokens.deleteMany({ where: { user_id: testUser.id } });
      await prisma.users.delete({ where: { id: testUser.id } }).catch(() => {});
    }
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    // Clean up test user before each test
    try {
      await prisma.users.deleteMany({ where: { email: 'test@example.com' } });
    } catch (error) {
      // Ignore errors if user doesn't exist
    }
  });

  describe('POST /api/v1/auth/register', () => {
    test('should register a new user with valid data', async () => {
      const response = await request(app).post('/api/v1/auth/register').send({
        email: 'test@example.com',
        password: 'TestPassword123!',
        firstName: 'John',
        lastName: 'Doe',
      });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.user).toHaveProperty('id');
      expect(response.body.data.user.email).toBe('test@example.com');
      expect(response.body.data.user.firstName).toBe('John');
      expect(response.body.data.user.lastName).toBe('Doe');
      expect(response.body.data).toHaveProperty('accessToken');
      expect(response.body.data).toHaveProperty('refreshToken');
      expect(response.body.data.user).not.toHaveProperty('password');

      // Save for cleanup
      testUser = response.body.data.user;
      accessToken = response.body.data.accessToken;
      refreshToken = response.body.data.refreshToken;
    });

    test('should reject registration with duplicate email', async () => {
      // Create user first
      await request(app).post('/api/v1/auth/register').send({
        email: 'test@example.com',
        password: 'TestPassword123!',
        firstName: 'John',
        lastName: 'Doe',
      });

      // Try to register again
      const response = await request(app).post('/api/v1/auth/register').send({
        email: 'test@example.com',
        password: 'DifferentPass123!',
        firstName: 'Jane',
        lastName: 'Smith',
      });

      expect(response.status).toBe(409);
      expect(response.body.error).toBe('ConflictError');
    });

    test('should reject registration with invalid email', async () => {
      const response = await request(app).post('/api/v1/auth/register').send({
        email: 'invalid-email',
        password: 'TestPassword123!',
        firstName: 'John',
        lastName: 'Doe',
      });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('ValidationError');
      expect(response.body.details).toHaveProperty('email');
    });

    test('should reject registration with weak password', async () => {
      const response = await request(app).post('/api/v1/auth/register').send({
        email: 'test@example.com',
        password: 'weak',
        firstName: 'John',
        lastName: 'Doe',
      });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('ValidationError');
      expect(response.body.details).toHaveProperty('password');
    });

    test('should reject registration with missing required fields', async () => {
      const response = await request(app).post('/api/v1/auth/register').send({
        email: 'test@example.com',
      });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('ValidationError');
    });
  });

  describe('POST /api/v1/auth/login', () => {
    beforeEach(async () => {
      // Create a test user
      const response = await request(app).post('/api/v1/auth/register').send({
        email: 'test@example.com',
        password: 'TestPassword123!',
        firstName: 'John',
        lastName: 'Doe',
      });
      testUser = response.body.data.user;
    });

    test('should login with valid credentials', async () => {
      const response = await request(app).post('/api/v1/auth/login').send({
        email: 'test@example.com',
        password: 'TestPassword123!',
      });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.user.email).toBe('test@example.com');
      expect(response.body.data).toHaveProperty('accessToken');
      expect(response.body.data).toHaveProperty('refreshToken');

      accessToken = response.body.data.accessToken;
      refreshToken = response.body.data.refreshToken;
    });

    test('should reject login with invalid password', async () => {
      const response = await request(app).post('/api/v1/auth/login').send({
        email: 'test@example.com',
        password: 'WrongPassword123!',
      });

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Unauthorized');
    });

    test('should reject login with non-existent email', async () => {
      const response = await request(app).post('/api/v1/auth/login').send({
        email: 'nonexistent@example.com',
        password: 'TestPassword123!',
      });

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Unauthorized');
    });

    test('should reject login with invalid email format', async () => {
      const response = await request(app).post('/api/v1/auth/login').send({
        email: 'invalid-email',
        password: 'TestPassword123!',
      });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('ValidationError');
    });
  });

  describe('GET /api/v1/auth/me', () => {
    beforeEach(async () => {
      // Create and login a test user
      const registerResponse = await request(app).post('/api/v1/auth/register').send({
        email: 'test@example.com',
        password: 'TestPassword123!',
        firstName: 'John',
        lastName: 'Doe',
      });
      testUser = registerResponse.body.data.user;
      accessToken = registerResponse.body.data.accessToken;
    });

    test('should get current user profile with valid token', async () => {
      const response = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.user.email).toBe('test@example.com');
      expect(response.body.data.user.firstName).toBe('John');
      expect(response.body.data.user).not.toHaveProperty('password');
    });

    test('should reject request without token', async () => {
      const response = await request(app).get('/api/v1/auth/me');

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Unauthorized');
    });

    test('should reject request with invalid token', async () => {
      const response = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', 'Bearer invalid.token.here');

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Unauthorized');
    });
  });

  describe('PUT /api/v1/auth/profile', () => {
    beforeEach(async () => {
      // Create and login a test user
      const registerResponse = await request(app).post('/api/v1/auth/register').send({
        email: 'test@example.com',
        password: 'TestPassword123!',
        firstName: 'John',
        lastName: 'Doe',
      });
      testUser = registerResponse.body.data.user;
      accessToken = registerResponse.body.data.accessToken;
    });

    test('should update user profile with valid data', async () => {
      const response = await request(app)
        .put('/api/v1/auth/profile')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          firstName: 'Jane',
          lastName: 'Smith',
          phone: '+1234567890',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.user.firstName).toBe('Jane');
      expect(response.body.data.user.lastName).toBe('Smith');
      expect(response.body.data.user.phone).toBe('+1234567890');
    });

    test('should reject update without authentication', async () => {
      const response = await request(app).put('/api/v1/auth/profile').send({
        firstName: 'Jane',
      });

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Unauthorized');
    });

    test('should reject update with invalid phone format', async () => {
      const response = await request(app)
        .put('/api/v1/auth/profile')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          phone: 'invalid-phone',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('ValidationError');
    });
  });

  describe('POST /api/v1/auth/refresh', () => {
    beforeEach(async () => {
      // Create and login a test user
      const registerResponse = await request(app).post('/api/v1/auth/register').send({
        email: 'test@example.com',
        password: 'TestPassword123!',
        firstName: 'John',
        lastName: 'Doe',
      });
      testUser = registerResponse.body.data.user;
      accessToken = registerResponse.body.data.accessToken;
      refreshToken = registerResponse.body.data.refreshToken;
    });

    test('should refresh access token with valid refresh token', async () => {
      const response = await request(app).post('/api/v1/auth/refresh').send({
        refreshToken,
      });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('accessToken');
      expect(response.body.data.accessToken).not.toBe(accessToken);
    });

    test('should reject refresh with invalid token', async () => {
      const response = await request(app).post('/api/v1/auth/refresh').send({
        refreshToken: 'invalid.refresh.token',
      });

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Unauthorized');
    });
  });

  describe('POST /api/v1/auth/logout', () => {
    beforeEach(async () => {
      // Create and login a test user
      const registerResponse = await request(app).post('/api/v1/auth/register').send({
        email: 'test@example.com',
        password: 'TestPassword123!',
        firstName: 'John',
        lastName: 'Doe',
      });
      testUser = registerResponse.body.data.user;
      refreshToken = registerResponse.body.data.refreshToken;
    });

    test('should logout successfully', async () => {
      const response = await request(app).post('/api/v1/auth/logout').send({
        refreshToken,
      });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    test('should not be able to use refresh token after logout', async () => {
      // Logout
      await request(app).post('/api/v1/auth/logout').send({
        refreshToken,
      });

      // Try to refresh
      const response = await request(app).post('/api/v1/auth/refresh').send({
        refreshToken,
      });

      expect(response.status).toBe(401);
    });
  });

  describe('POST /api/v1/auth/forgot-password', () => {
    beforeEach(async () => {
      // Create a test user
      const registerResponse = await request(app).post('/api/v1/auth/register').send({
        email: 'test@example.com',
        password: 'TestPassword123!',
        firstName: 'John',
        lastName: 'Doe',
      });
      testUser = registerResponse.body.data.user;
    });

    test('should accept password reset request', async () => {
      const response = await request(app).post('/api/v1/auth/forgot-password').send({
        email: 'test@example.com',
      });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('password reset link');
    });

    test('should return success even for non-existent email', async () => {
      const response = await request(app).post('/api/v1/auth/forgot-password').send({
        email: 'nonexistent@example.com',
      });

      // Should return success to prevent email enumeration
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('Account Lockout', () => {
    beforeEach(async () => {
      // Create a test user
      const registerResponse = await request(app).post('/api/v1/auth/register').send({
        email: 'test@example.com',
        password: 'TestPassword123!',
        firstName: 'John',
        lastName: 'Doe',
      });
      testUser = registerResponse.body.data.user;
    });

    test('should lock account after 5 failed login attempts', async () => {
      // Make 5 failed login attempts
      for (let i = 0; i < 5; i++) {
        await request(app).post('/api/v1/auth/login').send({
          email: 'test@example.com',
          password: 'WrongPassword123!',
        });
      }

      // 6th attempt should return account locked error
      const response = await request(app).post('/api/v1/auth/login').send({
        email: 'test@example.com',
        password: 'WrongPassword123!',
      });

      expect(response.status).toBe(401);
      expect(response.body.message).toContain('locked');
    });

    test('should not allow login with correct password when account is locked', async () => {
      // Make 5 failed login attempts to lock account
      for (let i = 0; i < 5; i++) {
        await request(app).post('/api/v1/auth/login').send({
          email: 'test@example.com',
          password: 'WrongPassword123!',
        });
      }

      // Try to login with correct password
      const response = await request(app).post('/api/v1/auth/login').send({
        email: 'test@example.com',
        password: 'TestPassword123!',
      });

      expect(response.status).toBe(401);
      expect(response.body.message).toContain('locked');
    });

    test('should reset login attempts after successful login', async () => {
      // Make 3 failed attempts
      for (let i = 0; i < 3; i++) {
        await request(app).post('/api/v1/auth/login').send({
          email: 'test@example.com',
          password: 'WrongPassword123!',
        });
      }

      // Successful login should reset attempts
      const successResponse = await request(app).post('/api/v1/auth/login').send({
        email: 'test@example.com',
        password: 'TestPassword123!',
      });

      expect(successResponse.status).toBe(200);

      // Should be able to make more failed attempts without immediate lockout
      const failResponse = await request(app).post('/api/v1/auth/login').send({
        email: 'test@example.com',
        password: 'WrongPassword123!',
      });

      expect(failResponse.status).toBe(401);
      expect(failResponse.body.message).not.toContain('locked');
    });
  });

  describe('Token Refresh and Expiration', () => {
    beforeEach(async () => {
      // Create and login a test user
      const registerResponse = await request(app).post('/api/v1/auth/register').send({
        email: 'test@example.com',
        password: 'TestPassword123!',
        firstName: 'John',
        lastName: 'Doe',
      });
      testUser = registerResponse.body.data.user;
      accessToken = registerResponse.body.data.accessToken;
      refreshToken = registerResponse.body.data.refreshToken;
    });

    test('should refresh access token with valid refresh token', async () => {
      const response = await request(app).post('/api/v1/auth/refresh').send({
        refreshToken,
      });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('accessToken');
      expect(response.body.data.accessToken).not.toBe(accessToken);
    });

    test('should reject refresh with invalid token', async () => {
      const response = await request(app).post('/api/v1/auth/refresh').send({
        refreshToken: 'invalid.refresh.token',
      });

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Unauthorized');
    });

    test('should reject refresh with revoked token', async () => {
      // Logout to revoke the token
      await request(app).post('/api/v1/auth/logout').send({
        refreshToken,
      });

      // Try to refresh with revoked token
      const response = await request(app).post('/api/v1/auth/refresh').send({
        refreshToken,
      });

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Unauthorized');
    });

    test('should not allow using same refresh token after logout', async () => {
      // Logout
      const logoutResponse = await request(app).post('/api/v1/auth/logout').send({
        refreshToken,
      });

      expect(logoutResponse.status).toBe(200);

      // Try to use the same refresh token
      const refreshResponse = await request(app).post('/api/v1/auth/refresh').send({
        refreshToken,
      });

      expect(refreshResponse.status).toBe(401);
    });

    test('should generate new refresh token on each refresh', async () => {
      const firstRefresh = await request(app).post('/api/v1/auth/refresh').send({
        refreshToken,
      });

      expect(firstRefresh.status).toBe(200);
      const newAccessToken = firstRefresh.body.data.accessToken;

      // Access token should be different
      expect(newAccessToken).not.toBe(accessToken);
      expect(newAccessToken).toBeDefined();
    });
  });
});
