# Chatbot System Documentation

## Overview

The Chatbot System enables users to create AI-powered conversational agents that can automatically respond to WhatsApp messages. Chatbots use configured AI providers (OpenAI, Claude, Gemini, etc.) to generate intelligent responses based on conversation context.

## Architecture

### Database Models

#### Chatbot
Stores chatbot configuration and settings.

**Fields:**
- `id` (UUID): Unique identifier
- `user_id` (UUID): Owner of the chatbot
- `account_id` (UUID): Associated WhatsApp account
- `ai_provider_id` (UUID): AI provider to use for responses
- `name` (String): Chatbot name
- `description` (String, optional): Chatbot description
- `system_prompt` (Text): System instructions for the AI
- `welcome_message` (String, optional): Initial greeting message
- `fallback_message` (String): Message when AI fails
- `is_active` (Boolean): Whether chatbot is active
- `triggers` (JSON): Trigger configuration (keywords, tags, time-based)
- `conversation_timeout` (Integer): Minutes before conversation ends (default: 60)
- `max_conversation_turns` (Integer): Maximum turns per conversation (default: 10)
- `context_window` (Integer): Number of previous messages to include (default: 5)
- `total_conversations` (Integer): Total conversations handled
- `total_messages` (Integer): Total messages processed
- `avg_response_time` (Integer, optional): Average response time in ms
- `avg_satisfaction_score` (Decimal, optional): Average satisfaction rating

#### ChatbotConversation
Tracks individual chatbot conversations with contacts.

**Fields:**
- `id` (UUID): Unique identifier
- `chatbot_id` (UUID): Associated chatbot
- `contact_id` (UUID): Contact in conversation
- `conversation_id` (UUID): WhatsApp conversation
- `status` (Enum): Active, Completed, Timeout, HandedOff
- `turn_count` (Integer): Number of message exchanges
- `satisfaction_score` (Integer, optional): User satisfaction rating
- `handoff_reason` (String, optional): Reason for human handoff
- `started_at` (DateTime): Conversation start time
- `ended_at` (DateTime, optional): Conversation end time

#### ChatbotMessage
Stores individual messages in chatbot conversations.

**Fields:**
- `id` (UUID): Unique identifier
- `chatbot_conversation_id` (UUID): Associated conversation
- `message_id` (UUID): WhatsApp message reference
- `role` (String): 'user' or 'assistant'
- `content` (Text): Message content
- `tokens_used` (Integer, optional): AI tokens consumed
- `response_time` (Integer, optional): Response generation time in ms
- `created_at` (DateTime): Message timestamp

## API Endpoints

### Create Chatbot
**POST** `/api/v1/ai/chatbots`

Creates a new chatbot configuration.

**Request Body:**
```json
{
  "accountId": "uuid",
  "aiProviderId": "uuid",
  "name": "Customer Support Bot",
  "description": "Handles common customer inquiries",
  "systemPrompt": "You are a helpful customer support assistant...",
  "welcomeMessage": "Hello! How can I help you today?",
  "fallbackMessage": "I'm sorry, I couldn't process that. Let me connect you with a human agent.",
  "triggers": {
    "keywords": ["help", "support", "question"],
    "tags": ["new-customer"],
    "timeBasedStart": "09:00",
    "timeBasedEnd": "17:00",
    "autoReply": true
  },
  "conversationTimeout": 60,
  "maxConversationTurns": 10,
  "contextWindow": 5
}
```

**Response:**
```json
{
  "success": true,
  "message": "Chatbot created successfully",
  "data": {
    "id": "uuid",
    "name": "Customer Support Bot",
    "is_active": false,
    "ai_providers": {
      "id": "uuid",
      "provider": "OpenAI",
      "is_active": true
    },
    "whatsapp_accounts": {
      "id": "uuid",
      "name": "Main Account",
      "phone": "+1234567890",
      "status": "connected"
    },
    "created_at": "2024-01-01T00:00:00.000Z"
  }
}
```

**Permissions:** `chatbots:create`

---

### Get All Chatbots
**GET** `/api/v1/ai/chatbots`

Retrieves all chatbots for the authenticated user.

