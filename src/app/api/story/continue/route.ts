import { NextRequest, NextResponse } from 'next/server';
import { getDefaultLLMProvider } from '@/lib/llm-factory';
import { getGenreConfig } from '@/lib/genre-config';
import { Paragraph, isValidGenre } from '@/types';
import { STORY_CONSTANTS, HTTP_STATUS, ERROR_MESSAGES } from '@/lib/constants';
import { ErrorHandler, ErrorLogger } from '@/lib/errors';
import { ImagePromptUtils, JSONUtils } from '@/lib/utils';

interface ContinueStoryRequest {
  storyId: string;
  existingParagraphs: string[];
  genre: string;
  additionalParagraphs?: number;
}

function createContinuationPrompt(request: ContinueStoryRequest): string {
  const storyContext = request.existingParagraphs
    .map((p, i) => `Paragraph ${i + 1}: ${p}`)
    .join('\n\n');

  const paragraphCount = request.additionalParagraphs || 2;

  return `Continue this ${request.genre} story by adding ${paragraphCount} more paragraphs:

Existing story:
${storyContext}

Continue the story with ${paragraphCount} new paragraphs that:
- Follow naturally from the existing narrative
- Maintain character consistency and story tone
- Each paragraph should be ${STORY_CONSTANTS.MIN_SENTENCES_PER_PARAGRAPH}-${STORY_CONSTANTS.MAX_SENTENCES_PER_PARAGRAPH} sentences long
- Include vivid descriptions for visual imagery
- Provide meaningful story progression

Return JSON format:
{
  "paragraphs": [
    {
      "text": "New paragraph content",
      "imagePrompt": "Detailed visual description for illustration"
    }
  ]
}

Continue the story:`;
}

// Image prompt enhancement moved to utils

export async function POST(request: NextRequest) {
  return await ErrorHandler.withErrorHandling(async () => {
    const continueRequest: ContinueStoryRequest = await request.json();

    // Validate request
    if (
      !continueRequest.storyId ||
      !continueRequest.existingParagraphs ||
      !continueRequest.genre
    ) {
      return NextResponse.json(
        { error: ERROR_MESSAGES.INVALID_GENRE },
        { status: HTTP_STATUS.BAD_REQUEST }
      );
    }

    // Generate continuation using LLM provider with genre-specific parameters
    const llmProvider = getDefaultLLMProvider();
    const prompt = createContinuationPrompt(continueRequest);
    const genreConfig = getGenreConfig(
      isValidGenre(continueRequest.genre) ? continueRequest.genre : 'fantasy'
    );

    const rawResponse = await llmProvider.generateText(prompt, {
      temperature: genreConfig.temperature,
      maxTokens: Math.min(genreConfig.maxTokens, 1200), // Moderate length for continuation
    });

    // Parse the response using utility functions
    let continuationData = JSONUtils.parseWithFallback(rawResponse);

    if (!continuationData || !continuationData.paragraphs) {
      ErrorLogger.logWarning(
        'Failed to parse continuation response, using fallback',
        {
          rawResponseLength: rawResponse.length,
          genre: continueRequest.genre,
        }
      );

      // Fallback: create structure from raw text
      const lines = rawResponse.split('\n').filter(line => line.trim());
      continuationData = {
        paragraphs: lines.map(text => ({
          text: text || STORY_CONSTANTS.FALLBACK_PARAGRAPH,
          imagePrompt: ImagePromptUtils.createFallbackPrompt(
            text || STORY_CONSTANTS.FALLBACK_PARAGRAPH,
            continueRequest.genre
          ),
        })),
      };
    }

    // Ensure we have paragraphs
    if (
      !continuationData.paragraphs ||
      continuationData.paragraphs.length === 0
    ) {
      continuationData.paragraphs = [
        {
          text: STORY_CONSTANTS.FALLBACK_PARAGRAPH,
          imagePrompt: STORY_CONSTANTS.FALLBACK_IMAGE_PROMPT_SUFFIX.replace(
            '{genre}',
            continueRequest.genre
          ),
        },
      ];
    }

    // Create response with enhanced image prompts
    const startingId = continueRequest.existingParagraphs.length + 1;
    const newParagraphs: Paragraph[] = continuationData.paragraphs.map(
      (p: { text: string; imagePrompt: string }, index: number) => ({
        id: startingId + index,
        text: p.text,
        imagePrompt: ImagePromptUtils.enhancePrompt(
          p.imagePrompt,
          continueRequest.genre
        ),
      })
    );

    return NextResponse.json({ newParagraphs });
  });
}
