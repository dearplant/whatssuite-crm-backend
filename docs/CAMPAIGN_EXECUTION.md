# Campaign Execution Engine

## Overview

The Campaign Execution Engine is responsible for processing and executing broadcast campaigns to multiple recipients. It handles batch processing, rate limiting, template variable rendering, progress tracking, and real-time updates via Socket.io.

## Architecture

### Components

1. **Campaign Worker** (`src/workers/campaignWorker.js`)
   - Processes campaign execution jobs from the campaign queue
   - Handles batch processing of recipients
   - Implements rate limiting per campaign
   - Tracks progress and emits Socket.io events
   - Calculates campaign metrics (delivery, read, reply rates)

2. **Campaign Service** (`src/services/campaignService.js`)
   - Business logic for campaign management
   - Campaign control methods (start, pause, resume, duplicate)
   - Recipient calculation and filtering

3. **Campaign Controller** (`src/controllers/campaignController.js`)
   - HTTP request handlers for campaign operations
   - Campaign control endpoints

4. **Message Worker** (`src/workers/messageWorker.js`)
   - Processes individual message sending
   - Handles both regular and campaign messages
   - Updates message status in database

## Features

### 1. Campaign Scheduling

Campaigns can be scheduled in three ways:

- **Immediate**: Start execution immediately (`scheduleType: 'now'`)
- **Scheduled**: Start at a specific date/time (`scheduleType: 'scheduled'`)
- **Manual**: Start manually via API (`scheduleType: 'manual'`)

### 2. Template Variable Rendering

The engine supports dynamic template variables that are replaced with actual contact data:

```javascript
// Template
"Hello {{firstName}}, welcome to {{company}}!"

// Variables
{
  firstName: "John",
  lastName: "Doe",
  name: "John Doe",
  phone: "+1234567890",
  email: "john@example.com",
  company: "Acme Corp"
}

// Result
"Hello John, welcome to Acme Corp!"
```

**Available Variables:**
- `{{firstName}}` - Contact's first name
- `{{lastName}}` - Contact's last name
- `{{name}}` - Full name (firstName + lastName)
- `{{phone}}` - Contact's phone number
- `{{email}}` - Contact's email address
- `{{company}}` - Contact's company name
- Custom variables from `template_variables` field

### 3. Batch Processing

Recipients are processed in configurable batches to optimize performance and manage memory:

- **Default batch size**: 100 recipients per batch
- **Configurable via**: `throttle_config.batchSize`
- **Delay between batches**: Configurable via `throttle_config.delayBetweenBatches`

### 4. Rate Limiting

The engine implements per-campaign rate limiting to comply with WhatsApp's messaging limits:

- **Default rate**: 20 messages per minute
- **Configurable via**: `throttle_config.messagesPerMinute`
- **Automatic delay calculation**: `delayBetweenMessages = 60000 / messagesPerMinute`

**Example throttle configuration:**
```json
{
  "messagesPerMinute": 20,
  "batchSize": 100,
  "delayBetweenBatches": 5000
}
```

### 5. Progress Tracking

The engine tracks campaign progress and emits real-time updates:

- **Progress updates**: Every 100 messages processed
- **Stats updates**: Every 50 messages processed
- **Socket.io events**: Real-time notifications to the user

**Socket.io Events:**
- `campaign:started` - Campaign execution started
- `campaign:progress` - Progress update with percentage
- `campaign:completed` - Campaign execution completed
- `campaign:failed` - Campaign execution failed
- `campaign:paused` - Campaign was paused

### 6. Campaign Metrics

The engine calculates comprehensive campaign metrics:

- **Delivery Rate**: `(delivered / sent) * 100`
- **Read Rate**: `(read / delivered) * 100`
- **Reply Rate**: `(replied / delivered) * 100`
- **Failure Rate**: `(failed / total_recipients) * 100`

## Campaign Lifecycle

### States

1. **draft** - Campaign created but not scheduled
2. **scheduled** - Campaign queued for execution
3. **running** - Campaign currently executing
4. **paused** - Campaign execution paused
5. **completed** - Campaign execution finished
6. **failed** - Campaign execution failed

### State Transitions

```
draft → scheduled → running → completed
                ↓      ↓
              paused → running
                ↓
              failed
```

## API Endpoints

### Start Campaign
```http
POST /api/v1/campaigns/:id/start
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "message": "Campaign started successfully",
  "data": {
    "id": "campaign-uuid",
    "status": "scheduled",
    "scheduled_at": "2025-11-05T10:00:00Z"
  }
}
```

### Pause Campaign
```http
POST /api/v1/campaigns/:id/pause
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "message": "Campaign paused successfully",
  "data": {
    "id": "campaign-uuid",
    "status": "paused",
    "paused_at": "2025-11-05T10:15:00Z"
  }
}
```

### Resume Campaign
```http
POST /api/v1/campaigns/:id/resume
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "message": "Campaign resumed successfully",
  "data": {
    "id": "campaign-uuid",
    "status": "scheduled"
  }
}
```

### Duplicate Campaign
```http
POST /api/v1/campaigns/:id/duplicate
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "message": "Campaign duplicated successfully",
  "data": {
    "id": "new-campaign-uuid",
    "name": "Original Campaign Name (Copy)",
    "status": "draft",
    "total_recipients": 1500
  }
}
```

## Worker Configuration

### Campaign Worker

```javascript
// Concurrency: 5 campaigns processed simultaneously
campaignQueue.process(5, processCampaign);
```

