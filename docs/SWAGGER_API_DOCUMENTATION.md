# Swagger API Documentation

## Overview

The WhatsApp CRM API is fully documented using OpenAPI 3.0 (Swagger) specification. This provides interactive API documentation that allows you to explore and test all endpoints directly from your browser.

## Accessing Swagger UI

### Development Environment

Once the server is running, access the Swagger UI at:

```
http://localhost:5000/api-docs
```

### Production Environment

```
https://api.whatsappcrm.com/api-docs
```

## Features

### Interactive Documentation

- **Try It Out**: Test API endpoints directly from the browser
- **Request/Response Examples**: See example payloads for all endpoints
- **Schema Validation**: View request and response schemas
- **Authentication**: Test authenticated endpoints with JWT tokens

### API Specification

Download the OpenAPI specification in JSON format:

```
http://localhost:5000/api-docs.json
```

## Authentication

Most endpoints require JWT authentication. To test authenticated endpoints:

1. **Login** using the `/api/v1/auth/login` endpoint
2. Copy the `accessToken` from the response
3. Click the **Authorize** button at the top of Swagger UI
4. Enter: `Bearer <your-access-token>`
5. Click **Authorize**

Now all subsequent requests will include the authentication token.

## API Categories

### 1. Authentication (`/api/v1/auth`)

User authentication and authorization endpoints:

- `POST /register` - Register new user
- `POST /login` - Login and get JWT tokens
- `POST /refresh` - Refresh access token
- `POST /logout` - Logout user
- `GET /me` - Get current user profile
- `PUT /profile` - Update user profile
- `POST /forgot-password` - Request password reset
- `POST /reset-password` - Reset password
- `POST /verify-email` - Verify email address

**Example: Register User**
```json
POST /api/v1/auth/register
{
  "email": "john.doe@example.com",
  "password": "SecurePass123!",
  "first_name": "John",
  "last_name": "Doe"
}
```

