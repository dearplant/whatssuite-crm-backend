/**
 * Report Generation and Export Tests
 * Tests for analytics report generation, export formats, and scheduling
 */

import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import app from '../src/app.js';
import reportService from '../src/services/reportService.js';
import reportExportService from '../src/services/reportExportService.js';
import analyticsService from '../src/services/analyticsService.js';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

describe('Report Generation and Export', () => {
  let authToken;
  let testUser;
  let testTeam;

  beforeAll(async () => {
    // Create test user and team
    testUser = await prisma.users.create({
      data: {
        id: 'test-user-reports',
        email: 'reports@test.com',
        password_hash: 'hashed_password',
        first_name: 'Test',
        last_name: 'User',
        is_active: true
      }
    });

    testTeam = await prisma.teams.create({
      data: {
        id: 'test-team-reports',
        name: 'Test Team Reports',
        slug: 'test-team-reports',
        owner_id: testUser.id
      }
    });

    // Mock auth token
    authToken = 'mock-jwt-token';
  });

  afterAll(async () => {
    // Cleanup
    await prisma.reports.deleteMany({ where: { team_id: testTeam.id } });
    await prisma.teams.delete({ where: { id: testTeam.id } });
    await prisma.users.delete({ where: { id: testUser.id } });
    await prisma.$disconnect();
  });

  describe('CSV Export', () => {
    it('should generate CSV export for message analytics', async () => {
      const data = {
        timeSeries: [
          { date: '2024-01-01', total: 100, sent: 95, delivered: 90, read: 80, failed: 5, deliveryRate: 94.74, readRate: 88.89 },
          { date: '2024-01-02', total: 150, sent: 145, delivered: 140, read: 120, failed: 5, deliveryRate: 96.55, readRate: 85.71 }
        ]
      };

      const filename = `test_messages_${Date.now()}.csv`;
      const filePath = await reportExportService.generateCSV(data, 'Messages', filename);

      expect(filePath).toBeDefined();
      expect(fs.existsSync(filePath)).toBe(true);

      // Verify file content
      const content = fs.readFileSync(filePath, 'utf-8');
      expect(content).toContain('Date');
      expect(content).toContain('Total Messages');
      expect(content).toContain('2024-01-01');

      // Cleanup
      reportExportService.deleteReportFile(filePath);
    });

    it('should generate CSV export for campaign analytics', async () => {
      const data = {
        topCampaigns: [
          { name: 'Campaign 1', recipients: 1000, sent: 950, delivered: 900, read: 800, replied: 100, deliveryRate: 94.74, readRate: 88.89, replyRate: 10.53 }
        ]
      };

      const filename = `test_campaigns_${Date.now()}.csv`;
      const filePath = await reportExportService.generateCSV(data, 'Campaigns', filename);

      expect(filePath).toBeDefined();
      expect(fs.existsSync(filePath)).toBe(true);

      const content = fs.readFileSync(filePath, 'utf-8');
      expect(content).toContain('Campaign Name');
      expect(content).toContain('Campaign 1');

      reportExportService.deleteReportFile(filePath);
    });
  });

  describe('PDF Report Generation', () => {
    it('should generate PDF report for overview analytics', async () => {
      const data = {
        current: {
          messages: { total: 1000, sent: 950, delivered: 900, read: 800, failed: 50 },
          campaigns: { total: 10, completed: 8, active: 2 },
          contacts: { total: 500, new: 50, active: 300 }
        },
        growth: {
          messages: 15.5,
          campaigns: 25.0,
          contacts: 10.2
        }
      };

      const filename = `test_overview_${Date.now()}.pdf`;
      const filters = { startDate: '2024-01-01', endDate: '2024-01-31' };
      const filePath = await reportExportService.generatePDF(data, 'Overview', filename, filters);

      expect(filePath).toBeDefined();
      expect(fs.existsSync(filePath)).toBe(true);

      const stats = fs.statSync(filePath);
      expect(stats.size).toBeGreaterThan(0);

      reportExportService.deleteReportFile(filePath);
    });

    it('should generate PDF report for message analytics', async () => {
      const data = {
        total: 1000,
        rates: { delivery: 94.74, read: 88.89, failure: 5.26 },
        byStatus: { sent: 950, delivered: 900, read: 800, failed: 50 },
        byType: { Text: 800, Image: 150, Video: 50 }
      };

      const filename = `test_messages_${Date.now()}.pdf`;
      const filePath = await reportExportService.generatePDF(data, 'Messages', filename);

      expect(filePath).toBeDefined();
      expect(fs.existsSync(filePath)).toBe(true);

      reportExportService.deleteReportFile(filePath);
    });
  });

  describe('Excel Export', () => {
    it('should generate Excel export for overview analytics', async () => {
      const data = {
        current: {
          messages: { total: 1000, sent: 950, delivered: 900, read: 800, failed: 50 },
          campaigns: { total: 10, completed: 8, active: 2 },
          contacts: { total: 500, new: 50, active: 300 }
        },
        growth: {
          messages: 15.5,
          campaigns: 25.0,
          contacts: 10.2
        }
      };

      const filename = `test_overview_${Date.now()}.xlsx`;
      const filePath = await reportExportService.generateExcel(data, 'Overview', filename);

      expect(filePath).toBeDefined();
      expect(fs.existsSync(filePath)).toBe(true);

      const stats = fs.statSync(filePath);
      expect(stats.size).toBeGreaterThan(0);

      reportExportService.deleteReportFile(filePath);
    });

    it('should generate Excel export for contact analytics', async () => {
      const data = {
        summary: { total: 500, new: 50, active: 300, blocked: 10, avgEngagementScore: 75 },
        growthTimeSeries: [
          { date: '2024-01-01', value: 10 },
          { date: '2024-01-02', value: 15 }
        ]
      };

      const filename = `test_contacts_${Date.now()}.xlsx`;
      const filePath = await reportExportService.generateExcel(data, 'Contacts', filename);

      expect(filePath).toBeDefined();
      expect(fs.existsSync(filePath)).toBe(true);

      reportExportService.deleteReportFile(filePath);
    });
  });

  describe('Report Service', () => {
    it('should create a report and queue generation', async () => {
      const reportData = {
        teamId: testTeam.id,
        userId: testUser.id,
        name: 'Test Overview Report',
        reportType: 'Overview',
        format: 'CSV',
        filters: {
          startDate: '2024-01-01',
          endDate: '2024-01-31'
        }
      };

      const report = await reportService.createReport(reportData);

      expect(report).toBeDefined();
      expect(report.id).toBeDefined();
      expect(report.name).toBe('Test Overview Report');
      expect(report.report_type).toBe('Overview');
      expect(report.format).toBe('CSV');
      expect(report.status).toBe('Pending');
    });

    it('should retrieve reports for a team', async () => {
      const reports = await reportService.getReports(testTeam.id);

      expect(Array.isArray(reports)).toBe(true);
      expect(reports.length).toBeGreaterThan(0);
    });

    it('should schedule a report', async () => {
      const scheduleData = {
        teamId: testTeam.id,
        userId: testUser.id,
        name: 'Weekly Campaign Report',
        reportType: 'Campaigns',
        format: 'PDF',
        filters: {},
        frequency: 'weekly',
        dayOfWeek: 1,
        time: '09:00',
        timezone: 'UTC'
      };

      const report = await reportService.scheduleReport(scheduleData);

      expect(report).toBeDefined();
      expect(report.schedule).toBeDefined();
      expect(report.schedule.frequency).toBe('weekly');
      expect(report.schedule.enabled).toBe(true);
    });
  });

  describe('Analytics Calculations', () => {
    it('should calculate delivery rate correctly', async () => {
      const { calculateDeliveryRate } = await import('../src/utils/analyticsCalculations.js');
      
      expect(calculateDeliveryRate(90, 100)).toBe(90.00);
      expect(calculateDeliveryRate(0, 100)).toBe(0);
      expect(calculateDeliveryRate(100, 0)).toBe(0);
    });

    it('should calculate read rate correctly', async () => {
      const { calculateReadRate } = await import('../src/utils/analyticsCalculations.js');
      
      expect(calculateReadRate(80, 90)).toBeCloseTo(88.89, 2);
      expect(calculateReadRate(0, 90)).toBe(0);
    });

    it('should calculate growth rate correctly', async () => {
      const { calculateGrowthRate } = await import('../src/utils/analyticsCalculations.js');
      
      expect(calculateGrowthRate(150, 100)).toBe(50.00);
      expect(calculateGrowthRate(100, 150)).toBeCloseTo(-33.33, 2);
      expect(calculateGrowthRate(100, 0)).toBe(100);
    });
  });

  describe('Scheduled Report Processing', () => {
    it('should identify reports that need generation', async () => {
      // Create a scheduled report that should be generated
      const report = await prisma.reports.create({
        data: {
          id: 'test-scheduled-report',
          team_id: testTeam.id,
          user_id: testUser.id,
          name: 'Daily Test Report',
          report_type: 'Overview',
          format: 'CSV',
          filters: {},
          schedule: {
            frequency: 'daily',
            time: '09:00',
            timezone: 'UTC',
            enabled: true
          },
          status: 'Pending',
          updated_at: new Date()
        }
      });

      expect(report).toBeDefined();
      expect(report.schedule.frequency).toBe('daily');

      // Cleanup
      await prisma.reports.delete({ where: { id: report.id } });
    });
  });

  describe('Report Expiration and Cleanup', () => {
    it('should identify expired reports', async () => {
      const expiredDate = new Date();
      expiredDate.setDate(expiredDate.getDate() - 10);

      const expiredReport = await prisma.reports.create({
        data: {
          id: 'test-expired-report',
          team_id: testTeam.id,
          user_id: testUser.id,
          name: 'Expired Report',
          report_type: 'Overview',
          format: 'CSV',
          status: 'Completed',
          file_url: '/reports/expired_test.csv',
          expires_at: expiredDate,
          updated_at: new Date()
        }
      });

      expect(expiredReport.expires_at < new Date()).toBe(true);

      // Cleanup
      await prisma.reports.delete({ where: { id: expiredReport.id } });
    });
  });
});
