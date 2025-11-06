import { GoogleGenerativeAI } from '@google/generative-ai';
import { BaseAIProvider } from '../baseProvider.js';

/**
 * Google Gemini Provider Implementation
 */
export class GeminiProvider extends BaseAIProvider {
  constructor(credentials, config = {}) {
    super(credentials, config);
    this.providerName = 'Gemini';
  }

  /**
   * Initialize Google Generative AI client
   */
  async initialize() {
    try {
      this.client = new GoogleGenerativeAI(this.credentials.apiKey);
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
      const modelName = options.model || this.config.defaultModel || 'gemini-pro';
      const model = this.client.getGenerativeModel({ model: modelName });

      // Extract system message and convert to instruction
      const systemMessage = messages.find((m) => m.role === 'system');
      const conversationMessages = messages.filter((m) => m.role !== 'system');

      // Format chat history
      const history = this.formatMessages(conversationMessages.slice(0, -1));
      const lastMessage = conversationMessages[conversationMessages.length - 1];

      // Start chat with history
      const chat = model.startChat({
        history,
        generationConfig: {
          temperature: options.temperature ?? this.config.temperature ?? 0.7,
          maxOutputTokens: options.maxTokens || this.config.maxTokens || 1000,
          topP: options.topP ?? this.config.topP ?? 0.95,
          topK: options.topK ?? this.config.topK ?? 40,
          stopSequences: options.stop || undefined,
        },
        safetySettings: options.safetySettings || undefined,
      });

      // Add system message as context if present
      const prompt = systemMessage
        ? `${systemMessage.content}\n\n${lastMessage.content}`
        : lastMessage.content;

      const result = await chat.sendMessage(prompt);
      const response = await result.response;

      return this.parseResponse(response, modelName);
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
      const modelName = options.model || this.config.defaultModel || 'gemini-pro';
      const model = this.client.getGenerativeModel({ model: modelName });

      const systemMessage = messages.find((m) => m.role === 'system');
      const conversationMessages = messages.filter((m) => m.role !== 'system');

      const history = this.formatMessages(conversationMessages.slice(0, -1));
      const lastMessage = conversationMessages[conversationMessages.length - 1];

      const chat = model.startChat({
        history,
        generationConfig: {
          temperature: options.temperature ?? this.config.temperature ?? 0.7,
          maxOutputTokens: options.maxTokens || this.config.maxTokens || 1000,
        },
      });

      const prompt = systemMessage
        ? `${systemMessage.content}\n\n${lastMessage.content}`
        : lastMessage.content;

      const result = await chat.sendMessageStream(prompt);

      for await (const chunk of result.stream) {
        const text = chunk.text();
        if (text) {
          yield {
            content: text,
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
   * Parse Gemini response to standard format
   */
  parseResponse(response, model) {
    const text = response.text();
    const candidates = response.candidates || [];
    const candidate = candidates[0] || {};

    // Estimate token usage (Gemini doesn't provide exact counts)
    const promptTokens = Math.ceil(text.length / 4);
    const completionTokens = Math.ceil(text.length / 4);

    return {
      content: text,
      role: 'assistant',
      finishReason: candidate.finishReason || 'STOP',
      usage: {
        promptTokens,
        completionTokens,
        totalTokens: promptTokens + completionTokens,
      },
      model,
      provider: this.providerName,
      cost: this.calculateCost(promptTokens, completionTokens, model),
      metadata: {
        safetyRatings: candidate.safetyRatings || [],
        citationMetadata: candidate.citationMetadata || null,
      },
    };
  }

  /**
   * Calculate cost for Gemini models
   */
  calculateCost(promptTokens, completionTokens, model) {
    // Pricing as of 2024 (per 1M tokens)
    const pricing = {
      'gemini-pro': { prompt: 0.5, completion: 1.5 },
      'gemini-pro-vision': { prompt: 0.5, completion: 1.5 },
      'gemini-ultra': { prompt: 2.0, completion: 6.0 },
    };

    // Find matching pricing
    let modelPricing = pricing['gemini-pro']; // Default
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
   * Get available Gemini models
   */
  getAvailableModels() {
    return [
      {
        id: 'gemini-pro',
        name: 'Gemini Pro',
        description: 'Best for text-based tasks',
        contextLength: 32768,
      },
      {
        id: 'gemini-pro-vision',
        name: 'Gemini Pro Vision',
        description: 'Multimodal model with vision capabilities',
        contextLength: 16384,
      },
      {
        id: 'gemini-ultra',
        name: 'Gemini Ultra',
        description: 'Most capable model for complex tasks',
        contextLength: 32768,
      },
    ];
  }

  /**
   * Get Gemini capabilities
   */
  getCapabilities() {
    return {
      streaming: true,
      functionCalling: true,
      vision: true,
      maxContextLength: 32768,
      supportedFeatures: ['chat', 'vision', 'embeddings'],
    };
  }

  /**
   * Format messages for Gemini
   */
  formatMessages(messages) {
    return messages.map((msg) => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }],
    }));
  }
}

export default GeminiProvider;
