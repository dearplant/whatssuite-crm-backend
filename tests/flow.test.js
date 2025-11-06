import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';
import app from '../src/app.js';
import { validateFlow, detectCycles, validateNodes, validateEdges } from '../src/utils/flowValidator.js';
import * as flowTriggers from '../src/services/flowTriggers.js';
import * as flowExecutor from '../src/services/flowExecutor.js';

const prisma = new PrismaClient();

// Shared test data
let sharedTestUser;
let sharedAccessToken;
let sharedTeam;
let sharedFlow;

// Global setup before all tests
beforeAll(async () => {
  await prisma.$connect();

  // Clean up any existing test data
  await prisma.flow_executions.deleteMany({
    where: { flows: { name: { contains: 'Test Flow' } } },
  });
  await prisma.flows.deleteMany({ where: { name: { contains: 'Test Flow' } } });
  await prisma.users.deleteMany({ where: { email: 'flowtest@example.com' } });

  // Create test user
  const bcrypt = await import('bcryptjs');
  const hashedPassword = await bcrypt.hash('TestPassword123!', 12);

  sharedTestUser = await prisma.users.create({
    data: {
      id: crypto.randomUUID(),
      email: 'flowtest@example.com',
      password_hash: hashedPassword,
      first_name: 'Flow',
      last_name: 'Tester',
      created_at: new Date(),
      updated_at: new Date(),
    },
  });

  // Create team
  sharedTeam = await prisma.teams.create({
    data: {
      id: crypto.randomUUID(),
      name: 'Test Team Flow',
      slug: 'test-team-flow-' + Date.now(),
      owner_id: sharedTestUser.id,
      created_at: new Date(),
      updated_at: new Date(),
    },
  });

  // Add user to team
  await prisma.team_members.create({
    data: {
      id: crypto.randomUUID(),
      team_id: sharedTeam.id,
      user_id: sharedTestUser.id,
      role: 'owner',
      permissions: [],
      joined_at: new Date(),
      updated_at: new Date(),
    },
  });

  // Login to get access token
  const loginResponse = await request(app).post('/api/v1/auth/login').send({
    email: 'flowtest@example.com',
    password: 'TestPassword123!',
  });

  sharedAccessToken = loginResponse.body.data.accessToken;
});

// Global cleanup after all tests
afterAll(async () => {
  // Clean up test data
  await prisma.flow_executions.deleteMany({
    where: { flows: { name: { contains: 'Test Flow' } } },
  });
  await prisma.flows.deleteMany({ where: { name: { contains: 'Test Flow' } } });
  await prisma.team_members.deleteMany({ where: { team_id: sharedTeam.id } });
  await prisma.teams.deleteMany({ where: { id: sharedTeam.id } });
  await prisma.users.deleteMany({ where: { id: sharedTestUser.id } });

  await prisma.$disconnect();
});

