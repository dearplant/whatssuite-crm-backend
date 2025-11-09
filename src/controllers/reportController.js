/**
 * Report Controller
 * Handles report generation and management HTTP requests
 */

import reportService from '../services/reportService.js';
import reportExportService from '../services/reportExportService.js';
import logger from '../utils/logger.js';
import path from 'path';
import fs from 'fs';

/**
 * Schedule a report
 * POST /api/v1/analytics/reports/schedule
 */
export async function scheduleReport(req, res) {
  try {
    const { name, reportType, format, filters, frequency, dayOfWeek, dayOfMonth, time, timezone } = req.body;
    const teamId = req.user.teamId;
    const userId = req.user.id;

    const report = await reportService.scheduleReport({
      teamId,
      userId,
      name,
      reportType,
      format,
      filters,
      frequency,
      dayOfWeek,
      dayOfMonth,
      time,
      timezone
    });

    res.status(201).json({
      success: true,
      data: report,
      message: 'Report scheduled successfully'
    });
  } catch (error) {
    logger.error('Error in scheduleReport:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

/**
 * Create and generate a report
 * POST /api/v1/analytics/reports
 */
export async function createReport(req, res) {
  try {
    const { name, reportType, format, filters } = req.body;
    const teamId = req.user.teamId;
    const userId = req.user.id;

    const report = await reportService.createReport({
      teamId,
      userId,
      name,
      reportType,
      format,
      filters
    });

    res.status(202).json({
      success: true,
      data: report,
      message: 'Report generation started. You will receive an email when it is ready.'
    });
  } catch (error) {
    logger.error('Error in createReport:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

/**
 * Get all reports for a team
 * GET /api/v1/analytics/reports
 */
export async function getReports(req, res) {
  try {
    const teamId = req.user.teamId;
    const { status, reportType, limit, offset } = req.query;

    const reports = await reportService.getReports(teamId, {
      status,
      reportType,
      limit: limit ? parseInt(limit) : 50,
      offset: offset ? parseInt(offset) : 0
    });

    res.json({
      success: true,
      data: reports,
      count: reports.length
    });
  } catch (error) {
    logger.error('Error in getReports:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

/**
 * Get a specific report
 * GET /api/v1/analytics/reports/:id
 */
export async function getReport(req, res) {
  try {
    const { id } = req.params;
    const teamId = req.user.teamId;

    const report = await reportService.getReportById(id, teamId);

    res.json({
      success: true,
      data: report
    });
  } catch (error) {
    logger.error('Error in getReport:', error);
    const statusCode = error.message === 'Report not found' ? 404 : 500;
    res.status(statusCode).json({
      success: false,
      error: error.message
    });
  }
}

/**
 * Download a report file
 * GET /api/v1/analytics/reports/:id/download
 */
export async function downloadReport(req, res) {
  try {
    const { id } = req.params;
    const teamId = req.user.teamId;

    const report = await reportService.getReportById(id, teamId);

    if (report.status !== 'Completed') {
      return res.status(400).json({
        success: false,
        error: `Report is not ready for download. Current status: ${report.status}`
      });
    }

    if (!report.file_url) {
      return res.status(404).json({
        success: false,
        error: 'Report file not found'
      });
    }

    // Check if file has expired
    if (report.expires_at && new Date(report.expires_at) < new Date()) {
      return res.status(410).json({
        success: false,
        error: 'Report file has expired'
      });
    }

    const filename = report.file_url.split('/').pop();
    const filePath = path.join(reportExportService.REPORTS_DIR, filename);

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        error: 'Report file not found on server'
      });
    }

    // Set appropriate headers
    const contentType = getContentType(report.format);
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', report.file_size);

    // Stream file to response
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);

    fileStream.on('error', (error) => {
      logger.error('Error streaming report file:', error);
      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          error: 'Error downloading report file'
        });
      }
    });
  } catch (error) {
    logger.error('Error in downloadReport:', error);
    const statusCode = error.message === 'Report not found' ? 404 : 500;
    res.status(statusCode).json({
      success: false,
      error: error.message
    });
  }
}

/**
 * Delete a report
 * DELETE /api/v1/analytics/reports/:id
 */
export async function deleteReport(req, res) {
  try {
    const { id } = req.params;
    const teamId = req.user.teamId;

    await reportService.deleteReport(id, teamId);

    res.json({
      success: true,
      message: 'Report deleted successfully'
    });
  } catch (error) {
    logger.error('Error in deleteReport:', error);
    const statusCode = error.message === 'Report not found' ? 404 : 500;
    res.status(statusCode).json({
      success: false,
      error: error.message
    });
  }
}

/**
 * Get content type for format
 */
function getContentType(format) {
  switch (format) {
    case 'CSV':
      return 'text/csv';
    case 'PDF':
      return 'application/pdf';
    case 'Excel':
      return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    default:
      return 'application/octet-stream';
  }
}

export default {
  scheduleReport,
  createReport,
  getReports,
  getReport,
  downloadReport,
  deleteReport
};
