# Socket.io Real-Time Communication

This document describes the Socket.io implementation for real-time updates in the WhatsApp CRM backend.

## Overview

Socket.io is used to provide real-time updates to connected clients for various events including:
- WhatsApp connection status changes
- Message status updates (sent, delivered, read)
- Incoming messages
- Campaign progress
- Contact updates
- Typing indicators

## Architecture

### Components

1. **Socket.io Server** (`src/config/socket.config.js`)
   - Initializes Socket.io with Redis adapter for horizontal scaling
   - Handles authentication via JWT tokens
   - Manages room-based broadcasting

2. **Event Emitters** (`src/sockets/index.js`)
   - Helper functions for emitting events to specific rooms
   - Organized by feature (WhatsApp, Messages, Campaigns, etc.)

3. **Service Integration**
   - Services emit Socket.io events when state changes occur
   - Events are emitted to user-specific rooms and feature-specific rooms

## Authentication

Clients must authenticate using JWT tokens when connecting to Socket.io.

### Connection Example

```javascript
import { io } from 'socket.io-client';

const socket = io('http://localhost:5000', {
  auth: {
    token: 'your-jwt-access-token'
  }
});

socket.on('connect', () => {
  console.log('Connected to Socket.io server');
});

socket.on('connect_error', (error) => {
  console.error('Connection error:', error.message);
});
```

## Room Structure

### User Rooms
- Format: `user:{userId}`
- Purpose: User-specific events
- Auto-joined on connection

### WhatsApp Account Rooms
- Format: `whatsapp:{accountId}`
- Purpose: WhatsApp account-specific events
- Subscribe: `socket.emit('subscribe:whatsapp', accountId)`
- Unsubscribe: `socket.emit('unsubscribe:whatsapp', accountId)`

### Campaign Rooms
- Format: `campaign:{campaignId}`
- Purpose: Campaign progress updates
- Subscribe: `socket.emit('subscribe:campaign', campaignId)`
- Unsubscribe: `socket.emit('unsubscribe:campaign', campaignId)`

### Contact Rooms
- Format: `contact:{contactId}`
- Purpose: Contact-specific events and typing indicators
- Subscribe: `socket.emit('subscribe:contact', contactId)`
- Unsubscribe: `socket.emit('unsubscribe:contact', contactId)`

## Events

### WhatsApp Events

#### `whatsapp:qr:generated`
Emitted when a QR code is generated for WhatsApp connection.

**Payload:**
```json
{
  "accountId": "uuid",
  "qrCode": "base64-qr-code-string",
  "expiresAt": "2025-11-05T10:02:00Z",
  "timestamp": "2025-11-05T10:00:00Z"
}
```

#### `whatsapp:ready`
Emitted when WhatsApp account is successfully connected.

**Payload:**
```json
{
  "accountId": "uuid",
  "accountInfo": {
    "phoneNumber": "1234567890",
    "displayName": "Business Name"
  },
  "timestamp": "2025-11-05T10:00:00Z"
}
```

#### `whatsapp:connection:status`
Emitted when WhatsApp connection status changes.

**Payload:**
```json
{
  "accountId": "uuid",
  "status": "Connected|Connecting|Disconnected|Failed|Reconnecting",
  "message": "Status message",
  "timestamp": "2025-11-05T10:00:00Z"
}
```

#### `whatsapp:disconnected`
Emitted when WhatsApp account is disconnected.

**Payload:**
```json
{
  "accountId": "uuid",
  "reason": "Disconnection reason",
  "timestamp": "2025-11-05T10:00:00Z"
}
```

### Message Events

#### `message:status:update`
Emitted when message status changes.

**Payload:**
```json
{
  "messageId": "uuid",
  "status": "Queued|Sent|Delivered|Read|Failed",
  "contactId": "uuid",
  "whatsappAccountId": "uuid",
  "timestamp": "2025-11-05T10:00:00Z"
}
```

#### `message:received`
Emitted when an incoming message is received.

**Payload:**
```json
{
  "message": {
    "id": "uuid",
    "contactId": "uuid",
    "whatsappAccountId": "uuid",
    "direction": "Inbound",
    "type": "Text|Image|Video|Audio|Document",
    "content": "Message content",
    "mediaUrl": "https://...",
    "createdAt": "2025-11-05T10:00:00Z"
  },
  "timestamp": "2025-11-05T10:00:00Z"
}
```

#### `message:sent`
Emitted when an outbound message is sent.

**Payload:**
```json
{
  "message": {
    "id": "uuid",
    "contactId": "uuid",
    "whatsappAccountId": "uuid",
    "direction": "Outbound",
    "type": "Text",
    "content": "Message content",
    "status": "Sent",
    "sentAt": "2025-11-05T10:00:00Z"
  },
  "timestamp": "2025-11-05T10:00:00Z"
}
```