**Query Parameters:**
- `accountId` (UUID, optional): Filter by WhatsApp account
- `isActive` (Boolean, optional): Filter by active status
- `page` (Integer, default: 1): Page number
- `limit` (Integer, default: 20, max: 100): Items per page

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "Customer Support Bot",
      "is_active": true,
      "total_conversations": 150,
      "total_messages": 450,
      "avg_response_time": 1200,
      "created_at": "2024-01-01T00:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 5,
    "pages": 1
  }
}
```

**Permissions:** `chatbots:read`

---

### Get Chatbot by ID
**GET** `/api/v1/ai/chatbots/:id`

Retrieves detailed information about a specific chatbot.

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "Customer Support Bot",
    "description": "Handles common customer inquiries",
    "system_prompt": "You are a helpful...",
    "welcome_message": "Hello!",
    "fallback_message": "I'm sorry...",
    "is_active": true,
    "triggers": {
      "keywords": ["help", "support"],
      "autoReply": true
    },
    "conversation_timeout": 60,
    "max_conversation_turns": 10,
    "context_window": 5,
    "total_conversations": 150,
    "total_messages": 450,
    "ai_providers": {
      "id": "uuid",
      "provider": "OpenAI",
      "model_config": {
        "model": "gpt-4",
        "temperature": 0.7
      }
    },
    "stats": {
      "active": 5,
      "completed": 120,
      "timeout": 20,
      "handedoff": 5
    }
  }
}
```

**Permissions:** `chatbots:read`

---

### Update Chatbot
**PUT** `/api/v1/ai/chatbots/:id`

Updates chatbot configuration.

**Request Body:** (all fields optional)
```json
{
  "name": "Updated Bot Name",
  "description": "New description",
  "systemPrompt": "Updated system prompt",
  "welcomeMessage": "New welcome message",
  "fallbackMessage": "New fallback message",
  "triggers": {
    "keywords": ["help", "support", "info"]
  },
  "conversationTimeout": 90,
  "maxConversationTurns": 15,
  "contextWindow": 7,
  "aiProviderId": "new-provider-uuid"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Chatbot updated successfully",
  "data": {
    "id": "uuid",
    "name": "Updated Bot Name",
    "updated_at": "2024-01-02T00:00:00.000Z"
  }
}
```

**Permissions:** `chatbots:update`

---

### Activate Chatbot
**POST** `/api/v1/ai/chatbots/:id/activate`

Activates a chatbot to start responding to messages.

**Validation:**
- AI provider must be active
- WhatsApp account must be connected

**Response:**
```json
{
  "success": true,
  "message": "Chatbot activated successfully",
  "data": {
    "id": "uuid",
    "is_active": true
  }
}
```

**Permissions:** `chatbots:update`

---

### Deactivate Chatbot
**POST** `/api/v1/ai/chatbots/:id/deactivate`

Deactivates a chatbot to stop responding to messages.

**Response:**
```json
{
  "success": true,
  "message": "Chatbot deactivated successfully",
  "data": {
    "id": "uuid",
    "is_active": false
  }
}
```

**Permissions:** `chatbots:update`

---

### Test Chatbot
**POST** `/api/v1/ai/chatbots/:id/test`

Tests a chatbot with a sample message without affecting production conversations.

**Request Body:**
```json
{
  "message": "Hello, I need help with my order"
}
```

**Response:**
```json
{
  "success": true,
  "response": "Hello! I'd be happy to help you with your order. Could you please provide your order number?",
  "tokensUsed": 45,
  "responseTime": 1250,
  "provider": "OpenAI"
}
```

**Permissions:** `chatbots:read`

---

### Delete Chatbot
**DELETE** `/api/v1/ai/chatbots/:id`

Deletes a chatbot and all associated conversations.

**Response:**
```json
{
  "success": true,
  "message": "Chatbot deleted successfully"
}
```

**Permissions:** `chatbots:delete`

---

## Trigger System

Chatbots can be triggered based on various conditions:

### Keyword Triggers
Activate when incoming message contains specific keywords.

```json
{
  "triggers": {
    "keywords": ["help", "support", "question", "info"]
  }
}
```

### Tag-Based Triggers
Activate for contacts with specific tags.

```json
{
  "triggers": {
    "tags": ["new-customer", "vip", "support-needed"]
  }
}
```

### Time-Based Triggers
Activate only during specific hours (24-hour format).

```json
{
  "triggers": {
    "timeBasedStart": "09:00",
    "timeBasedEnd": "17:00"
  }
}
```

### Auto-Reply
Automatically respond to all messages.

```json
{
  "triggers": {
    "autoReply": true
  }
}
```

## Conversation Management

### Context Window
The chatbot maintains conversation context by including previous messages:

- `context_window: 5` includes the last 5 messages
- Helps AI understand conversation flow
- Balances context quality with token usage

### Conversation Timeout
Conversations automatically end after inactivity:

- Default: 60 minutes
- Configurable per chatbot
- Prevents stale conversations

### Turn Limits
Maximum number of message exchanges:

- Default: 10 turns
- Prevents infinite loops
- Triggers handoff when exceeded

### Handoff to Human
Conversations can be handed off to human agents:

- Manual handoff via API
- Automatic on turn limit
- Automatic on AI failure
- Tracks handoff reason

## Best Practices

### System Prompts
- Be specific about the bot's role and capabilities
- Include guidelines for tone and style
- Specify what the bot should NOT do
- Include examples of good responses

