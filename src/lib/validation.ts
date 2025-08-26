import { StoryRequest, isValidGenre } from '@/types';
import { STORY_CONSTANTS, ERROR_MESSAGES } from './constants';

// Validation error type
export interface ValidationError {
  field: string;
  message: string;
}

// Validation result type
export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

// Input sanitization utilities
export class InputSanitizer {
  /**
   * Sanitizes a string by removing potential XSS vectors
   */
  static sanitizeString(input: string): string {
    if (typeof input !== 'string') return '';

    return (
      input
        .trim()
        // Remove HTML tags
        .replace(/<[^>]*>/g, '')
        // Remove potential script injections
        .replace(/javascript:/gi, '')
        .replace(/on\w+\s*=/gi, '')
        // Remove null bytes
        .replace(/\0/g, '')
        // Limit length to prevent DoS
        .substring(0, 1000)
    );
  }

  /**
   * Sanitizes character names array
   */
  static sanitizeCharacterNames(names: unknown): string[] | undefined {
    if (!Array.isArray(names)) return undefined;

    return names
      .filter(name => typeof name === 'string')
      .map(name => this.sanitizeString(name))
      .filter(
        name =>
          name.length > 0 &&
          name.length <= STORY_CONSTANTS.MAX_CHARACTER_NAME_LENGTH
      )
      .slice(0, STORY_CONSTANTS.MAX_CHARACTERS); // Limit array size
  }

  /**
   * Sanitizes and validates numeric input
   */
  static sanitizeNumber(
    input: unknown,
    min: number,
    max: number
  ): number | null {
    if (typeof input === 'number' && !isNaN(input)) {
      const num = Math.floor(input);
      return num >= min && num <= max ? num : null;
    }

    if (typeof input === 'string') {
      const parsed = parseInt(input, 10);
      if (!isNaN(parsed)) {
        return parsed >= min && parsed <= max ? parsed : null;
      }
    }

    return null;
  }
}

