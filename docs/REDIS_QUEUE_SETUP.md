# Redis and Queue Infrastructure Setup

This document describes the Redis and Bull Queue infrastructure setup for the WhatsApp CRM backend.

## Overview

The system uses Redis for caching and as a backing store for Bull queues. Bull queues handle all asynchronous job processing including message sending, campaign execution, flow automation, and more.

## Architecture

### Redis Client

- **Location**: `src/config/redis.js`
- **Features**:
  - Automatic reconnection with exponential backoff
  - Error handling and logging
  - Connection health monitoring
  - Wrapper methods for common operations

### Queue System

- **Location**: `src/queues/index.js`
- **Queue Manager**: Bull (backed by Redis)
- **Monitoring**: Bull Board dashboard

## Available Queues

### 1. Message Queue (`messages`)
- **Purpose**: Individual message sending operations
- **Rate Limit**: 20 messages per minute
- **Retry**: 3 attempts with exponential backoff
- **Priority**: Supports priority levels (1-10)

### 2. Campaign Queue (`campaigns`)
- **Purpose**: Campaign processing and batch message sending
- **Retry**: 2 attempts
- **Features**: Handles large-scale broadcast campaigns

### 3. Flow Queue (`flows`)
- **Purpose**: Automated workflow executions
- **Retry**: 3 attempts
- **Features**: Processes flow triggers and node executions

### 4. Email Queue (`emails`)
- **Purpose**: Email notifications and transactional emails
- **Retry**: 5 attempts
- **Features**: High retry count for reliability

### 5. Webhook Queue (`webhooks`)
- **Purpose**: Outbound webhook deliveries
- **Retry**: 3 attempts with exponential backoff
- **Features**: HMAC signature generation

### 6. AI Queue (`ai`)
- **Purpose**: AI chatbot responses and voice transcription
- **Retry**: 2 attempts
- **Features**: Handles AI provider API calls

### 7. Import Queue (`imports`)
- **Purpose**: Contact imports and bulk operations
- **Retry**: 1 attempt (no retry)
- **Timeout**: 10 minutes for large imports

### 8. Export Queue (`exports`)
- **Purpose**: Data exports and report generation
- **Retry**: 2 attempts
- **Timeout**: 5 minutes

### 9. Analytics Queue (`analytics`)
- **Purpose**: Analytics snapshot generation
- **Retry**: 2 attempts
- **Features**: Daily, weekly, monthly aggregations

### 10. Notification Queue (`notifications`)
- **Purpose**: System notifications and alerts
- **Retry**: 3 attempts
- **Features**: Fast processing for real-time alerts

## Configuration

### Environment Variables

```bash
# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your-redis-password
REDIS_DB=0

# Bull Board Authentication
BULL_BOARD_USERNAME=admin
BULL_BOARD_PASSWORD=admin123
```

### Redis Connection Options

```javascript
{
  socket: {
    host: config.redis.host,
    port: config.redis.port,
    reconnectStrategy: (retries) => {
      if (retries > 10) return new Error('Max reconnection attempts');
      return Math.min(retries * 50, 3000); // Exponential backoff
    }
  },
  password: config.redis.password,
  database: config.redis.db
}
```

### Queue Default Options

```javascript
{
  attempts: 3,
  backoff: {
    type: 'exponential',
    delay: 5000 // Start with 5 seconds
  },
  removeOnComplete: 100,  // Keep last 100 completed
  removeOnFail: 500       // Keep last 500 failed
}
```

## Usage

### Redis Operations

```javascript
import redis from './config/redis.js';

// Set value with TTL
await redis.set('user:123:permissions', permissions, 300); // 5 minutes

// Get value
const permissions = await redis.get('user:123:permissions');

// Delete value
await redis.del('user:123:permissions');

// Check existence
const exists = await redis.exists('user:123:permissions');

// Increment counter
await redis.incr('messages:sent:today');

// Get cached data
const data = await redis.getCached(
  'analytics:dashboard',
  async () => fetchDashboardData(),
  300 // TTL in seconds
);
```

### Queue Operations

```javascript
import { messageQueue, campaignQueue } from './queues/index.js';

// Add job to queue
await messageQueue.add({
  to: '+1234567890',
  content: 'Hello World',
  type: 'text'
});

// Add job with options
await messageQueue.add(
  { to: '+1234567890', content: 'Urgent message' },
  {
    priority: 1,        // High priority
    attempts: 5,        // Override default attempts
    delay: 5000,        // Delay 5 seconds
    removeOnComplete: true
  }
);

// Add delayed job
await campaignQueue.add(
  { campaignId: 'camp-123' },
  { delay: new Date('2025-11-06T10:00:00Z') - Date.now() }
);

// Process jobs
messageQueue.process(10, async (job) => {
  const { to, content } = job.data;
  await sendWhatsAppMessage(to, content);
  return { sent: true, messageId: 'msg-123' };
});
```

## Monitoring

### Bull Board Dashboard

Access the queue monitoring dashboard at:
```
http://localhost:5000/admin/queues
```

**Authentication**: Basic Auth
- Username: `admin` (configurable via `BULL_BOARD_USERNAME`)
- Password: `admin123` (configurable via `BULL_BOARD_PASSWORD`)

**Features**:
- View all queues and their status
- Monitor job counts (waiting, active, completed, failed)
- Inspect individual jobs
- Retry failed jobs
- Clean old jobs
- Pause/resume queues

### Health Check Endpoints

