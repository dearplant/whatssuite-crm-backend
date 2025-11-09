import { PrismaClient } from '@prisma/client';
import redis from '../config/redis.js';
import logger from '../utils/logger.js';
import {
  calculateDeliveryRate,
  calculateReadRate,
  calculateEngagementRate,
  calculateReplyRate,
  calculateFailureRate,
  calculateGrowthRate
} from '../utils/analyticsCalculations.js';

const prisma = new PrismaClient();

// Cache TTL in seconds
const CACHE_TTL = {
  REAL_TIME_METRICS: 30,      // 30 seconds
  DASHBOARD_METRICS: 300,     // 5 minutes
  SNAPSHOT_DATA: 3600         // 1 hour
};

/**
 * Generate analytics snapshot for a specific date and type
 * @param {string} teamId - Team ID
 * @param {string|null} whatsappAccountId - WhatsApp Account ID (null for team-wide)
 * @param {Date} date - Date for the snapshot
 * @param {string} snapshotType - Type: Daily, Weekly, or Monthly
 * @returns {Promise<Object>} Created snapshot
 */
async function generateSnapshot(teamId, whatsappAccountId, date, snapshotType) {
  try {
    logger.info(`Generating ${snapshotType} snapshot for team ${teamId}, account ${whatsappAccountId}, date ${date}`);

    // Calculate date range based on snapshot type
    const { startDate, endDate } = getDateRange(date, snapshotType);

    // Aggregate metrics from various sources
    const metrics = await aggregateMetrics(teamId, whatsappAccountId, startDate, endDate);

    // Create or update snapshot
    const snapshot = await prisma.analytics_snapshots.upsert({
      where: {
        team_id_whatsapp_account_id_date_snapshot_type: {
          team_id: teamId,
          whatsapp_account_id: whatsappAccountId,
          date: date,
          snapshot_type: snapshotType
        }
      },
      update: {
        metrics: metrics,
        created_at: new Date()
      },
      create: {
        team_id: teamId,
        whatsapp_account_id: whatsappAccountId,
        date: date,
        snapshot_type: snapshotType,
        metrics: metrics
      }
    });

    logger.info(`Successfully generated ${snapshotType} snapshot for team ${teamId}`);
    return snapshot;
  } catch (error) {
    logger.error(`Error generating snapshot: ${error.message}`, { error, teamId, whatsappAccountId, date, snapshotType });
    throw error;
  }
}

/**
 * Get date range based on snapshot type
 * @param {Date} date - Reference date
 * @param {string} snapshotType - Daily, Weekly, or Monthly
 * @returns {Object} Start and end dates
 */
function getDateRange(date, snapshotType) {
  const refDate = new Date(date);
  let startDate, endDate;

  switch (snapshotType) {
    case 'Daily':
      startDate = new Date(refDate.setHours(0, 0, 0, 0));
      endDate = new Date(refDate.setHours(23, 59, 59, 999));
      break;

    case 'Weekly':
      // Start of week (Monday)
      const dayOfWeek = refDate.getDay();
      const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      startDate = new Date(refDate);
      startDate.setDate(refDate.getDate() + diff);
      startDate.setHours(0, 0, 0, 0);
      
      // End of week (Sunday)
      endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 6);
      endDate.setHours(23, 59, 59, 999);
      break;

    case 'Monthly':
      startDate = new Date(refDate.getFullYear(), refDate.getMonth(), 1, 0, 0, 0, 0);
      endDate = new Date(refDate.getFullYear(), refDate.getMonth() + 1, 0, 23, 59, 59, 999);
      break;

    default:
      throw new Error(`Invalid snapshot type: ${snapshotType}`);
  }

  return { startDate, endDate };
}

/**
 * Aggregate metrics from messages, campaigns, and contacts
 * @param {string} teamId - Team ID
 * @param {string|null} whatsappAccountId - WhatsApp Account ID
 * @param {Date} startDate - Start date
 * @param {Date} endDate - End date
 * @returns {Promise<Object>} Aggregated metrics
 */
