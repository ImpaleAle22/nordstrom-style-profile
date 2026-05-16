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
import { supabase } from '@/lib/supabase-client';

const GEMINI_MODEL = 'gemini-2.5-flash';
const TEMPERATURE = 0.4;
const MAX_TOKENS = 2048;

// Auto-save directory
const AUTOSAVE_DIR = join(process.cwd(), 'data', 'autosave');

interface RecipeGenerationRequest {
  images: LifestyleImage[];
  batchId?: string;
}

// Helper: Check if recipe already exists for this image URL
async function checkRecipeExists(imageUrl: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('recipes')
      .select('id')
      .eq('ai_metadata->>sourceImageUrl', imageUrl)
      .limit(1);

    if (error) {
      console.error('Error checking recipe existence:', error);
      return false;
    }

    return data && data.length > 0;
  } catch (error) {
    console.error('Error checking recipe existence:', error);
    return false;
  }
}

// Helper: Save recipe to Supabase
async function saveRecipeToSupabase(recipe: UnifiedRecipe): Promise<void> {
  try {
    const supabaseRecipe = {
      id: recipe.id,
      title: recipe.title,
      status: recipe.status,
      department: recipe.department,
      slot_count: recipe.slotCount,
      slots: recipe.slots,
      source: recipe.source,
      ai_metadata: recipe.aiMetadata,
      seasons: recipe.seasons || [],
      batch_id: recipe.batchId,
      created_at: recipe.createdAt,
      updated_at: recipe.updatedAt,
    };

    const { error } = await supabase
      .from('recipes')
      .upsert(supabaseRecipe, { onConflict: 'id' });

    if (error) throw error;

    console.log(`✅ Saved recipe to Supabase: ${recipe.title}`);
  } catch (error) {
    console.error('❌ Failed to save recipe to Supabase:', error);
    // Don't throw - continue processing even if save fails
  }
}

// Helper: Detect if URL is from Unsplash or Pexels
function detectImageSource(imageUrl: string): 'unsplash' | 'pexels' | null {
  if (imageUrl.includes('unsplash.com')) return 'unsplash';
  if (imageUrl.includes('pexels.com')) return 'pexels';
  return null;
}

// Helper: Save lifestyle image to database (for Unsplash/Pexels images)
async function saveLifestyleImage(image: any): Promise<void> {
  try {
    const source = detectImageSource(image.imageUrl);
    if (!source) {
      // Not from Unsplash/Pexels, skip saving
      return;
    }

    const lifestyleImageRecord = {
      image_id: image.imageId,
      image_url: image.imageUrl,
      source: source,
      outfit_analysis: image.outfitAnalysis,
      display_suitability: image.displaySuitability,
      brand_adherence: image.brandAdherence,
      is_recipe_generation_candidate: image.isRecipeGenerationCandidate,
      scanned_at: image.taggedAt,
      tagged_at: image.taggedAt,
    };

    const { error } = await supabase
      .from('lifestyle_images')
      .upsert(lifestyleImageRecord, { onConflict: 'image_id' });

    if (error) throw error;

    console.log(`✅ Saved lifestyle image from ${source}: ${image.imageId}`);
  } catch (error) {
    console.error('❌ Failed to save lifestyle image:', error);
    // Don't throw - continue processing even if save fails
  }
}

// Helper: Save recipe to disk immediately (backup)
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
    const savedRecipes: string[] = [];
    const skippedRecipes: string[] = [];
    const finalBatchId = batchId || `batch-lifestyle-${Date.now()}`;

    // Generate recipe for each image
    for (const image of images) {
      try {
        // Check if recipe already exists for this image
        const exists = await checkRecipeExists(image.imageUrl);
        if (exists) {
          console.log(`⏭️  Recipe already exists for ${image.imageUrl.substring(0, 60)}...`);
          skippedRecipes.push(image.imageId);
          continue;
        }

        const recipe = await generateRecipeFromImage(image, apiKey, finalBatchId);
        recipes.push(recipe);

        // SAVE TO SUPABASE (primary storage)
        await saveRecipeToSupabase(recipe);
        savedRecipes.push(recipe.id);

        // SAVE LIFESTYLE IMAGE (if Unsplash/Pexels)
        await saveLifestyleImage(image);

        // AUTO-SAVE TO DISK (backup - prevents data loss)
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
      savedToDatabase: savedRecipes.length,
      skippedDuplicates: skippedRecipes.length,
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

  // CRITICAL: Validate we have at least 4 items total BEFORE processing
  const totalItems = detectedItems.length + suggestedItems.length;
  if (totalItems < 4) {
    console.error(`❌ Insufficient items for recipe: detected=${detectedItems.length}, suggested=${suggestedItems.length}, total=${totalItems}`);
    console.error(`   AI must detect or suggest at least 4 items. This image may be:`);
    console.error(`   - Not showing a complete outfit (missing visible items)`);
    console.error(`   - Not a fashion/outfit photo (wrong context)`);
    console.error(`   - Poor quality/lighting (items not visible)`);
    throw new Error(
      `Insufficient items detected (${detectedItems.length} visible, ${suggestedItems.length} suggested). ` +
      `Need 4+ items for a complete outfit. Try a different image with a more complete outfit visible.`
    );
  }

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
   **CRITICAL**: You MUST identify ALL visible garments and accessories in the image.

   For each VISIBLE item (scan the ENTIRE outfit carefully):
   - role: "tops" | "bottoms" | "dresses" | "shoes" | "outerwear" | "accessories" | "jewelry"
   - query: Search query to find similar products (e.g., "white chiffon maxi dress", "leather ankle boots")
   - color: Primary color (e.g., "white", "navy", "camel")
   - material: Fabric/material if identifiable (e.g., "chiffon", "leather", "cotton", "denim")
   - description: Brief description of the item

   **SCAN CHECKLIST** (look for each category):
   - Outerwear (coats, jackets, blazers)
   - Tops (shirts, blouses, sweaters, tees) OR Dresses
   - Bottoms (pants, skirts, shorts) [skip if dress]
   - Shoes (boots, heels, sneakers, flats) - REQUIRED
   - Accessories (bags, jewelry, hats, scarves, sunglasses, belts)

3. SUGGESTED ITEMS:
   **MANDATORY**: If you detected FEWER than 4 items in "slots", you MUST provide suggestions to reach 4-6 total items.

   Auto-fill missing items:
   - No shoes visible? → MUST suggest shoes in suggestedItems
   - No top visible (and no dress)? → MUST suggest a top
   - No bottoms visible (and no dress)? → MUST suggest bottoms
   - Fewer than 4 total? → Add accessories to complete the outfit

   Use same format as slots. Match the Style Pillar (${outfitAnalysis.stylePillar}) and vibe.

CRITICAL OUTFIT BUILDING RULES:
- **MINIMUM 4 ITEMS REQUIRED** (detected + suggested combined)
- **SHOES ARE MANDATORY** - if not visible, MUST be in suggestedItems
- If you see a dress, use role "dresses" (not tops/bottoms)
- List EVERYTHING you can SEE in "slots"
- Add missing items in "suggestedItems" to reach 4-6 total
- Maintain the Style Pillar aesthetic (${outfitAnalysis.stylePillar})
- Reflect the vibes (${outfitAnalysis.vibes.join(', ')})
- Keep formality level around ${outfitAnalysis.formalityLevel}/10

**FAILURE TO DETECT 4+ TOTAL ITEMS WILL RESULT IN RECIPE REJECTION**

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
