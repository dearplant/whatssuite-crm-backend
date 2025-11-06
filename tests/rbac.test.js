/**
 * RBAC (Role-Based Access Control) Tests
 * 
 * Tests for permission checking, role validation, and RBAC middleware
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import {
  PERMISSIONS,
  getRolePermissions,
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
  matchesPermissionPattern,
  getPermissionDetails,
  isValidPermission,
} from '../src/config/permissions.js';

describe('RBAC Permission System', () => {
  describe('Permission Matrix', () => {
    it('should have defined permissions', () => {
      expect(PERMISSIONS).toBeDefined();
      expect(typeof PERMISSIONS).toBe('object');
      expect(Object.keys(PERMISSIONS).length).toBeGreaterThan(0);
    });

    it('should have valid permission format (resource:action)', () => {
      Object.keys(PERMISSIONS).forEach(permission => {
        expect(permission).toMatch(/^[a-z-]+:[a-z-]+$/);
      });
    });

    it('should have valid roles for each permission', () => {
      const validRoles = ['Owner', 'Admin', 'Manager', 'Agent'];
      
      Object.values(PERMISSIONS).forEach(roles => {
        expect(Array.isArray(roles)).toBe(true);
        roles.forEach(role => {
          expect(validRoles).toContain(role);
        });
      });
    });
  });

  describe('getRolePermissions', () => {
    it('should return all permissions for Owner', () => {
      const permissions = getRolePermissions('Owner');
      expect(Array.isArray(permissions)).toBe(true);
      expect(permissions.length).toBeGreaterThan(0);
      
      // Owner should have the most permissions
      const adminPermissions = getRolePermissions('Admin');
      expect(permissions.length).toBeGreaterThanOrEqual(adminPermissions.length);
    });

    it('should return permissions for Admin', () => {
      const permissions = getRolePermissions('Admin');
      expect(Array.isArray(permissions)).toBe(true);
      expect(permissions.length).toBeGreaterThan(0);
    });

    it('should return permissions for Manager', () => {
      const permissions = getRolePermissions('Manager');
      expect(Array.isArray(permissions)).toBe(true);
      expect(permissions.length).toBeGreaterThan(0);
    });

    it('should return permissions for Agent', () => {
      const permissions = getRolePermissions('Agent');
      expect(Array.isArray(permissions)).toBe(true);
      expect(permissions.length).toBeGreaterThan(0);
      
      // Agent should have the least permissions
      const managerPermissions = getRolePermissions('Manager');
      expect(permissions.length).toBeLessThanOrEqual(managerPermissions.length);
    });

    it('should return empty array for invalid role', () => {
      const permissions = getRolePermissions('InvalidRole');
      expect(permissions).toEqual([]);
    });
  });

  describe('hasPermission', () => {
    it('should return true when Owner has permission', () => {
      expect(hasPermission('Owner', 'contacts:create')).toBe(true);
      expect(hasPermission('Owner', 'payments:configure-gateways')).toBe(true);
    });

    it('should return true when Admin has permission', () => {
      expect(hasPermission('Admin', 'contacts:create')).toBe(true);
      expect(hasPermission('Admin', 'users:create')).toBe(true);
    });

    it('should return false when Admin lacks Owner-only permission', () => {
      expect(hasPermission('Admin', 'payments:configure-gateways')).toBe(false);
      expect(hasPermission('Admin', 'users:manage-roles')).toBe(false);
    });

    it('should return true when Manager has permission', () => {
      expect(hasPermission('Manager', 'contacts:create')).toBe(true);
      expect(hasPermission('Manager', 'campaigns:create')).toBe(true);
    });

    it('should return false when Manager lacks admin permission', () => {
      expect(hasPermission('Manager', 'users:create')).toBe(false);
      expect(hasPermission('Manager', 'whatsapp:connect')).toBe(false);
    });

    it('should return true when Agent has permission', () => {
      expect(hasPermission('Agent', 'contacts:create')).toBe(true);
      expect(hasPermission('Agent', 'messages:send')).toBe(true);
    });

    it('should return false when Agent lacks higher-level permission', () => {
      expect(hasPermission('Agent', 'campaigns:create')).toBe(false);
      expect(hasPermission('Agent', 'contacts:delete')).toBe(false);
    });

    it('should return false for non-existent permission', () => {
      expect(hasPermission('Owner', 'invalid:permission')).toBe(false);
    });
  });

  describe('hasAnyPermission', () => {
    it('should return true if user has at least one permission', () => {
      expect(hasAnyPermission('Agent', ['contacts:create', 'campaigns:create'])).toBe(true);
    });

    it('should return false if user has none of the permissions', () => {
      expect(hasAnyPermission('Agent', ['campaigns:create', 'users:create'])).toBe(false);
    });

    it('should return true if user has all permissions', () => {
      expect(hasAnyPermission('Owner', ['contacts:create', 'campaigns:create'])).toBe(true);
    });
  });

  describe('hasAllPermissions', () => {
    it('should return true if user has all permissions', () => {
      expect(hasAllPermissions('Owner', ['contacts:create', 'campaigns:create'])).toBe(true);
    });

    it('should return false if user lacks any permission', () => {
      expect(hasAllPermissions('Agent', ['contacts:create', 'campaigns:create'])).toBe(false);
    });

    it('should return true for empty permission array', () => {
      expect(hasAllPermissions('Agent', [])).toBe(true);
    });
  });

  describe('matchesPermissionPattern', () => {
    it('should match full wildcard (*)', () => {
      expect(matchesPermissionPattern('Owner', '*')).toBe(true);
      expect(matchesPermissionPattern('Agent', '*')).toBe(true);
    });

    it('should match resource wildcard (contacts:*)', () => {
      expect(matchesPermissionPattern('Owner', 'contacts:*')).toBe(true);
      expect(matchesPermissionPattern('Agent', 'contacts:*')).toBe(true);
    });

    it('should not match resource wildcard if no permissions for resource', () => {
      expect(matchesPermissionPattern('Agent', 'payments:*')).toBe(false);
    });

    it('should match action wildcard (*:read)', () => {
      expect(matchesPermissionPattern('Owner', '*:read')).toBe(true);
      expect(matchesPermissionPattern('Agent', '*:read')).toBe(true);
    });

    it('should match exact permission without wildcard', () => {
      expect(matchesPermissionPattern('Owner', 'contacts:create')).toBe(true);
      expect(matchesPermissionPattern('Agent', 'contacts:create')).toBe(true);
    });

    it('should not match exact permission user does not have', () => {
      expect(matchesPermissionPattern('Agent', 'campaigns:create')).toBe(false);
    });
  });

  describe('getPermissionDetails', () => {
    it('should return permission details', () => {
      const details = getPermissionDetails('contacts:create');
      
      expect(details).toHaveProperty('permission', 'contacts:create');
      expect(details).toHaveProperty('resource', 'contacts');
      expect(details).toHaveProperty('action', 'create');
      expect(details).toHaveProperty('roles');
      expect(Array.isArray(details.roles)).toBe(true);
      expect(details).toHaveProperty('description');
    });

    it('should return empty roles for non-existent permission', () => {
      const details = getPermissionDetails('invalid:permission');
      expect(details.roles).toEqual([]);
    });
  });

  describe('isValidPermission', () => {
    it('should return true for valid permissions', () => {
      expect(isValidPermission('contacts:create')).toBe(true);
      expect(isValidPermission('campaigns:read')).toBe(true);
      expect(isValidPermission('users:delete')).toBe(true);
    });

    it('should return false for invalid permissions', () => {
      expect(isValidPermission('invalid:permission')).toBe(false);
      expect(isValidPermission('contacts:invalid')).toBe(false);
      expect(isValidPermission('notapermission')).toBe(false);
    });
  });

  describe('Role Hierarchy', () => {
    it('should ensure Owner has more permissions than Admin', () => {
      const ownerPerms = getRolePermissions('Owner');
      const adminPerms = getRolePermissions('Admin');
      
      expect(ownerPerms.length).toBeGreaterThan(adminPerms.length);
    });

    it('should ensure Admin has more permissions than Manager', () => {
      const adminPerms = getRolePermissions('Admin');
      const managerPerms = getRolePermissions('Manager');
      
      expect(adminPerms.length).toBeGreaterThan(managerPerms.length);
    });

    it('should ensure Manager has more permissions than Agent', () => {
      const managerPerms = getRolePermissions('Manager');
      const agentPerms = getRolePermissions('Agent');
      
      expect(managerPerms.length).toBeGreaterThan(agentPerms.length);
    });
  });

  describe('Critical Permissions', () => {
    it('should restrict payment configuration to Owner only', () => {
      expect(hasPermission('Owner', 'payments:configure-gateways')).toBe(true);
      expect(hasPermission('Admin', 'payments:configure-gateways')).toBe(false);
      expect(hasPermission('Manager', 'payments:configure-gateways')).toBe(false);
      expect(hasPermission('Agent', 'payments:configure-gateways')).toBe(false);
    });

    it('should restrict role management to Owner only', () => {
      expect(hasPermission('Owner', 'users:manage-roles')).toBe(true);
      expect(hasPermission('Admin', 'users:manage-roles')).toBe(false);
      expect(hasPermission('Manager', 'users:manage-roles')).toBe(false);
      expect(hasPermission('Agent', 'users:manage-roles')).toBe(false);
    });

    it('should allow all roles to read their own profile', () => {
      expect(hasPermission('Owner', 'auth:read-own-profile')).toBe(true);
      expect(hasPermission('Admin', 'auth:read-own-profile')).toBe(true);
      expect(hasPermission('Manager', 'auth:read-own-profile')).toBe(true);
      expect(hasPermission('Agent', 'auth:read-own-profile')).toBe(true);
    });

    it('should allow Owner and Admin to manage WhatsApp connections', () => {
      expect(hasPermission('Owner', 'whatsapp:connect')).toBe(true);
      expect(hasPermission('Admin', 'whatsapp:connect')).toBe(true);
      expect(hasPermission('Manager', 'whatsapp:connect')).toBe(false);
      expect(hasPermission('Agent', 'whatsapp:connect')).toBe(false);
    });

    it('should allow Owner, Admin, Manager to create campaigns', () => {
      expect(hasPermission('Owner', 'campaigns:create')).toBe(true);
      expect(hasPermission('Admin', 'campaigns:create')).toBe(true);
      expect(hasPermission('Manager', 'campaigns:create')).toBe(true);
      expect(hasPermission('Agent', 'campaigns:create')).toBe(false);
    });

    it('should allow all roles to send messages', () => {
      expect(hasPermission('Owner', 'messages:send')).toBe(true);
      expect(hasPermission('Admin', 'messages:send')).toBe(true);
      expect(hasPermission('Manager', 'messages:send')).toBe(true);
      expect(hasPermission('Agent', 'messages:send')).toBe(true);
    });
  });

  describe('Permission Consistency', () => {
    it('should have consistent permission naming', () => {
      const permissions = Object.keys(PERMISSIONS);
      
      permissions.forEach(permission => {
        const [resource, action] = permission.split(':');
        
        // Resource should be lowercase and may contain hyphens
        expect(resource).toMatch(/^[a-z-]+$/);
        
        // Action should be lowercase and may contain hyphens
        expect(action).toMatch(/^[a-z-]+$/);
      });
    });

    it('should not have duplicate permissions', () => {
      const permissions = Object.keys(PERMISSIONS);
      const uniquePermissions = [...new Set(permissions)];
      
      expect(permissions.length).toBe(uniquePermissions.length);
    });
  });
});

describe('RBAC Middleware', () => {
  // Note: Full middleware tests would require mocking Express req/res objects
  // These are basic unit tests for the permission checking logic
  
  describe('Permission Validation', () => {
    it('should validate permission format', () => {
      expect(isValidPermission('contacts:create')).toBe(true);
      expect(isValidPermission('invalid')).toBe(false);
      expect(isValidPermission('')).toBe(false);
    });
  });
});
