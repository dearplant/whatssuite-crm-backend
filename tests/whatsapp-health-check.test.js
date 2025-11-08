/**
 * WhatsApp Health Check Service Tests
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import whatsappHealthCheckService from '../src/services/whatsappHealthCheckService.js';
import cronScheduler from '../src/services/cronScheduler.js';

describe('WhatsApp Health Check Service', () => {
  beforeEach(() => {
    whatsappHealthCheckService.clearNotificationTracking();
  });

  describe('Service Methods', () => {
    it('should have performHealthCheck method', () => {
      expect(typeof whatsappHealthCheckService.performHealthCheck).toBe('function');
    });

    it('should have getHealthCheckStats method', () => {
      expect(typeof whatsappHealthCheckService.getHealthCheckStats).toBe('function');
    });

    it('should have clearNotificationTracking method', () => {
      expect(typeof whatsappHealthCheckService.clearNotificationTracking).toBe('function');
    });
  });
});

describe('Cron Scheduler', () => {
  describe('Scheduler Methods', () => {
    it('should have initialize method', () => {
      expect(typeof cronScheduler.initialize).toBe('function');
    });

    it('should have getStatus method', () => {
      expect(typeof cronScheduler.getStatus).toBe('function');
    });

    it('should have triggerJob method', () => {
      expect(typeof cronScheduler.triggerJob).toBe('function');
    });

    it('should have stopJob method', () => {
      expect(typeof cronScheduler.stopJob).toBe('function');
    });

    it('should have startJob method', () => {
      expect(typeof cronScheduler.startJob).toBe('function');
    });

    it('should have stopAll method', () => {
      expect(typeof cronScheduler.stopAll).toBe('function');
    });
  });

  describe('getStatus', () => {
    it('should return status object', () => {
      const status = cronScheduler.getStatus();
      expect(status).toBeInstanceOf(Object);
      // Note: Jobs are only present after initialization
      // In test environment, they may not be initialized
    });
  });

  describe('Job Control', () => {
    it('should return false for non-existent job', () => {
      const result = cronScheduler.stopJob('non-existent-job');
      expect(result).toBe(false);
    });
  });
});
