/**
 * Test script for recipe cooking system
 * Run with: npx tsx lib/recipe-cooking/test-cooking.ts
 */

import { cookRecipe } from './index';
import type { UnifiedRecipe } from '../unified-recipe-types';

// Mock recipe for testing
const testRecipe: UnifiedRecipe = {
  id: 'hiking_womens_test_01',
  title: 'Casual Hiking Outfit - Womens',
  status: 'draft',
  department: 'Womenswear',
  slotCount: 4,
  seasons: ['Spring'],
  createdAt: new Date().toISOString(),
  source: 'manual',
  slots: [
    {
      role: 'tops',
      ingredient: {
        ingredientTitle: 'Casual T-Shirt',
        searchQuery: 'womens casual t-shirt cotton',
        productTypes: ['Tops'],
        materials: ['Cotton'],
        brands: [],
      },
    },
    {
      role: 'bottoms',
      ingredient: {
        ingredientTitle: 'Hiking Pants',
        searchQuery: 'womens hiking pants outdoor',
        productTypes: ['Bottoms'],
        materials: [],
        brands: [],
      },
    },
    {
      role: 'shoes',
      ingredient: {
        ingredientTitle: 'Trail Sneakers',
        searchQuery: 'womens trail running sneakers',
        productTypes: ['Shoes'],
        materials: [],
        brands: [],
      },
    },
    {
      role: 'accessories',
      ingredient: {
        ingredientTitle: 'Crossbody Bag',
        searchQuery: 'crossbody bag small',
        productTypes: ['Accessories'],
        materials: [],
        brands: [],
      },
    },
  ],
};

async function runTest() {
  console.log('🧪 Testing Recipe Cooking System\n');

  try {
    // Test with random sampling first (no AI required)
    console.log('Test 1: Random Sampling Strategy');
    console.log('================================\n');
    const result1 = await cookRecipe(testRecipe, {
      strategy: 'random-sampling',
      targetCount: 10,
      productsPerIngredient: 15,
      minConfidence: 50,
      saveToSanity: false,
    });

    console.log('\nTest 1 Results:');
    console.log(`✓ Generated ${result1.stats.totalPassed} outfits`);
    console.log(`✓ Primary: ${result1.stats.primary}`);
    console.log(`✓ Secondary: ${result1.stats.secondary}`);
    console.log('\nTop 3 outfits:');
    result1.outfits.slice(0, 3).forEach((outfit, idx) => {
      console.log(`  ${idx + 1}. Score: ${outfit.confidenceScore} (${outfit.poolTier})`);
      outfit.items.forEach((item) => {
        console.log(`     - ${item.role}: ${item.product.brand} ${item.product.title}`);
      });
    });

    // Test with Gemini (requires API key)
    if (process.env.GOOGLE_API_KEY) {
      console.log('\n\nTest 2: Gemini Flash Lite Strategy');
      console.log('===================================\n');
      const result2 = await cookRecipe(testRecipe, {
        strategy: 'gemini-flash-lite',
        targetCount: 10,
        productsPerIngredient: 15,
        minConfidence: 50,
        saveToSanity: false,
      });

      console.log('\nTest 2 Results:');
      console.log(`✓ Generated ${result2.stats.totalPassed} outfits`);
      console.log(`✓ Primary: ${result2.stats.primary}`);
      console.log(`✓ Secondary: ${result2.stats.secondary}`);
      console.log('\nTop outfit with AI reasoning:');
      const top = result2.outfits[0];
      console.log(`  Score: ${top.confidenceScore} (${top.poolTier})`);
      if (top.reasoning) {
        console.log(`  AI: "${top.reasoning}"`);
      }
      top.items.forEach((item) => {
        console.log(`  - ${item.role}: ${item.product.brand} ${item.product.title}`);
      });
    } else {
      console.log('\n⚠️  Skipping Gemini test (GOOGLE_API_KEY not set)');
    }

    console.log('\n\n✅ All tests passed!');
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  }
}

// Run tests
runTest();