#### `message:delivered`
Emitted when a message is delivered to the recipient.

**Payload:**
```json
{
  "messageId": "uuid",
  "deliveredAt": "2025-11-05T10:00:00Z",
  "timestamp": "2025-11-05T10:00:00Z"
}
```

#### `message:read`
Emitted when a message is read by the recipient.

**Payload:**
```json
{
  "messageId": "uuid",
  "readAt": "2025-11-05T10:00:00Z",
  "timestamp": "2025-11-05T10:00:00Z"
}
```

#### `message:failed`
Emitted when a message fails to send.

**Payload:**
```json
{
  "messageId": "uuid",
  "error": "Error message",
  "timestamp": "2025-11-05T10:00:00Z"
}
```

### Campaign Events

#### `campaign:started`
Emitted when a campaign starts execution.

**Payload:**
```json
{
  "campaignId": "uuid",
  "campaign": {
    "name": "Campaign Name",
    "totalRecipients": 1000
  },
  "timestamp": "2025-11-05T10:00:00Z"
}
```

#### `campaign:progress`
Emitted periodically during campaign execution (every 100 messages).

**Payload:**
```json
{
  "campaignId": "uuid",
  "progress": {
    "sent": 500,
    "total": 1000,
    "percentage": 50,
    "failed": 5
  },
  "timestamp": "2025-11-05T10:00:00Z"
}
```

#### `campaign:completed`
Emitted when a campaign completes.

**Payload:**
```json
{
  "campaignId": "uuid",
  "stats": {
    "totalRecipients": 1000,
    "sentCount": 995,
    "deliveredCount": 990,
    "readCount": 850,
    "failedCount": 5,
    "deliveryRate": 99.5,
    "readRate": 85.0
  },
  "timestamp": "2025-11-05T10:00:00Z"
}
```

#### `campaign:paused`
Emitted when a campaign is paused.

**Payload:**
```json
{
  "campaignId": "uuid",
  "timestamp": "2025-11-05T10:00:00Z"
}
```

#### `campaign:resumed`
Emitted when a campaign is resumed.

**Payload:**
```json
{
  "campaignId": "uuid",
  "timestamp": "2025-11-05T10:00:00Z"
}
```

#### `campaign:failed`
Emitted when a campaign fails.

**Payload:**
```json
{
  "campaignId": "uuid",
  "error": "Error message",
  "timestamp": "2025-11-05T10:00:00Z"
}
```

### Contact Events

#### `contact:created`
Emitted when a new contact is created.

**Payload:**
```json
{
  "contact": {
    "id": "uuid",
    "name": "John Doe",
    "phone": "+1234567890",
    "email": "john@example.com"
  },
  "timestamp": "2025-11-05T10:00:00Z"
}
```

#### `contact:updated`
Emitted when a contact is updated.

**Payload:**
```json
{
  "contactId": "uuid",
  "updates": {
    "name": "John Smith",
    "email": "john.smith@example.com"
  },
  "timestamp": "2025-11-05T10:00:00Z"
}
```

#### `contact:deleted`
Emitted when a contact is deleted.

**Payload:**
```json
{
  "contactId": "uuid",
  "timestamp": "2025-11-05T10:00:00Z"
}
```

### Typing Indicator Events

#### Client to Server: `typing:start`
Client emits this event when user starts typing.

**Payload:**
```json
{
  "contactId": "uuid",
  "whatsappAccountId": "uuid"
}
```

#### Client to Server: `typing:stop`
Client emits this event when user stops typing.

**Payload:**
```json
{
  "contactId": "uuid",
  "whatsappAccountId": "uuid"
}
```

#### Server to Client: `typing:indicator`
Server broadcasts typing status to other users viewing the same contact.

**Payload:**
```json
{
  "contactId": "uuid",
  "whatsappAccountId": "uuid",
  "isTyping": true,
  "userId": "uuid",
  "timestamp": "2025-11-05T10:00:00Z"
}
```

### Flow Events

#### `flow:execution:started`
Emitted when a flow execution starts.

**Payload:**
```json
{
  "flowId": "uuid",
  "executionId": "uuid",
  "timestamp": "2025-11-05T10:00:00Z"
}
```

#### `flow:execution:completed`
Emitted when a flow execution completes.

**Payload:**
```json
{
  "flowId": "uuid",
  "executionId": "uuid",
  "result": {
    "status": "Completed",
    "steps": 5
  },
  "timestamp": "2025-11-05T10:00:00Z"
}
```

#### `flow:execution:failed`
Emitted when a flow execution fails.

**Payload:**
```json
{
  "flowId": "uuid",
  "executionId": "uuid",
  "error": "Error message",
  "timestamp": "2025-11-05T10:00:00Z"
}
```

### System Events

#### `system:notification`
Emitted for system-wide notifications.

