# AI Provider API Endpoints

This document describes the REST API endpoints for managing AI providers in the WhatsApp CRM system.

## Overview

The AI Provider API allows users to configure and manage multiple AI providers (OpenAI, Claude, Gemini, Cohere, Ollama) for use in chatbots and other AI-powered features.

## Authentication

All AI provider endpoints require authentication via JWT token in the Authorization header:

```
Authorization: Bearer <access_token>
```

## Permissions

- `ai:manage` - Required for creating, updating, deleting, and testing AI providers (Owner, Admin)
- `ai:read` - Required for reading AI provider configurations (Owner, Admin, Manager)

## Endpoints

### Create AI Provider

Configure a new AI provider or update an existing one.

**Endpoint:** `POST /api/v1/ai/providers`

**Permissions:** `ai:manage`

**Request Body:**

```json
{
  "provider": "OpenAI",
  "credentials": {
    "apiKey": "sk-..."
  },
  "modelConfig": {
    "model": "gpt-3.5-turbo",
    "temperature": 0.7,
    "maxTokens": 1000,
    "topP": 1.0,
    "frequencyPenalty": 0,
    "presencePenalty": 0
  }
}
```

**Supported Providers:**
- `OpenAI` - Requires `apiKey` in credentials
- `Claude` - Requires `apiKey` in credentials
- `Gemini` - Requires `apiKey` in credentials
- `Cohere` - Requires `apiKey` in credentials
- `Ollama` - Requires `baseUrl` in credentials (e.g., "http://localhost:11434")

**Response (201 Created):**

```json
{
  "success": true,
  "message": "AI provider configured successfully",
  "data": {
    "id": "uuid",
    "provider": "OpenAI",
    "isActive": true,
    "modelConfig": {
      "model": "gpt-3.5-turbo",
      "temperature": 0.7,
      "maxTokens": 1000
    },
    "usageCount": 0,
    "totalTokens": 0,
    "totalCost": 0,
    "lastUsedAt": null,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

**Error Responses:**

- `400 Bad Request` - Invalid provider type, missing credentials, or credential validation failed
- `401 Unauthorized` - Missing or invalid authentication token
- `403 Forbidden` - Insufficient permissions

---

### List AI Providers

Get all configured AI providers for the authenticated user.

**Endpoint:** `GET /api/v1/ai/providers`

**Permissions:** `ai:read`

**Response (200 OK):**

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "provider": "OpenAI",
      "isActive": true,
      "modelConfig": {
        "model": "gpt-3.5-turbo",
        "temperature": 0.7
      },
      "usageCount": 150,
      "totalTokens": 45000,
      "totalCost": 0.09,
      "lastUsedAt": "2024-01-01T12:00:00.000Z",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  ],
  "count": 1
}
```

**Note:** Credentials are never returned in API responses for security.

---

### Get AI Provider

Get a single AI provider by ID.

**Endpoint:** `GET /api/v1/ai/providers/:id`

**Permissions:** `ai:read`

**Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "provider": "OpenAI",
    "isActive": true,
    "modelConfig": {
      "model": "gpt-3.5-turbo",
      "temperature": 0.7
    },
    "usageCount": 150,
    "totalTokens": 45000,
    "totalCost": 0.09,
    "lastUsedAt": "2024-01-01T12:00:00.000Z",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

**Error Responses:**

- `404 Not Found` - AI provider not found

---

### Update AI Provider

Update an existing AI provider's configuration.

**Endpoint:** `PUT /api/v1/ai/providers/:id`

**Permissions:** `ai:manage`

**Request Body:**

```json
{
  "credentials": {
    "apiKey": "sk-new-key..."
  },
  "modelConfig": {
    "model": "gpt-4",
    "temperature": 0.8,
    "maxTokens": 2000
  },
  "isActive": true
}
```

**Note:** All fields are optional. If `credentials` are provided, they will be validated with a test API call.

**Response (200 OK):**

```json
{
  "success": true,
  "message": "AI provider updated successfully",
  "data": {
    "id": "uuid",
    "provider": "OpenAI",
    "isActive": true,
    "modelConfig": {
      "model": "gpt-4",
      "temperature": 0.8,
      "maxTokens": 2000
    },
    "usageCount": 150,
    "totalTokens": 45000,
    "totalCost": 0.09,
    "lastUsedAt": "2024-01-01T12:00:00.000Z",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T12:30:00.000Z"
  }
}
```

