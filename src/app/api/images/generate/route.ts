import { NextRequest, NextResponse } from 'next/server';
import { getDefaultImageProvider } from '@/lib/image-factory';

interface ImageGenerationRequest {
  prompt: string;
  paragraphId: number;
}

export async function POST(request: NextRequest) {
  try {
    const { prompt, paragraphId }: ImageGenerationRequest =
      await request.json();

    if (!prompt || !paragraphId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Generate image using image provider factory
    const imageProvider = getDefaultImageProvider();
    const imageUrl = await imageProvider.generateImage(prompt);

    return NextResponse.json({
      imageUrl,
      paragraphId,
    });
  } catch (error) {
    console.error('Image generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate image' },
      { status: 500 }
    );
  }
}
