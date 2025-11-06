import { CohereClient } from 'cohere-ai';
import { BaseAIProvider } from '../baseProvider.js';

/**
 * Cohere Provider Implementation
 */
export class CohereProvider extends BaseAIProvider {
  constructor(credentials, config = {}) {
    super(credentials, config);
    this.providerName = 'Cohere';
  }

  /**
   * Initialize Cohere client
   */
  async initialize() {
    try {
      this.client = new CohereClient({
        token: this.credentials.apiKey,
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
      // Extract system message (preamble in Cohere)
      const systemMessage = messages.find((m) => m.role === 'system');
      const conversationMessages = messages.filter((m) => m.role !== 'system');

      // Format chat history
      const chatHistory = this.formatMessages(conversationMessages.slice(0, -1));
      const lastMessage = conversationMessages[conversationMessages.length - 1];

      const response = await this.client.chat({
        model: options.model || this.config.defaultModel || 'command',
        message: lastMessage.content,
        chatHistory: chatHistory.length > 0 ? chatHistory : undefined,
        preamble: systemMessage?.content || undefined,
        temperature: options.temperature ?? this.config.temperature ?? 0.7,
        maxTokens: options.maxTokens || this.config.maxTokens || 1000,
        p: options.topP ?? this.config.topP ?? 0.75,
        k: options.topK ?? this.config.topK ?? 0,
        stopSequences: options.stop || undefined,
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

      const chatHistory = this.formatMessages(conversationMessages.slice(0, -1));
      const lastMessage = conversationMessages[conversationMessages.length - 1];

      const stream = await this.client.chatStream({
        model: options.model || this.config.defaultModel || 'command',
        message: lastMessage.content,
        chatHistory: chatHistory.length > 0 ? chatHistory : undefined,
        preamble: systemMessage?.content || undefined,
        temperature: options.temperature ?? this.config.temperature ?? 0.7,
        maxTokens: options.maxTokens || this.config.maxTokens || 1000,
      });

      for await (const chunk of stream) {
        if (chunk.eventType === 'text-generation') {
          yield {
            content: chunk.text,
            done: false,
          };
        } else if (chunk.eventType === 'stream-end') {
          yield { done: true };
        }
      }
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Parse Cohere response to standard format
   */
  parseResponse(response) {
    const meta = response.meta || {};
    const tokens = meta.tokens || {};

    return {
      content: response.text,
      role: 'assistant',
      finishReason: response.finishReason || 'COMPLETE',
      usage: {
        promptTokens: tokens.inputTokens || 0,
        completionTokens: tokens.outputTokens || 0,
        totalTokens: (tokens.inputTokens || 0) + (tokens.outputTokens || 0),
      },
      model: response.meta?.model || 'command',
      provider: this.providerName,
      cost: this.calculateCost(
        tokens.inputTokens || 0,
        tokens.outputTokens || 0,
        response.meta?.model || 'command'
      ),
      metadata: {
        generationId: response.generationId,
        citations: response.citations || [],
        documents: response.documents || [],
      },
    };
  }

  /**
   * Calculate cost for Cohere models
   */
  calculateCost(promptTokens, completionTokens, model) {
    // Pricing as of 2024 (per 1M tokens)
    const pricing = {
      command: { prompt: 1.0, completion: 2.0 },
      'command-light': { prompt: 0.3, completion: 0.6 },
      'command-r': { prompt: 0.5, completion: 1.5 },
      'command-r-plus': { prompt: 3.0, completion: 15.0 },
    };

    // Find matching pricing
    let modelPricing = pricing['command']; // Default
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
   * Get available Cohere models
   */
  getAvailableModels() {
    return [
      {
        id: 'command',
        name: 'Command',
        description: 'Flagship model for complex tasks',
        contextLength: 4096,
      },
      {
        id: 'command-light',
        name: 'Command Light',
        description: 'Faster, lighter version for simple tasks',
        contextLength: 4096,
      },
      {
        id: 'command-r',
        name: 'Command R',
        description: 'Retrieval-augmented generation model',
        contextLength: 128000,
      },
      {
        id: 'command-r-plus',
        name: 'Command R+',
        description: 'Most powerful RAG model',
        contextLength: 128000,
      },
    ];
  }

  /**
   * Get Cohere capabilities
   */
  getCapabilities() {
    return {
      streaming: true,
      functionCalling: false,
      vision: false,
      maxContextLength: 128000,
      supportedFeatures: ['chat', 'embeddings', 'rerank', 'classify'],
    };
  }

  /**
   * Format messages for Cohere
   */
  formatMessages(messages) {
    return messages.map((msg) => ({
      role: msg.role === 'assistant' ? 'CHATBOT' : 'USER',
      message: msg.content,
    }));
  }
}

export default CohereProvider;
