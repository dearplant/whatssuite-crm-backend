/**
 * Permission Matrix for Role-Based Access Control (RBAC)
 *
 * This file defines all permissions for each role in the system.
 * Permissions follow the format: resource:action
 *
 * Roles hierarchy (from highest to lowest):
 * - Owner: Full system access
 * - Admin: Administrative access (cannot manage billing/subscriptions)
 * - Manager: Team and campaign management
 * - Agent: Basic operations (contacts, messages)
 */

export const PERMISSIONS = {
  // Authentication & Profile
  'auth:read-own-profile': ['Owner', 'Admin', 'Manager', 'Agent'],
  'auth:update-own-profile': ['Owner', 'Admin', 'Manager', 'Agent'],
  'auth:delete-own-account': ['Owner', 'Admin', 'Manager', 'Agent'],

  // User Management
  'users:read': ['Owner', 'Admin', 'Manager'],
  'users:create': ['Owner', 'Admin'],
  'users:update': ['Owner', 'Admin'],
  'users:delete': ['Owner'],
  'users:manage-roles': ['Owner'],

  // WhatsApp Accounts
  'whatsapp:connect': ['Owner', 'Admin'],
  'whatsapp:disconnect': ['Owner', 'Admin'],
  'whatsapp:read': ['Owner', 'Admin', 'Manager', 'Agent'],
  'whatsapp:update': ['Owner', 'Admin'],
  'whatsapp:delete': ['Owner'],

  // Contacts
  'contacts:create': ['Owner', 'Admin', 'Manager', 'Agent'],
  'contacts:read': ['Owner', 'Admin', 'Manager', 'Agent'],
  'contacts:update': ['Owner', 'Admin', 'Manager', 'Agent'],
  'contacts:delete': ['Owner', 'Admin', 'Manager'],
  'contacts:import': ['Owner', 'Admin', 'Manager'],
  'contacts:export': ['Owner', 'Admin', 'Manager'],
  'contacts:bulk-action': ['Owner', 'Admin', 'Manager'],

  // Messages
  'messages:send': ['Owner', 'Admin', 'Manager', 'Agent'],
  'messages:read': ['Owner', 'Admin', 'Manager', 'Agent'],
  'messages:delete': ['Owner', 'Admin', 'Manager'],

  // Campaigns
  'campaigns:create': ['Owner', 'Admin', 'Manager'],
  'campaigns:read': ['Owner', 'Admin', 'Manager', 'Agent'],
  'campaigns:update': ['Owner', 'Admin', 'Manager'],
  'campaigns:delete': ['Owner', 'Admin', 'Manager'],
  'campaigns:start': ['Owner', 'Admin', 'Manager'],
  'campaigns:pause': ['Owner', 'Admin', 'Manager'],
  'campaigns:duplicate': ['Owner', 'Admin', 'Manager'],

  // Flows (Automation)
  'flows:create': ['Owner', 'Admin', 'Manager'],
  'flows:read': ['Owner', 'Admin', 'Manager', 'Agent'],
  'flows:update': ['Owner', 'Admin', 'Manager'],
  'flows:delete': ['Owner', 'Admin', 'Manager'],
  'flows:activate': ['Owner', 'Admin', 'Manager'],
  'flows:deactivate': ['Owner', 'Admin', 'Manager'],
  'flows:test': ['Owner', 'Admin', 'Manager'],

  // AI Providers & Chatbots
  'ai:manage': ['Owner', 'Admin'], // Manage AI providers (create, update, delete, test)
  'ai:read': ['Owner', 'Admin', 'Manager'], // Read AI provider configurations
  'ai:configure-providers': ['Owner', 'Admin'],
  'ai:read-providers': ['Owner', 'Admin', 'Manager'],
  'ai:create-chatbots': ['Owner', 'Admin', 'Manager'],
  'ai:read-chatbots': ['Owner', 'Admin', 'Manager', 'Agent'],
  'ai:update-chatbots': ['Owner', 'Admin', 'Manager'],
  'ai:delete-chatbots': ['Owner', 'Admin', 'Manager'],
  'ai:test-chatbots': ['Owner', 'Admin', 'Manager'],
  'ai:transcribe': ['Owner', 'Admin', 'Manager', 'Agent'],

  // Chatbot specific permissions
  'chatbots:create': ['Owner', 'Admin', 'Manager'],
  'chatbots:read': ['Owner', 'Admin', 'Manager', 'Agent'],
  'chatbots:update': ['Owner', 'Admin', 'Manager'],
  'chatbots:delete': ['Owner', 'Admin'],
  'chatbots:activate': ['Owner', 'Admin', 'Manager'],
  'chatbots:test': ['Owner', 'Admin', 'Manager'],

  // E-commerce Integrations
  'ecommerce:create-integration': ['Owner', 'Admin'],
  'ecommerce:read-integration': ['Owner', 'Admin', 'Manager'],
  'ecommerce:update-integration': ['Owner', 'Admin'],
  'ecommerce:delete-integration': ['Owner'],
  'ecommerce:sync-orders': ['Owner', 'Admin', 'Manager'],
  'ecommerce:read-orders': ['Owner', 'Admin', 'Manager', 'Agent'],
  'ecommerce:notify-orders': ['Owner', 'Admin', 'Manager'],
  'ecommerce:read-abandoned-carts': ['Owner', 'Admin', 'Manager'],
  'ecommerce:recover-carts': ['Owner', 'Admin', 'Manager'],

  // Payment Gateways & Subscriptions
  'payments:configure-gateways': ['Owner'],
  'payments:read-gateways': ['Owner', 'Admin'],
  'payments:create-subscriptions': ['Owner'],
  'payments:read-subscriptions': ['Owner', 'Admin'],
  'payments:update-subscriptions': ['Owner'],
  'payments:cancel-subscriptions': ['Owner'],
  'payments:read-payments': ['Owner', 'Admin'],
  'payments:refund': ['Owner'],
  'payments:read-invoices': ['Owner', 'Admin'],
  'payments:manage-plans': ['Owner'],

  // Analytics & Reports
  'analytics:read': ['Owner', 'Admin', 'Manager'], // General analytics read permission
  'analytics:read-overview': ['Owner', 'Admin', 'Manager'],
  'analytics:read-messages': ['Owner', 'Admin', 'Manager'],
  'analytics:read-campaigns': ['Owner', 'Admin', 'Manager'],
  'analytics:read-contacts': ['Owner', 'Admin', 'Manager'],
  'analytics:read-revenue': ['Owner', 'Admin'],
  'analytics:read-chatbots': ['Owner', 'Admin', 'Manager'],
  'analytics:export-reports': ['Owner', 'Admin', 'Manager'],
  'analytics:schedule-reports': ['Owner', 'Admin', 'Manager'],

  // E-commerce Integration
  'ecommerce:create': ['Owner', 'Admin'],
  'ecommerce:read': ['Owner', 'Admin', 'Manager'],
  'ecommerce:update': ['Owner', 'Admin'],
  'ecommerce:delete': ['Owner'],
  'ecommerce:sync': ['Owner', 'Admin'],

  // Team Management
  'team:invite': ['Owner', 'Admin'],
  'team:read-members': ['Owner', 'Admin', 'Manager'],
  'team:update-members': ['Owner', 'Admin'],
  'team:remove-members': ['Owner', 'Admin'],
  'team:suspend-members': ['Owner', 'Admin'],
  'team:reactivate-members': ['Owner', 'Admin'],
  'team:read-activity': ['Owner', 'Admin', 'Manager'],
  'team:export-activity': ['Owner', 'Admin'],

  // Webhooks
  'webhooks:create': ['Owner', 'Admin'],
  'webhooks:read': ['Owner', 'Admin', 'Manager'],
  'webhooks:update': ['Owner', 'Admin'],
  'webhooks:delete': ['Owner', 'Admin'],
  'webhooks:test': ['Owner', 'Admin'],
  'webhooks:read-deliveries': ['Owner', 'Admin', 'Manager'],

  // System Settings
  'settings:read': ['Owner', 'Admin'],
  'settings:update': ['Owner'],
};

