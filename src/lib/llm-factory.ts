// LLM Factory Pattern for easy model switching
import { GoogleGenerativeAI } from '@google/generative-ai';
import { MODEL_DEFAULTS, STORY_CONSTANTS } from './constants';

export interface LLMProvider {
  generateText(
    prompt: string,
    options?: { temperature?: number; maxTokens?: number }
  ): Promise<string>;
  checkHealth(): Promise<boolean>;
  listModels?(): Promise<string[]>;
}

export interface LLMConfig {
  provider: 'ollama' | 'deepinfra' | 'gemini';
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

// Ollama Implementation
class OllamaProvider implements LLMProvider {
  private baseURL: string;
  private model: string;
  private temperature: number;
  private maxTokens: number;

  constructor(
    config: { model?: string; temperature?: number; maxTokens?: number } = {}
  ) {
    this.baseURL =
      process.env.OLLAMA_BASE_URL || MODEL_DEFAULTS.OLLAMA.BASE_URL;
    this.model =
      config.model ||
      process.env.OLLAMA_MODEL ||
      MODEL_DEFAULTS.OLLAMA.TEXT_MODEL;
    this.temperature =
      config.temperature || STORY_CONSTANTS.DEFAULT_TEMPERATURE;
    this.maxTokens = config.maxTokens || STORY_CONSTANTS.DEFAULT_MAX_TOKENS;
  }

  async generateText(
    prompt: string,
    options?: { temperature?: number; maxTokens?: number }
  ): Promise<string> {
    const temperature = options?.temperature ?? this.temperature;
    const maxTokens = options?.maxTokens ?? this.maxTokens;

    const response = await fetch(`${this.baseURL}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: this.model,
        prompt: prompt,
        stream: false,
        options: {
          temperature: temperature,
          num_predict: maxTokens,
          top_p: 0.9,
          repeat_penalty: 1.1,
        },
      }),
    });

    if (!response.ok) {
      throw new Error(
        `Ollama API error: ${response.status} ${response.statusText}`
      );
    }

    const data = await response.json();
    return data.response || '';
  }

  async checkHealth(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseURL}/api/tags`);
      return response.ok;
    } catch {
      return false;
    }
  }

  async listModels(): Promise<string[]> {
    try {
      const response = await fetch(`${this.baseURL}/api/tags`);
      if (!response.ok) return [];

      const data = await response.json();
      return data.models?.map((model: { name: string }) => model.name) || [];
    } catch {
      return [];
    }
  }
}

// DeepInfra Implementation
class DeepInfraProvider implements LLMProvider {
  private baseURL: string;
  private model: string;
  private apiKey: string;
  private temperature: number;
  private maxTokens: number;

  constructor(
    config: { model?: string; temperature?: number; maxTokens?: number } = {}
  ) {
    this.baseURL = MODEL_DEFAULTS.DEEPINFRA.BASE_URL;
    this.model = config.model || MODEL_DEFAULTS.DEEPINFRA.TEXT_MODEL;
    this.apiKey = process.env.DEEPINFRA_API_KEY || '';
    this.temperature =
      config.temperature || STORY_CONSTANTS.DEFAULT_TEMPERATURE;
    this.maxTokens = config.maxTokens || STORY_CONSTANTS.DEFAULT_MAX_TOKENS;
  }

  async generateText(
    prompt: string,
    options?: { temperature?: number; maxTokens?: number }
  ): Promise<string> {
    if (!this.apiKey) {
      throw new Error('DeepInfra API key not configured');
    }

    const temperature = options?.temperature ?? this.temperature;
    const maxTokens = options?.maxTokens ?? this.maxTokens;

    const response = await fetch(`${this.baseURL}/${this.model}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        input: prompt,
        max_tokens: maxTokens,
        temperature: temperature,
        stop: ['</s>'],
      }),
    });

    if (!response.ok) {
      throw new Error(
        `DeepInfra API error: ${response.status} ${response.statusText}`
      );
    }

    const data = await response.json();
    return data.results[0]?.generated_text || '';
  }

  async checkHealth(): Promise<boolean> {
    return !!this.apiKey;
  }
}

// Gemini Implementation
class GeminiProvider implements LLMProvider {
  private client: GoogleGenerativeAI;
  private model: string;
  private temperature: number;
  private maxTokens: number;

  constructor(
    config: { model?: string; temperature?: number; maxTokens?: number } = {}
  ) {
    const apiKey =
      process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '';
    if (!apiKey) {
      throw new Error('Gemini API key not configured');
    }

    this.client = new GoogleGenerativeAI(apiKey);
    this.model = config.model || MODEL_DEFAULTS.GEMINI.TEXT_MODEL;
    this.temperature =
      config.temperature || STORY_CONSTANTS.DEFAULT_TEMPERATURE;
    this.maxTokens = config.maxTokens || STORY_CONSTANTS.DEFAULT_MAX_TOKENS;
  }

  async generateText(
    prompt: string,
    options?: { temperature?: number; maxTokens?: number }
  ): Promise<string> {
    const temperature = options?.temperature ?? this.temperature;
    const maxTokens = options?.maxTokens ?? this.maxTokens;

    const model = this.client.getGenerativeModel({ model: this.model });

    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: temperature,
        maxOutputTokens: maxTokens,
      },
    });

    const response = await result.response;
    return response.text() || '';
  }

  async checkHealth(): Promise<boolean> {
    try {
      const model = this.client.getGenerativeModel({
        model: MODEL_DEFAULTS.GEMINI.TEXT_MODEL,
      });
      const result = await model.generateContent('Hello');
      return !!result.response.text();
    } catch {
      return false;
    }
  }

  async listModels(): Promise<string[]> {
    return [
      MODEL_DEFAULTS.GEMINI.TEXT_MODEL,
      'gemini-1.5-flash',
      'gemini-2.0-flash-exp',
    ];
  }
}

// Factory Function
export function createLLMProvider(config: LLMConfig): LLMProvider {
  const { provider, model, temperature, maxTokens } = config;

  switch (provider) {
    case 'ollama':
      return new OllamaProvider({ model, temperature, maxTokens });
    case 'deepinfra':
      return new DeepInfraProvider({ model, temperature, maxTokens });
    case 'gemini':
      return new GeminiProvider({ model, temperature, maxTokens });
    default:
      throw new Error(`Unsupported LLM provider: ${provider}`);
  }
}

// Default provider based on environment
export function getDefaultLLMProvider(): LLMProvider {
  const provider =
    (process.env.LLM_PROVIDER as 'ollama' | 'deepinfra' | 'gemini') || 'ollama';

  return createLLMProvider({
    provider,
    model: process.env.LLM_MODEL,
    temperature: process.env.LLM_TEMPERATURE
      ? parseFloat(process.env.LLM_TEMPERATURE)
      : undefined,
    maxTokens: process.env.LLM_MAX_TOKENS
      ? parseInt(process.env.LLM_MAX_TOKENS)
      : undefined,
  });
}
