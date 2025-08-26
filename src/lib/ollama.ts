export const OLLAMA_CONFIG = {
  baseURL: 'http://localhost:11434',
  textModel: 'llama3.2', // Default model, can be changed based on what you have pulled
  temperature: 0.7,
  maxTokens: 2000,
};

export interface OllamaResponse {
  model: string;
  created_at: string;
  response: string;
  done: boolean;
}

export async function callOllamaText(
  prompt: string,
  model?: string
): Promise<string> {
  const modelName = model || OLLAMA_CONFIG.textModel;

  const response = await fetch(`${OLLAMA_CONFIG.baseURL}/api/generate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: modelName,
      prompt: prompt,
      stream: false,
      options: {
        temperature: OLLAMA_CONFIG.temperature,
        num_predict: OLLAMA_CONFIG.maxTokens,
      },
    }),
  });

  if (!response.ok) {
    throw new Error(
      `Ollama API error: ${response.status} ${response.statusText}`
    );
  }

  const data: OllamaResponse = await response.json();
  return data.response || '';
}

export async function checkOllamaHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${OLLAMA_CONFIG.baseURL}/api/tags`);
    return response.ok;
  } catch {
    return false;
  }
}

export async function listOllamaModels(): Promise<string[]> {
  try {
    const response = await fetch(`${OLLAMA_CONFIG.baseURL}/api/tags`);
    if (!response.ok) return [];

    const data = await response.json();
    return data.models?.map((model: { name: string }) => model.name) || [];
  } catch {
    return [];
  }
}
