# WhatsApp Integration Documentation

## Overview

The WhatsApp integration module enables users to connect their WhatsApp Business accounts to the CRM system using the `whatsapp-web.js` library. This provides multi-device support, QR code authentication, automatic reconnection, and comprehensive session management.

## Features

- **QR Code Authentication**: Secure connection via QR code scanning
- **Session Management**: Encrypted session storage with LocalAuth strategy
- **Automatic Reconnection**: Exponential backoff retry mechanism
- **Health Monitoring**: Real-time connection and usage tracking
- **Multi-Account Support**: Connect multiple WhatsApp accounts per user
- **Rate Limiting**: Daily message limits and usage tracking

## Architecture

### Components

1. **WhatsApp Service** (`services/whatsappService.js`)
   - Client initialization and management
   - Event handling
   - Connection lifecycle management
   - Session encryption/decryption

2. **WhatsApp Controller** (`controllers/whatsappController.js`)
   - HTTP request handling
   - User authorization
   - Response formatting

3. **WhatsApp Routes** (`routes/whatsappRoutes.js`)
   - API endpoint definitions
   - Middleware integration
   - Permission checks

4. **WhatsApp Model** (`models/whatsappAccount.js`)
   - Database operations
   - Account queries and updates

## API Endpoints

### 1. Connect WhatsApp Account

**POST** `/api/v1/whatsapp/connect`

Initiates a new WhatsApp connection and generates a QR code.

**Request Body:**
```json
{
  "phoneNumber": "+1234567890",  // Optional
  "displayName": "My Business"    // Optional
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "accountId": "uuid",
    "status": "Connecting",
    "message": "QR code will be generated shortly. Please scan it with your WhatsApp mobile app."
  }
}
```

**Permissions Required:** `whatsapp:connect` (Owner, Admin)

---

### 2. Get QR Code

**GET** `/api/v1/whatsapp/qr-code/:accountId`

Retrieves the QR code for scanning.

**Response:**
```json
{
  "success": true,
  "data": {
    "qrCode": "base64-encoded-qr-code",
    "expiresAt": "2025-11-05T10:02:00Z",
    "status": "Connecting"
  }
}
```

**Permissions Required:** `whatsapp:read` (All roles)

---

### 3. Get All Accounts

**GET** `/api/v1/whatsapp/accounts`

Lists all WhatsApp accounts for the authenticated user.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "phoneNumber": "+1234567890",
      "displayName": "My Business",
      "connectionStatus": "Connected",
      "healthStatus": "Healthy",
      "messagesSentToday": 150,
      "messagesReceivedToday": 75,
      "dailyLimit": 1000,
      "lastConnectedAt": "2025-11-05T08:00:00Z",
      "isActive": true,
      "createdAt": "2025-11-01T10:00:00Z"
    }
  ],
  "count": 1
}
```

**Permissions Required:** `whatsapp:read` (All roles)

---

### 4. Get Account Details

**GET** `/api/v1/whatsapp/accounts/:accountId`

Retrieves detailed information about a specific account.

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "phoneNumber": "+1234567890",
    "displayName": "My Business",
    "connectionStatus": "Connected",
    "healthStatus": "Healthy",
    "messagesSentToday": 150,
    "messagesReceivedToday": 75,
    "dailyLimit": 1000,
    "isConnected": true,
    "_count": {
      "messages": 5000,
      "campaigns": 25,
      "contacts": 1500
    }
  }
}
```

**Permissions Required:** `whatsapp:read` (All roles)

---

### 5. Get Account Health

**GET** `/api/v1/whatsapp/health/:accountId`

Retrieves health metrics and status for an account.

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "phoneNumber": "+1234567890",
    "displayName": "My Business",
    "connectionStatus": "Connected",
    "healthStatus": "Healthy",
    "messagesSentToday": 150,
    "messagesReceivedToday": 75,
    "dailyLimit": 1000,
    "usagePercentage": 15,
    "isClientActive": true,
    "clientInfo": {
      "wid": {
        "user": "1234567890",
        "server": "c.us"
      },
      "pushname": "My Business"
    }
  }
}
```

**Permissions Required:** `whatsapp:read` (All roles)

---

### 6. Disconnect Account

**POST** `/api/v1/whatsapp/disconnect/:accountId`

Disconnects a WhatsApp account and cleans up session data.

**Response:**
```json
{
  "success": true,
  "data": {
    "accountId": "uuid",
    "status": "Disconnected",
    "message": "WhatsApp account disconnected successfully"
  }
}
```

**Permissions Required:** `whatsapp:disconnect` (Owner, Admin)

---

## Connection Flow

### 1. Initial Connection

```
User → POST /api/v1/whatsapp/connect
  ↓
Service creates WhatsApp account record
  ↓
Service initializes whatsapp-web.js client
  ↓
Client generates QR code
  ↓
QR code stored in database (2-minute expiry)
  ↓
User → GET /api/v1/whatsapp/qr-code/:accountId
  ↓
User scans QR code with mobile app
  ↓
Client authenticated event fired
  ↓
Account status updated to "Connected"
  ↓
