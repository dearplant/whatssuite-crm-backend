# Contact Management System

## Overview

This document describes the Contact Management CRUD operations implementation for the WhatsApp CRM backend system.

## Implementation Status

✅ **Completed:**
- Contact Model with all query methods (`backend/src/models/contact.js`)
- Contact Service with business logic (`backend/src/services/contactService.js`)
- Contact Controller with HTTP handlers (`backend/src/controllers/contactController.js`)
- Contact Validation Schemas (`backend/src/validators/contactValidator.js`)
- Contact Routes with RBAC (`backend/src/routes/contactRoutes.js`)
- Routes registered in Express app (`backend/src/app.js`)
- Comprehensive test suite (`backend/tests/contact.test.js`)

⚠️ **Prerequisites Required:**
- Contact model must be added to Prisma schema (`backend/prisma/schema.prisma`)
- Database migration must be run to create the contacts table
- Existing WhatsApp account required for testing

## API Endpoints

### POST /api/v1/contacts
Create a new contact with duplicate detection.

**Permission Required:** `contacts:create`

**Request Body:**
```json
{
  "whatsappAccountId": "uuid",
  "phone": "+1234567890",
  "name": "John Doe",
  "email": "john@example.com",
  "company": "Acme Inc",
  "jobTitle": "CEO",
  "address": "123 Main St",
  "city": "New York",
  "state": "NY",
  "country": "USA",
  "postalCode": "10001",
  "tags": ["customer", "vip"],
  "customFields": {},
  "notes": "Important client",
  "isBlocked": false,
  "isPinned": false
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "Contact created successfully",
  "data": {
    "id": "uuid",
    "userId": "uuid",
    "whatsappAccountId": "uuid",
    "phone": "+1234567890",
    "name": "John Doe",
    "email": "john@example.com",
    "company": "Acme Inc",
    "tags": ["customer", "vip"],
    "source": "Manual",
    "createdAt": "2025-11-05T10:00:00Z",
    "updatedAt": "2025-11-05T10:00:00Z"
  }
}
```

**Error Responses:**
- `400` - Validation error (invalid phone format, missing required fields)
- `401` - Unauthorized (missing or invalid token)
- `403` - Forbidden (insufficient permissions or unauthorized WhatsApp account access)
- `404` - WhatsApp account not found
- `409` - Conflict (duplicate phone number for the same WhatsApp account)

### GET /api/v1/contacts
Retrieve contacts with filters and pagination.

**Permission Required:** `contacts:read`

**Query Parameters:**
- `whatsappAccountId` (optional) - Filter by WhatsApp account
- `search` (optional) - Search by name, phone, or email
- `tags` (optional) - Filter by tags (comma-separated or array)
- `isBlocked` (optional) - Filter by blocked status
- `page` (optional, default: 1) - Page number
- `limit` (optional, default: 50, max: 100) - Items per page

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "John Doe",
      "phone": "+1234567890",
      "email": "john@example.com",
      "company": "Acme Inc",
      "tags": ["customer", "vip"],
      "lastMessageAt": "2025-11-05T09:00:00Z",
      "unreadCount": 2,
      "totalMessages": 45,
      "createdAt": "2025-11-04T10:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 150,
    "totalPages": 3
  }
}
```

### GET /api/v1/contacts/:id
Retrieve contact by ID with related data.

**Permission Required:** `contacts:read`

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "John Doe",
    "phone": "+1234567890",
    "email": "john@example.com",
    "company": "Acme Inc",
    "tags": ["customer", "vip"],
    "customFields": {},
    "notes": "Important client",
    "whatsappAccount": {
      "id": "uuid",
      "phoneNumber": "+1987654321",
      "displayName": "Business Account"
    },
    "messages": [
      {
        "id": "uuid",
        "direction": "Outbound",
        "type": "Text",
        "content": "Hello!",
        "status": "Delivered",
        "createdAt": "2025-11-05T09:00:00Z"
      }
    ],
    "_count": {
      "messages": 45,
      "campaignRecipients": 3
    },
    "createdAt": "2025-11-04T10:00:00Z",
    "updatedAt": "2025-11-05T10:00:00Z"
  }
}
```

