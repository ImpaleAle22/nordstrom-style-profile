/**
 * Station 2.6: Embedding Similarity Filter
 * Uses CLIP embeddings to detect clashing items
 *
 * Philosophy:
 * - Items with very low similarity likely clash (evening gown vs sneakers)
 * - Items with moderate-high similarity go together (variations on a theme)
 * - No training needed - uses embeddings from CLIP search
 *
 * Kitchen pipeline:
 * [Station 2.5: Formality Check]
 *     ↓
 * [Station 2.6: Similarity Check] ← YOU ARE HERE
 *     Remove outfits with clashing items (too dissimilar)
 *     ↓
 * [Station 3: Hard Rules Validation]
 */

import type { ClipProduct, OutfitCombination } from './types';

/**
 * Compute cosine similarity between two vectors
 * Returns value between -1 (opposite) and 1 (identical)
 */
function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error('Vectors must have same length');
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  normA = Math.sqrt(normA);
  normB = Math.sqrt(normB);

  if (normA === 0 || normB === 0) {
    return 0;
  }

  return dotProduct / (normA * normB);
}

/**
 * Check if an outfit has items that are too dissimilar (likely clashing)
 *
 * Note: CLIP embeddings might not be available on all products yet.
 * For now, we'll skip checking if embeddings are missing.
 * Future: Store embeddings from CLIP search results.
 */
export function checkOutfitSimilarity(
  outfit: OutfitCombination,
  minSimilarity: number = 0.05
): {
  isValid: boolean;
  reason?: string;
  similarities?: Array<{ item1: string; item2: string; similarity: number }>;
} {
  const items = outfit.items;

  // TODO: Get embeddings from products
  // For now, products might not have embeddings stored
  // We'll need to add this when we integrate with CLIP search

  // Check if we have embeddings (stored in product.embedding from CLIP API)
  const hasEmbeddings = items.every(item => {
    const product = item.product as any;
    return product.embedding && Array.isArray(product.embedding) && product.embedding.length > 0;
  });

  if (!hasEmbeddings) {
    // Can't check similarity without embeddings - let it pass for now
    return { isValid: true };
  }

  const similarities: Array<{ item1: string; item2: string; similarity: number }> = [];

  // Check pairwise similarity between all items
  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) {
      const item1 = items[i];
      const item2 = items[j];

      const product1 = item1.product as any;
      const product2 = item2.product as any;

      const embedding1 = product1.embedding;
      const embedding2 = product2.embedding;

      if (!embedding1 || !embedding2) {
        continue; // Skip if embeddings missing
      }

      const similarity = cosineSimilarity(embedding1, embedding2);
      similarities.push({
        item1: `${item1.role} (${item1.product.title.substring(0, 30)}...)`,
        item2: `${item2.role} (${item2.product.title.substring(0, 30)}...)`,
        similarity: similarity,
      });

      // If any pair is too dissimilar, flag the outfit
      if (similarity < minSimilarity) {
        return {
          isValid: false,
          reason: `Items too dissimilar: ${item1.role} + ${item2.role} (similarity: ${similarity.toFixed(3)})`,
          similarities,
        };
      }
    }
  }

  return { isValid: true, similarities };
}

/**
 * Filter outfit combinations to remove clashing items
 * Station 2.6 in the cooking pipeline
 */
export function filterSimilarityClashes(
  combinations: OutfitCombination[],
  minSimilarity: number = 0.05
): { passed: OutfitCombination[]; filtered: number; examples: string[] } {
  const passed: OutfitCombination[] = [];
  const examples: string[] = [];
  let filtered = 0;

  for (const outfit of combinations) {
    const check = checkOutfitSimilarity(outfit, minSimilarity);

    if (check.isValid) {
      passed.push(outfit);
    } else {
      filtered++;
      // Collect first 3 examples for logging
      if (examples.length < 3 && check.reason) {
        examples.push(check.reason);
      }
    }
  }

  return { passed, filtered, examples };
}

/**
 * Analyze similarity distribution in a batch of outfits
 * Useful for tuning the minSimilarity threshold
 */
export function analyzeSimilarityDistribution(
  combinations: OutfitCombination[]
): {
  avgSimilarity: number;
  minSimilarity: number;
  maxSimilarity: number;
  distribution: { below0: number; below05: number; below10: number; above10: number };
} {
  const allSimilarities: number[] = [];

  for (const outfit of combinations) {
    const items = outfit.items;

    // Check if we have embeddings
    const hasEmbeddings = items.every(item => {
      const product = item.product as any;
      return product.embedding && Array.isArray(product.embedding) && product.embedding.length > 0;
    });

    if (!hasEmbeddings) continue;

    // Get all pairwise similarities
    for (let i = 0; i < items.length; i++) {
      for (let j = i + 1; j < items.length; j++) {
        const product1 = items[i].product as any;
        const product2 = items[j].product as any;

        const embedding1 = product1.embedding;
        const embedding2 = product2.embedding;

        if (embedding1 && embedding2) {
          const similarity = cosineSimilarity(embedding1, embedding2);
          allSimilarities.push(similarity);
        }
      }
    }
  }

  if (allSimilarities.length === 0) {
    return {
      avgSimilarity: 0,
      minSimilarity: 0,
      maxSimilarity: 0,
      distribution: { below0: 0, below05: 0, below10: 0, above10: 0 },
    };
  }

  const avg = allSimilarities.reduce((sum, s) => sum + s, 0) / allSimilarities.length;
  const min = Math.min(...allSimilarities);
  const max = Math.max(...allSimilarities);

  const distribution = {
    below0: allSimilarities.filter(s => s < 0).length,
    below05: allSimilarities.filter(s => s >= 0 && s < 0.05).length,
    below10: allSimilarities.filter(s => s >= 0.05 && s < 0.10).length,
    above10: allSimilarities.filter(s => s >= 0.10).length,
  };

  return { avgSimilarity: avg, minSimilarity: min, maxSimilarity: max, distribution };
}