**Response:**
```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "user": {
      "id": "user_123abc",
      "email": "john.doe@example.com",
      "first_name": "John",
      "last_name": "Doe",
      "role": "Owner"
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

### 2. Contacts (`/api/v1/contacts`)

Contact management endpoints:

- `GET /contacts` - List all contacts (with pagination, search, filters)
- `POST /contacts` - Create new contact
- `GET /contacts/:id` - Get contact by ID
- `PUT /contacts/:id` - Update contact
- `DELETE /contacts/:id` - Delete contact
- `POST /contacts/import` - Import contacts from CSV/Excel
- `GET /contacts/export` - Export contacts

**Example: Create Contact**
```json
POST /api/v1/contacts
{
  "phone_number": "+1234567890",
  "name": "Jane Smith",
  "email": "jane@example.com",
  "tags": ["customer", "vip"],
  "custom_fields": {
    "company": "Acme Corp",
    "position": "CEO"
  }
}
```

### 3. Messages (`/api/v1/messages`)

Message operations:

- `POST /messages` - Send message
- `GET /messages/:contactId` - Get messages for contact
- `GET /messages/:id` - Get message by ID
- `PUT /messages/:id/status` - Update message status
- `POST /messages/bulk` - Send bulk messages

**Example: Send Message**
```json
POST /api/v1/messages
{
  "contact_id": "contact_456def",
  "content": "Hello! How can I help you today?",
  "type": "text"
}
```

**Example: Send Image**
```json
POST /api/v1/messages
{
  "contact_id": "contact_456def",
  "content": "Check out this image!",
  "type": "image",
  "media_url": "https://example.com/image.jpg"
}
```

### 4. Campaigns (`/api/v1/campaigns`)

Campaign management:

- `GET /campaigns` - List campaigns
- `POST /campaigns` - Create campaign
- `GET /campaigns/:id` - Get campaign details
- `PUT /campaigns/:id` - Update campaign
- `DELETE /campaigns/:id` - Delete campaign
- `POST /campaigns/:id/start` - Start campaign
- `POST /campaigns/:id/pause` - Pause campaign
- `GET /campaigns/:id/stats` - Get campaign statistics

**Example: Create Campaign**
```json
POST /api/v1/campaigns
{
  "name": "Summer Sale 2024",
  "message_template": "Hi {{name}}, check out our summer sale! Get {{discount}}% off.",
  "segment_id": "segment_123",
  "scheduled_at": "2024-06-01T10:00:00.000Z",
  "variables": {
    "discount": "20"
  }
}
```

### 5. WhatsApp Accounts (`/api/v1/whatsapp`)

WhatsApp account management:

- `GET /whatsapp/accounts` - List WhatsApp accounts
- `POST /whatsapp/accounts` - Add WhatsApp account
- `GET /whatsapp/accounts/:id` - Get account details
- `DELETE /whatsapp/accounts/:id` - Remove account
- `GET /whatsapp/accounts/:id/qr` - Get QR code for connection
- `POST /whatsapp/accounts/:id/disconnect` - Disconnect account

**Example: Add WhatsApp Account**
```json
POST /api/v1/whatsapp/accounts
{
  "phone_number": "+1234567890",
  "name": "Business Account"
}
```

### 6. AI Providers (`/api/v1/ai/providers`)

AI provider configuration:

- `GET /ai/providers` - List AI providers
- `POST /ai/providers` - Create AI provider
- `GET /ai/providers/:id` - Get provider details
- `PUT /ai/providers/:id` - Update provider
- `DELETE /ai/providers/:id` - Delete provider
- `POST /ai/providers/:id/test` - Test provider

**Example: Create OpenAI Provider**
```json
POST /api/v1/ai/providers
{
  "provider": "OpenAI",
  "credentials": {
    "apiKey": "sk-..."
  },
  "modelConfig": {
    "model": "gpt-4",
    "temperature": 0.7,
    "maxTokens": 1000
  }
}
```

### 7. Chatbots (`/api/v1/ai/chatbots`)

Chatbot management:

- `GET /ai/chatbots` - List chatbots
- `POST /ai/chatbots` - Create chatbot
- `GET /ai/chatbots/:id` - Get chatbot details
- `PUT /ai/chatbots/:id` - Update chatbot
- `DELETE /ai/chatbots/:id` - Delete chatbot
- `POST /ai/chatbots/:id/activate` - Activate chatbot
- `POST /ai/chatbots/:id/test` - Test chatbot

**Example: Create Chatbot**
```json
POST /api/v1/ai/chatbots
{
  "name": "Customer Support Bot",
  "ai_provider_id": "provider_123",
  "system_prompt": "You are a helpful customer support assistant. Be friendly and professional.",
  "triggers": {
    "autoReply": true,
    "keywords": ["help", "support", "question"]
  },
  "conversation_timeout": 60,
  "max_turns": 10
}
```

### 8. Voice Transcription (`/api/v1/ai/transcribe`)

Voice transcription endpoints:

- `POST /ai/transcribe` - Transcribe audio message
- `GET /ai/transcriptions` - List transcriptions
- `GET /ai/transcriptions/:id` - Get transcription by ID
- `GET /ai/transcriptions/message/:messageId` - Get transcription by message
- `GET /ai/transcription/providers` - List available providers

**Example: Transcribe Audio**
```json
POST /api/v1/ai/transcribe
{
  "messageId": "msg_789ghi",
  "audioUrl": "https://example.com/audio.ogg",
  "language": "en",
  "provider": "WhisperAPI",
  "triggerChatbot": true
}
```

**Response:**
```json
{
  "success": true,
  "message": "Transcription job queued",
  "data": {
    "jobId": "job_456",
    "messageId": "msg_789ghi",
    "status": "queued"
  }
}
```

### 9. Automation Flows (`/api/v1/flows`)

Workflow automation:

- `GET /flows` - List flows
- `POST /flows` - Create flow
- `GET /flows/:id` - Get flow details
- `PUT /flows/:id` - Update flow
- `DELETE /flows/:id` - Delete flow
- `POST /flows/:id/activate` - Activate flow
- `POST /flows/:id/test` - Test flow

**Example: Create Welcome Flow**
```json
POST /api/v1/flows
{
  "name": "Welcome Flow",
  "trigger": {
    "type": "new_contact",
    "conditions": {
      "tags": ["new"]
    }
  },
  "actions": [
    {
      "type": "send_message",
      "config": {
        "message": "Welcome to our service! How can we help you?"
      },
      "delay": 0
    },
    {
      "type": "add_tag",
      "config": {
        "tag": "welcomed"
      },
      "delay": 60
    }
  ]
}
```

## Common Response Formats

### Success Response

```json
{
  "success": true,
  "message": "Operation successful",
  "data": { ... }
}
```

### Error Response

```json
{
  "success": false,
  "message": "Error message",
  "errors": [
    {
      "field": "email",
      "message": "Email is required"
    }
  ]
}
```

### Pagination Response

```json
{
  "success": true,
  "data": [ ... ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 150,
    "totalPages": 3
  }
}
```

## Rate Limiting

Authentication endpoints are rate-limited:

- **Login/Register**: 5 requests per 15 minutes per IP
- **Password Reset**: 5 requests per 15 minutes per IP
- **Other endpoints**: 100 requests per 15 minutes per user

Rate limit headers:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1640000000
```

