/**
 * Report Service
 * Handles report generation, scheduling, and management
 */

import { PrismaClient } from '@prisma/client';
import logger from '../utils/logger.js';
import analyticsController from '../controllers/analyticsController.js';
import reportExportService from './reportExportService.js';
import emailService from './emailService.js';
import { v4 as uuidv4 } from 'uuid';

const prisma = new PrismaClient();

/**
 * Create a new report
 * @param {Object} reportData - Report configuration
 * @returns {Promise<Object>} Created report
 */
async function createReport(reportData) {
  try {
    const report = await prisma.reports.create({
      data: {
        id: uuidv4(),
        team_id: reportData.teamId,
        user_id: reportData.userId,
        name: reportData.name,
        report_type: reportData.reportType,
        format: reportData.format,
        filters: reportData.filters || {},
        schedule: reportData.schedule || null,
        status: 'Pending',
        updated_at: new Date()
      }
    });

    logger.info(`Report created: ${report.id}`, { reportId: report.id, type: report.report_type });
    
    // Queue report generation
    await generateReport(report.id);

    return report;
  } catch (error) {
    logger.error(`Error creating report: ${error.message}`, { error });
    throw error;
  }
}

/**
 * Generate report
 * @param {string} reportId - Report ID
 * @returns {Promise<Object>} Updated report
 */
async function generateReport(reportId) {
  let report;
  
  try {
    // Get report details
    report = await prisma.reports.findUnique({
      where: { id: reportId },
      include: {
        users: true,
        teams: true
      }
    });

    if (!report) {
      throw new Error('Report not found');
    }

    // Update status to Processing
    await prisma.reports.update({
      where: { id: reportId },
      data: { 
        status: 'Processing',
        updated_at: new Date()
      }
    });

    logger.info(`Generating report: ${reportId}`, { type: report.report_type, format: report.format });

    // Fetch analytics data based on report type
    const data = await fetchReportData(report);

    // Generate file based on format
    const filename = `${report.report_type.toLowerCase()}_${Date.now()}.${getFileExtension(report.format)}`;
    let filePath;

    switch (report.format) {
      case 'CSV':
        filePath = await reportExportService.generateCSV(data, report.report_type, filename);
        break;
      case 'PDF':
        filePath = await reportExportService.generatePDF(data, report.report_type, filename, report.filters);
        break;
      case 'Excel':
        filePath = await reportExportService.generateExcel(data, report.report_type, filename);
        break;
      default:
        throw new Error(`Unsupported format: ${report.format}`);
    }

    // Get file size
    const fileSize = reportExportService.getFileSize(filePath);

    // Calculate expiration (7 days from now)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    // Update report with file info
    const updatedReport = await prisma.reports.update({
      where: { id: reportId },
      data: {
        status: 'Completed',
        file_url: `/reports/${filename}`,
        file_size: fileSize,
        generated_at: new Date(),
        expires_at: expiresAt,
        updated_at: new Date()
      }
    });

    logger.info(`Report generated successfully: ${reportId}`, { filePath, fileSize });

    // Send email notification
    await sendReportEmail(updatedReport, report.users);

    return updatedReport;
  } catch (error) {
    logger.error(`Error generating report: ${error.message}`, { error, reportId });

    // Update report status to Failed
    if (report) {
      await prisma.reports.update({
        where: { id: reportId },
        data: {
          status: 'Failed',
          error_message: error.message,
          updated_at: new Date()
        }
      });
    }

    throw error;
  }
}

/**
 * Fetch report data based on report type
 * @param {Object} report - Report object
 * @returns {Promise<Object>} Analytics data
 */
async function fetchReportData(report) {
  const filters = report.filters || {};
  
  // Create mock request object for analytics controller
  const mockReq = {
    user: {
      id: report.user_id,
      teamId: report.team_id
    },
    query: {
      startDate: filters.startDate,
      endDate: filters.endDate,
      accountId: filters.accountId,
      groupBy: filters.groupBy || 'day'
    }
  };

  // Create mock response object to capture data
  let responseData;
  const mockRes = {
    json: (data) => {
      responseData = data.data || data;
    },
    status: () => mockRes
  };

  // Call appropriate analytics controller method
  switch (report.report_type) {
    case 'Overview':
      await analyticsController.getOverview(mockReq, mockRes);
      break;
    case 'Messages':
      await analyticsController.getMessageAnalytics(mockReq, mockRes);
      break;
    case 'Campaigns':
      await analyticsController.getCampaignAnalytics(mockReq, mockRes);
      break;
    case 'Contacts':
      await analyticsController.getContactAnalytics(mockReq, mockRes);
      break;
    case 'Revenue':
      await analyticsController.getRevenueAnalytics(mockReq, mockRes);
      break;
    case 'Chatbots':
      await analyticsController.getChatbotAnalytics(mockReq, mockRes);
      break;
    case 'Flows':
      await analyticsController.getAllFlowsAnalytics(mockReq, mockRes);
      break;
    default:
      throw new Error(`Unsupported report type: ${report.report_type}`);
  }

  return responseData;
}

