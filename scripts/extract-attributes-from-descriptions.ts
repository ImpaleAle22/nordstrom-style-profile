#!/usr/bin/env tsx
/**
 * Extract Attributes from H&M Descriptions - Rules-Based Tagging
 *
 * Reads H&M Kaggle products and extracts structured attributes from
 * unstructured description text using pattern matching.
 *
 * Updates Supabase products table with extracted attributes.
 *
 * Usage:
 *   npx tsx scripts/extract-attributes-from-descriptions.ts [--dry-run] [--limit N]
 *
 * Options:
 *   --dry-run    Show what would be extracted without updating database
 *   --limit N    Process only N products (for testing)
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { createReadStream } from 'fs';
import { writeFileSync, existsSync, readFileSync } from 'fs';
import * as readline from 'readline';

// Load environment variables
config({ path: resolve(process.cwd(), '.env.local') });

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Path to H&M data
const HM_DATA_PATH = '/Users/hqh4/claude/edit-engine/scripts/_hm_transformed_temp.json';
const CHECKPOINT_FILE = 'extraction-checkpoint.json';
const CHECKPOINT_INTERVAL = 100;

// Extraction patterns
const PATTERNS = {
  materials: /\b(cotton|polyester|wool|silk|linen|cashmere|leather|suede|denim|jersey|fleece|nylon|spandex|rayon|viscose|modal|acrylic|satin|chiffon|velvet|corduroy|twill|canvas|knit|woven|mesh|velour|lace|sequin|beaded|stretch|ribbed|cable[ -]?knit|bouclé|crochet|terry|sweatshirt fabric|organza|taffeta|tulle|faux leather|faux fur)\b/gi,

  fit: /\b(fitted|relaxed|oversized|loose|tight|regular fit|slim fit|comfort fit|athletic fit|tailored|snug|form-fitting|body-hugging|generous)\b/gi,

  lengths: /\b(cropped|mini|short|above[ -]knee|knee[ -]length|midi|maxi|ankle[ -]length|floor[ -]length|calf[ -]length|hip[ -]length|tunic|longline|long)\b/gi,

  neckline: /\b(v-neck|crew neck|scoop neck|square neck|boat neck|cowl neck|halter|off[ -]?shoulder|one[ -]?shoulder|strapless|high neck|mock neck|turtleneck|collared|keyhole|sweetheart|plunging|round neck|wide neckline|funnel neck)\b/gi,

  sleeve_style: /\b(sleeveless|short sleeve|long sleeve|cap sleeve|3\/4 sleeve|bell sleeve|puff sleeve|balloon sleeve|flutter sleeve|raglan|dolman|batwing|bishop sleeve|lantern sleeve|kimono sleeve|cold shoulder|narrow shoulder straps|wide shoulder straps|adjustable straps)\b/gi,

  details: /\b(ruffle|pleat|ruching|smocking|embroider|bead|sequin|lace trim|cutout|tie[ -]?front|button|zipper|zip|drawstring|belt|pocket|split|slit|gather|tier|asymmetric|wrap|fringe|tassel|stud|print|stripe|polka dot|floral|geometric|ribbed hem|elasticated|chest pocket|patch pocket|snap fastener|concealed|brushed inside|soft inside|lined|unlined|padded|quilted|hood|hooded|press-stud)\b/gi,

  silhouette: /\b(a-line|bodycon|wrap|shift|sheath|fit and flare|empire|peplum|straight|pencil|flared|wide[ -]?leg|bootcut|skinny|boyfriend|mom fit|tapered)\b/gi,

  waistline: /\b(high[ -]?waist|mid[ -]?rise|low[ -]?rise|elasticated waist|drawstring waist)\b/gi,
};

interface ExtractedAttributes {
  materials?: string[];
  fit?: string;
  lengths?: string[];
  neckline?: string;
  sleeve_style?: string;
  details?: string[];
  silhouette?: string;
  waistline?: string;
  extraction_confidence: number;
  extraction_source: 'rules-description';
}

interface Product {
  product_id: string;
  description?: string;
  materials?: string[];
  fit?: string;
  neckline?: string;
  sleeve_style?: string;
  details?: string[];
  silhouette?: string;
  waistline?: string;
}

interface Checkpoint {
  processedCount: number;
  updatedCount: number;
  skippedCount: number;
  lastProductId: string;
  timestamp: string;
}

/**
 * Extract attributes from description text
 */
