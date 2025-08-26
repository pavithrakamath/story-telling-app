import { STORY_CONSTANTS } from './constants';

/**
 * Image prompt enhancement utilities
 */
export class ImagePromptUtils {
  private static readonly STYLE_MAPPINGS: Record<string, string> = {
    fantasy: 'magical, ethereal, fantasy art style, detailed',
    mystery: 'noir, shadowy, mysterious atmosphere, dramatic lighting',
    'sci-fi': 'futuristic, cyberpunk, sci-fi concept art, neon colors',
    romance: 'soft lighting, romantic, beautiful, artistic',
    horror: 'dark, eerie, gothic, haunting atmosphere',
    adventure: 'dynamic, action-packed, adventurous, cinematic',
  };

  /**
   * Enhances an image prompt with genre-specific styling
   */
  static enhancePrompt(originalPrompt: string, genre: string): string {
    const style = this.STYLE_MAPPINGS[genre] || 'detailed, artistic';
    return `${originalPrompt}, ${style}, high quality, ${STORY_CONSTANTS.IMAGE_QUALITY}`;
  }

  /**
   * Creates a fallback image prompt from text
   */
  static createFallbackPrompt(text: string, genre: string): string {
    const preview = text.substring(
      0,
      STORY_CONSTANTS.IMAGE_PROMPT_PREVIEW_LENGTH
    );
    const basePrompt = `${genre} scene: ${preview}${text.length > STORY_CONSTANTS.IMAGE_PROMPT_PREVIEW_LENGTH ? '...' : ''}`;
    return this.enhancePrompt(basePrompt, genre);
  }

  /**
   * Generates image prompt from paragraph content
   */
  static generatePromptFromParagraph(paragraph: string, genre: string): string {
    // Extract key visual elements from the paragraph
    const sentences = paragraph
      .split(/[.!?]+/)
      .filter(s => s.trim().length > 0);
    const visualSentence =
      sentences.find(s =>
        /\b(see|saw|look|watch|appear|visible|glowing|shining|dark|bright|color|red|blue|green|large|small)\b/i.test(
          s
        )
      ) || sentences[0];

    if (visualSentence) {
      const cleanSentence = visualSentence.trim().substring(0, 100);
      return this.enhancePrompt(cleanSentence, genre);
    }

    return this.createFallbackPrompt(paragraph, genre);
  }
}

/**
 * JSON parsing utilities with fallback support
 */
export class JSONUtils {
  /**
   * Attempts to parse JSON with various fallback strategies
   */
  static parseWithFallback<T = unknown>(
    jsonString: string,
    fallback?: T
  ): T | null {
    try {
      return JSON.parse(jsonString.trim());
    } catch (error) {
      // Try to extract JSON from response
      const jsonMatch = jsonString.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          return JSON.parse(jsonMatch[0]);
        } catch {
          // JSON extraction also failed
        }
      }

      // Try to clean common issues
      const cleanedString = jsonString
        .trim()
        .replace(/^```json\s*/, '') // Remove markdown code blocks
        .replace(/\s*```$/, '')
        .replace(/^[^{]*/, '') // Remove text before first brace
        .replace(/[^}]*$/, ''); // Remove text after last brace

      if (cleanedString) {
        try {
          return JSON.parse(cleanedString);
        } catch {
          // All parsing attempts failed
        }
      }

      return fallback || null;
    }
  }

  /**
   * Validates that parsed JSON has the expected structure
   */
  static validateStoryStructure(data: unknown): data is {
    preface: string;
    paragraphs: Array<{ text: string; imagePrompt: string }>;
  } {
    return (
      data &&
      typeof data === 'object' &&
      typeof data.preface === 'string' &&
      Array.isArray(data.paragraphs) &&
      data.paragraphs.every(
        (p: unknown) =>
          typeof p.text === 'string' && typeof p.imagePrompt === 'string'
      )
    );
  }
}

/**
 * Story parsing utilities for handling LLM responses
 */
export class StoryParsingUtils {
  /**
   * Extracts story data from raw LLM response with fallback parsing
   */
  static parseStoryResponse(
    rawResponse: string,
    request: { genre: string; paragraphs: number }
  ): {
    preface: string;
    paragraphs: Array<{ text: string; imagePrompt: string }>;
  } {
    // First try JSON parsing
    const jsonResult = JSONUtils.parseWithFallback(rawResponse);
    if (JSONUtils.validateStoryStructure(jsonResult)) {
      return jsonResult;
    }

    // Fallback: parse as plain text
    return this.parseAsPlainText(rawResponse, request);
  }

