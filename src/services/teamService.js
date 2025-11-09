import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';
import emailService from './emailService.js';
import logger from '../utils/logger.js';
import { emitTeamActivity } from '../sockets/index.js';

const prisma = new PrismaClient();

/**
 * Generate a unique invitation token
 */
function generateInvitationToken() {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Log team activity
 */
async function logActivity(teamId, userId, performedBy, action, resource, resourceId = null, details = null, ipAddress = null, userAgent = null) {
  try {
    const activityLog = await prisma.activity_logs.create({
      data: {
        id: crypto.randomUUID(),
        team_id: teamId,
        user_id: userId,
        performed_by: performedBy,
        action,
        resource,
        resource_id: resourceId,
        details,
        ip_address: ipAddress,
        user_agent: userAgent
      },
      include: {
        owner: {
          select: {
            id: true,
            email: true,
            first_name: true,
            last_name: true,
            avatar_url: true
          }
        },
        performer: {
          select: {
            id: true,
            email: true,
            first_name: true,
            last_name: true,
            avatar_url: true
          }
        }
      }
    });

    // Emit real-time event to all team members
    try {
      // Get all active team members
      const teamMembers = await prisma.team_members.findMany({
        where: {
          team_id: teamId,
          status: 'Active'
        },
        select: {
          user_id: true
        }
      });

      // Emit to each team member
      teamMembers.forEach(member => {
        emitTeamActivity(member.user_id, {
          id: activityLog.id,
          action: activityLog.action,
          resource: activityLog.resource,
          resource_id: activityLog.resource_id,
          details: activityLog.details,
          created_at: activityLog.created_at,
          user: activityLog.owner,
          performed_by: activityLog.performer
        });
      });
    } catch (socketError) {
      // Don't fail if Socket.io emission fails
      logger.error('Failed to emit activity via Socket.io:', socketError);
    }
  } catch (error) {
    logger.error('Failed to log activity:', error);
  }
}

/**
 * Invite a team member
 */
async function inviteTeamMember(teamId, email, role, invitedBy, ipAddress, userAgent) {
  // Check if user already exists in team
  const existingMember = await prisma.team_members.findFirst({
    where: {
      team_id: teamId,
      email: email
    }
  });

  if (existingMember) {
    throw new Error('User is already a member of this team');
  }

  // Check if there's a pending invitation
  const existingInvitation = await prisma.team_invitations.findFirst({
    where: {
      team_id: teamId,
      email: email,
      accepted_at: null,
      expires_at: {
        gt: new Date()
      }
    }
  });

  if (existingInvitation) {
    throw new Error('An invitation has already been sent to this email');
  }

  // Generate invitation token
  const token = generateInvitationToken();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiration

  // Create invitation
  const invitation = await prisma.team_invitations.create({
    data: {
      id: crypto.randomUUID(),
      team_id: teamId,
      email,
      role,
      token,
      invited_by: invitedBy,
      expires_at: expiresAt
    },
    include: {
      teams: true,
      inviter: {
        select: {
          first_name: true,
          last_name: true,
          email: true
        }
      }
    }
  });

  // Send invitation email
  try {
    await emailService.sendTeamInvitation(
      email,
      invitation.teams.name,
      invitation.inviter.first_name || invitation.inviter.email,
      token,
      role
    );
  } catch (error) {
    logger.error('Failed to send invitation email:', error);
    // Don't throw error, invitation is created
  }

  // Log activity
  await logActivity(
    teamId,
    invitedBy,
    invitedBy,
    'team.member.invited',
    'team_invitation',
    invitation.id,
    { email, role },
    ipAddress,
    userAgent
  );

  return invitation;
}

/**
 * Accept team invitation
 */
async function acceptInvitation(token, userId) {
  // Find invitation
  const invitation = await prisma.team_invitations.findUnique({
    where: { token },
    include: { teams: true }
  });

  if (!invitation) {
    throw new Error('Invalid invitation token');
  }

  if (invitation.accepted_at) {
    throw new Error('Invitation has already been accepted');
  }

  if (new Date() > invitation.expires_at) {
    throw new Error('Invitation has expired');
  }

  // Get user
  const user = await prisma.users.findUnique({
    where: { id: userId }
  });

  if (!user) {
    throw new Error('User not found');
  }

  if (user.email !== invitation.email) {
    throw new Error('Invitation email does not match user email');
  }

  // Check if user is already a member
  const existingMember = await prisma.team_members.findFirst({
    where: {
      team_id: invitation.team_id,
      user_id: userId
    }
  });

  if (existingMember) {
    // Mark invitation as accepted
    await prisma.team_invitations.update({
      where: { id: invitation.id },
      data: { accepted_at: new Date() }
    });
    return existingMember;
  }

  // Create team member and mark invitation as accepted
  const [member] = await prisma.$transaction([
    prisma.team_members.create({
      data: {
        id: crypto.randomUUID(),
        team_id: invitation.team_id,
        user_id: userId,
        email: user.email,
        role: invitation.role,
        status: 'Active',
        invited_by: invitation.invited_by,
        invited_at: invitation.created_at,
        joined_at: new Date()
      },
      include: {
        users: {
          select: {
            id: true,
            email: true,
            first_name: true,
            last_name: true,
            avatar_url: true
          }
        }
      }
    }),
    prisma.team_invitations.update({
      where: { id: invitation.id },
      data: { accepted_at: new Date() }
    })
  ]);

  // Log activity
  await logActivity(
    invitation.team_id,
    userId,
    userId,
    'team.member.joined',
    'team_member',
    member.id,
    { role: invitation.role }
  );

  return member;
}

/**
 * Get team members with optional role filtering
 */
async function getTeamMembers(teamId, filters = {}) {
  const where = {
    team_id: teamId,
    status: {
      not: 'Removed'
    }
  };

  if (filters.role) {
    where.role = filters.role;
  }

  if (filters.status) {
    where.status = filters.status;
  }

  const members = await prisma.team_members.findMany({
    where,
    include: {
      users: {
        select: {
          id: true,
          email: true,
          first_name: true,
          last_name: true,
          avatar_url: true,
          last_login_at: true
        }
      },
      inviter: {
        select: {
          id: true,
          email: true,
          first_name: true,
          last_name: true
        }
      }
    },
    orderBy: {
      created_at: 'desc'
    }
  });

  return members;
}

/**
 * Update team member role
 */
async function updateMemberRole(teamId, memberId, newRole, performedBy, ipAddress, userAgent) {
  const member = await prisma.team_members.findFirst({
    where: {
      id: memberId,
      team_id: teamId
    }
  });

  if (!member) {
    throw new Error('Team member not found');
  }

  if (member.status === 'Removed') {
    throw new Error('Cannot update removed team member');
  }

  // Check if trying to update team owner
  const team = await prisma.teams.findUnique({
    where: { id: teamId }
  });

  if (team.owner_id === member.user_id) {
    throw new Error('Cannot change role of team owner');
  }

  const oldRole = member.role;

  const updatedMember = await prisma.team_members.update({
    where: { id: memberId },
    data: { role: newRole },
    include: {
      users: {
        select: {
          id: true,
          email: true,
          first_name: true,
          last_name: true,
          avatar_url: true
        }
      }
    }
  });

  // Log activity
  await logActivity(
    teamId,
    member.user_id,
    performedBy,
    'team.member.role_updated',
    'team_member',
    memberId,
    { old_role: oldRole, new_role: newRole },
    ipAddress,
    userAgent
  );

  return updatedMember;
}

/**
 * Remove team member
 */
async function removeMember(teamId, memberId, performedBy, ipAddress, userAgent) {
  const member = await prisma.team_members.findFirst({
    where: {
      id: memberId,
      team_id: teamId
    }
  });

  if (!member) {
    throw new Error('Team member not found');
  }

  // Check if trying to remove team owner
  const team = await prisma.teams.findUnique({
    where: { id: teamId }
  });

  if (team.owner_id === member.user_id) {
    throw new Error('Cannot remove team owner');
  }

  // Mark as removed
  await prisma.team_members.update({
    where: { id: memberId },
    data: {
      status: 'Removed',
      updated_at: new Date()
    }
  });

  // Log activity
  await logActivity(
    teamId,
    member.user_id,
    performedBy,
    'team.member.removed',
    'team_member',
    memberId,
    { email: member.email, role: member.role },
    ipAddress,
    userAgent
  );

  return { success: true, message: 'Team member removed successfully' };
}

/**
 * Suspend team member
 */
async function suspendMember(teamId, memberId, performedBy, ipAddress, userAgent) {
  const member = await prisma.team_members.findFirst({
    where: {
      id: memberId,
      team_id: teamId
    }
  });

  if (!member) {
    throw new Error('Team member not found');
  }

  if (member.status === 'Removed') {
    throw new Error('Cannot suspend removed team member');
  }

  if (member.status === 'Suspended') {
    throw new Error('Team member is already suspended');
  }

  // Check if trying to suspend team owner
  const team = await prisma.teams.findUnique({
    where: { id: teamId }
  });

  if (team.owner_id === member.user_id) {
    throw new Error('Cannot suspend team owner');
  }

  const updatedMember = await prisma.team_members.update({
    where: { id: memberId },
    data: {
      status: 'Suspended',
      suspended_at: new Date()
    },
    include: {
      users: {
        select: {
          id: true,
          email: true,
          first_name: true,
          last_name: true,
          avatar_url: true
        }
      }
    }
  });

  // Revoke all active sessions for this user
  await prisma.refresh_tokens.deleteMany({
    where: { user_id: member.user_id }
  });

  // Log activity
  await logActivity(
    teamId,
    member.user_id,
    performedBy,
    'team.member.suspended',
    'team_member',
    memberId,
    { email: member.email, role: member.role },
    ipAddress,
    userAgent
  );

  return updatedMember;
}

/**
 * Reactivate team member
 */
async function reactivateMember(teamId, memberId, performedBy, ipAddress, userAgent) {
  const member = await prisma.team_members.findFirst({
    where: {
      id: memberId,
      team_id: teamId
    }
  });

  if (!member) {
    throw new Error('Team member not found');
  }

  if (member.status === 'Removed') {
    throw new Error('Cannot reactivate removed team member');
  }

  if (member.status === 'Active') {
    throw new Error('Team member is already active');
  }

  const updatedMember = await prisma.team_members.update({
    where: { id: memberId },
    data: {
      status: 'Active',
      suspended_at: null
    },
    include: {
      users: {
        select: {
          id: true,
          email: true,
          first_name: true,
          last_name: true,
          avatar_url: true
        }
      }
    }
  });

  // Log activity
  await logActivity(
    teamId,
    member.user_id,
    performedBy,
    'team.member.reactivated',
    'team_member',
    memberId,
    { email: member.email, role: member.role },
    ipAddress,
    userAgent
  );

  return updatedMember;
}

/**
 * Get activity logs
 */
async function getActivityLogs(teamId, filters = {}) {
  const where = {
    team_id: teamId
  };

  if (filters.userId) {
    where.user_id = filters.userId;
  }

  if (filters.action) {
    where.action = filters.action;
  }

  if (filters.resource) {
    where.resource = filters.resource;
  }

  if (filters.startDate || filters.endDate) {
    where.created_at = {};
    if (filters.startDate) {
      where.created_at.gte = new Date(filters.startDate);
    }
    if (filters.endDate) {
      where.created_at.lte = new Date(filters.endDate);
    }
  }

  const logs = await prisma.activity_logs.findMany({
    where,
    include: {
      owner: {
        select: {
          id: true,
          email: true,
          first_name: true,
          last_name: true
        }
      },
      performer: {
        select: {
          id: true,
          email: true,
          first_name: true,
          last_name: true
        }
      }
    },
    orderBy: {
      created_at: 'desc'
    },
    take: filters.limit || 100,
    skip: filters.offset || 0
  });

  return logs;
}

/**
 * Export activity logs to CSV
 */
async function exportActivityLogs(teamId, filters = {}) {
  const where = {
    team_id: teamId
  };

  if (filters.userId) {
    where.user_id = filters.userId;
  }

  if (filters.action) {
    where.action = filters.action;
  }

  if (filters.resource) {
    where.resource = filters.resource;
  }

  if (filters.startDate || filters.endDate) {
    where.created_at = {};
    if (filters.startDate) {
      where.created_at.gte = new Date(filters.startDate);
    }
    if (filters.endDate) {
      where.created_at.lte = new Date(filters.endDate);
    }
  }

  // Get all logs without pagination for export
  const logs = await prisma.activity_logs.findMany({
    where,
    include: {
      owner: {
        select: {
          id: true,
          email: true,
          first_name: true,
          last_name: true
        }
      },
      performer: {
        select: {
          id: true,
          email: true,
          first_name: true,
          last_name: true
        }
      }
    },
    orderBy: {
      created_at: 'desc'
    }
  });

  // Convert to CSV format
  const csvHeaders = [
    'Timestamp',
    'Action',
    'Resource',
    'Resource ID',
    'User Email',
    'User Name',
    'Performed By Email',
    'Performed By Name',
    'IP Address',
    'User Agent',
    'Details'
  ];

  const csvRows = logs.map(log => {
    const userName = log.owner ? `${log.owner.first_name || ''} ${log.owner.last_name || ''}`.trim() : '';
    const performerName = log.performer ? `${log.performer.first_name || ''} ${log.performer.last_name || ''}`.trim() : '';
    
    return [
      log.created_at.toISOString(),
      log.action,
      log.resource,
      log.resource_id || '',
      log.owner?.email || '',
      userName,
      log.performer?.email || '',
      performerName,
      log.ip_address || '',
      log.user_agent || '',
      log.details ? JSON.stringify(log.details) : ''
    ].map(field => {
      // Escape quotes and wrap in quotes if contains comma or quote
      const stringField = String(field);
      if (stringField.includes(',') || stringField.includes('"') || stringField.includes('\n')) {
        return `"${stringField.replace(/"/g, '""')}"`;
      }
      return stringField;
    }).join(',');
  });

  const csv = [csvHeaders.join(','), ...csvRows].join('\n');
  
  return {
    csv,
    filename: `activity-logs-${teamId}-${new Date().toISOString().split('T')[0]}.csv`,
    count: logs.length
  };
}

export default {
  inviteTeamMember,
  acceptInvitation,
  getTeamMembers,
  updateMemberRole,
  removeMember,
  suspendMember,
  reactivateMember,
  getActivityLogs,
  exportActivityLogs,
  logActivity
};
