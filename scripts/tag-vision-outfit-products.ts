#!/usr/bin/env ts-node
/**
 * Tag Products in Vision Outfits - Materials Extraction
 *
 * Identifies ~2,100 products in vision outfits that are missing materials,
 * uses Gemini Vision API to extract materials from images, and updates the database.
 *
 * Cost: ~$0.31 (2,100 products × $0.00015/product)
 * Time: ~3.5 hours @ 10 products/min with rate limits
 *
 * Usage:
 *   ts-node scripts/tag-vision-outfit-products.ts
 *
 * Options:
 *   --dry-run    Test without writing to database
 *   --limit N    Process only N products (for testing)
 *   --resume     Resume from checkpoint
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

// ============================================================================
// CONFIGURATION
// ============================================================================

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;  // Use service role for UPDATE permissions
const GEMINI_API_KEY = process.env.GEMINI_API_KEY!;

const GEMINI_MODEL = 'gemini-2.5-flash-lite';  // Changed from 2.0-flash-exp (404 error)
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

const CHECKPOINT_FILE = 'vision-products-tagging-checkpoint.json';
const RESULTS_FILE = 'vision-products-tagging-results.jsonl';
const BATCH_SIZE = 100; // Save checkpoint every 100 products
const RATE_LIMIT_DELAY = 6000; // 6 seconds between requests = 10 per minute

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ============================================================================
// TYPES
// ============================================================================

interface Checkpoint {
  processedIds: string[];
  lastProcessedIndex: number;
  totalProcessed: number;
  successful: number;
  failed: number;
  startedAt: string;
  lastUpdatedAt: string;
}

interface TaggingResult {
  product_id: string;
  success: boolean;
  materials?: string[];
  error?: string;
  confidence?: number;
  timestamp: string;
}

// ============================================================================
// CHECKPOINT MANAGEMENT
// ============================================================================

function loadCheckpoint(): Checkpoint | null {
  if (fs.existsSync(CHECKPOINT_FILE)) {
    const data = fs.readFileSync(CHECKPOINT_FILE, 'utf-8');
    return JSON.parse(data);
  }
  return null;
}

function saveCheckpoint(checkpoint: Checkpoint): void {
  fs.writeFileSync(CHECKPOINT_FILE, JSON.stringify(checkpoint, null, 2));
}

function appendResult(result: TaggingResult): void {
  fs.appendFileSync(RESULTS_FILE, JSON.stringify(result) + '\n');
}

// ============================================================================
// PRODUCT QUERYING
// ============================================================================

async function getProductsNeedingMaterials(limit?: number): Promise<string[]> {
  console.log('\n📋 Step 1: Identifying products in vision outfits missing materials...\n');

  // Simplified approach: Get vision outfit products first in small batches,
  // then check materials status (avoids slow product table scan)
  console.log('   Collecting product IDs from vision outfits...');

  const visionProductIds = new Set<string>();
  let offset = 0;
  const batchSize = 500;  // Smaller batches to avoid timeout
  let checkedOutfits = 0;

  // Limit how many outfits we check (we can expand this if needed)
  const maxOutfits = limit ? 500 : 12961;  // Check ALL outfits for full run

  while (checkedOutfits < maxOutfits) {
    const { data, error } = await supabase
      .from('outfits')
      .select('items')
      .like('outfit_id', 'vision-%')
      .range(offset, offset + batchSize - 1);

    if (error) {
      console.error('\n   Warning: Error fetching outfits:', error.message);
      break;
    }
    if (!data || data.length === 0) break;

    // Extract product IDs from this batch
    data.forEach(outfit => {
      outfit.items?.forEach((item: any) => {
        if (item.product_id) {
          visionProductIds.add(item.product_id);
        }
      });
    });

    checkedOutfits += data.length;
    process.stdout.write(`\r   Checked ${checkedOutfits} outfits, found ${visionProductIds.size} unique products...`);

    if (data.length < batchSize) break;
    offset += batchSize;
  }

  console.log(` ✓`);
  console.log(`   Total unique products in vision outfits: ${visionProductIds.size}`);

  // Now check which of these products are missing materials
  console.log('   Checking materials status...');

  const productsWithoutMaterials: string[] = [];
  const productIdsArray = Array.from(visionProductIds);

  for (let i = 0; i < productIdsArray.length; i += 100) {
    const batch = productIdsArray.slice(i, i + 100);
    const { data: products } = await supabase
      .from('products')
      .select('product_id, materials')
      .in('product_id', batch);

    products?.forEach(p => {
      const hasMat = p.materials && Array.isArray(p.materials) && p.materials.length > 0;
      if (!hasMat) {
        productsWithoutMaterials.push(p.product_id);
      }
    });

    process.stdout.write(`\r   Checked ${Math.min(i + 100, productIdsArray.length)} / ${productIdsArray.length} products...`);
  }

  console.log(` ✓`);
  console.log(`   Total products needing materials: ${productsWithoutMaterials.length}`);

  console.log(`\n✅ Found ${productsWithoutMaterials.length} products in vision outfits needing materials tagging`);

  const needsMaterials = productsWithoutMaterials;

  if (limit) {
    console.log(`   Limiting to first ${limit} products (--limit flag)`);
    return needsMaterials.slice(0, limit);
  }

  return needsMaterials;
}

// ============================================================================
// GEMINI VISION API
// ============================================================================

async function extractMaterialsFromImage(imageUrl: string): Promise<{
  materials: string[];
  confidence: number;
} | null> {
  const prompt = `Analyze this fashion product image and identify the materials/fabrics used.

Return ONLY a JSON object with this structure:
{
  "materials": ["material1", "material2"],
  "confidence": 0.85
}

Possible materials include: cotton, polyester, wool, silk, linen, cashmere, leather, suede, denim, jersey, fleece, nylon, spandex, rayon, viscose, modal, acrylic, satin, chiffon, velvet, corduroy, canvas, knit, mesh, lace, sequin, faux leather, faux fur.

Be specific and only list materials you can confidently identify. Confidence should be 0.0-1.0.`;

  try {
    const response = await fetch(GEMINI_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: prompt },
            {
              inline_data: {
                mime_type: 'image/jpeg',
                data: await fetchImageAsBase64(imageUrl)
              }
            }
          ]
        }],
        generationConfig: {
          temperature: 0.2,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 200,
          responseMimeType: 'application/json'
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) {
      throw new Error('No response from Gemini');
    }

    const parsed = JSON.parse(text);

    if (!parsed.materials || !Array.isArray(parsed.materials)) {
      throw new Error('Invalid response format');
    }

    return {
      materials: parsed.materials.map((m: string) => m.toLowerCase().trim()),
      confidence: parsed.confidence || 0.8
    };

  } catch (error) {
    console.error('   Gemini API error:', error instanceof Error ? error.message : 'Unknown error');
    return null;
  }
}

async function fetchImageAsBase64(url: string): Promise<string> {
  const response = await fetch(url);
  const buffer = await response.arrayBuffer();
  return Buffer.from(buffer).toString('base64');
}

// ============================================================================
// TAGGING WORKFLOW
// ============================================================================

async function tagProduct(productId: string): Promise<TaggingResult> {
  const timestamp = new Date().toISOString();

  try {
    // Get product image URL
    const { data: product, error } = await supabase
      .from('products')
      .select('product_id, image_url, r2_image_url')
      .eq('product_id', productId)
      .single();

    if (error || !product) {
      return {
        product_id: productId,
        success: false,
        error: 'Product not found in database',
        timestamp
      };
    }

    const imageUrl = product.r2_image_url || product.image_url;
    if (!imageUrl) {
      return {
        product_id: productId,
        success: false,
        error: 'No image URL available',
        timestamp
      };
    }

    // Extract materials from image
    const extracted = await extractMaterialsFromImage(imageUrl);

    if (!extracted || extracted.materials.length === 0) {
      return {
        product_id: productId,
        success: false,
        error: 'No materials extracted from image',
        timestamp
      };
    }

    // Update product in database
    const { error: updateError } = await supabase
      .from('products')
      .update({
        materials: extracted.materials,
        materials_source: 'vision-ai',
        materials_confidence: Math.round(extracted.confidence * 100),
        extraction_source: 'vision-ai',
        updated_at: timestamp
      })
      .eq('product_id', productId);

    if (updateError) {
      return {
        product_id: productId,
        success: false,
        error: `Database update failed: ${updateError.message}`,
        timestamp
      };
    }

    return {
      product_id: productId,
      success: true,
      materials: extracted.materials,
      confidence: extracted.confidence,
      timestamp
    };

  } catch (error) {
    return {
      product_id: productId,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp
    };
  }
}

// ============================================================================
// MAIN PROCESSING
// ============================================================================

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const resume = args.includes('--resume');
  const limitArg = args.find(arg => arg.startsWith('--limit'));
  const limit = limitArg ? parseInt(limitArg.split('=')[1]) : undefined;

  console.log('🎨 VISION OUTFIT PRODUCTS - MATERIALS TAGGING');
  console.log('='.repeat(70));
  console.log('');
  console.log('Model:', GEMINI_MODEL);
  console.log('Mode:', dryRun ? 'DRY RUN (no database writes)' : 'LIVE');
  console.log('Rate limit:', `${60000 / RATE_LIMIT_DELAY} requests/min`);
  if (limit) console.log('Limit:', limit, 'products');
  console.log('');

  // Load or create checkpoint
  let checkpoint: Checkpoint;

  if (resume) {
    const loaded = loadCheckpoint();
    if (loaded) {
      console.log('📂 Resuming from checkpoint...');
      console.log(`   Already processed: ${loaded.totalProcessed} products`);
      console.log(`   Successful: ${loaded.successful}`);
      console.log(`   Failed: ${loaded.failed}`);
      console.log('');
      checkpoint = loaded;
    } else {
      console.log('⚠️  No checkpoint found, starting fresh');
      checkpoint = {
        processedIds: [],
        lastProcessedIndex: 0,
        totalProcessed: 0,
        successful: 0,
        failed: 0,
        startedAt: new Date().toISOString(),
        lastUpdatedAt: new Date().toISOString()
      };
    }
  } else {
    checkpoint = {
      processedIds: [],
      lastProcessedIndex: 0,
      totalProcessed: 0,
      successful: 0,
      failed: 0,
      startedAt: new Date().toISOString(),
      lastUpdatedAt: new Date().toISOString()
    };
  }

  // Get products to tag
  const productsToTag = await getProductsNeedingMaterials(limit);

  if (productsToTag.length === 0) {
    console.log('\n✅ No products need tagging!');
    return;
  }

  // Filter out already processed
  const remaining = productsToTag.filter(id => !checkpoint.processedIds.includes(id));

  if (remaining.length === 0) {
    console.log('\n✅ All products already processed!');
    return;
  }

  console.log('\n📊 PROCESSING PLAN:');
  console.log(`   Total products: ${productsToTag.length}`);
  if (resume && checkpoint.processedIds.length > 0) {
    console.log(`   Already processed: ${checkpoint.processedIds.length}`);
  }
  console.log(`   Remaining: ${remaining.length}`);
  console.log(`   Estimated cost: $${(remaining.length * 0.00015).toFixed(2)}`);
  console.log(`   Estimated time: ~${Math.ceil(remaining.length / 10)} minutes`);
  console.log('');

  if (!dryRun) {
    console.log('⏳ Starting in 5 seconds... (Ctrl+C to cancel)');
    await new Promise(resolve => setTimeout(resolve, 5000));
  }

  console.log('\n🚀 Starting processing...\n');

  // Process products
  for (let i = 0; i < remaining.length; i++) {
    const productId = remaining[i];
    const progress = `[${checkpoint.totalProcessed + 1}/${productsToTag.length}]`;

    console.log(`${progress} Processing ${productId}...`);

    if (dryRun) {
      console.log('   [DRY RUN] Skipping actual tagging');
      await new Promise(resolve => setTimeout(resolve, 100));
    } else {
      const result = await tagProduct(productId);

      if (result.success) {
        console.log(`   ✅ Success: ${result.materials?.join(', ')} (confidence: ${((result.confidence || 0) * 100).toFixed(0)}%)`);
        checkpoint.successful++;
      } else {
        console.log(`   ❌ Failed: ${result.error}`);
        checkpoint.failed++;
      }

      appendResult(result);

      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_DELAY));
    }

    // Update checkpoint
    checkpoint.processedIds.push(productId);
    checkpoint.totalProcessed++;
    checkpoint.lastProcessedIndex = i;
    checkpoint.lastUpdatedAt = new Date().toISOString();

    // Save checkpoint every BATCH_SIZE products
    if (checkpoint.totalProcessed % BATCH_SIZE === 0) {
      saveCheckpoint(checkpoint);
      console.log(`   💾 Checkpoint saved (${checkpoint.totalProcessed} processed)`);
    }
  }

  // Final save
  saveCheckpoint(checkpoint);

  console.log('');
  console.log('='.repeat(70));
  console.log('✅ PROCESSING COMPLETE');
  console.log('='.repeat(70));
  console.log('');
  console.log('RESULTS:');
  console.log(`   Total processed: ${checkpoint.totalProcessed}`);
  console.log(`   Successful: ${checkpoint.successful} (${(checkpoint.successful / checkpoint.totalProcessed * 100).toFixed(1)}%)`);
  console.log(`   Failed: ${checkpoint.failed} (${(checkpoint.failed / checkpoint.totalProcessed * 100).toFixed(1)}%)`);
  console.log('');
  console.log(`Results saved to: ${RESULTS_FILE}`);
  console.log(`Checkpoint saved to: ${CHECKPOINT_FILE}`);
  console.log('');

  if (!dryRun) {
    console.log('✨ Next step: Re-tag vision outfits with complete product data');
    console.log('   Expected improvement: 70% → 85-90% success rate');
  }
}

// ============================================================================
// RUN
// ============================================================================

main().catch(error => {
  console.error('\n❌ Fatal error:', error);
  process.exit(1);
});
