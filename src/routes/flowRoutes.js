import express from 'express';
import * as flowController from '../controllers/flowController.js';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/rbac.js';
import { validateBody } from '../middleware/validation.js';
import { createFlowSchema, updateFlowSchema } from '../validators/flowValidator.js';

const router = express.Router();

/**
 * Flow Routes
 * All routes require authentication
 */

// Create a new flow
router.post(
  '/',
  authenticate,
  authorize('flows:create'),
  validateBody(createFlowSchema),
  flowController.createFlow
);

// Get all flows
router.get(
  '/',
  authenticate,
  authorize('flows:read'),
  flowController.getFlows
);

// Get a single flow by ID
router.get(
  '/:id',
  authenticate,
  authorize('flows:read'),
  flowController.getFlowById
);

// Update a flow
router.put(
  '/:id',
  authenticate,
  authorize('flows:update'),
  validateBody(updateFlowSchema),
  flowController.updateFlow
);

// Delete a flow
router.delete(
  '/:id',
  authenticate,
  authorize('flows:delete'),
  flowController.deleteFlow
);

// Activate a flow
router.post(
  '/:id/activate',
  authenticate,
  authorize('flows:update'),
  flowController.activateFlow
);

// Deactivate a flow
router.post(
  '/:id/deactivate',
  authenticate,
  authorize('flows:update'),
  flowController.deactivateFlow
);

// Get flow statistics
router.get(
  '/:id/stats',
  authenticate,
  authorize('flows:read'),
  flowController.getFlowStats
);

// Test a flow (dry run)
router.post(
  '/:id/test',
  authenticate,
  authorize('flows:update'),
  flowController.testFlow
);

// Get flow executions
router.get(
  '/:id/executions',
  authenticate,
  authorize('flows:read'),
  flowController.getFlowExecutions
);

// Get a single flow execution
router.get(
  '/executions/:executionId',
  authenticate,
  authorize('flows:read'),
  flowController.getFlowExecution
);

// Manually trigger a flow
router.post(
  '/:id/trigger',
  authenticate,
  authorize('flows:update'),
  flowController.triggerFlow
);

export default router;
