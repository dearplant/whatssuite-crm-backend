/**
 * File Parser Utility
 *
 * Utilities for parsing CSV and Excel files for contact import
 */

import fs from 'fs';
import csv from 'csv-parser';
import xlsx from 'xlsx';
import { Readable } from 'stream';

/**
 * Parse CSV file from buffer
 * @param {Buffer} buffer - File buffer
 * @returns {Promise<Array>} - Parsed contacts
 */
export const parseCSV = (buffer) => {
  return new Promise((resolve, reject) => {
    const results = [];
    const stream = Readable.from(buffer);

    stream
      .pipe(csv())
      .on('data', (data) => results.push(data))
      .on('end', () => resolve(results))
      .on('error', (error) => reject(error));
  });
};

/**
 * Parse Excel file from buffer
 * @param {Buffer} buffer - File buffer
 * @returns {Array} - Parsed contacts
 */
export const parseExcel = (buffer) => {
  try {
    const workbook = xlsx.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(worksheet);
    return data;
  } catch (error) {
    throw new Error(`Failed to parse Excel file: ${error.message}`);
  }
};

/**
 * Validate contact data
 * @param {Object} contact - Contact data
 * @returns {Object} - Validation result
 */
export const validateContactData = (contact) => {
  const errors = [];
  const warnings = [];

  // Required field: phone
  if (!contact.phone || contact.phone.trim() === '') {
    errors.push('Phone number is required');
  } else {
    // Basic phone validation (remove spaces, check if it's numeric)
    const cleanPhone = contact.phone.replace(/\s+/g, '');
    if (!/^\+?[0-9]{10,15}$/.test(cleanPhone)) {
      warnings.push('Phone number format may be invalid');
    }
  }

  // Required field: name
  if (!contact.name || contact.name.trim() === '') {
    errors.push('Name is required');
  }

  // Optional email validation
  if (contact.email && contact.email.trim() !== '') {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(contact.email)) {
      warnings.push('Email format may be invalid');
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
};

/**
 * Normalize contact data
 * @param {Object} contact - Raw contact data
 * @returns {Object} - Normalized contact data
 */
export const normalizeContactData = (contact) => {
  // Map common CSV headers to our schema
  const normalized = {
    phone: contact.phone || contact.Phone || contact.phoneNumber || contact['Phone Number'] || '',
    name: contact.name || contact.Name || contact.fullName || contact['Full Name'] || '',
    email: contact.email || contact.Email || '',
    company: contact.company || contact.Company || '',
    jobTitle: contact.jobTitle || contact['Job Title'] || contact.title || '',
    address: contact.address || contact.Address || '',
    city: contact.city || contact.City || '',
    state: contact.state || contact.State || '',
    country: contact.country || contact.Country || '',
    postalCode: contact.postalCode || contact['Postal Code'] || contact.zipCode || '',
    notes: contact.notes || contact.Notes || '',
  };

  // Clean up phone number
  if (normalized.phone) {
    normalized.phone = normalized.phone.toString().replace(/\s+/g, '');
  }

  // Parse tags if present
  if (contact.tags || contact.Tags) {
    const tagsStr = contact.tags || contact.Tags;
    normalized.tags = typeof tagsStr === 'string' ? tagsStr.split(',').map((t) => t.trim()) : [];
  } else {
    normalized.tags = [];
  }

  // Handle custom fields
  const standardFields = [
    'phone',
    'name',
    'email',
    'company',
    'jobTitle',
    'address',
    'city',
    'state',
    'country',
    'postalCode',
    'notes',
    'tags',
    'Phone',
    'Name',
    'Email',
    'Company',
    'Job Title',
    'Address',
    'City',
    'State',
    'Country',
    'Postal Code',
    'Notes',
    'Tags',
    'phoneNumber',
    'Phone Number',
    'fullName',
    'Full Name',
    'title',
    'zipCode',
  ];

  const customFields = {};
  Object.keys(contact).forEach((key) => {
    if (!standardFields.includes(key) && contact[key]) {
      customFields[key] = contact[key];
    }
  });

  if (Object.keys(customFields).length > 0) {
    normalized.customFields = customFields;
  }

  return normalized;
};

/**
 * Generate CSV from contacts
 * @param {Array} contacts - Array of contact objects
 * @returns {String} - CSV string
 */
export const generateCSV = (contacts) => {
  if (!contacts || contacts.length === 0) {
    return '';
  }

  // Define headers
  const headers = [
    'phone',
    'name',
    'email',
    'company',
    'jobTitle',
    'address',
    'city',
    'state',
    'country',
    'postalCode',
    'tags',
    'source',
    'lastMessageAt',
    'totalMessages',
    'createdAt',
  ];

  // Create CSV rows
  const rows = contacts.map((contact) => {
    return headers
      .map((header) => {
        let value = contact[header] || '';

        // Handle arrays (tags)
        if (Array.isArray(value)) {
          value = value.join(', ');
        }

        // Handle dates
        if (value instanceof Date) {
          value = value.toISOString();
        }

        // Escape quotes and wrap in quotes if contains comma
        if (typeof value === 'string') {
          value = value.replace(/"/g, '""');
          if (value.includes(',') || value.includes('\n') || value.includes('"')) {
            value = `"${value}"`;
          }
        }

        return value;
      })
      .join(',');
  });

  // Add header row
  const csv = [headers.join(','), ...rows].join('\n');

  return csv;
};
