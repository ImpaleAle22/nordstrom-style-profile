/**
 * Vision Analysis API Route
 *
 * Analyzes fashion photography using Gemini Vision API
 * to extract outfit details and generate recipe suggestions
 */

import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

export async function POST(request: NextRequest) {
  try {
    const { imageData } = await request.json();

    if (!imageData) {
      return NextResponse.json(
        { error: 'No image data provided' },
        { status: 400 }
      );
    }

    const apiKey = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'GEMINI_API_KEY not configured' },
        { status: 500 }
      );
    }

    // Use Gemini 2.5 Flash for vision analysis
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${apiKey}`;

    const prompt = `You are a fashion expert analyzing an outfit photograph. Extract the following information in JSON format:

1. Department: "Womenswear" or "Menswear" (determine from clothing style, fit, and styling)

2. List all visible clothing items and accessories with:
   - role: MUST be one of: "tops", "bottoms", "shoes", "outerwear", "dress" (for dresses/jumpsuits), "accessories"
   - title: SHORT product-like name suitable for search (e.g., "Floral midi dress", "White sneakers")
   - description: Full detailed description (for reference only)
   - color: Primary color
   - material: If identifiable (e.g., "denim", "cotton", "leather")
   - enrichment: Optional detailed attributes to guide outfit composition (NOT used for filtering):
     * patterns: Array of pattern types if visible (e.g., ["floral", "print"], ["striped"])
     * silhouette: Overall shape (e.g., "A-line", "fitted", "oversized", "relaxed")
     * secondaryColors: Array of accent colors beyond primary (e.g., ["white", "green"])
     * garmentLength: Length category if applicable (e.g., "midi", "mini", "maxi", "knee-length")
     * neckline: Neckline type if visible (e.g., "v-neck", "crew", "sweetheart", "scoop")
     * sleeveStyle: Sleeve type if applicable (e.g., "short sleeve", "long sleeve", "sleeveless")
     * fitType: Fit description (e.g., "fitted", "relaxed", "oversized", "tailored")
     * textureType: Fabric texture if visible (e.g., "knit", "woven", "structured", "flowy")
     * styleDetails: Array of notable details (e.g., ["cutout", "ruffles"], ["buttons", "embroidered"])

CRITICAL - Each item MUST be INDEPENDENTLY searchable:
- NEVER use contextual terms: "Matching belt", "Coordinating bag", "Similar shoes"
- ALWAYS include complete standalone details: color, material, style
- Good: "Brown leather belt with gold buckle"
- Bad: "Matching fabric belt"
- Good: "Beige suede crossbody bag"
- Bad: "Coordinating handbag"
- Each "title" will be searched in isolation with NO context about other items

IMPORTANT:
- For dresses, jumpsuits, or rompers, use role: "dress"
- Keep "title" concise (3-6 words max) - this will be used for product search
- Save long details for "description" field

3. Suggest 1-3 additional items to complete the outfit (even if 4+ items are visible):
   - CRITICAL: If outerwear/jacket is visible but NO top underneath → suggest appropriate top (bodysuit, camisole, fitted tee, tank top)
   - If shoes are not visible → suggest appropriate footwear
   - If outfit has fewer than 4 items total → suggest accessories to reach minimum 4 items
   - Vary accessory types for styling options:
     * If jewelry (earrings/necklace) is visible → suggest bag, hat, sunglasses, or belt
     * If bag is visible → suggest jewelry (earrings, necklace, bracelet)
     * If both jewelry and bag are visible → suggest hat, sunglasses, scarf, or belt
   - Same format as visible items (role, title, description, color, material)
   - MUST follow same independence rule: complete standalone details with color, material, style

4. Style notes describing the overall aesthetic

5. Suggested recipe name for this outfit:
   - Be CREATIVE and SPECIFIC - avoid generic words like "Chic", "Ensemble", "Urban Explorer", "Modern", "Elegant"
   - Use evocative, memorable names that capture the outfit's unique vibe
   - Think like a fashion editor naming a lookbook spread
   - Examples of GOOD names: "Sunset Boulevard Dreamer", "Tokyo Streetwear Maven", "90s Grunge Revival"
   - Examples of BAD (overused) names: "Urban Chic", "Modern Ensemble", "City Explorer", "Sophisticated Style"

Respond ONLY with valid JSON in this format:
{
  "department": "Womenswear",
  "items": [
    {
      "role": "dress",
      "title": "Floral midi dress",
      "description": "Midi-length dress with floral print, sweetheart neckline, and A-line skirt",
      "color": "multicolor",
      "material": "cotton",
      "enrichment": {
        "patterns": ["floral", "print"],
        "silhouette": "A-line",
        "secondaryColors": ["white", "green"],
        "garmentLength": "midi",
        "neckline": "sweetheart",
        "sleeveStyle": "short sleeve",
        "fitType": "fitted",
        "textureType": "flowy"
      }
    },
    {
      "role": "shoes",
      "title": "White heeled sandals",
      "description": "White heeled sandals with square toe and bow details",
      "color": "white",
      "enrichment": {
        "styleDetails": ["square toe", "bow details"]
      }
    }
  ],
  "suggestedItems": [
    {
      "role": "accessories",
      "title": "Straw sun hat",
      "description": "Wide-brim straw hat perfect for garden party aesthetic",
      "color": "natural"
    },
    {
      "role": "accessories",
      "title": "Woven crossbody bag",
      "description": "Small woven bag in neutral tones",
      "color": "beige",
      "material": "straw"
    }
  ],
  "styleNotes": "Romantic, feminine aesthetic perfect for garden parties",
  "suggestedRecipe": "Garden Party Elegance",
  "confidence": 0.9
}`;

    // Use axios for better timeout control (60s for both connection and response)
    const response = await axios.post(url, {
      contents: [
        {
          parts: [
            { text: prompt },
            {
              inline_data: {
                mime_type: 'image/jpeg',
                data: imageData,
              },
            },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.4,
        topK: 32,
        topP: 1,
        maxOutputTokens: 2048,
      },
    }, {
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 60000, // 60 second timeout for both connection and response
    });

    const data = response.data;
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) {
      return NextResponse.json(
        { error: 'Empty response from Gemini' },
        { status: 500 }
      );
    }

    // Parse JSON response (strip markdown code blocks if present)
    let jsonStr = text.trim();
    if (jsonStr.startsWith('```')) {
      jsonStr = jsonStr.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    }

    // Extract JSON if there's surrounding text
    const firstBrace = jsonStr.indexOf('{');
    const lastBrace = jsonStr.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      jsonStr = jsonStr.substring(firstBrace, lastBrace + 1);
    }

    const result = JSON.parse(jsonStr);

    // Validate response structure
    if (!result.items || !Array.isArray(result.items)) {
      throw new Error('Invalid response structure from AI');
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Vision analysis error:', error);

    // Handle axios errors
    if (axios.isAxiosError(error)) {
      if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
        return NextResponse.json(
          { error: 'Vision analysis timeout - please try with a smaller image or check your internet connection' },
          { status: 504 }
        );
      }

      if (error.response) {
        // Gemini API returned an error response
        console.error('Gemini API error:', error.response.data);
        return NextResponse.json(
          { error: `Gemini API error: ${error.response.status}` },
          { status: error.response.status }
        );
      }

      if (error.request) {
        // Request was made but no response received
        return NextResponse.json(
          { error: 'No response from Gemini API - check your internet connection' },
          { status: 503 }
        );
      }
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Analysis failed' },
      { status: 500 }
    );
  }
}
