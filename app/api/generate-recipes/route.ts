/**
 * Recipe Generation API
 * Generates outfit recipes from tagged lifestyle images
 */

import { NextRequest, NextResponse } from 'next/server';
import { jsonrepair } from 'jsonrepair';
import { writeFileSync, existsSync, readFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { visionToRecipeSlots } from '@/lib/vision-to-recipe';
import type { LifestyleImage } from '@/lib/lifestyle-image-types';
import type { UnifiedRecipe } from '@/lib/unified-recipe-types';
import { nanoid } from 'nanoid';

const GEMINI_MODEL = 'gemini-2.5-flash';
const TEMPERATURE = 0.4;
const MAX_TOKENS = 2048;

// Auto-save directory
const AUTOSAVE_DIR = join(process.cwd(), 'data', 'autosave');

interface RecipeGenerationRequest {
  images: LifestyleImage[];
  batchId?: string;
}

// Helper: Save recipe to disk immediately
function autoSaveRecipe(recipe: UnifiedRecipe, batchId: string) {
  try {
    // Ensure autosave directory exists
    if (!existsSync(AUTOSAVE_DIR)) {
      mkdirSync(AUTOSAVE_DIR, { recursive: true });
    }

    const batchFile = join(AUTOSAVE_DIR, `${batchId}.json`);

    // Load existing recipes or start new array
    let recipes: UnifiedRecipe[] = [];
    if (existsSync(batchFile)) {
      const existing = readFileSync(batchFile, 'utf-8');
      recipes = JSON.parse(existing);
    }

    // Add new recipe
    recipes.push(recipe);

    // Write back to disk
    writeFileSync(batchFile, JSON.stringify(recipes, null, 2));
    console.log(`✅ Auto-saved recipe ${recipe.id} to ${batchFile} (${recipes.length} total)`);
  } catch (error) {
    console.error('❌ Auto-save failed:', error);
    // Don't throw - continue processing even if save fails
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: RecipeGenerationRequest = await request.json();
    const { images, batchId } = body;

    if (!images || images.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No images provided' },
        { status: 400 }
      );
    }

    const apiKey = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: 'GEMINI_API_KEY not configured' },
        { status: 500 }
      );
    }

    const recipes: UnifiedRecipe[] = [];
    const finalBatchId = batchId || `batch-lifestyle-${Date.now()}`;

    // Generate recipe for each image
    for (const image of images) {
      try {
        const recipe = await generateRecipeFromImage(image, apiKey, finalBatchId);
        recipes.push(recipe);

        // AUTO-SAVE TO DISK IMMEDIATELY (prevents data loss)
        autoSaveRecipe(recipe, finalBatchId);
      } catch (error) {
        console.error(`Failed to generate recipe for ${image.imageId}:`, error);
        // Continue with other images
      }
    }

    return NextResponse.json({
      success: true,
      recipeCount: recipes.length,
      recipes,
    });

  } catch (error) {
    console.error('Recipe generation error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

async function generateRecipeFromImage(
  image: LifestyleImage,
  apiKey: string,
  batchId?: string
): Promise<UnifiedRecipe> {
  const prompt = buildRecipePrompt(image);

  // Call Gemini API
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: prompt },
            {
              inline_data: {
                mime_type: 'image/jpeg',
                data: await fetchImageAsBase64(image.imageUrl),
              },
            },
          ],
        }],
        generationConfig: {
          temperature: TEMPERATURE,
          maxOutputTokens: MAX_TOKENS,
        },
      }),
    }
  );

  if (!response.ok) {
    throw new Error(`Gemini API error: ${response.status}`);
  }

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!text) {
    throw new Error('Empty response from Gemini');
  }

  // Parse JSON response
  const parsed = parseRecipeResponse(text);

  // Transform detected items to VisionItem format
  const detectedItems = parsed.slots.map(slot => ({
    role: slot.role,
    title: slot.query, // Use query as title (it's already search-optimized)
    description: slot.description,
    color: slot.color,
    material: slot.material,
  }));

  // Transform suggested items (if AI provided them)
  const suggestedItems = (parsed.suggestedItems || []).map(item => ({
    role: item.role,
    title: item.query,
    description: item.description,
    color: item.color,
    material: item.material,
  }));

  console.log(`🔍 Recipe generation for ${image.imageId}:`);
  console.log(`   Detected items: ${detectedItems.length}`);
  console.log(`   Suggested items: ${suggestedItems.length}`);

  // Use vision-to-recipe library for proper slot transformation
  // This handles: role mapping, productType inference, material extraction,
  // auto-filling missing slots, and validation
  const { variations, filtered } = visionToRecipeSlots(
    detectedItems,
    parsed.recipeName,
    suggestedItems
  );

  if (variations.length === 0) {
    throw new Error('Could not generate valid recipe variations. Insufficient items detected.');
  }

  // Use the primary variation (most complete)
  const primaryVariation = variations[0];
  const transformedSlots = primaryVariation.slots;

  console.log(`   ✓ Generated ${variations.length} variation(s)`);
  console.log(`   ✓ Primary variation: ${transformedSlots.length} slots`);
  if (filtered.length > 0) {
    console.log(`   ⚠️  Filtered ${filtered.length} non-wearable items`);
  }

  // Build UnifiedRecipe
  const now = new Date().toISOString();
  const recipe: UnifiedRecipe = {
    id: `recipe_${Date.now()}_${nanoid(8)}`,
    title: parsed.recipeName,
    status: 'draft',
    department: image.outfitAnalysis.gender === 'womenswear' ? 'Womenswear' : 'Menswear',
    slotCount: transformedSlots.length,
    seasons: image.outfitAnalysis.season,
    createdAt: now,
    updatedAt: now,
    batchId: batchId || `batch-lifestyle-${Date.now()}`,
    slots: transformedSlots,
    source: 'ai-lifestyle-vision',
    aiMetadata: {
      sourceProductId: image.imageId,
      sourceImageUrl: image.imageUrl,
      sourceProductContext: {
        title: parsed.recipeName,
        brand: 'Lifestyle Vision',
        department: image.outfitAnalysis.gender === 'womenswear' ? 'Womenswear' : 'Menswear',
        productType1: 'Lifestyle Image',
      },
      confidence: image.outfitAnalysis.pillarConfidence,
      notes: `Generated from ${image.outfitAnalysis.stylePillar} lifestyle image. Vibes: ${image.outfitAnalysis.vibes.join(', ')}. Occasions: ${image.outfitAnalysis.occasions.join(', ')}.`,
      scannedAt: image.taggedAt,
      // Store full lifestyle image data for reference
      lifestyleImageData: {
        stylePillar: image.outfitAnalysis.stylePillar,
        subTerm: image.outfitAnalysis.subTerm,
        vibes: image.outfitAnalysis.vibes,
        occasions: image.outfitAnalysis.occasions,
        brandAdherence: image.brandAdherence,
      },
    },
  };

  return recipe;
}

