import { jest } from '@jest/globals';
import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';
import app from '../src/app.js';

const prisma = new PrismaClient();

// Shared test user across all test suites
let sharedTestUser;
let sharedAccessToken;
let sharedWhatsappAccount;

// Global setup before all tests
beforeAll(async () => {
  await prisma.$connect();

  // Clean up any existing test data
  await prisma.contacts.deleteMany({ where: { phone: { startsWith: '+198765' } } });
  await prisma.whatsapp_accounts.deleteMany({ where: { phone: '+1234567890' } });
  await prisma.users.deleteMany({ where: { email: 'contacttest@example.com' } });

  // Create test user directly in database
  const bcrypt = await import('bcryptjs');
  const hashedPassword = await bcrypt.hash('TestPassword123!', 12);
  
  sharedTestUser = await prisma.users.create({
    data: {
      id: crypto.randomUUID(),
      email: 'contacttest@example.com',
      password_hash: hashedPassword,
      first_name: 'Contact',
      last_name: 'Tester',
      created_at: new Date(),
      updated_at: new Date(),
    },
  });

  // Create team for the user
  const team = await prisma.teams.create({
    data: {
      id: crypto.randomUUID(),
      name: 'Test Team',
      slug: 'test-team-' + Date.now(),
      owner_id: sharedTestUser.id,
      created_at: new Date(),
      updated_at: new Date(),
    },
  });

  sharedTestUser.teamId = team.id;

  // Login to get access token
  const loginResponse = await request(app).post('/api/v1/auth/login').send({
    email: 'contacttest@example.com',
    password: 'TestPassword123!',
  });

  if (!loginResponse.body || !loginResponse.body.data || !loginResponse.body.data.accessToken) {
    console.error('Login failed:', loginResponse.body);
    throw new Error('Failed to login test user');
  }

  sharedAccessToken = loginResponse.body.data.accessToken;

  // Create WhatsApp account for testing
  sharedWhatsappAccount = await prisma.whatsapp_accounts.create({
    data: {
      id: crypto.randomUUID(),
      team_id: team.id,
      user_id: sharedTestUser.id,
      name: 'Test Account',
      phone: '+1234567890',
      type: 'business',
      status: 'connected',
      created_at: new Date(),
      updated_at: new Date(),
    },
  });
});

// Global cleanup after all tests
afterAll(async () => {
  if (sharedTestUser) {
    // Clean up all test data
    await prisma.contact_tags.deleteMany({ where: { contacts: { team_id: sharedTestUser.teamId } } });
    await prisma.contacts.deleteMany({ where: { team_id: sharedTestUser.teamId } });
    await prisma.tags.deleteMany({ where: { team_id: sharedTestUser.teamId } });
    await prisma.segments.deleteMany({ where: { team_id: sharedTestUser.teamId } }).catch(() => {});
    await prisma.whatsapp_accounts.deleteMany({ where: { team_id: sharedTestUser.teamId } });
    await prisma.teams.deleteMany({ where: { id: sharedTestUser.teamId } });
    await prisma.users.deleteMany({ where: { id: sharedTestUser.id } });
  }
  await prisma.$disconnect();
});

