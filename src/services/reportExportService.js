/**
 * Report Export Service
 * Handles CSV, PDF, and Excel report generation
 */

import { PrismaClient } from '@prisma/client';
import PDFDocument from 'pdfkit';
import ExcelJS from 'exceljs';
import { createObjectCsvWriter } from 'csv-writer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import logger from '../utils/logger.js';
import analyticsService from './analyticsService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const prisma = new PrismaClient();

// Report storage directory
const REPORTS_DIR = path.join(__dirname, '../../reports');

// Ensure reports directory exists
if (!fs.existsSync(REPORTS_DIR)) {
  fs.mkdirSync(REPORTS_DIR, { recursive: true });
}

/**
 * Generate CSV export for analytics data
 * @param {Object} data - Analytics data to export
 * @param {string} reportType - Type of report
 * @param {string} filename - Output filename
 * @returns {Promise<string>} File path
 */
async function generateCSV(data, reportType, filename) {
  try {
    const filePath = path.join(REPORTS_DIR, filename);
    
    let records = [];
    let headers = [];

    switch (reportType) {
      case 'Messages':
        headers = [
          { id: 'date', title: 'Date' },
          { id: 'total', title: 'Total Messages' },
          { id: 'sent', title: 'Sent' },
          { id: 'delivered', title: 'Delivered' },
          { id: 'read', title: 'Read' },
          { id: 'failed', title: 'Failed' },
          { id: 'deliveryRate', title: 'Delivery Rate (%)' },
          { id: 'readRate', title: 'Read Rate (%)' }
        ];
        records = data.timeSeries || [];
        break;

      case 'Campaigns':
        headers = [
          { id: 'name', title: 'Campaign Name' },
          { id: 'recipients', title: 'Recipients' },
          { id: 'sent', title: 'Sent' },
          { id: 'delivered', title: 'Delivered' },
          { id: 'read', title: 'Read' },
          { id: 'replied', title: 'Replied' },
          { id: 'deliveryRate', title: 'Delivery Rate (%)' },
          { id: 'readRate', title: 'Read Rate (%)' },
          { id: 'replyRate', title: 'Reply Rate (%)' }
        ];
        records = data.topCampaigns || [];
        break;

      case 'Contacts':
        headers = [
          { id: 'date', title: 'Date' },
          { id: 'value', title: 'New Contacts' }
        ];
        records = data.growthTimeSeries || [];
        break;

      case 'Revenue':
        headers = [
          { id: 'date', title: 'Date' },
          { id: 'value', title: 'Revenue' }
        ];
        records = data.revenueTimeSeries || [];
        break;

      case 'Overview':
        headers = [
          { id: 'metric', title: 'Metric' },
          { id: 'value', title: 'Value' }
        ];
        records = [
          { metric: 'Total Messages', value: data.current?.messages?.total || 0 },
          { metric: 'Messages Sent', value: data.current?.messages?.sent || 0 },
          { metric: 'Messages Delivered', value: data.current?.messages?.delivered || 0 },
          { metric: 'Messages Read', value: data.current?.messages?.read || 0 },
          { metric: 'Total Campaigns', value: data.current?.campaigns?.total || 0 },
          { metric: 'Total Contacts', value: data.current?.contacts?.total || 0 },
          { metric: 'New Contacts', value: data.current?.contacts?.new || 0 }
        ];
        break;

      default:
        throw new Error(`Unsupported report type for CSV: ${reportType}`);
    }

    const csvWriter = createObjectCsvWriter({
      path: filePath,
      header: headers
    });

    await csvWriter.writeRecords(records);
    
    logger.info(`CSV report generated: ${filePath}`);
    return filePath;
  } catch (error) {
    logger.error(`Error generating CSV report: ${error.message}`, { error });
    throw error;
  }
}

/**
 * Generate PDF report with charts
 * @param {Object} data - Analytics data
 * @param {string} reportType - Type of report
 * @param {string} filename - Output filename
 * @param {Object} filters - Report filters
 * @returns {Promise<string>} File path
 */
