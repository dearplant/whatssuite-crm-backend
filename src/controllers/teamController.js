import teamService from '../services/teamService.js';
import logger from '../utils/logger.js';

/**
 * @route POST /api/v1/team/invite
 * @desc Invite a team member
 * @access Private (Admin, Owner)
 */
async function inviteTeamMember(req, res) {
  try {
    const { email, role } = req.body;
    const teamId = req.user.teamId;
    const invitedBy = req.user.id;
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('user-agent');

    const invitation = await teamService.inviteTeamMember(
      teamId,
      email,
      role,
      invitedBy,
      ipAddress,
      userAgent
    );

    res.status(201).json({
      success: true,
      message: 'Team invitation sent successfully',
      data: {
        id: invitation.id,
        email: invitation.email,
        role: invitation.role,
        expires_at: invitation.expires_at,
        created_at: invitation.created_at
      }
    });
  } catch (error) {
    logger.error('Error inviting team member:', error);
    res.status(400).json({
      success: false,
      error: 'InvitationError',
      message: error.message
    });
  }
}

/**
 * @route POST /api/v1/team/invitations/:token/accept
 * @desc Accept team invitation
 * @access Private
 */
async function acceptInvitation(req, res) {
  try {
    const { token } = req.params;
    const userId = req.user.id;

    const member = await teamService.acceptInvitation(token, userId);

    res.status(200).json({
      success: true,
      message: 'Invitation accepted successfully',
      data: {
        id: member.id,
        team_id: member.team_id,
        role: member.role,
        status: member.status,
        joined_at: member.joined_at,
        user: member.users
      }
    });
  } catch (error) {
    logger.error('Error accepting invitation:', error);
    res.status(400).json({
      success: false,
      error: 'InvitationError',
      message: error.message
    });
  }
}

/**
 * @route GET /api/v1/team/members
 * @desc Get team members
 * @access Private
 */
async function getTeamMembers(req, res) {
  try {
    const teamId = req.user.teamId;
    const { role, status } = req.query;

    const filters = {};
    if (role) filters.role = role;
    if (status) filters.status = status;

    const members = await teamService.getTeamMembers(teamId, filters);

    res.status(200).json({
      success: true,
      data: members.map(member => ({
        id: member.id,
        email: member.email,
        role: member.role,
        status: member.status,
        invited_at: member.invited_at,
        joined_at: member.joined_at,
        suspended_at: member.suspended_at,
        user: member.users,
        invited_by: member.inviter
      })),
      count: members.length
    });
  } catch (error) {
    logger.error('Error fetching team members:', error);
    res.status(500).json({
      success: false,
      error: 'ServerError',
      message: 'Failed to fetch team members'
    });
  }
}

/**
 * @route PUT /api/v1/team/members/:id
 * @desc Update team member role
 * @access Private (Admin, Owner)
 */
async function updateMemberRole(req, res) {
  try {
    const { id } = req.params;
    const { role } = req.body;
    const teamId = req.user.teamId;
    const performedBy = req.user.id;
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('user-agent');

    const member = await teamService.updateMemberRole(
      teamId,
      id,
      role,
      performedBy,
      ipAddress,
      userAgent
    );

    res.status(200).json({
      success: true,
      message: 'Team member role updated successfully',
      data: {
        id: member.id,
        email: member.email,
        role: member.role,
        status: member.status,
        user: member.users
      }
    });
  } catch (error) {
    logger.error('Error updating team member role:', error);
    res.status(400).json({
      success: false,
      error: 'UpdateError',
      message: error.message
    });
  }
}

/**
 * @route DELETE /api/v1/team/members/:id
 * @desc Remove team member
 * @access Private (Admin, Owner)
 */
async function removeMember(req, res) {
  try {
    const { id } = req.params;
    const teamId = req.user.teamId;
    const performedBy = req.user.id;
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('user-agent');

    const result = await teamService.removeMember(
      teamId,
      id,
      performedBy,
      ipAddress,
      userAgent
    );

    res.status(200).json(result);
  } catch (error) {
    logger.error('Error removing team member:', error);
    res.status(400).json({
      success: false,
      error: 'RemovalError',
      message: error.message
    });
  }
}

