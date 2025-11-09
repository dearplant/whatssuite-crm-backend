# Analytics System Documentation

## Overview

The Analytics System provides comprehensive data aggregation, caching, and reporting capabilities for the WhatsApp CRM platform. It generates daily, weekly, and monthly snapshots of key metrics and provides real-time analytics with Redis caching.

## Architecture

### Components

1. **Analytics Snapshots** - Pre-aggregated metrics stored in the database
2. **Real-Time Metrics** - Live data with 30-second Redis caching
3. **Dashboard Metrics** - Aggregated historical data with 5-minute caching
4. **Cron Jobs** - Automated snapshot generation

### Data Flow

```
Messages/Campaigns/Contacts
         ↓
   Aggregation Logic
         ↓
   Analytics Snapshots (DB)
         ↓
   Redis Cache (TTL-based)
         ↓
   API Endpoints
```

## Database Schema

### analytics_snapshots Table

```prisma
model analytics_snapshots {
  id                 String       @id @default(uuid())
  team_id            String
  whatsapp_account_id String?     // null for team-wide metrics
  date               DateTime     @db.Date
  snapshot_type      SnapshotType // Daily, Weekly, Monthly
  metrics            Json         @db.JsonB
  created_at         DateTime     @default(now())
  
  @@unique([team_id, whatsapp_account_id, date, snapshot_type])
  @@index([team_id, date])
  @@index([date])
  @@index([snapshot_type])
}

enum SnapshotType {
  Daily
  Weekly
  Monthly
}
```

### Metrics JSON Structure

```json
{
  "period": {
    "start": "2025-11-08T00:00:00.000Z",
    "end": "2025-11-08T23:59:59.999Z"
  },
  "messages": {
    "total": 1500,
    "sent": 1200,
    "delivered": 1100,
    "read": 900,
    "failed": 100,
    "replied": 300,
    "inbound": 500,
    "outbound": 1000,
    "deliveryRate": 91.67,
    "readRate": 81.82,
    "replyRate": 25.00,
    "failureRate": 6.67
  },
  "campaigns": {
    "total": 10,
    "active": 2,
    "completed": 7,
    "failed": 1,
    "totalRecipients": 5000,
    "messagesSent": 4800,
    "avgDeliveryRate": 92.50,
    "avgReadRate": 78.30
  },
  "contacts": {
    "total": 2500,
    "new": 150,
    "active": 800,
    "blocked": 25,
    "avgEngagementScore": 65.5
  },
  "conversations": {
    "total": 1200,
    "open": 300,
    "closed": 900,
    "avgResponseTime": 0
  },
  "generatedAt": "2025-11-09T02:00:00.000Z"
}
```

## Services

### analyticsService.js

Main service for analytics operations.

#### Key Functions

**generateSnapshot(teamId, whatsappAccountId, date, snapshotType)**
- Generates analytics snapshot for a specific date and type
- Aggregates metrics from messages, campaigns, contacts, and conversations
- Upserts snapshot to database
- Returns: Created/updated snapshot object

**getRealTimeMetrics(teamId, whatsappAccountId)**
- Fetches current day metrics with 30-second Redis caching
- Returns: Real-time metrics object

**getDashboardMetrics(teamId, days)**
- Aggregates daily snapshots for specified period
- Calculates growth rates vs previous period
- Caches for 5 minutes in Redis
- Returns: Dashboard data with current, previous, and growth metrics

**invalidateCache(teamId)**
- Clears all analytics cache keys for a team
- Used when data changes require fresh calculations

### analyticsCalculations.js

Utility functions for calculating analytics metrics.

#### Available Calculations