function extractAttributes(description: string): ExtractedAttributes | null {
  if (!description || description.length < 10) {
    return null;
  }

  const extracted: any = {
    extraction_source: 'rules-description',
    extraction_confidence: 0,
  };

  let matchCount = 0;

  // Extract materials (multiple allowed)
  const materials = new Set<string>();
  let match;
  while ((match = PATTERNS.materials.exec(description)) !== null) {
    materials.add(match[0].toLowerCase());
    matchCount++;
  }
  if (materials.size > 0) {
    extracted.materials = Array.from(materials);
  }

  // Extract fit (take first match)
  PATTERNS.fit.lastIndex = 0;
  const fitMatch = PATTERNS.fit.exec(description);
  if (fitMatch) {
    extracted.fit = fitMatch[0].toLowerCase();
    matchCount++;
  }

  // Extract neckline (take first match)
  PATTERNS.neckline.lastIndex = 0;
  const necklineMatch = PATTERNS.neckline.exec(description);
  if (necklineMatch) {
    extracted.neckline = necklineMatch[0].toLowerCase();
    matchCount++;
  }

  // Extract sleeve style (take first match)
  PATTERNS.sleeve_style.lastIndex = 0;
  const sleeveMatch = PATTERNS.sleeve_style.exec(description);
  if (sleeveMatch) {
    extracted.sleeve_style = sleeveMatch[0].toLowerCase();
    matchCount++;
  }

  // Extract silhouette (take first match)
  PATTERNS.silhouette.lastIndex = 0;
  const silhouetteMatch = PATTERNS.silhouette.exec(description);
  if (silhouetteMatch) {
    extracted.silhouette = silhouetteMatch[0].toLowerCase();
    matchCount++;
  }

  // Extract waistline (take first match)
  PATTERNS.waistline.lastIndex = 0;
  const waistlineMatch = PATTERNS.waistline.exec(description);
  if (waistlineMatch) {
    extracted.waistline = waistlineMatch[0].toLowerCase();
    matchCount++;
  }

  // Extract details (multiple allowed)
  const details = new Set<string>();
  PATTERNS.details.lastIndex = 0;
  while ((match = PATTERNS.details.exec(description)) !== null) {
    details.add(match[0].toLowerCase());
    matchCount++;
  }
  if (details.size > 0) {
    extracted.details = Array.from(details);
  }

  // Calculate confidence based on match count
  if (matchCount === 0) {
    return null;
  }

  extracted.extraction_confidence = Math.min(90, 70 + (matchCount * 5)); // 70-90% range

  return extracted as ExtractedAttributes;
}

/**
 * Load checkpoint if exists
 */
function loadCheckpoint(): Checkpoint | null {
  if (existsSync(CHECKPOINT_FILE)) {
    const data = readFileSync(CHECKPOINT_FILE, 'utf-8');
    return JSON.parse(data);
  }
  return null;
}

/**
 * Save checkpoint
 */
function saveCheckpoint(checkpoint: Checkpoint) {
  writeFileSync(CHECKPOINT_FILE, JSON.stringify(checkpoint, null, 2));
}

/**
 * Update product in Supabase
 */
async function updateProduct(productId: string, attributes: ExtractedAttributes): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('products')
      .update(attributes)
      .eq('product_id', productId);

    if (error) {
      console.error(`   ❌ Failed to update ${productId}:`, error.message);
      return false;
    }

    return true;
  } catch (error) {
    console.error(`   ❌ Error updating ${productId}:`, error);
    return false;
  }
}

/**
 * Process all products
 */
