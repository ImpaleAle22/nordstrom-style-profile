/**
 * Test Sanity Connection
 *
 * Run with: npx tsx lib/test-connection.ts
 */

import { sanityClient } from './sanity-client';

async function testConnection() {
  console.log('🔍 Testing Sanity connection...\n');

  try {
    // Test 1: Fetch product count
    console.log('Test 1: Fetching product count...');
    const productCount = await sanityClient.fetch<number>(
      `count(*[_type == "product"])`
    );
    console.log(`✅ Found ${productCount} products\n`);

    // Test 2: Fetch a sample product
    console.log('Test 2: Fetching sample product...');
    const sampleProduct = await sanityClient.fetch(
      `*[_type == "product"][0] { title, brand, productType1 }`
    );
    console.log(`✅ Sample product:`, sampleProduct, '\n');

    // Test 3: Fetch brands
    console.log('Test 3: Fetching brands...');
    const brands = await sanityClient.fetch<string[]>(
      `*[_type == "product" && defined(brand)][0...5].brand`
    );
    console.log(`✅ Sample brands:`, brands, '\n');

    // Test 4: Check for existing recipes
    console.log('Test 4: Checking for outfit recipes...');
    const recipeCount = await sanityClient.fetch<number>(
      `count(*[_type == "outfitRecipe"])`
    );
    console.log(`✅ Found ${recipeCount} outfit recipes\n`);

    // Test 5: Check for ingredient sets
    console.log('Test 5: Checking for ingredient sets...');
    const ingredientCount = await sanityClient.fetch<number>(
      `count(*[_type == "ingredientSet"])`
    );
    console.log(`✅ Found ${ingredientCount} ingredient sets\n`);

    console.log('✅ All tests passed! Sanity connection is working.\n');
    console.log('📝 Summary:');
    console.log(`   - Products: ${productCount}`);
    console.log(`   - Recipes: ${recipeCount}`);
    console.log(`   - Ingredient Sets: ${ingredientCount}`);
    console.log('\n🎉 Ready to build recipes!\n');
  } catch (error) {
    console.error('\n❌ Connection test failed!');
    console.error('Error:', error);
    console.error('\n💡 Troubleshooting:');
    console.error('   1. Check that .env.local exists');
    console.error('   2. Verify SANITY_PROJECT_ID is correct (should be: qqgs5pib)');
    console.error('   3. Make sure products are imported to Sanity');
    console.error('   4. Run: npm run import:ai-enriched (from scripts/ directory)');
    process.exit(1);
  }
}

testConnection();