async function generatePDF(data, reportType, filename, filters = {}) {
  try {
    const filePath = path.join(REPORTS_DIR, filename);
    const doc = new PDFDocument({ margin: 50 });
    const stream = fs.createWriteStream(filePath);

    doc.pipe(stream);

    // Header
    doc.fontSize(20).text('Analytics Report', { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).text(`Report Type: ${reportType}`, { align: 'center' });
    doc.text(`Generated: ${new Date().toLocaleString()}`, { align: 'center' });
    
    if (filters.startDate && filters.endDate) {
      doc.text(`Period: ${new Date(filters.startDate).toLocaleDateString()} - ${new Date(filters.endDate).toLocaleDateString()}`, { align: 'center' });
    }
    
    doc.moveDown(2);

    // Content based on report type
    switch (reportType) {
      case 'Overview':
        generateOverviewPDF(doc, data);
        break;
      case 'Messages':
        generateMessagesPDF(doc, data);
        break;
      case 'Campaigns':
        generateCampaignsPDF(doc, data);
        break;
      case 'Contacts':
        generateContactsPDF(doc, data);
        break;
      case 'Revenue':
        generateRevenuePDF(doc, data);
        break;
      case 'Chatbots':
        generateChatbotsPDF(doc, data);
        break;
      default:
        doc.fontSize(14).text(`Report data for ${reportType}`);
        doc.text(JSON.stringify(data, null, 2));
    }

    // Footer
    doc.fontSize(10).text(
      `Page ${doc.bufferedPageRange().count}`,
      50,
      doc.page.height - 50,
      { align: 'center' }
    );

    doc.end();

    return new Promise((resolve, reject) => {
      stream.on('finish', () => {
        logger.info(`PDF report generated: ${filePath}`);
        resolve(filePath);
      });
      stream.on('error', reject);
    });
  } catch (error) {
    logger.error(`Error generating PDF report: ${error.message}`, { error });
    throw error;
  }
}

/**
 * Generate Overview section in PDF
 */
function generateOverviewPDF(doc, data) {
  doc.fontSize(16).text('Overview Summary', { underline: true });
  doc.moveDown();

  const current = data.current || {};
  const growth = data.growth || {};

  // Messages Section
  doc.fontSize(14).text('Messages', { underline: true });
  doc.fontSize(11);
  doc.text(`Total: ${current.messages?.total || 0} (${growth.messages >= 0 ? '+' : ''}${growth.messages || 0}%)`);
  doc.text(`Sent: ${current.messages?.sent || 0}`);
  doc.text(`Delivered: ${current.messages?.delivered || 0}`);
  doc.text(`Read: ${current.messages?.read || 0}`);
  doc.text(`Failed: ${current.messages?.failed || 0}`);
  doc.moveDown();

  // Campaigns Section
  doc.fontSize(14).text('Campaigns', { underline: true });
  doc.fontSize(11);
  doc.text(`Total: ${current.campaigns?.total || 0} (${growth.campaigns >= 0 ? '+' : ''}${growth.campaigns || 0}%)`);
  doc.text(`Completed: ${current.campaigns?.completed || 0}`);
  doc.text(`Active: ${current.campaigns?.active || 0}`);
  doc.moveDown();

  // Contacts Section
  doc.fontSize(14).text('Contacts', { underline: true });
  doc.fontSize(11);
  doc.text(`Total: ${current.contacts?.total || 0}`);
  doc.text(`New: ${current.contacts?.new || 0} (${growth.contacts >= 0 ? '+' : ''}${growth.contacts || 0}%)`);
  doc.text(`Active: ${current.contacts?.active || 0}`);
  doc.moveDown();
}

/**
 * Generate Messages section in PDF
 */
function generateMessagesPDF(doc, data) {
  doc.fontSize(16).text('Message Analytics', { underline: true });
  doc.moveDown();

  doc.fontSize(14).text('Summary', { underline: true });
  doc.fontSize(11);
  doc.text(`Total Messages: ${data.total || 0}`);
  doc.text(`Delivery Rate: ${data.rates?.delivery || 0}%`);
  doc.text(`Read Rate: ${data.rates?.read || 0}%`);
  doc.text(`Failure Rate: ${data.rates?.failure || 0}%`);
  doc.moveDown();

  // By Status
  if (data.byStatus) {
    doc.fontSize(14).text('By Status', { underline: true });
    doc.fontSize(11);
    Object.entries(data.byStatus).forEach(([status, count]) => {
      doc.text(`${status}: ${count}`);
    });
    doc.moveDown();
  }

  // By Type
  if (data.byType) {
    doc.fontSize(14).text('By Type', { underline: true });
    doc.fontSize(11);
    Object.entries(data.byType).forEach(([type, count]) => {
      doc.text(`${type}: ${count}`);
    });
    doc.moveDown();
  }
}

/**
 * Generate Campaigns section in PDF
 */
function generateCampaignsPDF(doc, data) {
  doc.fontSize(16).text('Campaign Analytics', { underline: true });
  doc.moveDown();

  doc.fontSize(14).text('Summary', { underline: true });
  doc.fontSize(11);
  doc.text(`Total Campaigns: ${data.summary?.total || 0}`);
  doc.text(`Total Recipients: ${data.summary?.totalRecipients || 0}`);
  doc.text(`Messages Sent: ${data.summary?.totalSent || 0}`);
  doc.text(`Average Delivery Rate: ${data.rates?.avgDelivery || 0}%`);
  doc.text(`Average Read Rate: ${data.rates?.avgRead || 0}%`);
  doc.text(`Average Reply Rate: ${data.rates?.avgReply || 0}%`);
  doc.moveDown();

  // Top Campaigns
  if (data.topCampaigns && data.topCampaigns.length > 0) {
    doc.fontSize(14).text('Top Performing Campaigns', { underline: true });
    doc.fontSize(10);
    
    data.topCampaigns.slice(0, 10).forEach((campaign, index) => {
      doc.text(`${index + 1}. ${campaign.name}`);
      doc.text(`   Recipients: ${campaign.recipients}, Delivery: ${campaign.deliveryRate}%, Read: ${campaign.readRate}%`);
    });
  }
}

/**
 * Generate Contacts section in PDF
 */
function generateContactsPDF(doc, data) {
  doc.fontSize(16).text('Contact Analytics', { underline: true });
  doc.moveDown();

  doc.fontSize(14).text('Summary', { underline: true });
  doc.fontSize(11);
  doc.text(`Total Contacts: ${data.summary?.total || 0}`);
  doc.text(`New Contacts: ${data.summary?.new || 0}`);
  doc.text(`Active Contacts: ${data.summary?.active || 0}`);
  doc.text(`Blocked Contacts: ${data.summary?.blocked || 0}`);
  doc.text(`Avg Engagement Score: ${data.summary?.avgEngagementScore || 0}`);
  doc.moveDown();

  // By Source
  if (data.bySource) {
    doc.fontSize(14).text('By Source', { underline: true });
    doc.fontSize(11);
    Object.entries(data.bySource).forEach(([source, count]) => {
      doc.text(`${source}: ${count}`);
    });
  }
}

/**
 * Generate Revenue section in PDF
 */
function generateRevenuePDF(doc, data) {
  doc.fontSize(16).text('Revenue Analytics', { underline: true });
  doc.moveDown();

  doc.fontSize(14).text('Orders', { underline: true });
  doc.fontSize(11);
  doc.text(`Total Orders: ${data.orders?.total || 0}`);
  doc.text(`Total Revenue: $${data.orders?.totalRevenue || 0}`);
  doc.text(`Average Order Value: $${data.orders?.avgOrderValue || 0}`);
  doc.moveDown();

  doc.fontSize(14).text('Abandoned Carts', { underline: true });
  doc.fontSize(11);
  doc.text(`Total Abandoned: ${data.abandonedCarts?.total || 0}`);
  doc.text(`Recovered: ${data.abandonedCarts?.recovered || 0}`);
  doc.text(`Recovery Rate: ${data.abandonedCarts?.recoveryRate || 0}%`);
  doc.text(`Total Value: $${data.abandonedCarts?.totalValue || 0}`);
}

/**
 * Generate Chatbots section in PDF
 */
function generateChatbotsPDF(doc, data) {
  doc.fontSize(16).text('Chatbot Analytics', { underline: true });
  doc.moveDown();

  doc.fontSize(14).text('Summary', { underline: true });
  doc.fontSize(11);
  doc.text(`Total Conversations: ${data.summary?.totalConversations || 0}`);
  doc.text(`Total Messages: ${data.summary?.totalMessages || 0}`);
  doc.text(`Avg Response Time: ${data.summary?.avgResponseTime || 0}ms`);
  doc.text(`Avg Satisfaction: ${data.summary?.avgSatisfactionScore || 0}`);
  doc.text(`Handoff Rate: ${data.rates?.handoff || 0}%`);
  doc.text(`Completion Rate: ${data.rates?.completion || 0}%`);
}

/**
 * Generate Excel export
 * @param {Object} data - Analytics data
 * @param {string} reportType - Type of report
 * @param {string} filename - Output filename
 * @returns {Promise<string>} File path
 */
async function generateExcel(data, reportType, filename) {
  try {
    const filePath = path.join(REPORTS_DIR, filename);
    const workbook = new ExcelJS.Workbook();
    
    workbook.creator = 'WhatsApp CRM';
    workbook.created = new Date();

    switch (reportType) {
      case 'Overview':
        await generateOverviewExcel(workbook, data);
        break;
      case 'Messages':
        await generateMessagesExcel(workbook, data);
        break;
      case 'Campaigns':
        await generateCampaignsExcel(workbook, data);
        break;
      case 'Contacts':
        await generateContactsExcel(workbook, data);
        break;
      case 'Revenue':
        await generateRevenueExcel(workbook, data);
        break;
      case 'Chatbots':
        await generateChatbotsExcel(workbook, data);
        break;
      default:
        const sheet = workbook.addWorksheet('Data');
        sheet.addRow(['Report Type', reportType]);
        sheet.addRow(['Generated', new Date().toISOString()]);
    }

    await workbook.xlsx.writeFile(filePath);
    
    logger.info(`Excel report generated: ${filePath}`);
    return filePath;
  } catch (error) {
    logger.error(`Error generating Excel report: ${error.message}`, { error });
    throw error;
  }
}

/**
 * Generate Overview Excel sheet
 */
async function generateOverviewExcel(workbook, data) {
  const sheet = workbook.addWorksheet('Overview');
  
  // Header styling
  sheet.getRow(1).font = { bold: true, size: 14 };
  sheet.addRow(['Analytics Overview']);
  sheet.addRow([]);

  const current = data.current || {};
  const growth = data.growth || {};

  // Messages
  sheet.addRow(['Messages']);
  sheet.addRow(['Metric', 'Value', 'Growth (%)']);
  sheet.addRow(['Total', current.messages?.total || 0, growth.messages || 0]);
  sheet.addRow(['Sent', current.messages?.sent || 0]);
  sheet.addRow(['Delivered', current.messages?.delivered || 0]);
  sheet.addRow(['Read', current.messages?.read || 0]);
  sheet.addRow(['Failed', current.messages?.failed || 0]);
  sheet.addRow([]);

  // Campaigns
  sheet.addRow(['Campaigns']);
  sheet.addRow(['Metric', 'Value', 'Growth (%)']);
  sheet.addRow(['Total', current.campaigns?.total || 0, growth.campaigns || 0]);
  sheet.addRow(['Completed', current.campaigns?.completed || 0]);
  sheet.addRow(['Active', current.campaigns?.active || 0]);
  sheet.addRow([]);

  // Contacts
  sheet.addRow(['Contacts']);
  sheet.addRow(['Metric', 'Value', 'Growth (%)']);
  sheet.addRow(['Total', current.contacts?.total || 0]);
  sheet.addRow(['New', current.contacts?.new || 0, growth.contacts || 0]);
  sheet.addRow(['Active', current.contacts?.active || 0]);

  // Auto-fit columns
  sheet.columns.forEach(column => {
    column.width = 20;
  });
}

/**
 * Generate Messages Excel sheet
 */
async function generateMessagesExcel(workbook, data) {
  const sheet = workbook.addWorksheet('Messages');
  
  // Summary
  sheet.addRow(['Message Analytics Summary']);
  sheet.addRow([]);
  sheet.addRow(['Total Messages', data.total || 0]);
  sheet.addRow(['Delivery Rate', `${data.rates?.delivery || 0}%`]);
  sheet.addRow(['Read Rate', `${data.rates?.read || 0}%`]);
  sheet.addRow(['Failure Rate', `${data.rates?.failure || 0}%`]);
  sheet.addRow([]);

  // Time series data
  if (data.timeSeries && data.timeSeries.length > 0) {
    sheet.addRow(['Time Series Data']);
    sheet.addRow(['Date', 'Count']);
    data.timeSeries.forEach(item => {
      sheet.addRow([item.date, item.value]);
    });
  }

  sheet.columns.forEach(column => {
    column.width = 20;
  });
}

/**
 * Generate Campaigns Excel sheet
 */
async function generateCampaignsExcel(workbook, data) {
  const sheet = workbook.addWorksheet('Campaigns');
  
  // Summary
  sheet.addRow(['Campaign Analytics Summary']);
  sheet.addRow([]);
  sheet.addRow(['Total Campaigns', data.summary?.total || 0]);
  sheet.addRow(['Total Recipients', data.summary?.totalRecipients || 0]);
  sheet.addRow(['Messages Sent', data.summary?.totalSent || 0]);
  sheet.addRow(['Avg Delivery Rate', `${data.rates?.avgDelivery || 0}%`]);
  sheet.addRow(['Avg Read Rate', `${data.rates?.avgRead || 0}%`]);
  sheet.addRow([]);

  // Top campaigns
  if (data.topCampaigns && data.topCampaigns.length > 0) {
    sheet.addRow(['Top Performing Campaigns']);
    sheet.addRow(['Name', 'Recipients', 'Sent', 'Delivered', 'Read', 'Replied', 'Delivery Rate', 'Read Rate', 'Reply Rate']);
    
    data.topCampaigns.forEach(campaign => {
      sheet.addRow([
        campaign.name,
        campaign.recipients,
        campaign.sent,
        campaign.delivered,
        campaign.read,
        campaign.replied,
        `${campaign.deliveryRate}%`,
        `${campaign.readRate}%`,
        `${campaign.replyRate}%`
      ]);
    });
  }

  sheet.columns.forEach(column => {
    column.width = 15;
  });
}

/**
 * Generate Contacts Excel sheet
 */
async function generateContactsExcel(workbook, data) {
  const sheet = workbook.addWorksheet('Contacts');
  
  sheet.addRow(['Contact Analytics Summary']);
  sheet.addRow([]);
  sheet.addRow(['Total Contacts', data.summary?.total || 0]);
  sheet.addRow(['New Contacts', data.summary?.new || 0]);
  sheet.addRow(['Active Contacts', data.summary?.active || 0]);
  sheet.addRow(['Blocked Contacts', data.summary?.blocked || 0]);
  sheet.addRow(['Avg Engagement Score', data.summary?.avgEngagementScore || 0]);
  sheet.addRow([]);

  // Growth time series
  if (data.growthTimeSeries && data.growthTimeSeries.length > 0) {
    sheet.addRow(['Contact Growth']);
    sheet.addRow(['Date', 'New Contacts']);
    data.growthTimeSeries.forEach(item => {
      sheet.addRow([item.date, item.value]);
    });
  }

  sheet.columns.forEach(column => {
    column.width = 20;
  });
}

/**
 * Generate Revenue Excel sheet
 */
async function generateRevenueExcel(workbook, data) {
  const sheet = workbook.addWorksheet('Revenue');
  
  sheet.addRow(['Revenue Analytics Summary']);
  sheet.addRow([]);
  sheet.addRow(['Total Orders', data.orders?.total || 0]);
  sheet.addRow(['Total Revenue', `$${data.orders?.totalRevenue || 0}`]);
  sheet.addRow(['Avg Order Value', `$${data.orders?.avgOrderValue || 0}`]);
  sheet.addRow([]);
  sheet.addRow(['Abandoned Carts', data.abandonedCarts?.total || 0]);
  sheet.addRow(['Recovered Carts', data.abandonedCarts?.recovered || 0]);
  sheet.addRow(['Recovery Rate', `${data.abandonedCarts?.recoveryRate || 0}%`]);
  sheet.addRow(['Abandoned Cart Value', `$${data.abandonedCarts?.totalValue || 0}`]);

  sheet.columns.forEach(column => {
    column.width = 20;
  });
}

/**
 * Generate Chatbots Excel sheet
 */
async function generateChatbotsExcel(workbook, data) {
  const sheet = workbook.addWorksheet('Chatbots');
  
  sheet.addRow(['Chatbot Analytics Summary']);
  sheet.addRow([]);
  sheet.addRow(['Total Conversations', data.summary?.totalConversations || 0]);
  sheet.addRow(['Total Messages', data.summary?.totalMessages || 0]);
  sheet.addRow(['Avg Response Time', `${data.summary?.avgResponseTime || 0}ms`]);
  sheet.addRow(['Avg Satisfaction Score', data.summary?.avgSatisfactionScore || 0]);
  sheet.addRow(['Handoff Rate', `${data.rates?.handoff || 0}%`]);
  sheet.addRow(['Completion Rate', `${data.rates?.completion || 0}%`]);

  sheet.columns.forEach(column => {
    column.width = 25;
  });
}

/**
 * Get file size in bytes
 */
function getFileSize(filePath) {
  try {
    const stats = fs.statSync(filePath);
    return stats.size;
  } catch (error) {
    logger.error(`Error getting file size: ${error.message}`);
    return null;
  }
}

/**
 * Delete report file
 */
function deleteReportFile(filePath) {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      logger.info(`Deleted report file: ${filePath}`);
    }
  } catch (error) {
    logger.error(`Error deleting report file: ${error.message}`, { error });
  }
}

export default {
  generateCSV,
  generatePDF,
  generateExcel,
  getFileSize,
  deleteReportFile,
  REPORTS_DIR
};