**Payload:**
```json
{
  "notification": {
    "type": "info|warning|error|success",
    "title": "Notification Title",
    "message": "Notification message",
    "action": {
      "label": "View Details",
      "url": "/path/to/resource"
    }
  },
  "timestamp": "2025-11-05T10:00:00Z"
}
```

#### `team:activity`
Emitted for team activity logs.

**Payload:**
```json
{
  "activity": {
    "userId": "uuid",
    "userName": "John Doe",
    "action": "created_campaign",
    "resource": "Campaign Name",
    "metadata": {}
  },
  "timestamp": "2025-11-05T10:00:00Z"
}
```

### Heartbeat

#### Client to Server: `ping`
Client can send ping to check connection health.

**Response:** `pong`
```json
{
  "timestamp": 1699185600000
}
```

## Client Implementation Example

### React/Next.js Example

```javascript
import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';

function useSocket(token) {
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!token) return;

    const socketInstance = io(process.env.NEXT_PUBLIC_API_URL, {
      auth: { token }
    });

    socketInstance.on('connect', () => {
      console.log('Connected to Socket.io');
      setConnected(true);
    });

    socketInstance.on('disconnect', () => {
      console.log('Disconnected from Socket.io');
      setConnected(false);
    });

    socketInstance.on('connect_error', (error) => {
      console.error('Connection error:', error.message);
    });

    setSocket(socketInstance);

    return () => {
      socketInstance.disconnect();
    };
  }, [token]);

  return { socket, connected };
}

function MessagesComponent() {
  const { socket, connected } = useSocket(accessToken);
  const [messages, setMessages] = useState([]);

  useEffect(() => {
    if (!socket) return;

    // Subscribe to message events
    socket.on('message:received', (data) => {
      setMessages(prev => [...prev, data.message]);
    });

    socket.on('message:status:update', (data) => {
      setMessages(prev => 
        prev.map(msg => 
          msg.id === data.messageId 
            ? { ...msg, status: data.status }
            : msg
        )
      );
    });

    // Subscribe to WhatsApp account
    socket.emit('subscribe:whatsapp', whatsappAccountId);

    return () => {
      socket.off('message:received');
      socket.off('message:status:update');
      socket.emit('unsubscribe:whatsapp', whatsappAccountId);
    };
  }, [socket, whatsappAccountId]);

  return (
    <div>
      <div>Status: {connected ? 'Connected' : 'Disconnected'}</div>
      {/* Render messages */}
    </div>
  );
}
```

## Scaling Considerations

### Redis Adapter

The Socket.io server uses Redis adapter for horizontal scaling. This allows multiple server instances to communicate and broadcast events across all connected clients.

**Configuration:**
- Redis pub/sub is used for cross-server communication
- Sticky sessions are recommended for load balancing
- Each server instance maintains its own Socket.io connections

### Connection Limits

- Monitor active connections per server instance
- Implement connection throttling if needed
- Use load balancer health checks

### Performance

- Events are emitted asynchronously to avoid blocking
- Room-based broadcasting reduces unnecessary network traffic
- Redis caching minimizes database queries

## Monitoring

### Connection Statistics

Get real-time connection statistics:

```javascript
import { getConnectionStats } from './config/socket.config.js';

const stats = await getConnectionStats();
console.log('Connected clients:', stats.connected);
console.log('Active rooms:', stats.rooms);
```

### Logging

All Socket.io events are logged with appropriate log levels:
- `info`: Connection/disconnection events
- `debug`: Event emissions and room subscriptions
- `error`: Connection errors and authentication failures

## Security

### Authentication
- JWT tokens are verified on connection
- Invalid tokens result in connection rejection
- Tokens are not stored on the server

### Authorization
- Users can only join rooms they have access to
- Room subscriptions are validated against user permissions
- Events are only emitted to authorized users

### Rate Limiting
- Connection rate limiting can be implemented at the load balancer level
- Event emission rate limiting can be added if needed

## Troubleshooting

### Connection Issues

1. **Authentication Failed**
   - Verify JWT token is valid and not expired
   - Check token is passed in `auth.token` or `Authorization` header

2. **Events Not Received**
   - Verify client is subscribed to the correct room
   - Check server logs for event emission
   - Ensure Redis is running and connected

3. **Disconnections**
   - Check network stability
   - Verify firewall allows WebSocket connections
   - Review server logs for errors

### Testing

Use Socket.io client tools for testing:

```bash
# Install socket.io-client globally
npm install -g socket.io-client

# Test connection
socket-io-client http://localhost:5000 --auth '{"token":"your-jwt-token"}'
```

## Future Enhancements

- [ ] Add event replay for missed events
- [ ] Implement event acknowledgments
- [ ] Add binary data support for media
- [ ] Implement presence system (online/offline status)
- [ ] Add typing indicator timeout
- [ ] Implement message delivery guarantees
