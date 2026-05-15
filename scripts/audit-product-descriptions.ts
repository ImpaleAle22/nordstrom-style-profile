#!/usr/bin/env tsx
/**
 * Product Description Audit Script
 *
 * Analyzes H&M product descriptions to identify rule-extractable attributes.
 * Goal: Build a hybrid rules → AI → confidence system for product tagging.
 *
 * Usage:
 *   npx tsx scripts/audit-product-descriptions.ts [sample-size]
 *
 * Sample size defaults to 200 products.
 */

import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables from .env.local
config({ path: resolve(process.cwd(), '.env.local') });

import { createClient } from '@supabase/supabase-js';

// Initialize Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

interface Product {
  id: string;
  title: string;
  brand: string;
  description?: string;
  product_type_1?: string;
  product_type_2?: string;
  materials?: string[];
  simplified_colors?: string[];
  price?: number;
}

interface AuditResult {
  totalProducts: number;
  withDescriptions: number;
  descriptionCoverage: number;

  // Pattern detection
  patterns: {
    materials: Map<string, number>;
    silhouettes: Map<string, number>;
    fits: Map<string, number>;
    lengths: Map<string, number>;
    necklines: Map<string, number>;
    sleeves: Map<string, number>;
    details: Map<string, number>;
    occasions: Map<string, number>;
    seasons: Map<string, number>;
  };

  // Rules potential
  rulesExtractable: {
    material: number;
    silhouette: number;
    fit: number;
    length: number;
    neckline: number;
    sleeve: number;
    detail: number;
    occasion: number;
    season: number;
  };

  // Sample descriptions
  samples: Array<{
    title: string;
    description: string;
    extractedAttributes: string[];
  }>;
}

// Pattern dictionaries for rule-based extraction
const PATTERNS = {
  materials: [
    'cotton', 'polyester', 'wool', 'silk', 'linen', 'cashmere', 'leather',
    'suede', 'denim', 'jersey', 'fleece', 'nylon', 'spandex', 'rayon',
    'viscose', 'modal', 'acrylic', 'satin', 'chiffon', 'velvet', 'corduroy',
    'twill', 'canvas', 'knit', 'woven', 'mesh'
  ],

  silhouettes: [
    'a-line', 'bodycon', 'wrap', 'shift', 'sheath', 'fit and flare', 'empire',
    'peplum', 'straight', 'relaxed', 'oversized', 'slim', 'tailored', 'boxy',
    'cocoon', 'pencil', 'flared', 'wide-leg', 'bootcut', 'skinny', 'boyfriend'
  ],

  fits: [
    'fitted', 'relaxed', 'oversized', 'loose', 'tight', 'regular fit',
    'slim fit', 'loose fit', 'comfort fit', 'athletic fit', 'tailored fit',
    'classic fit', 'modern fit', 'generous fit', 'snug', 'form-fitting'
  ],

  lengths: [
    'cropped', 'mini', 'short', 'above knee', 'knee-length', 'midi', 'maxi',
    'ankle-length', 'floor-length', 'calf-length', 'hip-length', 'thigh-high',
    'regular length', 'long', 'tunic', 'longline'
  ],

  necklines: [
    'v-neck', 'crew neck', 'scoop neck', 'square neck', 'boat neck', 'cowl neck',
    'halter', 'off-shoulder', 'one-shoulder', 'strapless', 'high neck', 'mock neck',
    'turtleneck', 'collared', 'keyhole', 'sweetheart', 'plunging', 'round neck'
  ],

  sleeves: [
    'sleeveless', 'short sleeve', 'long sleeve', 'cap sleeve', '3/4 sleeve',
    'bell sleeve', 'puff sleeve', 'balloon sleeve', 'flutter sleeve', 'raglan',
    'dolman', 'batwing', 'bishop sleeve', 'lantern sleeve', 'kimono sleeve',
    'cold shoulder', 'off-shoulder sleeve'
  ],

  details: [
    'ruffles', 'pleats', 'ruching', 'smocking', 'embroidered', 'beaded', 'sequined',
    'lace', 'cutout', 'tie-front', 'button-down', 'zipper', 'drawstring', 'belted',
    'pockets', 'split', 'slit', 'gathered', 'tiered', 'asymmetric', 'wrap-tie',
    'fringe', 'tassels', 'studs', 'ribbed', 'cable knit', 'printed', 'striped',
    'polka dot', 'floral', 'geometric', 'solid', 'pattern'
  ],

  occasions: [
    'casual', 'work', 'office', 'business', 'formal', 'evening', 'party',
    'cocktail', 'date', 'weekend', 'vacation', 'travel', 'lounge', 'athletic',
    'workout', 'gym', 'yoga', 'running', 'outdoor', 'everyday', 'special occasion'
  ],

  seasons: [
    'spring', 'summer', 'fall', 'autumn', 'winter', 'all-season', 'transitional',
    'warm weather', 'cold weather', 'layering'
  ]
};

