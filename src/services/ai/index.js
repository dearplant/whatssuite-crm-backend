/**
 * AI Services Index
 * Central export point for all AI-related services
 */

export { BaseAIProvider } from './baseProvider.js';
export { OpenAIProvider } from './providers/openaiProvider.js';
export { ClaudeProvider } from './providers/claudeProvider.js';
export { GeminiProvider } from './providers/geminiProvider.js';
export { CohereProvider } from './providers/cohereProvider.js';
export { OllamaProvider } from './providers/ollamaProvider.js';
export { AIManager } from './aiManager.js';

// Export singleton instance as default
import aiManager from './aiManager.js';
export default aiManager;
