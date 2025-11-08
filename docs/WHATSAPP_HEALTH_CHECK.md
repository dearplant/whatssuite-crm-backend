# WhatsApp Session Health Check System

## Overview

The WhatsApp Session Health Check System is an automated monitoring and recovery system that ensures WhatsApp Business accounts remain connected and operational. It runs periodic health checks, attempts automatic reconnection for failed sessions, and notifies administrators of prolonged outages.

## Features

### 1. Automated Health Checks
- **Frequency**: Every 15 minutes
- **Scope**: All active WhatsApp accounts
- **Checks**:
  - Connection status verification
  - Client activity validation
  - Session health assessment
  - Uptime metrics tracking

### 2. Health Status Levels

#### Healthy
- WhatsApp client is active and connected
- Messages can be sent and received
- All systems operational

#### Warning
- Client recently disconnected
- Offline for less than 6 hours
- Automatic reconnection in progress

#### Critical
- Offline for more than 6 hours
- Multiple reconnection attempts failed
- Administrator notification sent

### 3. Automatic Reconnection

The system automatically attempts to reconnect failed WhatsApp sessions:

- **Trigger**: Disconnected or Failed connection status
- **Method**: Client reinitialization
- **Notification**: Real-time Socket.io events
- **Logging**: All reconnection attempts logged

### 4. Administrator Notifications

When a WhatsApp account remains offline for more than 6 hours:

- **Email Alert**: Sent to account owner
- **Content Includes**:
  - Account name and phone number
  - Offline duration
  - Last connected timestamp
  - Reconnection instructions
  - Common troubleshooting tips

### 5. Uptime Metrics

The system tracks:
- Last connected timestamp
- Last disconnected timestamp
- Connection status changes
- Health status transitions

## Architecture

### Components

#### 1. WhatsAppHealthCheckService
**Location**: `src/services/whatsappHealthCheckService.js`

**Responsibilities**:
- Perform health checks on all accounts
- Assess connection and health status
- Trigger reconnection attempts
- Send offline notifications
- Track uptime metrics

**Key Methods**:
- `performHealthCheck()`: Main health check routine
- `checkAccountHealth(account)`: Check single account
- `attemptReconnection(account)`: Reconnect failed session
- `sendOfflineNotification(account, duration)`: Email alert
- `updateUptimeMetrics(accountId, isOnline)`: Track uptime

#### 2. CronScheduler
**Location**: `src/services/cronScheduler.js`

**Responsibilities**:
- Schedule and manage all cron jobs
- Initialize jobs on server startup
- Provide manual trigger capability
- Handle graceful shutdown

**Scheduled Jobs**:
- `whatsapp-health-check`: Every 15 minutes
- `daily-message-counter-reset`: Daily at midnight
- `inactive-client-cleanup`: Every hour

#### 3. Email Template
**Location**: `src/templates/emails/whatsapp-offline-alert.hbs`

**Features**:
- Professional HTML design
- Account details display
- Offline duration calculation
- Actionable reconnection button
- Troubleshooting guidance

## API Endpoints

### Get Cron Job Status
```http
GET /api/v1/cron/status
Authorization: Bearer <token>
```

**Response**:
```json
{
  "success": true,
  "data": {
    "whatsapp-health-check": {
      "running": true
    },
    "daily-message-counter-reset": {
      "running": true
    },
    "inactive-client-cleanup": {
      "running": true
    }
  }
}
```

### Manually Trigger Health Check
```http
POST /api/v1/cron/trigger/whatsapp-health-check
Authorization: Bearer <token>
```

**Response**:
```json
{
  "success": true,
  "message": "Job whatsapp-health-check triggered successfully",
  "data": {
    "total": 5,
    "healthy": 3,
    "warning": 1,
    "critical": 1,
    "reconnected": 1,
    "notified": 1
  }
}
```

### Get Health Check Statistics
```http
GET /api/v1/cron/health-check/stats
Authorization: Bearer <token>
```

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "healthStatus": "Healthy",
      "connectionStatus": "Connected",
      "_count": 3
    },
    {
      "healthStatus": "Warning",
      "connectionStatus": "Disconnected",
      "_count": 1
    },
    {
      "healthStatus": "Critical",
      "connectionStatus": "Failed",
      "_count": 1
    }
  ]
}
```

### Stop/Start Cron Job
```http
POST /api/v1/cron/stop/whatsapp-health-check
POST /api/v1/cron/start/whatsapp-health-check
Authorization: Bearer <token>
```

## Configuration

### Environment Variables

```env
# Timezone for cron jobs (default: UTC)
TZ=America/New_York

# Email service configuration (required for notifications)
EMAIL_SERVICE=smtp
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-password
EMAIL_FROM=noreply@yourapp.com
EMAIL_FROM_NAME=WhatsApp CRM
```

### Cron Schedule

The health check runs every 15 minutes using the cron expression: `*/15 * * * *`

To modify the schedule, edit `src/services/cronScheduler.js`:

```javascript
// Run every 15 minutes
const job = cron.schedule('*/15 * * * *', async () => {
  // Health check logic
});

