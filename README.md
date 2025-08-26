# 🎭 AI-Powered Interactive Storytelling Platform

A sophisticated Next.js application that generates personalized stories with AI-generated images using multiple AI providers including Ollama, Gemini, DeepInfra, and Replicate.

## ✨ Features

### Story Generation

- **Multiple Genres**: Fantasy, Mystery, Sci-Fi, Romance, Horror, Adventure
- **Character Customization**: 1-6 characters with optional naming
- **Flexible Length**: 3-10 paragraphs with rich descriptions
- **Genre-Specific Parameters**: Optimized temperature and token settings per genre

### AI Integration

- **Multi-Provider Support**: Seamlessly switch between AI providers
- **Text Generation**: Ollama (local), Gemini, DeepInfra
- **Image Generation**: Gemini 2.0 Flash, Replicate, Mock (development)
- **Factory Pattern**: Easy provider switching via environment variables

### Interactive Features

- **Story Modification**: Regenerate individual paragraphs
- **Story Continuation**: Add more paragraphs to existing stories
- **Export Functionality**: Download stories as text files
- **Image Controls**: Toggle image prompt visibility
- **Real-time Generation**: Live story and image creation

## 🚀 Tech Stack

### Frontend

- **Next.js 15** with App Router
- **React 18** with TypeScript
- **Tailwind CSS** for styling
- **Lucide React** icons

### Backend

- **Next.js API Routes**
- **Factory Pattern** for AI provider abstraction
- **TypeScript** for type safety

### AI Providers

- **Ollama** - Local LLM inference
- **Google Gemini** - Cloud-based text and image generation
- **DeepInfra** - Cloud LLM API
- **Replicate** - Image generation API
- **Mock Provider** - Development and testing

## 📋 Prerequisites

- **Node.js 18+** installed
- At least one AI provider configured:
  - **Ollama** (recommended for local development)
  - **Google Gemini API Key** (best performance)
  - **DeepInfra API Key** (cloud alternative)
  - **Replicate API Key** (image generation)

## 🛠️ Installation

### 1. Clone and Install

```bash
git clone <repository-url>
cd story-telling-app
npm install
```

### 2. Environment Configuration

Create `.env.local` with your preferred AI provider:

```bash
# LLM Provider Configuration
LLM_PROVIDER=gemini  # Options: ollama, deepinfra, gemini
LLM_MODEL=gemini-1.5-pro
LLM_TEMPERATURE=0.7
LLM_MAX_TOKENS=2000

# Ollama Configuration (if using Ollama)
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=gemma:2b

# DeepInfra Configuration (if using DeepInfra)
# DEEPINFRA_API_KEY=your_deepinfra_api_key_here

# Gemini Configuration
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_TEXT_MODEL=gemini-1.5-pro
GEMINI_IMAGE_MODEL=gemini-2.0-flash-preview-image-generation

# Frontend Configuration
NEXT_PUBLIC_ENABLE_IMAGES=true

# Image Generation Configuration
IMAGE_PROVIDER=gemini  # Options: mock, replicate, gemini
IMAGE_MODEL=gemini-2.0-flash-preview-image-generation
```

### 3. Provider Setup

#### Option A: Ollama (Local - Recommended for Development)

```bash
# Install Ollama
curl -fsSL https://ollama.com/install.sh | sh

# Pull a model
ollama pull gemma:2b
# or
ollama pull llama3.2

# Run Ollama
ollama serve
```

#### Option B: Google Gemini (Recommended for Production)

