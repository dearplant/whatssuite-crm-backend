import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';
import app from '../src/app.js';

const prisma = new PrismaClient();

// Shared test data
let sharedTestUser;
let sharedAccessToken;
let sharedWhatsappAccount;
let sharedSegment;
let sharedContacts = [];

// Global setup before all tests
beforeAll(async () => {
  await prisma.$connect();

  // Clean up any existing test data
  await prisma.campaign_messages.deleteMany({
    where: { campaigns: { name: { contains: 'Test Campaign' } } },
  });
  await prisma.campaigns.deleteMany({ where: { name: { contains: 'Test Campaign' } } });
  await prisma.contacts.deleteMany({ where: { phone: { startsWith: '+1555' } } });
  await prisma.segments.deleteMany({ where: { name: { contains: 'Test Segment' } } });
  await prisma.whatsapp_accounts.deleteMany({ where: { phone: '+1234567890' } });
  await prisma.users.deleteMany({ where: { email: 'campaigntest@example.com' } });

  // Create test user
  const bcrypt = await import('bcryptjs');
  const hashedPassword = await bcrypt.hash('TestPassword123!', 12);

  sharedTestUser = await prisma.users.create({
    data: {
      id: crypto.randomUUID(),
      email: 'campaigntest@example.com',
      password_hash: hashedPassword,
      first_name: 'Campaign',
      last_name: 'Tester',
      created_at: new Date(),
      updated_at: new Date(),
    },
  });

  // Create team
  const team = await prisma.teams.create({
    data: {
      id: crypto.randomUUID(),
      name: 'Test Team',
      slug: 'test-team-campaign-' + Date.now(),
      owner_id: sharedTestUser.id,
      created_at: new Date(),
      updated_at: new Date(),
    },
  });

  sharedTestUser.teamId = team.id;

  // Create team member
  await prisma.team_members.create({
    data: {
      id: crypto.randomUUID(),
      team_id: team.id,
      user_id: sharedTestUser.id,
      role: 'owner',
      permissions: [],
      joined_at: new Date(),
      updated_at: new Date(),
    },
  });

  // Login to get access token
  const loginResponse = await request(app).post('/api/v1/auth/login').send({
    email: 'campaigntest@example.com',
    password: 'TestPassword123!',
  });

  sharedAccessToken = loginResponse.body.data.accessToken;

  // Create WhatsApp account
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

  // Create test contacts
  for (let i = 0; i < 10; i++) {
    const contact = await prisma.contacts.create({
      data: {
        id: crypto.randomUUID(),
        team_id: team.id,
        phone: `+1555000${i.toString().padStart(4, '0')}`,
        first_name: `Test${i}`,
        last_name: 'Contact',
        email: `test${i}@example.com`,
        engagement_score: i * 10,
        created_at: new Date(),
        updated_at: new Date(),
      },
    });
    sharedContacts.push(contact);
  }

  // Create test segment
  sharedSegment = await prisma.segments.create({
    data: {
      id: crypto.randomUUID(),
      team_id: team.id,
      name: 'Test Segment',
      description: 'Test segment for campaigns',
      conditions: {
        engagement_score: { operator: 'gte', value: 50 },
      },
      contact_count: 5,
      created_at: new Date(),
      updated_at: new Date(),
    },
  });
});

// Global cleanup after all tests
afterAll(async () => {
  if (sharedTestUser) {
    await prisma.campaign_messages.deleteMany({
      where: { campaigns: { team_id: sharedTestUser.teamId } },
    });
    await prisma.campaigns.deleteMany({ where: { team_id: sharedTestUser.teamId } });
    await prisma.contacts.deleteMany({ where: { team_id: sharedTestUser.teamId } });
    await prisma.segments.deleteMany({ where: { team_id: sharedTestUser.teamId } });
    await prisma.whatsapp_accounts.deleteMany({ where: { team_id: sharedTestUser.teamId } });
    await prisma.team_members.deleteMany({ where: { team_id: sharedTestUser.teamId } });
    await prisma.teams.deleteMany({ where: { id: sharedTestUser.teamId } });
    await prisma.users.deleteMany({ where: { id: sharedTestUser.id } });
  }
  await prisma.$disconnect();
});