async function processProducts(dryRun: boolean = false, limit?: number) {
  console.log('\n🚀 H&M Description Attribute Extraction\n');
  console.log(`Mode: ${dryRun ? '🧪 DRY RUN' : '✅ LIVE UPDATE'}`);
  console.log(`Limit: ${limit ? `${limit} products` : 'ALL products'}`);
  console.log(`Source: ${HM_DATA_PATH}\n`);

  const checkpoint = loadCheckpoint();
  if (checkpoint) {
    console.log(`📂 Resuming from checkpoint: ${checkpoint.processedCount} processed\n`);
  }

  const stats = {
    total: 0,
    withDescriptions: 0,
    extracted: 0,
    updated: 0,
    skipped: 0,
    errors: 0,
  };

  const samples: Array<{ product_id: string; description: string; extracted: ExtractedAttributes }> = [];

  // Read file line by line
  const fileStream = createReadStream(HM_DATA_PATH);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity,
  });

  let buffer = '';
  let inArray = false;

  for await (const line of rl) {
    buffer += line;

    // Detect array start
    if (buffer.includes('[')) {
      inArray = true;
      buffer = buffer.substring(buffer.indexOf('[') + 1);
    }

    if (!inArray) continue;

    // Try to parse complete JSON objects
    const objectMatch = buffer.match(/(\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\})/);
    if (!objectMatch) continue;

    const jsonStr = objectMatch[1];
    buffer = buffer.substring(jsonStr.length + 1); // +1 for comma

    try {
      const product = JSON.parse(jsonStr);

      stats.total++;

      // Check limit
      if (limit && stats.total > limit) {
        console.log(`\n⏹️  Reached limit of ${limit} products`);
        break;
      }

      // Skip if no description
      if (!product.description || product.description.length < 10) {
        stats.skipped++;
        continue;
      }

      stats.withDescriptions++;

      // Extract attributes
      const extracted = extractAttributes(product.description);
      if (!extracted) {
        stats.skipped++;
        continue;
      }

      stats.extracted++;

      // Save sample
      if (samples.length < 10) {
        samples.push({
          product_id: product.productId,
          description: product.description,
          extracted,
        });
      }

      // Update database (if not dry run)
      if (!dryRun) {
        const success = await updateProduct(product.productId, extracted);
        if (success) {
          stats.updated++;
        } else {
          stats.errors++;
        }

        // Save checkpoint
        if (stats.updated % CHECKPOINT_INTERVAL === 0) {
          saveCheckpoint({
            processedCount: stats.total,
            updatedCount: stats.updated,
            skippedCount: stats.skipped,
            lastProductId: product.productId,
            timestamp: new Date().toISOString(),
          });
          console.log(`   💾 Checkpoint: ${stats.updated} updated...`);
        }
      }

      // Progress
      if (stats.total % 1000 === 0) {
        console.log(`   Processed ${stats.total} products (${stats.extracted} extracted, ${stats.updated} updated)...`);
      }
    } catch (error) {
      // Skip invalid JSON
      continue;
    }
  }

  // Print report
  console.log('\n' + '='.repeat(80));
  console.log('📊 EXTRACTION RESULTS');
  console.log('='.repeat(80) + '\n');

  console.log(`Total products processed: ${stats.total}`);
  console.log(`Products with descriptions: ${stats.withDescriptions} (${((stats.withDescriptions/stats.total)*100).toFixed(1)}%)`);
  console.log(`Attributes extracted: ${stats.extracted} (${((stats.extracted/stats.withDescriptions)*100).toFixed(1)}% of descriptions)`);

  if (!dryRun) {
    console.log(`Database updates: ${stats.updated}`);
    console.log(`Errors: ${stats.errors}`);
  }

  console.log('\n📝 Sample Extractions:\n');
  samples.forEach((s, i) => {
    console.log(`${i + 1}. ${s.product_id}`);
    console.log(`   Description: "${s.description.substring(0, 100)}..."`);
    console.log(`   Extracted:`);
    if (s.extracted.materials) console.log(`      • materials: ${s.extracted.materials.join(', ')}`);
    if (s.extracted.fit) console.log(`      • fit: ${s.extracted.fit}`);
    if (s.extracted.neckline) console.log(`      • neckline: ${s.extracted.neckline}`);
    if (s.extracted.sleeve_style) console.log(`      • sleeve_style: ${s.extracted.sleeve_style}`);
    if (s.extracted.silhouette) console.log(`      • silhouette: ${s.extracted.silhouette}`);
    if (s.extracted.waistline) console.log(`      • waistline: ${s.extracted.waistline}`);
    if (s.extracted.details) console.log(`      • details: ${s.extracted.details.slice(0, 5).join(', ')}`);
    console.log(`      • confidence: ${s.extracted.extraction_confidence}%`);
    console.log();
  });

  console.log('='.repeat(80) + '\n');

  if (dryRun) {
    console.log('🧪 DRY RUN COMPLETE - No database changes made');
    console.log('\nTo run for real: npx tsx scripts/extract-attributes-from-descriptions.ts\n');
  } else {
    console.log('✅ EXTRACTION COMPLETE - Database updated\n');
  }
}

/**
 * Main execution
 */
async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const limitIndex = args.indexOf('--limit');
  const limit = limitIndex !== -1 ? parseInt(args[limitIndex + 1]) : undefined;

  await processProducts(dryRun, limit);
}

main();