async function aggregateMetrics(teamId, whatsappAccountId, startDate, endDate) {
  const whereClause = {
    team_id: teamId,
    created_at: {
      gte: startDate,
      lte: endDate
    }
  };

  if (whatsappAccountId) {
    whereClause.account_id = whatsappAccountId;
  }

  // Message metrics
  const messageMetrics = await aggregateMessageMetrics(whereClause);

  // Campaign metrics
  const campaignMetrics = await aggregateCampaignMetrics(whereClause);

  // Contact metrics
  const contactMetrics = await aggregateContactMetrics(teamId, whatsappAccountId, startDate, endDate);

  // Conversation metrics
  const conversationMetrics = await aggregateConversationMetrics(whereClause);

  // Calculate rates
  const deliveryRate = calculateDeliveryRate(messageMetrics.delivered, messageMetrics.sent);
  const readRate = calculateReadRate(messageMetrics.read, messageMetrics.delivered);
  const replyRate = calculateReplyRate(messageMetrics.replied, messageMetrics.sent);
  const failureRate = calculateFailureRate(messageMetrics.failed, messageMetrics.total);

  return {
    period: {
      start: startDate.toISOString(),
      end: endDate.toISOString()
    },
    messages: {
      total: messageMetrics.total,
      sent: messageMetrics.sent,
      delivered: messageMetrics.delivered,
      read: messageMetrics.read,
      failed: messageMetrics.failed,
      replied: messageMetrics.replied,
      inbound: messageMetrics.inbound,
      outbound: messageMetrics.outbound,
      deliveryRate,
      readRate,
      replyRate,
      failureRate
    },
    campaigns: {
      total: campaignMetrics.total,
      active: campaignMetrics.active,
      completed: campaignMetrics.completed,
      failed: campaignMetrics.failed,
      totalRecipients: campaignMetrics.totalRecipients,
      messagesSent: campaignMetrics.messagesSent,
      avgDeliveryRate: campaignMetrics.avgDeliveryRate,
      avgReadRate: campaignMetrics.avgReadRate
    },
    contacts: {
      total: contactMetrics.total,
      new: contactMetrics.new,
      active: contactMetrics.active,
      blocked: contactMetrics.blocked,
      avgEngagementScore: contactMetrics.avgEngagementScore
    },
    conversations: {
      total: conversationMetrics.total,
      open: conversationMetrics.open,
      closed: conversationMetrics.closed,
      avgResponseTime: conversationMetrics.avgResponseTime
    },
    generatedAt: new Date().toISOString()
  };
}

/**
 * Aggregate message metrics
 */
async function aggregateMessageMetrics(whereClause) {
  const messages = await prisma.messages.groupBy({
    by: ['status', 'senderType'],
    where: whereClause,
    _count: true
  });

  const metrics = {
    total: 0,
    sent: 0,
    delivered: 0,
    read: 0,
    failed: 0,
    replied: 0,
    inbound: 0,
    outbound: 0
  };

  messages.forEach(group => {
    const count = group._count;
    metrics.total += count;

    // Status counts
    if (group.status === 'sent' || group.status === 'delivered' || group.status === 'read') {
      metrics.sent += count;
    }
    if (group.status === 'delivered' || group.status === 'read') {
      metrics.delivered += count;
    }
    if (group.status === 'read') {
      metrics.read += count;
    }
    if (group.status === 'failed') {
      metrics.failed += count;
    }

    // Direction counts
    if (group.senderType === 'contact') {
      metrics.inbound += count;
    } else {
      metrics.outbound += count;
    }
  });

  // Count replied messages (outbound messages that have inbound responses)
  const repliedCount = await prisma.messages.count({
    where: {
      ...whereClause,
      senderType: 'user',
      conversation_id: {
        in: await prisma.messages.findMany({
          where: {
            ...whereClause,
            senderType: 'contact'
          },
          select: { conversation_id: true },
          distinct: ['conversation_id']
        }).then(results => results.map(r => r.conversation_id))
      }
    }
  });

  metrics.replied = repliedCount;

  return metrics;
}

/**
 * Aggregate campaign metrics
 */
async function aggregateCampaignMetrics(whereClause) {
  const campaigns = await prisma.campaigns.findMany({
    where: whereClause,
    select: {
      status: true,
      total_recipients: true,
      messages_sent: true,
      messages_delivered: true,
      messages_read: true
    }
  });

  const metrics = {
    total: campaigns.length,
    active: 0,
    completed: 0,
    failed: 0,
    totalRecipients: 0,
    messagesSent: 0,
    avgDeliveryRate: 0,
    avgReadRate: 0
  };

  let totalDeliveryRate = 0;
  let totalReadRate = 0;
  let campaignsWithMetrics = 0;

  campaigns.forEach(campaign => {
    if (campaign.status === 'Running') metrics.active++;
    if (campaign.status === 'Completed') metrics.completed++;
    if (campaign.status === 'Failed') metrics.failed++;

    metrics.totalRecipients += campaign.total_recipients || 0;
    metrics.messagesSent += campaign.messages_sent || 0;

    if (campaign.messages_sent > 0) {
      const deliveryRate = calculateDeliveryRate(campaign.messages_delivered, campaign.messages_sent);
      const readRate = calculateReadRate(campaign.messages_read, campaign.messages_delivered);
      
      totalDeliveryRate += deliveryRate;
      totalReadRate += readRate;
      campaignsWithMetrics++;
    }
  });

  if (campaignsWithMetrics > 0) {
    metrics.avgDeliveryRate = parseFloat((totalDeliveryRate / campaignsWithMetrics).toFixed(2));
    metrics.avgReadRate = parseFloat((totalReadRate / campaignsWithMetrics).toFixed(2));
  }

  return metrics;
}

