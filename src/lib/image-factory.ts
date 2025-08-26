import { GoogleGenAI } from '@google/genai';
import { IMAGE_CONSTANTS, MODEL_DEFAULTS } from './constants';

export interface ImageProvider {
  generateImage(prompt: string): Promise<string>;
  checkHealth(): Promise<boolean>;
}

export interface ImageConfig {
  provider: 'replicate' | 'local' | 'mock' | 'gemini';
  model?: string;
}

// Mock Image Generator (for development/demo)
class MockImageProvider implements ImageProvider {
  async generateImage(prompt: string): Promise<string> {
    // Create a simple colored SVG with the prompt text
    const {
      COLORS,
      SVG_WIDTH,
      SVG_HEIGHT,
      PROMPT_TRUNCATE_LENGTH,
      PADDING,
      FONT_SIZE,
      LINE_HEIGHT,
    } = IMAGE_CONSTANTS.MOCK;
    const color = COLORS[Math.floor(Math.random() * COLORS.length)];

    const contentWidth = SVG_WIDTH - PADDING * 2;
    const contentHeight = SVG_HEIGHT - PADDING * 2;

    const svg = `
      <svg width="${SVG_WIDTH}" height="${SVG_HEIGHT}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:${color};stop-opacity:1" />
            <stop offset="100%" style="stop-color:${color}88;stop-opacity:1" />
          </linearGradient>
        </defs>
        <rect width="${SVG_WIDTH}" height="${SVG_HEIGHT}" fill="url(#grad)" />
        <foreignObject x="${PADDING}" y="${PADDING}" width="${contentWidth}" height="${contentHeight}">
          <div xmlns="http://www.w3.org/1999/xhtml" style="
            font-family: Arial, sans-serif;
            color: white;
            text-shadow: 2px 2px 4px rgba(0,0,0,0.5);
            padding: ${PADDING}px;
            height: 100%;
            display: flex;
            align-items: center;
            justify-content: center;
            text-align: center;
            font-size: ${FONT_SIZE}px;
            line-height: ${LINE_HEIGHT};
            font-weight: bold;
          ">
            🎨 ${prompt.substring(0, PROMPT_TRUNCATE_LENGTH)}${prompt.length > PROMPT_TRUNCATE_LENGTH ? '...' : ''}
          </div>
        </foreignObject>
      </svg>
    `;

    // Convert SVG to base64 data URL
    const base64 = Buffer.from(svg).toString('base64');
    return `data:image/svg+xml;base64,${base64}`;
  }

  async checkHealth(): Promise<boolean> {
    return true;
  }
}

// Replicate Image Provider
class ReplicateImageProvider implements ImageProvider {
  private apiKey: string;
  private model: string;

  constructor(config: { model?: string } = {}) {
    this.apiKey = process.env.REPLICATE_API_TOKEN || '';
    this.model = config.model || MODEL_DEFAULTS.REPLICATE.IMAGE_MODEL;
  }

  async generateImage(prompt: string): Promise<string> {
    if (!this.apiKey) {
      throw new Error('Replicate API key not configured');
    }

    const response = await fetch('https://api.replicate.com/v1/predictions', {
      method: 'POST',
      headers: {
        Authorization: `Token ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        version: 'black-forest-labs/flux-schnell:lightning-fast-sd-model',
        input: {
          prompt: prompt,
          num_inference_steps: IMAGE_CONSTANTS.REPLICATE.NUM_INFERENCE_STEPS,
          guidance_scale: IMAGE_CONSTANTS.REPLICATE.GUIDANCE_SCALE,
          width: IMAGE_CONSTANTS.REPLICATE.DEFAULT_WIDTH,
          height: IMAGE_CONSTANTS.REPLICATE.DEFAULT_HEIGHT,
        },
      }),
    });

    if (!response.ok) {
      throw new Error(
        `Replicate API error: ${response.status} ${response.statusText}`
      );
    }

    const prediction = await response.json();

    // Poll for completion
    let result = prediction;
    while (result.status === 'starting' || result.status === 'processing') {
      await new Promise(resolve =>
        setTimeout(resolve, IMAGE_CONSTANTS.REPLICATE.POLLING_DELAY_MS)
      );

      const statusResponse = await fetch(
        `https://api.replicate.com/v1/predictions/${result.id}`,
        {
          headers: { Authorization: `Token ${this.apiKey}` },
        }
      );

      result = await statusResponse.json();
    }

    if (result.status === 'succeeded' && result.output && result.output[0]) {
      return result.output[0];
    }

    throw new Error(
      `Image generation failed: ${result.error || result.status}`
    );
  }

  async checkHealth(): Promise<boolean> {
    return !!this.apiKey;
  }
}

// Gemini Image Provider
class GeminiImageProvider implements ImageProvider {
  private client: GoogleGenAI;
  private model: string;

  constructor(config: { model?: string } = {}) {
    const apiKey =
      process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '';
    if (!apiKey) {
      throw new Error('Gemini API key not configured');
    }

    this.client = new GoogleGenAI({
      apiKey: apiKey,
    });
    this.model = config.model || MODEL_DEFAULTS.GEMINI.IMAGE_MODEL;
  }

  async generateImage(prompt: string): Promise<string> {
    const config = {
      responseModalities: ['IMAGE', 'TEXT'],
    };

    const contents = [
      {
        role: 'user',
        parts: [
          {
            text: prompt,
          },
        ],
      },
    ];

    const response = await this.client.models.generateContentStream({
      model: this.model,
      config,
      contents,
    });

    for await (const chunk of response) {
      if (
        !chunk.candidates ||
        !chunk.candidates[0].content ||
        !chunk.candidates[0].content.parts
      ) {
        continue;
      }

      if (chunk.candidates?.[0]?.content?.parts?.[0]?.inlineData) {
        const inlineData = chunk.candidates[0].content.parts[0].inlineData;
        const mimeType =
          inlineData.mimeType || IMAGE_CONSTANTS.DEFAULT_IMAGE_FORMAT;
        const data = inlineData.data || '';
        return `data:${mimeType};base64,${data}`;
      }
    }

    throw new Error('No image data generated');
  }

  async checkHealth(): Promise<boolean> {
    try {
      // Simple health check - just verify API key is configured
      return !!process.env.GEMINI_API_KEY || !!process.env.GOOGLE_API_KEY;
    } catch {
      return false;
    }
  }
}

// Factory Function
export function createImageProvider(config: ImageConfig): ImageProvider {
  const { provider, model } = config;

  switch (provider) {
    case 'replicate':
      return new ReplicateImageProvider({ model });
    case 'gemini':
      return new GeminiImageProvider({ model });
    case 'mock':
    default:
      return new MockImageProvider();
  }
}

// Default provider based on environment
export function getDefaultImageProvider(): ImageProvider {
  const provider =
    (process.env.IMAGE_PROVIDER as 'replicate' | 'mock' | 'gemini') || 'mock';

  return createImageProvider({
    provider,
    model: process.env.IMAGE_MODEL,
  });
}
