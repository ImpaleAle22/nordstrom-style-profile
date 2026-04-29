/**
 * Test AI Model Availability
 *
 * Run this to verify which Gemini models are actually available with your API key.
 *
 * Usage:
 *   npx tsx lib/recipe-cooking/test-model-availability.ts
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Load environment variables from .env.local manually
try {
  const envPath = join(process.cwd(), '.env.local');
  const envFile = readFileSync(envPath, 'utf-8');
  envFile.split('\n').forEach(line => {
    const [key, ...valueParts] = line.split('=');
    if (key && valueParts.length > 0) {
      const value = valueParts.join('=').trim();
      process.env[key.trim()] = value;
    }
  });
} catch (error) {
  console.warn('⚠️  Could not load .env.local, using existing environment variables');
}

const MODELS_TO_TEST = [
  'gemini-1.5-flash',
  'gemini-1.5-pro',
  'gemini-2.5-flash-lite',
  'gemini-2.0-flash-exp',
  'gemini-1.5-flash-latest',
  'gemini-pro',
];

async function testModel(modelId: string): Promise<boolean> {
  try {
    const apiKey = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY;
    if (!apiKey) {
      console.error('❌ GEMINI_API_KEY not set');
      process.exit(1);
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: modelId,
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 100,
      },
    });

    // Try a simple generation
    const result = await model.generateContent([{ text: 'Say "test"' }]);
    const response = result.response.text();

    return response.length > 0;
  } catch (error: any) {
    if (error.message?.includes('404') || error.message?.includes('not found')) {
      return false;
    }
    // Other errors (auth, quota, etc) - rethrow
    throw error;
  }
}

async function main() {
  console.log('🧪 Testing Gemini Model Availability\n');
  console.log('=' .repeat(60));

  const results: { model: string; available: boolean }[] = [];

  for (const modelId of MODELS_TO_TEST) {
    process.stdout.write(`Testing ${modelId.padEnd(30)}... `);

    try {
      const available = await testModel(modelId);
      results.push({ model: modelId, available });

      if (available) {
        console.log('✅ AVAILABLE');
      } else {
        console.log('❌ NOT FOUND');
      }
    } catch (error: any) {
      console.log(`⚠️  ERROR: ${error.message}`);
      results.push({ model: modelId, available: false });
    }
  }

  console.log('=' .repeat(60));
  console.log('\n📊 SUMMARY\n');

  const available = results.filter(r => r.available);
  const unavailable = results.filter(r => !r.available);

  console.log('✅ Available Models:');
  if (available.length === 0) {
    console.log('   (none)');
  } else {
    available.forEach(r => console.log(`   - ${r.model}`));
  }

  console.log('\n❌ Unavailable Models:');
  if (unavailable.length === 0) {
    console.log('   (none)');
  } else {
    unavailable.forEach(r => console.log(`   - ${r.model}`));
  }

  console.log('\n💡 RECOMMENDED MODEL FOR PRODUCTION:');
  if (available.length > 0) {
    console.log(`   ${available[0].model}`);
    console.log('\n   Update lib/recipe-cooking/strategies/gemini-flash-lite.ts');
    console.log(`   to use: model: '${available[0].model}'`);
  } else {
    console.log('   No models available! Check your API key.');
  }

  console.log('\n📝 Update AI-MODEL-REFERENCE.md with these results.\n');
}

main().catch((error) => {
  console.error('\n❌ FATAL ERROR:', error.message);
  process.exit(1);
});