/**
 * Aggregate contact metrics
 */
async function aggregateContactMetrics(teamId, whatsappAccountId, startDate, endDate) {
  const whereClause = { team_id: teamId };
  const newContactsWhere = {
    team_id: teamId,
    created_at: {
      gte: startDate,
      lte: endDate
    }
  };

  const [total, newContacts, blocked, engagementScores] = await Promise.all([
    prisma.contacts.count({ where: whereClause }),
    prisma.contacts.count({ where: newContactsWhere }),
    prisma.contacts.count({ where: { ...whereClause, is_blocked: true } }),
    prisma.contacts.aggregate({
      where: whereClause,
      _avg: { engagement_score: true }
    })
  ]);

  // Count active contacts (contacted in the period)
  const active = await prisma.contacts.count({
    where: {
      ...whereClause,
      last_contacted_at: {
        gte: startDate,
        lte: endDate
      }
    }
  });

  return {
    total,
    new: newContacts,
    active,
    blocked,
    avgEngagementScore: engagementScores._avg.engagement_score || 0
  };
}

/**
 * Aggregate conversation metrics
 */
async function aggregateConversationMetrics(whereClause) {
  const [total, open, closed] = await Promise.all([
    prisma.conversations.count({ where: whereClause }),
    prisma.conversations.count({ where: { ...whereClause, status: 'open' } }),
    prisma.conversations.count({ where: { ...whereClause, status: 'closed' } })
  ]);

  // Calculate average response time (simplified - would need more complex query in production)
  const avgResponseTime = 0; // TODO: Implement response time calculation

  return {
    total,
    open,
    closed,
    avgResponseTime
  };
}

/**
 * Get real-time metrics with Redis caching
 * @param {string} teamId - Team ID
 * @param {string|null} whatsappAccountId - WhatsApp Account ID
 * @returns {Promise<Object>} Real-time metrics
 */
async function getRealTimeMetrics(teamId, whatsappAccountId = null) {
  const cacheKey = `analytics:realtime:${teamId}:${whatsappAccountId || 'all'}`;

  try {
    // Try to get from cache
    const cached = await redis.get(cacheKey);
    if (cached) {
      logger.debug(`Cache hit for real-time metrics: ${cacheKey}`);
      return cached;
    }

    // Calculate real-time metrics
    const today = new Date();
    const startOfDay = new Date(today.setHours(0, 0, 0, 0));
    const endOfDay = new Date(today.setHours(23, 59, 59, 999));

    const metrics = await aggregateMetrics(teamId, whatsappAccountId, startOfDay, endOfDay);

    // Cache for 30 seconds
    await redis.set(cacheKey, metrics, CACHE_TTL.REAL_TIME_METRICS);

    return metrics;
  } catch (error) {
    logger.error(`Error getting real-time metrics: ${error.message}`, { error, teamId, whatsappAccountId });
    throw error;
  }
}

/**
 * Get dashboard metrics with caching
 * @param {string} teamId - Team ID
 * @param {number} days - Number of days to look back
 * @returns {Promise<Object>} Dashboard metrics
 */
