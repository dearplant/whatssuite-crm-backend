/**
 * Segment Service
 *
 * Business logic for contact segmentation
 */

import prisma from '../config/database.js';
import redis from '../config/redis.js';
import logger from '../utils/logger.js';

const SEGMENT_CACHE_TTL = 300; // 5 minutes

/**
 * Evaluate segment conditions against contacts
 * @param {Object} conditions - Segment conditions
 * @param {String} teamId - Team ID
 * @returns {Object} Prisma where clause
 */
function buildSegmentQuery(conditions, teamId) {
  const where = { team_id: teamId, deleted_at: null };

  if (!conditions || !conditions.rules || conditions.rules.length === 0) {
    return where;
  }

  const { rules, operator = 'AND' } = conditions;
  const queries = [];

  for (const rule of rules) {
    const { field, operator: ruleOperator, value } = rule;

    switch (field) {
      case 'first_name':
      case 'last_name':
      case 'email':
      case 'phone':
      case 'company':
      case 'city':
      case 'country':
      case 'source':
        queries.push(buildStringQuery(field, ruleOperator, value));
        break;

      case 'engagement_score':
        queries.push(buildNumberQuery(field, ruleOperator, value));
        break;

      case 'created_at':
      case 'updated_at':
      case 'last_contacted_at':
        queries.push(buildDateQuery(field, ruleOperator, value));
        break;

      case 'tags':
        queries.push(buildTagQuery(ruleOperator, value));
        break;

      case 'is_blocked':
        queries.push({ [field]: value === 'true' || value === true });
        break;

      case 'custom_fields':
        queries.push(buildCustomFieldQuery(ruleOperator, value));
        break;

      default:
        logger.warn(`Unknown segment field: ${field}`);
    }
  }

  if (queries.length > 0) {
    where[operator] = queries;
  }

  return where;
}

/**
 * Build string field query
 */
function buildStringQuery(field, operator, value) {
  switch (operator) {
    case 'equals':
      return { [field]: value };
    case 'not_equals':
      return { [field]: { not: value } };
    case 'contains':
      return { [field]: { contains: value, mode: 'insensitive' } };
    case 'not_contains':
      return { [field]: { not: { contains: value, mode: 'insensitive' } } };
    case 'starts_with':
      return { [field]: { startsWith: value, mode: 'insensitive' } };
    case 'ends_with':
      return { [field]: { endsWith: value, mode: 'insensitive' } };
    case 'is_empty':
      return { OR: [{ [field]: null }, { [field]: '' }] };
    case 'is_not_empty':
      return { AND: [{ [field]: { not: null } }, { [field]: { not: '' } }] };
    default:
      return { [field]: value };
  }
}

/**
 * Build number field query
 */
function buildNumberQuery(field, operator, value) {
  const numValue = parseInt(value, 10);
  switch (operator) {
    case 'equals':
      return { [field]: numValue };
    case 'not_equals':
      return { [field]: { not: numValue } };
    case 'greater_than':
      return { [field]: { gt: numValue } };
    case 'greater_than_or_equal':
      return { [field]: { gte: numValue } };
    case 'less_than':
      return { [field]: { lt: numValue } };
    case 'less_than_or_equal':
      return { [field]: { lte: numValue } };
    default:
      return { [field]: numValue };
  }
}

/**
 * Build date field query
 */
function buildDateQuery(field, operator, value) {
  const date = new Date(value);
  switch (operator) {
    case 'equals':
      return { [field]: date };
    case 'before':
      return { [field]: { lt: date } };
    case 'after':
      return { [field]: { gt: date } };
    case 'between':
      if (Array.isArray(value) && value.length === 2) {
        return {
          [field]: {
            gte: new Date(value[0]),
            lte: new Date(value[1]),
          },
        };
      }
      return { [field]: date };
    case 'is_empty':
      return { [field]: null };
    case 'is_not_empty':
      return { [field]: { not: null } };
    default:
      return { [field]: date };
  }
}

/**
 * Build tag query
 */
function buildTagQuery(operator, value) {
  const tagNames = Array.isArray(value) ? value : [value];

  switch (operator) {
    case 'has_any':
      return {
        contact_tags: {
          some: {
            tags: {
              name: { in: tagNames },
            },
          },
        },
      };
    case 'has_all':
      return {
        AND: tagNames.map((tagName) => ({
          contact_tags: {
            some: {
              tags: {
                name: tagName,
              },
            },
          },
        })),
      };
    case 'has_none':
      return {
        NOT: {
          contact_tags: {
            some: {
              tags: {
                name: { in: tagNames },
              },
            },
          },
        },
      };
    default:
      return {
        contact_tags: {
          some: {
            tags: {
              name: { in: tagNames },
            },
          },
        },
      };
  }
}

/**
 * Build custom field query
 */
function buildCustomFieldQuery(operator, value) {
  const { key, value: fieldValue } = value;

  switch (operator) {
    case 'has_key':
      return {
        custom_fields: {
          path: [key],
          not: null,
        },
      };
    case 'key_equals':
      return {
        custom_fields: {
          path: [key],
          equals: fieldValue,
        },
      };
    default:
      return {};
  }
}

