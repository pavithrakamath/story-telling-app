# 🛠️ Developer Guide

## Architecture Overview

This application uses a **Factory Pattern** to abstract AI providers, allowing seamless switching between different LLM and image generation services without changing application logic.

## Core Components

### 1. LLM Factory (`src/lib/llm-factory.ts`)

**Interface Definition**:

```typescript
export interface LLMProvider {
  generateText(prompt: string, options?: GenerationOptions): Promise<string>;
  checkHealth(): Promise<boolean>;
  listModels?(): Promise<string[]>;
}
```

**Current Providers**:

- **OllamaProvider**: Local inference via Ollama API
- **GeminiProvider**: Google's multimodal AI
- **DeepInfraProvider**: Cloud inference via DeepInfra

**Adding New LLM Providers**:

```typescript
class NewLLMProvider implements LLMProvider {
  private apiKey: string;
  private baseUrl: string;

  constructor(config: {
    model?: string;
    temperature?: number;
    maxTokens?: number;
  }) {
    this.apiKey = process.env.NEW_PROVIDER_API_KEY || '';
    this.baseUrl = 'https://api.newprovider.com';
  }

  async generateText(
    prompt: string,
    options?: GenerationOptions
  ): Promise<string> {
    const response = await fetch(`${this.baseUrl}/generate`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt,
        temperature: options?.temperature ?? 0.7,
        max_tokens: options?.maxTokens ?? 2000,
      }),
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    return data.text || '';
  }

  async checkHealth(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/health`);
      return response.ok;
    } catch {
      return false;
    }
  }
}

// Add to factory function
export function createLLMProvider(config: LLMConfig): LLMProvider {
  switch (config.provider) {
    case 'newprovider':
      return new NewLLMProvider(config);
    // ... existing cases
  }
}
```

### 2. Image Factory (`src/lib/image-factory.ts`)

**Interface Definition**:

```typescript
export interface ImageProvider {
  generateImage(prompt: string): Promise<string>;
  checkHealth(): Promise<boolean>;
}
```

**Current Providers**:

- **MockImageProvider**: SVG placeholders for development
- **GeminiImageProvider**: Real AI image generation via Gemini 2.0
- **ReplicateImageProvider**: Image generation via Replicate API

**Adding New Image Providers**:

```typescript
class NewImageProvider implements ImageProvider {
  private apiKey: string;

  constructor(config: { model?: string }) {
    this.apiKey = process.env.NEW_IMAGE_API_KEY || '';
  }

  async generateImage(prompt: string): Promise<string> {
    const response = await fetch('https://api.newimageprovider.com/generate', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ prompt }),
    });

    const data = await response.json();

    // Return base64 data URL
    return `data:${data.mimeType};base64,${data.imageData}`;
  }

  async checkHealth(): Promise<boolean> {
    return !!this.apiKey;
  }
}
```

### 3. Genre Configuration (`src/lib/genre-config.ts`)

Genre-specific parameters optimize story generation:

```typescript
export const genreConfigs = {
  fantasy: {
    temperature: 0.8, // Higher creativity for magical elements
    maxTokens: 2500, // Longer descriptions
    guidelines: 'Include magical elements, mythical creatures...',
  },
  mystery: {
    temperature: 0.6, // Lower for logical consistency
    maxTokens: 2200,
    guidelines: 'Build suspense with clues, red herrings...',
  },
  // ... other genres
};
```

## API Endpoints

### Story Generation (`/api/story/generate`)

**Request Flow**:

1. Validate request parameters
2. Get LLM provider from factory
3. Apply genre-specific configuration
4. Generate story with structured prompt
5. Parse and validate JSON response
6. Create enhanced image prompts
7. Return structured story response

**Error Handling**:

- JSON parsing failures → fallback text parsing
- Provider timeouts → graceful degradation
- Invalid parameters → clear error messages

### Image Generation (`/api/images/generate`)

**Request Flow**:

1. Get image provider from factory
2. Generate image from prompt
3. Return base64 data URL
4. Handle provider-specific errors

## Environment Configuration

### Provider Switching Logic

```typescript
// LLM Factory
const provider = process.env.LLM_PROVIDER as 'ollama' | 'gemini' | 'deepinfra';
return createLLMProvider({ provider, model, temperature, maxTokens });

