import OpenAI from 'openai';
import { BaseAIProvider } from '../baseProvider.js';

/**
 * OpenAI Provider Implementation
 */
export class OpenAIProvider extends BaseAIProvider {
  constructor(credentials, config = {}) {
    super(credentials, config);
    this.providerName = 'OpenAI';
  }

  /**
   * Initialize OpenAI client
   */
  async initialize() {
    try {
      this.client = new OpenAI({
        apiKey: this.credentials.apiKey,
        organization: this.credentials.organization || undefined,
        baseURL: this.credentials.baseURL || undefined,
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
      const response = await this.client.chat.completions.create({
        model: options.model || this.config.defaultModel || 'gpt-3.5-turbo',
        messages: this.formatMessages(messages),
        temperature: options.temperature ?? this.config.temperature ?? 0.7,
        max_tokens: options.maxTokens || this.config.maxTokens || 1000,
        top_p: options.topP ?? this.config.topP ?? 1,
        frequency_penalty: options.frequencyPenalty ?? 0,
        presence_penalty: options.presencePenalty ?? 0,
        stop: options.stop || undefined,
        user: options.userId || undefined,
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
      const stream = await this.client.chat.completions.create({
        model: options.model || this.config.defaultModel || 'gpt-3.5-turbo',
        messages: this.formatMessages(messages),
        temperature: options.temperature ?? this.config.temperature ?? 0.7,
        max_tokens: options.maxTokens || this.config.maxTokens || 1000,
        stream: true,
      });

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content;
        if (content) {
          yield {
            content,
            done: false,
          };
        }
      }

      yield { done: true };
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Parse OpenAI response to standard format
   */
  parseResponse(response) {
    const choice = response.choices[0];
    const usage = response.usage;

    return {
      content: choice.message.content,
      role: choice.message.role,
      finishReason: choice.finish_reason,
      usage: {
        promptTokens: usage.prompt_tokens,
        completionTokens: usage.completion_tokens,
        totalTokens: usage.total_tokens,
      },
      model: response.model,
      provider: this.providerName,
      cost: this.calculateCost(usage.prompt_tokens, usage.completion_tokens, response.model),
      metadata: {
        id: response.id,
        created: response.created,
        systemFingerprint: response.system_fingerprint,
      },
    };
  }

  /**
   * Calculate cost for OpenAI models
   */
  calculateCost(promptTokens, completionTokens, model) {
    // Pricing as of 2024 (per 1M tokens)
    const pricing = {
      'gpt-4': { prompt: 30.0, completion: 60.0 },
      'gpt-4-turbo': { prompt: 10.0, completion: 30.0 },
      'gpt-4-turbo-preview': { prompt: 10.0, completion: 30.0 },
      'gpt-3.5-turbo': { prompt: 0.5, completion: 1.5 },
      'gpt-3.5-turbo-16k': { prompt: 3.0, completion: 4.0 },
    };

    // Find matching pricing
    let modelPricing = pricing['gpt-3.5-turbo']; // Default
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
   * Get available OpenAI models
   */
  getAvailableModels() {
    return [
      {
        id: 'gpt-4',
        name: 'GPT-4',
        description: 'Most capable model, best for complex tasks',
        contextLength: 8192,
      },
      {
        id: 'gpt-4-turbo',
        name: 'GPT-4 Turbo',
        description: 'Faster and cheaper GPT-4',
        contextLength: 128000,
      },
      {
        id: 'gpt-3.5-turbo',
        name: 'GPT-3.5 Turbo',
        description: 'Fast and cost-effective for most tasks',
        contextLength: 16385,
      },
      {
        id: 'gpt-3.5-turbo-16k',
        name: 'GPT-3.5 Turbo 16K',
        description: 'Extended context version of GPT-3.5',
        contextLength: 16385,
      },
    ];
  }

  /**
   * Get OpenAI capabilities
   */
  getCapabilities() {
    return {
      streaming: true,
      functionCalling: true,
      vision: true,
      maxContextLength: 128000,
      supportedFeatures: ['chat', 'completion', 'embeddings', 'images', 'audio'],
    };
  }

  /**
   * Format messages for OpenAI
   */
  formatMessages(messages) {
    return messages.map((msg) => ({
      role: msg.role,
      content: msg.content,
      name: msg.name || undefined,
    }));
  }
}

export default OpenAIProvider;
