'use client';

import { useState } from 'react';
import { BookOpen } from 'lucide-react';
import StoryForm from '@/components/StoryForm';
import StoryDisplay from '@/components/StoryDisplay';
import {
  ErrorBoundary,
  StoryErrorBoundary,
  useErrorHandler,
} from '@/components/ErrorBoundary';
import { StoryRequest, Story, Paragraph } from '@/types';

function HomeContent() {
  const [story, setStory] = useState<Story | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingParagraphId, setLoadingParagraphId] = useState<
    number | undefined
  >();
  const [error, setError] = useState<string | null>(null);
  const { handleError } = useErrorHandler();

  const generateImages = async (paragraphs: Paragraph[]) => {
    // Skip image generation if disabled
    if (process.env.NEXT_PUBLIC_ENABLE_IMAGES !== 'true') {
      return [];
    }

    const imagePromises = paragraphs.map(async paragraph => {
      try {
        const response = await fetch('/api/images/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt: paragraph.imagePrompt,
            paragraphId: paragraph.id,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          return { paragraphId: paragraph.id, imageUrl: data.imageUrl };
        } else {
          console.warn(
            `Image generation failed for paragraph ${paragraph.id}: ${response.status}`
          );
        }
      } catch (error) {
        console.error(
          `Failed to generate image for paragraph ${paragraph.id}:`,
          error
        );
      }
      return null;
    });

    const imageResults = await Promise.allSettled(imagePromises);

    return imageResults
      .filter(
        (
          result
        ): result is PromiseFulfilledResult<{
          paragraphId: number;
          imageUrl: string;
        } | null> => result.status === 'fulfilled' && result.value !== null
      )
      .map(result => result.value!);
  };

  const handleStorySubmit = async (request: StoryRequest) => {
    setIsLoading(true);
    setError(null);

    try {
      // Generate story text
      const response = await fetch('/api/story/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        throw new Error('Failed to generate story');
      }

      const storyResponse = await response.json();

      // Create story object
      const newStory: Story = {
        id: storyResponse.storyId,
        preface: storyResponse.preface,
        paragraphs: storyResponse.paragraphs,
        genre: request.genre,
        characters: request.characters,
        createdAt: new Date(),
      };

      setStory(newStory);

      // Generate images in the background (if image generation is enabled)
      const imageGenerationEnabled =
        process.env.NEXT_PUBLIC_ENABLE_IMAGES === 'true';
      if (imageGenerationEnabled) {
        generateImages(storyResponse.paragraphs).then(imageResults => {
          setStory(prevStory => {
            if (!prevStory) return prevStory;

            const updatedParagraphs = prevStory.paragraphs.map(paragraph => {
              const imageResult = imageResults.find(
                result => result.paragraphId === paragraph.id
              );
              return imageResult
                ? { ...paragraph, imageUrl: imageResult.imageUrl }
                : paragraph;
            });

            return { ...prevStory, paragraphs: updatedParagraphs };
          });
        });
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : 'Failed to generate story. Please try again.';
      console.error('Story generation error:', error);
      setError(errorMessage);

      // Also report to error boundary if it's a critical error
      if (error instanceof Error && error.message.includes('Network')) {
        handleError(error);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegenerateParagraph = async (paragraphId: number) => {
    if (!story) return;

    setLoadingParagraphId(paragraphId);

    try {
      const currentParagraph = story.paragraphs.find(p => p.id === paragraphId);
      if (!currentParagraph) return;

      const paragraphIndex = story.paragraphs.findIndex(
        p => p.id === paragraphId
      );
      const previousParagraphs = story.paragraphs
        .slice(0, paragraphIndex)
        .map(p => p.text);
      const followingParagraphs = story.paragraphs
        .slice(paragraphIndex + 1)
        .map(p => p.text);

      const response = await fetch('/api/story/regenerate-paragraph', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storyId: story.id,
          paragraphId,
          currentParagraph: currentParagraph.text,
          previousParagraphs,
          followingParagraphs,
          genre: story.genre,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to regenerate paragraph');
      }

      const data = await response.json();

      // Update story with new paragraph
      setStory(prevStory => {
        if (!prevStory) return prevStory;

        const updatedParagraphs = prevStory.paragraphs.map(p =>
          p.id === paragraphId ? { ...data.paragraph, imageUrl: undefined } : p
        );

        return { ...prevStory, paragraphs: updatedParagraphs };
      });

      // Generate image for the new paragraph
      generateImages([data.paragraph]).then(imageResults => {
        if (imageResults.length > 0) {
          setStory(prevStory => {
            if (!prevStory) return prevStory;

            const updatedParagraphs = prevStory.paragraphs.map(p =>
              p.id === paragraphId
                ? { ...p, imageUrl: imageResults[0].imageUrl }
                : p
            );

            return { ...prevStory, paragraphs: updatedParagraphs };
          });
        }
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : 'Failed to regenerate paragraph. Please try again.';
      console.error('Paragraph regeneration error:', error);
      setError(errorMessage);

      if (error instanceof Error && error.message.includes('Network')) {
        handleError(error);
      }
    } finally {
      setLoadingParagraphId(undefined);
    }
  };

  const handleContinueStory = async () => {
    if (!story) return;

    setIsLoading(true);

    try {
      const response = await fetch('/api/story/continue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storyId: story.id,
          existingParagraphs: story.paragraphs.map(p => p.text),
          genre: story.genre,
          additionalParagraphs: 2,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to continue story');
      }

      const data = await response.json();

      // Update story with new paragraphs
      setStory(prevStory => {
        if (!prevStory) return prevStory;
        return {
          ...prevStory,
          paragraphs: [...prevStory.paragraphs, ...data.newParagraphs],
        };
      });

      // Generate images for new paragraphs
      generateImages(data.newParagraphs).then(imageResults => {
        setStory(prevStory => {
          if (!prevStory) return prevStory;

          const updatedParagraphs = prevStory.paragraphs.map(paragraph => {
            const imageResult = imageResults.find(
              result => result.paragraphId === paragraph.id
            );
            return imageResult
              ? { ...paragraph, imageUrl: imageResult.imageUrl }
              : paragraph;
          });

          return { ...prevStory, paragraphs: updatedParagraphs };
        });
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : 'Failed to continue story. Please try again.';
      console.error('Story continuation error:', error);
      setError(errorMessage);

      if (error instanceof Error && error.message.includes('Network')) {
        handleError(error);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegenerateStory = () => {
    setStory(null);
    setError(null);
  };

  return (
    <div className='min-h-screen bg-gradient-to-br from-purple-50 to-blue-50'>
      <div className='container mx-auto px-4 py-8'>
        {/* Header */}
        <header className='text-center mb-12'>
          <div className='flex items-center justify-center gap-3 mb-4'>
            <BookOpen className='h-8 w-8 text-purple-600' />
            <h1 className='text-4xl font-bold text-black'>AI Story Teller</h1>
          </div>
          <p className='text-xl text-black max-w-2xl mx-auto'>
            Create personalized stories with AI-powered text and images. Choose
            your genre, characters, and watch your unique tale come to life.
          </p>
        </header>

        {/* Error Message */}
        {error && (
          <div className='mb-8 p-4 bg-red-100 border border-red-400 text-red-700 rounded-md max-w-2xl mx-auto'>
            {error}
          </div>
        )}

        {/* Main Content */}
        <div className='space-y-12'>
          {!story ? (
            <ErrorBoundary
              fallback={
                <div className='text-center py-8'>
                  <p className='text-red-600 mb-4'>Error loading story form</p>
                  <button
                    onClick={() => window.location.reload()}
                    className='px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700'
                  >
                    Reload Page
                  </button>
                </div>
              }
            >
              <StoryForm onSubmit={handleStorySubmit} isLoading={isLoading} />
            </ErrorBoundary>
          ) : (
            <StoryErrorBoundary>
              <StoryDisplay
                story={story}
                onRegenerateParagraph={handleRegenerateParagraph}
                onContinueStory={handleContinueStory}
                onRegenerateStory={handleRegenerateStory}
                isLoading={isLoading}
                loadingParagraphId={loadingParagraphId}
              />
            </StoryErrorBoundary>
          )}
        </div>

        {/* Footer */}
        <footer className='mt-16 text-center text-black'>
          <p>Powered by Ollama • Local AI Models</p>
        </footer>
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <ErrorBoundary
      onError={error => {
        console.error('App-level error:', {
          error: error.message,
          stack: error.stack,
          timestamp: new Date().toISOString(),
        });
      }}
    >
      <HomeContent />
    </ErrorBoundary>
  );
}
