/**
 * Shared Gemini Client Utility
 * Provides direct access to Gemini API without needing a proxy endpoint
 */

import { GoogleGenerativeAI } from '@google/generative-ai';

let genAI: GoogleGenerativeAI | null = null;

function getGenAI(): GoogleGenerativeAI {
  if (!genAI) {
    const apiKey = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY not found in environment');
    }
    genAI = new GoogleGenerativeAI(apiKey);
  }
  return genAI;
}

export interface GeminiGenerationConfig {
  temperature?: number;
  topK?: number;
  topP?: number;
  maxOutputTokens?: number;
  responseMimeType?: string;
}

export interface GeminiResponse {
  text: string;
  usageMetadata?: {
    promptTokenCount: number;
    candidatesTokenCount: number;
    totalTokenCount: number;
  };
}

/**
 * Call Gemini API with a text prompt
 * @param model Model name (e.g., 'gemini-2.5-flash-lite')
 * @param prompt The text prompt
 * @param generationConfig Optional generation config
 * @returns Response text and usage metadata
 */
export async function callGemini(
  model: string,
  prompt: string,
  generationConfig?: GeminiGenerationConfig,
  maxRetries: number = 3
): Promise<GeminiResponse> {
  const ai = getGenAI();

  const genModel = ai.getGenerativeModel({
    model,
    generationConfig: generationConfig as any,
  });

  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const result = await genModel.generateContent([{ text: prompt }]);
      const response = result.response;
      const text = response.text();

      return {
        text,
        usageMetadata: (response as any).usageMetadata,
      };
    } catch (error: any) {
      lastError = error;

      // Check if it's a rate limit error
      const isRateLimit = error.message?.includes('429') ||
                         error.message?.includes('rate limit') ||
                         error.message?.includes('quota');

      if (isRateLimit && attempt < maxRetries - 1) {
        // Exponential backoff: 1s, 2s, 4s
        const delayMs = Math.min(1000 * Math.pow(2, attempt), 4000);
        console.log(
          `⏳ Rate limited, retrying in ${delayMs}ms (attempt ${attempt + 1}/${maxRetries})`
        );
        await new Promise(resolve => setTimeout(resolve, delayMs));
        continue;
      }

      // Not a rate limit or last attempt, throw the error
      throw error;
    }
  }

  throw lastError || new Error('Gemini API call failed after retries');
}