- `calculateDeliveryRate(delivered, sent)` - Delivery rate percentage
- `calculateReadRate(read, delivered)` - Read rate percentage
- `calculateEngagementRate(engaged, delivered)` - Engagement rate percentage
- `calculateReplyRate(replied, sent)` - Reply rate percentage
- `calculateFailureRate(failed, total)` - Failure rate percentage
- `calculateAverageResponseTime(totalTime, count)` - Average response time
- `calculateConversionRate(conversions, total)` - Conversion rate percentage
- `calculateGrowthRate(current, previous)` - Growth rate percentage
- `calculateCampaignScore(metrics)` - Campaign performance score (0-100)
- `calculateContactEngagementScore(metrics)` - Contact engagement score (0-100)

## Cron Jobs

### Daily Snapshot Generation

**Schedule:** Every day at 2:00 AM
**Cron:** `0 2 * * *`

Generates daily snapshots for all teams and their WhatsApp accounts for the previous day.

```javascript
// Manually trigger
await cronScheduler.triggerJob('daily-analytics-snapshot');
```

### Weekly Snapshot Generation

**Schedule:** Every Monday at 3:00 AM
**Cron:** `0 3 * * 1`

Generates weekly snapshots for all teams for the previous week (Monday-Sunday).

```javascript
// Manually trigger
await cronScheduler.triggerJob('weekly-analytics-snapshot');
```

### Monthly Snapshot Generation

**Schedule:** First day of month at 4:00 AM
**Cron:** `0 4 1 * *`

Generates monthly snapshots for all teams for the previous month.

```javascript
// Manually trigger
await cronScheduler.triggerJob('monthly-analytics-snapshot');
```

## Redis Caching Strategy

### Cache Keys

- `analytics:realtime:{teamId}:{accountId}` - Real-time metrics (30s TTL)
- `analytics:dashboard:{teamId}:{days}d` - Dashboard metrics (5min TTL)

### Cache TTL Configuration

```javascript
const CACHE_TTL = {
  REAL_TIME_METRICS: 30,      // 30 seconds
  DASHBOARD_METRICS: 300,     // 5 minutes
  SNAPSHOT_DATA: 3600         // 1 hour
};
```

### Cache Invalidation

Cache is automatically invalidated when:
- New snapshots are generated
- Manual invalidation is triggered via `invalidateCache(teamId)`

## Usage Examples

### Generate Snapshot Manually

```javascript
import analyticsService from './services/analyticsService.js';

// Generate daily snapshot for yesterday
const yesterday = new Date();
yesterday.setDate(yesterday.getDate() - 1);
yesterday.setHours(0, 0, 0, 0);

const snapshot = await analyticsService.generateSnapshot(
  'team-uuid',
  null, // null for team-wide, or account ID for specific account
  yesterday,
  'Daily'
);
```

### Get Real-Time Metrics

```javascript
import analyticsService from './services/analyticsService.js';

// Get real-time metrics for a team
const metrics = await analyticsService.getRealTimeMetrics('team-uuid');

// Get real-time metrics for specific account
const accountMetrics = await analyticsService.getRealTimeMetrics(
  'team-uuid',
  'account-uuid'
);
```

### Get Dashboard Metrics

```javascript
import analyticsService from './services/analyticsService.js';

// Get last 30 days metrics
const dashboard = await analyticsService.getDashboardMetrics('team-uuid', 30);

console.log(dashboard.current);   // Current period metrics
console.log(dashboard.previous);  // Previous period metrics
console.log(dashboard.growth);    // Growth rates
```

### Calculate Custom Metrics

```javascript
import {
  calculateDeliveryRate,
  calculateCampaignScore
} from './utils/analyticsCalculations.js';

// Calculate delivery rate
const deliveryRate = calculateDeliveryRate(950, 1000); // 95.00%

// Calculate campaign score
const score = calculateCampaignScore({
  deliveryRate: 95,
  readRate: 80,
  replyRate: 25,
  failureRate: 5
});
```

## API Integration

### Example Controller Usage

