# Message System Documentation

## Overview

The message system handles sending and receiving WhatsApp messages with queue-based processing, retry logic, rate limiting, and media file support.

## Architecture

### Components

1. **Message Model** (`src/models/message.js`)
   - Database operations for messages
   - Status tracking (Queued, Sent, Delivered, Read, Failed)
   - Message statistics and filtering

2. **Message Service** (`src/services/messageService.js`)
   - Business logic for message operations
   - Handles incoming and outgoing messages
   - Integrates with WhatsApp service and file upload

3. **Message Worker** (`src/workers/messageWorker.js`)
   - Processes message queue asynchronously
   - Implements retry logic with exponential backoff
   - Rate limiting (20 messages per minute)
   - Concurrency: 10 workers

4. **Message Controller** (`src/controllers/messageController.js`)
   - HTTP request handlers
   - Input validation
   - Response formatting

5. **Message Routes** (`src/routes/messageRoutes.js`)
   - API endpoint definitions
   - Authentication and authorization
   - Permission checks

## API Endpoints

### Send Message
```
POST /api/v1/messages
```

**Request Body:**
```json
{
  "whatsappAccountId": "uuid",
  "to": "+1234567890",
  "type": "Text",
  "content": "Hello, World!",
  "mediaUrl": "https://example.com/image.jpg",
  "scheduledFor": "2025-11-06T10:00:00Z"
}
```

**Response (202 Accepted):**
```json
{
  "success": true,
  "message": "Message queued for sending",
  "data": {
    "id": "uuid",
    "status": "Queued",
    "whatsappAccountId": "uuid",
    "contactId": "uuid",
    "type": "Text",
    "content": "Hello, World!",
    "createdAt": "2025-11-05T10:00:00Z"
  }
}
```

### Get Messages
```
GET /api/v1/messages?whatsappAccountId=uuid&page=1&limit=50
```

**Query Parameters:**
- `whatsappAccountId` (optional): Filter by WhatsApp account
- `contactId` (optional): Filter by contact
- `direction` (optional): Inbound or Outbound
- `type` (optional): Text, Image, Video, Audio, Document
- `status` (optional): Queued, Sent, Delivered, Read, Failed
- `startDate` (optional): ISO date string
- `endDate` (optional): ISO date string
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 50, max: 100)

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "messages": [...],
    "total": 100,
    "page": 1,
    "limit": 50,
    "totalPages": 2
  }
}
```

### Get Message by ID
```
GET /api/v1/messages/:id
```

### Get Message Statistics
```
GET /api/v1/messages/statistics?whatsappAccountId=uuid
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "total": 1000,
    "byStatus": {
      "Queued": 10,
      "Sent": 500,
      "Delivered": 400,
      "Read": 80,
      "Failed": 10
    },
    "byDirection": {
      "Inbound": 600,
      "Outbound": 400
    },
    "byType": {
      "Text": 900,
      "Image": 80,
      "Video": 20
    }
  }
}
```

### Mark Message as Read
```
PUT /api/v1/messages/:id/read
```

### Retry Failed Message
```
POST /api/v1/messages/:id/retry
```

## Message Flow

### Outbound Messages

1. **API Request** → Message Controller
2. **Validation** → Message Validator
3. **Service Layer** → Message Service
   - Validates WhatsApp account
   - Checks daily limit
   - Finds or creates contact
   - Uploads media file (if provided)
   - Creates message record with status "Queued"
4. **Queue** → Message Worker
   - Adds job to Bull queue
   - Respects rate limiting (20 msg/min)
5. **Worker Processing** → Message Worker
   - Retrieves message from database
   - Calls WhatsApp service to send
   - Updates status to "Sent"
   - Handles retries on failure (3 attempts with exponential backoff)
6. **Status Updates** → WhatsApp Service
   - Listens for delivery receipts
   - Updates message status (Delivered, Read)

### Inbound Messages

1. **WhatsApp Event** → WhatsApp Service
2. **Message Handler** → Message Service
   - Checks for duplicate messages
   - Finds or creates contact
   - Downloads and uploads media (if present)
   - Creates message record with status "Delivered"
3. **Contact Update**
   - Updates last message timestamp
   - Increments unread count
   - Increments total messages

## Message Status Lifecycle

```
Queued → Sent → Delivered → Read
   ↓
Failed (after 3 retry attempts)
```

## Rate Limiting

- **Queue Level**: 20 messages per minute (configured in Bull queue)
- **Account Level**: Daily limit per WhatsApp account (default: 1000)
- **Retry Logic**: Exponential backoff starting at 5 seconds

## Media File Handling

### Supported Types
- Images: JPEG, PNG, GIF, WebP
- Videos: MP4, MPEG
- Audio: MP3, OGG, WAV
- Documents: PDF, DOC, DOCX

### Upload Process
1. File validation (size, type)
2. Upload to S3 with unique filename
3. Store URL in message record
4. Use URL when sending via WhatsApp

### Configuration
- Max file size: 10MB (configurable via `AWS_S3_MAX_FILE_SIZE`)
- Storage: AWS S3 or Cloudinary
- Folder structure: `messages/`

## Error Handling

### Common Errors

1. **WhatsApp Account Not Connected**
   - Status Code: 400
   - Message: "WhatsApp account is not connected"

2. **Daily Limit Reached**
   - Status Code: 400
   - Message: "Daily message limit reached"

3. **Invalid Phone Number**
   - Status Code: 400
   - Message: "Phone number must be in E.164 format"

4. **Message Send Failure**
   - Status: Failed
   - Retry: Automatic (3 attempts)
   - Error message stored in database

## Database Schema

### Message Table

```prisma
model Message {
  id                String             @id @default(uuid())
  userId            String
  whatsappAccountId String
  contactId         String
  campaignId        String?
  direction         MessageDirection   // Inbound, Outbound
  type              MessageType        // Text, Image, Video, Audio, Document
  content           String             @db.Text
  mediaUrl          String?
  whatsappMessageId String             @unique
  status            MessageStatus      // Queued, Sent, Delivered, Read, Failed
  errorMessage      String?
  scheduledFor      DateTime?
  sentAt            DateTime?
  deliveredAt       DateTime?
  readAt            DateTime?
  isFromBot         Boolean            @default(false)
  createdAt         DateTime           @default(now())
  updatedAt         DateTime           @updatedAt
}
```

## Performance Considerations

1. **Queue Concurrency**: 10 workers process messages simultaneously
2. **Database Indexes**: 
   - `[whatsappAccountId, contactId, createdAt]`
   - `[campaignId]`
   - `[status]`
3. **Pagination**: Default 50 items, max 100
4. **Rate Limiting**: Prevents WhatsApp account bans

## Monitoring

### Queue Metrics
- Waiting jobs
- Active jobs
- Completed jobs
- Failed jobs

### Message Metrics
- Total messages
- Messages by status
- Messages by direction
- Messages by type
- Delivery rate
- Read rate

## Testing

Run message tests:
```bash
npm test -- tests/message.test.js
```

## Future Enhancements

1. Message templates
2. Bulk message sending
3. Message scheduling with cron
4. Message analytics dashboard
5. Webhook notifications for message events
6. Message search and filtering
7. Message export functionality