  /**
   * Parses raw text response into structured story data
   */
  private static parseAsPlainText(
    rawResponse: string,
    request: { genre: string; paragraphs: number }
  ): {
    preface: string;
    paragraphs: Array<{ text: string; imagePrompt: string }>;
  } {
    const lines = rawResponse.split('\n').filter(line => line.trim());
    let preface = STORY_CONSTANTS.FALLBACK_PREFACE;
    let storyLines = lines;

    // Try to find a preface/summary line
    const prefaceMarkers = ['summary:', 'preface:', 'story:'];
    for (const line of lines) {
      const lowerLine = line.toLowerCase();
      if (prefaceMarkers.some(marker => lowerLine.includes(marker))) {
        preface = line.replace(/^[^:]*:\s*/, '').trim();
        storyLines = lines.slice(lines.indexOf(line) + 1);
        break;
      }
    }

    // Split into paragraphs
    const paragraphs = this.extractParagraphs(storyLines, request);

    return { preface, paragraphs };
  }

  /**
   * Extracts paragraphs from text lines
   */
  private static extractParagraphs(
    lines: string[],
    request: { genre: string; paragraphs: number }
  ): Array<{ text: string; imagePrompt: string }> {
    const paragraphs: Array<{ text: string; imagePrompt: string }> = [];
    let currentParagraph = '';

    for (const line of lines) {
      if (line.trim()) {
        currentParagraph += (currentParagraph ? ' ' : '') + line.trim();

        // If line ends with sentence-ending punctuation and we have enough content
        if (
          /[.!?]$/.test(line) &&
          currentParagraph.length > STORY_CONSTANTS.MIN_PARAGRAPH_LENGTH
        ) {
          paragraphs.push({
            text: currentParagraph,
            imagePrompt: ImagePromptUtils.createFallbackPrompt(
              currentParagraph,
              request.genre
            ),
          });
          currentParagraph = '';
        }
      } else if (currentParagraph) {
        paragraphs.push({
          text: currentParagraph,
          imagePrompt: ImagePromptUtils.createFallbackPrompt(
            currentParagraph,
            request.genre
          ),
        });
        currentParagraph = '';
      }
    }

    // Add any remaining content
    if (currentParagraph) {
      paragraphs.push({
        text: currentParagraph,
        imagePrompt: ImagePromptUtils.createFallbackPrompt(
          currentParagraph,
          request.genre
        ),
      });
    }

    // Ensure we have the right number of paragraphs
    while (paragraphs.length < request.paragraphs) {
      paragraphs.push({
        text: STORY_CONSTANTS.FALLBACK_PARAGRAPH,
        imagePrompt: STORY_CONSTANTS.FALLBACK_IMAGE_PROMPT_SUFFIX.replace(
          '{genre}',
          request.genre
        ),
      });
    }

    return paragraphs.slice(0, request.paragraphs);
  }
}

/**
 * API response utilities
 */
export class APIUtils {
  /**
   * Handles API response with automatic error parsing
   */
  static async handleResponse<T = unknown>(response: Response): Promise<T> {
    if (!response.ok) {
      let errorMessage = `HTTP ${response.status}: ${response.statusText}`;

      try {
        const errorData = await response.json();
        if (errorData.error) {
          errorMessage = errorData.error;
        } else if (errorData.message) {
          errorMessage = errorData.message;
        }
      } catch {
        // Failed to parse error JSON, use default message
      }

      throw new Error(errorMessage);
    }

    return response.json();
  }

  /**
   * Creates standardized API request options
   */
  static createRequestOptions(
    data: unknown,
    options?: RequestInit
  ): RequestInit {
    return {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      body: JSON.stringify(data),
      ...options,
    };
  }
}

/**
 * Utility functions for common operations
 */
export class CommonUtils {
  /**
   * Truncates text with ellipsis
   */
  static truncateText(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength).trim() + '...';
  }

  /**
   * Capitalizes first letter of each word
   */
  static titleCase(str: string): string {
    return str.replace(
      /\w\S*/g,
      txt => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
    );
  }

  /**
   * Generates a random ID
   */
  static generateId(): string {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
  }

  /**
   * Delays execution for specified milliseconds
   */
  static delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Retries an async operation with exponential backoff
   */
  static async retryWithBackoff<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    baseDelay: number = 1000
  ): Promise<T> {
    let lastError: Error;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        if (attempt === maxRetries - 1) {
          throw lastError;
        }

        const delay = baseDelay * Math.pow(2, attempt);
        await this.delay(delay);
      }
    }

    throw lastError!;
  }
}