```javascript
import analyticsService from '../services/analyticsService.js';

// GET /api/v1/analytics/overview
export async function getOverview(req, res) {
  try {
    const { teamId } = req.user;
    const metrics = await analyticsService.getRealTimeMetrics(teamId);
    
    res.json({
      success: true,
      data: metrics
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

// GET /api/v1/analytics/dashboard?days=30
export async function getDashboard(req, res) {
  try {
    const { teamId } = req.user;
    const days = parseInt(req.query.days) || 30;
    
    const dashboard = await analyticsService.getDashboardMetrics(teamId, days);
    
    res.json({
      success: true,
      data: dashboard
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}
```

## Performance Considerations

### Database Optimization

1. **Indexes** - Composite indexes on `(team_id, date)` for fast queries
2. **JSONB** - Metrics stored as JSONB for efficient querying
3. **Partitioning** - Consider table partitioning by date for large datasets

### Caching Strategy

1. **Layered Caching** - Different TTLs for different data freshness needs
2. **Cache Warming** - Pre-populate cache during snapshot generation
3. **Selective Invalidation** - Only invalidate affected team's cache

### Query Optimization

1. **Aggregation** - Use database aggregation functions
2. **Batch Processing** - Process teams in batches during cron jobs
3. **Async Operations** - Non-blocking snapshot generation

## Monitoring

### Key Metrics to Monitor

- Snapshot generation success rate
- Cache hit/miss ratio
- Query response times
- Cron job execution times
- Redis memory usage

### Logging

All operations are logged with appropriate levels:
- `INFO` - Successful operations
- `WARN` - Cache misses, retries
- `ERROR` - Failed operations with stack traces

### Health Checks

```javascript
// Check if snapshots are being generated
const latestSnapshot = await prisma.analytics_snapshots.findFirst({
  where: { team_id: teamId },
  orderBy: { created_at: 'desc' }
});

const isHealthy = latestSnapshot && 
  (new Date() - new Date(latestSnapshot.created_at)) < 86400000; // < 24 hours
```

## Troubleshooting

### Snapshots Not Generating

1. Check cron scheduler is initialized
2. Verify database connectivity
3. Check logs for errors
4. Manually trigger job to test

### Cache Not Working

1. Verify Redis connection
2. Check Redis memory limits
3. Verify cache keys are being set
4. Check TTL configuration

### Slow Queries

1. Verify database indexes exist
2. Check for missing aggregations
3. Consider adding read replicas
4. Optimize date range queries

## Migration

To apply the analytics_snapshots table:

```bash
cd backend
npx prisma migrate deploy
```

Or in development:

```bash
npx prisma migrate dev
```

## Testing

### Unit Tests

Test individual calculation functions:

```javascript
import { calculateDeliveryRate } from './utils/analyticsCalculations.js';

test('calculates delivery rate correctly', () => {
  expect(calculateDeliveryRate(90, 100)).toBe(90.00);
  expect(calculateDeliveryRate(0, 100)).toBe(0);
  expect(calculateDeliveryRate(100, 0)).toBe(0);
});
```

### Integration Tests

Test snapshot generation:

```javascript
test('generates daily snapshot', async () => {
  const snapshot = await analyticsService.generateSnapshot(
    testTeamId,
    null,
    new Date(),
    'Daily'
  );
  
  expect(snapshot).toBeDefined();
  expect(snapshot.metrics.messages).toBeDefined();
  expect(snapshot.snapshot_type).toBe('Daily');
});
```

## Future Enhancements

1. **Custom Metrics** - Allow teams to define custom metrics
2. **Alerts** - Automated alerts for metric thresholds
3. **Exports** - CSV/PDF export of analytics data
4. **Comparisons** - Compare metrics across time periods
5. **Forecasting** - Predictive analytics using historical data
6. **Real-time Dashboards** - WebSocket-based live updates
7. **Data Retention** - Automated archival of old snapshots

## References

- [Prisma Documentation](https://www.prisma.io/docs)
- [Redis Caching Best Practices](https://redis.io/docs/manual/patterns/)
- [Node-Cron Documentation](https://github.com/node-cron/node-cron)