async function getDashboardMetrics(teamId, days = 30) {
  const cacheKey = `analytics:dashboard:${teamId}:${days}d`;

  try {
    // Try to get from cache
    const cached = await redis.get(cacheKey);
    if (cached) {
      logger.debug(`Cache hit for dashboard metrics: ${cacheKey}`);
      return cached;
    }

    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Get daily snapshots for the period
    const snapshots = await prisma.analytics_snapshots.findMany({
      where: {
        team_id: teamId,
        snapshot_type: 'Daily',
        date: {
          gte: startDate,
          lte: endDate
        }
      },
      orderBy: {
        date: 'asc'
      }
    });

    // Aggregate snapshot data
    const aggregated = aggregateSnapshots(snapshots);

    // Calculate growth rates
    const previousPeriodStart = new Date(startDate);
    previousPeriodStart.setDate(previousPeriodStart.getDate() - days);
    
    const previousSnapshots = await prisma.analytics_snapshots.findMany({
      where: {
        team_id: teamId,
        snapshot_type: 'Daily',
        date: {
          gte: previousPeriodStart,
          lt: startDate
        }
      }
    });

    const previousAggregated = aggregateSnapshots(previousSnapshots);
    const growthRates = calculateGrowthRates(aggregated, previousAggregated);

    const dashboardData = {
      current: aggregated,
      previous: previousAggregated,
      growth: growthRates,
      period: {
        start: startDate.toISOString(),
        end: endDate.toISOString(),
        days
      }
    };

    // Cache for 5 minutes
    await redis.set(cacheKey, dashboardData, CACHE_TTL.DASHBOARD_METRICS);

    return dashboardData;
  } catch (error) {
    logger.error(`Error getting dashboard metrics: ${error.message}`, { error, teamId, days });
    throw error;
  }
}

/**
 * Aggregate multiple snapshots into summary metrics
 */
function aggregateSnapshots(snapshots) {
  if (snapshots.length === 0) {
    return {
      messages: { total: 0, sent: 0, delivered: 0, read: 0, failed: 0 },
      campaigns: { total: 0, completed: 0 },
      contacts: { total: 0, new: 0 },
      conversations: { total: 0 }
    };
  }

  const aggregated = {
    messages: { total: 0, sent: 0, delivered: 0, read: 0, failed: 0, replied: 0 },
    campaigns: { total: 0, completed: 0, active: 0 },
    contacts: { total: 0, new: 0, active: 0 },
    conversations: { total: 0, open: 0, closed: 0 }
  };

  snapshots.forEach(snapshot => {
    const metrics = snapshot.metrics;
    
    if (metrics.messages) {
      aggregated.messages.total += metrics.messages.total || 0;
      aggregated.messages.sent += metrics.messages.sent || 0;
      aggregated.messages.delivered += metrics.messages.delivered || 0;
      aggregated.messages.read += metrics.messages.read || 0;
      aggregated.messages.failed += metrics.messages.failed || 0;
      aggregated.messages.replied += metrics.messages.replied || 0;
    }

    if (metrics.campaigns) {
      aggregated.campaigns.total += metrics.campaigns.total || 0;
      aggregated.campaigns.completed += metrics.campaigns.completed || 0;
      aggregated.campaigns.active += metrics.campaigns.active || 0;
    }

    if (metrics.contacts) {
      aggregated.contacts.new += metrics.contacts.new || 0;
    }

    if (metrics.conversations) {
      aggregated.conversations.total += metrics.conversations.total || 0;
    }
  });

  // Use latest snapshot for current totals
  const latestMetrics = snapshots[snapshots.length - 1].metrics;
  if (latestMetrics.contacts) {
    aggregated.contacts.total = latestMetrics.contacts.total || 0;
    aggregated.contacts.active = latestMetrics.contacts.active || 0;
  }
  if (latestMetrics.conversations) {
    aggregated.conversations.open = latestMetrics.conversations.open || 0;
    aggregated.conversations.closed = latestMetrics.conversations.closed || 0;
  }

  return aggregated;
}

/**
 * Calculate growth rates between two periods
 */
function calculateGrowthRates(current, previous) {
  return {
    messages: calculateGrowthRate(current.messages.total, previous.messages.total),
    campaigns: calculateGrowthRate(current.campaigns.total, previous.campaigns.total),
    contacts: calculateGrowthRate(current.contacts.new, previous.contacts.new),
    conversations: calculateGrowthRate(current.conversations.total, previous.conversations.total)
  };
}

/**
 * Invalidate analytics cache for a team
 * @param {string} teamId - Team ID
 */
async function invalidateCache(teamId) {
  try {
    const pattern = `analytics:*:${teamId}:*`;
    const deletedCount = await redis.delPattern(pattern);
    
    if (deletedCount > 0) {
      logger.info(`Invalidated ${deletedCount} analytics cache keys for team ${teamId}`);
    }
  } catch (error) {
    logger.error(`Error invalidating analytics cache: ${error.message}`, { error, teamId });
  }
}

export default {
  generateSnapshot,
  getRealTimeMetrics,
  getDashboardMetrics,
  invalidateCache,
  aggregateMetrics,
  getDateRange
};
