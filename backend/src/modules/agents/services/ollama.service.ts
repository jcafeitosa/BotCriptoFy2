/**
 * Ollama Service
 * Service for interacting with Ollama local LLM
 */

import { Ollama } from 'ollama';
import logger from '@/utils/logger';
import type { AgentMessage } from '../types/agents.types';

/**
 * Ollama Configuration
 */
interface OllamaConfig {
  model: string;
  temperature?: number;
  maxTokens?: number;
  baseUrl?: string;
}

/**
 * Chat Request
 */
interface ChatRequest {
  messages: AgentMessage[];
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
}

/**
 * Chat Response
 */
interface ChatResponse {
  content: string;
  tokens: number;
  responseTimeMs: number;
  model: string;
}

/**
 * OllamaService
 * Manages communication with Ollama local LLM
 */
export class OllamaService {
  private client: Ollama;
  private defaultModel: string;
  private defaultTemperature: number;
  private defaultMaxTokens: number;

  constructor(config?: Partial<OllamaConfig>) {
    const baseUrl = config?.baseUrl || process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
    this.client = new Ollama({ host: baseUrl });

    this.defaultModel = config?.model || process.env.OLLAMA_MODEL || 'qwen3:0.6b';
    this.defaultTemperature = config?.temperature || 0.7;
    this.defaultMaxTokens = config?.maxTokens || 2048;

    logger.info('OllamaService initialized', {
      baseUrl,
      model: this.defaultModel,
      temperature: this.defaultTemperature,
      maxTokens: this.defaultMaxTokens,
    });
  }

  /**
   * Chat with Ollama
   */
  async chat(request: ChatRequest): Promise<ChatResponse> {
    const startTime = Date.now();

    try {
      const { messages, systemPrompt, temperature, maxTokens } = request;

      // Build messages array with system prompt
      const ollamaMessages: Array<{ role: string; content: string }> = [];

      // Add system prompt if provided
      if (systemPrompt) {
        ollamaMessages.push({
          role: 'system',
          content: systemPrompt,
        });
      }

      // Add conversation messages
      for (const msg of messages) {
        ollamaMessages.push({
          role: msg.role,
          content: msg.content,
        });
      }

      logger.debug('Sending chat request to Ollama', {
        model: this.defaultModel,
        messageCount: ollamaMessages.length,
        temperature: temperature || this.defaultTemperature,
      });

      // Call Ollama API
      const response = await this.client.chat({
        model: this.defaultModel,
        messages: ollamaMessages,
        options: {
          temperature: temperature || this.defaultTemperature,
          num_predict: maxTokens || this.defaultMaxTokens,
        },
      });

      const responseTimeMs = Date.now() - startTime;

      logger.info('Ollama chat completed', {
        model: this.defaultModel,
        responseTimeMs,
        tokens: response.eval_count || 0,
      });

      return {
        content: response.message.content,
        tokens: response.eval_count || 0,
        responseTimeMs,
        model: this.defaultModel,
      };
    } catch (error) {
      const responseTimeMs = Date.now() - startTime;

      logger.error('Ollama chat failed', {
        error: error instanceof Error ? error.message : String(error),
        responseTimeMs,
      });

      throw new Error(`Ollama chat failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate single completion (no conversation history)
   */
  async generate(prompt: string, options?: { temperature?: number; maxTokens?: number }): Promise<string> {
    const startTime = Date.now();

    try {
      logger.debug('Sending generate request to Ollama', {
        model: this.defaultModel,
        promptLength: prompt.length,
      });

      const response = await this.client.generate({
        model: this.defaultModel,
        prompt,
        options: {
          temperature: options?.temperature || this.defaultTemperature,
          num_predict: options?.maxTokens || this.defaultMaxTokens,
        },
      });

      const responseTimeMs = Date.now() - startTime;

      logger.info('Ollama generate completed', {
        model: this.defaultModel,
        responseTimeMs,
      });

      return response.response;
    } catch (error) {
      const responseTimeMs = Date.now() - startTime;

      logger.error('Ollama generate failed', {
        error: error instanceof Error ? error.message : String(error),
        responseTimeMs,
      });

      throw new Error(`Ollama generate failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Check if model is available
   */
  async checkModel(): Promise<boolean> {
    try {
      const models = await this.client.list();
      const modelExists = models.models.some((m) => m.name === this.defaultModel);

      if (!modelExists) {
        logger.warn('Ollama model not found', {
          model: this.defaultModel,
          availableModels: models.models.map((m) => m.name),
        });
      }

      return modelExists;
    } catch (error) {
      logger.error('Failed to check Ollama model', {
        error: error instanceof Error ? error.message : String(error),
      });
      return false;
    }
  }

  /**
   * Pull model if not available
   */
  async pullModel(model?: string): Promise<void> {
    const modelToPull = model || this.defaultModel;

    try {
      logger.info('Pulling Ollama model', { model: modelToPull });

      await this.client.pull({ model: modelToPull });

      logger.info('Ollama model pulled successfully', { model: modelToPull });
    } catch (error) {
      logger.error('Failed to pull Ollama model', {
        model: modelToPull,
        error: error instanceof Error ? error.message : String(error),
      });

      throw new Error(`Failed to pull Ollama model: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * List available models
   */
  async listModels(): Promise<string[]> {
    try {
      const models = await this.client.list();
      return models.models.map((m) => m.name);
    } catch (error) {
      logger.error('Failed to list Ollama models', {
        error: error instanceof Error ? error.message : String(error),
      });
      return [];
    }
  }

  /**
   * Get model info
   */
  async getModelInfo(model?: string): Promise<Record<string, unknown> | null> {
    const modelToCheck = model || this.defaultModel;

    try {
      const info = await this.client.show({ model: modelToCheck });
      return info as unknown as Record<string, unknown>;
    } catch (error) {
      logger.error('Failed to get Ollama model info', {
        model: modelToCheck,
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  }
}

// Export singleton instance
export const ollamaService = new OllamaService();