### Message Worker

```javascript
// Concurrency: 10 messages processed simultaneously
messageQueue.process(10, processMessage);

// Rate limiting: 20 messages per minute
limiter: {
  max: 20,
  duration: 60000
}
```

## Error Handling

### Campaign Errors

1. **WhatsApp Account Not Connected**
   - Error: "WhatsApp account is not connected"
   - Action: Campaign status set to failed
   - User notification via Socket.io

2. **Campaign Already Running**
   - Error: "Campaign is already running"
   - Action: Skip execution
   - HTTP 400 response

3. **No Recipients Found**
   - Error: "No pending recipients for campaign"
   - Action: Mark campaign as completed
   - Log warning

### Message Errors

1. **Message Send Failure**
   - Retry: Up to 3 attempts with exponential backoff
   - Final failure: Mark message as failed
   - Update campaign stats

2. **Rate Limit Exceeded**
   - Action: Automatic delay between messages
   - Configurable via throttle_config

## Performance Considerations

### Optimization Strategies

1. **Batch Processing**
   - Process recipients in batches of 100
   - Reduces memory usage
   - Improves throughput

2. **Async Queue Processing**
   - Campaign worker: 5 concurrent campaigns
   - Message worker: 10 concurrent messages
   - Non-blocking execution

3. **Database Optimization**
   - Bulk updates for campaign stats
   - Indexed queries for recipient lookup
   - Periodic stats updates (every 50 messages)

4. **Rate Limiting**
   - Prevents WhatsApp account bans
   - Configurable per campaign
   - Automatic delay calculation

### Scalability

The campaign execution engine is designed for horizontal scaling:

- **Bull Queue**: Redis-backed for distributed processing
- **Multiple Workers**: Can run on multiple servers
- **Socket.io**: Redis adapter for cross-server events
- **Database**: Connection pooling for concurrent access

## Monitoring

### Metrics to Monitor

1. **Queue Health**
   - Waiting jobs count
   - Active jobs count
   - Failed jobs count
   - Processing rate

2. **Campaign Performance**
   - Average execution time
   - Success rate
   - Failure rate
   - Messages per minute

3. **System Resources**
   - Memory usage
   - CPU usage
   - Redis connection count
   - Database connection pool

### Logging

The engine logs important events at different levels:

- **INFO**: Campaign started, completed, progress updates
- **WARN**: Campaign paused, stalled jobs
- **ERROR**: Campaign failed, message send failures
- **DEBUG**: Detailed execution flow, stats updates

## Best Practices

### Campaign Configuration

1. **Set Appropriate Rate Limits**
   - Start with 20 messages/minute
   - Adjust based on WhatsApp account limits
   - Monitor for rate limit errors

2. **Use Batch Processing**
   - Keep batch size at 100 for optimal performance
   - Add delays between batches for large campaigns
   - Monitor memory usage

3. **Test Templates**
   - Verify all variables are available
   - Test with sample contacts
   - Check for missing data handling

### Error Recovery

1. **Monitor Failed Messages**
   - Review error messages
   - Identify patterns
   - Adjust configuration if needed

2. **Pause and Resume**
   - Use pause for maintenance
   - Resume after fixing issues
   - Monitor progress after resume

3. **Campaign Duplication**
   - Duplicate failed campaigns
   - Adjust configuration
   - Retry with fixes

## Example Usage

### Creating and Starting a Campaign

```javascript
// 1. Create campaign
const campaign = await fetch('/api/v1/campaigns', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer <token>',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    accountId: 'whatsapp-account-uuid',
    name: 'Product Launch Campaign',
    messageType: 'text',
    messageContent: 'Hi {{firstName}}, check out our new product!',
    audienceType: 'segment',
    audienceConfig: {
      segmentId: 'segment-uuid'
    },
    scheduleType: 'manual',
    throttleConfig: {
      messagesPerMinute: 20,
      batchSize: 100,
      delayBetweenBatches: 5000
    }
  })
});

// 2. Start campaign
const result = await fetch(`/api/v1/campaigns/${campaign.id}/start`, {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer <token>'
  }
});

// 3. Listen for progress updates
socket.on('campaign:progress', (data) => {
  console.log(`Campaign ${data.campaignId}: ${data.progress}% complete`);
  console.log(`Processed: ${data.processedCount}/${data.totalRecipients}`);
});

socket.on('campaign:completed', (data) => {
  console.log('Campaign completed:', data.campaign);
});
```

## Troubleshooting

### Common Issues

1. **Campaign Not Starting**
   - Check WhatsApp account connection status
   - Verify campaign has recipients
   - Check queue health

2. **Slow Execution**
   - Increase messagesPerMinute (if allowed)
   - Reduce delayBetweenBatches
   - Check system resources

3. **High Failure Rate**
   - Verify phone numbers are valid
   - Check WhatsApp account status
   - Review error messages

4. **Progress Not Updating**
   - Check Socket.io connection
   - Verify user is in correct room
   - Check Redis connection

## Future Enhancements

1. **A/B Testing**
   - Multiple message variants
   - Automatic winner selection
   - Performance comparison

2. **Smart Scheduling**
   - Optimal send time prediction
   - Timezone-aware scheduling
   - Engagement-based timing

3. **Advanced Analytics**
   - Click tracking
   - Conversion tracking
   - ROI calculation

4. **Campaign Templates**
   - Pre-built campaign templates
   - Industry-specific templates
   - Template marketplace