// Image Factory
const imageProvider = process.env.IMAGE_PROVIDER as
  | 'mock'
  | 'gemini'
  | 'replicate';
return createImageProvider({ provider: imageProvider, model });
```

### Configuration Validation

- Check API keys on startup
- Validate provider names
- Fall back to mock providers for development

## Story Generation Pipeline

### 1. Prompt Engineering

```typescript
function createStoryPrompt(request: StoryRequest): string {
  const characterInfo = request.characterNames?.length
    ? `Named Characters: ${request.characterNames.join(', ')}`
    : `${request.characters} unique characters (give them names)`;

  return `You are a professional storyteller. Create a ${request.genre} story following these EXACT requirements:

STORY STRUCTURE:
- Genre: ${request.genre} - ${genreGuidelines[request.genre]}
- Characters: ${characterInfo}
- Length: EXACTLY ${request.paragraphs} paragraphs (no more, no less)
- Each paragraph: 4-5 sentences with rich descriptive detail

FORMATTING REQUIREMENTS:
You must return your response in this exact JSON format:
{
  "preface": "One sentence story summary",
  "paragraphs": [
    {
      "text": "Paragraph content...",
      "imagePrompt": "Detailed scene description for AI image generation"
    }
  ]
}

CRITICAL: Return ONLY valid JSON. No additional text before or after.`;
}
```

### 2. Response Processing

```typescript
// Try JSON parsing
try {
  const cleanResponse = rawResponse.trim();
  let jsonString = cleanResponse;

  // Extract JSON from response
  const jsonMatch = cleanResponse.match(/\\{[\\s\\S]*\\}/);
  if (jsonMatch) {
    jsonString = jsonMatch[0];
  }

  storyData = JSON.parse(jsonString);
} catch (error) {
  // Fallback text parsing
  const paragraphs = parseTextToParagraphs(rawResponse);
  storyData = { preface: 'Generated story', paragraphs };
}
```

### 3. Image Prompt Enhancement

```typescript
function enhanceImagePrompt(originalPrompt: string, genre: string): string {
  const styleMap = {
    fantasy: 'magical, ethereal, fantasy art style, detailed',
    mystery: 'noir, shadowy, mysterious atmosphere, dramatic lighting',
    'sci-fi': 'futuristic, cyberpunk, sci-fi concept art, neon colors',
    // ... other genres
  };

  const style = styleMap[genre] || 'detailed, artistic';
  return `${originalPrompt}, ${style}, high quality, 8k resolution`;
}
```

## Testing Strategy

### Unit Testing

```bash
# Test individual providers
npm run test:providers

# Test factory pattern
npm run test:factories

# Test API endpoints
npm run test:api
```

### Integration Testing

```bash
# Test full story generation flow
npm run test:integration

# Test provider switching
npm run test:providers:switch
```

### Performance Testing

```bash
# Measure response times
npm run test:performance

# Load testing
npm run test:load
```

## Development Workflow

### 1. Local Development Setup

```bash
# Use Ollama for fast local testing
LLM_PROVIDER=ollama
IMAGE_PROVIDER=mock

# Install and run Ollama
curl -fsSL https://ollama.com/install.sh | sh
ollama pull gemma:2b
ollama serve
```

### 2. Production Setup

```bash
# Use Gemini for best performance
LLM_PROVIDER=gemini
IMAGE_PROVIDER=gemini
GEMINI_API_KEY=your_key_here
```

### 3. Adding Features

#### New Genre

```typescript
// 1. Update genre config
export const genreConfigs = {
  // ... existing genres
  steampunk: {
    temperature: 0.75,
    maxTokens: 2400,
    guidelines: 'Victorian-era technology with steam-powered machinery...',
  },
};

// 2. Update type definitions
export type Genre =
  | 'fantasy'
  | 'mystery'
  | 'sci-fi'
  | 'romance'
  | 'horror'
  | 'adventure'
  | 'steampunk';

// 3. Update form options
const genres = [
  'fantasy',
  'mystery',
  'sci-fi',
  'romance',
  'horror',
  'adventure',
  'steampunk',
];
```

#### New Story Feature

```typescript
// 1. Add to request type
interface StoryRequest {
  // ... existing fields
  setting?: string; // New optional field
}

