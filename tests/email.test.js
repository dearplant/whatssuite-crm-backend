/**
 * Email Service Tests
 * Tests for email service functionality
 */

import emailService from '../src/services/emailService.js';
import {
  queueVerificationEmail,
  queuePasswordResetEmail,
  queueWelcomeEmail,
  queueAccountLockoutEmail,
  queuePasswordChangedEmail,
} from '../src/queues/emailQueue.js';

describe('Email Service', () => {
  describe('Template Loading', () => {
    it('should load verification email template', async () => {
      const template = await emailService.loadTemplate('verification');
      expect(template).toBeDefined();
      expect(typeof template).toBe('function');
    });

    it('should load password-reset email template', async () => {
      const template = await emailService.loadTemplate('password-reset');
      expect(template).toBeDefined();
      expect(typeof template).toBe('function');
    });

    it('should load welcome email template', async () => {
      const template = await emailService.loadTemplate('welcome');
      expect(template).toBeDefined();
      expect(typeof template).toBe('function');
    });

    it('should load account-lockout email template', async () => {
      const template = await emailService.loadTemplate('account-lockout');
      expect(template).toBeDefined();
      expect(typeof template).toBe('function');
    });

    it('should load password-changed email template', async () => {
      const template = await emailService.loadTemplate('password-changed');
      expect(template).toBeDefined();
      expect(typeof template).toBe('function');
    });

    it('should throw error for non-existent template', async () => {
      await expect(emailService.loadTemplate('non-existent')).rejects.toThrow(
        'Email template non-existent not found'
      );
    });
  });

  describe('Template Rendering', () => {
    it('should render verification email with data', async () => {
      const html = await emailService.renderTemplate('verification', {
        firstName: 'John',
        verificationUrl: 'https://example.com/verify?token=abc123',
        appName: 'WhatsApp CRM',
      });

      expect(html).toContain('John');
      expect(html).toContain('verify?token'); // Check for URL pattern (Handlebars escapes = to &#x3D;)
      expect(html).toContain('WhatsApp CRM');
    });

    it('should render password-reset email with data', async () => {
      const html = await emailService.renderTemplate('password-reset', {
        firstName: 'Jane',
        resetUrl: 'https://example.com/reset?token=xyz789',
        appName: 'WhatsApp CRM',
        expiryHours: 1,
      });

      expect(html).toContain('Jane');
      expect(html).toContain('reset?token'); // Check for URL pattern (Handlebars escapes = to &#x3D;)
      expect(html).toContain('1');
    });

    it('should render welcome email with data', async () => {
      const html = await emailService.renderTemplate('welcome', {
        firstName: 'Bob',
        appName: 'WhatsApp CRM',
        loginUrl: 'https://example.com/login',
      });

      expect(html).toContain('Bob');
      expect(html).toContain('WhatsApp CRM');
      expect(html).toContain('https://example.com/login');
    });
  });

  describe('Email Queue Functions', () => {
    it('should queue verification email', async () => {
      const user = {
        id: '1',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
      };
      const token = 'test-token-123';

      const job = await queueVerificationEmail(user, token);
      expect(job).toBeDefined();
      expect(job.id).toBeDefined();
      expect(job.data.type).toBe('verification');
      expect(job.data.data.user).toEqual(user);
      expect(job.data.data.token).toBe(token);
    });

    it('should queue password reset email', async () => {
      const user = {
        id: '2',
        email: 'test2@example.com',
        firstName: 'Test2',
        lastName: 'User2',
      };
      const token = 'reset-token-456';

      const job = await queuePasswordResetEmail(user, token);
      expect(job).toBeDefined();
      expect(job.id).toBeDefined();
      expect(job.data.type).toBe('password-reset');
      expect(job.data.data.user).toEqual(user);
      expect(job.data.data.token).toBe(token);
    });

    it('should queue welcome email', async () => {
      const user = {
        id: '3',
        email: 'test3@example.com',
        firstName: 'Test3',
        lastName: 'User3',
      };

      const job = await queueWelcomeEmail(user);
      expect(job).toBeDefined();
      expect(job.id).toBeDefined();
      expect(job.data.type).toBe('welcome');
      expect(job.data.data.user).toEqual(user);
    });

    it('should queue account lockout email', async () => {
      const user = {
        id: '4',
        email: 'test4@example.com',
        firstName: 'Test4',
        lastName: 'User4',
      };

      const job = await queueAccountLockoutEmail(user);
      expect(job).toBeDefined();
      expect(job.id).toBeDefined();
      expect(job.data.type).toBe('account-lockout');
      expect(job.data.data.user).toEqual(user);
    });

    it('should queue password changed email', async () => {
      const user = {
        id: '5',
        email: 'test5@example.com',
        firstName: 'Test5',
        lastName: 'User5',
      };

      const job = await queuePasswordChangedEmail(user);
      expect(job).toBeDefined();
      expect(job.id).toBeDefined();
      expect(job.data.type).toBe('password-changed');
      expect(job.data.data.user).toEqual(user);
    });
  });

  describe('HTML to Text Conversion', () => {
    it('should convert HTML to plain text', () => {
      const html = '<p>Hello <strong>World</strong></p>';
      const text = emailService.htmlToText(html);
      expect(text).toBe('Hello World');
    });

    it('should handle empty HTML', () => {
      const text = emailService.htmlToText('');
      expect(text).toBe('');
    });

    it('should remove style and script tags', () => {
      const html = '<style>body { color: red; }</style><p>Content</p><script>alert("test");</script>';
      const text = emailService.htmlToText(html);
      expect(text).toBe('Content');
    });
  });
});
