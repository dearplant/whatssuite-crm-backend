/**
 * Contact Import Worker
 *
 * Processes contact import jobs from the queue
 */

import contactImportQueue from '../queues/contactImportQueue.js';
import prisma from '../config/database.js';
import logger from '../utils/logger.js';
import { validateContactData, normalizeContactData } from '../utils/fileParser.js';

// Batch size for processing
const BATCH_SIZE = 100;

/**
 * Process contact import job
 */
contactImportQueue.process(async (job) => {
  const { userId, whatsappAccountId, teamId, contacts, importId } = job.data;

  logger.info(`Starting contact import job ${job.id}`, {
    userId,
    whatsappAccountId,
    teamId,
    totalContacts: contacts.length,
    importId,
  });

  const results = {
    totalContacts: contacts.length,
    imported: 0,
    skipped: 0,
    failed: 0,
    errors: [],
  };

  try {
    // Update import status to processing
    await prisma.contact_imports.update({
      where: { id: importId },
      data: {
        status: 'Processing',
        started_at: new Date(),
      },
    });

    // Process contacts in batches
    for (let i = 0; i < contacts.length; i += BATCH_SIZE) {
      const batch = contacts.slice(i, i + BATCH_SIZE);
      const batchResults = await processBatch(batch, teamId);

      results.imported += batchResults.imported;
      results.skipped += batchResults.skipped;
      results.failed += batchResults.failed;
      results.errors.push(...batchResults.errors);

      // Update progress
      const progress = Math.round(((i + batch.length) / contacts.length) * 100);
      await job.progress(progress);

      // Update import record with progress
      await prisma.contact_imports.update({
        where: { id: importId },
        data: {
          processed_count: i + batch.length,
          imported_count: results.imported,
          skipped_count: results.skipped,
          failed_count: results.failed,
        },
      });
    }

    // Update import status to completed
    await prisma.contact_imports.update({
      where: { id: importId },
      data: {
        status: 'Completed',
        completed_at: new Date(),
        processed_count: results.totalContacts,
        imported_count: results.imported,
        skipped_count: results.skipped,
        failed_count: results.failed,
        errors: results.errors.slice(0, 100), // Store first 100 errors
      },
    });

    logger.info(`Contact import job ${job.id} completed successfully`, results);

    return results;
  } catch (error) {
    logger.error(`Contact import job ${job.id} failed`, {
      error: error.message,
      stack: error.stack,
    });

    // Update import status to failed
    await prisma.contact_imports.update({
      where: { id: importId },
      data: {
        status: 'Failed',
        completed_at: new Date(),
        errors: [{ message: error.message }],
      },
    });

    throw error;
  }
});

/**
 * Process a batch of contacts
 */
async function processBatch(batch, teamId) {
  const results = {
    imported: 0,
    skipped: 0,
    failed: 0,
    errors: [],
  };

  for (const rawContact of batch) {
    try {
      // Normalize contact data
      const normalized = normalizeContactData(rawContact);

      // Validate contact data
      const validation = validateContactData(normalized);

      if (!validation.isValid) {
        results.failed++;
        results.errors.push({
          phone: normalized.phone,
          name: normalized.name,
          errors: validation.errors,
        });
        continue;
      }

      // Check for duplicate
      const existing = await prisma.contacts.findFirst({
        where: {
          team_id: teamId,
          phone: normalized.phone,
          deleted_at: null,
        },
      });

      if (existing) {
        results.skipped++;
        continue;
      }

      // Split name into first and last name
      const nameParts = normalized.name.trim().split(' ');
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';

      // Create contact
      await prisma.contacts.create({
        data: {
          id: (await import('uuid')).v4(),
          team_id: teamId,
          phone: normalized.phone,
          first_name: firstName,
          last_name: lastName,
          email: normalized.email || null,
          company: normalized.company || null,
          city: normalized.city || null,
          country: normalized.country || null,
          custom_fields: normalized.customFields || {},
          notes: normalized.notes || null,
          source: 'Import',
          updated_at: new Date(),
        },
      });

      results.imported++;
    } catch (error) {
      results.failed++;
      results.errors.push({
        phone: rawContact.phone || 'unknown',
        name: rawContact.name || 'unknown',
        errors: [error.message],
      });
      logger.error('Failed to import contact', {
        contact: rawContact,
        error: error.message,
      });
    }
  }

  return results;
}

logger.info('Contact import worker started');

export default contactImportQueue;