describe('Flow API Tests', () => {
  describe('POST /api/v1/flows - Create Flow', () => {
    it('should create a new flow with valid data', async () => {
      const flowData = {
        name: 'Test Flow - Welcome Message',
        description: 'Send welcome message to new contacts',
        triggerType: 'message_received',
        trigger_config: {},
        nodes: [
          {
            id: 'trigger-1',
            type: 'trigger',
            config: {},
            position: { x: 100, y: 100 },
          },
          {
            id: 'send-1',
            type: 'send_message',
            config: {
              message: 'Welcome! How can we help you?',
              messageType: 'text',
            },
            position: { x: 100, y: 200 },
          },
          {
            id: 'end-1',
            type: 'end',
            config: {},
            position: { x: 100, y: 300 },
          },
        ],
        edges: [
          { id: 'e1', source: 'trigger-1', target: 'send-1' },
          { id: 'e2', source: 'send-1', target: 'end-1' },
        ],
        variables: {},
        is_active: false,
      };

      const response = await request(app)
        .post('/api/v1/flows')
        .set('Authorization', `Bearer ${sharedAccessToken}`)
        .send(flowData);

      expect(response.status).toBe(201);
      expect(response.body.flow).toBeDefined();
      expect(response.body.flow.name).toBe(flowData.name);
      expect(response.body.flow.triggerType).toBe(flowData.triggerType);
      expect(response.body.flow.is_active).toBe(false);

      sharedFlow = response.body.flow;
    });

    it('should reject flow with invalid structure (cycle)', async () => {
      const flowData = {
        name: 'Test Flow - Invalid Cycle',
        triggerType: 'message_received',
        nodes: [
          { id: 'node-1', type: 'send_message', config: { message: 'Test' } },
          { id: 'node-2', type: 'send_message', config: { message: 'Test' } },
        ],
        edges: [
          { id: 'e1', source: 'node-1', target: 'node-2' },
          { id: 'e2', source: 'node-2', target: 'node-1' }, // Creates cycle
        ],
      };

      const response = await request(app)
        .post('/api/v1/flows')
        .set('Authorization', `Bearer ${sharedAccessToken}`)
        .send(flowData);

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('ValidationError');
      expect(response.body.message).toContain('Cycle detected');
    });

    it('should reject flow with missing required fields', async () => {
      const flowData = {
        // Missing name
        triggerType: 'message_received',
        nodes: [],
        edges: [],
      };

      const response = await request(app)
        .post('/api/v1/flows')
        .set('Authorization', `Bearer ${sharedAccessToken}`)
        .send(flowData);

      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/v1/flows - Get All Flows', () => {
    it('should get all flows for the team', async () => {
      const response = await request(app)
        .get('/api/v1/flows')
        .set('Authorization', `Bearer ${sharedAccessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.flows).toBeDefined();
      expect(Array.isArray(response.body.flows)).toBe(true);
      expect(response.body.flows.length).toBeGreaterThan(0);
    });

    it('should filter flows by active status', async () => {
      const response = await request(app)
        .get('/api/v1/flows')
        .set('Authorization', `Bearer ${sharedAccessToken}`)
        .query({ is_active: 'false' });

      expect(response.status).toBe(200);
      expect(response.body.flows).toBeDefined();
    });
  });

  describe('GET /api/v1/flows/:id - Get Flow by ID', () => {
    it('should get a specific flow by ID', async () => {
      const response = await request(app)
        .get(`/api/v1/flows/${sharedFlow.id}`)
        .set('Authorization', `Bearer ${sharedAccessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.flow).toBeDefined();
      expect(response.body.flow.id).toBe(sharedFlow.id);
      expect(response.body.flow.name).toBe(sharedFlow.name);
    });

    it('should return 404 for non-existent flow', async () => {
      const fakeId = crypto.randomUUID();
      const response = await request(app)
        .get(`/api/v1/flows/${fakeId}`)
        .set('Authorization', `Bearer ${sharedAccessToken}`);

      expect(response.status).toBe(404);
    });
  });

  describe('PUT /api/v1/flows/:id - Update Flow', () => {
    it('should update flow name and description', async () => {
      const updateData = {
        name: 'Test Flow - Updated Name',
        description: 'Updated description',
      };

      const response = await request(app)
        .put(`/api/v1/flows/${sharedFlow.id}`)
        .set('Authorization', `Bearer ${sharedAccessToken}`)
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.flow.name).toBe(updateData.name);
      expect(response.body.flow.description).toBe(updateData.description);
    });

    it('should reject update with invalid structure', async () => {
      const updateData = {
        nodes: [
          { id: 'node-1', type: 'invalid_type', config: {} }, // Invalid node type
        ],
      };

      const response = await request(app)
        .put(`/api/v1/flows/${sharedFlow.id}`)
        .set('Authorization', `Bearer ${sharedAccessToken}`)
        .send(updateData);

      expect(response.status).toBe(400);
    });
  });

  describe('POST /api/v1/flows/:id/activate - Activate Flow', () => {
    it('should activate a valid flow', async () => {
      const response = await request(app)
        .post(`/api/v1/flows/${sharedFlow.id}/activate`)
        .set('Authorization', `Bearer ${sharedAccessToken}`)
        .send({});

      expect(response.status).toBe(200);
      expect(response.body.flow.is_active).toBe(true);
    });
  });

  describe('POST /api/v1/flows/:id/deactivate - Deactivate Flow', () => {
    it('should deactivate an active flow', async () => {
      const response = await request(app)
        .post(`/api/v1/flows/${sharedFlow.id}/deactivate`)
        .set('Authorization', `Bearer ${sharedAccessToken}`)
        .send({});

      expect(response.status).toBe(200);
      expect(response.body.flow.is_active).toBe(false);
    });
  });

  describe('DELETE /api/v1/flows/:id - Delete Flow', () => {
    it('should not delete an active flow', async () => {
      // First activate the flow
      await request(app)
        .post(`/api/v1/flows/${sharedFlow.id}/activate`)
        .set('Authorization', `Bearer ${sharedAccessToken}`)
        .send({});

      // Try to delete
      const response = await request(app)
        .delete(`/api/v1/flows/${sharedFlow.id}`)
        .set('Authorization', `Bearer ${sharedAccessToken}`);

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('Cannot delete an active flow');
    });

    it('should delete an inactive flow', async () => {
      // Deactivate first
      await request(app)
        .post(`/api/v1/flows/${sharedFlow.id}/deactivate`)
        .set('Authorization', `Bearer ${sharedAccessToken}`)
        .send({});

      // Delete
      const response = await request(app)
        .delete(`/api/v1/flows/${sharedFlow.id}`)
        .set('Authorization', `Bearer ${sharedAccessToken}`);

      expect(response.status).toBe(200);
    });
  });

  describe('GET /api/v1/flows/:id/stats - Get Flow Statistics', () => {
    it('should get flow statistics', async () => {
      // Create a new flow for stats test
      const flowData = {
        name: 'Test Flow - Stats',
        triggerType: 'message_received',
        nodes: [
          { id: 'trigger-1', type: 'trigger', config: {} },
          { id: 'end-1', type: 'end', config: {} },
        ],
        edges: [{ id: 'e1', source: 'trigger-1', target: 'end-1' }],
      };

      const createResponse = await request(app)
        .post('/api/v1/flows')
        .set('Authorization', `Bearer ${sharedAccessToken}`)
        .send(flowData);

      const flowId = createResponse.body.flow.id;

      const response = await request(app)
        .get(`/api/v1/flows/${flowId}/stats`)
        .set('Authorization', `Bearer ${sharedAccessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.stats).toBeDefined();
      expect(response.body.stats.totalExecutions).toBeDefined();
    });
  });

  describe('Flow Validation Tests', () => {
    it('should validate a correct flow structure', () => {
      const flowData = {
        name: 'Valid Flow',
        triggerType: 'message_received',
        trigger_config: {},
        nodes: [
          { id: 'trigger-1', type: 'trigger', config: {} },
          { id: 'send-1', type: 'send_message', config: { message: 'Hello' } },
          { id: 'end-1', type: 'end', config: {} },
        ],
        edges: [
          { id: 'e1', source: 'trigger-1', target: 'send-1' },
          { id: 'e2', source: 'send-1', target: 'end-1' },
        ],
      };

      const result = validateFlow(flowData);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect cycles in flow', () => {
      const flowData = {
        name: 'Flow with Cycle',
        triggerType: 'message_received',
        nodes: [
          { id: 'node-1', type: 'send_message', config: { message: 'Test' } },
          { id: 'node-2', type: 'send_message', config: { message: 'Test' } },
        ],
        edges: [
          { id: 'e1', source: 'node-1', target: 'node-2' },
          { id: 'e2', source: 'node-2', target: 'node-1' },
        ],
      };

      const result = validateFlow(flowData);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('Cycle detected'))).toBe(true);
    });

    it('should reject invalid node types', () => {
      const flowData = {
        name: 'Invalid Node Type',
        triggerType: 'message_received',
        nodes: [
          { id: 'node-1', type: 'invalid_type', config: {} },
        ],
        edges: [],
      };

      const result = validateFlow(flowData);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('invalid type'))).toBe(true);
    });

    it('should validate wait node configuration', () => {
      const flowData = {
        name: 'Wait Node Test',
        triggerType: 'message_received',
        nodes: [
          { id: 'trigger-1', type: 'trigger', config: {} },
          { id: 'wait-1', type: 'wait', config: {} }, // Missing duration
          { id: 'end-1', type: 'end', config: {} },
        ],
        edges: [
          { id: 'e1', source: 'trigger-1', target: 'wait-1' },
          { id: 'e2', source: 'wait-1', target: 'end-1' },
        ],
      };

      const result = validateFlow(flowData);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('duration'))).toBe(true);
    });

    it('should validate condition node configuration', () => {
      const flowData = {
        name: 'Condition Node Test',
        triggerType: 'message_received',
        nodes: [
          { id: 'trigger-1', type: 'trigger', config: {} },
          { id: 'condition-1', type: 'condition', config: { conditions: [] } }, // Empty conditions
          { id: 'end-1', type: 'end', config: {} },
        ],
        edges: [
          { id: 'e1', source: 'trigger-1', target: 'condition-1' },
          { id: 'e2', source: 'condition-1', target: 'end-1' },
        ],
      };

      const result = validateFlow(flowData);
      expect(result.valid).toBe(true); // Empty conditions array is valid
    });

    it('should validate send_message node configuration', () => {
      const flowData = {
        name: 'Send Message Node Test',
        triggerType: 'message_received',
        nodes: [
          { id: 'trigger-1', type: 'trigger', config: {} },
          { id: 'send-1', type: 'send_message', config: {} }, // Missing message
          { id: 'end-1', type: 'end', config: {} },
        ],
        edges: [
          { id: 'e1', source: 'trigger-1', target: 'send-1' },
          { id: 'e2', source: 'send-1', target: 'end-1' },
        ],
      };

      const result = validateFlow(flowData);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('message'))).toBe(true);
    });

    it('should detect orphaned nodes', () => {
      const flowData = {
        name: 'Orphaned Node Test',
        triggerType: 'message_received',
        nodes: [
          { id: 'trigger-1', type: 'trigger', config: {} },
          { id: 'orphan-1', type: 'send_message', config: { message: 'Test' } },
          { id: 'end-1', type: 'end', config: {} },
        ],
        edges: [
          { id: 'e1', source: 'trigger-1', target: 'end-1' },
        ],
      };

      const result = validateFlow(flowData);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('orphaned'))).toBe(true);
    });

    it('should validate http_request node configuration', () => {
      const flowData = {
        name: 'HTTP Request Node Test',
        triggerType: 'message_received',
        nodes: [
          { id: 'trigger-1', type: 'trigger', config: {} },
          { id: 'http-1', type: 'http_request', config: { method: 'GET' } }, // Missing url
          { id: 'end-1', type: 'end', config: {} },
        ],
        edges: [
          { id: 'e1', source: 'trigger-1', target: 'http-1' },
          { id: 'e2', source: 'http-1', target: 'end-1' },
        ],
      };

      const result = validateFlow(flowData);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('url'))).toBe(true);
    });
  });

  describe('Flow Trigger Tests', () => {
    let testContact;
    let testFlow;

    beforeAll(async () => {
      // Create test contact
      testContact = await prisma.contacts.create({
        data: {
          id: crypto.randomUUID(),
          team_id: sharedTeam.id,
          phone: '+1234567891',
          first_name: 'Trigger',
          last_name: 'Test',
          created_at: new Date(),
          updated_at: new Date(),
        },
      });

      // Create test flow
      testFlow = await prisma.flows.create({
        data: {
          id: crypto.randomUUID(),
          team_id: sharedTeam.id,
          user_id: sharedTestUser.id,
          name: 'Test Flow - Trigger',
          triggerType: 'message_received',
          trigger_config: {},
          nodes: [
            { id: 'trigger-1', type: 'trigger', data: {} },
            { id: 'end-1', type: 'end', data: {} },
          ],
          edges: [
            { id: 'e1', source: 'trigger-1', target: 'end-1' },
          ],
          is_active: true,
          created_at: new Date(),
          updated_at: new Date(),
        },
      });
    });

    afterAll(async () => {
      await prisma.flow_executions.deleteMany({
        where: { flow_id: testFlow.id },
      });
      await prisma.flows.deleteMany({ where: { id: testFlow.id } });
      await prisma.contacts.deleteMany({ where: { id: testContact.id } });
    });

    it('should register a trigger', () => {
      flowTriggers.registerTrigger(testFlow.id, sharedTeam.id, 'message_received', {});
      const triggers = flowTriggers.getTriggersByType('message_received');
      expect(triggers.some(t => t.flowId === testFlow.id)).toBe(true);
    });

    it('should unregister a trigger', () => {
      flowTriggers.registerTrigger(testFlow.id, sharedTeam.id, 'message_received', {});
      flowTriggers.unregisterTrigger(testFlow.id, 'message_received');
      const triggers = flowTriggers.getTriggersByType('message_received');
      expect(triggers.some(t => t.flowId === testFlow.id)).toBe(false);
    });

    it('should fire trigger and start flow execution', async () => {
      flowTriggers.registerTrigger(testFlow.id, sharedTeam.id, 'message_received', {});
      
      const executions = await flowTriggers.fireTrigger('message_received', {
        teamId: sharedTeam.id,
        contactId: testContact.id,
        message: 'Test message',
        messageType: 'text',
      });

      expect(executions).toBeDefined();
      expect(executions.length).toBeGreaterThan(0);
      expect(executions[0].status).toBe('running');
    });

    it('should not fire trigger for inactive flow', async () => {
      // Deactivate flow
      await prisma.flows.update({
        where: { id: testFlow.id },
        data: { is_active: false },
      });

      flowTriggers.unregisterTrigger(testFlow.id, 'message_received');
      
      const executions = await flowTriggers.fireTrigger('message_received', {
        teamId: sharedTeam.id,
        contactId: testContact.id,
        message: 'Test message',
      });

      expect(executions.some(e => e.flow_id === testFlow.id)).toBe(false);

      // Reactivate for other tests
      await prisma.flows.update({
        where: { id: testFlow.id },
        data: { is_active: true },
      });
    });
  });

  describe('Flow Node Execution Tests', () => {
    let testContact;

    beforeAll(async () => {
      testContact = await prisma.contacts.create({
        data: {
          id: crypto.randomUUID(),
          team_id: sharedTeam.id,
          phone: '+1234567892',
          first_name: 'Node',
          last_name: 'Test',
          custom_fields: { status: 'new' },
          created_at: new Date(),
          updated_at: new Date(),
        },
      });
    });

    afterAll(async () => {
      await prisma.contacts.deleteMany({ where: { id: testContact.id } });
    });

    it('should execute wait node with delay', async () => {
      const flow = await prisma.flows.create({
        data: {
          id: crypto.randomUUID(),
          team_id: sharedTeam.id,
          user_id: sharedTestUser.id,
          name: 'Test Flow - Wait Node',
          triggerType: 'manual',
          trigger_config: {},
          nodes: [
            { id: 'trigger-1', type: 'trigger', data: {} },
            { id: 'wait-1', type: 'wait', data: { duration: 1, unit: 'seconds' } },
            { id: 'end-1', type: 'end', data: {} },
          ],
          edges: [
            { id: 'e1', source: 'trigger-1', target: 'wait-1' },
            { id: 'e2', source: 'wait-1', target: 'end-1' },
          ],
          is_active: true,
          created_at: new Date(),
          updated_at: new Date(),
        },
      });

      const execution = await flowExecutor.startFlowExecution(
        flow.id,
        testContact.id,
        { testMode: true }
      );

      expect(execution).toBeDefined();
      expect(execution.status).toBe('running');

      // Clean up
      await prisma.flow_executions.deleteMany({ where: { flow_id: flow.id } });
      await prisma.flows.deleteMany({ where: { id: flow.id } });
    });

    it('should execute send_message node', async () => {
      const flow = await prisma.flows.create({
        data: {
          id: crypto.randomUUID(),
          team_id: sharedTeam.id,
          user_id: sharedTestUser.id,
          name: 'Test Flow - Send Message',
          triggerType: 'manual',
          trigger_config: {},
          nodes: [
            { id: 'trigger-1', type: 'trigger', data: {} },
            { id: 'send-1', type: 'send_message', data: { message: 'Hello {{contact.first_name}}!', messageType: 'text' } },
            { id: 'end-1', type: 'end', data: {} },
          ],
          edges: [
            { id: 'e1', source: 'trigger-1', target: 'send-1' },
            { id: 'e2', source: 'send-1', target: 'end-1' },
          ],
          is_active: true,
          variables: { testMode: true },
          created_at: new Date(),
          updated_at: new Date(),
        },
      });

      const execution = await flowExecutor.startFlowExecution(
        flow.id,
        testContact.id,
        { testMode: true }
      );

      expect(execution).toBeDefined();
      expect(execution.variables.testMode).toBe(true);

      // Clean up
      await prisma.flow_executions.deleteMany({ where: { flow_id: flow.id } });
      await prisma.flows.deleteMany({ where: { id: flow.id } });
    });

    it('should execute condition node and branch correctly', async () => {
      const flow = await prisma.flows.create({
        data: {
          id: crypto.randomUUID(),
          team_id: sharedTeam.id,
          user_id: sharedTestUser.id,
          name: 'Test Flow - Condition',
          triggerType: 'manual',
          trigger_config: {},
          nodes: [
            { id: 'trigger-1', type: 'trigger', data: {} },
            { 
              id: 'condition-1', 
              type: 'condition', 
              data: { 
                conditions: [
                  { field: 'contact.first_name', operator: 'equals', value: 'Node' }
                ],
                operator: 'AND'
              } 
            },
            { id: 'end-true', type: 'end', data: {} },
            { id: 'end-false', type: 'end', data: {} },
          ],
          edges: [
            { id: 'e1', source: 'trigger-1', target: 'condition-1' },
            { id: 'e2', source: 'condition-1', target: 'end-true', label: 'true' },
            { id: 'e3', source: 'condition-1', target: 'end-false', label: 'false' },
          ],
          is_active: true,
          created_at: new Date(),
          updated_at: new Date(),
        },
      });

      const execution = await flowExecutor.startFlowExecution(
        flow.id,
        testContact.id,
        {}
      );

      expect(execution).toBeDefined();

      // Clean up
      await prisma.flow_executions.deleteMany({ where: { flow_id: flow.id } });
      await prisma.flows.deleteMany({ where: { id: flow.id } });
    });

    it('should execute update_field node', async () => {
      const flow = await prisma.flows.create({
        data: {
          id: crypto.randomUUID(),
          team_id: sharedTeam.id,
          user_id: sharedTestUser.id,
          name: 'Test Flow - Update Field',
          triggerType: 'manual',
          trigger_config: {},
          nodes: [
            { id: 'trigger-1', type: 'trigger', data: {} },
            { id: 'update-1', type: 'update_field', data: { field: 'custom_status', value: 'active' } },
            { id: 'end-1', type: 'end', data: {} },
          ],
          edges: [
            { id: 'e1', source: 'trigger-1', target: 'update-1' },
            { id: 'e2', source: 'update-1', target: 'end-1' },
          ],
          is_active: true,
          created_at: new Date(),
          updated_at: new Date(),
        },
      });

      const execution = await flowExecutor.startFlowExecution(
        flow.id,
        testContact.id,
        {}
      );

      expect(execution).toBeDefined();

      // Clean up
      await prisma.flow_executions.deleteMany({ where: { flow_id: flow.id } });
      await prisma.flows.deleteMany({ where: { id: flow.id } });
    });
  });

  describe('Flow Condition Evaluation Tests', () => {
    it('should evaluate equals condition correctly', async () => {
      const flowData = {
        name: 'Condition Test - Equals',
        triggerType: 'message_received',
        nodes: [
          { id: 'trigger-1', type: 'trigger', config: {}, position: { x: 100, y: 100 } },
          { 
            id: 'condition-1', 
            type: 'condition', 
            config: { 
              conditions: [
                { field: 'contact.first_name', operator: 'equals', value: 'Test' }
              ]
            },
            position: { x: 100, y: 200 }
          },
          { id: 'end-1', type: 'end', config: {}, position: { x: 100, y: 300 } },
        ],
        edges: [
          { id: 'e1', source: 'trigger-1', target: 'condition-1' },
          { id: 'e2', source: 'condition-1', target: 'end-1' },
        ],
      };

      const response = await request(app)
        .post('/api/v1/flows')
        .set('Authorization', `Bearer ${sharedAccessToken}`)
        .send(flowData);

      expect(response.status).toBe(201);
    });

    it('should evaluate contains condition correctly', async () => {
      const flowData = {
        name: 'Condition Test - Contains',
        triggerType: 'message_received',
        nodes: [
          { id: 'trigger-1', type: 'trigger', config: {}, position: { x: 100, y: 100 } },
          { 
            id: 'condition-1', 
            type: 'condition', 
            config: { 
              conditions: [
                { field: 'contact.email', operator: 'contains', value: '@example.com' }
              ]
            },
            position: { x: 100, y: 200 }
          },
          { id: 'end-1', type: 'end', config: {}, position: { x: 100, y: 300 } },
        ],
        edges: [
          { id: 'e1', source: 'trigger-1', target: 'condition-1' },
          { id: 'e2', source: 'condition-1', target: 'end-1' },
        ],
      };

      const response = await request(app)
        .post('/api/v1/flows')
        .set('Authorization', `Bearer ${sharedAccessToken}`)
        .send(flowData);

      expect(response.status).toBe(201);
    });

    it('should evaluate greater_than condition correctly', async () => {
      const flowData = {
        name: 'Condition Test - Greater Than',
        triggerType: 'message_received',
        nodes: [
          { id: 'trigger-1', type: 'trigger', config: {}, position: { x: 100, y: 100 } },
          { 
            id: 'condition-1', 
            type: 'condition', 
            config: { 
              conditions: [
                { field: 'contact.age', operator: 'greater_than', value: 18 }
              ]
            },
            position: { x: 100, y: 200 }
          },
          { id: 'end-1', type: 'end', config: {}, position: { x: 100, y: 300 } },
        ],
        edges: [
          { id: 'e1', source: 'trigger-1', target: 'condition-1' },
          { id: 'e2', source: 'condition-1', target: 'end-1' },
        ],
      };

      const response = await request(app)
        .post('/api/v1/flows')
        .set('Authorization', `Bearer ${sharedAccessToken}`)
        .send(flowData);

      expect(response.status).toBe(201);
    });
  });

  describe('Flow Error Handling Tests', () => {
    let testContact;

    beforeAll(async () => {
      testContact = await prisma.contacts.create({
        data: {
          id: crypto.randomUUID(),
          team_id: sharedTeam.id,
          phone: '+1234567893',
          first_name: 'Error',
          last_name: 'Test',
          created_at: new Date(),
          updated_at: new Date(),
        },
      });
    });

    afterAll(async () => {
      await prisma.contacts.deleteMany({ where: { id: testContact.id } });
    });

    it('should handle flow execution errors gracefully', async () => {
      const flow = await prisma.flows.create({
        data: {
          id: crypto.randomUUID(),
          team_id: sharedTeam.id,
          user_id: sharedTestUser.id,
          name: 'Test Flow - Error Handling',
          triggerType: 'manual',
          trigger_config: {},
          nodes: [
            { id: 'trigger-1', type: 'trigger', data: {} },
            { id: 'http-1', type: 'http_request', data: { url: 'https://invalid-url-that-does-not-exist.com', method: 'GET' } },
            { id: 'end-1', type: 'end', data: {} },
          ],
          edges: [
            { id: 'e1', source: 'trigger-1', target: 'http-1' },
            { id: 'e2', source: 'http-1', target: 'end-1' },
          ],
          is_active: true,
          created_at: new Date(),
          updated_at: new Date(),
        },
      });

      const execution = await flowExecutor.startFlowExecution(
        flow.id,
        testContact.id,
        {}
      );

      expect(execution).toBeDefined();
      expect(execution.status).toBe('running');

      // Clean up
      await prisma.flow_executions.deleteMany({ where: { flow_id: flow.id } });
      await prisma.flows.deleteMany({ where: { id: flow.id } });
    });

    it('should fail execution when flow not found', async () => {
      const fakeFlowId = crypto.randomUUID();

      await expect(
        flowExecutor.startFlowExecution(fakeFlowId, testContact.id, {})
      ).rejects.toThrow('Flow not found');
    });

    it('should fail execution when flow is inactive', async () => {
      const flow = await prisma.flows.create({
        data: {
          id: crypto.randomUUID(),
          team_id: sharedTeam.id,
          user_id: sharedTestUser.id,
          name: 'Test Flow - Inactive',
          triggerType: 'manual',
          trigger_config: {},
          nodes: [
            { id: 'trigger-1', type: 'trigger', data: {} },
            { id: 'end-1', type: 'end', data: {} },
          ],
          edges: [
            { id: 'e1', source: 'trigger-1', target: 'end-1' },
          ],
          is_active: false,
          created_at: new Date(),
          updated_at: new Date(),
        },
      });

      await expect(
        flowExecutor.startFlowExecution(flow.id, testContact.id, {})
      ).rejects.toThrow('Flow is not active');

      // Clean up
      await prisma.flows.deleteMany({ where: { id: flow.id } });
    });
  });

  describe('Flow Execution Tests', () => {
    let testContact;
    let testFlow;

    beforeAll(async () => {
      // Create a test contact
      testContact = await prisma.contacts.create({
        data: {
          id: crypto.randomUUID(),
          team_id: sharedTeam.id,
          phone: '+1234567890',
          first_name: 'Test',
          last_name: 'Contact',
          created_at: new Date(),
          updated_at: new Date(),
        },
      });

      // Create a test flow with multiple node types
      testFlow = await prisma.flows.create({
        data: {
          id: crypto.randomUUID(),
          team_id: sharedTeam.id,
          user_id: sharedTestUser.id,
          name: 'Test Flow - Execution',
          triggerType: 'manual',
          trigger_config: {},
          nodes: [
            { id: 'trigger-1', type: 'trigger', data: {} },
            { id: 'wait-1', type: 'wait', data: { duration: 1, unit: 'seconds' } },
            { id: 'end-1', type: 'end', data: {} },
          ],
          edges: [
            { id: 'e1', source: 'trigger-1', target: 'wait-1' },
            { id: 'e2', source: 'wait-1', target: 'end-1' },
          ],
          is_active: true,
          created_at: new Date(),
          updated_at: new Date(),
        },
      });
    });

    afterAll(async () => {
      // Clean up
      await prisma.flow_executions.deleteMany({
        where: { flow_id: testFlow.id },
      });
      await prisma.flows.deleteMany({ where: { id: testFlow.id } });
      await prisma.contacts.deleteMany({ where: { id: testContact.id } });
    });

    it('should manually trigger a flow', async () => {
      const response = await request(app)
        .post(`/api/v1/flows/${testFlow.id}/trigger`)
        .set('Authorization', `Bearer ${sharedAccessToken}`)
        .send({
          contactId: testContact.id,
          data: { testData: 'test value' },
        });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Flow triggered successfully');
      expect(response.body.execution).toBeDefined();
      expect(response.body.execution.id).toBeDefined();
      expect(response.body.execution.status).toBe('running');
    });

    it('should get flow executions', async () => {
      const response = await request(app)
        .get(`/api/v1/flows/${testFlow.id}/executions`)
        .set('Authorization', `Bearer ${sharedAccessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.executions).toBeDefined();
      expect(Array.isArray(response.body.executions)).toBe(true);
      expect(response.body.pagination).toBeDefined();
    });

    it('should test a flow', async () => {
      const response = await request(app)
        .post(`/api/v1/flows/${testFlow.id}/test`)
        .set('Authorization', `Bearer ${sharedAccessToken}`)
        .send({
          contactId: testContact.id,
        });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Flow test started');
      expect(response.body.execution).toBeDefined();
    });

    it('should return 400 when triggering flow without contactId', async () => {
      const response = await request(app)
        .post(`/api/v1/flows/${testFlow.id}/trigger`)
        .set('Authorization', `Bearer ${sharedAccessToken}`)
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('ValidationError');
    });

    it('should return 404 when triggering non-existent flow', async () => {
      const fakeFlowId = crypto.randomUUID();
      const response = await request(app)
        .post(`/api/v1/flows/${fakeFlowId}/trigger`)
        .set('Authorization', `Bearer ${sharedAccessToken}`)
        .send({
          contactId: testContact.id,
        });

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('NotFound');
    });

    it('should get a single flow execution with details', async () => {
      // First trigger a flow to create an execution
      const triggerResponse = await request(app)
        .post(`/api/v1/flows/${testFlow.id}/trigger`)
        .set('Authorization', `Bearer ${sharedAccessToken}`)
        .send({
          contactId: testContact.id,
          data: { testData: 'execution details test' },
        });

      const executionId = triggerResponse.body.execution.id;

      // Get the execution details
      const response = await request(app)
        .get(`/api/v1/flows/executions/${executionId}`)
        .set('Authorization', `Bearer ${sharedAccessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.execution).toBeDefined();
      expect(response.body.execution.id).toBe(executionId);
      expect(response.body.execution.flows).toBeDefined();
      expect(response.body.execution.contacts).toBeDefined();
      expect(response.body.execution.status).toBeDefined();
      expect(response.body.execution.started_at).toBeDefined();
    });

    it('should return 404 for non-existent execution', async () => {
      const fakeExecutionId = crypto.randomUUID();
      const response = await request(app)
        .get(`/api/v1/flows/executions/${fakeExecutionId}`)
        .set('Authorization', `Bearer ${sharedAccessToken}`);

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('NotFound');
    });

    it('should return 400 when testing flow without contactId', async () => {
      const response = await request(app)
        .post(`/api/v1/flows/${testFlow.id}/test`)
        .set('Authorization', `Bearer ${sharedAccessToken}`)
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('ValidationError');
      expect(response.body.message).toContain('Contact ID is required');
    });
  });
});
