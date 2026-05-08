/**
 * CLIP API Client
 *
 * Client library for interacting with the FashionSigLIP CLIP API
 * Supports unified embedding space for products, lifestyle images, and style concepts
 */

const CLIP_API_URL = process.env.NEXT_PUBLIC_CLIP_API_URL || 'https://briancassidy-style-clip-search.hf.space';

export interface Embedding {
  embedding: number[];
  dimensions: number;
  processingTime: number;
}

export interface StyleConcepts {
  pillars: Record<string, number[]>;
  sub_terms?: Record<string, Record<string, number[]>>;
  vibes?: Record<string, number[]>;
  occasions?: Record<string, number[]>;
  metadata: {
    totalConcepts: number;
    processingTime: number;
    cached: boolean;
  };
}

export interface ConceptMatch {
  name: string;
  score: number;
}

export interface SemanticSearchResult {
  products: Array<{
    productId: string;
    title: string;
    brand: string;
    price: number;
    imageUrl: string;
    productType1: string;
    productType2: string;
    department: string;
    simplifiedColors: string[];
    score: number;
  }>;
  concepts?: {
    pillars?: ConceptMatch[];
    vibes?: ConceptMatch[];
    occasions?: ConceptMatch[];
  };
  metadata: {
    queryType: 'text' | 'image';
    processingTime: number;
  };
}

/**
 * Generate CLIP embedding for an image URL
 */
export async function embedImage(imageUrl: string, timeoutMs = 30000): Promise<Embedding> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${CLIP_API_URL}/embed-image`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imageUrl }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: `HTTP ${response.status}` }));
      throw new Error(`Failed to embed image: ${error.error}`);
    }

    return response.json();
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(`Request timeout after ${timeoutMs}ms - CLIP API might be cold-starting`);
    }
    throw error;
  }
}

/**
 * Generate CLIP embedding for text query
 */
export async function embedText(text: string): Promise<Embedding> {
  const response = await fetch(`${CLIP_API_URL}/embed-text`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Failed to embed text: ${error.error}`);
  }

  return response.json();
}

/**
 * Pre-compute embeddings for style concepts
 * Results are cached on the server after first call
 */
export async function embedConcepts(options?: {
  categories?: ('pillars' | 'sub_terms' | 'vibes' | 'occasions')[];
  useCache?: boolean;
}): Promise<StyleConcepts> {
  const response = await fetch(`${CLIP_API_URL}/embed-concepts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      categories: options?.categories || ['pillars', 'vibes', 'occasions'],
      useCache: options?.useCache ?? true
    })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Failed to embed concepts: ${error.error}`);
  }

  return response.json();
}

/**
 * Semantic search across products and style concepts
 */
