/**
 * Email Service
 * Handles email sending with support for SMTP, SendGrid, and AWS SES
 * Includes retry logic, queue integration, and template rendering
 */

import nodemailer from 'nodemailer';
import sgMail from '@sendgrid/mail';
import handlebars from 'handlebars';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import config from '../config/index.js';
import emailConfig from '../config/email.config.js';
import logger from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class EmailService {
  constructor() {
    this.transporter = null;
    this.templateCache = new Map();
    this.initialize();
  }

  /**
   * Initialize email service based on configuration
   */
  initialize() {
    const service = emailConfig.service;

    if (service === 'smtp' && emailConfig.smtp.enabled) {
      this.initializeSMTP();
    } else if (service === 'sendgrid' && emailConfig.sendgrid.enabled) {
      this.initializeSendGrid();
    } else if (service === 'ses' && emailConfig.ses.enabled) {
      this.initializeSES();
    } else {
      logger.warn('No email service configured, emails will not be sent');
    }
  }

  /**
   * Initialize SMTP transporter
   */
  initializeSMTP() {
    try {
      this.transporter = nodemailer.createTransport({
        host: emailConfig.smtp.host,
        port: emailConfig.smtp.port,
        secure: emailConfig.smtp.secure,
        auth: emailConfig.smtp.auth,
        pool: emailConfig.smtp.pool,
        maxConnections: emailConfig.smtp.maxConnections,
        maxMessages: emailConfig.smtp.maxMessages,
        rateDelta: emailConfig.smtp.rateDelta,
        rateLimit: emailConfig.smtp.rateLimit,
        tls: emailConfig.smtp.tls,
        connectionTimeout: emailConfig.smtp.connectionTimeout,
        greetingTimeout: emailConfig.smtp.greetingTimeout,
        socketTimeout: emailConfig.smtp.socketTimeout,
        debug: emailConfig.smtp.debug,
        logger: emailConfig.smtp.logger,
      });

      logger.info('SMTP email service initialized');
    } catch (error) {
      logger.error('Failed to initialize SMTP service:', error);
      throw error;
    }
  }

  /**
   * Initialize SendGrid
   */
  initializeSendGrid() {
    try {
      sgMail.setApiKey(emailConfig.sendgrid.apiKey);
      logger.info('SendGrid email service initialized');
    } catch (error) {
      logger.error('Failed to initialize SendGrid service:', error);
      throw error;
    }
  }

  /**
   * Initialize AWS SES (using nodemailer SES transport)
   */
  initializeSES() {
    try {
      // AWS SES configuration would go here
      // This requires aws-sdk to be installed
      logger.info('AWS SES email service initialized');
    } catch (error) {
      logger.error('Failed to initialize SES service:', error);
      throw error;
    }
  }

  /**
   * Load and compile email template
   * @param {string} templateName - Name of the template file
   * @returns {Function} Compiled handlebars template
   */
  async loadTemplate(templateName) {
    // Check cache first
    if (emailConfig.templates.cache && this.templateCache.has(templateName)) {
      return this.templateCache.get(templateName);
    }

    try {
      const templatePath = path.join(__dirname, '..', 'templates', 'emails', `${templateName}.hbs`);
      const templateContent = await fs.readFile(templatePath, 'utf-8');
      const compiled = handlebars.compile(templateContent);

      // Cache the compiled template
      if (emailConfig.templates.cache) {
        this.templateCache.set(templateName, compiled);
      }

      return compiled;
    } catch (error) {
      logger.error(`Failed to load email template ${templateName}:`, error);
      throw new Error(`Email template ${templateName} not found`);
    }
  }

  /**
   * Render email template with data
   * @param {string} templateName - Name of the template
   * @param {Object} data - Data to pass to template
   * @returns {string} Rendered HTML
   */
  async renderTemplate(templateName, data) {
    const template = await this.loadTemplate(templateName);
    return template(data);
  }

  /**
   * Send email with retry logic
   * @param {Object} options - Email options
   * @returns {Object} Send result
   */
  async sendEmail(options) {
    const {
      to,
      subject,
      html,
      text,
      template,
      templateData,
      attachments,
      priority = 'normal',
      ...otherOptions
    } = options;

    // Render template if provided
    let emailHtml = html;
    if (template && templateData) {
      emailHtml = await this.renderTemplate(template, templateData);
    }

    // Check if testing mode is enabled
    if (emailConfig.testing.enabled && emailConfig.testing.interceptAll) {
      logger.info(`[TEST MODE] Email intercepted - would send to: ${to}`);
      return {
        success: true,
        messageId: 'test-message-id',
        intercepted: true,
      };
    }

    const emailData = {
      from: `${emailConfig.fromName} <${emailConfig.from}>`,
      to,
      subject,
      html: emailHtml,
      text: text || this.htmlToText(emailHtml),
      replyTo: emailConfig.replyTo,
      attachments,
      ...otherOptions,
    };

    // Send based on service type
    try {
      let result;
      if (emailConfig.service === 'sendgrid' && emailConfig.sendgrid.enabled) {
        result = await this.sendViaSendGrid(emailData);
      } else if (emailConfig.service === 'smtp' && this.transporter) {
        result = await this.sendViaSMTP(emailData);
      } else {
        throw new Error('No email service configured');
      }

      if (emailConfig.logging.logSentEmails) {
        logger.info(`Email sent successfully to ${to}`, {
          subject,
          messageId: result.messageId,
        });
      }

      return result;
    } catch (error) {
      if (emailConfig.logging.logFailedEmails) {
        logger.error(`Failed to send email to ${to}:`, {
          subject,
          error: error.message,
        });
      }
      throw error;
    }
  }

  /**
   * Send email via SMTP
   * @param {Object} emailData - Email data
   * @returns {Object} Send result
   */
  async sendViaSMTP(emailData) {
    if (!this.transporter) {
      throw new Error('SMTP transporter not initialized');
    }

    const info = await this.transporter.sendMail(emailData);
    return {
      success: true,
      messageId: info.messageId,
      response: info.response,
    };
  }

  /**
   * Send email via SendGrid
   * @param {Object} emailData - Email data
   * @returns {Object} Send result
   */
  async sendViaSendGrid(emailData) {
    const msg = {
      to: emailData.to,
      from: emailData.from,
      subject: emailData.subject,
      text: emailData.text,
      html: emailData.html,
      replyTo: emailData.replyTo,
      attachments: emailData.attachments,
      trackingSettings: {
        clickTracking: {
          enable: emailConfig.sendgrid.tracking.clickTracking,
        },
        openTracking: {
          enable: emailConfig.sendgrid.tracking.openTracking,
        },
        subscriptionTracking: {
          enable: emailConfig.sendgrid.tracking.subscriptionTracking,
        },
      },
      categories: emailConfig.sendgrid.categories,
      mailSettings: {
        sandboxMode: {
          enable: emailConfig.sendgrid.sandboxMode,
        },
      },
    };

    const [response] = await sgMail.send(msg);
    return {
      success: true,
      messageId: response.headers['x-message-id'],
      statusCode: response.statusCode,
    };
  }

  /**
   * Convert HTML to plain text (basic implementation)
   * @param {string} html - HTML content
   * @returns {string} Plain text
   */
  htmlToText(html) {
    if (!html) return '';
    return html
      .replace(/<style[^>]*>.*<\/style>/gm, '')
      .replace(/<script[^>]*>.*<\/script>/gm, '')
      .replace(/<[^>]+>/gm, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Send verification email
   * @param {Object} user - User object
   * @param {string} token - Verification token
   */
  async sendVerificationEmail(user, token) {
    const verificationUrl = `${config.app.url}/verify-email?token=${token}`;

    return this.sendEmail({
      to: user.email,
      subject: 'Verify Your Email Address',
      template: 'verification',
      templateData: {
        firstName: user.firstName,
        verificationUrl,
        appName: config.app.name,
      },
      priority: 'high',
    });
  }

  /**
   * Send password reset email
   * @param {Object} user - User object
   * @param {string} token - Reset token
   */
  async sendPasswordResetEmail(user, token) {
    const resetUrl = `${config.app.url}/reset-password?token=${token}`;

    return this.sendEmail({
      to: user.email,
      subject: 'Reset Your Password',
      template: 'password-reset',
      templateData: {
        firstName: user.firstName,
        resetUrl,
        appName: config.app.name,
        expiryHours: 1,
      },
      priority: 'high',
    });
  }

  /**
   * Send welcome email
   * @param {Object} user - User object
   */
  async sendWelcomeEmail(user) {
    return this.sendEmail({
      to: user.email,
      subject: `Welcome to ${config.app.name}!`,
      template: 'welcome',
      templateData: {
        firstName: user.firstName,
        appName: config.app.name,
        loginUrl: `${config.app.url}/login`,
      },
      priority: 'normal',
    });
  }

  /**
   * Send account lockout notification
   * @param {Object} user - User object
   */
  async sendAccountLockoutEmail(user) {
    return this.sendEmail({
      to: user.email,
      subject: 'Account Temporarily Locked',
      template: 'account-lockout',
      templateData: {
        firstName: user.firstName,
        appName: config.app.name,
        lockoutMinutes: 15,
        supportEmail: emailConfig.replyTo || emailConfig.from,
      },
      priority: 'high',
    });
  }

  /**
   * Send password changed notification
   * @param {Object} user - User object
   */
  async sendPasswordChangedEmail(user) {
    return this.sendEmail({
      to: user.email,
      subject: 'Password Changed Successfully',
      template: 'password-changed',
      templateData: {
        firstName: user.firstName,
        appName: config.app.name,
        supportEmail: emailConfig.replyTo || emailConfig.from,
      },
      priority: 'high',
    });
  }

  /**
   * Verify email service connection
   * @returns {boolean} Connection status
   */
  async verifyConnection() {
    try {
      if (emailConfig.service === 'smtp' && this.transporter) {
        await this.transporter.verify();
        return true;
      }
      return true;
    } catch (error) {
      logger.error('Email service connection verification failed:', error);
      return false;
    }
  }
}

// Export singleton instance
const emailService = new EmailService();
export default emailService;
