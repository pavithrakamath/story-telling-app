import { NextRequest, NextResponse } from 'next/server';
import { getDefaultLLMProvider } from '@/lib/llm-factory';
import { getGenreConfig } from '@/lib/genre-config';
import { Paragraph, isValidGenre } from '@/types';
import { STORY_CONSTANTS, HTTP_STATUS, ERROR_MESSAGES } from '@/lib/constants';
import { ErrorHandler, ErrorLogger } from '@/lib/errors';
import { ImagePromptUtils, JSONUtils } from '@/lib/utils';

interface RegenerateParagraphRequest {
  storyId: string;
  paragraphId: number;
  currentParagraph: string;
  previousParagraphs: string[];
  followingParagraphs: string[];
  genre: string;
}

function createRegeneratePrompt(request: RegenerateParagraphRequest): string {
  const context = [
    ...request.previousParagraphs.map(
      (p, i) => `Previous paragraph ${i + 1}: ${p}`
    ),
    `Current paragraph ${request.paragraphId}: ${request.currentParagraph}`,
    ...request.followingParagraphs.map(
      (p, i) => `Following paragraph ${i + 1}: ${p}`
    ),
  ].join('\n\n');

  return `You are rewriting paragraph ${request.paragraphId} of a ${request.genre} story. Follow these requirements:

STORY CONTEXT:
${context}

REWRITE REQUIREMENTS:
- Keep exactly the same characters and maintain their personalities
- Fit seamlessly with the existing narrative flow
- Write exactly ${STORY_CONSTANTS.MIN_SENTENCES_PER_PARAGRAPH}-${STORY_CONSTANTS.MAX_SENTENCES_PER_PARAGRAPH} sentences with rich descriptive detail
- Maintain the ${request.genre} genre conventions
- Provide a fresh perspective while keeping plot consistency

FORMATTING:
Return ONLY valid JSON in this exact format:
{
  "text": "New paragraph content with 4-5 sentences",
  "imagePrompt": "Detailed scene description for AI image generation"
}

Rewrite the paragraph now:`;
}

// Image prompt enhancement moved to utils

export async function POST(request: NextRequest) {
  return await ErrorHandler.withErrorHandling(async () => {
    const regenerateRequest: RegenerateParagraphRequest = await request.json();

    // Validate request
    if (
      !regenerateRequest.storyId ||
      !regenerateRequest.paragraphId ||
      !regenerateRequest.currentParagraph
    ) {
      return NextResponse.json(
        { error: ERROR_MESSAGES.INVALID_GENRE },
        { status: HTTP_STATUS.BAD_REQUEST }
      );
    }

    // Generate new paragraph using LLM provider with genre-specific parameters
    const llmProvider = getDefaultLLMProvider();
    const prompt = createRegeneratePrompt(regenerateRequest);
    const genreConfig = getGenreConfig(
      isValidGenre(regenerateRequest.genre)
        ? regenerateRequest.genre
        : 'fantasy'
    );

    const rawResponse = await llmProvider.generateText(prompt, {
      temperature: genreConfig.temperature,
      maxTokens: Math.min(genreConfig.maxTokens, 800), // Shorter for single paragraph
    });

    // Parse the response using utility functions
    let paragraphData = JSONUtils.parseWithFallback(rawResponse);

    if (!paragraphData || !paragraphData.text) {
      ErrorLogger.logWarning(
        'Failed to parse paragraph response, using fallback',
        {
          rawResponseLength: rawResponse.length,
          genre: regenerateRequest.genre,
        }
      );

      paragraphData = {
        text: rawResponse.trim() || STORY_CONSTANTS.FALLBACK_PARAGRAPH,
        imagePrompt: ImagePromptUtils.createFallbackPrompt(
          rawResponse.trim() || STORY_CONSTANTS.FALLBACK_PARAGRAPH,
          regenerateRequest.genre
        ),
      };
    }

    // Create response
    const newParagraph: Paragraph = {
      id: regenerateRequest.paragraphId,
      text: paragraphData.text,
      imagePrompt: ImagePromptUtils.enhancePrompt(
        paragraphData.imagePrompt,
        regenerateRequest.genre
      ),
    };

    return NextResponse.json({ paragraph: newParagraph });
  });
}
