# Role-Based Access Control (RBAC) Documentation

## Overview

The WhatsApp CRM backend implements a comprehensive Role-Based Access Control (RBAC) system to manage user permissions and secure API endpoints. This document explains how RBAC works, the permission matrix, and how to use it in your routes.

## Table of Contents

1. [Roles](#roles)
2. [Permission Matrix](#permission-matrix)
3. [Using RBAC Middleware](#using-rbac-middleware)
4. [Permission Utilities](#permission-utilities)
5. [Examples](#examples)
6. [Best Practices](#best-practices)

## Roles

The system supports four hierarchical roles:

### 1. Owner
- **Highest privilege level**
- Full system access including billing and subscriptions
- Can manage all users and roles
- Typically the account creator or business owner

### 2. Admin
- **Administrative access**
- Can manage most resources except billing/subscriptions
- Can invite and manage team members
- Cannot change Owner's permissions

### 3. Manager
- **Team and campaign management**
- Can create and manage campaigns, flows, and chatbots
- Can view analytics and reports
- Cannot manage payment settings or invite admins

### 4. Agent
- **Basic operations**
- Can manage contacts and send messages
- Can view campaigns and flows (read-only)
- Limited access to analytics

## Permission Matrix

Permissions follow the format: `resource:action`

### Authentication & Profile
| Permission | Owner | Admin | Manager | Agent |
|------------|-------|-------|---------|-------|
| `auth:read-own-profile` | ✓ | ✓ | ✓ | ✓ |
| `auth:update-own-profile` | ✓ | ✓ | ✓ | ✓ |
| `auth:delete-own-account` | ✓ | ✓ | ✓ | ✓ |

### User Management
| Permission | Owner | Admin | Manager | Agent |
|------------|-------|-------|---------|-------|
| `users:read` | ✓ | ✓ | ✓ | - |
| `users:create` | ✓ | ✓ | - | - |
| `users:update` | ✓ | ✓ | - | - |
| `users:delete` | ✓ | - | - | - |
| `users:manage-roles` | ✓ | - | - | - |

### WhatsApp Accounts
| Permission | Owner | Admin | Manager | Agent |
|------------|-------|-------|---------|-------|
| `whatsapp:connect` | ✓ | ✓ | - | - |
| `whatsapp:disconnect` | ✓ | ✓ | - | - |
| `whatsapp:read` | ✓ | ✓ | ✓ | ✓ |
| `whatsapp:update` | ✓ | ✓ | - | - |
| `whatsapp:delete` | ✓ | - | - | - |

### Contacts
| Permission | Owner | Admin | Manager | Agent |
|------------|-------|-------|---------|-------|
| `contacts:create` | ✓ | ✓ | ✓ | ✓ |
| `contacts:read` | ✓ | ✓ | ✓ | ✓ |
| `contacts:update` | ✓ | ✓ | ✓ | ✓ |
| `contacts:delete` | ✓ | ✓ | ✓ | - |
| `contacts:import` | ✓ | ✓ | ✓ | - |
| `contacts:export` | ✓ | ✓ | ✓ | - |
| `contacts:bulk-action` | ✓ | ✓ | ✓ | - |

### Messages
| Permission | Owner | Admin | Manager | Agent |
|------------|-------|-------|---------|-------|
| `messages:send` | ✓ | ✓ | ✓ | ✓ |
| `messages:read` | ✓ | ✓ | ✓ | ✓ |
| `messages:delete` | ✓ | ✓ | ✓ | - |

### Campaigns
| Permission | Owner | Admin | Manager | Agent |
|------------|-------|-------|---------|-------|
| `campaigns:create` | ✓ | ✓ | ✓ | - |
| `campaigns:read` | ✓ | ✓ | ✓ | ✓ |
| `campaigns:update` | ✓ | ✓ | ✓ | - |
| `campaigns:delete` | ✓ | ✓ | ✓ | - |
| `campaigns:start` | ✓ | ✓ | ✓ | - |
| `campaigns:pause` | ✓ | ✓ | ✓ | - |
| `campaigns:duplicate` | ✓ | ✓ | ✓ | - |

### Flows (Automation)
| Permission | Owner | Admin | Manager | Agent |
|------------|-------|-------|---------|-------|
| `flows:create` | ✓ | ✓ | ✓ | - |
| `flows:read` | ✓ | ✓ | ✓ | ✓ |
| `flows:update` | ✓ | ✓ | ✓ | - |
| `flows:delete` | ✓ | ✓ | ✓ | - |
| `flows:activate` | ✓ | ✓ | ✓ | - |
| `flows:deactivate` | ✓ | ✓ | ✓ | - |
| `flows:test` | ✓ | ✓ | ✓ | - |

### AI & Chatbots
| Permission | Owner | Admin | Manager | Agent |
|------------|-------|-------|---------|-------|
| `ai:configure-providers` | ✓ | ✓ | - | - |
| `ai:read-providers` | ✓ | ✓ | ✓ | - |
| `ai:create-chatbots` | ✓ | ✓ | ✓ | - |
| `ai:read-chatbots` | ✓ | ✓ | ✓ | ✓ |
| `ai:update-chatbots` | ✓ | ✓ | ✓ | - |
| `ai:delete-chatbots` | ✓ | ✓ | ✓ | - |
| `ai:test-chatbots` | ✓ | ✓ | ✓ | - |
| `ai:transcribe` | ✓ | ✓ | ✓ | ✓ |

### E-commerce
| Permission | Owner | Admin | Manager | Agent |
|------------|-------|-------|---------|-------|
| `ecommerce:create-integration` | ✓ | ✓ | - | - |
| `ecommerce:read-integration` | ✓ | ✓ | ✓ | - |
| `ecommerce:update-integration` | ✓ | ✓ | - | - |
| `ecommerce:delete-integration` | ✓ | - | - | - |
| `ecommerce:sync-orders` | ✓ | ✓ | ✓ | - |
| `ecommerce:read-orders` | ✓ | ✓ | ✓ | ✓ |
| `ecommerce:notify-orders` | ✓ | ✓ | ✓ | - |
| `ecommerce:read-abandoned-carts` | ✓ | ✓ | ✓ | - |
| `ecommerce:recover-carts` | ✓ | ✓ | ✓ | - |

### Payments
| Permission | Owner | Admin | Manager | Agent |
|------------|-------|-------|---------|-------|
| `payments:configure-gateways` | ✓ | - | - | - |
| `payments:read-gateways` | ✓ | ✓ | - | - |
| `payments:create-subscriptions` | ✓ | - | - | - |
| `payments:read-subscriptions` | ✓ | ✓ | - | - |
| `payments:update-subscriptions` | ✓ | - | - | - |
| `payments:cancel-subscriptions` | ✓ | - | - | - |
| `payments:read-payments` | ✓ | ✓ | - | - |
| `payments:refund` | ✓ | - | - | - |
| `payments:read-invoices` | ✓ | ✓ | - | - |
| `payments:manage-plans` | ✓ | - | - | - |

### Analytics
| Permission | Owner | Admin | Manager | Agent |
|------------|-------|-------|---------|-------|
| `analytics:read-overview` | ✓ | ✓ | ✓ | - |
| `analytics:read-messages` | ✓ | ✓ | ✓ | - |
| `analytics:read-campaigns` | ✓ | ✓ | ✓ | - |
| `analytics:read-contacts` | ✓ | ✓ | ✓ | - |
| `analytics:read-revenue` | ✓ | ✓ | - | - |
| `analytics:read-chatbots` | ✓ | ✓ | ✓ | - |
| `analytics:export-reports` | ✓ | ✓ | ✓ | - |
| `analytics:schedule-reports` | ✓ | ✓ | ✓ | - |

### Team Management
| Permission | Owner | Admin | Manager | Agent |
|------------|-------|-------|---------|-------|
| `team:invite` | ✓ | ✓ | - | - |
| `team:read-members` | ✓ | ✓ | ✓ | - |
| `team:update-members` | ✓ | ✓ | - | - |
| `team:remove-members` | ✓ | ✓ | - | - |
| `team:suspend-members` | ✓ | ✓ | - | - |
| `team:reactivate-members` | ✓ | ✓ | - | - |
| `team:read-activity` | ✓ | ✓ | ✓ | - |
| `team:export-activity` | ✓ | ✓ | - | - |

### Webhooks
| Permission | Owner | Admin | Manager | Agent |
|------------|-------|-------|---------|-------|
| `webhooks:create` | ✓ | ✓ | - | - |
| `webhooks:read` | ✓ | ✓ | ✓ | - |
| `webhooks:update` | ✓ | ✓ | - | - |
| `webhooks:delete` | ✓ | ✓ | - | - |
| `webhooks:test` | ✓ | ✓ | - | - |
| `webhooks:read-deliveries` | ✓ | ✓ | ✓ | - |

### System Settings
| Permission | Owner | Admin | Manager | Agent |
|------------|-------|-------|---------|-------|
| `settings:read` | ✓ | ✓ | - | - |
| `settings:update` | ✓ | - | - | - |

## Using RBAC Middleware

### Basic Usage

```javascript
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/rbac.js';

// Single permission check
router.post('/contacts', 
  authenticate, 
  authorize('contacts:create'), 
  contactController.create
);
```

### Multiple Permissions (OR logic)

User needs at least ONE of the specified permissions:

```javascript
import { authorizeAny } from '../middleware/rbac.js';

router.get('/dashboard', 
  authenticate, 
  authorizeAny(['analytics:read-overview', 'analytics:read-messages']), 
  dashboardController.index
);
```

### Multiple Permissions (AND logic)

User needs ALL of the specified permissions:

```javascript
import { authorizeAll } from '../middleware/rbac.js';

router.post('/advanced-action', 
  authenticate, 
  authorizeAll(['contacts:update', 'campaigns:create']), 
  advancedController.action
);
```

### Wildcard Permissions

Match all permissions for a resource:

```javascript
import { authorizePattern } from '../middleware/rbac.js';

// User needs any contact permission
router.use('/contacts/*', 
  authenticate, 
  authorizePattern('contacts:*')
);
```

### Role-Based Shortcuts

```javascript
import { requireOwner, requireAdmin } from '../middleware/rbac.js';

// Only Owner can access
router.delete('/system/reset', 
  authenticate, 
  requireOwner, 
  systemController.reset
);

// Owner or Admin can access
router.get('/admin/dashboard', 
  authenticate, 
  requireAdmin, 
  adminController.dashboard
);
```

### Resource Ownership Check

Allow users to access their own resources or require admin privileges:

```javascript
import { requireOwnershipOrAdmin } from '../middleware/rbac.js';

// User can update their own profile, or admin can update any profile
router.put('/users/:id', 
  authenticate, 
  requireOwnershipOrAdmin('id'), 
  userController.update
);
```

## Permission Utilities

### Check Permissions in Controllers

```javascript
import { checkPermission } from '../middleware/rbac.js';

export async function someController(req, res) {
  // Check if user has permission
  if (checkPermission(req.user, 'contacts:delete')) {
    // User has permission
    // Perform action
  } else {
    // User doesn't have permission
    // Return error or skip action
  }
}
```

### Get User Permissions

```javascript
import { getUserPermissions } from '../middleware/rbac.js';

export async function getProfile(req, res) {
  const permissions = await getUserPermissions(req.user);
  
  res.json({
    user: req.user,
    permissions: permissions,
  });
}
```

### Validate Permissions

```javascript
import { isValidPermission } from '../config/permissions.js';

const permission = 'contacts:create';
if (isValidPermission(permission)) {
  // Permission exists in the system
}
```

## Examples

### Example 1: Contact Routes

```javascript
import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/rbac.js';
import contactController from '../controllers/contactController.js';

const router = express.Router();

router.post('/', 
  authenticate, 
  authorize('contacts:create'), 
  contactController.create
);

router.get('/', 
  authenticate, 
  authorize('contacts:read'), 
  contactController.list
);

router.put('/:id', 
  authenticate, 
  authorize('contacts:update'), 
  contactController.update
);

router.delete('/:id', 
  authenticate, 
  authorize('contacts:delete'), 
  contactController.delete
);

export default router;
```

### Example 2: Campaign Routes with Multiple Permissions

```javascript
import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { authorize, authorizeAny } from '../middleware/rbac.js';
import campaignController from '../controllers/campaignController.js';

const router = express.Router();

// Create campaign
router.post('/', 
  authenticate, 
  authorize('campaigns:create'), 
  campaignController.create
);

// Start or resume campaign (either permission works)
router.post('/:id/start', 
  authenticate, 
  authorizeAny(['campaigns:start', 'campaigns:pause']), 
  campaignController.start
);

export default router;
```

### Example 3: Admin-Only Routes

```javascript
import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/rbac.js';
import adminController from '../controllers/adminController.js';

const router = express.Router();

// All routes require admin role
router.use(authenticate, requireAdmin);

router.get('/dashboard', adminController.dashboard);
router.get('/users', adminController.listUsers);
router.post('/users/:id/suspend', adminController.suspendUser);

export default router;
```

## Best Practices

### 1. Always Authenticate First

```javascript
// ✓ Correct
router.get('/resource', authenticate, authorize('resource:read'), handler);

// ✗ Wrong - authorize before authenticate
router.get('/resource', authorize('resource:read'), authenticate, handler);
```

### 2. Use Specific Permissions

```javascript
// ✓ Correct - specific permission
router.delete('/contacts/:id', authenticate, authorize('contacts:delete'), handler);

// ✗ Wrong - too broad
router.delete('/contacts/:id', authenticate, requireAdmin, handler);
```

### 3. Group Related Routes

```javascript
// ✓ Correct - apply middleware to router
const router = express.Router();
router.use(authenticate);
router.use(authorize('contacts:read'));

router.get('/', listContacts);
router.get('/:id', getContact);
```

### 4. Document Required Permissions

```javascript
/**
 * POST /api/v1/campaigns
 * Create a new campaign
 * 
 * @requires Authentication
 * @requires Permission: campaigns:create
 * @access Owner, Admin, Manager
 */
router.post('/', authenticate, authorize('campaigns:create'), handler);
```

### 5. Handle Permission Errors Gracefully

```javascript
// The middleware automatically returns 403 Forbidden
// But you can add custom error handling in your global error handler

app.use((err, req, res, next) => {
  if (err.status === 403) {
    return res.status(403).json({
      success: false,
      message: 'You do not have permission to perform this action',
      requiredPermissions: err.requiredPermissions,
    });
  }
  next(err);
});
```

### 6. Log Authorization Failures

The RBAC middleware automatically logs authorization failures for audit purposes. These logs include:
- User ID and role
- Attempted action (HTTP method and path)
- Required permissions
- Timestamp

### 7. Test Permissions Thoroughly

Always test your routes with different user roles to ensure permissions are correctly enforced:

```javascript
describe('Contact Routes', () => {
  it('should allow Agent to create contact', async () => {
    const agent = await createUser({ role: 'Agent' });
    const token = generateToken(agent);
    
    const response = await request(app)
      .post('/api/v1/contacts')
      .set('Authorization', `Bearer ${token}`)
      .send(contactData);
    
    expect(response.status).toBe(201);
  });
  
  it('should deny Agent from deleting contact', async () => {
    const agent = await createUser({ role: 'Agent' });
    const token = generateToken(agent);
    
    const response = await request(app)
      .delete('/api/v1/contacts/123')
      .set('Authorization', `Bearer ${token}`);
    
    expect(response.status).toBe(403);
  });
});
```

## Troubleshooting

### Permission Denied Errors

If you're getting 403 Forbidden errors:

1. Check if the user is authenticated (`req.user` exists)
2. Verify the user has the correct role assigned
3. Confirm the permission exists in `PERMISSIONS` object
4. Check the middleware order (authenticate before authorize)
5. Review the logs for detailed authorization failure messages

### Adding New Permissions

To add a new permission:

1. Add it to the `PERMISSIONS` object in `backend/src/config/permissions.js`
2. Assign it to appropriate roles
3. Use it in your routes with the `authorize()` middleware
4. Update this documentation
5. Write tests for the new permission

### Modifying Role Permissions

To change which roles have access to a permission:

1. Update the role array in `PERMISSIONS` object
2. Test thoroughly to ensure no breaking changes
3. Update documentation
4. Notify team members of the change

## Security Considerations

1. **Never bypass RBAC checks** - Always use the middleware on protected routes
2. **Validate user input** - RBAC doesn't validate request data, use validation middleware
3. **Log all authorization failures** - Monitor for potential security issues
4. **Regular audits** - Review permission assignments periodically
5. **Principle of least privilege** - Give users only the permissions they need
6. **Secure role assignment** - Only Owners should be able to change user roles

## Related Documentation

- [Authentication Documentation](./AUTHENTICATION.md)
- [Middleware Documentation](./MIDDLEWARE.md)
- [API Endpoints Documentation](./AUTH_ENDPOINTS.md)
