# AI Provider System Documentation

## Overview

The AI Provider System is a flexible, extensible abstraction layer that supports multiple AI providers for chatbot and conversational AI features. It provides a unified interface for interacting with different AI services while handling provider-specific implementations, credential management, usage tracking, and cost calculation.

## Architecture

### Components

1. **BaseAIProvider** - Abstract base class defining the provider interface
2. **Provider Implementations** - Concrete implementations for each AI service
3. **AIManager** - Central manager for provider lifecycle and routing
4. **Encryption Utilities** - Secure credential storage and retrieval

### Supported Providers

- **OpenAI** - GPT-3.5, GPT-4, GPT-4 Turbo
- **Claude (Anthropic)** - Claude 3 Opus, Sonnet, Haiku, Claude 2.x
- **Gemini (Google)** - Gemini Pro, Gemini Pro Vision, Gemini Ultra
- **Cohere** - Command, Command Light, Command R, Command R+
- **Ollama** - Self-hosted models (Llama 2, Mistral, Code Llama, etc.)

## Database Schema

```sql
CREATE TABLE "ai_providers" (
    "id" TEXT PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "is_active" BOOLEAN DEFAULT false,
    "credentials" JSONB NOT NULL,
    "model_config" JSONB DEFAULT '{}',
    "usage_count" INTEGER DEFAULT 0,
    "total_tokens" INTEGER DEFAULT 0,
    "total_cost" DECIMAL(10,2) DEFAULT 0,
    "last_used_at" TIMESTAMP,
    "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP NOT NULL,
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
);
```

## Usage Examples

### 1. Configure a Provider

```javascript
import aiManager from './services/ai/aiManager.js';

// Configure OpenAI
const provider = await aiManager.configureProvider(
  userId,
  'OpenAI',
  {
    apiKey: 'sk-...',
    organization: 'org-...' // Optional
  },
  {
    defaultModel: 'gpt-4',
    temperature: 0.7,
    maxTokens: 1000
  }
);
```

### 2. Generate Chat Completion

```javascript
const response = await aiManager.generateCompletion(
  userId,
  'OpenAI',
  [
    { role: 'system', content: 'You are a helpful assistant.' },
    { role: 'user', content: 'Hello, how are you?' }
  ],
  {
    model: 'gpt-4',
    temperature: 0.8,
    maxTokens: 500
  }
);

console.log(response.content); // AI response
console.log(response.usage); // Token usage
console.log(response.cost); // Cost in USD
```

### 3. Generate Streaming Completion

```javascript
const stream = aiManager.generateStreamingCompletion(
  userId,
  'Claude',
  [
    { role: 'user', content: 'Write a short story about a robot.' }
  ]
);

for await (const chunk of stream) {
  if (chunk.content) {
    process.stdout.write(chunk.content);
  }
  if (chunk.done) {
    console.log('\n\nStream complete!');
  }
}
```

### 4. List User's Providers

```javascript
const providers = await aiManager.listProviders(userId);

providers.forEach(provider => {
  console.log(`${provider.provider}: ${provider.usageCount} calls, $${provider.totalCost}`);
});
```

### 5. Get Available Models

```javascript
const models = await aiManager.getAvailableModels(userId, 'Gemini');

models.forEach(model => {
  console.log(`${model.name}: ${model.description}`);
});
```

## Provider-Specific Configuration

### OpenAI

```javascript
{
  apiKey: 'sk-...',
  organization: 'org-...',  // Optional
  baseURL: 'https://...'    // Optional, for custom endpoints
}
```

**Models:**
- `gpt-4` - Most capable, best for complex tasks
- `gpt-4-turbo` - Faster and cheaper GPT-4
- `gpt-3.5-turbo` - Fast and cost-effective

**Pricing (per 1M tokens):**
- GPT-4: $30 prompt / $60 completion
- GPT-4 Turbo: $10 prompt / $30 completion
- GPT-3.5 Turbo: $0.50 prompt / $1.50 completion

### Claude (Anthropic)

```javascript
{
  apiKey: 'sk-ant-...'
}
```

**Models:**
- `claude-3-opus-20240229` - Most powerful
- `claude-3-sonnet-20240229` - Balanced
- `claude-3-haiku-20240307` - Fastest

**Pricing (per 1M tokens):**
- Opus: $15 prompt / $75 completion
- Sonnet: $3 prompt / $15 completion
- Haiku: $0.25 prompt / $1.25 completion

### Gemini (Google)

```javascript
{
  apiKey: 'AIza...'
}
```

**Models:**
- `gemini-pro` - Text-based tasks
- `gemini-pro-vision` - Multimodal with vision
- `gemini-ultra` - Most capable

**Pricing (per 1M tokens):**
- Pro: $0.50 prompt / $1.50 completion
- Ultra: $2.00 prompt / $6.00 completion

### Cohere

```javascript
{
  apiKey: '...'
}
```

**Models:**
- `command` - Flagship model
- `command-light` - Faster, lighter
- `command-r` - RAG-optimized
- `command-r-plus` - Most powerful RAG

