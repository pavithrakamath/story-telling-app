export const DEEPINFRA_CONFIG = {
  baseURL: 'https://api.deepinfra.com/v1/inference',
  textModel: 'meta-llama/Llama-3.1-70B-Instruct',
  imageModel: 'stabilityai/stable-diffusion-xl-base-1.0',
  maxTokens: 2000,
  temperature: 0.7,
};

export interface DeepInfraResponse {
  results: Array<{
    generated_text: string;
  }>;
}

export interface DeepInfraImageResponse {
  images: string[];
}

export async function callDeepInfraText(
  prompt: string,
  apiKey: string
): Promise<string> {
  const response = await fetch(
    `${DEEPINFRA_CONFIG.baseURL}/${DEEPINFRA_CONFIG.textModel}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        input: prompt,
        max_tokens: DEEPINFRA_CONFIG.maxTokens,
        temperature: DEEPINFRA_CONFIG.temperature,
        stop: ['</s>'],
      }),
    }
  );

  if (!response.ok) {
    throw new Error(
      `DeepInfra API error: ${response.status} ${response.statusText}`
    );
  }

  const data: DeepInfraResponse = await response.json();
  return data.results[0]?.generated_text || '';
}

export async function callDeepInfraImage(
  prompt: string,
  apiKey: string
): Promise<string> {
  const response = await fetch(
    `${DEEPINFRA_CONFIG.baseURL}/${DEEPINFRA_CONFIG.imageModel}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        prompt: prompt,
        width: 512,
        height: 512,
        num_inference_steps: 25,
        guidance_scale: 7.5,
      }),
    }
  );

  if (!response.ok) {
    throw new Error(
      `DeepInfra Image API error: ${response.status} ${response.statusText}`
    );
  }

  const data: DeepInfraImageResponse = await response.json();
  return data.images[0] || '';
}
