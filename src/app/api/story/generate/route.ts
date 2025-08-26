import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { getDefaultLLMProvider } from '@/lib/llm-factory';
import { getGenreConfig } from '@/lib/genre-config';
import { StoryRequest, StoryResponse, Paragraph, isValidGenre } from '@/types';
import { STORY_CONSTANTS, HTTP_STATUS, ERROR_MESSAGES } from '@/lib/constants';
import {
  StoryValidator,
  RequestValidator,
  RateLimiter,
  createValidationError,
} from '@/lib/validation';
import {
  ErrorHandler,
  StoryGenerationError,
  InvalidResponseError,
  ProviderError,
  RateLimitError,
  ErrorLogger,
} from '@/lib/errors';
import { ImagePromptUtils, StoryParsingUtils } from '@/lib/utils';

function createStoryPrompt(request: StoryRequest): string {
  const characterInfo = request.characterNames?.length
    ? `Named Characters: ${request.characterNames.join(', ')}`
    : `${request.characters} unique characters (give them names)`;

  const genreGuidelines = {
    fantasy:
      'Include magical elements, mythical creatures, or supernatural powers',
    mystery: 'Build suspense with clues, red herrings, and a revelation',
    'sci-fi':
      'Incorporate futuristic technology, space, or scientific concepts',
    romance: 'Focus on relationships, emotions, and romantic tension',
    horror: 'Create atmosphere of dread, suspense, and frightening elements',
    adventure: 'Include exciting journeys, challenges, and heroic actions',
  };

  return `You are a professional storyteller. Create a ${request.genre} story following these EXACT requirements:

STORY STRUCTURE:
- Genre: ${request.genre} - ${genreGuidelines[request.genre as keyof typeof genreGuidelines] || 'Follow genre conventions'}
- Characters: ${characterInfo}
- Length: EXACTLY ${request.paragraphs} paragraphs (no more, no less)
- Each paragraph: ${STORY_CONSTANTS.MIN_SENTENCES_PER_PARAGRAPH}-${STORY_CONSTANTS.MAX_SENTENCES_PER_PARAGRAPH} sentences with rich descriptive detail

CHARACTER REQUIREMENTS:
- Use exactly ${request.characters} main characters throughout the story
- Give each character a distinct personality and role
- Each character must contribute meaningfully to the plot
- Reference characters by name consistently

FORMATTING REQUIREMENTS:
You must return your response in this exact JSON format:
{
  "preface": "One sentence story summary",
  "paragraphs": [
    {
      "text": "Paragraph 1 content with exactly ${STORY_CONSTANTS.MIN_SENTENCES_PER_PARAGRAPH}-${STORY_CONSTANTS.MAX_SENTENCES_PER_PARAGRAPH} sentences featuring the characters",
      "imagePrompt": "Detailed scene description for AI image generation"
    }
  ]
}

CRITICAL: Return ONLY valid JSON. No additional text before or after.

Create the story now:`;
}

// Image prompt enhancement moved to utils

export async function POST(request: NextRequest) {
  return await ErrorHandler.withErrorHandling(async () => {
    // Basic request validation
    if (!RequestValidator.validateMethod(request, ['POST'])) {
      return NextResponse.json(
        { error: 'Method not allowed' },
        { status: HTTP_STATUS.METHOD_NOT_ALLOWED }
      );
    }

    if (!RequestValidator.validateContentType(request)) {
      return NextResponse.json(
        { error: 'Content-Type must be application/json' },
        { status: HTTP_STATUS.BAD_REQUEST }
      );
    }

    if (!RequestValidator.validateRequestSize(request)) {
      return NextResponse.json(
        { error: 'Request too large' },
        { status: HTTP_STATUS.UNPROCESSABLE_ENTITY }
      );
    }

    // Rate limiting (basic implementation)
    const clientIP =
      request.headers.get('x-forwarded-for') ??
      request.headers.get('x-real-ip') ??
      'unknown';
    const rateLimit = RateLimiter.checkRateLimit(clientIP, 10, 60000); // 10 requests per minute

    if (!rateLimit.allowed) {
      throw new RateLimitError(new Date(rateLimit.resetTime));
    }

    // Parse and validate request body
    const requestData = await request.json();
    const validation = StoryValidator.validateStoryRequest(requestData);

    if (!validation.isValid) {
      return createValidationError(validation.errors, HTTP_STATUS.BAD_REQUEST);
    }

    const storyRequest = StoryValidator.sanitizeStoryRequest(requestData);
    if (!storyRequest) {
      return NextResponse.json(
        { error: ERROR_MESSAGES.INVALID_GENRE },
        { status: HTTP_STATUS.BAD_REQUEST }
      );
    }

    // Generate story using LLM provider with genre-specific parameters
    let llmProvider;
    try {
      llmProvider = getDefaultLLMProvider();

      // Check provider health before using
      const isHealthy = await llmProvider.checkHealth();
      if (!isHealthy) {
        throw new ProviderError('LLM provider health check failed');
      }
    } catch (error) {
      ErrorLogger.logError(
        error instanceof Error ? error : new Error('Unknown provider error'),
        { context: 'LLM provider initialization' }
      );
      throw new ProviderError('Failed to initialize LLM provider');
    }

    const prompt = createStoryPrompt(storyRequest);
    const genreConfig = getGenreConfig(
      isValidGenre(storyRequest.genre) ? storyRequest.genre : 'fantasy'
    );

    let rawResponse: string;
    try {
      rawResponse = await llmProvider.generateText(prompt, {
        temperature: genreConfig.temperature,
        maxTokens: genreConfig.maxTokens,
      });
    } catch (error) {
      ErrorLogger.logError(
        error instanceof Error ? error : new Error('Unknown generation error'),
        {
          context: 'Story generation',
          genre: storyRequest.genre,
          characters: storyRequest.characters,
          paragraphs: storyRequest.paragraphs,
        }
      );
      throw new StoryGenerationError('Failed to generate story content');
    }

    // Parse the response using utility functions
    let storyData;
    try {
      storyData = StoryParsingUtils.parseStoryResponse(rawResponse, {
        genre: storyRequest.genre,
        paragraphs: storyRequest.paragraphs,
      });
    } catch (parseError) {
      ErrorLogger.logError(
        parseError instanceof Error
          ? parseError
          : new Error('Story parsing failed'),
        {
          context: 'Story response parsing',
          rawResponseLength: rawResponse.length,
          genre: storyRequest.genre,
          requestedParagraphs: storyRequest.paragraphs,
        }
      );
      throw new InvalidResponseError('Failed to parse story response');
    }

    // Create response with enhanced image prompts
    const storyId = uuidv4();
    const paragraphs: Paragraph[] = storyData.paragraphs.map(
      (p: { text: string; imagePrompt: string }, index: number) => ({
        id: index + 1,
        text: p.text,
        imagePrompt: ImagePromptUtils.enhancePrompt(
          p.imagePrompt,
          storyRequest.genre
        ),
      })
    );

    const response: StoryResponse = {
      storyId,
      preface: storyData.preface,
      paragraphs,
    };

    return NextResponse.json(response);
  });
}
