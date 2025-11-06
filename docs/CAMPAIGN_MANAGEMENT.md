# Campaign Management

This document describes the campaign management system implementation for the WhatsApp CRM backend.

## Overview

The campaign management system allows users to create, manage, and track broadcast campaigns sent to multiple contacts via WhatsApp. Campaigns support various audience targeting options, scheduling, and detailed analytics.

## Features

- **Campaign Creation**: Create campaigns with flexible audience targeting
- **Audience Targeting**: Support for all contacts, segments, custom lists, and tag-based targeting
- **Scheduling**: Immediate, scheduled, or recurring campaign execution
- **Recipient Management**: Automatic recipient calculation and exclusion lists
- **Campaign Analytics**: Detailed statistics including delivery, read, and reply rates
- **Campaign Control**: Update, delete, and manage campaign lifecycle

## Database Schema

### campaigns Table

```prisma
model campaigns {
  id                 String              @id
  team_id            String
  account_id         String
  user_id            String
  template_id        String?
  name               String
  description        String?
  messageType        String
  message_content    String?
  template_variables Json?
  audienceType       String
  audience_config    Json
  schedule_type      String              @default("now")
  scheduled_at       DateTime?
  recurring_config   Json?
  throttle_config    Json
  status             String              @default("draft")
  total_recipients   Int                 @default(0)
  messages_sent      Int                 @default(0)
  messages_delivered Int                 @default(0)
  messages_read      Int                 @default(0)
  messages_replied   Int                 @default(0)
  messages_failed    Int                 @default(0)
  started_at         DateTime?
  completed_at       DateTime?
  created_at         DateTime            @default(now())
  updated_at         DateTime
}
```

### campaign_messages Table

```prisma
model campaign_messages {
  id            String    @id
  campaign_id   String
  contact_id    String
  message_id    String?
  status        String    @default("pending")
  error_message String?
  sent_at       DateTime?
  delivered_at  DateTime?
  read_at       DateTime?
  replied_at    DateTime?
  created_at    DateTime  @default(now())
}
```

## API Endpoints

### 1. Create Campaign

**Endpoint**: `POST /api/v1/campaigns`

**Permission**: `campaigns:create`

**Request Body**:
```json
{
  "name": "Summer Sale Campaign",
  "description": "Promotional campaign for summer sale",
  "accountId": "uuid",
  "messageType": "text",
  "messageContent": "Hi {{name}}, check out our summer sale!",
  "audienceType": "segment",
  "audienceConfig": {
    "segmentId": "uuid",
    "excludeContactIds": ["uuid1", "uuid2"]
  },
  "scheduleType": "scheduled",
  "scheduledAt": "2024-12-25T10:00:00Z",
  "throttleConfig": {
    "messagesPerMinute": 20
  }
}
```

**Response**:
```json
{
  "success": true,
  "message": "Campaign created successfully",
  "data": {
    "id": "uuid",
    "name": "Summer Sale Campaign",
    "status": "scheduled",
    "total_recipients": 1500,
    "created_at": "2024-12-20T10:00:00Z"
  }
}
```

### 2. List Campaigns

**Endpoint**: `GET /api/v1/campaigns`

**Permission**: `campaigns:read`