**Pricing (per 1M tokens):**
- Command: $1.00 prompt / $2.00 completion
- Command R: $0.50 prompt / $1.50 completion
- Command R+: $3.00 prompt / $15.00 completion

### Ollama (Self-hosted)

```javascript
{
  baseUrl: 'http://localhost:11434'
}
```

**Models:** Any model available in Ollama registry
- `llama2` - Meta's Llama 2
- `mistral` - Mistral 7B
- `codellama` - Code-specialized
- `phi` - Microsoft's Phi models

**Cost:** $0 (self-hosted)

## Security

### Credential Encryption

All provider credentials are encrypted using AES-256-GCM before storage:

```javascript
import { encryptCredentials, decryptCredentials } from './utils/encryption.js';

// Encrypt before storing
const encrypted = encryptCredentials({ apiKey: 'sk-...' });
// { encrypted: '...', iv: '...', authTag: '...' }

// Decrypt when retrieving
const credentials = decryptCredentials(encrypted);
// { apiKey: 'sk-...' }
```

### Environment Variables

Set encryption key in `.env`:

```bash
ENCRYPTION_KEY=your-64-character-hex-encryption-key-here
```

Generate a secure key:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## Error Handling

All providers implement standardized error handling:

```javascript
try {
  const response = await aiManager.generateCompletion(...);
} catch (error) {
  console.error(`Error type: ${error.type}`);
  console.error(`Status code: ${error.statusCode}`);
  console.error(`Provider: ${error.provider}`);
  console.error(`Message: ${error.message}`);
}
```

**Error Types:**
- `AUTHENTICATION_ERROR` (401) - Invalid API key
- `RATE_LIMIT_ERROR` (429) - Rate limit exceeded
- `QUOTA_ERROR` (402) - Quota/billing issue
- `TIMEOUT_ERROR` (504) - Request timeout
- `PROVIDER_ERROR` (500) - General provider error

## Usage Tracking

The system automatically tracks:
- **Usage Count** - Number of API calls
- **Total Tokens** - Cumulative token usage
- **Total Cost** - Cumulative cost in USD
- **Last Used At** - Timestamp of last use

Access via database or API:

```javascript
const providers = await aiManager.listProviders(userId);
const openai = providers.find(p => p.provider === 'OpenAI');

console.log(`Calls: ${openai.usageCount}`);
console.log(`Tokens: ${openai.totalTokens}`);
console.log(`Cost: $${openai.totalCost}`);
```

## Extending with New Providers

To add a new AI provider:

1. **Create Provider Class**

```javascript
// src/services/ai/providers/newProvider.js
import { BaseAIProvider } from '../baseProvider.js';

export class NewProvider extends BaseAIProvider {
  constructor(credentials, config = {}) {
    super(credentials, config);
    this.providerName = 'NewProvider';
  }

  async initialize() {
    // Initialize client
  }

  async generateChatCompletion(messages, options = {}) {
    // Implement completion
  }

  parseResponse(response) {
    // Parse to standard format
  }

  calculateCost(promptTokens, completionTokens, model) {
    // Calculate cost
  }

  getAvailableModels() {
    // Return model list
  }
}
```

2. **Register in AIManager**

```javascript
// src/services/ai/aiManager.js
import { NewProvider } from './providers/newProvider.js';

this.providerClasses = {
  // ... existing providers
  NewProvider: NewProvider,
};
```

3. **Export from Index**

```javascript
// src/services/ai/index.js
export { NewProvider } from './providers/newProvider.js';
```

## Best Practices

1. **Always validate credentials** before storing
2. **Use appropriate models** for the task (balance cost vs capability)
3. **Implement retry logic** for transient failures
4. **Monitor usage and costs** regularly
5. **Cache provider instances** (handled by AIManager)
6. **Set reasonable token limits** to control costs
7. **Use streaming** for long responses to improve UX
8. **Handle errors gracefully** with fallback options

## Performance Considerations

- **Provider Caching**: AIManager caches initialized providers per user
- **Connection Pooling**: Reuses HTTP connections where possible
- **Async Operations**: All operations are async/await
- **Streaming Support**: Reduces latency for long responses
- **Token Estimation**: Estimates tokens for cost prediction

## Testing

Test provider configuration:

```javascript
// Test credentials
const isValid = await provider.validateCredentials();

// Test completion
const response = await provider.generateChatCompletion(
  [{ role: 'user', content: 'Hello' }],
  { maxTokens: 10 }
);

console.log('Test successful:', response.content);
```

## Troubleshooting

### Provider Not Initializing

- Check API key validity
- Verify network connectivity
- Check provider service status
- Review error logs

### High Costs

- Review token usage per request
- Consider using cheaper models
- Implement caching for repeated queries
- Set maxTokens limits

### Rate Limiting

- Implement exponential backoff
- Distribute load across multiple accounts
- Use provider-specific rate limit headers
- Consider upgrading provider plan

## API Reference

See inline JSDoc comments in source files for detailed API documentation.

## Support

For issues or questions:
- Check provider documentation
- Review error logs
- Contact provider support
- File issue in project repository
