import Anthropic from '@anthropic-ai/sdk';
import { BaseAIProvider } from '../baseProvider.js';

/**
 * Claude (Anthropic) Provider Implementation
 */
export class ClaudeProvider extends BaseAIProvider {
  constructor(credentials, config = {}) {
    super(credentials, config);
    this.providerName = 'Claude';
  }

  /**
   * Initialize Anthropic client
   */
  async initialize() {
    try {
      this.client = new Anthropic({
        apiKey: this.credentials.apiKey,
      });
      return true;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Generate chat completion
   */
  async generateChatCompletion(messages, options = {}) {
    if (!this.isInitialized()) {
      await this.initialize();
    }

    try {
      // Extract system message if present
      const systemMessage = messages.find((m) => m.role === 'system');
      const conversationMessages = messages.filter((m) => m.role !== 'system');

      const response = await this.client.messages.create({
        model: options.model || this.config.defaultModel || 'claude-3-sonnet-20240229',
        max_tokens: options.maxTokens || this.config.maxTokens || 1000,
        temperature: options.temperature ?? this.config.temperature ?? 0.7,
        system: systemMessage?.content || undefined,
        messages: this.formatMessages(conversationMessages),
        top_p: options.topP ?? this.config.topP ?? undefined,
        stop_sequences: options.stop || undefined,
      });

      return this.parseResponse(response);
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Generate streaming completion
   */
  async *generateStreamingCompletion(messages, options = {}) {
    if (!this.isInitialized()) {
      await this.initialize();
    }

    try {
      const systemMessage = messages.find((m) => m.role === 'system');
      const conversationMessages = messages.filter((m) => m.role !== 'system');

      const stream = await this.client.messages.create({
        model: options.model || this.config.defaultModel || 'claude-3-sonnet-20240229',
        max_tokens: options.maxTokens || this.config.maxTokens || 1000,
        temperature: options.temperature ?? this.config.temperature ?? 0.7,
        system: systemMessage?.content || undefined,
        messages: this.formatMessages(conversationMessages),
        stream: true,
      });

      for await (const event of stream) {
        if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
          yield {
            content: event.delta.text,
            done: false,
          };
        } else if (event.type === 'message_stop') {
          yield { done: true };
        }
      }
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Parse Claude response to standard format
   */
  parseResponse(response) {
    const content = response.content[0]?.text || '';
    const usage = response.usage;

    return {
      content,
      role: response.role,
      finishReason: response.stop_reason,
      usage: {
        promptTokens: usage.input_tokens,
        completionTokens: usage.output_tokens,
        totalTokens: usage.input_tokens + usage.output_tokens,
      },
      model: response.model,
      provider: this.providerName,
      cost: this.calculateCost(usage.input_tokens, usage.output_tokens, response.model),
      metadata: {
        id: response.id,
        type: response.type,
        stopSequence: response.stop_sequence,
      },
    };
  }

  /**
   * Calculate cost for Claude models
   */
  calculateCost(promptTokens, completionTokens, model) {
    // Pricing as of 2024 (per 1M tokens)
    const pricing = {
      'claude-3-opus': { prompt: 15.0, completion: 75.0 },
      'claude-3-sonnet': { prompt: 3.0, completion: 15.0 },
      'claude-3-haiku': { prompt: 0.25, completion: 1.25 },
      'claude-2.1': { prompt: 8.0, completion: 24.0 },
      'claude-2.0': { prompt: 8.0, completion: 24.0 },
      'claude-instant': { prompt: 0.8, completion: 2.4 },
    };

    // Find matching pricing
    let modelPricing = pricing['claude-3-sonnet']; // Default
    for (const [key, value] of Object.entries(pricing)) {
      if (model.includes(key)) {
        modelPricing = value;
        break;
      }
    }

    const promptCost = (promptTokens / 1000000) * modelPricing.prompt;
    const completionCost = (completionTokens / 1000000) * modelPricing.completion;

    return promptCost + completionCost;
  }

  /**
   * Get available Claude models
   */
  getAvailableModels() {
    return [
      {
        id: 'claude-3-opus-20240229',
        name: 'Claude 3 Opus',
        description: 'Most powerful model for complex tasks',
        contextLength: 200000,
      },
      {
        id: 'claude-3-sonnet-20240229',
        name: 'Claude 3 Sonnet',
        description: 'Balanced performance and speed',
        contextLength: 200000,
      },
      {
        id: 'claude-3-haiku-20240307',
        name: 'Claude 3 Haiku',
        description: 'Fastest model for simple tasks',
        contextLength: 200000,
      },
      {
        id: 'claude-2.1',
        name: 'Claude 2.1',
        description: 'Previous generation, still capable',
        contextLength: 200000,
      },
    ];
  }

  /**
   * Get Claude capabilities
   */
  getCapabilities() {
    return {
      streaming: true,
      functionCalling: false,
      vision: true,
      maxContextLength: 200000,
      supportedFeatures: ['chat', 'vision'],
    };
  }

  /**
   * Format messages for Claude
   */
  formatMessages(messages) {
    return messages.map((msg) => ({
      role: msg.role === 'assistant' ? 'assistant' : 'user',
      content: msg.content,
    }));
  }
}

export default ClaudeProvider;
