/**
 * Analytics Controller
 * Handles analytics-related HTTP requests
 */

import analyticsService from '../services/analyticsService.js';
import flowAnalyticsService from '../services/flowAnalyticsService.js';
import logger from '../utils/logger.js';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Get overview analytics (key metrics summary)
 * GET /api/v1/analytics/overview
 */
export async function getOverview(req, res) {
  try {
    const { startDate, endDate, compareWith } = req.query;
    const teamId = req.user.teamId;
    const whatsappAccountId = req.query.accountId || null;

    // Parse dates
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();

    // Get current period metrics
    const currentMetrics = await analyticsService.aggregateMetrics(
      teamId,
      whatsappAccountId,
      start,
      end
    );

    // Get comparison metrics if requested
    let comparisonMetrics = null;
    let growth = null;

    if (compareWith === 'previous') {
      const daysDiff = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
      const compareStart = new Date(start);
      compareStart.setDate(compareStart.getDate() - daysDiff);
      const compareEnd = new Date(start);
      compareEnd.setDate(compareEnd.getDate() - 1);

      comparisonMetrics = await analyticsService.aggregateMetrics(
        teamId,
        whatsappAccountId,
        compareStart,
        compareEnd
      );

      // Calculate growth rates
      growth = {
        messages: calculateGrowth(currentMetrics.messages.total, comparisonMetrics.messages.total),
        campaigns: calculateGrowth(currentMetrics.campaigns.total, comparisonMetrics.campaigns.total),
        contacts: calculateGrowth(currentMetrics.contacts.new, comparisonMetrics.contacts.new),
      };
    }

    res.json({
      success: true,
      data: {
        current: currentMetrics,
        comparison: comparisonMetrics,
        growth,
        period: {
          start: start.toISOString(),
          end: end.toISOString(),
        },
      },
    });
  } catch (error) {
    logger.error('Error in getOverview:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
}

/**
 * Get message analytics with filters
 * GET /api/v1/analytics/messages
 */
export async function getMessageAnalytics(req, res) {
  try {
    const { startDate, endDate, accountId, groupBy } = req.query;
    const teamId = req.user.teamId;

    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();

    const whereClause = {
      team_id: teamId,
      created_at: {
        gte: start,
        lte: end,
      },
    };

    if (accountId) {
      whereClause.account_id = accountId;
    }

    // Get message statistics
    const [totalMessages, statusBreakdown, typeBreakdown, directionBreakdown] = await Promise.all([
      prisma.messages.count({ where: whereClause }),
      prisma.messages.groupBy({
        by: ['status'],
        where: whereClause,
        _count: true,
      }),
      prisma.messages.groupBy({
        by: ['messageType'],
        where: whereClause,
        _count: true,
      }),
      prisma.messages.groupBy({
        by: ['senderType'],
        where: whereClause,
        _count: true,
      }),
    ]);

    // Get time series data if groupBy is specified
    let timeSeries = null;
    if (groupBy === 'day' || groupBy === 'week' || groupBy === 'month') {
      timeSeries = await getMessageTimeSeries(teamId, accountId, start, end, groupBy);
    }

    // Calculate rates
    const sent = statusBreakdown.find(s => s.status === 'sent')?._count || 0;
    const delivered = statusBreakdown.find(s => s.status === 'delivered')?._count || 0;
    const read = statusBreakdown.find(s => s.status === 'read')?._count || 0;
    const failed = statusBreakdown.find(s => s.status === 'failed')?._count || 0;

    const deliveryRate = sent > 0 ? ((delivered / sent) * 100).toFixed(2) : 0;
    const readRate = delivered > 0 ? ((read / delivered) * 100).toFixed(2) : 0;
    const failureRate = totalMessages > 0 ? ((failed / totalMessages) * 100).toFixed(2) : 0;

    res.json({
      success: true,
      data: {
        total: totalMessages,
        byStatus: statusBreakdown.reduce((acc, item) => {
          acc[item.status] = item._count;
          return acc;
        }, {}),
        byType: typeBreakdown.reduce((acc, item) => {
          acc[item.messageType] = item._count;
          return acc;
        }, {}),
        byDirection: directionBreakdown.reduce((acc, item) => {
          acc[item.senderType] = item._count;
          return acc;
        }, {}),
        rates: {
          delivery: parseFloat(deliveryRate),
          read: parseFloat(readRate),
          failure: parseFloat(failureRate),
        },
        timeSeries,
        period: {
          start: start.toISOString(),
          end: end.toISOString(),
        },
      },
    });
  } catch (error) {
    logger.error('Error in getMessageAnalytics:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
}

/**
 * Get campaign analytics
 * GET /api/v1/analytics/campaigns
 */
export async function getCampaignAnalytics(req, res) {
  try {
    const { startDate, endDate, accountId, status } = req.query;
    const teamId = req.user.teamId;

    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();

    const whereClause = {
      team_id: teamId,
      created_at: {
        gte: start,
        lte: end,
      },
    };

    if (accountId) {
      whereClause.account_id = accountId;
    }

    if (status) {
      whereClause.status = status;
    }

    // Get campaign statistics
    const campaigns = await prisma.campaigns.findMany({
      where: whereClause,
      select: {
        id: true,
        name: true,
        status: true,
        total_recipients: true,
        messages_sent: true,
        messages_delivered: true,
        messages_read: true,
        messages_replied: true,
        messages_failed: true,
        created_at: true,
        started_at: true,
        completed_at: true,
      },
    });

    // Calculate aggregate metrics
    const totalCampaigns = campaigns.length;
    const totalRecipients = campaigns.reduce((sum, c) => sum + (c.total_recipients || 0), 0);
    const totalSent = campaigns.reduce((sum, c) => sum + (c.messages_sent || 0), 0);
    const totalDelivered = campaigns.reduce((sum, c) => sum + (c.messages_delivered || 0), 0);
    const totalRead = campaigns.reduce((sum, c) => sum + (c.messages_read || 0), 0);
    const totalReplied = campaigns.reduce((sum, c) => sum + (c.messages_replied || 0), 0);
    const totalFailed = campaigns.reduce((sum, c) => sum + (c.messages_failed || 0), 0);

    // Calculate average rates
    const avgDeliveryRate = totalSent > 0 ? ((totalDelivered / totalSent) * 100).toFixed(2) : 0;
    const avgReadRate = totalDelivered > 0 ? ((totalRead / totalDelivered) * 100).toFixed(2) : 0;
    const avgReplyRate = totalSent > 0 ? ((totalReplied / totalSent) * 100).toFixed(2) : 0;

    // Group by status
    const byStatus = campaigns.reduce((acc, campaign) => {
      acc[campaign.status] = (acc[campaign.status] || 0) + 1;
      return acc;
    }, {});

    // Top performing campaigns
    const topCampaigns = campaigns
      .filter(c => c.messages_sent > 0)
      .map(c => ({
        id: c.id,
        name: c.name,
        recipients: c.total_recipients,
        sent: c.messages_sent,
        delivered: c.messages_delivered,
        read: c.messages_read,
        replied: c.messages_replied,
        deliveryRate: c.messages_sent > 0 ? ((c.messages_delivered / c.messages_sent) * 100).toFixed(2) : 0,
        readRate: c.messages_delivered > 0 ? ((c.messages_read / c.messages_delivered) * 100).toFixed(2) : 0,
        replyRate: c.messages_sent > 0 ? ((c.messages_replied / c.messages_sent) * 100).toFixed(2) : 0,
      }))
      .sort((a, b) => parseFloat(b.readRate) - parseFloat(a.readRate))
      .slice(0, 10);

    res.json({
      success: true,
      data: {
        summary: {
          total: totalCampaigns,
          totalRecipients,
          totalSent,
          totalDelivered,
          totalRead,
          totalReplied,
          totalFailed,
        },
        rates: {
          avgDelivery: parseFloat(avgDeliveryRate),
          avgRead: parseFloat(avgReadRate),
          avgReply: parseFloat(avgReplyRate),
        },
        byStatus,
        topCampaigns,
        period: {
          start: start.toISOString(),
          end: end.toISOString(),
        },
      },
    });
  } catch (error) {
    logger.error('Error in getCampaignAnalytics:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
}

/**
 * Get contact analytics (growth and segmentation stats)
 * GET /api/v1/analytics/contacts
 */
export async function getContactAnalytics(req, res) {
  try {
    const { startDate, endDate, groupBy } = req.query;
    const teamId = req.user.teamId;

    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();

    // Get total contacts
    const totalContacts = await prisma.contacts.count({
      where: { team_id: teamId, deleted_at: null },
    });

    // Get new contacts in period
    const newContacts = await prisma.contacts.count({
      where: {
        team_id: teamId,
        created_at: {
          gte: start,
          lte: end,
        },
        deleted_at: null,
      },
    });

    // Get active contacts (contacted in period)
    const activeContacts = await prisma.contacts.count({
      where: {
        team_id: teamId,
        last_contacted_at: {
          gte: start,
          lte: end,
        },
        deleted_at: null,
      },
    });

    // Get blocked contacts
    const blockedContacts = await prisma.contacts.count({
      where: {
        team_id: teamId,
        is_blocked: true,
        deleted_at: null,
      },
    });

    // Get contacts by source
    const bySource = await prisma.contacts.groupBy({
      by: ['source'],
      where: {
        team_id: teamId,
        created_at: {
          gte: start,
          lte: end,
        },
        deleted_at: null,
      },
      _count: true,
    });

    // Get time series data if groupBy is specified
    let growthTimeSeries = null;
    if (groupBy === 'day' || groupBy === 'week' || groupBy === 'month') {
      growthTimeSeries = await getContactGrowthTimeSeries(teamId, start, end, groupBy);
    }

    // Get average engagement score
    const engagementStats = await prisma.contacts.aggregate({
      where: {
        team_id: teamId,
        deleted_at: null,
      },
      _avg: {
        engagement_score: true,
      },
    });

    // Get top engaged contacts
    const topEngaged = await prisma.contacts.findMany({
      where: {
        team_id: teamId,
        deleted_at: null,
      },
      select: {
        id: true,
        first_name: true,
        last_name: true,
        phone: true,
        engagement_score: true,
        last_contacted_at: true,
      },
      orderBy: {
        engagement_score: 'desc',
      },
      take: 10,
    });

    res.json({
      success: true,
      data: {
        summary: {
          total: totalContacts,
          new: newContacts,
          active: activeContacts,
          blocked: blockedContacts,
          avgEngagementScore: engagementStats._avg.engagement_score || 0,
        },
        bySource: bySource.reduce((acc, item) => {
          acc[item.source || 'unknown'] = item._count;
          return acc;
        }, {}),
        growthTimeSeries,
        topEngaged,
        period: {
          start: start.toISOString(),
          end: end.toISOString(),
        },
      },
    });
  } catch (error) {
    logger.error('Error in getContactAnalytics:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
}

/**
 * Get e-commerce revenue analytics
 * GET /api/v1/analytics/revenue
 */
export async function getRevenueAnalytics(req, res) {
  try {
    const { startDate, endDate, integrationId, groupBy } = req.query;
    const teamId = req.user.teamId;

    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();

    const whereClause = {
      team_id: teamId,
      created_at: {
        gte: start,
        lte: end,
      },
    };

    if (integrationId) {
      whereClause.integration_id = integrationId;
    }

    // Get order statistics
    const [totalOrders, ordersByStatus, revenueStats] = await Promise.all([
      prisma.ecommerce_orders.count({ where: whereClause }),
      prisma.ecommerce_orders.groupBy({
        by: ['status'],
        where: whereClause,
        _count: true,
        _sum: {
          total_amount: true,
        },
      }),
      prisma.ecommerce_orders.aggregate({
        where: whereClause,
        _sum: {
          total_amount: true,
        },
        _avg: {
          total_amount: true,
        },
      }),
    ]);

    // Get abandoned cart statistics
    const [totalAbandonedCarts, recoveredCarts, abandonedCartValue] = await Promise.all([
      prisma.abandoned_carts.count({
        where: {
          team_id: teamId,
          abandoned_at: {
            gte: start,
            lte: end,
          },
        },
      }),
      prisma.abandoned_carts.count({
        where: {
          team_id: teamId,
          status: 'Recovered',
          recovered_at: {
            gte: start,
            lte: end,
          },
        },
      }),
      prisma.abandoned_carts.aggregate({
        where: {
          team_id: teamId,
          abandoned_at: {
            gte: start,
            lte: end,
          },
        },
        _sum: {
          total_amount: true,
        },
      }),
    ]);

    // Get time series data if groupBy is specified
    let revenueTimeSeries = null;
    if (groupBy === 'day' || groupBy === 'week' || groupBy === 'month') {
      revenueTimeSeries = await getRevenueTimeSeries(teamId, integrationId, start, end, groupBy);
    }

    // Calculate recovery rate
    const recoveryRate = totalAbandonedCarts > 0 
      ? ((recoveredCarts / totalAbandonedCarts) * 100).toFixed(2) 
      : 0;

    res.json({
      success: true,
      data: {
        orders: {
          total: totalOrders,
          totalRevenue: revenueStats._sum.total_amount || 0,
          avgOrderValue: revenueStats._avg.total_amount || 0,
          byStatus: ordersByStatus.reduce((acc, item) => {
            acc[item.status] = {
              count: item._count,
              revenue: item._sum.total_amount || 0,
            };
            return acc;
          }, {}),
        },
        abandonedCarts: {
          total: totalAbandonedCarts,
          recovered: recoveredCarts,
          totalValue: abandonedCartValue._sum.total_amount || 0,
          recoveryRate: parseFloat(recoveryRate),
        },
        revenueTimeSeries,
        period: {
          start: start.toISOString(),
          end: end.toISOString(),
        },
      },
    });
  } catch (error) {
    logger.error('Error in getRevenueAnalytics:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
}

/**
 * Get chatbot performance metrics
 * GET /api/v1/analytics/chatbots
 */
export async function getChatbotAnalytics(req, res) {
  try {
    const { startDate, endDate, chatbotId } = req.query;
    const teamId = req.user.teamId;

    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();

    // Build where clause for chatbots
    const chatbotWhere = {
      user_id: req.user.id,
    };

    if (chatbotId) {
      chatbotWhere.id = chatbotId;
    }

    // Get chatbot statistics
    const chatbots = await prisma.chatbots.findMany({
      where: chatbotWhere,
      select: {
        id: true,
        name: true,
        is_active: true,
        total_conversations: true,
        total_messages: true,
        avg_response_time: true,
        avg_satisfaction_score: true,
      },
    });

    // Get conversation statistics for the period
    const conversationWhere = {
      chatbot_id: chatbotId || { in: chatbots.map(c => c.id) },
      started_at: {
        gte: start,
        lte: end,
      },
    };

    const [totalConversations, conversationsByStatus, satisfactionStats] = await Promise.all([
      prisma.chatbot_conversations.count({ where: conversationWhere }),
      prisma.chatbot_conversations.groupBy({
        by: ['status'],
        where: conversationWhere,
        _count: true,
      }),
      prisma.chatbot_conversations.aggregate({
        where: {
          ...conversationWhere,
          satisfaction_score: { not: null },
        },
        _avg: {
          satisfaction_score: true,
        },
      }),
    ]);

    // Get message statistics
    const messageStats = await prisma.chatbot_messages.aggregate({
      where: {
        chatbot_conversation_id: {
          in: (await prisma.chatbot_conversations.findMany({
            where: conversationWhere,
            select: { id: true },
          })).map(c => c.id),
        },
      },
      _sum: {
        tokens_used: true,
      },
      _avg: {
        response_time: true,
      },
      _count: true,
    });

    // Calculate handoff rate
    const handoffCount = conversationsByStatus.find(s => s.status === 'HandedOff')?._count || 0;
    const handoffRate = totalConversations > 0 
      ? ((handoffCount / totalConversations) * 100).toFixed(2) 
      : 0;

    // Calculate completion rate
    const completedCount = conversationsByStatus.find(s => s.status === 'Completed')?._count || 0;
    const completionRate = totalConversations > 0 
      ? ((completedCount / totalConversations) * 100).toFixed(2) 
      : 0;

    // Get per-chatbot performance
    const chatbotPerformance = chatbots.map(chatbot => ({
      id: chatbot.id,
      name: chatbot.name,
      isActive: chatbot.is_active,
      totalConversations: chatbot.total_conversations,
      totalMessages: chatbot.total_messages,
      avgResponseTime: chatbot.avg_response_time,
      avgSatisfactionScore: chatbot.avg_satisfaction_score,
    }));

    res.json({
      success: true,
      data: {
        summary: {
          totalConversations,
          totalMessages: messageStats._count,
          totalTokensUsed: messageStats._sum.tokens_used || 0,
          avgResponseTime: messageStats._avg.response_time || 0,
          avgSatisfactionScore: satisfactionStats._avg.satisfaction_score || 0,
        },
        rates: {
          handoff: parseFloat(handoffRate),
          completion: parseFloat(completionRate),
        },
        byStatus: conversationsByStatus.reduce((acc, item) => {
          acc[item.status] = item._count;
          return acc;
        }, {}),
        chatbots: chatbotPerformance,
        period: {
          start: start.toISOString(),
          end: end.toISOString(),
        },
      },
    });
  } catch (error) {
    logger.error('Error in getChatbotAnalytics:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
}

// ============= Flow Analytics (existing) =============

/**
 * Get flow analytics for a specific flow
 * GET /api/v1/analytics/flows/:flowId
 */
export async function getFlowAnalytics(req, res) {
  try {
    const { flowId } = req.params;
    const { startDate, endDate, limit } = req.query;
    const teamId = req.user.teamId;

    const analytics = await flowAnalyticsService.getFlowAnalytics(flowId, teamId, {
      startDate,
      endDate,
      limit: limit ? parseInt(limit) : undefined,
    });

    res.json({
      success: true,
      data: analytics,
    });
  } catch (error) {
    logger.error('Error in getFlowAnalytics:', error);
    res.status(error.message === 'Flow not found' ? 404 : 500).json({
      success: false,
      error: error.message,
    });
  }
}

/**
 * Get analytics for all flows
 * GET /api/v1/analytics/flows
 */
export async function getAllFlowsAnalytics(req, res) {
  try {
    const { startDate, endDate, sortBy, sortOrder } = req.query;
    const teamId = req.user.teamId;

    const analytics = await flowAnalyticsService.getAllFlowsAnalytics(teamId, {
      startDate,
      endDate,
      sortBy,
      sortOrder,
    });

    res.json({
      success: true,
      data: analytics,
    });
  } catch (error) {
    logger.error('Error in getAllFlowsAnalytics:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
}

// ============= Helper Functions =============

/**
 * Calculate growth percentage
 */
function calculateGrowth(current, previous) {
  if (previous === 0) return current > 0 ? 100 : 0;
  return parseFloat((((current - previous) / previous) * 100).toFixed(2));
}

/**
 * Get message time series data
 */
async function getMessageTimeSeries(teamId, accountId, start, end, groupBy) {
  const whereClause = {
    team_id: teamId,
    created_at: {
      gte: start,
      lte: end,
    },
  };

  if (accountId) {
    whereClause.account_id = accountId;
  }

  // Get all messages
  const messages = await prisma.messages.findMany({
    where: whereClause,
    select: {
      created_at: true,
      status: true,
    },
  });

  // Group by time period
  return groupByTimePeriod(messages, groupBy, 'created_at');
}

/**
 * Get contact growth time series data
 */
async function getContactGrowthTimeSeries(teamId, start, end, groupBy) {
  const contacts = await prisma.contacts.findMany({
    where: {
      team_id: teamId,
      created_at: {
        gte: start,
        lte: end,
      },
      deleted_at: null,
    },
    select: {
      created_at: true,
    },
  });

  return groupByTimePeriod(contacts, groupBy, 'created_at');
}

/**
 * Get revenue time series data
 */
async function getRevenueTimeSeries(teamId, integrationId, start, end, groupBy) {
  const whereClause = {
    team_id: teamId,
    created_at: {
      gte: start,
      lte: end,
    },
  };

  if (integrationId) {
    whereClause.integration_id = integrationId;
  }

  const orders = await prisma.ecommerce_orders.findMany({
    where: whereClause,
    select: {
      created_at: true,
      total_amount: true,
    },
  });

  return groupByTimePeriod(orders, groupBy, 'created_at', 'total_amount');
}

/**
 * Group data by time period
 */
function groupByTimePeriod(data, groupBy, dateField, valueField = null) {
  const grouped = {};

  data.forEach(item => {
    const date = new Date(item[dateField]);
    let key;

    if (groupBy === 'day') {
      key = date.toISOString().split('T')[0];
    } else if (groupBy === 'week') {
      const weekStart = new Date(date);
      const day = weekStart.getDay();
      const diff = day === 0 ? -6 : 1 - day;
      weekStart.setDate(weekStart.getDate() + diff);
      key = weekStart.toISOString().split('T')[0];
    } else if (groupBy === 'month') {
      key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    }

    if (!grouped[key]) {
      grouped[key] = valueField ? 0 : 0;
    }

    if (valueField) {
      grouped[key] += parseFloat(item[valueField]) || 0;
    } else {
      grouped[key]++;
    }
  });

  // Convert to array and sort by date
  return Object.entries(grouped)
    .map(([date, value]) => ({ date, value }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

export default {
  getOverview,
  getMessageAnalytics,
  getCampaignAnalytics,
  getContactAnalytics,
  getRevenueAnalytics,
  getChatbotAnalytics,
  getFlowAnalytics,
  getAllFlowsAnalytics,
};
