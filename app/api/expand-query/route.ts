/**
 * Query Expansion API
 * Expands short concept queries into detailed CLIP prompts
 */

import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { query } = await request.json();

    if (!query || typeof query !== 'string') {
      return NextResponse.json(
        { error: 'Query is required' },
        { status: 400 }
      );
    }

    // Detect if original query specifies a product type
    const queryLower = query.toLowerCase();
    const productTypeKeywords = [
      'dress', 'dresses', 'top', 'tops', 'shirt', 'shirts', 'blouse', 'blouses',
      'sweater', 'sweaters', 'cardigan', 'cardigans', 'jacket', 'jackets', 'coat', 'coats',
      'pants', 'jeans', 'trouser', 'trousers', 'skirt', 'skirts', 'short', 'shorts',
      'shoe', 'shoes', 'boot', 'boots', 'sneaker', 'sneakers', 'heel', 'heels',
      'bag', 'bags', 'purse', 'handbag', 'tote', 'clutch',
      'jewelry', 'jewellery', 'necklace', 'earring', 'bracelet', 'ring',
      'scarf', 'scarves', 'belt', 'belts', 'hat', 'hats'
    ];
    const hasProductTypeInOriginal = productTypeKeywords.some(keyword => queryLower.includes(keyword));

    // Call Gemini to expand the query
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
    if (!GEMINI_API_KEY) {
      return NextResponse.json(
        { error: 'API key not configured' },
        { status: 500 }
      );
    }

    const prompt = hasProductTypeInOriginal
      ? `You are a fashion search query expander. Take a short concept query and expand it into a detailed prompt for a visual similarity search (CLIP model).

INPUT QUERY: "${query}"

The user specified a product type, so expand this into a detailed description that includes:
- The specific garment type mentioned
- Colors, materials, textures
- Mood and aesthetic keywords
- Style descriptors (elegant, casual, edgy, etc.)

Keep it to 1-2 sentences, around 20-30 words.

EXPANDED QUERY:`
      : `You are a fashion search query expander. Take a short concept query and expand it into a detailed prompt for a visual similarity search (CLIP model).

INPUT QUERY: "${query}"

This is a vibe/occasion-based query. DO NOT mention specific garment types (no "dress", "sweater", "boots", etc). Instead expand with:
- Colors, materials, textures
- Mood and aesthetic keywords
- Occasion context
- Style descriptors (elegant, casual, edgy, cozy, polished, etc.)

Keep it to 1-2 sentences, around 20-30 words. Focus on the overall aesthetic, NOT specific items.

EXPANDED QUERY:`;

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${GEMINI_API_KEY}`;

    const response = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.4,
          maxOutputTokens: 100,
        },
      }),
    });

    if (!response.ok) {
      throw new Error('Gemini API error');
    }

    const data = await response.json();
    const expandedQuery = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

    if (!expandedQuery) {
      // Fallback to original query if expansion fails
      return NextResponse.json({
        expandedQuery: query,
        hasProductType: hasProductTypeInOriginal
      });
    }

    return NextResponse.json({
      expandedQuery,
      hasProductType: hasProductTypeInOriginal
    });
  } catch (error) {
    console.error('Query expansion error:', error);
    // Return original query on error
    const { query } = await request.json();
    const queryLower = query.toLowerCase();
    const productTypeKeywords = [
      'dress', 'dresses', 'top', 'tops', 'shirt', 'shirts', 'blouse', 'blouses',
      'sweater', 'sweaters', 'cardigan', 'cardigans', 'jacket', 'jackets', 'coat', 'coats',
      'pants', 'jeans', 'trouser', 'trousers', 'skirt', 'skirts', 'short', 'shorts',
      'shoe', 'shoes', 'boot', 'boots', 'sneaker', 'sneakers', 'heel', 'heels',
      'bag', 'bags', 'purse', 'handbag', 'tote', 'clutch'
    ];
    const hasProductType = productTypeKeywords.some(keyword => queryLower.includes(keyword));
    return NextResponse.json({ expandedQuery: query, hasProductType });
  }
}
