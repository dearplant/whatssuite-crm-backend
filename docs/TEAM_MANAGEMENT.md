# Team Management System

## Overview

The Team Management system provides comprehensive functionality for managing team members, invitations, and activity logging within the WhatsApp CRM platform. This document describes the implementation, API endpoints, and usage.

## Features

- **Team Member Invitations**: Invite users to join teams with specific roles
- **Role Management**: Update team member roles (Owner, Admin, Manager, Agent)
- **Member Status Control**: Suspend and reactivate team members
- **Activity Logging**: Track all team-related actions for audit purposes
- **Email Notifications**: Automatic invitation emails with secure tokens

## Database Models

### TeamMember

Represents a user's membership in a team.

**Fields:**
- `id` (UUID): Unique identifier
- `team_id` (UUID): Reference to team
- `user_id` (UUID): Reference to user
- `email` (String): Member email
- `role` (Enum): User role (Owner, Admin, Manager, Agent)
- `status` (Enum): Member status (Invited, Active, Suspended, Removed)
- `invited_by` (UUID): User who sent the invitation
- `invited_at` (DateTime): When invitation was sent
- `joined_at` (DateTime): When member joined
- `suspended_at` (DateTime): When member was suspended
- `created_at` (DateTime): Record creation timestamp
- `updated_at` (DateTime): Record update timestamp

**Indexes:**
- `team_id, user_id` (unique)
- `team_id, email` (unique)
- `status`
- `role`

### TeamInvitation

Stores pending team invitations.

**Fields:**
- `id` (UUID): Unique identifier
- `team_id` (UUID): Reference to team
- `email` (String): Invitee email
- `role` (String): Role to be assigned
- `token` (String): Unique invitation token (64 chars hex)
- `invited_by` (UUID): User who sent the invitation
- `expires_at` (DateTime): Token expiration (7 days)
- `accepted_at` (DateTime): When invitation was accepted
- `created_at` (DateTime): Record creation timestamp

**Indexes:**
- `token` (unique)
- `team_id, email` (unique)
- `expires_at`

### ActivityLog

Tracks all team-related actions for audit purposes.

**Fields:**
- `id` (UUID): Unique identifier
- `team_id` (UUID): Reference to team
- `user_id` (UUID): User affected by action
- `performed_by` (UUID): User who performed action
- `action` (String): Action type (e.g., 'team.member.invited')
- `resource` (String): Resource type (e.g., 'team_member')
- `resource_id` (UUID): Resource identifier
- `details` (JSON): Additional action details
- `ip_address` (String): IP address of performer
- `user_agent` (String): User agent of performer
- `created_at` (DateTime): Action timestamp

**Indexes:**
- `team_id, created_at`
- `user_id`
- `performed_by`
- `action`
- `resource`

## API Endpoints

### POST /api/v1/team/invite

Invite a new team member.

**Authentication:** Required  
**Permissions:** `team.invite` (Admin, Owner)

**Request Body:**
```json
{
  "email": "user@example.com",
  "role": "Manager"
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "Team invitation sent successfully",
  "data": {
    "id": "uuid",
    "email": "user@example.com",
    "role": "Manager",
    "expires_at": "2025-11-15T10:00:00Z",
    "created_at": "2025-11-08T10:00:00Z"
  }
}
```

**Errors:**
- `400`: Invalid input or user already invited
- `403`: Insufficient permissions

---

### POST /api/v1/team/invitations/:token/accept

Accept a team invitation.

**Authentication:** Required  
**Permissions:** None (user must own the email)

**Response (200):**
```json
{
  "success": true,
  "message": "Invitation accepted successfully",
  "data": {
    "id": "uuid",
    "team_id": "uuid",
    "role": "Manager",
    "status": "Active",
    "joined_at": "2025-11-08T10:00:00Z",
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "first_name": "John",
      "last_name": "Doe"
    }
  }
}
```

**Errors:**
- `400`: Invalid, expired, or already accepted invitation
- `401`: Unauthorized

---

### GET /api/v1/team/members

Get team members with optional filtering.

**Authentication:** Required  
**Permissions:** `team.read`