#### Queue Infrastructure Health
```bash
GET /api/v1/queues/health
```

Response:
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "redis": {
      "connected": true
    },
    "queues": {
      "messages": {
        "name": "messages",
        "waiting": 5,
        "active": 2,
        "completed": 1000,
        "failed": 3,
        "delayed": 0,
        "isPaused": false
      }
    },
    "totals": {
      "waiting": 15,
      "active": 5,
      "completed": 5000,
      "failed": 10,
      "delayed": 2
    },
    "timestamp": "2025-11-05T10:00:00Z"
  }
}
```

#### Queue Metrics
```bash
GET /api/v1/queues/metrics
```

#### Queue Statistics
```bash
GET /api/v1/queues/statistics
```

### Application Health Check

The main health check endpoint includes queue status:
```bash
GET /health
```

Response:
```json
{
  "status": "ok",
  "timestamp": "2025-11-05T10:00:00Z",
  "uptime": 3600,
  "environment": "development",
  "redis": {
    "connected": true
  },
  "queues": "healthy"
}
```

## Error Handling

### Redis Errors

The Redis client includes comprehensive error handling:

- **Connection Errors**: Automatic reconnection with exponential backoff
- **Operation Errors**: Logged and return null/false instead of throwing
- **Timeout Errors**: Configurable timeouts for operations

### Queue Errors

Queue jobs include automatic retry logic:

- **Retry Strategy**: Exponential backoff (5s, 10s, 20s, etc.)
- **Max Attempts**: Configurable per queue (default: 3)
- **Failed Jobs**: Stored for inspection and manual retry
- **Error Logging**: All failures logged with context

## Performance Optimization

### Redis Caching Strategy

```javascript
// Cache TTL recommendations
const CACHE_TTL = {
  USER_PERMISSIONS: 300,      // 5 minutes
  CONTACT_DETAILS: 60,         // 1 minute
  CAMPAIGN_STATS: 30,          // 30 seconds
  ANALYTICS_DASHBOARD: 300,    // 5 minutes
  SEGMENT_COUNTS: 300,         // 5 minutes
};
```

### Queue Concurrency

```javascript
// Process multiple jobs concurrently
messageQueue.process(10, async (job) => {
  // Process up to 10 jobs simultaneously
});

// Process with rate limiting
messageQueue.process('rate-limited', {
  limiter: {
    max: 20,        // 20 jobs
    duration: 60000 // per minute
  }
}, async (job) => {
  // Rate-limited processing
});
```

## Graceful Shutdown

The server implements graceful shutdown for Redis and queues:

```javascript
// On SIGTERM or SIGINT
1. Close HTTP server
2. Close all Bull queues
3. Close Redis connection
4. Exit process
```

Timeout: 30 seconds before forced shutdown

## Troubleshooting

### Redis Connection Issues

**Problem**: Redis connection fails
```
Redis: Error occurred - connect ECONNREFUSED
```

**Solution**:
1. Check Redis is running: `redis-cli ping`
2. Verify REDIS_HOST and REDIS_PORT in .env
3. Check Redis password if authentication is enabled
4. Ensure Redis accepts connections from your IP

### Queue Processing Issues

**Problem**: Jobs stuck in waiting state

**Solution**:
1. Check if workers are running
2. Verify Redis connection
3. Check queue is not paused
4. Review Bull Board dashboard

**Problem**: High failure rate

**Solution**:
1. Check error logs for specific failures
2. Review job data for invalid inputs
3. Verify external services are available
4. Increase retry attempts if transient failures

### Memory Issues

**Problem**: Redis memory usage high

**Solution**:
1. Review cache TTL settings
2. Clean old completed/failed jobs
3. Implement job cleanup policies
4. Consider Redis maxmemory policy

## Best Practices

1. **Always use TTL for cached data** to prevent memory leaks
2. **Set appropriate retry attempts** based on operation criticality
3. **Monitor queue depths** to detect processing bottlenecks
4. **Use priority levels** for time-sensitive operations
5. **Implement idempotent job handlers** to handle retries safely
6. **Log job failures** with sufficient context for debugging
7. **Clean old jobs regularly** to manage Redis memory
8. **Use Bull Board** for monitoring and troubleshooting
9. **Test queue processing** in staging before production
10. **Set up alerts** for queue health degradation

## Security

1. **Redis Authentication**: Always use password in production
2. **Bull Board Access**: Protect with strong credentials
3. **Network Security**: Restrict Redis access to application servers
4. **Encryption**: Use TLS for Redis connections in production
5. **Credentials**: Never commit Redis passwords to version control

## Scaling

### Horizontal Scaling

To scale queue processing:

1. **Multiple Workers**: Run multiple instances of worker processes
2. **Redis Cluster**: Use Redis Cluster for high availability
3. **Queue Partitioning**: Separate queues by priority/type
4. **Load Balancing**: Distribute jobs across worker instances

### Monitoring at Scale

1. **Metrics Collection**: Export queue metrics to monitoring system
2. **Alerting**: Set up alerts for queue depth thresholds
3. **Performance Tracking**: Monitor job processing times
4. **Resource Usage**: Track Redis memory and CPU usage

## References

- [Bull Documentation](https://github.com/OptimalBits/bull)
- [Bull Board Documentation](https://github.com/felixmosh/bull-board)
- [Redis Node Client](https://github.com/redis/node-redis)
- [Redis Best Practices](https://redis.io/docs/manual/patterns/)
