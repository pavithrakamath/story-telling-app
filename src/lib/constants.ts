// Application Constants
// This file contains all magic numbers and hardcoded values used throughout the application

// Image Generation Constants
export const IMAGE_CONSTANTS = {
  // Mock Image Provider
  MOCK: {
    SVG_WIDTH: 400,
    SVG_HEIGHT: 300,
    PROMPT_TRUNCATE_LENGTH: 150,
    COLORS: [
      '#FF6B6B', // Red
      '#4ECDC4', // Teal
      '#45B7D1', // Blue
      '#96CEB4', // Green
      '#FFEAA7', // Yellow
      '#DDA0DD', // Purple
    ],
    PADDING: 20,
    FONT_SIZE: 14,
    LINE_HEIGHT: 1.4,
  },

  // Replicate Provider
  REPLICATE: {
    POLLING_DELAY_MS: 1000,
    NUM_INFERENCE_STEPS: 4,
    GUIDANCE_SCALE: 7.5,
    DEFAULT_WIDTH: 512,
    DEFAULT_HEIGHT: 512,
  },

  // Common
  DEFAULT_IMAGE_FORMAT: 'image/jpeg' as const,
} as const;

// Story Generation Constants
export const STORY_CONSTANTS = {
  // Text Processing
  IMAGE_PROMPT_PREVIEW_LENGTH: 50,
  MIN_PARAGRAPH_LENGTH: 100,

  // Story Structure
  MIN_SENTENCES_PER_PARAGRAPH: 4,
  MAX_SENTENCES_PER_PARAGRAPH: 5,
  IMAGE_QUALITY: '8k resolution',

  // Fallback Content
  FALLBACK_PREFACE: 'A story unfolds',
  FALLBACK_PARAGRAPH: 'The story continues...',
  FALLBACK_IMAGE_PROMPT_SUFFIX: 'Additional scene from a {genre} story',

  // Generation Parameters
  DEFAULT_TEMPERATURE: 0.7,
  DEFAULT_MAX_TOKENS: 2000,

  // Validation Limits
  MIN_CHARACTERS: 1,
  MAX_CHARACTERS: 6,
  MIN_PARAGRAPHS: 3,
  MAX_PARAGRAPHS: 10,

  // Character Names
  MAX_CHARACTER_NAME_LENGTH: 50,
} as const;

// API Constants
export const API_CONSTANTS = {
  // Request Timeouts (in milliseconds)
  OLLAMA_TIMEOUT: 30000,
  GEMINI_TIMEOUT: 20000,
  DEEPINFRA_TIMEOUT: 25000,
  REPLICATE_TIMEOUT: 60000,

  // Retry Configuration
  MAX_RETRIES: 3,
  RETRY_DELAY_MS: 1000,

  // Request Size Limits (in bytes)
  MAX_REQUEST_SIZE: 1024 * 1024, // 1MB
  MAX_PROMPT_LENGTH: 10000,
} as const;

// HTTP Status Codes
export const HTTP_STATUS = {
  OK: 200,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  METHOD_NOT_ALLOWED: 405,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503,
} as const;

// Error Messages
export const ERROR_MESSAGES = {
  // Validation Errors
  INVALID_GENRE: 'Invalid genre provided',
  INVALID_CHARACTER_COUNT: `Character count must be between ${STORY_CONSTANTS.MIN_CHARACTERS} and ${STORY_CONSTANTS.MAX_CHARACTERS}`,
  INVALID_PARAGRAPH_COUNT: `Paragraph count must be between ${STORY_CONSTANTS.MIN_PARAGRAPHS} and ${STORY_CONSTANTS.MAX_PARAGRAPHS}`,
  INVALID_CHARACTER_NAMES: 'Character names must be non-empty strings',
  CHARACTER_NAME_TOO_LONG: `Character names must be less than ${STORY_CONSTANTS.MAX_CHARACTER_NAME_LENGTH} characters`,

  // Provider Errors
  PROVIDER_NOT_CONFIGURED: 'AI provider not properly configured',
  PROVIDER_UNAVAILABLE: 'AI provider is currently unavailable',
  API_KEY_MISSING: 'API key is missing or invalid',

  // Generation Errors
  STORY_GENERATION_FAILED: 'Failed to generate story',
  IMAGE_GENERATION_FAILED: 'Failed to generate image',
  INVALID_JSON_RESPONSE: 'Received invalid JSON response from AI provider',

  // General Errors
  INTERNAL_ERROR: 'An internal error occurred',
  TIMEOUT_ERROR: 'Request timed out',
  NETWORK_ERROR: 'Network connection failed',
} as const;

// Provider Models
export const MODEL_DEFAULTS = {
  OLLAMA: {
    TEXT_MODEL: 'llama3.2',
    BASE_URL: 'http://localhost:11434',
  },

  GEMINI: {
    TEXT_MODEL: 'gemini-1.5-pro',
    IMAGE_MODEL: 'gemini-2.0-flash-preview-image-generation',
  },

  DEEPINFRA: {
    TEXT_MODEL: 'meta-llama/Llama-3.1-70B-Instruct',
    BASE_URL: 'https://api.deepinfra.com/v1/inference',
  },

  REPLICATE: {
    IMAGE_MODEL: 'black-forest-labs/flux-schnell',
    BASE_URL: 'https://api.replicate.com/v1',
  },
} as const;
