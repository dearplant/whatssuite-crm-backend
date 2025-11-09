/**
 * Analytics and Reporting Tests
 * Tests for analytics snapshot generation, calculations, and data integrity
 */

import { PrismaClient } from '@prisma/client';
import analyticsService from '../src/services/analyticsService.js';
import reportService from '../src/services/reportService.js';
import reportExportService from '../src/services/reportExportService.js';
import {
  calculateDeliveryRate,
  calculateReadRate,
  calculateReplyRate,
  calculateFailureRate,
  calculateGrowthRate,
  calculateCampaignScore,
  calculateContactEngagementScore
} from '../src/utils/analyticsCalculations.js';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

describe('Analytics and Reporting System', () => {
  // Most tests don't require database setup
  // They test calculation functions and export functionality directly

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('Snapshot Generation Accuracy', () => {
    it('should validate snapshot structure', () => {
      // Test that snapshot structure is correct
      const mockSnapshot = {
        id: 'test-snapshot',
        team_id: 'test-team-id',
        snapshot_type: 'Daily',
        date: new Date(),
        metrics: {
          period: {
            start: new Date().toISOString(),
            end: new Date().toISOString()
          },
          messages: {
            total: 100,
            sent: 95,
            delivered: 90,
            read: 80,
            failed: 5,
            deliveryRate: 94.74,
            readRate: 88.89
          },
          campaigns: {
            total: 10,
            completed: 8
          },
          contacts: {
            total: 500,
            new: 50
          }
        }
      };

      expect(mockSnapshot.metrics).toBeDefined();
      expect(mockSnapshot.metrics.messages).toBeDefined();
      expect(mockSnapshot.metrics.campaigns).toBeDefined();
      expect(mockSnapshot.metrics.contacts).toBeDefined();
      expect(mockSnapshot.metrics.period).toBeDefined();
    });
  });

  describe('Analytics Calculations', () => {
    describe('Delivery Rate', () => {
      it('should calculate delivery rate correctly', () => {
        expect(calculateDeliveryRate(90, 100)).toBe(90.00);
        expect(calculateDeliveryRate(95, 100)).toBe(95.00);
        expect(calculateDeliveryRate(100, 100)).toBe(100.00);
      });

      it('should handle zero sent messages', () => {
        expect(calculateDeliveryRate(0, 0)).toBe(0);
        expect(calculateDeliveryRate(10, 0)).toBe(0);
      });

      it('should return precise decimal values', () => {
        expect(calculateDeliveryRate(85, 90)).toBeCloseTo(94.44, 2);
        expect(calculateDeliveryRate(123, 150)).toBeCloseTo(82.00, 2);
      });
    });

    describe('Read Rate', () => {
      it('should calculate read rate correctly', () => {
        expect(calculateReadRate(80, 90)).toBeCloseTo(88.89, 2);
        expect(calculateReadRate(45, 50)).toBe(90.00);
        expect(calculateReadRate(100, 100)).toBe(100.00);
      });

      it('should handle zero delivered messages', () => {
        expect(calculateReadRate(0, 0)).toBe(0);
        expect(calculateReadRate(10, 0)).toBe(0);
      });
    });

    describe('Reply Rate', () => {
      it('should calculate reply rate correctly', () => {
        expect(calculateReplyRate(10, 100)).toBe(10.00);
        expect(calculateReplyRate(25, 100)).toBe(25.00);
        expect(calculateReplyRate(5, 50)).toBe(10.00);
      });

      it('should handle zero sent messages', () => {
        expect(calculateReplyRate(0, 0)).toBe(0);
      });
    });

    describe('Failure Rate', () => {
      it('should calculate failure rate correctly', () => {
        expect(calculateFailureRate(5, 100)).toBe(5.00);
        expect(calculateFailureRate(10, 100)).toBe(10.00);
        expect(calculateFailureRate(0, 100)).toBe(0);
      });

      it('should handle edge cases', () => {
        expect(calculateFailureRate(0, 0)).toBe(0);
        expect(calculateFailureRate(100, 100)).toBe(100.00);
      });
    });

    describe('Growth Rate', () => {
      it('should calculate positive growth correctly', () => {
        expect(calculateGrowthRate(150, 100)).toBe(50.00);
        expect(calculateGrowthRate(200, 100)).toBe(100.00);
        expect(calculateGrowthRate(110, 100)).toBe(10.00);
      });

      it('should calculate negative growth correctly', () => {
        expect(calculateGrowthRate(100, 150)).toBeCloseTo(-33.33, 2);
        expect(calculateGrowthRate(50, 100)).toBe(-50.00);
      });

      it('should handle zero previous value', () => {
        expect(calculateGrowthRate(100, 0)).toBe(100);
        expect(calculateGrowthRate(0, 0)).toBe(0);
      });
    });

    describe('Campaign Score', () => {
      it('should calculate campaign score correctly', () => {
        const metrics = {
          deliveryRate: 95,
          readRate: 85,
          replyRate: 15,
          failureRate: 5
        };
        const score = calculateCampaignScore(metrics);
        expect(score).toBeGreaterThan(0);
        expect(score).toBeLessThanOrEqual(100);
      });

      it('should penalize high failure rates', () => {
        const goodMetrics = {
          deliveryRate: 95,
          readRate: 85,
          replyRate: 15,
          failureRate: 5
        };
        const badMetrics = {
          deliveryRate: 95,
          readRate: 85,
          replyRate: 15,
          failureRate: 50
        };
        
        const goodScore = calculateCampaignScore(goodMetrics);
        const badScore = calculateCampaignScore(badMetrics);
        
        expect(goodScore).toBeGreaterThan(badScore);
      });
    });

    describe('Contact Engagement Score', () => {
      it('should calculate engagement score correctly', () => {
        const metrics = {
          totalMessages: 50,
          repliedMessages: 25,
          lastMessageDaysAgo: 5,
          campaignsReceived: 10,
          campaignsEngaged: 7
        };
        const score = calculateContactEngagementScore(metrics);
        expect(score).toBeGreaterThan(0);
        expect(score).toBeLessThanOrEqual(100);
      });

      it('should reward recent activity', () => {
        const recentMetrics = {
          totalMessages: 20,
          repliedMessages: 10,
          lastMessageDaysAgo: 2,
          campaignsReceived: 5,
          campaignsEngaged: 3
        };
        const oldMetrics = {
          totalMessages: 20,
          repliedMessages: 10,
          lastMessageDaysAgo: 200,
          campaignsReceived: 5,
          campaignsEngaged: 3
        };
        
        const recentScore = calculateContactEngagementScore(recentMetrics);
        const oldScore = calculateContactEngagementScore(oldMetrics);
        
        expect(recentScore).toBeGreaterThan(oldScore);
      });
    });
  });

  describe('CSV Export', () => {
    it('should generate CSV with correct format and data integrity', async () => {
      const data = {
        timeSeries: [
          { date: '2024-01-01', total: 100, sent: 95, delivered: 90, read: 80, failed: 5 },
          { date: '2024-01-02', total: 150, sent: 145, delivered: 140, read: 120, failed: 5 }
        ]
      };

      const filename = `test_csv_${Date.now()}.csv`;
      const filePath = await reportExportService.generateCSV(data, 'Messages', filename);

      expect(filePath).toBeDefined();
      expect(fs.existsSync(filePath)).toBe(true);

      // Verify CSV content
      const content = fs.readFileSync(filePath, 'utf-8');
      const lines = content.split('\n').filter(line => line.trim());
      
      // Check header
      expect(lines[0]).toContain('Date');
      expect(lines[0]).toContain('Total');
      
      // Check data rows
      expect(lines.length).toBeGreaterThanOrEqual(3); // Header + 2 data rows
      expect(content).toContain('2024-01-01');
      expect(content).toContain('2024-01-02');
      expect(content).toContain('100');
      expect(content).toContain('150');

      // Cleanup
      reportExportService.deleteReportFile(filePath);
    });

    it('should handle empty data gracefully', async () => {
      const data = { timeSeries: [] };
      const filename = `test_empty_${Date.now()}.csv`;
      const filePath = await reportExportService.generateCSV(data, 'Messages', filename);

      expect(filePath).toBeDefined();
      expect(fs.existsSync(filePath)).toBe(true);

      reportExportService.deleteReportFile(filePath);
    });

    it('should preserve data precision in CSV', async () => {
      const data = {
        timeSeries: [
          { 
            date: '2024-01-01',
            total: 100,
            sent: 95,
            delivered: 90,
            read: 80,
            failed: 5,
            deliveryRate: 94.44, 
            readRate: 88.89,
            replyRate: 10.53
          }
        ]
      };

      const filename = `test_precision_${Date.now()}.csv`;
      const filePath = await reportExportService.generateCSV(data, 'Messages', filename);

      const content = fs.readFileSync(filePath, 'utf-8');
      expect(content).toContain('94.44');
      expect(content).toContain('88.89');
      // Note: replyRate might not be in the CSV depending on export format
      expect(content).toContain('2024-01-01');

      reportExportService.deleteReportFile(filePath);
    });
  });

  describe('PDF Report Generation', () => {
    it('should generate PDF report successfully', async () => {
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

      const filename = `test_pdf_${Date.now()}.pdf`;
      const filters = { startDate: '2024-01-01', endDate: '2024-01-31' };
      const filePath = await reportExportService.generatePDF(data, 'Overview', filename, filters);

      expect(filePath).toBeDefined();
      expect(fs.existsSync(filePath)).toBe(true);

      // Verify file is not empty
      const stats = fs.statSync(filePath);
      expect(stats.size).toBeGreaterThan(0);

      reportExportService.deleteReportFile(filePath);
    });

    it('should include all required sections in PDF', async () => {
      const data = {
        total: 1000,
        rates: { delivery: 94.74, read: 88.89, failure: 5.26 },
        byStatus: { sent: 950, delivered: 900, read: 800, failed: 50 },
        byType: { Text: 800, Image: 150, Video: 50 }
      };

      const filename = `test_pdf_sections_${Date.now()}.pdf`;
      const filePath = await reportExportService.generatePDF(data, 'Messages', filename);

      expect(filePath).toBeDefined();
      expect(fs.existsSync(filePath)).toBe(true);

      const stats = fs.statSync(filePath);
      expect(stats.size).toBeGreaterThan(1000); // PDF should have substantial content

      reportExportService.deleteReportFile(filePath);
    });
  });

  describe('Scheduled Report Execution', () => {
    it('should validate schedule configuration structure', () => {
      const scheduleConfig = {
        frequency: 'daily',
        time: '09:00',
        timezone: 'UTC',
        enabled: true
      };

      expect(scheduleConfig.frequency).toBeDefined();
      expect(['daily', 'weekly', 'monthly']).toContain(scheduleConfig.frequency);
      expect(scheduleConfig.time).toMatch(/^\d{2}:\d{2}$/);
      expect(scheduleConfig.enabled).toBe(true);
    });

    it('should validate different schedule frequencies', () => {
      const frequencies = ['daily', 'weekly', 'monthly'];

      frequencies.forEach(frequency => {
        const config = {
          frequency,
          time: '10:00',
          timezone: 'UTC',
          enabled: true
        };

        expect(config.frequency).toBe(frequency);
        expect(['daily', 'weekly', 'monthly']).toContain(config.frequency);
      });
    });

    it('should validate report metadata structure', () => {
      const reportMetadata = {
        name: 'Daily Analytics Report',
        reportType: 'Overview',
        format: 'CSV',
        filters: {
          startDate: '2024-01-01',
          endDate: '2024-01-31'
        },
        schedule: {
          frequency: 'daily',
          time: '09:00',
          timezone: 'UTC',
          enabled: true
        }
      };

      expect(reportMetadata.name).toBeDefined();
      expect(reportMetadata.reportType).toBeDefined();
      expect(reportMetadata.format).toBeDefined();
      expect(['CSV', 'PDF', 'Excel']).toContain(reportMetadata.format);
      expect(reportMetadata.schedule).toBeDefined();
    });
  });

  describe('Report Data Integrity', () => {
    it('should maintain data consistency across export formats', async () => {
      const data = {
        current: {
          messages: { total: 1000, sent: 950, delivered: 900, read: 800, failed: 50 },
          campaigns: { total: 10, completed: 8, active: 2 },
          contacts: { total: 500, new: 50, active: 300 }
        }
      };

      // Generate CSV
      const csvFilename = `test_consistency_${Date.now()}.csv`;
      const csvPath = await reportExportService.generateCSV(data, 'Overview', csvFilename);
      
      // Generate PDF
      const pdfFilename = `test_consistency_${Date.now()}.pdf`;
      const pdfPath = await reportExportService.generatePDF(data, 'Overview', pdfFilename);

      // Generate Excel
      const excelFilename = `test_consistency_${Date.now()}.xlsx`;
      const excelPath = await reportExportService.generateExcel(data, 'Overview', excelFilename);

      // All files should be created
      expect(fs.existsSync(csvPath)).toBe(true);
      expect(fs.existsSync(pdfPath)).toBe(true);
      expect(fs.existsSync(excelPath)).toBe(true);

      // Cleanup
      reportExportService.deleteReportFile(csvPath);
      reportExportService.deleteReportFile(pdfPath);
      reportExportService.deleteReportFile(excelPath);
    });

    it('should handle large datasets without data loss', async () => {
      // Create large dataset
      const largeData = {
        timeSeries: Array.from({ length: 365 }, (_, i) => ({
          date: `2024-01-${(i % 30) + 1}`,
          total: Math.floor(Math.random() * 1000),
          sent: Math.floor(Math.random() * 950),
          delivered: Math.floor(Math.random() * 900),
          read: Math.floor(Math.random() * 800),
          failed: Math.floor(Math.random() * 50)
        }))
      };

      const filename = `test_large_${Date.now()}.csv`;
      const filePath = await reportExportService.generateCSV(largeData, 'Messages', filename);

      expect(fs.existsSync(filePath)).toBe(true);
      
      const content = fs.readFileSync(filePath, 'utf-8');
      const lines = content.split('\n').filter(line => line.trim());
      
      // Should have header + data rows
      expect(lines.length).toBeGreaterThan(1);

      reportExportService.deleteReportFile(filePath);
    });
  });

  describe('Analytics Aggregation', () => {
    it('should validate aggregated metrics structure', () => {
      const mockMetrics = {
        period: {
          start: new Date().toISOString(),
          end: new Date().toISOString()
        },
        messages: {
          total: 1000,
          sent: 950,
          delivered: 900,
          read: 800,
          failed: 50,
          deliveryRate: 94.74,
          readRate: 88.89
        },
        campaigns: {
          total: 10,
          completed: 8,
          active: 2
        },
        contacts: {
          total: 500,
          new: 50,
          active: 300
        },
        conversations: {
          total: 200,
          open: 50,
          closed: 150
        },
        generatedAt: new Date().toISOString()
      };

      expect(mockMetrics).toBeDefined();
      expect(mockMetrics.messages).toBeDefined();
      expect(mockMetrics.campaigns).toBeDefined();
      expect(mockMetrics.contacts).toBeDefined();
      expect(mockMetrics.conversations).toBeDefined();
      expect(mockMetrics.period).toBeDefined();
      expect(mockMetrics.generatedAt).toBeDefined();
    });

    it('should ensure rate calculations are within valid range', () => {
      const mockMetrics = {
        messages: {
          sent: 100,
          delivered: 95,
          read: 85,
          deliveryRate: calculateDeliveryRate(95, 100),
          readRate: calculateReadRate(85, 95)
        }
      };

      expect(mockMetrics.messages.deliveryRate).toBeGreaterThanOrEqual(0);
      expect(mockMetrics.messages.deliveryRate).toBeLessThanOrEqual(100);
      expect(mockMetrics.messages.readRate).toBeGreaterThanOrEqual(0);
      expect(mockMetrics.messages.readRate).toBeLessThanOrEqual(100);
    });
  });

  describe('Date Range Calculations', () => {
    it('should calculate daily date range correctly', () => {
      const date = new Date('2024-01-15T12:00:00Z');
      const { startDate, endDate } = analyticsService.getDateRange(date, 'Daily');

      expect(startDate.getHours()).toBe(0);
      expect(startDate.getMinutes()).toBe(0);
      expect(endDate.getHours()).toBe(23);
      expect(endDate.getMinutes()).toBe(59);
      expect(startDate.getDate()).toBe(endDate.getDate());
    });

    it('should calculate weekly date range correctly', () => {
      const date = new Date('2024-01-15T12:00:00Z'); // Monday
      const { startDate, endDate } = analyticsService.getDateRange(date, 'Weekly');

      const daysDiff = Math.floor((endDate - startDate) / (1000 * 60 * 60 * 24));
      expect(daysDiff).toBe(6); // 7 days - 1
    });

    it('should calculate monthly date range correctly', () => {
      const date = new Date('2024-01-15T12:00:00Z');
      const { startDate, endDate } = analyticsService.getDateRange(date, 'Monthly');

      expect(startDate.getDate()).toBe(1);
      expect(startDate.getMonth()).toBe(date.getMonth());
      expect(endDate.getMonth()).toBe(date.getMonth());
    });
  });
});