**Query Parameters**:
- `page` (number, default: 1)
- `limit` (number, default: 20, max: 100)
- `status` (string: draft, scheduled, running, paused, completed, failed)
- `accountId` (uuid)
- `search` (string)
- `sortBy` (string: created_at, updated_at, scheduled_at, name, status)
- `sortOrder` (string: asc, desc)
- `startDate` (ISO date)
- `endDate` (ISO date)

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "Summer Sale Campaign",
      "status": "scheduled",
      "total_recipients": 1500,
      "messages_sent": 0,
      "scheduled_at": "2024-12-25T10:00:00Z",
      "created_at": "2024-12-20T10:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 45,
    "totalPages": 3
  }
}
```

### 3. Get Campaign Details

**Endpoint**: `GET /api/v1/campaigns/:id`

**Permission**: `campaigns:read`

**Response**:
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "Summer Sale Campaign",
    "description": "Promotional campaign for summer sale",
    "status": "completed",
    "total_recipients": 1500,
    "messages_sent": 1500,
    "messages_delivered": 1450,
    "messages_read": 1200,
    "messages_replied": 150,
    "messages_failed": 50,
    "stats": {
      "deliveryRate": "96.67",
      "readRate": "82.76",
      "failureRate": "3.33",
      "replyRate": "10.34",
      "pending": 0
    },
    "whatsapp_accounts": {
      "id": "uuid",
      "name": "Business Account",
      "phone": "+1234567890"
    },
    "created_at": "2024-12-20T10:00:00Z",
    "started_at": "2024-12-25T10:00:00Z",
    "completed_at": "2024-12-25T12:30:00Z"
  }
}
```

### 4. Update Campaign

**Endpoint**: `PUT /api/v1/campaigns/:id`

**Permission**: `campaigns:update`

**Request Body**:
```json
{
  "name": "Updated Campaign Name",
  "description": "Updated description",
  "scheduledAt": "2024-12-26T10:00:00Z",
  "throttleConfig": {
    "messagesPerMinute": 15
  }
}
```

**Response**:
```json
{
  "success": true,
  "message": "Campaign updated successfully",
  "data": {
    "id": "uuid",
    "name": "Updated Campaign Name",
    "updated_at": "2024-12-20T11:00:00Z"
  }
}
```

**Notes**:
- Cannot update campaigns with status `running` or `completed`
- Only draft, scheduled, and paused campaigns can be updated

### 5. Delete Campaign

**Endpoint**: `DELETE /api/v1/campaigns/:id`

**Permission**: `campaigns:delete`

**Response**:
```json
{
  "success": true,
  "message": "Campaign deleted successfully"
}
```

**Notes**:
- Cannot delete running campaigns
- Deleting a campaign also deletes all associated campaign_messages records (cascade)

### 6. Get Campaign Recipients

**Endpoint**: `GET /api/v1/campaigns/:id/recipients`

**Permission**: `campaigns:read`

**Query Parameters**:
- `page` (number, default: 1)
- `limit` (number, default: 50, max: 100)
- `status` (string: pending, sent, delivered, read, failed)
- `sortBy` (string: created_at, sent_at, delivered_at, read_at, status)
- `sortOrder` (string: asc, desc)

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "campaign_id": "uuid",
      "contact_id": "uuid",
      "status": "delivered",
      "sent_at": "2024-12-25T10:05:00Z",
      "delivered_at": "2024-12-25T10:05:30Z",
      "contacts": {
        "id": "uuid",
        "phone": "+1234567890",
        "first_name": "John",
        "last_name": "Doe",
        "email": "john@example.com"
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 1500,
    "totalPages": 30
  }
}
```

## Audience Targeting

### Audience Types

1. **All Contacts** (`audienceType: "all"`)
   - Targets all active, non-blocked contacts in the team
   - No additional configuration required

2. **Segment** (`audienceType: "segment"`)
   - Targets contacts matching a predefined segment
   - Requires `segmentId` in `audienceConfig`

3. **Custom List** (`audienceType: "custom"`)
   - Targets specific contacts by ID
   - Requires `contactIds` array in `audienceConfig`
   - Maximum 10,000 contacts per campaign

4. **Tags** (`audienceType: "tags"`)
   - Targets contacts with specific tags
   - Requires `tags` array in `audienceConfig`

### Exclusion Lists

All audience types support contact exclusion via `excludeContactIds` in `audienceConfig`:

```json
{
  "audienceType": "all",
  "audienceConfig": {
    "excludeContactIds": ["uuid1", "uuid2", "uuid3"]
  }
}
```

## Message Types

- **text**: Plain text messages
- **template**: WhatsApp Business API templates with variables
- **image**: Image messages with caption
- **video**: Video messages with caption
- **document**: Document messages

## Scheduling

### Schedule Types

1. **Immediate** (`scheduleType: "now"`)
   - Campaign starts immediately after creation
   - Status changes to `scheduled` and picked up by worker

2. **Scheduled** (`scheduleType: "scheduled"`)
   - Campaign starts at specified `scheduledAt` time
   - Must be a future date/time

3. **Recurring** (`scheduleType: "recurring"`)
   - Campaign repeats based on `recurringConfig`
   - Supports daily, weekly, monthly frequencies
   - Can set end date or max occurrences

## Throttling

Control message sending rate to avoid rate limits:

```json
{
  "throttleConfig": {
    "messagesPerMinute": 20
  }
}
```

- Default: 10 messages per minute
- Maximum: 100 messages per minute
- Recommended: 20 messages per minute for optimal delivery

## Campaign Status Flow

```
draft → scheduled → running → completed
                  ↓
                paused → running
                  ↓
                failed