1. Get API key from [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Set `GEMINI_API_KEY` in `.env.local`

#### Option C: DeepInfra (Alternative Cloud)

1. Sign up at [deepinfra.com](https://deepinfra.com)
2. Set `DEEPINFRA_API_KEY` in `.env.local`

### 4. Run the Application

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000)

## 🎯 Usage Guide

### Creating Stories

1. **Select Genre**: Choose from 6 different story genres
2. **Configure Characters**: Set number (1-6) and optionally name them
3. **Set Length**: Choose 3-10 paragraphs
4. **Generate**: Click "Generate Story" and wait for AI processing

### Story Interactions

- **Regenerate Paragraph**: Click regenerate button on any paragraph
- **Continue Story**: Add more paragraphs to extend the narrative
- **View Image Prompts**: Toggle to see AI image generation prompts
- **Export Story**: Download as text file

## 🏗️ Architecture

### Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── images/generate/     # Image generation endpoint
│   │   └── story/
│   │       ├── generate/        # Story generation
│   │       ├── regenerate-paragraph/
│   │       └── continue/        # Story continuation
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── StoryForm.tsx           # Story creation form
│   └── StoryDisplay.tsx        # Story display with controls
├── lib/
│   ├── llm-factory.ts          # LLM provider factory
│   ├── image-factory.ts        # Image provider factory
│   └── genre-config.ts         # Genre-specific settings
└── types/
    └── index.ts               # TypeScript definitions
```

### Factory Pattern Implementation

#### LLM Factory (`src/lib/llm-factory.ts`)

- Unified interface for text generation
- Supports Ollama, Gemini, DeepInfra
- Environment-based provider switching
- Genre-specific parameter optimization

#### Image Factory (`src/lib/image-factory.ts`)

- Unified interface for image generation
- Supports Gemini, Replicate, Mock providers
- Base64 image encoding
- Error handling and fallbacks

## 🔧 API Endpoints

| Endpoint                          | Method | Description                   |
| --------------------------------- | ------ | ----------------------------- |
| `/api/story/generate`             | POST   | Generate new story            |
| `/api/story/regenerate-paragraph` | POST   | Regenerate specific paragraph |
| `/api/story/continue`             | POST   | Add paragraphs to story       |
| `/api/images/generate`            | POST   | Generate paragraph images     |

### Request/Response Examples

#### Story Generation Request

```json
{
  "genre": "fantasy",
  "characters": 2,
  "paragraphs": 3,
  "characterNames": ["Lyra", "Theron"]
}
```

#### Story Generation Response

```json
{
  "storyId": "uuid-here",
  "preface": "Story summary",
  "paragraphs": [
    {
      "id": 1,
      "text": "Story paragraph...",
      "imagePrompt": "Detailed scene description..."
    }
  ]
}
```

## 🎨 Genre Configuration

Each genre has optimized parameters:

| Genre     | Temperature | Max Tokens | Style Guidelines                     |
| --------- | ----------- | ---------- | ------------------------------------ |
| Fantasy   | 0.8         | 2500       | Magical elements, mythical creatures |
| Mystery   | 0.6         | 2200       | Suspense, clues, revelations         |
| Sci-Fi    | 0.7         | 2400       | Future tech, space, science          |
| Romance   | 0.7         | 2200       | Relationships, emotions              |
| Horror    | 0.8         | 2300       | Atmosphere of dread                  |
| Adventure | 0.7         | 2400       | Exciting journeys, challenges        |

## 🔀 Provider Switching

Change providers by updating `.env.local`:

```bash
# Use Ollama for text, Mock for images
LLM_PROVIDER=ollama
IMAGE_PROVIDER=mock

# Use Gemini for both text and images
LLM_PROVIDER=gemini
IMAGE_PROVIDER=gemini

# Use DeepInfra for text, Replicate for images
LLM_PROVIDER=deepinfra
IMAGE_PROVIDER=replicate
```

## 🚨 Environment Variables

### Required (choose one LLM provider)

- `GEMINI_API_KEY` - Google Gemini API key
- `DEEPINFRA_API_KEY` - DeepInfra API key
- `OLLAMA_BASE_URL` - Ollama server URL (default: http://localhost:11434)

### Optional

- `REPLICATE_API_TOKEN` - Replicate API key for image generation
- `LLM_TEMPERATURE` - Override default temperature
- `LLM_MAX_TOKENS` - Override max tokens
- `IMAGE_MODEL` - Specific image model to use

### Configuration

- `LLM_PROVIDER` - Text provider (ollama/gemini/deepinfra)
- `IMAGE_PROVIDER` - Image provider (mock/gemini/replicate)
- `NEXT_PUBLIC_ENABLE_IMAGES` - Enable/disable images in UI

## 🧪 Development Guide

### Adding New Providers

#### 1. LLM Provider

```typescript
// In src/lib/llm-factory.ts
class NewLLMProvider implements LLMProvider {
  async generateText(
    prompt: string,
    options?: GenerationOptions
  ): Promise<string> {
    // Implementation
  }

  async checkHealth(): Promise<boolean> {
    // Health check
  }
}

// Add to factory
switch (provider) {
  case 'newProvider':
    return new NewLLMProvider(config);
}
```

#### 2. Image Provider

```typescript
// In src/lib/image-factory.ts
class NewImageProvider implements ImageProvider {
  async generateImage(prompt: string): Promise<string> {
    // Return base64 data URL
  }

  async checkHealth(): Promise<boolean> {
    // Health check
  }
}
```

### Testing

```bash
# Run development server
npm run dev

# Build for production
npm run build

# Type checking
npm run type-check

# Linting
npm run lint
```

### Performance Optimization

#### Response Times (approximate)

- **Ollama (local)**: 15-25 seconds
- **Gemini Text**: 9-12 seconds
- **Gemini Images**: 5-8 seconds
- **DeepInfra**: 8-15 seconds
- **Mock Images**: <1 second

#### Optimization Tips

1. Use local Ollama for development
2. Use Gemini for production (fastest)
3. Implement caching for repeated requests
4. Optimize image sizes for web delivery
5. Consider story length vs generation time trade-offs

## 🐛 Troubleshooting

### Common Issues

1. **Ollama Connection Failed**

   ```bash
   # Check if Ollama is running
   curl http://localhost:11434/api/tags

   # Start Ollama
   ollama serve
   ```

2. **API Key Invalid**
   - Verify API key in `.env.local`
   - Check provider documentation for key format
   - Ensure key has necessary permissions

3. **Image Generation Fails**
   - Check `IMAGE_PROVIDER` setting
   - Verify API key for image provider
   - Try switching to `mock` provider for testing

4. **Story Quality Issues**
   - Adjust temperature in genre config
   - Try different models
   - Check prompt engineering in API routes

### Debug Mode

Add debug logging:

```bash
NODE_ENV=development npm run dev
```

## 🤝 Contributing

1. **Fork** the repository
2. **Create** feature branch (`git checkout -b feature/amazing-feature`)
3. **Follow** the existing code patterns
4. **Test** with multiple providers
5. **Update** documentation if needed
6. **Submit** pull request

### Code Style

- Use TypeScript for type safety
- Follow Next.js best practices
- Maintain factory pattern consistency
- Add error handling for new providers
- Update types when adding features

## 🔒 Pre-commit Hooks

This project uses comprehensive pre-commit hooks to maintain code quality:

### Automated Checks

- **ESLint**: Code linting and auto-fixing
- **Prettier**: Code formatting
- **Gitleaks**: Secret detection (API keys, passwords)
- **Commitlint**: Conventional commit message validation
- **TODO Detection**: Warns about unresolved TODO/FIXME comments
- **Console.log Detection**: Warns about debug statements

### Installation

Pre-commit hooks are automatically installed when you run:

```bash
npm install
```

### Manual Hook Installation

If hooks aren't working, reinstall them:

```bash
npx husky init
```

### Gitleaks Setup

Install gitleaks for secret detection:

```bash
# macOS
brew install gitleaks

# Linux
# See: https://github.com/gitleaks/gitleaks#installation
```

### Commit Message Format

Use conventional commit format:

```bash
feat: add new story generation feature
fix: resolve image loading issue
docs: update API documentation
style: format code with prettier
refactor: improve factory pattern implementation
test: add unit tests for providers
chore: update dependencies
```

### Pre-commit Hook Bypass

In emergencies, you can bypass hooks (not recommended):

```bash
git commit --no-verify -m "emergency fix"
```

## 📄 License

MIT License - see LICENSE file for details.

## 🙏 Acknowledgments

- **AI Providers**: Google Gemini, Ollama, DeepInfra, Replicate
- **Framework**: Next.js team for excellent React framework
- **Styling**: Tailwind CSS for utility-first CSS
- **Icons**: Lucide for beautiful icons
- **Community**: Open source contributors and AI community

## 🔗 Links

- [Google Gemini API](https://ai.google.dev/gemini-api/docs)
- [Ollama](https://ollama.com)
- [DeepInfra](https://deepinfra.com)
- [Replicate](https://replicate.com)
- [Next.js Documentation](https://nextjs.org/docs)