**Example:**
```
You are a customer support assistant for an e-commerce store.

Your role:
- Answer questions about orders, shipping, and returns
- Help customers track their orders
- Provide product information

Guidelines:
- Be friendly and professional
- Keep responses concise (under 100 words)
- If you don't know something, admit it and offer to connect with a human
- Never make promises about refunds or discounts

Do NOT:
- Share customer data with other customers
- Process payments or refunds
- Make policy exceptions
```

### Welcome Messages
- Keep it brief and friendly
- Set expectations about what the bot can do
- Provide clear next steps

### Fallback Messages
- Apologize for the confusion
- Offer alternative help (human agent, FAQ link)
- Maintain positive tone

### Performance Optimization
- Use appropriate context window (5-7 messages)
- Set reasonable conversation timeouts
- Monitor token usage and costs
- Use faster models for simple queries

### Testing
- Test with various message types
- Verify trigger conditions work correctly
- Check handoff scenarios
- Monitor response quality

## Error Handling

### AI Provider Errors
- Returns fallback message
- Logs error details
- Notifies user if provider is inactive

### Rate Limiting
- Respects AI provider rate limits
- Queues requests during high load
- Returns appropriate error messages

### Validation Errors
- Validates all input fields
- Returns detailed error messages
- Prevents invalid configurations

## Monitoring

### Metrics Tracked
- Total conversations
- Total messages
- Average response time
- Average satisfaction score
- Conversation status distribution

### Performance Indicators
- Response time < 2 seconds (good)
- Handoff rate < 10% (good)
- Conversation completion rate > 80% (good)

## Security

### Permissions
- Create: Owner, Admin, Manager
- Read: Owner, Admin, Manager, Agent
- Update: Owner, Admin, Manager
- Delete: Owner, Admin
- Activate: Owner, Admin, Manager

### Data Protection
- AI provider credentials encrypted
- Conversation data isolated per user
- Audit logging for all operations

## Integration with Other Systems

### Flow Automation
- Chatbots can be triggered by flows
- Flow variables available in context
- Handoff can trigger flow actions

### Analytics
- Conversation metrics tracked
- Response time monitoring
- Cost tracking per chatbot

### Webhooks
- Conversation start/end events
- Handoff events
- Error events

## Conversation Engine

### Overview
The chatbot conversation engine automatically processes incoming messages and generates AI-powered responses based on configured triggers and conversation context.

### Architecture

**Components:**
1. **Chatbot Worker** (`workers/chatbotWorker.js`): Processes chatbot conversation jobs from the AI queue
2. **Conversation Service** (`services/chatbotConversationService.js`): Handles trigger matching and conversation management
3. **Message Integration**: Automatically checks for chatbot triggers on incoming messages

### Trigger Matching

The conversation engine supports multiple trigger types:

#### 1. Active Conversation
- Automatically responds to messages in active conversations
- Respects conversation timeout settings
- Continues until turn limit or timeout

#### 2. Keyword Triggers
```json
{
  "triggers": {
    "keywords": ["help", "support", "question"]
  }
}
```
- Case-insensitive matching
- Triggers when message contains any keyword
- Useful for specific topic detection

#### 3. Tag-Based Triggers
```json
{
  "triggers": {
    "tags": ["new-customer", "vip"]
  }
}
```
- Triggers for contacts with specific tags
- Useful for segment-based automation
- Combines with other triggers

#### 4. Time-Based Triggers
```json
{
  "triggers": {
    "timeBasedStart": "09:00",
    "timeBasedEnd": "17:00"
  }
}
```
- Only responds during specified hours (24-hour format)
- Useful for business hours automation
- Works as a filter with other triggers

#### 5. Auto-Reply
```json
{
  "triggers": {
    "autoReply": true
  }
}
```
- Responds to all incoming messages
- Highest priority trigger
- Useful for always-on support

### Conversation Context Management

**Context Window:**
- Configurable number of previous messages (default: 5)
- Includes both user and assistant messages
- Maintains conversation flow and coherence

**Context Building:**
```javascript
[
  { role: 'system', content: 'System prompt...' },
  { role: 'user', content: 'Previous user message' },
  { role: 'assistant', content: 'Previous bot response' },
  { role: 'user', content: 'Current user message' }
]
```

### Conversation Lifecycle

1. **Initiation**
   - Trigger matches incoming message
   - New conversation created
   - Welcome message sent (if configured)

2. **Active Phase**
   - Messages exchanged between user and bot
   - Context maintained across turns
   - Turn count incremented

3. **Termination**
   - Turn limit reached
   - Conversation timeout
   - Manual handoff to human
   - Explicit end by user

### Conversation Limits

**Turn Limit:**
- Default: 10 turns
- Prevents infinite conversations
- Triggers handoff when exceeded

