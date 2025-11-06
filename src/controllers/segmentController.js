/**
 * Segment Controller
 *
 * Handles HTTP requests for contact segmentation
 */

import segmentService from '../services/segmentService.js';
import logger from '../utils/logger.js';

/**
 * Create a new segment
 * POST /api/v1/contacts/segments
 */
async function createSegment(req, res) {
  try {
    const teamId = req.user.teamId;
    const segment = await segmentService.createSegment(teamId, req.body);

    res.status(201).json({
      success: true,
      data: segment,
    });
  } catch (error) {
    logger.error('Error creating segment:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to create segment',
    });
  }
}

/**
 * Get all segments
 * GET /api/v1/contacts/segments
 */
async function getSegments(req, res) {
  try {
    const teamId = req.user.teamId;
    const segments = await segmentService.getSegments(teamId);

    res.json({
      success: true,
      data: segments,
    });
  } catch (error) {
    logger.error('Error fetching segments:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch segments',
    });
  }
}

/**
 * Get segment by ID
 * GET /api/v1/contacts/segments/:id
 */
async function getSegmentById(req, res) {
  try {
    const teamId = req.user.teamId;
    const { id } = req.params;

    const segment = await segmentService.getSegmentById(id, teamId);

    res.json({
      success: true,
      data: segment,
    });
  } catch (error) {
    logger.error('Error fetching segment:', error);
    res.status(404).json({
      success: false,
      message: error.message || 'Segment not found',
    });
  }
}

/**
 * Update segment
 * PUT /api/v1/contacts/segments/:id
 */
async function updateSegment(req, res) {
  try {
    const teamId = req.user.teamId;
    const { id } = req.params;

    const segment = await segmentService.updateSegment(id, teamId, req.body);

    res.json({
      success: true,
      data: segment,
    });
  } catch (error) {
    logger.error('Error updating segment:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to update segment',
    });
  }
}

/**
 * Delete segment
 * DELETE /api/v1/contacts/segments/:id
 */
async function deleteSegment(req, res) {
  try {
    const teamId = req.user.teamId;
    const { id } = req.params;

    await segmentService.deleteSegment(id, teamId);

    res.json({
      success: true,
      message: 'Segment deleted successfully',
    });
  } catch (error) {
    logger.error('Error deleting segment:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to delete segment',
    });
  }
}

/**
 * Get contacts in a segment
 * GET /api/v1/contacts/segments/:id/contacts
 */
async function getSegmentContacts(req, res) {
  try {
    const teamId = req.user.teamId;
    const { id } = req.params;
    const { page, limit, sortBy, sortOrder } = req.validatedQuery || req.query;

    const result = await segmentService.getSegmentContacts(id, teamId, {
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 50,
      sortBy: sortBy || 'created_at',
      sortOrder: sortOrder || 'desc',
    });

    res.json({
      success: true,
      data: result.contacts,
      pagination: result.pagination,
    });
  } catch (error) {
    logger.error('Error fetching segment contacts:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch segment contacts',
    });
  }
}

/**
 * Recalculate segment count
 * POST /api/v1/contacts/segments/:id/recalculate
 */
async function recalculateSegmentCount(req, res) {
  try {
    const teamId = req.user.teamId;
    const { id } = req.params;

    const count = await segmentService.recalculateSegmentCount(id, teamId);

    res.json({
      success: true,
      data: { count },
    });
  } catch (error) {
    logger.error('Error recalculating segment count:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to recalculate segment count',
    });
  }
}

export default {
  createSegment,
  getSegments,
  getSegmentById,
  updateSegment,
  deleteSegment,
  getSegmentContacts,
  recalculateSegmentCount,
};
