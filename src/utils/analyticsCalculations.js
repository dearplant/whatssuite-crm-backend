/**
 * Analytics Calculation Utilities
 * Provides functions to calculate various analytics metrics
 */

/**
 * Calculate delivery rate as a percentage
 * @param {number} delivered - Number of delivered messages
 * @param {number} sent - Number of sent messages
 * @returns {number} Delivery rate percentage (0-100)
 */
function calculateDeliveryRate(delivered, sent) {
  if (!sent || sent === 0) return 0;
  return parseFloat(((delivered / sent) * 100).toFixed(2));
}

/**
 * Calculate read rate as a percentage
 * @param {number} read - Number of read messages
 * @param {number} delivered - Number of delivered messages
 * @returns {number} Read rate percentage (0-100)
 */
function calculateReadRate(read, delivered) {
  if (!delivered || delivered === 0) return 0;
  return parseFloat(((read / delivered) * 100).toFixed(2));
}

/**
 * Calculate engagement rate as a percentage
 * @param {number} engaged - Number of engaged users (replied, clicked, etc.)
 * @param {number} delivered - Number of delivered messages
 * @returns {number} Engagement rate percentage (0-100)
 */
function calculateEngagementRate(engaged, delivered) {
  if (!delivered || delivered === 0) return 0;
  return parseFloat(((engaged / delivered) * 100).toFixed(2));
}

/**
 * Calculate reply rate as a percentage
 * @param {number} replied - Number of messages with replies
 * @param {number} sent - Number of sent messages
 * @returns {number} Reply rate percentage (0-100)
 */
function calculateReplyRate(replied, sent) {
  if (!sent || sent === 0) return 0;
  return parseFloat(((replied / sent) * 100).toFixed(2));
}

/**
 * Calculate failure rate as a percentage
 * @param {number} failed - Number of failed messages
 * @param {number} total - Total number of messages attempted
 * @returns {number} Failure rate percentage (0-100)
 */
function calculateFailureRate(failed, total) {
  if (!total || total === 0) return 0;
  return parseFloat(((failed / total) * 100).toFixed(2));
}

/**
 * Calculate average response time in seconds
 * @param {number} totalResponseTime - Sum of all response times in seconds
 * @param {number} count - Number of responses
 * @returns {number} Average response time in seconds
 */
function calculateAverageResponseTime(totalResponseTime, count) {
  if (!count || count === 0) return 0;
  return parseFloat((totalResponseTime / count).toFixed(2));
}

/**
 * Calculate conversion rate as a percentage
 * @param {number} conversions - Number of conversions
 * @param {number} total - Total number of opportunities
 * @returns {number} Conversion rate percentage (0-100)
 */
function calculateConversionRate(conversions, total) {
  if (!total || total === 0) return 0;
  return parseFloat(((conversions / total) * 100).toFixed(2));
}

/**
 * Calculate growth rate as a percentage
 * @param {number} current - Current value
 * @param {number} previous - Previous value
 * @returns {number} Growth rate percentage (can be negative)
 */
function calculateGrowthRate(current, previous) {
  if (!previous || previous === 0) {
    return current > 0 ? 100 : 0;
  }
  return parseFloat((((current - previous) / previous) * 100).toFixed(2));
}

/**
 * Calculate campaign performance score (0-100)
 * @param {Object} metrics - Campaign metrics
 * @returns {number} Performance score (0-100)
 */
function calculateCampaignScore(metrics) {
  const {
    deliveryRate = 0,
    readRate = 0,
    replyRate = 0,
    failureRate = 0
  } = metrics;

  // Weighted scoring: delivery (30%), read (30%), reply (30%), failure penalty (10%)
  const score = (
    (deliveryRate * 0.3) +
    (readRate * 0.3) +
    (replyRate * 0.3) -
    (failureRate * 0.1)
  );

  return Math.max(0, Math.min(100, parseFloat(score.toFixed(2))));
}

/**
 * Calculate contact engagement score (0-100)
 * @param {Object} metrics - Contact engagement metrics
 * @returns {number} Engagement score (0-100)
 */
function calculateContactEngagementScore(metrics) {
  const {
    totalMessages = 0,
    repliedMessages = 0,
    lastMessageDaysAgo = 999,
    campaignsReceived = 0,
    campaignsEngaged = 0
  } = metrics;

  let score = 0;

  // Message activity (40 points max)
  if (totalMessages > 0) {
    score += Math.min(40, totalMessages * 2);
  }

  // Reply rate (30 points max)
  if (totalMessages > 0) {
    const replyRate = (repliedMessages / totalMessages) * 100;
    score += (replyRate / 100) * 30;
  }

  // Recency (20 points max)
  if (lastMessageDaysAgo < 7) {
    score += 20;
  } else if (lastMessageDaysAgo < 30) {
    score += 15;
  } else if (lastMessageDaysAgo < 90) {
    score += 10;
  } else if (lastMessageDaysAgo < 180) {
    score += 5;
  }

  // Campaign engagement (10 points max)
  if (campaignsReceived > 0) {
    const campaignEngagementRate = (campaignsEngaged / campaignsReceived) * 100;
    score += (campaignEngagementRate / 100) * 10;
  }

  return Math.min(100, parseFloat(score.toFixed(2)));
}

export {
  calculateDeliveryRate,
  calculateReadRate,
  calculateEngagementRate,
  calculateReplyRate,
  calculateFailureRate,
  calculateAverageResponseTime,
  calculateConversionRate,
  calculateGrowthRate,
  calculateCampaignScore,
  calculateContactEngagementScore
};