// Story request validator
export class StoryValidator {
  /**
   * Validates a complete story request
   */
  static validateStoryRequest(data: unknown): ValidationResult {
    const errors: ValidationError[] = [];

    // Check if data is an object
    if (!data || typeof data !== 'object') {
      return {
        isValid: false,
        errors: [{ field: 'root', message: 'Request data must be an object' }],
      };
    }

    const request = data as Partial<StoryRequest>;

    // Validate genre
    if (!request.genre || typeof request.genre !== 'string') {
      errors.push({ field: 'genre', message: ERROR_MESSAGES.INVALID_GENRE });
    } else if (!isValidGenre(request.genre)) {
      errors.push({ field: 'genre', message: ERROR_MESSAGES.INVALID_GENRE });
    }

    // Validate characters count
    const charactersCount = InputSanitizer.sanitizeNumber(
      request.characters,
      STORY_CONSTANTS.MIN_CHARACTERS,
      STORY_CONSTANTS.MAX_CHARACTERS
    );

    if (charactersCount === null) {
      errors.push({
        field: 'characters',
        message: ERROR_MESSAGES.INVALID_CHARACTER_COUNT,
      });
    }

    // Validate paragraphs count
    const paragraphsCount = InputSanitizer.sanitizeNumber(
      request.paragraphs,
      STORY_CONSTANTS.MIN_PARAGRAPHS,
      STORY_CONSTANTS.MAX_PARAGRAPHS
    );

    if (paragraphsCount === null) {
      errors.push({
        field: 'paragraphs',
        message: ERROR_MESSAGES.INVALID_PARAGRAPH_COUNT,
      });
    }

    // Validate character names (optional)
    if (request.characterNames !== undefined) {
      if (!Array.isArray(request.characterNames)) {
        errors.push({
          field: 'characterNames',
          message: ERROR_MESSAGES.INVALID_CHARACTER_NAMES,
        });
      } else {
        const sanitizedNames = InputSanitizer.sanitizeCharacterNames(
          request.characterNames
        );
        if (!sanitizedNames) {
          errors.push({
            field: 'characterNames',
            message: ERROR_MESSAGES.INVALID_CHARACTER_NAMES,
          });
        } else if (sanitizedNames.some(name => name.length === 0)) {
          errors.push({
            field: 'characterNames',
            message: ERROR_MESSAGES.INVALID_CHARACTER_NAMES,
          });
        } else if (
          sanitizedNames.some(
            name => name.length > STORY_CONSTANTS.MAX_CHARACTER_NAME_LENGTH
          )
        ) {
          errors.push({
            field: 'characterNames',
            message: ERROR_MESSAGES.CHARACTER_NAME_TOO_LONG,
          });
        }

        // Check if character names count matches characters count
        if (charactersCount && sanitizedNames.length !== charactersCount) {
          errors.push({
            field: 'characterNames',
            message: `Number of character names (${sanitizedNames.length}) must match character count (${charactersCount})`,
          });
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Sanitizes and returns a clean story request
   */
  static sanitizeStoryRequest(data: unknown): StoryRequest | null {
    const validation = this.validateStoryRequest(data);
    if (!validation.isValid) return null;

    const request = data as Partial<StoryRequest>;

    const sanitized: StoryRequest = {
      genre: InputSanitizer.sanitizeString(
        request.genre!
      ) as StoryRequest['genre'],
      characters: InputSanitizer.sanitizeNumber(
        request.characters,
        STORY_CONSTANTS.MIN_CHARACTERS,
        STORY_CONSTANTS.MAX_CHARACTERS
      )!,
      paragraphs: InputSanitizer.sanitizeNumber(
        request.paragraphs,
        STORY_CONSTANTS.MIN_PARAGRAPHS,
        STORY_CONSTANTS.MAX_PARAGRAPHS
      )!,
    };

    // Add character names if provided
    if (request.characterNames) {
      const sanitizedNames = InputSanitizer.sanitizeCharacterNames(
        request.characterNames
      );
      if (sanitizedNames && sanitizedNames.length === sanitized.characters) {
        sanitized.characterNames = sanitizedNames;
      }
    }

    return sanitized;
  }
}

// Generic request validator
export class RequestValidator {
  /**
   * Validates request size
   */
  static validateRequestSize(request: Request): boolean {
    const contentLength = request.headers.get('content-length');
    if (contentLength) {
      const size = parseInt(contentLength, 10);
      return size <= 1024 * 1024; // 1MB limit
    }
    return true; // Allow if no content-length header
  }

  /**
   * Validates request content type
   */
  static validateContentType(request: Request): boolean {
    const contentType = request.headers.get('content-type');
    return contentType?.includes('application/json') ?? false;
  }

  /**
   * Validates request method
   */
  static validateMethod(request: Request, allowedMethods: string[]): boolean {
    return allowedMethods.includes(request.method);
  }
}

// Middleware helper for validation
export function createValidationError(errors: ValidationError[], status = 400) {
  return Response.json(
    {
      error: 'Validation failed',
      details: errors,
    },
    { status }
  );
}

// Rate limiting helper (basic implementation)
export class RateLimiter {
  private static requests = new Map<
    string,
    { count: number; resetTime: number }
  >();

  /**
   * Simple rate limiting based on IP
   */
  static checkRateLimit(
    identifier: string,
    maxRequests = 60,
    windowMs = 60000 // 1 minute
  ): { allowed: boolean; resetTime: number } {
    const now = Date.now();
    const current = this.requests.get(identifier);

    if (!current || now > current.resetTime) {
      // Reset or create new entry
      this.requests.set(identifier, {
        count: 1,
        resetTime: now + windowMs,
      });
      return { allowed: true, resetTime: now + windowMs };
    }

    if (current.count >= maxRequests) {
      return { allowed: false, resetTime: current.resetTime };
    }

    current.count++;
    return { allowed: true, resetTime: current.resetTime };
  }

  /**
   * Clean up expired entries
   */
  static cleanup(): void {
    const now = Date.now();
    for (const [key, value] of this.requests.entries()) {
      if (now > value.resetTime) {
        this.requests.delete(key);
      }
    }
  }
}