/**
 * Get file extension for format
 */
function getFileExtension(format) {
  switch (format) {
    case 'CSV':
      return 'csv';
    case 'PDF':
      return 'pdf';
    case 'Excel':
      return 'xlsx';
    default:
      return 'txt';
  }
}

/**
 * Send report email notification
 * @param {Object} report - Report object
 * @param {Object} user - User object
 */
async function sendReportEmail(report, user) {
  try {
    const downloadUrl = `${process.env.APP_URL}${report.file_url}`;
    
    await emailService.sendEmail({
      to: user.email,
      subject: `Your ${report.report_type} Report is Ready`,
      template: 'report-ready',
      context: {
        userName: user.first_name || user.email,
        reportName: report.name,
        reportType: report.report_type,
        format: report.format,
        downloadUrl,
        expiresAt: report.expires_at.toLocaleDateString()
      }
    });

    logger.info(`Report email sent to ${user.email}`, { reportId: report.id });
  } catch (error) {
    logger.error(`Error sending report email: ${error.message}`, { error, reportId: report.id });
    // Don't throw - email failure shouldn't fail report generation
  }
}

/**
 * Get reports for a team
 * @param {string} teamId - Team ID
 * @param {Object} options - Query options
 * @returns {Promise<Array>} Reports
 */
async function getReports(teamId, options = {}) {
  try {
    const { status, reportType, limit = 50, offset = 0 } = options;

    const where = { team_id: teamId };
    
    if (status) {
      where.status = status;
    }
    
    if (reportType) {
      where.report_type = reportType;
    }

    const reports = await prisma.reports.findMany({
      where,
      include: {
        users: {
          select: {
            id: true,
            email: true,
            first_name: true,
            last_name: true
          }
        }
      },
      orderBy: {
        created_at: 'desc'
      },
      take: limit,
      skip: offset
    });

    return reports;
  } catch (error) {
    logger.error(`Error getting reports: ${error.message}`, { error });
    throw error;
  }
}

/**
 * Get report by ID
 * @param {string} reportId - Report ID
 * @param {string} teamId - Team ID (for authorization)
 * @returns {Promise<Object>} Report
 */
async function getReportById(reportId, teamId) {
  try {
    const report = await prisma.reports.findFirst({
      where: {
        id: reportId,
        team_id: teamId
      },
      include: {
        users: {
          select: {
            id: true,
            email: true,
            first_name: true,
            last_name: true
          }
        }
      }
    });

    if (!report) {
      throw new Error('Report not found');
    }

    return report;
  } catch (error) {
    logger.error(`Error getting report: ${error.message}`, { error, reportId });
    throw error;
  }
}

/**
 * Delete report
 * @param {string} reportId - Report ID
 * @param {string} teamId - Team ID (for authorization)
 */
async function deleteReport(reportId, teamId) {
  try {
    const report = await getReportById(reportId, teamId);

    // Delete file if exists
    if (report.file_url) {
      const filename = report.file_url.split('/').pop();
      const filePath = `${reportExportService.REPORTS_DIR}/${filename}`;
      reportExportService.deleteReportFile(filePath);
    }

    // Delete database record
    await prisma.reports.delete({
      where: { id: reportId }
    });

    logger.info(`Report deleted: ${reportId}`);
  } catch (error) {
    logger.error(`Error deleting report: ${error.message}`, { error, reportId });
    throw error;
  }
}

/**
 * Schedule report generation
 * @param {Object} scheduleData - Schedule configuration
 * @returns {Promise<Object>} Created report with schedule
 */