**Timeout:**
- Default: 60 minutes
- Ends inactive conversations
- New conversation starts on next message

### Response Generation

**Process:**
1. Load chatbot configuration
2. Get or create conversation
3. Check limits (turns, timeout)
4. Build conversation context
5. Generate AI response
6. Send message to contact
7. Update statistics

**Performance:**
- Average response time tracked
- Token usage monitored
- Costs calculated per provider

### API Endpoints

#### Get Conversation
**GET** `/api/v1/ai/conversations/:id`

Retrieves conversation details with all messages.

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "chatbot_id": "uuid",
    "contact_id": "uuid",
    "status": "Active",
    "turn_count": 5,
    "started_at": "2024-01-01T00:00:00.000Z",
    "chatbots": {
      "id": "uuid",
      "name": "Support Bot"
    },
    "contacts": {
      "id": "uuid",
      "name": "John Doe",
      "phone": "+1234567890"
    },
    "chatbot_messages": [
      {
        "id": "uuid",
        "role": "assistant",
        "content": "Hello! How can I help?",
        "tokens_used": 15,
        "response_time": 1200,
        "created_at": "2024-01-01T00:00:00.000Z"
      },
      {
        "id": "uuid",
        "role": "user",
        "content": "I need help with my order",
        "created_at": "2024-01-01T00:01:00.000Z"
      }
    ]
  }
}
```

**Permissions:** `chatbots:read`

---

#### Get Chatbot Conversations
**GET** `/api/v1/ai/chatbots/:id/conversations`

Lists all conversations for a chatbot.

**Query Parameters:**
- `status` (String, optional): Filter by status (Active, Completed, Timeout, HandedOff)
- `page` (Integer, default: 1): Page number
- `limit` (Integer, default: 20): Items per page

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "status": "Completed",
      "turn_count": 8,
      "started_at": "2024-01-01T00:00:00.000Z",
      "ended_at": "2024-01-01T00:15:00.000Z",
      "contacts": {
        "name": "John Doe",
        "phone": "+1234567890"
      },
      "_count": {
        "chatbot_messages": 16
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "pages": 8
  }
}
```

**Permissions:** `chatbots:read`

---

#### Handoff Conversation
**POST** `/api/v1/ai/conversations/:id/handoff`

Hands off an active conversation to a human agent.

**Request Body:**
```json
{
  "reason": "Customer requested human agent"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Conversation handed off to human agent",
  "data": {
    "id": "uuid",
    "status": "HandedOff",
    "handoff_reason": "Customer requested human agent",
    "ended_at": "2024-01-01T00:15:00.000Z"
  }
}
```

**Permissions:** `chatbots:update`

---

#### Get Chatbot Statistics
**GET** `/api/v1/ai/chatbots/:id/stats`

Retrieves conversation statistics for a chatbot.

**Response:**
```json
{
  "success": true,
  "data": {
    "byStatus": {
      "active": 5,
      "completed": 120,
      "timeout": 15,
      "handedoff": 10
    },
    "avgTurnCount": 7.5,
    "avgResponseTime": 1250,
    "totalConversations": 150,
    "totalMessages": 1125
  }
}
```

**Permissions:** `chatbots:read`

---

## Queue Processing

**Queue:** `ai` queue (Bull)
**Job Type:** `chatbot-conversation`
**Concurrency:** 5 jobs simultaneously
**Retry:** 2 attempts with exponential backoff

**Job Data:**
```javascript
{
  chatbotId: 'uuid',
  contactId: 'uuid',
  messageId: 'uuid',
  messageContent: 'User message text'
}
```

## Error Handling

### AI Provider Errors
- Sends fallback message to user
- Logs error details
- Doesn't retry (prevents cost escalation)

### Conversation Errors
- Logs error with context
- Attempts fallback message
- Marks job as failed

### Rate Limiting
- Respects AI provider rate limits
- Queues requests during high load
- Exponential backoff on failures

## Monitoring

### Metrics Tracked
- Total conversations per chatbot
- Total messages processed
- Average response time
- Average turn count
- Conversation status distribution
- Token usage and costs

### Logging
- Conversation start/end events
- Trigger matches
- Response generation
- Errors and failures

## Integration Points

### Message Service
- Automatically checks triggers on incoming messages
- Non-blocking async processing
- Error isolation

### WhatsApp Service
- Sends bot responses via message queue
- Marks messages as from bot
- Respects rate limits

### AI Manager
- Routes to configured provider
- Tracks usage and costs
- Handles provider errors

## Future Enhancements

- Multi-language support
- Sentiment analysis
- Intent recognition
- Custom training data
- Voice message support
- Rich media responses
- Conversation templates
- A/B testing for prompts
- Conversation analytics dashboard
- Real-time conversation monitoring