function buildRecipePrompt(image: LifestyleImage): string {
  const { outfitAnalysis, brandAdherence } = image;

  return `Generate an outfit recipe from this lifestyle fashion image.

IMAGE ANALYSIS (already completed):
- Style Pillar: ${outfitAnalysis.stylePillar}${outfitAnalysis.subTerm ? ` (${outfitAnalysis.subTerm})` : ''}
- Spectrum Coordinate: ${outfitAnalysis.spectrumCoordinate}
- Vibes: ${outfitAnalysis.vibes.join(', ')}
- Occasions: ${outfitAnalysis.occasions.join(', ')}
- Formality Level: ${outfitAnalysis.formalityLevel}/10
- Season: ${outfitAnalysis.season.join(', ')}
- Gender: ${outfitAnalysis.gender}
- Complete Outfit: ${outfitAnalysis.isCompleteOutfit ? 'Yes' : 'No'}
- Visible Items: ${outfitAnalysis.visibleItemCount}
- Brand Adherence: ${brandAdherence.score}/100 (${brandAdherence.isArtDirected ? 'Art directed' : 'Not art directed'}, ${brandAdherence.imageTone} tone)

YOUR TASK:
Generate a recipe for this outfit with:

1. RECIPE NAME:
   - Use Style Pillar + key vibe/occasion
   - Make it descriptive and appealing
   - Examples: "Dreamy Romantic Wedding Guest Look", "Confident Minimal Office Outfit", "Effortless Bohemian Brunch Style"

2. INGREDIENT SLOTS:
   For each VISIBLE item in the image:
   - role: "tops" | "bottoms" | "dresses" | "shoes" | "outerwear" | "accessories" | "jewelry"
   - query: Search query to find similar products (e.g., "white chiffon maxi dress", "leather ankle boots")
   - color: Primary color (e.g., "white", "navy", "camel")
   - material: Fabric/material if identifiable (e.g., "chiffon", "leather", "cotton", "denim")
   - description: Brief description of the item

3. SUGGESTED ITEMS (if outfit is incomplete):
   If the outfit has FEWER than 4 items visible, suggest items to complete it:
   - Missing shoes? Suggest appropriate footwear
   - Missing top? Suggest a complementary top
   - Missing bottoms? Suggest appropriate bottoms
   - Use same format as slots

CRITICAL OUTFIT BUILDING RULES:
- **COMPLETE OUTFITS NEED 4-6 ITEMS**
- **SHOES ARE REQUIRED** - if no shoes visible, suggest in suggestedItems
- If you see a dress, use role "dresses" (not tops/bottoms)
- Only list items you can ACTUALLY SEE in "slots"
- Use "suggestedItems" for items needed to complete the outfit
- Maintain the Style Pillar aesthetic (${outfitAnalysis.stylePillar})
- Reflect the vibes (${outfitAnalysis.vibes.join(', ')})
- Keep formality level around ${outfitAnalysis.formalityLevel}/10

Return ONLY this JSON:
{
  "recipeName": "...",
  "slots": [
    {
      "role": "...",
      "query": "...",
      "color": "...",
      "material": "...",
      "description": "..."
    }
  ],
  "suggestedItems": [
    {
      "role": "...",
      "query": "...",
      "color": "...",
      "material": "...",
      "description": "..."
    }
  ]
}`;
}