// 2. Update prompt generation
function createStoryPrompt(request: StoryRequest): string {
  const settingInfo = request.setting ? `Setting: ${request.setting}` : '';
  // ... include in prompt
}

// 3. Update form component
// Add setting input field
```

## Performance Optimization

### Response Time Targets

- **Story Generation**: < 15 seconds
- **Image Generation**: < 10 seconds
- **Total User Flow**: < 25 seconds

### Optimization Techniques

1. **Provider Selection**: Use fastest provider for production
2. **Caching**: Cache generated content for repeated requests
3. **Streaming**: Implement streaming responses for long generations
4. **Image Optimization**: Compress images for web delivery
5. **CDN**: Serve static assets via CDN

### Monitoring

```typescript
// Add performance logging
console.time('story-generation');
const story = await generateStory(request);
console.timeEnd('story-generation');

// Track provider performance
const startTime = Date.now();
const result = await provider.generateText(prompt);
const duration = Date.now() - startTime;
```

## Error Handling

### Provider Failures

```typescript
async function generateWithFallback(prompt: string) {
  const providers = ['gemini', 'deepinfra', 'ollama'];

  for (const providerName of providers) {
    try {
      const provider = createLLMProvider({ provider: providerName });
      return await provider.generateText(prompt);
    } catch (error) {
      console.warn(`Provider ${providerName} failed:`, error);
      continue;
    }
  }

  throw new Error('All providers failed');
}
```

### API Errors

```typescript
export class StoryGenerationError extends Error {
  constructor(
    message: string,
    public provider: string,
    public statusCode?: number
  ) {
    super(message);
    this.name = 'StoryGenerationError';
  }
}
```

## Security Considerations

### API Key Management

- Store API keys in environment variables only
- Never commit keys to version control
- Use different keys for development/production
- Rotate keys regularly

### Input Validation

```typescript
function validateStoryRequest(request: any): StoryRequest {
  if (!request.genre || !isValidGenre(request.genre)) {
    throw new Error('Invalid genre');
  }

  if (!request.characters || request.characters < 1 || request.characters > 6) {
    throw new Error('Characters must be between 1 and 6');
  }

  // ... other validations
  return request as StoryRequest;
}
```

### Rate Limiting

```typescript
// Implement rate limiting per IP
import rateLimit from 'next-rate-limit';

const limiter = rateLimit({
  interval: 60 * 1000, // 1 minute
  uniqueTokenPerInterval: 500,
});

export default async function handler(req: NextRequest) {
  await limiter.check(req, 10, 'CACHE_TOKEN'); // 10 requests per minute
  // ... handle request
}
```

## Deployment

### Environment Variables

```bash
# Production
LLM_PROVIDER=gemini
IMAGE_PROVIDER=gemini
GEMINI_API_KEY=production_key_here
NEXT_PUBLIC_ENABLE_IMAGES=true

# Staging
LLM_PROVIDER=ollama
IMAGE_PROVIDER=mock
OLLAMA_BASE_URL=http://staging-ollama:11434
```

### Docker Deployment

```dockerfile
# Dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

### Health Checks

```typescript
// /api/health
export async function GET() {
  const llmProvider = getDefaultLLMProvider();
  const imageProvider = getDefaultImageProvider();

  const [llmHealth, imageHealth] = await Promise.all([
    llmProvider.checkHealth(),
    imageProvider.checkHealth(),
  ]);

  return Response.json({
    status: llmHealth && imageHealth ? 'healthy' : 'degraded',
    providers: { llm: llmHealth, image: imageHealth },
    timestamp: new Date().toISOString(),
  });
}
```

## Contributing Guidelines

### Code Style

- Use TypeScript for all new code
- Follow existing naming conventions
- Add JSDoc comments for public APIs
- Use meaningful variable names

### Pull Request Process

1. Fork the repository
2. Create feature branch from `main`
3. Implement changes with tests
4. Update documentation
5. Submit PR with clear description

### Testing Requirements

- Add unit tests for new providers
- Test with multiple AI providers
- Verify error handling scenarios
- Check performance impact

This guide provides the technical foundation for extending and maintaining the AI-powered storytelling platform. Follow these patterns to ensure consistency and reliability across all features.