/**
 * Create a new segment
 */
async function createSegment(teamId, data) {
  const { name, description, conditions } = data;

  // Check for duplicate name
  const existing = await prisma.segments.findUnique({
    where: {
      team_id_name: {
        team_id: teamId,
        name,
      },
    },
  });

  if (existing) {
    throw new Error('Segment with this name already exists');
  }

  // Calculate initial contact count
  const where = buildSegmentQuery(conditions, teamId);
  const contactCount = await prisma.contacts.count({ where });

  const segment = await prisma.segments.create({
    data: {
      id: crypto.randomUUID(),
      team_id: teamId,
      name,
      description,
      conditions,
      contact_count: contactCount,
      last_calculated_at: new Date(),
      created_at: new Date(),
      updated_at: new Date(),
    },
  });

  // Cache the count
  await cacheSegmentCount(segment.id, contactCount);

  logger.info(`Segment created: ${segment.id} with ${contactCount} contacts`);
  return segment;
}

/**
 * Get all segments for a team
 */
async function getSegments(teamId) {
  const segments = await prisma.segments.findMany({
    where: { team_id: teamId },
    orderBy: { created_at: 'desc' },
  });

  return segments;
}

/**
 * Get segment by ID
 */
async function getSegmentById(segmentId, teamId) {
  const segment = await prisma.segments.findFirst({
    where: {
      id: segmentId,
      team_id: teamId,
    },
  });

  if (!segment) {
    throw new Error('Segment not found');
  }

  return segment;
}

/**
 * Update segment
 */
async function updateSegment(segmentId, teamId, data) {
  const segment = await getSegmentById(segmentId, teamId);

  const { name, description, conditions } = data;

  // If conditions changed, recalculate count
  let contactCount = segment.contact_count;
  let lastCalculatedAt = segment.last_calculated_at;

  if (conditions && JSON.stringify(conditions) !== JSON.stringify(segment.conditions)) {
    const where = buildSegmentQuery(conditions, teamId);
    contactCount = await prisma.contacts.count({ where });
    lastCalculatedAt = new Date();

    // Update cache
    await cacheSegmentCount(segmentId, contactCount);
  }

  const updated = await prisma.segments.update({
    where: { id: segmentId },
    data: {
      name: name || segment.name,
      description: description !== undefined ? description : segment.description,
      conditions: conditions || segment.conditions,
      contact_count: contactCount,
      last_calculated_at: lastCalculatedAt,
      updated_at: new Date(),
    },
  });

  logger.info(`Segment updated: ${segmentId}`);
  return updated;
}

/**
 * Delete segment
 */
async function deleteSegment(segmentId, teamId) {
  await getSegmentById(segmentId, teamId);

  await prisma.segments.delete({
    where: { id: segmentId },
  });

  // Clear cache
  await redis.del(`segment:${segmentId}:count`);

  logger.info(`Segment deleted: ${segmentId}`);
}

/**
 * Get contacts in a segment
 */
async function getSegmentContacts(segmentId, teamId, options = {}) {
  const segment = await getSegmentById(segmentId, teamId);

  const { page = 1, limit = 50, sortBy = 'created_at', sortOrder = 'desc' } = options;

  const where = buildSegmentQuery(segment.conditions, teamId);

  const [contacts, total] = await Promise.all([
    prisma.contacts.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { [sortBy]: sortOrder },
      include: {
        contact_tags: {
          include: {
            tags: true,
          },
        },
      },
    }),
    prisma.contacts.count({ where }),
  ]);

  return {
    contacts,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

/**
 * Recalculate segment count
 */
async function recalculateSegmentCount(segmentId, teamId) {
  const segment = await getSegmentById(segmentId, teamId);

  const where = buildSegmentQuery(segment.conditions, teamId);
  const contactCount = await prisma.contacts.count({ where });

  await prisma.segments.update({
    where: { id: segmentId },
    data: {
      contact_count: contactCount,
      last_calculated_at: new Date(),
    },
  });

  // Update cache
  await cacheSegmentCount(segmentId, contactCount);

  logger.info(`Segment count recalculated: ${segmentId} = ${contactCount}`);
  return contactCount;
}

/**
 * Cache segment count in Redis
 */
async function cacheSegmentCount(segmentId, count) {
  const key = `segment:${segmentId}:count`;
  await redis.set(key, count.toString(), { EX: SEGMENT_CACHE_TTL });
}

/**
 * Get cached segment count
 */
async function getCachedSegmentCount(segmentId) {
  const key = `segment:${segmentId}:count`;
  const cached = await redis.get(key);
  return cached ? parseInt(cached, 10) : null;
}

export default {
  createSegment,
  getSegments,
  getSegmentById,
  updateSegment,
  deleteSegment,
  getSegmentContacts,
  recalculateSegmentCount,
  getCachedSegmentCount,
  buildSegmentQuery,
};