/**
 * Get all permissions for a specific role
 * @param {string} role - User role (Owner, Admin, Manager, Agent)
 * @returns {string[]} Array of permission strings
 */
export function getRolePermissions(role) {
  const permissions = [];

  for (const [permission, roles] of Object.entries(PERMISSIONS)) {
    if (roles.includes(role)) {
      permissions.push(permission);
    }
  }

  return permissions;
}

/**
 * Check if a role has a specific permission
 * @param {string} role - User role
 * @param {string} permission - Permission to check
 * @returns {boolean} True if role has permission
 */
export function hasPermission(role, permission) {
  const allowedRoles = PERMISSIONS[permission];
  return allowedRoles ? allowedRoles.includes(role) : false;
}

/**
 * Check if a role has any of the specified permissions
 * @param {string} role - User role
 * @param {string[]} permissions - Array of permissions to check
 * @returns {boolean} True if role has at least one permission
 */
export function hasAnyPermission(role, permissions) {
  return permissions.some((permission) => hasPermission(role, permission));
}

/**
 * Check if a role has all of the specified permissions
 * @param {string} role - User role
 * @param {string[]} permissions - Array of permissions to check
 * @returns {boolean} True if role has all permissions
 */
export function hasAllPermissions(role, permissions) {
  return permissions.every((permission) => hasPermission(role, permission));
}

/**
 * Match permission with wildcard support
 * Supports patterns like:
 * - contacts:* (all contact permissions)
 * - *:read (all read permissions)
 * - * (all permissions)
 *
 * @param {string} role - User role
 * @param {string} pattern - Permission pattern with wildcards
 * @returns {boolean} True if role matches pattern
 */
export function matchesPermissionPattern(role, pattern) {
  // Handle full wildcard
  if (pattern === '*') {
    return true;
  }

  // Handle wildcard patterns
  if (pattern.includes('*')) {
    const [resource, action] = pattern.split(':');

    // Get all permissions for the role
    const rolePermissions = getRolePermissions(role);

    // Check if any permission matches the pattern
    return rolePermissions.some((permission) => {
      const [permResource, permAction] = permission.split(':');

      // Match resource:*
      if (resource !== '*' && action === '*') {
        return permResource === resource;
      }

      // Match *:action
      if (resource === '*' && action !== '*') {
        return permAction === action;
      }

      return false;
    });
  }

  // No wildcard, check exact permission
  return hasPermission(role, pattern);
}

/**
 * Get permission description for documentation
 * @param {string} permission - Permission string
 * @returns {object} Permission details
 */
export function getPermissionDetails(permission) {
  const [resource, action] = permission.split(':');
  const roles = PERMISSIONS[permission] || [];

  return {
    permission,
    resource,
    action,
    roles,
    description: `${action.replace(/-/g, ' ')} ${resource}`,
  };
}

/**
 * Validate if a permission string is valid
 * @param {string} permission - Permission to validate
 * @returns {boolean} True if permission exists
 */
export function isValidPermission(permission) {
  return permission in PERMISSIONS;
}

export default {
  PERMISSIONS,
  getRolePermissions,
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
  matchesPermissionPattern,
  getPermissionDetails,
  isValidPermission,
};