describe('Contact CRUD Operations', () => {
  let testUser;
  let accessToken;
  let whatsappAccount;
  let testContact;

  beforeAll(async () => {
    // Use shared test data
    testUser = sharedTestUser;
    accessToken = sharedAccessToken;
    whatsappAccount = sharedWhatsappAccount;
  });

  afterAll(async () => {
    // Cleanup is handled by the last test suite
  });

  describe('POST /api/v1/contacts', () => {
    test('should create a new contact with valid data', async () => {
      const response = await request(app)
        .post('/api/v1/contacts')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          whatsappAccountId: whatsappAccount.id,
          phone: '+1987654321',
          name: 'John Doe',
          email: 'john@example.com',
          company: 'Test Company',
          tags: ['customer', 'vip'],
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data.phone).toBe('+1987654321');
      expect(response.body.data.name).toBe('John Doe');
      expect(response.body.data.email).toBe('john@example.com');
      expect(response.body.data.tags).toEqual(['customer', 'vip']);

      testContact = response.body.data;
    });

    test('should reject duplicate contact with same phone', async () => {
      const response = await request(app)
        .post('/api/v1/contacts')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          whatsappAccountId: whatsappAccount.id,
          phone: '+1987654321',
          name: 'Jane Doe',
        });

      expect(response.status).toBe(409);
      expect(response.body.error).toBe('Conflict');
    });

    test('should reject invalid phone format', async () => {
      const response = await request(app)
        .post('/api/v1/contacts')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          whatsappAccountId: whatsappAccount.id,
          phone: '123456',
          name: 'Invalid Phone',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('ValidationError');
      expect(response.body.details).toHaveProperty('phone');
    });

    test('should reject missing required fields', async () => {
      const response = await request(app)
        .post('/api/v1/contacts')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          whatsappAccountId: whatsappAccount.id,
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('ValidationError');
    });

    test('should reject unauthorized access', async () => {
      const response = await request(app).post('/api/v1/contacts').send({
        whatsappAccountId: whatsappAccount.id,
        phone: '+1111111111',
        name: 'Unauthorized',
      });

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/v1/contacts', () => {
    test('should retrieve contacts with pagination', async () => {
      const response = await request(app)
        .get('/api/v1/contacts')
        .set('Authorization', `Bearer ${accessToken}`)
        .query({ page: 1, limit: 10 });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.pagination).toHaveProperty('page');
      expect(response.body.pagination).toHaveProperty('limit');
      expect(response.body.pagination).toHaveProperty('total');
      expect(response.body.pagination).toHaveProperty('totalPages');
    });

    test('should filter contacts by search term', async () => {
      const response = await request(app)
        .get('/api/v1/contacts')
        .set('Authorization', `Bearer ${accessToken}`)
        .query({ search: 'John' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
    });

    test('should filter contacts by tags', async () => {
      const response = await request(app)
        .get('/api/v1/contacts')
        .set('Authorization', `Bearer ${accessToken}`)
        .query({ tags: 'customer' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    test('should filter contacts by WhatsApp account', async () => {
      const response = await request(app)
        .get('/api/v1/contacts')
        .set('Authorization', `Bearer ${accessToken}`)
        .query({ whatsappAccountId: whatsappAccount.id });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('GET /api/v1/contacts/:id', () => {
    test('should retrieve contact by ID with related data', async () => {
      const response = await request(app)
        .get(`/api/v1/contacts/${testContact.id}`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(testContact.id);
      expect(response.body.data).toHaveProperty('whatsappAccount');
      expect(response.body.data).toHaveProperty('messages');
      expect(response.body.data).toHaveProperty('_count');
    });

    test('should return 404 for non-existent contact', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const response = await request(app)
        .get(`/api/v1/contacts/${fakeId}`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('NotFound');
    });
  });

  describe('PUT /api/v1/contacts/:id', () => {
    test('should update contact with valid data', async () => {
      const response = await request(app)
        .put(`/api/v1/contacts/${testContact.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          name: 'John Updated',
          company: 'Updated Company',
          tags: ['customer', 'premium'],
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe('John Updated');
      expect(response.body.data.company).toBe('Updated Company');
      expect(response.body.data.tags).toEqual(['customer', 'premium']);
    });

    test('should update contact with partial data', async () => {
      const response = await request(app)
        .put(`/api/v1/contacts/${testContact.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          email: 'newemail@example.com',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.email).toBe('newemail@example.com');
    });

    test('should return 404 for non-existent contact', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const response = await request(app)
        .put(`/api/v1/contacts/${fakeId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          name: 'Updated Name',
        });

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('NotFound');
    });

    test('should reject empty update', async () => {
      const response = await request(app)
        .put(`/api/v1/contacts/${testContact.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('ValidationError');
    });
  });

  describe('DELETE /api/v1/contacts/:id', () => {
    test('should soft delete contact', async () => {
      const response = await request(app)
        .delete(`/api/v1/contacts/${testContact.id}`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      // Verify soft delete
      const deletedContact = await prisma.contacts.findUnique({
        where: { id: testContact.id },
      });
      expect(deletedContact.deleted_at).not.toBeNull();
    });

    test('should return 404 for non-existent contact', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const response = await request(app)
        .delete(`/api/v1/contacts/${fakeId}`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('NotFound');
    });
  });

  describe('Contact Import/Export', () => {
    test('should export contacts to CSV', async () => {
      // Create a contact for export test
      await request(app)
        .post('/api/v1/contacts')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          whatsappAccountId: whatsappAccount.id,
          phone: '+19876543299',
          name: 'Export Test',
          email: 'export@example.com',
        });

      const response = await request(app)
        .get('/api/v1/contacts/export')
        .set('Authorization', `Bearer ${accessToken}`)
        .query({ whatsappAccountId: whatsappAccount.id });

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toContain('text/csv');
      expect(response.text).toContain('phone');
      expect(response.text).toContain('name');
    });

    test('should reject import without file', async () => {
      const response = await request(app)
        .post('/api/v1/contacts/import')
        .set('Authorization', `Bearer ${accessToken}`)
        .field('whatsappAccountId', whatsappAccount.id);

      expect(response.status).toBe(400);
    });

    test('should accept CSV import and return job ID', async () => {
      const csvContent = 'phone,name,email\n+19876543210,Test Import,test@example.com';
      
      const response = await request(app)
        .post('/api/v1/contacts/import')
        .set('Authorization', `Bearer ${accessToken}`)
        .field('whatsappAccountId', whatsappAccount.id)
        .attach('file', Buffer.from(csvContent), 'contacts.csv');

      expect(response.status).toBe(202);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('importId');
      expect(response.body.data).toHaveProperty('jobId');
      expect(response.body.data.totalContacts).toBe(1);
    });
  });
});


describe('Contact Segmentation', () => {
  let testSegment;
  let testTag;
  let segmentContacts = [];
  let testUser;
  let accessToken;

  beforeAll(async () => {
    // Use shared test user
    testUser = sharedTestUser;
    accessToken = sharedAccessToken;

    // Create test tag
    testTag = await prisma.tags.create({
      data: {
        id: crypto.randomUUID(),
        team_id: testUser.teamId,
        name: 'Test Segment Tag',
        color: '#FF0000',
        created_at: new Date(),
        updated_at: new Date(),
      },
    });

    // Create multiple contacts for segmentation testing
    for (let i = 0; i < 5; i++) {
      const contact = await prisma.contacts.create({
        data: {
          id: crypto.randomUUID(),
          team_id: testUser.teamId,
          phone: `+19876543${i}0`,
          first_name: `Test${i}`,
          last_name: 'User',
          email: `test${i}@example.com`,
          company: i % 2 === 0 ? 'Company A' : 'Company B',
          engagement_score: i * 20,
          created_at: new Date(),
          updated_at: new Date(),
        },
      });
      segmentContacts.push(contact);

      // Add tag to some contacts
      if (i < 3) {
        await prisma.contact_tags.create({
          data: {
            id: crypto.randomUUID(),
            contact_id: contact.id,
            tag_id: testTag.id,
            created_at: new Date(),
          },
        });
      }
    }
  });

  afterAll(async () => {
    // Cleanup
    if (testSegment) {
      await prisma.segments.delete({ where: { id: testSegment.id } }).catch(() => {});
    }
    await prisma.contact_tags.deleteMany({
      where: { contact_id: { in: segmentContacts.map((c) => c.id) } },
    });
    await prisma.contacts.deleteMany({
      where: { id: { in: segmentContacts.map((c) => c.id) } },
    });
    if (testTag) {
      await prisma.tags.delete({ where: { id: testTag.id } }).catch(() => {});
    }
  });

  describe('POST /api/v1/contacts/segments', () => {
    test('should create a segment with conditions', async () => {
      const response = await request(app)
        .post('/api/v1/contacts/segments')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          name: 'High Engagement Segment',
          description: 'Contacts with engagement score > 40',
          conditions: {
            operator: 'AND',
            rules: [
              {
                field: 'engagement_score',
                operator: 'greater_than',
                value: 40,
              },
            ],
          },
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data.name).toBe('High Engagement Segment');
      expect(response.body.data.contact_count).toBeGreaterThanOrEqual(0);

      testSegment = response.body.data;
    });

    test('should reject duplicate segment name', async () => {
      const response = await request(app)
        .post('/api/v1/contacts/segments')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          name: 'High Engagement Segment',
          description: 'Duplicate',
          conditions: {
            operator: 'AND',
            rules: [
              {
                field: 'engagement_score',
                operator: 'greater_than',
                value: 50,
              },
            ],
          },
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/v1/contacts/segments', () => {
    test('should list all segments', async () => {
      const response = await request(app)
        .get('/api/v1/contacts/segments')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
    });
  });

  describe('GET /api/v1/contacts/segments/:id/contacts', () => {
    test('should get contacts in a segment', async () => {
      const response = await request(app)
        .get(`/api/v1/contacts/segments/${testSegment.id}/contacts`)
        .set('Authorization', `Bearer ${accessToken}`)
        .query({ page: 1, limit: 10 });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body).toHaveProperty('pagination');
    });
  });

  describe('PUT /api/v1/contacts/segments/:id', () => {
    test('should update segment conditions', async () => {
      const response = await request(app)
        .put(`/api/v1/contacts/segments/${testSegment.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          name: 'Updated Segment Name',
          conditions: {
            operator: 'AND',
            rules: [
              {
                field: 'engagement_score',
                operator: 'greater_than_or_equal',
                value: 60,
              },
            ],
          },
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe('Updated Segment Name');
    });
  });

  describe('Segment Condition Evaluation', () => {
    test('should evaluate string contains condition', async () => {
      const segment = await request(app)
        .post('/api/v1/contacts/segments')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          name: 'Company A Segment',
          conditions: {
            operator: 'AND',
            rules: [
              {
                field: 'company',
                operator: 'contains',
                value: 'Company A',
              },
            ],
          },
        });

      expect(segment.status).toBe(201);
      expect(segment.body.data.contact_count).toBeGreaterThan(0);

      // Cleanup
      await prisma.segments.delete({ where: { id: segment.body.data.id } });
    });

    test('should evaluate tag-based condition', async () => {
      const segment = await request(app)
        .post('/api/v1/contacts/segments')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          name: 'Tagged Contacts',
          conditions: {
            operator: 'AND',
            rules: [
              {
                field: 'tags',
                operator: 'has_any',
                value: ['Test Segment Tag'],
              },
            ],
          },
        });

      expect(segment.status).toBe(201);
      expect(segment.body.data.contact_count).toBeGreaterThanOrEqual(3);

      // Cleanup
      await prisma.segments.delete({ where: { id: segment.body.data.id } });
    });
  });
});

describe('Contact Tags', () => {
  let testTags = [];
  let testUser;
  let accessToken;

  beforeAll(async () => {
    // Use shared test user
    testUser = sharedTestUser;
    accessToken = sharedAccessToken;

    // Create test tags
    for (let i = 0; i < 3; i++) {
      const tag = await prisma.tags.create({
        data: {
          id: crypto.randomUUID(),
          team_id: testUser.teamId,
          name: `Tag ${i}`,
          color: `#00000${i}`,
          created_at: new Date(),
          updated_at: new Date(),
        },
      });
      testTags.push(tag);
    }
  });

  afterAll(async () => {
    await prisma.tags.deleteMany({
      where: { id: { in: testTags.map((t) => t.id) } },
    });
  });

  describe('GET /api/v1/contacts/tags', () => {
    test('should list all tags', async () => {
      const response = await request(app)
        .get('/api/v1/contacts/tags')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body).toHaveProperty('pagination');
    });

    test('should search tags by name', async () => {
      const response = await request(app)
        .get('/api/v1/contacts/tags')
        .set('Authorization', `Bearer ${accessToken}`)
        .query({ search: 'Tag 1' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
    });
  });
});

describe('Bulk Actions', () => {
  let bulkContacts = [];
  let bulkTag;
  let testUser;
  let accessToken;

  beforeAll(async () => {
    // Use shared test user
    testUser = sharedTestUser;
    accessToken = sharedAccessToken;

    // Create tag for bulk operations
    bulkTag = await prisma.tags.create({
      data: {
        id: crypto.randomUUID(),
        team_id: testUser.teamId,
        name: 'Bulk Action Tag',
        color: '#00FF00',
        created_at: new Date(),
        updated_at: new Date(),
      },
    });

    // Create contacts for bulk operations
    for (let i = 0; i < 3; i++) {
      const contact = await prisma.contacts.create({
        data: {
          id: crypto.randomUUID(),
          team_id: testUser.teamId,
          phone: `+19998887${i}0`,
          first_name: `Bulk${i}`,
          last_name: 'Test',
          created_at: new Date(),
          updated_at: new Date(),
        },
      });
      bulkContacts.push(contact);
    }
  });

  afterAll(async () => {
    await prisma.contact_tags.deleteMany({
      where: { contact_id: { in: bulkContacts.map((c) => c.id) } },
    });
    await prisma.contacts.deleteMany({
      where: { id: { in: bulkContacts.map((c) => c.id) } },
    });
    if (bulkTag) {
      await prisma.tags.delete({ where: { id: bulkTag.id } }).catch(() => {});
    }
  });

  describe('POST /api/v1/contacts/bulk-action', () => {
    test('should add tags to multiple contacts', async () => {
      const response = await request(app)
        .post('/api/v1/contacts/bulk-action')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          action: 'add_tags',
          contactIds: bulkContacts.map((c) => c.id),
          data: {
            tagIds: [bulkTag.id],
          },
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.contactsUpdated).toBe(3);
      expect(response.body.data.tagsAdded).toBe(1);
    });

    test('should remove tags from multiple contacts', async () => {
      const response = await request(app)
        .post('/api/v1/contacts/bulk-action')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          action: 'remove_tags',
          contactIds: bulkContacts.map((c) => c.id),
          data: {
            tagIds: [bulkTag.id],
          },
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.contactsUpdated).toBe(3);
    });

    test('should update field on multiple contacts', async () => {
      const response = await request(app)
        .post('/api/v1/contacts/bulk-action')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          action: 'update_field',
          contactIds: bulkContacts.map((c) => c.id),
          data: {
            field: 'company',
            value: 'Bulk Updated Company',
          },
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.contactsUpdated).toBe(3);
      expect(response.body.data.field).toBe('company');
    });

    test('should soft delete multiple contacts', async () => {
      const response = await request(app)
        .post('/api/v1/contacts/bulk-action')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          action: 'delete',
          contactIds: [bulkContacts[0].id],
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.contactsDeleted).toBe(1);

      // Verify soft delete
      const deleted = await prisma.contacts.findUnique({
        where: { id: bulkContacts[0].id },
      });
      expect(deleted.deleted_at).not.toBeNull();
    });
  });
});