export async function semanticSearch(options: {
  query?: string;
  imageUrl?: string;
  searchProducts?: boolean;
  searchConcepts?: boolean;
  conceptCategories?: ('pillars' | 'vibes' | 'occasions')[];
  limit?: number;
  filters?: {
    productType1?: string;
    productType2?: string;
    gender?: string[];
    department?: string[];
    colors?: string[];
  };
}): Promise<SemanticSearchResult> {
  if (!options.query && !options.imageUrl) {
    throw new Error('Either query or imageUrl must be provided');
  }

  const response = await fetch(`${CLIP_API_URL}/semantic-search`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query: options.query,
      imageUrl: options.imageUrl,
      searchProducts: options.searchProducts ?? true,
      searchConcepts: options.searchConcepts ?? false,
      conceptCategories: options.conceptCategories || ['pillars', 'vibes'],
      limit: options.limit || 20,
      filters: options.filters || {}
    })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Semantic search failed: ${error.error}`);
  }

  return response.json();
}

/**
 * Compute cosine similarity between two embeddings
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error('Embeddings must have same dimensions');
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
 * Average multiple embeddings to create a composite vector
 * Useful for building style profiles from multiple images
 */
export function averageEmbeddings(embeddings: number[][]): number[] {
  if (embeddings.length === 0) {
    throw new Error('Cannot average empty array of embeddings');
  }

  const dimensions = embeddings[0].length;
  const sum = new Array(dimensions).fill(0);

  for (const embedding of embeddings) {
    if (embedding.length !== dimensions) {
      throw new Error('All embeddings must have same dimensions');
    }
    for (let i = 0; i < dimensions; i++) {
      sum[i] += embedding[i];
    }
  }

  // Average and normalize
  const avg = sum.map(val => val / embeddings.length);

  // L2 normalize
  const norm = Math.sqrt(avg.reduce((sum, val) => sum + val * val, 0));
  return avg.map(val => val / norm);
}

/**
 * Validate a style pillar assignment using CLIP
 *
 * @param imageUrl - URL of lifestyle image
 * @param assignedPillar - Pillar assigned by Gemini (e.g., "romantic")
 * @param styleConcepts - Pre-computed style concept embeddings
 * @returns Confidence score (0-1) and validation result
 */
export async function validatePillar(
  imageUrl: string,
  assignedPillar: string,
  styleConcepts: StyleConcepts
): Promise<{
  similarity: number;
  confidence: 'high' | 'medium' | 'low';
  topPillars: ConceptMatch[];
}> {
  // Embed the image
  const { embedding: imageEmb } = await embedImage(imageUrl);

  // Get all pillar similarities
  const pillarScores: ConceptMatch[] = [];

  for (const [name, embArray] of Object.entries(styleConcepts.pillars)) {
    const similarity = cosineSimilarity(imageEmb, embArray);
    pillarScores.push({ name, score: similarity });
  }

  // Sort by score
  pillarScores.sort((a, b) => b.score - a.score);

  // Find assigned pillar's score
  const assignedPillarKey = `${assignedPillar} fashion style outfit`;
  const assignedScore = pillarScores.find(p => p.name === assignedPillarKey)?.score || 0;

  // Determine confidence
  const confidence = assignedScore > 0.6 ? 'high'
                   : assignedScore > 0.4 ? 'medium'
                   : 'low';

  return {
    similarity: assignedScore,
    confidence,
    topPillars: pillarScores.slice(0, 3)
  };
}

/**
 * Find products that match a lifestyle image's aesthetic
 */
export async function findMatchingProducts(
  lifestyleImageUrl: string,
  options?: {
    limit?: number;
    filters?: {
      department?: string[];
      productType1?: string;
    };
  }
): Promise<SemanticSearchResult['products']> {
  const result = await semanticSearch({
    imageUrl: lifestyleImageUrl,
    searchProducts: true,
    searchConcepts: false,
    limit: options?.limit || 50,
    filters: options?.filters
  });

  return result.products;
}

/**
 * Build a visual style profile from multiple liked images
 */
export async function buildStyleProfile(
  likedImageUrls: string[]
): Promise<{
  styleVector: number[];
  topPillars: ConceptMatch[];
  topVibes: ConceptMatch[];
}> {
  if (likedImageUrls.length === 0) {
    throw new Error('Need at least one liked image');
  }

  // Embed all liked images
  const embeddings = await Promise.all(
    likedImageUrls.map(url => embedImage(url))
  );

  // Average to create style vector
  const styleVector = averageEmbeddings(
    embeddings.map(e => e.embedding)
  );

  // Get style concept embeddings
  const styleConcepts = await embedConcepts({
    categories: ['pillars', 'vibes'],
    useCache: true
  });

  // Find matching pillars
  const pillarScores: ConceptMatch[] = [];
  for (const [name, embArray] of Object.entries(styleConcepts.pillars)) {
    const similarity = cosineSimilarity(styleVector, embArray);
    pillarScores.push({ name, score: similarity });
  }
  pillarScores.sort((a, b) => b.score - a.score);

  // Find matching vibes
  const vibeScores: ConceptMatch[] = [];
  if (styleConcepts.vibes) {
    for (const [name, embArray] of Object.entries(styleConcepts.vibes)) {
      const similarity = cosineSimilarity(styleVector, embArray);
      vibeScores.push({ name, score: similarity });
    }
    vibeScores.sort((a, b) => b.score - a.score);
  }

  return {
    styleVector,
    topPillars: pillarScores.slice(0, 3),
    topVibes: vibeScores.slice(0, 5)
  };
}

/**
 * Check if CLIP API is healthy
 */
export async function checkHealth(): Promise<{
  status: string;
  products_loaded: number;
  embeddings_loaded: number;
}> {
  const response = await fetch(`${CLIP_API_URL}/health`);

  if (!response.ok) {
    throw new Error('CLIP API health check failed');
  }

  return response.json();
}

// Export types
export type { ConceptMatch, SemanticSearchResult, StyleConcepts, Embedding };