**Error Responses:**
- `401` - Unauthorized
- `403` - Forbidden (contact belongs to another user)
- `404` - Contact not found

### PUT /api/v1/contacts/:id
Update contact information.

**Permission Required:** `contacts:update`

**Request Body (all fields optional):**
```json
{
  "name": "John Updated",
  "email": "newemail@example.com",
  "company": "New Company",
  "tags": ["customer", "premium"],
  "notes": "Updated notes",
  "isBlocked": false,
  "isPinned": true
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Contact updated successfully",
  "data": {
    "id": "uuid",
    "name": "John Updated",
    "email": "newemail@example.com",
    "updatedAt": "2025-11-05T10:30:00Z"
  }
}
```

**Error Responses:**
- `400` - Validation error (empty update, invalid data)
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Contact not found

### DELETE /api/v1/contacts/:id
Soft delete a contact.

**Permission Required:** `contacts:delete`

**Response (200):**
```json
{
  "success": true,
  "message": "Contact deleted successfully"
}
```

**Error Responses:**
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Contact not found

## Features

### Duplicate Detection
The system prevents creating duplicate contacts with the same phone number for a given WhatsApp account. The unique constraint is on the combination of `whatsappAccountId` and `phone`.

### Search and Filtering
Contacts can be searched by:
- Name (case-insensitive)
- Phone number
- Email (case-insensitive)

Contacts can be filtered by:
- WhatsApp account
- Tags (supports multiple tags)
- Blocked status

### Pagination
All list endpoints support pagination with configurable page size (max 100 items per page).

### Related Data
When retrieving a single contact, the response includes:
- Associated WhatsApp account details
- Last 10 messages
- Total message count
- Total campaign recipient count

### Soft Delete
Contacts are soft-deleted by setting the `deletedAt` timestamp. This preserves historical data while removing contacts from active queries.

### Authorization
All endpoints enforce:
- JWT authentication
- Role-based access control (RBAC)
- User ownership verification (users can only access their own contacts)

## Validation Rules

### Phone Number
- Must be in E.164 format: `+[country code][number]`
- Example: `+1234567890`
- Pattern: `/^\+[1-9]\d{1,14}$/`

### Name
- Required
- Minimum 2 characters
- Maximum 100 characters

### Email
- Optional
- Must be valid email format

### Tags
- Optional
- Array of strings

### Custom Fields
- Optional
- JSON object for flexible data storage

## Security

### Authentication
All endpoints require a valid JWT access token in the Authorization header:
```
Authorization: Bearer <access_token>
```

### Authorization
Permissions are enforced based on user roles:
- **Owner**: Full access to all contact operations
- **Admin**: Full access to all contact operations
- **Manager**: Full access to all contact operations
- **Agent**: Can create, read, and update contacts (cannot delete)

### Data Isolation
Users can only access contacts that belong to them. The system verifies:
1. The contact belongs to the authenticated user
2. The WhatsApp account belongs to the authenticated user

## Error Handling

All errors follow a consistent format:
```json
{
  "error": "ErrorType",
  "message": "Human-readable error message",
  "details": {
    "field": "Specific field error"
  }
}
```

## Logging

All contact operations are logged with:
- User ID
- Contact ID
- Operation type
- Timestamp
- Success/failure status

## Testing

Comprehensive test suite covers:
- ✅ Creating contacts with valid data
- ✅ Duplicate detection
- ✅ Phone format validation
- ✅ Required field validation
- ✅ Unauthorized access prevention
- ✅ Pagination
- ✅ Search functionality
- ✅ Tag filtering
- ✅ WhatsApp account filtering
- ✅ Retrieving contact with related data
- ✅ 404 handling for non-existent contacts
- ✅ Updating contacts
- ✅ Partial updates
- ✅ Empty update rejection
- ✅ Soft delete functionality

## Next Steps

To complete the contact management system:

1. **Add Contact model to Prisma schema** (if not already present)
2. **Run database migration** to create the contacts table
3. **Run tests** to verify implementation:
   ```bash
   npm test -- contact.test.js
   ```

## Related Documentation

- [RBAC Implementation](./RBAC_IMPLEMENTATION.md)
- [Authentication](./AUTHENTICATION.md)
- [Database Schema](./SCHEMA_REFERENCE.md)