function parseRecipeResponse(text: string): {
  recipeName: string;
  slots: Array<{
    role: string;
    query: string;
    color: string;
    material?: string;
    description: string;
  }>;
  suggestedItems?: Array<{
    role: string;
    query: string;
    color: string;
    material?: string;
    description: string;
  }>;
} {
  let jsonStr = text.trim();

  // Strip markdown code blocks
  if (jsonStr.startsWith('```')) {
    jsonStr = jsonStr.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  }

  // Extract JSON
  const firstBrace = jsonStr.indexOf('{');
  const lastBrace = jsonStr.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1) {
    jsonStr = jsonStr.substring(firstBrace, lastBrace + 1);
  }

  // Try jsonrepair first
  try {
    const repairedJson = jsonrepair(jsonStr);
    return JSON.parse(repairedJson);
  } catch (repairError) {
    // Fall back to direct parse
    return JSON.parse(jsonStr);
  }
}

async function fetchImageAsBase64(imageUrl: string): Promise<string> {
  // Optimize image URL
  const optimizedUrl = optimizeImageUrl(imageUrl);

  const response = await fetch(optimizedUrl);
  if (!response.ok) {
    throw new Error(`Failed to fetch image: ${response.statusText}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  const base64 = Buffer.from(arrayBuffer).toString('base64');
  return base64;
}

function optimizeImageUrl(url: string): string {
  try {
    const urlObj = new URL(url);

    if (url.includes('pexels.com')) {
      urlObj.searchParams.set('w', '800');
      urlObj.searchParams.set('dpr', '1');
      return urlObj.toString();
    }

    if (url.includes('unsplash.com')) {
      urlObj.searchParams.set('w', '800');
      urlObj.searchParams.set('q', '80');
      return urlObj.toString();
    }

    return url;
  } catch (error) {
    return url;
  }
}
