# Flow Execution Engine

## Overview

The Flow Execution Engine is a comprehensive system for executing automated workflows with node-by-node processing, trigger registration, and support for multiple node types.

## Components

### 1. Flow Executor Service (`src/services/flowExecutor.js`)

The core execution engine that processes flows node by node.

**Key Functions:**
- `startFlowExecution(flowId, contactId, triggerData, conversationId)` - Initiates a new flow execution
- `processFlowExecution(executionId)` - Processes the next node in a flow execution
- `queueFlowExecution(executionId, delay)` - Queues a flow execution for processing

**Supported Node Types:**
1. **trigger** - Entry point for the flow
2. **wait** - Delays execution for a specified duration (seconds, minutes, hours, days)
3. **send_message** - Sends a WhatsApp message to the contact
4. **condition** - Evaluates conditions and branches based on result
5. **add_tag** - Adds tags to a contact
6. **remove_tag** - Removes tags from a contact
7. **update_field** - Updates contact fields (standard or custom)
8. **http_request** - Makes HTTP requests to external APIs
9. **ai_chatbot** - Integrates with AI chatbot (placeholder for future implementation)
10. **branch** - Splits execution into multiple paths
11. **join** - Waits for multiple paths to complete
12. **end** - Terminates the flow execution

**Variable System:**
- Supports variable replacement in messages and values using `{{variableName}}` syntax
- Contact variables: `{{contact.fieldName}}`
- Execution variables: `{{variableName}}`
- Variables are passed between nodes and can be updated during execution

**Condition Evaluation:**
Supports the following operators:
- `equals`, `not_equals`
- `contains`, `not_contains`
- `starts_with`, `ends_with`
- `greater_than`, `less_than`
- `greater_than_or_equal`, `less_than_or_equal`
- `is_empty`, `is_not_empty`

### 2. Flow Worker (`src/workers/flowWorker.js`)

Background worker that processes flow execution jobs from the Bull queue.

**Features:**
- Processes up to 5 concurrent flow executions
- Automatic retry with exponential backoff (3 attempts)
- Comprehensive error logging
- Event handlers for monitoring

### 3. Flow Trigger System (`src/services/flowTriggers.js`)

Manages flow triggers and fires flows when events occur.

**Trigger Types:**
- `message_received` - When a message is received from a contact
- `message_sent` - When a message is sent to a contact
- `contact_created` - When a new contact is created
- `contact_updated` - When a contact is updated
- `tag_added` - When a tag is added to a contact
- `tag_removed` - When a tag is removed from a contact
- `campaign_completed` - When a campaign completes
- `keyword_match` - When a message contains specific keywords
- `time_based` - Time-based triggers (scheduled)
- `webhook` - External webhook triggers
- `manual` - Manually triggered flows

**Key Functions:**
- `initializeTriggers()` - Loads all active flows into memory cache
- `registerTrigger(flowId, teamId, triggerType, config)` - Registers a flow trigger
- `unregisterTrigger(flowId, triggerType)` - Unregisters a flow trigger
- `fireTrigger(triggerType, eventData)` - Fires all flows matching the trigger
- Helper functions for common triggers (e.g., `triggerOnMessageReceived`, `triggerOnTagAdded`)

**Trigger Matching:**
- Team ID validation
- Keyword matching (exact, starts_with, ends_with, contains)
- Tag matching
- Message type filtering
- Account ID filtering

### 4. Flow API Endpoints

**New Endpoints:**
- `POST /api/v1/flows/:id/test` - Test a flow with a specific contact (dry run)
- `GET /api/v1/flows/:id/executions` - Get all executions for a flow
- `GET /api/v1/flows/executions/:executionId` - Get details of a specific execution
- `POST /api/v1/flows/:id/trigger` - Manually trigger a flow for a contact

**Existing Endpoints Enhanced:**
- Flow activation now registers triggers
- Flow deactivation now unregisters triggers

### 5. Integration Points

**Contact Service Integration:**
- Added `addTagToContact()` method that triggers flow events
- Added `removeTagFromContact()` method that triggers flow events
- Tag operations automatically fire `tag_added` and `tag_removed` triggers

**Server Initialization:**
- Flow worker is initialized on server startup
- Flow triggers are loaded into memory cache on startup
- Graceful handling of initialization failures

## Database Schema

The flow execution engine uses the following tables:

**flows:**
- Stores flow definitions with nodes, edges, and trigger configuration
- `is_active` flag controls whether triggers are registered

**flow_executions:**
- Tracks individual flow executions
- Stores current node, status, variables, and error messages
- Status: `running`, `completed`, `failed`, `paused`

**contacts:**
- Contact data used in flow execution
- Custom fields supported for dynamic data

## Usage Examples

### 1. Creating a Flow with Multiple Node Types

```javascript
const flow = {
  name: 'Welcome and Tag Flow',
  triggerType: 'contact_created',
  trigger_config: {},
  nodes: [
    { id: 'trigger-1', type: 'trigger', data: {} },
    { 
      id: 'wait-1', 
      type: 'wait', 
      data: { duration: 5, unit: 'minutes' } 
    },
    { 
      id: 'send-1', 
      type: 'send_message', 
      data: { 
        message: 'Welcome {{contact.first_name}}!',
        messageType: 'text'
      } 
    },
    { 
      id: 'tag-1', 
      type: 'add_tag', 
      data: { tags: ['welcomed'] } 
    },
    { id: 'end-1', type: 'end', data: {} }
  ],
  edges: [
    { id: 'e1', source: 'trigger-1', target: 'wait-1' },
    { id: 'e2', source: 'wait-1', target: 'send-1' },
    { id: 'e3', source: 'send-1', target: 'tag-1' },
    { id: 'e4', source: 'tag-1', target: 'end-1' }
  ]
};
```

### 2. Manually Triggering a Flow

```javascript
import { triggerManual } from './services/flowTriggers.js';

const execution = await triggerManual(flowId, contactId, {
  customData: 'value',
  triggeredBy: userId
});
```

### 3. Firing a Trigger Event

```javascript
import { triggerOnMessageReceived } from './services/flowTriggers.js';

await triggerOnMessageReceived(message, contact, conversation);
```

### 4. Using Conditions

```javascript
{
  id: 'condition-1',
  type: 'condition',
  data: {
    operator: 'AND',
    conditions: [
      {
        field: 'contact.email',
        operator: 'is_not_empty',
        value: ''
      },
      {
        field: 'contact.country',
        operator: 'equals',
        value: 'US'
      }
    ]
  }
}
```

## Testing

Flow execution tests are included in `tests/flow.test.js`:
- Manual flow triggering
- Flow execution listing
- Flow testing (dry run)
- Error handling for invalid inputs

## Performance Considerations

1. **Queue-Based Processing:** Flow executions are processed asynchronously via Bull queues
2. **Concurrency:** Up to 5 flow executions can be processed concurrently
3. **Retry Logic:** Failed executions are retried up to 3 times with exponential backoff
4. **Memory Cache:** Active flow triggers are cached in memory for fast lookup
5. **Delayed Execution:** Wait nodes use Bull's delayed job feature for efficient scheduling

## Error Handling

- All node handlers include try-catch blocks
- Execution failures are logged with full context
- Failed executions are marked with error messages
- Automatic retry for transient failures
- Graceful degradation for missing data

## Future Enhancements

1. **AI Chatbot Integration:** Complete implementation of AI chatbot node
2. **Branch/Join Logic:** Full support for parallel execution paths
3. **Flow Analytics:** Track execution metrics and performance
4. **Flow Versioning:** Support for multiple versions of the same flow
5. **Visual Flow Builder:** Frontend interface for creating flows
6. **Advanced Conditions:** Support for complex condition expressions
7. **Flow Templates:** Pre-built flow templates for common use cases
8. **Execution History:** Detailed step-by-step execution logs

## Requirements Satisfied

This implementation satisfies **Requirement 1.6: Flow Automation** from the requirements document:

✅ Flow trigger events are detected and flows are queued within 1 second
✅ Wait nodes pause execution for exact specified duration
✅ Condition nodes evaluate conditions and follow appropriate branches
✅ Flow execution failures are logged and retried up to 3 times with exponential backoff
✅ HTTP request nodes make requests with 30-second timeout and store responses

## Related Documentation

- [Flow Validation](./FLOW_VALIDATION.md) - Flow structure validation
- [Message System](./MESSAGE_SYSTEM.md) - Message sending integration
- [Contact Management](./CONTACT_MANAGEMENT.md) - Contact operations
- [Redis Queue Setup](./REDIS_QUEUE_SETUP.md) - Queue configuration
