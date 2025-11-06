/**
 * Contact Routes
 *
 * Routes for contact management with RBAC
 */

import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/rbac.js';
import { uploadSingle } from '../middleware/upload.js';
import contactController from '../controllers/contactController.js';
import segmentController from '../controllers/segmentController.js';
import {
  validate,
  createContactSchema,
  updateContactSchema,
  queryContactsSchema,
  importContactsSchema,
  exportContactsSchema,
} from '../validators/contactValidator.js';
import {
  validate as validateSegment,
  createSegmentSchema,
  updateSegmentSchema,
  querySegmentContactsSchema,
  bulkActionSchema,
  queryTagsSchema,
} from '../validators/segmentValidator.js';

const router = express.Router();

/**
 * POST /api/v1/contacts
 * Create a new contact
 * Requires: contacts:create permission
 */
router.post(
  '/',
  authenticate,
  authorize('contacts:create'),
  validate(createContactSchema),
  contactController.createContact
);

/**
 * GET /api/v1/contacts
 * List all contacts with filters
 * Requires: contacts:read permission
 */
router.get(
  '/',
  authenticate,
  authorize('contacts:read'),
  validate(queryContactsSchema, 'query'),
  contactController.getContacts
);

/**
 * GET /api/v1/contacts/export
 * Export contacts to CSV
 * Requires: contacts:export permission
 */
router.get(
  '/export',
  authenticate,
  authorize('contacts:export'),
  validate(exportContactsSchema, 'query'),
  contactController.exportContacts
);

/**
 * GET /api/v1/contacts/tags
 * Get all tags
 * Requires: contacts:read permission
 */
router.get(
  '/tags',
  authenticate,
  authorize('contacts:read'),
  validateSegment(queryTagsSchema, 'query'),
  contactController.getTags
);

/**
 * POST /api/v1/contacts/bulk-action
 * Perform bulk actions on contacts
 * Requires: contacts:bulk-action permission
 */
router.post(
  '/bulk-action',
  authenticate,
  authorize('contacts:bulk-action'),
  validateSegment(bulkActionSchema),
  contactController.bulkAction
);

/**
 * POST /api/v1/contacts/import
 * Import contacts from CSV/Excel
 * Requires: contacts:import permission
 */
router.post(
  '/import',
  authenticate,
  authorize('contacts:import'),
  uploadSingle('file'),
  validate(importContactsSchema),
  contactController.importContacts
);

/**
 * GET /api/v1/contacts/import/:importId
 * Get import status
 * Requires: contacts:import permission
 */
router.get(
  '/import/:importId',
  authenticate,
  authorize('contacts:import'),
  contactController.getImportStatus
);

/**
 * POST /api/v1/contacts/segments
 * Create a new segment
 * Requires: contacts:create permission
 */
router.post(
  '/segments',
  authenticate,
  authorize('contacts:create'),
  validateSegment(createSegmentSchema),
  segmentController.createSegment
);

/**
 * GET /api/v1/contacts/segments
 * Get all segments
 * Requires: contacts:read permission
 */
router.get(
  '/segments',
  authenticate,
  authorize('contacts:read'),
  segmentController.getSegments
);

/**
 * GET /api/v1/contacts/segments/:id
 * Get segment by ID
 * Requires: contacts:read permission
 */
router.get(
  '/segments/:id',
  authenticate,
  authorize('contacts:read'),
  segmentController.getSegmentById
);

/**
 * PUT /api/v1/contacts/segments/:id
 * Update segment
 * Requires: contacts:update permission
 */
router.put(
  '/segments/:id',
  authenticate,
  authorize('contacts:update'),
  validateSegment(updateSegmentSchema),
  segmentController.updateSegment
);

/**
 * DELETE /api/v1/contacts/segments/:id
 * Delete segment
 * Requires: contacts:delete permission
 */
router.delete(
  '/segments/:id',
  authenticate,
  authorize('contacts:delete'),
  segmentController.deleteSegment
);

/**
 * GET /api/v1/contacts/segments/:id/contacts
 * Get contacts in a segment
 * Requires: contacts:read permission
 */
router.get(
  '/segments/:id/contacts',
  authenticate,
  authorize('contacts:read'),
  validateSegment(querySegmentContactsSchema, 'query'),
  segmentController.getSegmentContacts
);

/**
 * POST /api/v1/contacts/segments/:id/recalculate
 * Recalculate segment count
 * Requires: contacts:update permission
 */
router.post(
  '/segments/:id/recalculate',
  authenticate,
  authorize('contacts:update'),
  segmentController.recalculateSegmentCount
);

/**
 * GET /api/v1/contacts/:id
 * Get contact details
 * Requires: contacts:read permission
 */
router.get(
  '/:id',
  authenticate,
  authorize('contacts:read'),
  contactController.getContactById
);

/**
 * PUT /api/v1/contacts/:id
 * Update contact
 * Requires: contacts:update permission
 */
router.put(
  '/:id',
  authenticate,
  authorize('contacts:update'),
  validate(updateContactSchema),
  contactController.updateContact
);

/**
 * DELETE /api/v1/contacts/:id
 * Delete contact (soft delete)
 * Requires: contacts:delete permission
 */
router.delete(
  '/:id',
  authenticate,
  authorize('contacts:delete'),
  contactController.deleteContact
);

export default router;