async function scheduleReport(scheduleData) {
  try {
    const report = await prisma.reports.create({
      data: {
        id: uuidv4(),
        team_id: scheduleData.teamId,
        user_id: scheduleData.userId,
        name: scheduleData.name,
        report_type: scheduleData.reportType,
        format: scheduleData.format,
        filters: scheduleData.filters || {},
        schedule: {
          frequency: scheduleData.frequency, // daily, weekly, monthly
          dayOfWeek: scheduleData.dayOfWeek, // for weekly
          dayOfMonth: scheduleData.dayOfMonth, // for monthly
          time: scheduleData.time, // HH:mm format
          timezone: scheduleData.timezone || 'UTC',
          enabled: true
        },
        status: 'Pending',
        updated_at: new Date()
      }
    });

    logger.info(`Report scheduled: ${report.id}`, { 
      reportId: report.id, 
      frequency: scheduleData.frequency 
    });

    return report;
  } catch (error) {
    logger.error(`Error scheduling report: ${error.message}`, { error });
    throw error;
  }
}

/**
 * Process scheduled reports (called by cron job)
 */
async function processScheduledReports() {
  try {
    logger.info('Processing scheduled reports...');

    // Get all reports with schedules
    const scheduledReports = await prisma.reports.findMany({
      where: {
        schedule: {
          not: null
        }
      }
    });

    const now = new Date();
    const reportsToGenerate = [];

    for (const report of scheduledReports) {
      const schedule = report.schedule;
      
      if (!schedule || !schedule.enabled) {
        continue;
      }

      // Check if report should be generated now
      if (shouldGenerateReport(report, now)) {
        reportsToGenerate.push(report);
      }
    }

    logger.info(`Found ${reportsToGenerate.length} scheduled reports to generate`);

    // Generate reports
    for (const report of reportsToGenerate) {
      try {
        // Create new report instance for this scheduled generation
        const newReport = await prisma.reports.create({
          data: {
            id: uuidv4(),
            team_id: report.team_id,
            user_id: report.user_id,
            name: `${report.name} - ${now.toLocaleDateString()}`,
            report_type: report.report_type,
            format: report.format,
            filters: report.filters,
            status: 'Pending',
            updated_at: new Date()
          }
        });

        await generateReport(newReport.id);
      } catch (error) {
        logger.error(`Error generating scheduled report: ${error.message}`, { 
          error, 
          reportId: report.id 
        });
      }
    }

    logger.info('Scheduled reports processing completed');
  } catch (error) {
    logger.error(`Error processing scheduled reports: ${error.message}`, { error });
  }
}

/**
 * Check if report should be generated based on schedule
 */
function shouldGenerateReport(report, now) {
  const schedule = report.schedule;
  const lastGenerated = report.generated_at;

  // If never generated, generate now
  if (!lastGenerated) {
    return true;
  }

  const hoursSinceLastGeneration = (now - new Date(lastGenerated)) / (1000 * 60 * 60);

  switch (schedule.frequency) {
    case 'daily':
      return hoursSinceLastGeneration >= 24;
    case 'weekly':
      return hoursSinceLastGeneration >= 168; // 7 days
    case 'monthly':
      return hoursSinceLastGeneration >= 720; // 30 days
    default:
      return false;
  }
}

/**
 * Clean up expired reports (called by cron job)
 */
async function cleanupExpiredReports() {
  try {
    logger.info('Cleaning up expired reports...');

    const expiredReports = await prisma.reports.findMany({
      where: {
        expires_at: {
          lt: new Date()
        },
        status: 'Completed'
      }
    });

    logger.info(`Found ${expiredReports.length} expired reports to clean up`);

    for (const report of expiredReports) {
      try {
        // Delete file
        if (report.file_url) {
          const filename = report.file_url.split('/').pop();
          const filePath = `${reportExportService.REPORTS_DIR}/${filename}`;
          reportExportService.deleteReportFile(filePath);
        }

        // Update status to Expired
        await prisma.reports.update({
          where: { id: report.id },
          data: {
            status: 'Expired',
            file_url: null,
            updated_at: new Date()
          }
        });

        logger.info(`Expired report cleaned up: ${report.id}`);
      } catch (error) {
        logger.error(`Error cleaning up expired report: ${error.message}`, { 
          error, 
          reportId: report.id 
        });
      }
    }

    logger.info('Expired reports cleanup completed');
  } catch (error) {
    logger.error(`Error cleaning up expired reports: ${error.message}`, { error });
  }
}

export default {
  createReport,
  generateReport,
  getReports,
  getReportById,
  deleteReport,
  scheduleReport,
  processScheduledReports,
  cleanupExpiredReports
};