describe('Campaign Management', () => {
  describe('POST /api/v1/campaigns - Create Campaign', () => {
    test('should create campaign with segment targeting', async () => {
      const response = await request(app)
        .post('/api/v1/campaigns')
        .set('Authorization', `Bearer ${sharedAccessToken}`)
        .send({
          name: 'Test Campaign - Segment',
          description: 'Test campaign with segment targeting',
          accountId: sharedWhatsappAccount.id,
          messageType: 'text',
          messageContent: 'Hello {{firstName}}, this is a test message!',
          audienceType: 'segment',
          audienceConfig: {
            segmentId: sharedSegment.id,
          },
          scheduleType: 'now',
          throttleConfig: {
            messagesPerMinute: 10,
          },
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data.name).toBe('Test Campaign - Segment');
      expect(response.body.data.audienceType).toBe('segment');
      expect(response.body.data.total_recipients).toBeGreaterThan(0);
    });

    test('should calculate correct recipient count for segment', async () => {
      const response = await request(app)
        .post('/api/v1/campaigns')
        .set('Authorization', `Bearer ${sharedAccessToken}`)
        .send({
          name: 'Test Campaign - Segment Count',
          accountId: sharedWhatsappAccount.id,
          messageType: 'text',
          messageContent: 'Segment count test',
          audienceType: 'segment',
          audienceConfig: {
            segmentId: sharedSegment.id,
          },
        });

      expect(response.status).toBe(201);
      // Should match contacts with engagement_score >= 50
      const expectedCount = sharedContacts.filter((c) => c.engagement_score >= 50).length;
      expect(response.body.data.total_recipients).toBe(expectedCount);
    });

    test('should fail with invalid segment ID', async () => {
      const response = await request(app)
        .post('/api/v1/campaigns')
        .set('Authorization', `Bearer ${sharedAccessToken}`)
        .send({
          name: 'Test Campaign - Invalid Segment',
          accountId: sharedWhatsappAccount.id,
          messageType: 'text',
          messageContent: 'Invalid segment',
          audienceType: 'segment',
          audienceConfig: {
            segmentId: crypto.randomUUID(),
          },
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    test('should create campaign with custom contact list', async () => {
      const contactIds = sharedContacts.slice(0, 3).map((c) => c.id);

      const response = await request(app)
        .post('/api/v1/campaigns')
        .set('Authorization', `Bearer ${sharedAccessToken}`)
        .send({
          name: 'Test Campaign - Custom',
          accountId: sharedWhatsappAccount.id,
          messageType: 'text',
          messageContent: 'Hello {{name}}!',
          audienceType: 'custom',
          audienceConfig: {
            contactIds,
          },
          scheduleType: 'now',
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.total_recipients).toBe(3);
    });

    test('should create scheduled campaign', async () => {
      const scheduledTime = new Date(Date.now() + 3600000); // 1 hour from now

      const response = await request(app)
        .post('/api/v1/campaigns')
        .set('Authorization', `Bearer ${sharedAccessToken}`)
        .send({
          name: 'Test Campaign - Scheduled',
          accountId: sharedWhatsappAccount.id,
          messageType: 'text',
          messageContent: 'Scheduled message',
          audienceType: 'all',
          audienceConfig: {},
          scheduleType: 'scheduled',
          scheduledAt: scheduledTime.toISOString(),
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('scheduled');
    });

    test('should fail with invalid account ID', async () => {
      const response = await request(app)
        .post('/api/v1/campaigns')
        .set('Authorization', `Bearer ${sharedAccessToken}`)
        .send({
          name: 'Test Campaign - Invalid',
          accountId: crypto.randomUUID(),
          messageType: 'text',
          messageContent: 'Test',
          audienceType: 'all',
          audienceConfig: {},
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('Campaign Scheduling and Execution', () => {
    let testCampaign;

    beforeAll(async () => {
      // Create a test campaign directly in database
      testCampaign = await prisma.campaigns.create({
        data: {
          id: crypto.randomUUID(),
          team_id: sharedTestUser.teamId,
          user_id: sharedTestUser.id,
          account_id: sharedWhatsappAccount.id,
          name: 'Test Campaign - Execution',
          messageType: 'text',
          message_content: 'Test execution',
          audienceType: 'all',
          audience_config: {},
          schedule_type: 'now',
          status: 'draft',
          total_recipients: 10,
          created_at: new Date(),
          updated_at: new Date(),
        },
      });

      // Create campaign messages
      for (const contact of sharedContacts) {
        await prisma.campaign_messages.create({
          data: {
            id: crypto.randomUUID(),
            campaign_id: testCampaign.id,
            contact_id: contact.id,
            status: 'pending',
            created_at: new Date(),
          },
        });
      }
    });

    test('should start campaign execution', async () => {
      const response = await request(app)
        .post(`/api/v1/campaigns/${testCampaign.id}/start`)
        .set('Authorization', `Bearer ${sharedAccessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('scheduled');
    });

    test('should pause running campaign', async () => {
      // First update campaign to running status
      await prisma.campaigns.update({
        where: { id: testCampaign.id },
        data: { status: 'running', started_at: new Date() },
      });

      const response = await request(app)
        .post(`/api/v1/campaigns/${testCampaign.id}/pause`)
        .set('Authorization', `Bearer ${sharedAccessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('paused');
    });

    test('should resume paused campaign', async () => {
      // First update campaign to paused status
      await prisma.campaigns.update({
        where: { id: testCampaign.id },
        data: { status: 'paused' },
      });

      const response = await request(app)
        .post(`/api/v1/campaigns/${testCampaign.id}/resume`)
        .set('Authorization', `Bearer ${sharedAccessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('scheduled');
    });

    test('should not start already running campaign', async () => {
      // Update campaign to running
      await prisma.campaigns.update({
        where: { id: testCampaign.id },
        data: { status: 'running' },
      });

      const response = await request(app)
        .post(`/api/v1/campaigns/${testCampaign.id}/start`)
        .set('Authorization', `Bearer ${sharedAccessToken}`);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    test('should not pause completed campaign', async () => {
      // Update campaign to completed
      await prisma.campaigns.update({
        where: { id: testCampaign.id },
        data: { status: 'completed' },
      });

      const response = await request(app)
        .post(`/api/v1/campaigns/${testCampaign.id}/pause`)
        .set('Authorization', `Bearer ${sharedAccessToken}`);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    test('should schedule campaign for future execution', async () => {
      const futureDate = new Date(Date.now() + 7200000); // 2 hours from now

      const response = await request(app)
        .post('/api/v1/campaigns')
        .set('Authorization', `Bearer ${sharedAccessToken}`)
        .send({
          name: 'Test Campaign - Future Schedule',
          accountId: sharedWhatsappAccount.id,
          messageType: 'text',
          messageContent: 'Future scheduled message',
          audienceType: 'custom',
          audienceConfig: {
            contactIds: sharedContacts.slice(0, 2).map((c) => c.id),
          },
          scheduleType: 'scheduled',
          scheduledAt: futureDate.toISOString(),
        });

      expect(response.status).toBe(201);
      expect(response.body.data.status).toBe('scheduled');
      expect(new Date(response.body.data.scheduled_at).getTime()).toBeGreaterThan(Date.now());
    });

    test('should reject past scheduled time', async () => {
      const pastDate = new Date(Date.now() - 3600000); // 1 hour ago

      const response = await request(app)
        .post('/api/v1/campaigns')
        .set('Authorization', `Bearer ${sharedAccessToken}`)
        .send({
          name: 'Test Campaign - Past Schedule',
          accountId: sharedWhatsappAccount.id,
          messageType: 'text',
          messageContent: 'Past scheduled message',
          audienceType: 'custom',
          audienceConfig: {
            contactIds: sharedContacts.slice(0, 2).map((c) => c.id),
          },
          scheduleType: 'scheduled',
          scheduledAt: pastDate.toISOString(),
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    test('should track campaign progress', async () => {
      // Create a new campaign
      const createResponse = await request(app)
        .post('/api/v1/campaigns')
        .set('Authorization', `Bearer ${sharedAccessToken}`)
        .send({
          name: 'Test Campaign - Progress',
          accountId: sharedWhatsappAccount.id,
          messageType: 'text',
          messageContent: 'Progress tracking',
          audienceType: 'custom',
          audienceConfig: {
            contactIds: sharedContacts.slice(0, 5).map((c) => c.id),
          },
        });

      const campaignId = createResponse.body.data.id;

      // Get campaign details
      const response = await request(app)
        .get(`/api/v1/campaigns/${campaignId}`)
        .set('Authorization', `Bearer ${sharedAccessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveProperty('total_recipients');
      expect(response.body.data).toHaveProperty('messages_sent');
      expect(response.body.data).toHaveProperty('messages_delivered');
      expect(response.body.data).toHaveProperty('messages_failed');
    });
  });

  describe('Rate Limiting Enforcement', () => {
    test('should respect throttle configuration', async () => {
      const response = await request(app)
        .post('/api/v1/campaigns')
        .set('Authorization', `Bearer ${sharedAccessToken}`)
        .send({
          name: 'Test Campaign - Rate Limited',
          accountId: sharedWhatsappAccount.id,
          messageType: 'text',
          messageContent: 'Rate limited message',
          audienceType: 'all',
          audienceConfig: {},
          throttleConfig: {
            messagesPerMinute: 5,
          },
        });

      expect(response.status).toBe(201);
      expect(response.body.data.throttle_config).toHaveProperty('messagesPerMinute');
      expect(response.body.data.throttle_config.messagesPerMinute).toBe(5);
    });

    test('should apply default rate limit when not specified', async () => {
      const response = await request(app)
        .post('/api/v1/campaigns')
        .set('Authorization', `Bearer ${sharedAccessToken}`)
        .send({
          name: 'Test Campaign - Default Rate',
          accountId: sharedWhatsappAccount.id,
          messageType: 'text',
          messageContent: 'Default rate limit',
          audienceType: 'custom',
          audienceConfig: {
            contactIds: sharedContacts.slice(0, 2).map((c) => c.id),
          },
        });

      expect(response.status).toBe(201);
      expect(response.body.data.throttle_config).toBeDefined();
      expect(response.body.data.throttle_config.messagesPerMinute).toBeGreaterThan(0);
    });

    test('should reject invalid rate limit values', async () => {
      const response = await request(app)
        .post('/api/v1/campaigns')
        .set('Authorization', `Bearer ${sharedAccessToken}`)
        .send({
          name: 'Test Campaign - Invalid Rate',
          accountId: sharedWhatsappAccount.id,
          messageType: 'text',
          messageContent: 'Invalid rate',
          audienceType: 'all',
          audienceConfig: {},
          throttleConfig: {
            messagesPerMinute: -5,
          },
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    test('should enforce maximum rate limit', async () => {
      const response = await request(app)
        .post('/api/v1/campaigns')
        .set('Authorization', `Bearer ${sharedAccessToken}`)
        .send({
          name: 'Test Campaign - Max Rate',
          accountId: sharedWhatsappAccount.id,
          messageType: 'text',
          messageContent: 'Max rate test',
          audienceType: 'custom',
          audienceConfig: {
            contactIds: sharedContacts.slice(0, 2).map((c) => c.id),
          },
          throttleConfig: {
            messagesPerMinute: 1000,
          },
        });

      // Should reject values above maximum (100)
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('A/B Testing', () => {
    test('should create A/B test campaign with variant distribution', async () => {
      const response = await request(app)
        .post('/api/v1/campaigns/ab-test')
        .set('Authorization', `Bearer ${sharedAccessToken}`)
        .send({
          name: 'Test Campaign - A/B Test',
          accountId: sharedWhatsappAccount.id,
          variants: [
            {
              name: 'Variant A',
              messageType: 'text',
              messageContent: 'Hello {{firstName}}, this is variant A!',
              percentage: 50,
            },
            {
              name: 'Variant B',
              messageType: 'text',
              messageContent: 'Hi {{firstName}}, this is variant B!',
              percentage: 50,
            },
          ],
          audienceType: 'all',
          audienceConfig: {},
          scheduleType: 'now',
          winnerCriteria: 'read_rate',
          testDuration: 24,
          autoSelectWinner: true,
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.is_ab_test).toBe(true);
      expect(response.body.data.ab_test_config).toHaveProperty('variants');
      expect(response.body.data.ab_test_config.variants).toHaveLength(2);
    });

    test('should validate variant percentages sum to 100', async () => {
      const response = await request(app)
        .post('/api/v1/campaigns/ab-test')
        .set('Authorization', `Bearer ${sharedAccessToken}`)
        .send({
          name: 'Test Campaign - Invalid A/B',
          accountId: sharedWhatsappAccount.id,
          variants: [
            {
              name: 'Variant A',
              messageType: 'text',
              messageContent: 'Variant A',
              percentage: 40,
            },
            {
              name: 'Variant B',
              messageType: 'text',
              messageContent: 'Variant B',
              percentage: 40,
            },
          ],
          audienceType: 'all',
          audienceConfig: {},
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    test('should get A/B test results', async () => {
      // First create an A/B test campaign
      const createResponse = await request(app)
        .post('/api/v1/campaigns/ab-test')
        .set('Authorization', `Bearer ${sharedAccessToken}`)
        .send({
          name: 'Test Campaign - A/B Results',
          accountId: sharedWhatsappAccount.id,
          variants: [
            {
              name: 'Variant A',
              messageType: 'text',
              messageContent: 'Variant A',
              percentage: 50,
            },
            {
              name: 'Variant B',
              messageType: 'text',
              messageContent: 'Variant B',
              percentage: 50,
            },
          ],
          audienceType: 'custom',
          audienceConfig: {
            contactIds: sharedContacts.slice(0, 4).map((c) => c.id),
          },
          scheduleType: 'now',
        });

      const campaignId = createResponse.body.data.id;

      // Get A/B test results
      const response = await request(app)
        .get(`/api/v1/campaigns/${campaignId}/ab-test/results`)
        .set('Authorization', `Bearer ${sharedAccessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('campaign');
      expect(response.body.data).toHaveProperty('variants');
      expect(response.body.data.variants).toHaveLength(2);
      expect(response.body.data.variants[0]).toHaveProperty('metrics');
    });

    test('should select winning variant', async () => {
      // Create an A/B test campaign
      const createResponse = await request(app)
        .post('/api/v1/campaigns/ab-test')
        .set('Authorization', `Bearer ${sharedAccessToken}`)
        .send({
          name: 'Test Campaign - Winner Selection',
          accountId: sharedWhatsappAccount.id,
          variants: [
            {
              name: 'Variant A',
              messageType: 'text',
              messageContent: 'Variant A',
              percentage: 50,
            },
            {
              name: 'Variant B',
              messageType: 'text',
              messageContent: 'Variant B',
              percentage: 50,
            },
          ],
          audienceType: 'custom',
          audienceConfig: {
            contactIds: sharedContacts.slice(0, 2).map((c) => c.id),
          },
          autoSelectWinner: false,
        });

      const campaignId = createResponse.body.data.id;
      const variantId = createResponse.body.data.ab_test_config.variants[0].id;

      // Select winner
      const response = await request(app)
        .post(`/api/v1/campaigns/${campaignId}/ab-test/select-winner`)
        .set('Authorization', `Bearer ${sharedAccessToken}`)
        .send({ variantId });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.winning_variant_id).toBe(variantId);
    });

    test('should distribute recipients across variants', async () => {
      const createResponse = await request(app)
        .post('/api/v1/campaigns/ab-test')
        .set('Authorization', `Bearer ${sharedAccessToken}`)
        .send({
          name: 'Test Campaign - Distribution',
          accountId: sharedWhatsappAccount.id,
          variants: [
            {
              name: 'Variant A',
              messageType: 'text',
              messageContent: 'Variant A',
              percentage: 30,
            },
            {
              name: 'Variant B',
              messageType: 'text',
              messageContent: 'Variant B',
              percentage: 70,
            },
          ],
          audienceType: 'all',
          audienceConfig: {},
        });

      const campaignId = createResponse.body.data.id;

      // Check variant distribution in campaign_messages
      const variantCounts = await prisma.campaign_messages.groupBy({
        by: ['variant_id'],
        where: { campaign_id: campaignId },
        _count: true,
      });

      expect(variantCounts).toHaveLength(2);
      // Verify distribution is roughly correct (allowing for randomness)
      const totalRecipients = createResponse.body.data.total_recipients;
      variantCounts.forEach((vc) => {
        const percentage = (vc._count / totalRecipients) * 100;
        expect(percentage).toBeGreaterThan(20);
        expect(percentage).toBeLessThan(80);
      });
    });

    test('should distribute 50/50 split accurately', async () => {
      const createResponse = await request(app)
        .post('/api/v1/campaigns/ab-test')
        .set('Authorization', `Bearer ${sharedAccessToken}`)
        .send({
          name: 'Test Campaign - 50/50 Split',
          accountId: sharedWhatsappAccount.id,
          variants: [
            {
              name: 'Variant A',
              messageType: 'text',
              messageContent: 'Variant A',
              percentage: 50,
            },
            {
              name: 'Variant B',
              messageType: 'text',
              messageContent: 'Variant B',
              percentage: 50,
            },
          ],
          audienceType: 'custom',
          audienceConfig: {
            contactIds: sharedContacts.map((c) => c.id),
          },
        });

      const campaignId = createResponse.body.data.id;
      const variantCounts = await prisma.campaign_messages.groupBy({
        by: ['variant_id'],
        where: { campaign_id: campaignId },
        _count: true,
      });

      expect(variantCounts).toHaveLength(2);
      // With 10 contacts, should be roughly 50/50 split (allowing for randomness)
      const totalRecipients = createResponse.body.data.total_recipients;
      variantCounts.forEach((vc) => {
        const percentage = (vc._count / totalRecipients) * 100;
        expect(percentage).toBeGreaterThan(30);
        expect(percentage).toBeLessThan(70);
      });
    });

    test('should support multiple variants (3-way split)', async () => {
      const response = await request(app)
        .post('/api/v1/campaigns/ab-test')
        .set('Authorization', `Bearer ${sharedAccessToken}`)
        .send({
          name: 'Test Campaign - 3-way Split',
          accountId: sharedWhatsappAccount.id,
          variants: [
            {
              name: 'Variant A',
              messageType: 'text',
              messageContent: 'Variant A',
              percentage: 33,
            },
            {
              name: 'Variant B',
              messageType: 'text',
              messageContent: 'Variant B',
              percentage: 33,
            },
            {
              name: 'Variant C',
              messageType: 'text',
              messageContent: 'Variant C',
              percentage: 34,
            },
          ],
          audienceType: 'custom',
          audienceConfig: {
            contactIds: sharedContacts.slice(0, 6).map((c) => c.id),
          },
        });

      expect(response.status).toBe(201);
      expect(response.body.data.ab_test_config.variants).toHaveLength(3);

      const campaignId = response.body.data.id;
      const variantCounts = await prisma.campaign_messages.groupBy({
        by: ['variant_id'],
        where: { campaign_id: campaignId },
        _count: true,
      });

      // Should have at least 2 variants with messages (distribution may not always create all 3)
      expect(variantCounts.length).toBeGreaterThanOrEqual(2);
      expect(variantCounts.length).toBeLessThanOrEqual(3);
    });

    test('should track variant metrics independently', async () => {
      const createResponse = await request(app)
        .post('/api/v1/campaigns/ab-test')
        .set('Authorization', `Bearer ${sharedAccessToken}`)
        .send({
          name: 'Test Campaign - Variant Metrics',
          accountId: sharedWhatsappAccount.id,
          variants: [
            {
              name: 'Variant A',
              messageType: 'text',
              messageContent: 'Variant A',
              percentage: 50,
            },
            {
              name: 'Variant B',
              messageType: 'text',
              messageContent: 'Variant B',
              percentage: 50,
            },
          ],
          audienceType: 'custom',
          audienceConfig: {
            contactIds: sharedContacts.slice(0, 4).map((c) => c.id),
          },
        });

      const campaignId = createResponse.body.data.id;

      // Get A/B test results
      const response = await request(app)
        .get(`/api/v1/campaigns/${campaignId}/ab-test/results`)
        .set('Authorization', `Bearer ${sharedAccessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.variants).toHaveLength(2);

      // Each variant should have independent metrics
      response.body.data.variants.forEach((variant) => {
        expect(variant.metrics).toHaveProperty('sent');
        expect(variant.metrics).toHaveProperty('delivered');
        expect(variant.metrics).toHaveProperty('read');
        expect(variant.metrics).toHaveProperty('total');
      });
    });
  });

  describe('GET /api/v1/campaigns - List Campaigns', () => {
    test('should list all campaigns', async () => {
      const response = await request(app)
        .get('/api/v1/campaigns')
        .set('Authorization', `Bearer ${sharedAccessToken}`)
        .query({ page: 1, limit: 10 });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body).toHaveProperty('pagination');
    });

    test('should filter campaigns by status', async () => {
      const response = await request(app)
        .get('/api/v1/campaigns')
        .set('Authorization', `Bearer ${sharedAccessToken}`)
        .query({ status: 'draft', page: 1, limit: 10 });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });
});
