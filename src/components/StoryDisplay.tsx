'use client';

import { useState } from 'react';
import Image from 'next/image';
import {
  RefreshCw,
  Plus,
  Download,
  ImageIcon,
  Eye,
  EyeOff,
  Palette,
} from 'lucide-react';
import { Story } from '@/types';

interface StoryDisplayProps {
  story: Story;
  onRegenerateParagraph: (paragraphId: number) => void;
  onContinueStory: () => void;
  onRegenerateStory: () => void;
  isLoading: boolean;
  loadingParagraphId?: number;
}

export default function StoryDisplay({
  story,
  onRegenerateParagraph,
  onContinueStory,
  onRegenerateStory,
  isLoading,
  loadingParagraphId,
}: StoryDisplayProps) {
  const [expandedImages, setExpandedImages] = useState<Set<number>>(new Set());
  const [showImagePrompts, setShowImagePrompts] = useState<boolean>(
    process.env.NEXT_PUBLIC_ENABLE_IMAGES !== 'true'
  );

  const toggleImageExpanded = (paragraphId: number) => {
    const newExpanded = new Set(expandedImages);
    if (newExpanded.has(paragraphId)) {
      newExpanded.delete(paragraphId);
    } else {
      newExpanded.add(paragraphId);
    }
    setExpandedImages(newExpanded);
  };

  const exportStory = () => {
    const storyText = `${story.preface}\n\n${story.paragraphs.map(p => p.text).join('\n\n')}`;
    const blob = new Blob([storyText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `story-${story.genre}-${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className='w-full max-w-4xl mx-auto bg-white rounded-lg shadow-lg overflow-hidden'>
      {/* Header */}
      <div className='bg-gradient-to-r from-purple-600 to-blue-600 text-white p-6'>
        <div className='flex justify-between items-start mb-4'>
          <div>
            <h2 className='text-2xl font-bold capitalize text-white'>
              {story.genre} Story
            </h2>
            <p className='text-purple-100'>
              {story.characters} characters • {story.paragraphs.length}{' '}
              paragraphs
            </p>
          </div>
          <div className='flex gap-2'>
            <button
              onClick={() => setShowImagePrompts(!showImagePrompts)}
              className='px-3 py-2 bg-white/20 hover:bg-white/30 rounded-md transition-colors flex items-center gap-2'
              title={
                showImagePrompts ? 'Hide image prompts' : 'Show image prompts'
              }
            >
              {showImagePrompts ? (
                <EyeOff className='h-4 w-4' />
              ) : (
                <Eye className='h-4 w-4' />
              )}
              {showImagePrompts ? 'Hide Prompts' : 'Show Prompts'}
            </button>
            <button
              onClick={exportStory}
              className='px-3 py-2 bg-white/20 hover:bg-white/30 rounded-md transition-colors flex items-center gap-2'
              disabled={isLoading}
            >
              <Download className='h-4 w-4' />
              Export
            </button>
            <button
              onClick={onRegenerateStory}
              className='px-3 py-2 bg-white/20 hover:bg-white/30 rounded-md transition-colors flex items-center gap-2'
              disabled={isLoading}
            >
              <RefreshCw
                className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`}
              />
              Regenerate All
            </button>
          </div>
        </div>

        {/* Preface */}
        <div className='bg-white/10 rounded-lg p-4'>
          <h3 className='font-semibold mb-2 text-white'>Story Summary</h3>
          <p className='text-purple-50 leading-relaxed'>{story.preface}</p>
        </div>
      </div>

      {/* Story Content */}
      <div className='p-6'>
        <div className='space-y-8'>
          {story.paragraphs.map((paragraph, index) => (
            <div
              key={paragraph.id}
              className='border rounded-lg p-6 hover:shadow-md transition-shadow'
            >
              <div className='flex justify-between items-start mb-4'>
                <h4 className='text-lg font-semibold text-black'>
                  Paragraph {index + 1}
                </h4>
                <button
                  onClick={() => onRegenerateParagraph(paragraph.id)}
                  disabled={isLoading}
                  className='px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 disabled:bg-gray-50 rounded-md transition-colors flex items-center gap-2'
                >
                  {loadingParagraphId === paragraph.id ? (
                    <div className='animate-spin rounded-full h-3 w-3 border-2 border-gray-600 border-top-transparent' />
                  ) : (
                    <RefreshCw className='h-3 w-3' />
                  )}
                  Regenerate
                </button>
              </div>

              <div
                className={`grid gap-6 ${process.env.NEXT_PUBLIC_ENABLE_IMAGES === 'true' || showImagePrompts ? 'md:grid-cols-2' : 'grid-cols-1'}`}
              >
                {/* Text Content */}
                <div className='space-y-4'>
                  <p className='text-black leading-relaxed text-base font-medium'>
                    {paragraph.text}
                  </p>
                </div>

                {/* Image Section or Image Prompt Fallback */}
                {(process.env.NEXT_PUBLIC_ENABLE_IMAGES === 'true' ||
                  showImagePrompts) && (
                  <div className='space-y-3'>
                    {/* Show actual images if image generation is enabled */}
                    {process.env.NEXT_PUBLIC_ENABLE_IMAGES === 'true' &&
                    paragraph.imageUrl ? (
                      <div className='relative'>
                        <Image
                          src={paragraph.imageUrl}
                          alt={`Illustration for paragraph ${index + 1}`}
                          width={400}
                          height={300}
                          className={`rounded-lg object-cover cursor-pointer transition-transform hover:scale-105 ${
                            expandedImages.has(paragraph.id)
                              ? 'w-full h-auto'
                              : 'w-full h-48'
                          }`}
                          onClick={() => toggleImageExpanded(paragraph.id)}
                        />
                        <button
                          onClick={() => toggleImageExpanded(paragraph.id)}
                          className='absolute top-2 right-2 bg-black/50 text-white p-1 rounded-full hover:bg-black/70 transition-colors'
                        >
                          <ImageIcon className='h-4 w-4' />
                        </button>
                      </div>
                    ) : process.env.NEXT_PUBLIC_ENABLE_IMAGES === 'true' ? (
                      /* Loading state for image generation */
                      <div className='w-full h-48 bg-gray-100 rounded-lg flex items-center justify-center'>
                        <div className='text-center text-black'>
                          <ImageIcon className='h-8 w-8 mx-auto mb-2 animate-pulse' />
                          <p className='text-sm'>Generating image...</p>
                        </div>
                      </div>
                    ) : (
                      /* Image prompt fallback when images are disabled */
                      <div className='w-full bg-gradient-to-br from-purple-50 to-blue-50 rounded-lg p-4 border-2 border-dashed border-purple-200'>
                        <div className='text-center mb-3'>
                          <Palette className='h-8 w-8 mx-auto text-purple-500 mb-2' />
                          <h4 className='text-sm font-semibold text-purple-700'>
                            Image Visualization
                          </h4>
                        </div>
                        <div className='bg-white rounded-lg p-3 shadow-sm'>
                          <p className='text-sm text-black leading-relaxed italic font-medium'>
                            &ldquo;{paragraph.imagePrompt}&rdquo;
                          </p>
                        </div>
                        <p className='text-xs text-purple-600 mt-2 text-center'>
                          This describes what an AI would generate as an image
                          for this scene
                        </p>
                      </div>
                    )}

                    {/* Always show image prompt if toggle is enabled */}
                    {showImagePrompts && (
                      <div className='bg-gray-50 rounded-lg p-3 border-l-4 border-blue-400'>
                        <div className='flex items-start gap-2'>
                          <Palette className='h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0' />
                          <div>
                            <p className='text-xs font-medium text-blue-700 mb-1'>
                              Image Prompt:
                            </p>
                            <p className='text-xs text-black leading-relaxed font-medium'>
                              {paragraph.imagePrompt}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Continue Story Button */}
        <div className='mt-8 text-center'>
          <button
            onClick={onContinueStory}
            disabled={isLoading}
            className='px-6 py-3 bg-green-600 hover:bg-green-700 disabled:bg-green-300 text-white font-medium rounded-md transition-colors flex items-center gap-2 mx-auto'
          >
            <Plus className='h-4 w-4' />
            Continue Story
          </button>
        </div>
      </div>
    </div>
  );
}