// Other examples:
// Every 5 minutes: '*/5 * * * *'
// Every 30 minutes: '*/30 * * * *'
// Every hour: '0 * * * *'
```

### Notification Threshold

The offline notification threshold is 6 hours by default. To modify:

```javascript
// In src/services/whatsappHealthCheckService.js
constructor() {
  this.OFFLINE_NOTIFICATION_THRESHOLD = 6 * 60 * 60 * 1000; // 6 hours
}
```

## Monitoring and Logging

### Log Levels

The system logs at various levels:

- **INFO**: Normal operations, health check results
- **WARN**: Disconnections, reconnection attempts
- **ERROR**: Failed operations, critical issues

### Log Examples

```
[INFO] Starting WhatsApp session health check...
[INFO] Found 5 active WhatsApp accounts to check
[WARN] Account abc-123 appears disconnected, marking as Warning
[INFO] Attempting to reconnect account abc-123
[INFO] Sending offline notification to user@example.com for account abc-123
[INFO] WhatsApp session health check completed { total: 5, healthy: 3, warning: 1, critical: 1 }
```

### Metrics Tracked

- Total accounts checked
- Healthy accounts count
- Warning status accounts
- Critical status accounts
- Reconnection attempts
- Notifications sent

## Troubleshooting

### Health Check Not Running

1. Check if cron scheduler is initialized:
```bash
# Check server logs for:
✅ Cron scheduler initialized successfully
```

2. Verify cron job status via API:
```bash
curl -H "Authorization: Bearer <token>" \
  http://localhost:5000/api/v1/cron/status
```

3. Manually trigger health check:
```bash
curl -X POST -H "Authorization: Bearer <token>" \
  http://localhost:5000/api/v1/cron/trigger/whatsapp-health-check
```

### Notifications Not Sent

1. Verify email service configuration:
```bash
# Check .env file for email settings
EMAIL_SERVICE=smtp
SMTP_HOST=...
SMTP_USER=...
```

2. Check email service logs:
```bash
# Look for email-related errors in logs
grep "email" logs/combined.log
```

3. Test email service:
```javascript
// In Node.js console
import emailService from './src/services/emailService.js';
await emailService.verifyConnection();
```

### Reconnection Failures

Common causes:
1. **WhatsApp logged out on mobile**: User needs to scan QR code again
2. **Session expired**: Generate new QR code
3. **Network issues**: Check server connectivity
4. **Rate limiting**: WhatsApp may temporarily block reconnections

**Solution**: User must manually reconnect via dashboard

## Best Practices

### 1. Monitor Health Check Results

Regularly review health check statistics:
```bash
# Daily check
curl -H "Authorization: Bearer <token>" \
  http://localhost:5000/api/v1/cron/health-check/stats
```

### 2. Set Up Alerting

Configure additional alerting for critical issues:
- Slack/Discord webhooks
- SMS notifications
- PagerDuty integration

### 3. Regular Maintenance

- Review offline accounts weekly
- Clean up inactive accounts
- Update notification templates
- Monitor email delivery rates

### 4. Testing

Test the health check system:
```bash
# Manually trigger health check
curl -X POST -H "Authorization: Bearer <token>" \
  http://localhost:5000/api/v1/cron/trigger/whatsapp-health-check

# Check results
curl -H "Authorization: Bearer <token>" \
  http://localhost:5000/api/v1/cron/health-check/stats
```

## Integration with Other Systems

### Socket.io Events

The health check system emits real-time events:

```javascript
// Connection status changes
socket.on('whatsapp:connection:status', (data) => {
  console.log('Connection status:', data);
  // { accountId, status, metadata }
});

// Reconnection attempts
socket.on('whatsapp:connection:reconnecting', (data) => {
  console.log('Reconnecting:', data);
  // { accountId, attempt, maxAttempts, nextAttemptIn }
});
```

### Webhook Integration

Future enhancement: Send webhook notifications for health status changes

```javascript
// Planned feature
POST /webhooks/whatsapp/health-status
{
  "event": "whatsapp.health.critical",
  "accountId": "abc-123",
  "status": "Critical",
  "offlineDuration": 21600000,
  "timestamp": "2024-01-15T10:30:00Z"
}
```

## Performance Considerations

### Resource Usage

- **CPU**: Minimal (< 1% during health check)
- **Memory**: ~10MB for health check service
- **Network**: One API call per account every 15 minutes
- **Database**: One query per account every 15 minutes

### Scalability

The system scales linearly with the number of accounts:
- 100 accounts: ~5 seconds per health check
- 1,000 accounts: ~50 seconds per health check
- 10,000 accounts: ~8 minutes per health check

For large deployments (>1,000 accounts), consider:
- Increasing health check interval to 30 minutes
- Implementing batch processing
- Using read replicas for database queries

## Security

### Access Control

All cron management endpoints require:
- Valid JWT authentication
- `system:manage` permission (Admin only)

### Email Security

- Email templates sanitize user input
- SMTP credentials encrypted in environment
- Rate limiting on email sending

### Audit Logging

All manual triggers and configuration changes are logged:
```
[INFO] Manual trigger requested for job: whatsapp-health-check by user abc-123
```

## Future Enhancements

1. **Advanced Analytics**
   - Historical uptime tracking
   - Downtime trend analysis
   - Predictive maintenance alerts

2. **Smart Reconnection**
   - Adaptive retry strategies
   - Connection quality scoring
   - Automatic QR code regeneration

3. **Multi-Channel Notifications**
   - SMS alerts
   - Push notifications
   - Slack/Discord integration

4. **Dashboard Integration**
   - Real-time health status widget
   - Uptime graphs and charts
   - Alert history timeline

## Support

For issues or questions:
- Check logs: `logs/combined.log`
- Review documentation: `docs/WHATSAPP_HEALTH_CHECK.md`
- Contact support: support@yourapp.com
