import express from 'express';
import teamController from '../controllers/teamController.js';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/rbac.js';
import { validate } from '../middleware/validation.js';
import {
  inviteTeamMemberSchema,
  updateMemberRoleSchema,
  getTeamMembersSchema,
  getActivityLogsSchema
} from '../validators/teamValidator.js';

const router = express.Router();

/**
 * @swagger
 * /api/v1/team/invite:
 *   post:
 *     summary: Invite a team member
 *     tags: [Team]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - role
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               role:
 *                 type: string
 *                 enum: [Owner, Admin, Manager, Agent]
 *     responses:
 *       201:
 *         description: Invitation sent successfully
 *       400:
 *         description: Invalid input or invitation error
 *       403:
 *         description: Insufficient permissions
 */
router.post(
  '/invite',
  authenticate,
  authorize('team:invite'),
  validate(inviteTeamMemberSchema),
  teamController.inviteTeamMember
);

/**
 * @swagger
 * /api/v1/team/invitations/{token}/accept:
 *   post:
 *     summary: Accept team invitation
 *     tags: [Team]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: token
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Invitation accepted successfully
 *       400:
 *         description: Invalid or expired invitation
 */
router.post(
  '/invitations/:token/accept',
  authenticate,
  teamController.acceptInvitation
);

/**
 * @swagger
 * /api/v1/team/members:
 *   get:
 *     summary: Get team members
 *     tags: [Team]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: role
 *         schema:
 *           type: string
 *           enum: [Owner, Admin, Manager, Agent]
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [Invited, Active, Suspended, Removed]
 *     responses:
 *       200:
 *         description: Team members retrieved successfully
 *       500:
 *         description: Server error
 */
router.get(
  '/members',
  authenticate,
  authorize('team:read-members'),
  validate(getTeamMembersSchema, 'query'),
  teamController.getTeamMembers
);

/**
 * @swagger
 * /api/v1/team/members/{id}:
 *   put:
 *     summary: Update team member role
 *     tags: [Team]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - role
 *             properties:
 *               role:
 *                 type: string
 *                 enum: [Owner, Admin, Manager, Agent]
 *     responses:
 *       200:
 *         description: Member role updated successfully
 *       400:
 *         description: Invalid input or update error
 *       403:
 *         description: Insufficient permissions
 */
router.put(
  '/members/:id',
  authenticate,
  authorize('team:update-members'),
  validate(updateMemberRoleSchema),
  teamController.updateMemberRole
);

/**
 * @swagger
 * /api/v1/team/members/{id}:
 *   delete:
 *     summary: Remove team member
 *     tags: [Team]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Member removed successfully
 *       400:
 *         description: Removal error
 *       403:
 *         description: Insufficient permissions
 */
router.delete(
  '/members/:id',
  authenticate,
  authorize('team:remove-members'),
  teamController.removeMember
);

/**
 * @swagger
 * /api/v1/team/members/{id}/suspend:
 *   post:
 *     summary: Suspend team member
 *     tags: [Team]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Member suspended successfully
 *       400:
 *         description: Suspension error
 *       403:
 *         description: Insufficient permissions
 */
router.post(
  '/members/:id/suspend',
  authenticate,
  authorize('team:suspend-members'),
  teamController.suspendMember
);

/**
 * @swagger
 * /api/v1/team/members/{id}/reactivate:
 *   post:
 *     summary: Reactivate team member
 *     tags: [Team]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Member reactivated successfully
 *       400:
 *         description: Reactivation error
 *       403:
 *         description: Insufficient permissions
 */
router.post(
  '/members/:id/reactivate',
  authenticate,
  authorize('team:reactivate-members'),
  teamController.reactivateMember
);

/**
 * @swagger
 * /api/v1/team/activity:
 *   get:
 *     summary: Get team activity logs
 *     tags: [Team]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: userId
 *         schema:
 *           type: string
 *       - in: query
 *         name: action
 *         schema:
 *           type: string
 *       - in: query
 *         name: resource
 *         schema:
 *           type: string
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 100
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *     responses:
 *       200:
 *         description: Activity logs retrieved successfully
 *       500:
 *         description: Server error
 */
router.get(
  '/activity',
  authenticate,
  authorize('team:read-activity'),
  validate(getActivityLogsSchema, 'query'),
  teamController.getActivityLogs
);

/**
 * @swagger
 * /api/v1/team/activity/export:
 *   get:
 *     summary: Export team activity logs to CSV
 *     tags: [Team]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: userId
 *         schema:
 *           type: string
 *       - in: query
 *         name: action
 *         schema:
 *           type: string
 *       - in: query
 *         name: resource
 *         schema:
 *           type: string
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: CSV file with activity logs
 *         content:
 *           text/csv:
 *             schema:
 *               type: string
 *       500:
 *         description: Server error
 */
router.get(
  '/activity/export',
  authenticate,
  authorize('team:export-activity'),
  validate(getActivityLogsSchema, 'query'),
  teamController.exportActivityLogs
);

export default router;
