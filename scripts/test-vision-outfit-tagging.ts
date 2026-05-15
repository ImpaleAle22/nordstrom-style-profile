#!/usr/bin/env ts-node
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function testVisionOutfitTagging() {
  console.log('\n🧪 Testing Vision Outfit Tagging with Updated Products\n');
  console.log('Starting batch job for 10 vision outfits...\n');

  // Start the batch
  const startResponse = await fetch('http://localhost:3002/api/admin/tagging-v2/run-batch', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      filters: {
        productTypes: [],  // No product filter = all products
        colors: [],
        materials: [],
        patterns: [],
        denimWashes: [],
        department: 'all',
        excludeTagged: true
      },
      runControls: {
        mode: 'dry-run',
        batchSize: 10,
        balancedBy: 'none',
        samplesPerGroup: 0
      }
    })
  });

  if (!startResponse.ok) {
    console.error('API Error:', startResponse.status, startResponse.statusText);
    const text = await startResponse.text();
    console.error('Response:', text);
    return;
  }

  const startResult = await startResponse.json();
  const sessionId = startResult.sessionId;
  
  console.log(`✓ Batch started (session: ${sessionId})`);
  console.log('   Waiting for completion...\n');

  // Poll for progress
  let attempts = 0;
  const maxAttempts = 60; // 60 seconds max
  
  while (attempts < maxAttempts) {
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const progressResponse = await fetch(`http://localhost:3002/api/admin/tagging-v2/run-batch?sessionId=${sessionId}`);
    
    if (!progressResponse.ok) {
      console.error('Progress check failed');
      break;
    }
    
    const progressData = await progressResponse.json();
    const progress = progressData.progress;
    
    if (progress.phase === 'complete') {
      console.log('\n╔═══════════════════════════════════════════════╗');
      console.log('║   TEST BATCH RESULTS (vision outfits)       ║');
      console.log('╚═══════════════════════════════════════════════╝\n');
      
      const results = progress.results;
      const total = results.successful + results.failed;
      
      console.log(`Total processed: ${total}`);
      console.log(`  ✅ Successful: ${results.successful} (${(results.successful / total * 100).toFixed(1)}%)`);
      console.log(`  ⚠️  Needs review: ${results.needsReview} (${(results.needsReview / total * 100).toFixed(1)}%)`);
      console.log(`  ❌ Failed: ${results.failed}\n`);
      
      if (results.pillarDistribution && Object.keys(results.pillarDistribution).length > 0) {
        console.log('Pillar Distribution:');
        Object.entries(results.pillarDistribution).forEach(([pillar, count]) => {
          console.log(`  ${pillar}: ${count}`);
        });
        console.log('');
      }
      
      const successRate = (results.successful / total * 100).toFixed(1);
      const target = 85;
      
      if (parseFloat(successRate) >= target) {
        console.log(`✅ SUCCESS RATE ${successRate}% exceeds ${target}% target!`);
        console.log('   Product materials fix is working!\n');
        console.log('   Ready to proceed with full batch of 12,961 outfits.\n');
      } else {
        console.log(`⚠️  SUCCESS RATE ${successRate}% below ${target}% target.`);
        console.log('   May need investigation before full batch.\n');
      }
      
      return;
    }
    
    if (progress.phase === 'error') {
      console.error('\n❌ Batch failed:', progress.error);
      return;
    }
    
    if (progress.phase === 'tagging') {
      process.stdout.write(`\r   Progress: ${progress.current}/${progress.total} (${progress.percent.toFixed(1)}%)`);
    }
    
    attempts++;
  }
  
  console.log('\n⏱️ Timeout waiting for completion');
}

testVisionOutfitTagging().catch(console.error);