/**
 * Extract patterns from description text
 */
function extractPatterns(description: string): Map<string, string[]> {
  const found = new Map<string, string[]>();
  const lowerDesc = description.toLowerCase();

  for (const [category, keywords] of Object.entries(PATTERNS)) {
    const matches: string[] = [];

    for (const keyword of keywords) {
      // Look for whole word matches (not substrings)
      const regex = new RegExp(`\\b${keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
      if (regex.test(lowerDesc)) {
        matches.push(keyword);
      }
    }

    if (matches.length > 0) {
      found.set(category, matches);
    }
  }

  return found;
}

/**
 * Analyze a sample of products
 */
async function auditProducts(sampleSize: number = 200): Promise<AuditResult> {
  console.log(`\n🔍 Auditing ${sampleSize} products...\n`);

  // Fetch random sample of H&M products
  const { data: products, error } = await supabase
    .from('products')
    .select('id, title, brand, description, product_type_1, product_type_2, materials, simplified_colors, price')
    .eq('brand', 'H&M')
    .not('description', 'is', null)
    .limit(sampleSize);

  if (error) {
    throw new Error(`Failed to fetch products: ${error.message}`);
  }

  if (!products || products.length === 0) {
    throw new Error('No products found');
  }

  console.log(`✓ Loaded ${products.length} H&M products with descriptions\n`);

  // Initialize result
  const result: AuditResult = {
    totalProducts: products.length,
    withDescriptions: products.filter(p => p.description).length,
    descriptionCoverage: 0,
    patterns: {
      materials: new Map(),
      silhouettes: new Map(),
      fits: new Map(),
      lengths: new Map(),
      necklines: new Map(),
      sleeves: new Map(),
      details: new Map(),
      occasions: new Map(),
      seasons: new Map(),
    },
    rulesExtractable: {
      material: 0,
      silhouette: 0,
      fit: 0,
      length: 0,
      neckline: 0,
      sleeve: 0,
      detail: 0,
      occasion: 0,
      season: 0,
    },
    samples: [],
  };

  result.descriptionCoverage = (result.withDescriptions / result.totalProducts) * 100;

  // Analyze each product
  let processedCount = 0;

  for (const product of products) {
    if (!product.description) continue;

    const patterns = extractPatterns(product.description);
    const extractedAttrs: string[] = [];

    // Count pattern occurrences
    for (const [category, matches] of patterns.entries()) {
      const patternMap = result.patterns[category as keyof typeof result.patterns];

      for (const match of matches) {
        patternMap.set(match, (patternMap.get(match) || 0) + 1);
        extractedAttrs.push(`${category}: ${match}`);
      }

      // Track rules-extractable count
      if (matches.length > 0) {
        result.rulesExtractable[category as keyof typeof result.rulesExtractable]++;
      }
    }

    // Collect samples (first 10 with good extraction)
    if (result.samples.length < 10 && extractedAttrs.length >= 3) {
      result.samples.push({
        title: product.title,
        description: product.description.substring(0, 200) + '...',
        extractedAttributes: extractedAttrs,
      });
    }

    processedCount++;
    if (processedCount % 50 === 0) {
      console.log(`   Processed ${processedCount}/${products.length} products...`);
    }
  }

  return result;
}

/**
 * Print audit report
 */
function printReport(result: AuditResult) {
  console.log('\n' + '='.repeat(80));
  console.log('📊 PRODUCT DESCRIPTION AUDIT REPORT');
  console.log('='.repeat(80) + '\n');

  // Coverage
  console.log('📋 Coverage:');
  console.log(`   Total products: ${result.totalProducts}`);
  console.log(`   With descriptions: ${result.withDescriptions} (${result.descriptionCoverage.toFixed(1)}%)`);
  console.log('');

  // Rules extractability
  console.log('🔧 Rules-Extractable Attributes:');
  console.log('   (% of products where rules found at least one match)\n');

  const extractableCategories = Object.entries(result.rulesExtractable)
    .map(([category, count]) => ({
      category,
      count,
      percentage: (count / result.totalProducts) * 100,
    }))
    .sort((a, b) => b.percentage - a.percentage);

  for (const { category, count, percentage } of extractableCategories) {
    const bar = '█'.repeat(Math.floor(percentage / 2));
    console.log(`   ${category.padEnd(12)} ${bar} ${percentage.toFixed(1)}% (${count})`);
  }

  // Top patterns by category
  console.log('\n🏷️  Most Common Patterns:\n');

  for (const [category, patternMap] of Object.entries(result.patterns)) {
    const topPatterns = Array.from(patternMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    if (topPatterns.length > 0) {
      console.log(`   ${category.toUpperCase()}:`);
      for (const [pattern, count] of topPatterns) {
        console.log(`      - ${pattern}: ${count} products`);
      }
      console.log('');
    }
  }

  // Sample extractions
  console.log('📝 Sample Extractions:\n');

  for (const sample of result.samples.slice(0, 5)) {
    console.log(`   "${sample.title}"`);
    console.log(`   Description: ${sample.description}`);
    console.log(`   Extracted: ${sample.extractedAttributes.join(', ')}`);
    console.log('');
  }

  // Recommendations
  console.log('='.repeat(80));
  console.log('💡 RECOMMENDATIONS\n');

  const avgExtractability = extractableCategories.reduce((sum, cat) => sum + cat.percentage, 0) / extractableCategories.length;

  if (avgExtractability >= 50) {
    console.log('✅ STRONG RULES POTENTIAL - Worth building hybrid system!');
    console.log(`   Average extractability: ${avgExtractability.toFixed(1)}%`);
    console.log('');
    console.log('   Next steps:');
    console.log('   1. Build rules layer for high-coverage attributes (materials, details, fits)');
    console.log('   2. Use AI to fill gaps for low-coverage attributes (occasions, seasons)');
    console.log('   3. Pass description + image to AI for verification when confidence < 70%');
    console.log('   4. Track confidence scores for each attribute');
    console.log('   5. Create feedback loop to improve rules over time');
  } else if (avgExtractability >= 30) {
    console.log('🟡 MODERATE RULES POTENTIAL - Hybrid worth considering');
    console.log(`   Average extractability: ${avgExtractability.toFixed(1)}%`);
    console.log('');
    console.log('   Focus on high-value categories (materials, details) with rules first');
  } else {
    console.log('⚠️  LOW RULES POTENTIAL - AI-first may be better');
    console.log(`   Average extractability: ${avgExtractability.toFixed(1)}%`);
    console.log('');
    console.log('   Consider pure AI tagging with confidence scoring');
  }

  console.log('\n' + '='.repeat(80) + '\n');
}

/**
 * Main execution
 */
async function main() {
  const sampleSize = parseInt(process.argv[2]) || 200;

  console.log('🚀 Product Description Audit Tool');
  console.log('   Building case for hybrid rules → AI → confidence system\n');

  try {
    const result = await auditProducts(sampleSize);
    printReport(result);

    // Save detailed results
    const fs = await import('fs/promises');
    await fs.writeFile(
      'product-description-audit.json',
      JSON.stringify(result, (key, value) =>
        value instanceof Map ? Array.from(value.entries()) : value
      , 2)
    );

    console.log('💾 Detailed results saved to: product-description-audit.json\n');

  } catch (error) {
    console.error('❌ Audit failed:', error);
    process.exit(1);
  }
}

main();
