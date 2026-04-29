/**
 * Strategy Registry
 * Manages available combination generation strategies
 */

import type { CombinationStrategy } from '../types';
import { RandomSamplingStrategy } from './random-sampling';
import { GeminiFlashLiteStrategy } from './gemini-flash-lite';

export const strategies: Record<string, () => CombinationStrategy> = {
  'random-sampling': () => new RandomSamplingStrategy(),
  'gemini-flash-lite': () => new GeminiFlashLiteStrategy(),
  // Future strategies:
  // 'gemini-flash': () => new GeminiFlashStrategy(),
  // 'claude-sonnet': () => new ClaudeSonnetStrategy(),
};

export function getStrategy(name: string): CombinationStrategy {
  const strategyFactory = strategies[name];
  if (!strategyFactory) {
    throw new Error(`Unknown strategy: ${name}. Available: ${Object.keys(strategies).join(', ')}`);
  }
  return strategyFactory();
}

export { RandomSamplingStrategy, GeminiFlashLiteStrategy };