**Query Parameters:**
- `role` (optional): Filter by role (Owner, Admin, Manager, Agent)
- `status` (optional): Filter by status (Invited, Active, Suspended, Removed)

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "email": "user@example.com",
      "role": "Manager",
      "status": "Active",
      "invited_at": "2025-11-01T10:00:00Z",
      "joined_at": "2025-11-02T10:00:00Z",
      "suspended_at": null,
      "user": {
        "id": "uuid",
        "email": "user@example.com",
        "first_name": "John",
        "last_name": "Doe",
        "avatar_url": "https://...",
        "last_login_at": "2025-11-08T09:00:00Z"
      },
      "invited_by": {
        "id": "uuid",
        "email": "admin@example.com",
        "first_name": "Admin",
        "last_name": "User"
      }
    }
  ],
  "count": 1
}
```

---

### PUT /api/v1/team/members/:id

Update team member role.

**Authentication:** Required  
**Permissions:** `team.update` (Admin, Owner)

**Request Body:**
```json
{
  "role": "Admin"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Team member role updated successfully",
  "data": {
    "id": "uuid",
    "email": "user@example.com",
    "role": "Admin",
    "status": "Active",
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "first_name": "John",
      "last_name": "Doe"
    }
  }
}
```

**Errors:**
- `400`: Cannot update team owner role
- `403`: Insufficient permissions

---

### DELETE /api/v1/team/members/:id

Remove a team member.

**Authentication:** Required  
**Permissions:** `team.delete` (Admin, Owner)

**Response (200):**
```json
{
  "success": true,
  "message": "Team member removed successfully"
}
```

**Errors:**
- `400`: Cannot remove team owner
- `403`: Insufficient permissions

---

### POST /api/v1/team/members/:id/suspend

Suspend a team member.

**Authentication:** Required  
**Permissions:** `team.update` (Admin, Owner)

**Response (200):**
```json
{
  "success": true,
  "message": "Team member suspended successfully",
  "data": {
    "id": "uuid",
    "email": "user@example.com",
    "role": "Manager",
    "status": "Suspended",
    "suspended_at": "2025-11-08T10:00:00Z",
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "first_name": "John",
      "last_name": "Doe"
    }
  }
}
```

**Notes:**
- Suspending a member revokes all their active sessions
- Suspended members cannot log in until reactivated

**Errors:**
- `400`: Cannot suspend team owner or already suspended member
- `403`: Insufficient permissions

---

### POST /api/v1/team/members/:id/reactivate

Reactivate a suspended team member.

**Authentication:** Required  
**Permissions:** `team.update` (Admin, Owner)

**Response (200):**
```json
{
  "success": true,
  "message": "Team member reactivated successfully",
  "data": {
    "id": "uuid",
    "email": "user@example.com",
    "role": "Manager",
    "status": "Active",
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "first_name": "John",
      "last_name": "Doe"
    }
  }
}
```

**Errors:**
- `400`: Member is already active or removed
- `403`: Insufficient permissions

---

### GET /api/v1/team/activity

Get team activity logs.

**Authentication:** Required  
**Permissions:** `team.read`

**Query Parameters:**
- `userId` (optional): Filter by user ID
- `action` (optional): Filter by action type
- `resource` (optional): Filter by resource type
- `startDate` (optional): Filter by start date (ISO 8601)
- `endDate` (optional): Filter by end date (ISO 8601)
- `limit` (optional): Number of results (default: 100, max: 1000)
- `offset` (optional): Pagination offset (default: 0)

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "action": "team.member.invited",
      "resource": "team_invitation",
      "resource_id": "uuid",
      "details": {
        "email": "user@example.com",
        "role": "Manager"
      },
      "ip_address": "192.168.1.1",
      "user_agent": "Mozilla/5.0...",
      "created_at": "2025-11-08T10:00:00Z",
      "user": {
        "id": "uuid",
        "email": "user@example.com",
        "first_name": "John",
        "last_name": "Doe"
      },
      "performed_by": {
        "id": "uuid",
        "email": "admin@example.com",
        "first_name": "Admin",
        "last_name": "User"
      }
    }
  ],
  "count": 1
}
```

## Activity Log Actions

The following actions are automatically logged:

- `team.member.invited`: When a team invitation is sent
- `team.member.joined`: When a user accepts an invitation
- `team.member.role_updated`: When a member's role is changed
- `team.member.removed`: When a member is removed from the team
- `team.member.suspended`: When a member is suspended
- `team.member.reactivated`: When a suspended member is reactivated

## Email Templates

### Team Invitation Email

Sent when a user is invited to join a team.

**Template:** `team-invitation.hbs`

**Variables:**
- `teamName`: Name of the team
- `inviterName`: Name of the person who sent the invitation
- `role`: Role being assigned
- `invitationUrl`: URL to accept the invitation
- `appName`: Application name
- `expiryDays`: Number of days until invitation expires (7)

## Security Considerations

1. **Token Security**: Invitation tokens are 64-character hex strings (32 bytes of randomness)
2. **Token Expiration**: Invitations expire after 7 days
3. **Email Verification**: Users must accept invitations using the email address they were invited with
4. **Session Revocation**: Suspending a member revokes all their active sessions
5. **Owner Protection**: Team owners cannot be removed, suspended, or have their role changed
6. **Activity Logging**: All team actions are logged with IP address and user agent for audit purposes

## Usage Examples

### Inviting a Team Member

```javascript
// POST /api/v1/team/invite
const response = await fetch('/api/v1/team/invite', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    email: 'newmember@example.com',
    role: 'Manager'
  })
});

const data = await response.json();
console.log('Invitation sent:', data);
```

### Accepting an Invitation

```javascript
// POST /api/v1/team/invitations/:token/accept
const response = await fetch(`/api/v1/team/invitations/${token}/accept`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${accessToken}`
  }
});

const data = await response.json();
console.log('Joined team:', data);
```

### Listing Team Members

```javascript
// GET /api/v1/team/members?role=Manager&status=Active
const response = await fetch('/api/v1/team/members?role=Manager&status=Active', {
  headers: {
    'Authorization': `Bearer ${accessToken}`
  }
});

const data = await response.json();
console.log('Team members:', data);
```

### Viewing Activity Logs

```javascript
// GET /api/v1/team/activity?limit=50
const response = await fetch('/api/v1/team/activity?limit=50', {
  headers: {
    'Authorization': `Bearer ${accessToken}`
  }
});

const data = await response.json();
console.log('Activity logs:', data);
```

## Migration

To apply the team management models to your database, run:

```bash
npx prisma migrate deploy
```

This will apply the migration file:
`prisma/migrations/20251108000005_add_team_management_models/migration.sql`

## Testing

Run the team management tests:

```bash
npm test -- team.test.js
```

The test suite covers:
- Team invitation creation and validation
- Invitation acceptance flow
- Team member listing and filtering
- Role updates
- Member suspension and reactivation
- Member removal
- Activity logging

## Related Documentation

- [RBAC Implementation](./RBAC_IMPLEMENTATION.md)
- [Authentication](./AUTHENTICATION.md)
- [Email System](./EMAIL_SYSTEM.md)
- [Database Setup](./DATABASE_SETUP.md)
