import { jest } from '@jest/globals';
import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

// Mock dependencies
jest.unstable_mockModule('../src/utils/logger.js', () => ({
  default: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

jest.unstable_mockModule('../src/services/emailService.js', () => ({
  default: {
    sendTeamInvitation: jest.fn().mockResolvedValue({ success: true }),
  },
}));

jest.unstable_mockModule('../src/config/index.js', () => ({
  default: {
    app: {
      url: 'http://localhost:3000',
      name: 'WhatsApp CRM',
    },
  },
}));

jest.unstable_mockModule('../src/sockets/index.js', () => ({
  emitTeamActivity: jest.fn(),
  default: {
    emitTeamActivity: jest.fn(),
  },
}));

const prisma = new PrismaClient();

describe('Team Management', () => {
  let testTeam;
  let testUser;
  let testInviter;

  beforeAll(async () => {
    // Clean up test data
    await prisma.team_invitations.deleteMany({
      where: { email: { contains: 'test-team' } },
    });
    await prisma.team_members.deleteMany({
      where: { email: { contains: 'test-team' } },
    });
    await prisma.activity_logs.deleteMany({
      where: { team_id: { contains: 'test-team' } },
    });

    // Create test team
    testTeam = await prisma.teams.create({
      data: {
        id: crypto.randomUUID(),
        name: 'Test Team',
        slug: `test-team-${Date.now()}`,
        owner_id: crypto.randomUUID(),
      },
    });

    // Create test users
    testInviter = await prisma.users.create({
      data: {
        id: crypto.randomUUID(),
        email: `test-team-inviter-${Date.now()}@example.com`,
        password_hash: 'hashed_password',
        first_name: 'Test',
        last_name: 'Inviter',
      },
    });

    testUser = await prisma.users.create({
      data: {
        id: crypto.randomUUID(),
        email: `test-team-member-${Date.now()}@example.com`,
        password_hash: 'hashed_password',
        first_name: 'Test',
        last_name: 'Member',
      },
    });
  });

  afterAll(async () => {
    // Clean up test data
    await prisma.team_invitations.deleteMany({
      where: { team_id: testTeam.id },
    });
    await prisma.team_members.deleteMany({
      where: { team_id: testTeam.id },
    });
    await prisma.activity_logs.deleteMany({
      where: { team_id: testTeam.id },
    });
    await prisma.users.deleteMany({
      where: {
        id: { in: [testUser.id, testInviter.id] },
      },
    });
    await prisma.teams.delete({
      where: { id: testTeam.id },
    });
    await prisma.$disconnect();
  });

  describe('Team Invitation', () => {
    test('should create team invitation with valid token', async () => {
      const teamService = (await import('../src/services/teamService.js')).default;

      const invitation = await teamService.inviteTeamMember(
        testTeam.id,
        testUser.email,
        'Manager',
        testInviter.id,
        '127.0.0.1',
        'test-agent'
      );

      expect(invitation).toBeDefined();
      expect(invitation.email).toBe(testUser.email);
      expect(invitation.role).toBe('Manager');
      expect(invitation.token).toBeDefined();
      expect(invitation.token.length).toBe(64); // 32 bytes hex = 64 chars
      expect(invitation.expires_at).toBeDefined();
      expect(new Date(invitation.expires_at) > new Date()).toBe(true);
    });

    test('should not allow duplicate invitation', async () => {
      const teamService = (await import('../src/services/teamService.js')).default;

      await expect(
        teamService.inviteTeamMember(
          testTeam.id,
          testUser.email,
          'Manager',
          testInviter.id,
          '127.0.0.1',
          'test-agent'
        )
      ).rejects.toThrow('An invitation has already been sent to this email');
    });
  });

  describe('Accept Invitation', () => {
    let invitationToken;

    beforeAll(async () => {
      const newUserEmail = `test-team-new-${Date.now()}@example.com`;
      const newUser = await prisma.users.create({
        data: {
          id: crypto.randomUUID(),
          email: newUserEmail,
          password_hash: 'hashed_password',
          first_name: 'New',
          last_name: 'Member',
        },
      });

      const teamService = (await import('../src/services/teamService.js')).default;
      const invitation = await teamService.inviteTeamMember(
        testTeam.id,
        newUserEmail,
        'Agent',
        testInviter.id,
        '127.0.0.1',
        'test-agent'
      );

      invitationToken = invitation.token;
      testUser = newUser; // Update testUser for acceptance test
    });

    test('should accept valid invitation', async () => {
      const teamService = (await import('../src/services/teamService.js')).default;

      const member = await teamService.acceptInvitation(invitationToken, testUser.id);

      expect(member).toBeDefined();
      expect(member.team_id).toBe(testTeam.id);
      expect(member.user_id).toBe(testUser.id);
      expect(member.role).toBe('Agent');
      expect(member.status).toBe('Active');
      expect(member.joined_at).toBeDefined();
    });

    test('should not accept already accepted invitation', async () => {
      const teamService = (await import('../src/services/teamService.js')).default;

      await expect(
        teamService.acceptInvitation(invitationToken, testUser.id)
      ).rejects.toThrow('Invitation has already been accepted');
    });

    test('should not accept invalid token', async () => {
      const teamService = (await import('../src/services/teamService.js')).default;

      await expect(
        teamService.acceptInvitation('invalid-token', testUser.id)
      ).rejects.toThrow('Invalid invitation token');
    });
  });

  describe('Team Member Management', () => {
    let teamMember;

    beforeAll(async () => {
      // Create a team member for testing
      teamMember = await prisma.team_members.create({
        data: {
          id: crypto.randomUUID(),
          team_id: testTeam.id,
          user_id: testUser.id,
          email: testUser.email,
          role: 'Manager',
          status: 'Active',
          joined_at: new Date(),
        },
      });
    });

    test('should get team members', async () => {
      const teamService = (await import('../src/services/teamService.js')).default;

      const members = await teamService.getTeamMembers(testTeam.id);

      expect(members).toBeDefined();
      expect(Array.isArray(members)).toBe(true);
      expect(members.length).toBeGreaterThan(0);
    });

    test('should filter team members by role', async () => {
      const teamService = (await import('../src/services/teamService.js')).default;

      const members = await teamService.getTeamMembers(testTeam.id, { role: 'Manager' });

      expect(members).toBeDefined();
      expect(members.every((m) => m.role === 'Manager')).toBe(true);
    });

    test('should update member role', async () => {
      const teamService = (await import('../src/services/teamService.js')).default;

      const updated = await teamService.updateMemberRole(
        testTeam.id,
        teamMember.id,
        'Admin',
        testInviter.id,
        '127.0.0.1',
        'test-agent'
      );

      expect(updated).toBeDefined();
      expect(updated.role).toBe('Admin');
    });

    test('should suspend team member', async () => {
      const teamService = (await import('../src/services/teamService.js')).default;

      const suspended = await teamService.suspendMember(
        testTeam.id,
        teamMember.id,
        testInviter.id,
        '127.0.0.1',
        'test-agent'
      );

      expect(suspended).toBeDefined();
      expect(suspended.status).toBe('Suspended');
      expect(suspended.suspended_at).toBeDefined();
    });

    test('should reactivate team member', async () => {
      const teamService = (await import('../src/services/teamService.js')).default;

      const reactivated = await teamService.reactivateMember(
        testTeam.id,
        teamMember.id,
        testInviter.id,
        '127.0.0.1',
        'test-agent'
      );

      expect(reactivated).toBeDefined();
      expect(reactivated.status).toBe('Active');
      expect(reactivated.suspended_at).toBeNull();
    });

    test('should remove team member', async () => {
      const teamService = (await import('../src/services/teamService.js')).default;

      const result = await teamService.removeMember(
        testTeam.id,
        teamMember.id,
        testInviter.id,
        '127.0.0.1',
        'test-agent'
      );

      expect(result).toBeDefined();
      expect(result.success).toBe(true);

      // Verify member is marked as removed
      const member = await prisma.team_members.findUnique({
        where: { id: teamMember.id },
      });
      expect(member.status).toBe('Removed');
    });
  });

  describe('Activity Logging', () => {
    test('should log team activity', async () => {
      const teamService = (await import('../src/services/teamService.js')).default;

      await teamService.logActivity(
        testTeam.id,
        testUser.id,
        testInviter.id,
        'test.action',
        'test_resource',
        'test-resource-id',
        { test: 'data' },
        '127.0.0.1',
        'test-agent'
      );

      const logs = await teamService.getActivityLogs(testTeam.id);

      expect(logs).toBeDefined();
      expect(Array.isArray(logs)).toBe(true);
      expect(logs.length).toBeGreaterThan(0);
      expect(logs[0].action).toBe('test.action');
    });

    test('should filter activity logs by action', async () => {
      const teamService = (await import('../src/services/teamService.js')).default;

      const logs = await teamService.getActivityLogs(testTeam.id, {
        action: 'test.action',
      });

      expect(logs).toBeDefined();
      expect(logs.every((log) => log.action === 'test.action')).toBe(true);
    });

    test('should filter activity logs by user', async () => {
      const teamService = (await import('../src/services/teamService.js')).default;

      const logs = await teamService.getActivityLogs(testTeam.id, {
        userId: testUser.id,
      });

      expect(logs).toBeDefined();
      expect(logs.every((log) => log.user_id === testUser.id)).toBe(true);
    });

    test('should filter activity logs by resource', async () => {
      const teamService = (await import('../src/services/teamService.js')).default;

      const logs = await teamService.getActivityLogs(testTeam.id, {
        resource: 'test_resource',
      });

      expect(logs).toBeDefined();
      expect(logs.every((log) => log.resource === 'test_resource')).toBe(true);
    });

    test('should filter activity logs by date range', async () => {
      const teamService = (await import('../src/services/teamService.js')).default;

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 7);
      const endDate = new Date();

      const logs = await teamService.getActivityLogs(testTeam.id, {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      });

      expect(logs).toBeDefined();
      expect(Array.isArray(logs)).toBe(true);
      logs.forEach((log) => {
        const logDate = new Date(log.created_at);
        expect(logDate >= startDate && logDate <= endDate).toBe(true);
      });
    });

    test('should export activity logs to CSV', async () => {
      const teamService = (await import('../src/services/teamService.js')).default;

      const result = await teamService.exportActivityLogs(testTeam.id);

      expect(result).toBeDefined();
      expect(result.csv).toBeDefined();
      expect(result.filename).toBeDefined();
      expect(result.count).toBeGreaterThan(0);
      expect(result.csv).toContain('Timestamp');
      expect(result.csv).toContain('Action');
      expect(result.csv).toContain('Resource');
      expect(result.filename).toMatch(/^activity-logs-.*\.csv$/);
    });

    test('should export filtered activity logs', async () => {
      const teamService = (await import('../src/services/teamService.js')).default;

      const result = await teamService.exportActivityLogs(testTeam.id, {
        action: 'test.action',
      });

      expect(result).toBeDefined();
      expect(result.csv).toBeDefined();
      expect(result.count).toBeGreaterThan(0);
      
      // Verify CSV contains only filtered actions
      const rows = result.csv.split('\n');
      expect(rows.length).toBeGreaterThan(1); // Header + at least one row
    });
  });

  describe('Permission Enforcement', () => {
    test('should not allow non-owner to remove team owner', async () => {
      const teamService = (await import('../src/services/teamService.js')).default;

      // Create owner member
      const ownerMember = await prisma.team_members.create({
        data: {
          id: crypto.randomUUID(),
          team_id: testTeam.id,
          user_id: testTeam.owner_id,
          email: 'owner@example.com',
          role: 'Owner',
          status: 'Active',
          joined_at: new Date(),
        },
      });

      await expect(
        teamService.removeMember(
          testTeam.id,
          ownerMember.id,
          testInviter.id,
          '127.0.0.1',
          'test-agent'
        )
      ).rejects.toThrow('Cannot remove team owner');

      // Clean up
      await prisma.team_members.delete({
        where: { id: ownerMember.id },
      });
    });

    test('should not allow changing role of team owner', async () => {
      const teamService = (await import('../src/services/teamService.js')).default;

      // Create owner member
      const ownerMember = await prisma.team_members.create({
        data: {
          id: crypto.randomUUID(),
          team_id: testTeam.id,
          user_id: testTeam.owner_id,
          email: 'owner@example.com',
          role: 'Owner',
          status: 'Active',
          joined_at: new Date(),
        },
      });

      await expect(
        teamService.updateMemberRole(
          testTeam.id,
          ownerMember.id,
          'Admin',
          testInviter.id,
          '127.0.0.1',
          'test-agent'
        )
      ).rejects.toThrow('Cannot change role of team owner');

      // Clean up
      await prisma.team_members.delete({
        where: { id: ownerMember.id },
      });
    });

    test('should not allow suspending team owner', async () => {
      const teamService = (await import('../src/services/teamService.js')).default;

      // Create owner member
      const ownerMember = await prisma.team_members.create({
        data: {
          id: crypto.randomUUID(),
          team_id: testTeam.id,
          user_id: testTeam.owner_id,
          email: 'owner@example.com',
          role: 'Owner',
          status: 'Active',
          joined_at: new Date(),
        },
      });

      await expect(
        teamService.suspendMember(
          testTeam.id,
          ownerMember.id,
          testInviter.id,
          '127.0.0.1',
          'test-agent'
        )
      ).rejects.toThrow('Cannot suspend team owner');

      // Clean up
      await prisma.team_members.delete({
        where: { id: ownerMember.id },
      });
    });
  });
});
