/**
 * Role-Based Access Control (RBAC) Middleware
 * 
 * This middleware checks if the authenticated user has the required permissions
 * to access a specific resource or perform an action.
 */

import {
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
  matchesPermissionPattern,
  isValidPermission,
} from '../config/permissions.js';
import logger from '../utils/logger.js';

/**
 * Middleware to check if user has a specific permission
 * @param {string|string[]} requiredPermission - Permission(s) required to access the route
 * @param {object} options - Additional options
 * @param {boolean} options.requireAll - If true, user must have all permissions (default: false)
 * @param {boolean} options.allowWildcard - If true, allows wildcard matching (default: false)
 * @returns {Function} Express middleware function
 */
export function authorize(requiredPermission, options = {}) {
  const { requireAll = false, allowWildcard = false } = options;

  return (req, res, next) => {
    try {
      // Check if user is authenticated
      if (!req.user) {
        logger.warn('Authorization failed: No authenticated user');
        return res.status(401).json({
          success: false,
          message: 'Authentication required',
        });
      }

      const { role } = req.user;

      // Validate role exists
      if (!role) {
        logger.error(`Authorization failed: User ${req.user.id} has no role assigned`);
        return res.status(403).json({
          success: false,
          message: 'Access denied: No role assigned',
        });
      }

      // Convert single permission to array for consistent handling
      const permissions = Array.isArray(requiredPermission)
        ? requiredPermission
        : [requiredPermission];

      // Validate all permissions are valid
      if (!allowWildcard) {
        const invalidPermissions = permissions.filter(p => !isValidPermission(p));
        if (invalidPermissions.length > 0) {
          logger.error(`Invalid permissions specified: ${invalidPermissions.join(', ')}`);
          return res.status(500).json({
            success: false,
            message: 'Internal server error: Invalid permission configuration',
          });
        }
      }

      // Check permissions based on options
      let hasAccess = false;

      if (allowWildcard) {
        // Use wildcard matching
        hasAccess = requireAll
          ? permissions.every(p => matchesPermissionPattern(role, p))
          : permissions.some(p => matchesPermissionPattern(role, p));
      } else {
        // Use exact permission matching
        hasAccess = requireAll
          ? hasAllPermissions(role, permissions)
          : hasAnyPermission(role, permissions);
      }

      if (!hasAccess) {
        logger.warn(
          `Authorization failed: User ${req.user.id} (${role}) attempted to access ${req.method} ${req.path} without required permissions: ${permissions.join(', ')}`,
        );

        return res.status(403).json({
          success: false,
          message: 'Access denied: Insufficient permissions',
          requiredPermissions: permissions,
        });
      }

      // Log successful authorization for audit
      logger.debug(
        `Authorization successful: User ${req.user.id} (${role}) accessed ${req.method} ${req.path}`,
      );

      next();
    } catch (error) {
      logger.error('Authorization middleware error:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error during authorization',
      });
    }
  };
}

/**
 * Middleware to check if user has any of the specified permissions
 * @param {string[]} permissions - Array of permissions (user needs at least one)
 * @returns {Function} Express middleware function
 */
export function authorizeAny(permissions) {
  return authorize(permissions, { requireAll: false });
}

/**
 * Middleware to check if user has all of the specified permissions
 * @param {string[]} permissions - Array of permissions (user needs all)
 * @returns {Function} Express middleware function
 */
export function authorizeAll(permissions) {
  return authorize(permissions, { requireAll: true });
}

/**
 * Middleware to check if user has permission matching a wildcard pattern
 * @param {string} pattern - Permission pattern with wildcards (e.g., 'contacts:*')
 * @returns {Function} Express middleware function
 */
export function authorizePattern(pattern) {
  return authorize(pattern, { allowWildcard: true });
}

/**
 * Middleware to check if user is Owner
 * @returns {Function} Express middleware function
 */
export function requireOwner(req, res, next) {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required',
    });
  }

  if (req.user.role !== 'Owner') {
    logger.warn(
      `Owner access denied: User ${req.user.id} (${req.user.role}) attempted to access ${req.method} ${req.path}`,
    );

    return res.status(403).json({
      success: false,
      message: 'Access denied: Owner role required',
    });
  }

  next();
}

/**
 * Middleware to check if user is Owner or Admin
 * @returns {Function} Express middleware function
 */
export function requireAdmin(req, res, next) {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required',
    });
  }

  if (!['Owner', 'Admin'].includes(req.user.role)) {
    logger.warn(
      `Admin access denied: User ${req.user.id} (${req.user.role}) attempted to access ${req.method} ${req.path}`,
    );

    return res.status(403).json({
      success: false,
      message: 'Access denied: Admin role required',
    });
  }

  next();
}

/**
 * Middleware to check if user can access their own resource or has admin privileges
 * @param {string} userIdParam - Name of the route parameter containing the user ID (default: 'id')
 * @returns {Function} Express middleware function
 */
export function requireOwnershipOrAdmin(userIdParam = 'id') {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    const resourceUserId = req.params[userIdParam] || req.body.userId || req.query.userId;

    // Allow if user is Owner or Admin
    if (['Owner', 'Admin'].includes(req.user.role)) {
      return next();
    }

    // Allow if user is accessing their own resource
    if (resourceUserId && resourceUserId === req.user.id) {
      return next();
    }

    logger.warn(
      `Ownership check failed: User ${req.user.id} attempted to access resource belonging to ${resourceUserId}`,
    );

    return res.status(403).json({
      success: false,
      message: 'Access denied: You can only access your own resources',
    });
  };
}

/**
 * Helper function to check permissions programmatically (not middleware)
 * Useful for conditional logic within controllers
 * 
 * @param {object} user - User object with role property
 * @param {string|string[]} permission - Permission(s) to check
 * @returns {boolean} True if user has permission
 */
export function checkPermission(user, permission) {
  if (!user || !user.role) {
    return false;
  }

  const permissions = Array.isArray(permission) ? permission : [permission];
  return hasAnyPermission(user.role, permissions);
}

/**
 * Helper function to get user's permissions (not middleware)
 * Useful for returning permissions in API responses
 * 
 * @param {object} user - User object with role property
 * @returns {string[]} Array of permission strings
 */
export async function getUserPermissions(user) {
  if (!user || !user.role) {
    return [];
  }

  const { getRolePermissions } = await import('../config/permissions.js');
  return getRolePermissions(user.role);
}

export default {
  authorize,
  authorizeAny,
  authorizeAll,
  authorizePattern,
  requireOwner,
  requireAdmin,
  requireOwnershipOrAdmin,
  checkPermission,
  getUserPermissions,
};