**Error Responses:**

- `400 Bad Request` - Invalid credentials or configuration
- `404 Not Found` - AI provider not found

---

### Delete AI Provider

Delete an AI provider configuration.

**Endpoint:** `DELETE /api/v1/ai/providers/:id`

**Permissions:** `ai:manage`

**Response (200 OK):**

```json
{
  "success": true,
  "message": "AI provider deleted successfully"
}
```

**Error Responses:**

- `404 Not Found` - AI provider not found

**Note:** Deleting a provider will also clear it from the cache and prevent it from being used in chatbots.

---

### Test AI Provider

Test an AI provider with a sample message to verify it's working correctly.

**Endpoint:** `POST /api/v1/ai/providers/:id/test`

**Permissions:** `ai:manage`

**Request Body:**

```json
{
  "message": "Hello, this is a test message.",
  "maxTokens": 50
}
```

**Note:** Both fields are optional. Defaults: `message` = "Hello, this is a test message.", `maxTokens` = 50

**Response (200 OK):**

```json
{
  "success": true,
  "message": "AI provider test successful",
  "data": {
    "provider": "OpenAI",
    "model": "gpt-3.5-turbo",
    "content": "Hello! I'm working correctly. How can I help you today?",
    "usage": {
      "promptTokens": 12,
      "completionTokens": 15,
      "totalTokens": 27
    },
    "cost": 0.000054,
    "responseTime": "1234ms"
  }
}
```

**Error Responses:**

- `400 Bad Request` - Provider test failed (invalid credentials, API error, etc.)
- `404 Not Found` - AI provider not found

---

## Security

### Credential Encryption

All AI provider credentials are encrypted using AES-256-GCM before being stored in the database. The encryption key is stored in environment variables and never exposed through the API.

### Credential Validation

When creating or updating a provider with new credentials, the system automatically validates them by making a test API call to the provider. This ensures that only valid credentials are stored.

### Permission Checks

All endpoints enforce role-based access control (RBAC). Only users with appropriate permissions can manage AI providers.

## Usage Tracking

The system automatically tracks:
- **Usage Count**: Number of times the provider has been used
- **Total Tokens**: Total tokens consumed across all requests
- **Total Cost**: Estimated cost based on provider pricing
- **Last Used At**: Timestamp of the last usage

This data is useful for monitoring costs and usage patterns.

## Integration with Chatbots

Once an AI provider is configured, it can be used in chatbot configurations. The chatbot will use the provider's credentials and model configuration to generate responses.

## Example Workflows

### Setting up OpenAI

1. Create provider with API key:
```bash
POST /api/v1/ai/providers
{
  "provider": "OpenAI",
  "credentials": { "apiKey": "sk-..." },
  "modelConfig": { "model": "gpt-3.5-turbo" }
}
```

2. Test the provider:
```bash
POST /api/v1/ai/providers/{id}/test
{
  "message": "Hello, are you working?"
}
```

3. Use in chatbot configuration (see Chatbot API docs)

### Setting up Ollama (Self-Hosted)

1. Ensure Ollama is running locally on port 11434

2. Create provider:
```bash
POST /api/v1/ai/providers
{
  "provider": "Ollama",
  "credentials": { "baseUrl": "http://localhost:11434" },
  "modelConfig": { "model": "llama2" }
}
```

3. Test the provider:
```bash
POST /api/v1/ai/providers/{id}/test
```

## Error Handling

All endpoints follow a consistent error response format:

```json
{
  "success": false,
  "message": "Error description",
  "error": "Detailed error message (in development mode)"
}
```

Common error scenarios:
- Invalid API keys → 400 Bad Request
- Provider API is down → 400 Bad Request (test failed)
- Rate limit exceeded → 429 Too Many Requests (from provider)
- Insufficient permissions → 403 Forbidden

## Rate Limiting

AI provider endpoints are subject to the global API rate limit (100 requests per 15 minutes per user). Testing providers may also be subject to the provider's own rate limits.