Session data encrypted and stored
```

### 2. Automatic Reconnection

When a connection is lost, the system automatically attempts to reconnect:

- **Attempt 1**: Immediate (0ms delay)
- **Attempt 2**: 1 second delay
- **Attempt 3**: 2 seconds delay
- **Attempt 4**: 4 seconds delay
- **Attempt 5**: 8 seconds delay
- **Max delay**: 30 seconds

After 5 failed attempts, the account is marked as "Critical" health status.

### 3. Server Restart Recovery

On server startup, the system automatically restores all previously connected accounts:

```javascript
// In server.js
await whatsappService.restoreActiveConnections();
```

## Session Management

### Encryption

Session data is encrypted using AES-256-GCM before storage:

```javascript
const encryptedSession = encryptSessionData({
  sessionId: 'xxx',
  authToken: 'yyy',
  // ... other session data
});
```

### Storage

Sessions are stored in two locations:

1. **File System**: `./sessions/{accountId}/` - Used by whatsapp-web.js LocalAuth
2. **Database**: `sessionData` field (encrypted) - For backup and recovery

### Cleanup

When an account is disconnected:
- Active client is destroyed
- Session directory is deleted
- Database record is updated
- QR code is cleared

## Health Monitoring

### Health Status Levels

- **Healthy**: Connection active, usage < 70% of daily limit
- **Warning**: Usage 70-90% of daily limit
- **Critical**: Usage > 90% or connection issues

### Metrics Tracked

- Messages sent today
- Messages received today
- Daily limit (default: 1000)
- Connection status
- Last connected/disconnected timestamps
- Usage percentage

### Daily Reset

Message counters are reset daily at midnight (should be configured via cron job):

```javascript
await whatsappService.resetDailyMessageCounters();
```

## Event Handling

The WhatsApp client emits various events that are handled automatically:

### QR Code Event
```javascript
client.on('qr', async (qr) => {
  // Store QR code in database
  // Set 2-minute expiry
  // Emit Socket.io event (future implementation)
});
```

### Ready Event
```javascript
client.on('ready', async () => {
  // Update connection status to "Connected"
  // Store account info (phone, display name)
  // Reset reconnect attempts
});
```

### Authenticated Event
```javascript
client.on('authenticated', async () => {
  // Clear QR code
  // Update status
});
```

### Disconnected Event
```javascript
client.on('disconnected', async (reason) => {
  // Update status
  // Attempt automatic reconnection
  // Log disconnect reason
});
```

### Authentication Failure Event
```javascript
client.on('auth_failure', async (message) => {
  // Mark as failed
  // Set health to critical
  // Remove from active clients
});
```

## Error Handling

### Common Errors

1. **QR Code Expired**
   - Status: 400 Bad Request
   - Solution: Request new connection

2. **Account Not Found**
   - Status: 404 Not Found
   - Solution: Verify account ID

3. **Connection Failed**
   - Status: 500 Internal Server Error
   - Solution: Check logs, retry connection

4. **Authentication Failed**
   - Status: 401 Unauthorized
   - Solution: Re-scan QR code

5. **Rate Limit Exceeded**
   - Status: 429 Too Many Requests
   - Solution: Wait for daily reset

## Security Considerations

### Session Encryption

- All session data is encrypted using AES-256-GCM
- Encryption key stored in environment variables
- Never expose session data in API responses

### Permission Checks

- All endpoints require authentication
- Role-based permissions enforced
- Users can only access their own accounts

### Rate Limiting

- Daily message limits enforced per account
- API rate limiting applied to all endpoints
- Prevents abuse and WhatsApp bans

## Configuration

### Environment Variables

```bash
# Encryption
ENCRYPTION_KEY=your-32-character-encryption-key

# WhatsApp
WHATSAPP_SESSION_PATH=./sessions
WHATSAPP_MAX_CONNECTIONS=10
WHATSAPP_MESSAGE_RATE_LIMIT=20
```

### Puppeteer Configuration

The WhatsApp client uses Puppeteer with optimized settings:

```javascript
puppeteer: {
  headless: true,
  args: [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
    '--disable-accelerated-2d-canvas',
    '--no-first-run',
    '--no-zygote',
    '--disable-gpu',
  ],
}
```

## Best Practices

### 1. Connection Management

- Always disconnect accounts before deleting
- Monitor health status regularly
- Implement alerts for critical status

### 2. Session Storage

- Backup session directories regularly
- Clean up old sessions periodically
- Never commit session files to version control

### 3. Error Recovery

- Implement retry logic for transient failures
- Log all connection events
- Monitor reconnection attempts

### 4. Performance

- Limit concurrent connections per server
- Use horizontal scaling for high load
- Implement connection pooling

## Troubleshooting

### Connection Issues

**Problem**: QR code not generating
- Check Puppeteer installation
- Verify Chrome/Chromium is available
- Check session directory permissions

**Problem**: Connection drops frequently
- Check network stability
- Verify WhatsApp account status
- Review reconnection logs

**Problem**: Authentication fails
- Clear session directory
- Generate new QR code
- Check WhatsApp mobile app status

### Performance Issues

**Problem**: Slow connection initialization
- Optimize Puppeteer settings
- Increase server resources
- Check network latency

**Problem**: High memory usage
- Limit concurrent connections
- Implement connection cleanup
- Monitor active clients

## Future Enhancements

- [ ] Socket.io real-time QR code updates
- [ ] Multi-device session management
- [ ] Advanced health monitoring dashboard
- [ ] Automated session backup to S3
- [ ] Connection analytics and reporting
- [ ] WhatsApp Business API integration
- [ ] Message queue integration
- [ ] Webhook notifications for connection events

## Related Documentation

- [Authentication](./AUTHENTICATION.md)
- [RBAC Implementation](./RBAC_IMPLEMENTATION.md)
- [Database Setup](./DATABASE_SETUP.md)
- [Redis Queue Setup](./REDIS_QUEUE_SETUP.md)

## Support

For issues or questions:
- Check logs in `./logs/combined.log`
- Review error logs in `./logs/error.log`
- Check session directory: `./sessions/{accountId}/`
- Monitor Bull Board: `/admin/queues`