## Error Codes

| Status Code | Description |
|-------------|-------------|
| 200 | Success |
| 201 | Created |
| 202 | Accepted (async operation) |
| 400 | Bad Request (validation error) |
| 401 | Unauthorized (missing/invalid token) |
| 403 | Forbidden (insufficient permissions) |
| 404 | Not Found |
| 409 | Conflict (duplicate resource) |
| 429 | Too Many Requests (rate limit) |
| 500 | Internal Server Error |

## Webhooks

Configure webhooks to receive real-time events:

```json
POST /api/v1/webhooks
{
  "url": "https://your-app.com/webhook",
  "events": [
    "message.received",
    "message.sent",
    "campaign.completed",
    "transcription.completed"
  ],
  "secret": "your-webhook-secret"
}
```

## Socket.io Events

Real-time events via Socket.io:

```javascript
// Connect with JWT token
const socket = io('http://localhost:5000', {
  auth: {
    token: 'your-jwt-token'
  }
});

// Listen for events
socket.on('message:received', (data) => {
  console.log('New message:', data);
});

socket.on('transcription:completed', (data) => {
  console.log('Transcription done:', data);
});

socket.on('campaign:progress', (data) => {
  console.log('Campaign progress:', data);
});
```

## Code Examples

### JavaScript/Node.js

```javascript
const axios = require('axios');

const API_URL = 'http://localhost:5000/api/v1';
let accessToken = '';

// Login
async function login() {
  const response = await axios.post(`${API_URL}/auth/login`, {
    email: 'john.doe@example.com',
    password: 'SecurePass123!'
  });
  accessToken = response.data.data.accessToken;
}

// Send message
async function sendMessage(contactId, content) {
  const response = await axios.post(
    `${API_URL}/messages`,
    {
      contact_id: contactId,
      content: content,
      type: 'text'
    },
    {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    }
  );
  return response.data;
}
```

### Python

```python
import requests

API_URL = 'http://localhost:5000/api/v1'
access_token = ''

# Login
def login():
    global access_token
    response = requests.post(f'{API_URL}/auth/login', json={
        'email': 'john.doe@example.com',
        'password': 'SecurePass123!'
    })
    access_token = response.json()['data']['accessToken']

# Send message
def send_message(contact_id, content):
    response = requests.post(
        f'{API_URL}/messages',
        json={
            'contact_id': contact_id,
            'content': content,
            'type': 'text'
        },
        headers={
            'Authorization': f'Bearer {access_token}'
        }
    )
    return response.json()
```

### cURL

```bash
# Login
curl -X POST http://localhost:5000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john.doe@example.com",
    "password": "SecurePass123!"
  }'

# Send message (replace TOKEN with your access token)
curl -X POST http://localhost:5000/api/v1/messages \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TOKEN" \
  -d '{
    "contact_id": "contact_456def",
    "content": "Hello!",
    "type": "text"
  }'
```

## Testing with Postman

1. Import the OpenAPI spec into Postman:
   - File → Import → Link
   - Enter: `http://localhost:5000/api-docs.json`

2. Set up environment variables:
   - `base_url`: `http://localhost:5000/api/v1`
   - `access_token`: (will be set after login)

3. Create a login request and save the token to environment

## Best Practices

1. **Always use HTTPS in production**
2. **Store JWT tokens securely** (httpOnly cookies or secure storage)
3. **Refresh tokens before expiry** (access tokens expire in 15 minutes)
4. **Handle rate limits** with exponential backoff
5. **Validate input** on client side before sending
6. **Use pagination** for large datasets
7. **Subscribe to webhooks** for real-time updates
8. **Monitor API usage** via dashboard

## Support

For API support:
- Email: support@whatsappcrm.com
- Documentation: https://docs.whatsappcrm.com
- Status Page: https://status.whatsappcrm.com

## Changelog

### v1.0.0 (Current)
- Initial API release
- Authentication endpoints
- Contact management
- Message operations
- Campaign management
- AI chatbots
- Voice transcription
- Automation flows
- WhatsApp integration

## License

MIT License - See LICENSE file for details
