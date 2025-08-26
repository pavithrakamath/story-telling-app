import { HTTP_STATUS, ERROR_MESSAGES } from './constants';

// Base error class for the application
export abstract class AppError extends Error {
  abstract readonly statusCode: number;
  abstract readonly errorCode: string;
  readonly timestamp: Date;

  constructor(message: string) {
    super(message);
    this.timestamp = new Date();
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }

  toJSON() {
    return {
      error: this.errorCode,
      message: this.message,
      timestamp: this.timestamp.toISOString(),
      ...(process.env.NODE_ENV === 'development' && { stack: this.stack }),
    };
  }
}

// Validation errors
export class ValidationError extends AppError {
  readonly statusCode = HTTP_STATUS.BAD_REQUEST;
  readonly errorCode = 'VALIDATION_ERROR';

  constructor(
    message: string,
    public readonly field?: string
  ) {
    super(message);
  }

  toJSON() {
    return {
      ...super.toJSON(),
      ...(this.field && { field: this.field }),
    };
  }
}

// Provider-related errors
export class ProviderError extends AppError {
  readonly statusCode = HTTP_STATUS.BAD_GATEWAY;
  readonly errorCode = 'PROVIDER_ERROR';

  constructor(
    message: string,
    public readonly provider?: string
  ) {
    super(message);
  }

  toJSON() {
    return {
      ...super.toJSON(),
      ...(this.provider && { provider: this.provider }),
    };
  }
}

export class ProviderNotConfiguredError extends ProviderError {
  readonly statusCode = HTTP_STATUS.SERVICE_UNAVAILABLE;
  readonly errorCode = 'PROVIDER_NOT_CONFIGURED';

  constructor(provider: string) {
    super(ERROR_MESSAGES.PROVIDER_NOT_CONFIGURED, provider);
  }
}

export class ProviderUnavailableError extends ProviderError {
  readonly statusCode = HTTP_STATUS.SERVICE_UNAVAILABLE;
  readonly errorCode = 'PROVIDER_UNAVAILABLE';

  constructor(provider: string) {
    super(ERROR_MESSAGES.PROVIDER_UNAVAILABLE, provider);
  }
}

// Generation errors
export class GenerationError extends AppError {
  readonly statusCode = HTTP_STATUS.UNPROCESSABLE_ENTITY;
  readonly errorCode = 'GENERATION_ERROR';
}

export class StoryGenerationError extends GenerationError {
  readonly errorCode = 'STORY_GENERATION_ERROR';

  constructor(message?: string) {
    super(message || ERROR_MESSAGES.STORY_GENERATION_FAILED);
  }
}

export class ImageGenerationError extends GenerationError {
  readonly errorCode = 'IMAGE_GENERATION_ERROR';

  constructor(message?: string) {
    super(message || ERROR_MESSAGES.IMAGE_GENERATION_FAILED);
  }
}

export class InvalidResponseError extends GenerationError {
  readonly errorCode = 'INVALID_RESPONSE';

  constructor(message?: string) {
    super(message || ERROR_MESSAGES.INVALID_JSON_RESPONSE);
  }
}

// Rate limiting errors
export class RateLimitError extends AppError {
  readonly statusCode = HTTP_STATUS.TOO_MANY_REQUESTS;
  readonly errorCode = 'RATE_LIMIT_EXCEEDED';

  constructor(resetTime?: Date) {
    super('Rate limit exceeded. Please try again later.');
    if (resetTime) {
      this.resetTime = resetTime;
    }
  }

  public readonly resetTime?: Date;

  toJSON() {
    return {
      ...super.toJSON(),
      ...(this.resetTime && { resetTime: this.resetTime.toISOString() }),
    };
  }
}

// Network and timeout errors
export class TimeoutError extends AppError {
  readonly statusCode = HTTP_STATUS.INTERNAL_SERVER_ERROR;
  readonly errorCode = 'TIMEOUT_ERROR';

  constructor(message?: string) {
    super(message || ERROR_MESSAGES.TIMEOUT_ERROR);
  }
}

export class NetworkError extends AppError {
  readonly statusCode = HTTP_STATUS.BAD_GATEWAY;
  readonly errorCode = 'NETWORK_ERROR';

  constructor(message?: string) {
    super(message || ERROR_MESSAGES.NETWORK_ERROR);
  }
}

// Generic server errors
export class InternalServerError extends AppError {
  readonly statusCode = HTTP_STATUS.INTERNAL_SERVER_ERROR;
  readonly errorCode = 'INTERNAL_SERVER_ERROR';

  constructor(message?: string) {
    super(message || ERROR_MESSAGES.INTERNAL_ERROR);
  }
}

// Error handler utility for API routes
export class ErrorHandler {
  /**
   * Handles errors and returns appropriate HTTP response
   */
  static handleError(error: unknown): Response {
    console.error('API Error:', error);

    // Handle known application errors
    if (error instanceof AppError) {
      return Response.json(error.toJSON(), {
        status: error.statusCode,
        headers: this.getErrorHeaders(error),
      });
    }

    // Handle validation errors from external libraries
    if (error instanceof SyntaxError && error.message.includes('JSON')) {
      const validationError = new ValidationError(
        'Invalid JSON in request body'
      );
      return Response.json(validationError.toJSON(), {
        status: validationError.statusCode,
      });
    }

    // Handle network errors
    if (error instanceof TypeError && error.message.includes('fetch')) {
      const networkError = new NetworkError();
      return Response.json(networkError.toJSON(), {
        status: networkError.statusCode,
      });
    }

    // Handle generic errors
    const genericError = new InternalServerError();
    return Response.json(genericError.toJSON(), {
      status: genericError.statusCode,
    });
  }

  /**
   * Get appropriate headers for error responses
   */
  private static getErrorHeaders(error: AppError): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (error instanceof RateLimitError && error.resetTime) {
      headers['Retry-After'] = Math.ceil(
        (error.resetTime.getTime() - Date.now()) / 1000
      ).toString();
    }

    return headers;
  }

  /**
   * Wraps an async function with error handling
   */
  static async withErrorHandling<T>(
    fn: () => Promise<T>
  ): Promise<T | Response> {
    try {
      return await fn();
    } catch (error) {
      return this.handleError(error);
    }
  }
}

// Helper functions for common error scenarios
export function createValidationError(
  field: string,
  message: string
): ValidationError {
  return new ValidationError(message, field);
}

export function createProviderError(
  provider: string,
  isConfigured = false
): ProviderError {
  if (!isConfigured) {
    return new ProviderNotConfiguredError(provider);
  }
  return new ProviderUnavailableError(provider);
}

// Error logging utility
export class ErrorLogger {
  /**
   * Logs error with context information
   */
  static logError(
    error: AppError | Error,
    context?: Record<string, unknown>
  ): void {
    const logData = {
      error:
        error instanceof AppError
          ? error.toJSON()
          : {
              message: error.message,
              stack: error.stack,
              name: error.name,
            },
      timestamp: new Date().toISOString(),
      ...(context && { context }),
    };

    // In production, you might want to send this to a logging service
    console.error('Application Error:', JSON.stringify(logData, null, 2));
  }

  /**
   * Logs warning with context
   */
  static logWarning(message: string, context?: Record<string, unknown>): void {
    const logData = {
      level: 'warning',
      message,
      timestamp: new Date().toISOString(),
      ...(context && { context }),
    };

    console.warn('Application Warning:', JSON.stringify(logData, null, 2));
  }
}