/**
 * @route POST /api/v1/team/members/:id/suspend
 * @desc Suspend team member
 * @access Private (Admin, Owner)
 */
async function suspendMember(req, res) {
  try {
    const { id } = req.params;
    const teamId = req.user.teamId;
    const performedBy = req.user.id;
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('user-agent');

    const member = await teamService.suspendMember(
      teamId,
      id,
      performedBy,
      ipAddress,
      userAgent
    );

    res.status(200).json({
      success: true,
      message: 'Team member suspended successfully',
      data: {
        id: member.id,
        email: member.email,
        role: member.role,
        status: member.status,
        suspended_at: member.suspended_at,
        user: member.users
      }
    });
  } catch (error) {
    logger.error('Error suspending team member:', error);
    res.status(400).json({
      success: false,
      error: 'SuspensionError',
      message: error.message
    });
  }
}

/**
 * @route POST /api/v1/team/members/:id/reactivate
 * @desc Reactivate team member
 * @access Private (Admin, Owner)
 */
async function reactivateMember(req, res) {
  try {
    const { id } = req.params;
    const teamId = req.user.teamId;
    const performedBy = req.user.id;
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('user-agent');

    const member = await teamService.reactivateMember(
      teamId,
      id,
      performedBy,
      ipAddress,
      userAgent
    );

    res.status(200).json({
      success: true,
      message: 'Team member reactivated successfully',
      data: {
        id: member.id,
        email: member.email,
        role: member.role,
        status: member.status,
        user: member.users
      }
    });
  } catch (error) {
    logger.error('Error reactivating team member:', error);
    res.status(400).json({
      success: false,
      error: 'ReactivationError',
      message: error.message
    });
  }
}

/**
 * @route GET /api/v1/team/activity
 * @desc Get team activity logs
 * @access Private
 */
async function getActivityLogs(req, res) {
  try {
    const teamId = req.user.teamId;
    const { userId, action, resource, startDate, endDate, limit, offset } = req.query;

    const filters = {};
    if (userId) filters.userId = userId;
    if (action) filters.action = action;
    if (resource) filters.resource = resource;
    if (startDate) filters.startDate = startDate;
    if (endDate) filters.endDate = endDate;
    if (limit) filters.limit = parseInt(limit);
    if (offset) filters.offset = parseInt(offset);

    const logs = await teamService.getActivityLogs(teamId, filters);

    res.status(200).json({
      success: true,
      data: logs.map(log => ({
        id: log.id,
        action: log.action,
        resource: log.resource,
        resource_id: log.resource_id,
        details: log.details,
        ip_address: log.ip_address,
        user_agent: log.user_agent,
        created_at: log.created_at,
        user: log.owner,
        performed_by: log.performer
      })),
      count: logs.length
    });
  } catch (error) {
    logger.error('Error fetching activity logs:', error);
    res.status(500).json({
      success: false,
      error: 'ServerError',
      message: 'Failed to fetch activity logs'
    });
  }
}

/**
 * @route GET /api/v1/team/activity/export
 * @desc Export team activity logs to CSV
 * @access Private
 */
async function exportActivityLogs(req, res) {
  try {
    const teamId = req.user.teamId;
    const { userId, action, resource, startDate, endDate } = req.query;

    const filters = {};
    if (userId) filters.userId = userId;
    if (action) filters.action = action;
    if (resource) filters.resource = resource;
    if (startDate) filters.startDate = startDate;
    if (endDate) filters.endDate = endDate;

    const result = await teamService.exportActivityLogs(teamId, filters);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
    res.status(200).send(result.csv);
  } catch (error) {
    logger.error('Error exporting activity logs:', error);
    res.status(500).json({
      success: false,
      error: 'ServerError',
      message: 'Failed to export activity logs'
    });
  }
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
  exportActivityLogs
};