```

- **draft**: Campaign created but not scheduled
- **scheduled**: Campaign scheduled for execution
- **running**: Campaign currently sending messages
- **paused**: Campaign temporarily stopped
- **completed**: All messages sent successfully
- **failed**: Campaign execution failed

## Validation Rules

### Campaign Name
- Required
- 1-255 characters

### Message Content
- Required for text, image, video, document types
- Maximum 4096 characters

### Audience Configuration
- Must match selected audience type
- Custom lists: 1-10,000 contacts
- Segment: Valid segment ID required
- Tags: At least one tag required

### Scheduling
- Scheduled time must be in the future
- Recurring config required for recurring campaigns

## Error Handling

### Common Errors

1. **WhatsApp Account Not Found**
   - Status: 400
   - Message: "WhatsApp account not found or inactive"

2. **No Recipients Found**
   - Status: 400
   - Message: "No recipients found for the specified audience"

3. **Cannot Update Running Campaign**
   - Status: 400
   - Message: "Cannot update campaign with status: running"

4. **Cannot Delete Running Campaign**
   - Status: 400
   - Message: "Cannot delete a running campaign. Please pause it first."

5. **Campaign Not Found**
   - Status: 404
   - Message: "Campaign not found"

## Performance Considerations

### Recipient Calculation
- Performed during campaign creation
- Cached in `total_recipients` field
- Large segments (>10,000 contacts) may take a few seconds

### Batch Operations
- Recipients inserted in batches for performance
- Supports up to 100,000 recipients per campaign

### Indexing
- Campaigns indexed by: team_id, status, account_id, scheduled_at
- Campaign messages indexed by: campaign_id, contact_id, status

## Security

### RBAC Permissions
- `campaigns:create` - Create campaigns
- `campaigns:read` - View campaigns and recipients
- `campaigns:update` - Update campaign details
- `campaigns:delete` - Delete campaigns
- `campaigns:start` - Start/resume campaigns (future implementation)
- `campaigns:pause` - Pause campaigns (future implementation)

### Data Isolation
- All queries filtered by team_id
- Users can only access campaigns in their team
- WhatsApp accounts verified to belong to team

## Future Enhancements (Tasks 18-20)

The following features will be implemented in subsequent tasks:

1. **Campaign Execution Engine** (Task 18)
   - Queue-based message sending
   - Rate limiting enforcement
   - Progress tracking
   - Real-time Socket.io updates

2. **Campaign Control** (Task 19)
   - Start/pause/resume campaigns
   - Campaign duplication
   - Recipient management

3. **A/B Testing** (Task 20)
   - Multiple message variants
   - Automatic winner selection
   - Variant performance tracking

## Testing

Run campaign tests:
```bash
npm test -- campaign.test.js
```

## Related Documentation

- [Contact Management](./CONTACT_MANAGEMENT.md)
- [Message System](./MESSAGE_SYSTEM.md)
- [RBAC Implementation](./RBAC_IMPLEMENTATION.md)
- [WhatsApp Integration](./WHATSAPP_INTEGRATION.md)
