import { Ollama } from 'ollama';
import { BaseAIProvider } from '../baseProvider.js';

/**
 * Ollama Provider Implementation (Self-hosted)
 */
export class OllamaProvider extends BaseAIProvider {
  constructor(credentials, config = {}) {
    super(credentials, config);
    this.providerName = 'Ollama';
  }

  /**
   * Initialize Ollama client
   */
  async initialize() {
    try {
      this.client = new Ollama({
        host: this.credentials.baseUrl || 'http://localhost:11434',
      });

      // Test connection by listing models
      await this.client.list();
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
      const response = await this.client.chat({
        model: options.model || this.config.defaultModel || 'llama2',
        messages: this.formatMessages(messages),
        options: {
          temperature: options.temperature ?? this.config.temperature ?? 0.7,
          num_predict: options.maxTokens || this.config.maxTokens || 1000,
          top_p: options.topP ?? this.config.topP ?? 0.9,
          top_k: options.topK ?? this.config.topK ?? 40,
          stop: options.stop || undefined,
        },
        stream: false,
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
      const stream = await this.client.chat({
        model: options.model || this.config.defaultModel || 'llama2',
        messages: this.formatMessages(messages),
        options: {
          temperature: options.temperature ?? this.config.temperature ?? 0.7,
          num_predict: options.maxTokens || this.config.maxTokens || 1000,
        },
        stream: true,
      });

      for await (const chunk of stream) {
        if (chunk.message?.content) {
          yield {
            content: chunk.message.content,
            done: chunk.done || false,
          };
        }
      }

      yield { done: true };
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Parse Ollama response to standard format
   */
  parseResponse(response) {
    const content = response.message?.content || '';

    // Ollama provides token counts
    const promptTokens = response.prompt_eval_count || 0;
    const completionTokens = response.eval_count || 0;

    return {
      content,
      role: 'assistant',
      finishReason: response.done ? 'stop' : 'length',
      usage: {
        promptTokens,
        completionTokens,
        totalTokens: promptTokens + completionTokens,
      },
      model: response.model,
      provider: this.providerName,
      cost: 0, // Self-hosted, no cost
      metadata: {
        totalDuration: response.total_duration,
        loadDuration: response.load_duration,
        promptEvalDuration: response.prompt_eval_duration,
        evalDuration: response.eval_duration,
        createdAt: response.created_at,
      },
    };
  }

  /**
   * Calculate cost for Ollama (always 0 for self-hosted)
   */
  calculateCost(promptTokens, completionTokens, model) {
    return 0; // Self-hosted, no API costs
  }

  /**
   * Get available Ollama models
   */
  async getAvailableModels() {
    if (!this.isInitialized()) {
      await this.initialize();
    }

    try {
      const response = await this.client.list();
      return response.models.map((model) => ({
        id: model.name,
        name: model.name,
        description: `${model.details?.family || 'Unknown'} - ${this.formatSize(model.size)}`,
        contextLength: model.details?.parameter_size || 4096,
        modifiedAt: model.modified_at,
      }));
    } catch (error) {
      // Return default models if can't fetch
      return [
        {
          id: 'llama2',
          name: 'Llama 2',
          description: 'Meta\'s Llama 2 model',
          contextLength: 4096,
        },
        {
          id: 'mistral',
          name: 'Mistral',
          description: 'Mistral 7B model',
          contextLength: 8192,
        },
        {
          id: 'codellama',
          name: 'Code Llama',
          description: 'Code-specialized Llama model',
          contextLength: 4096,
        },
      ];
    }
  }

  /**
   * Get Ollama capabilities
   */
  getCapabilities() {
    return {
      streaming: true,
      functionCalling: false,
      vision: false,
      maxContextLength: 8192,
      supportedFeatures: ['chat', 'embeddings'],
      selfHosted: true,
    };
  }

  /**
   * Format messages for Ollama
   */
  formatMessages(messages) {
    return messages.map((msg) => ({
      role: msg.role,
      content: msg.content,
    }));
  }

  /**
   * Format model size for display
   */
  formatSize(bytes) {
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    if (bytes === 0) return '0 B';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  }

  /**
   * Pull a model from Ollama registry
   */
  async pullModel(modelName) {
    if (!this.isInitialized()) {
      await this.initialize();
    }

    try {
      const stream = await this.client.pull({
        model: modelName,
        stream: true,
      });

      for await (const chunk of stream) {
        // Progress updates can be emitted here
        if (chunk.status) {
          console.log(`Pulling ${modelName}: ${chunk.status}`);
        }
      }

      return true;
    } catch (error) {
      throw this.handleError(error);
    }
  }
}

export default OllamaProvider;
