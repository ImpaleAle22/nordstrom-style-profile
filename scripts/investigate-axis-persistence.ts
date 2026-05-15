/**
 * Investigate Axis Persistence Bug - Workstream 2 Task 2
 *
 * Why do only 5.4% of outfits have all four axes populated when 13.6% have attributes?
 *
 * Samples 100 v1-tagged outfits and analyzes what's missing.
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface AxisCoverage {
  hasFormality: boolean;
  hasActivityContext: boolean;
  hasSeason: boolean;
  hasSocialRegister: boolean;
  allFourPresent: boolean;
  attributesShape: string;
}

async function investigatePersistence() {
  console.log('=== AXIS PERSISTENCE INVESTIGATION ===\n');
  console.log('Sampling 100 outfits with taggerVersion: "v1"...\n');

  // Fetch 100 v1-tagged outfits
  const { data: outfits, error } = await supabase
    .from('outfits')
    .select('outfit_id, attributes')
    .not('attributes', 'is', null)
    .eq('attributes->>taggerVersion', 'v1')
    .limit(100);

  if (error) {
    console.error('Error fetching outfits:', error);
    process.exit(1);
  }

  if (!outfits || outfits.length === 0) {
    console.error('No v1-tagged outfits found');
    process.exit(1);
  }

  console.log(`Fetched ${outfits.length} v1-tagged outfits\n`);

  // Analyze each outfit
  const coverage: AxisCoverage[] = [];
  const shapeExamples: Record<string, any[]> = {};

  for (const outfit of outfits) {
    const attrs = outfit.attributes;

    const hasFormality = attrs.formality !== undefined && attrs.formality !== null;
    const hasActivityContext = attrs.activityContext !== undefined && attrs.activityContext !== null;
    const hasSeason = attrs.season !== undefined && attrs.season !== null;
    const hasSocialRegister = attrs.socialRegister !== undefined && attrs.socialRegister !== null;
    const allFourPresent = hasFormality && hasActivityContext && hasSeason && hasSocialRegister;

    // Create shape signature
    const shape = [
      hasFormality ? 'F' : '-',
      hasActivityContext ? 'A' : '-',
      hasSeason ? 'S' : '-',
      hasSocialRegister ? 'R' : '-',
    ].join('');

    coverage.push({
      hasFormality,
      hasActivityContext,
      hasSeason,
      hasSocialRegister,
      allFourPresent,
      attributesShape: shape,
    });

    // Collect examples of each shape
    if (!shapeExamples[shape]) {
      shapeExamples[shape] = [];
    }
    if (shapeExamples[shape].length < 3) {
      shapeExamples[shape].push({
        outfit_id: outfit.outfit_id,
        attributes: attrs,
      });
    }
  }

  // Aggregate statistics
  const stats = {
    total: coverage.length,
    allFour: coverage.filter(c => c.allFourPresent).length,
    hasFormality: coverage.filter(c => c.hasFormality).length,
    hasActivityContext: coverage.filter(c => c.hasActivityContext).length,
    hasSeason: coverage.filter(c => c.hasSeason).length,
    hasSocialRegister: coverage.filter(c => c.hasSocialRegister).length,
  };

  console.log('=== COVERAGE STATISTICS ===\n');
  console.log(`Total sampled: ${stats.total}`);
  console.log(`All four axes present: ${stats.allFour} (${((stats.allFour / stats.total) * 100).toFixed(1)}%)`);
  console.log(`Has formality: ${stats.hasFormality} (${((stats.hasFormality / stats.total) * 100).toFixed(1)}%)`);
  console.log(`Has activityContext: ${stats.hasActivityContext} (${((stats.hasActivityContext / stats.total) * 100).toFixed(1)}%)`);
  console.log(`Has season: ${stats.hasSeason} (${((stats.hasSeason / stats.total) * 100).toFixed(1)}%)`);
  console.log(`Has socialRegister: ${stats.hasSocialRegister} (${((stats.hasSocialRegister / stats.total) * 100).toFixed(1)}%)`);
  console.log();

  // Shape distribution
  const shapeCounts = coverage.reduce((acc, c) => {
    acc[c.attributesShape] = (acc[c.attributesShape] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const sortedShapes = Object.entries(shapeCounts).sort((a, b) => b[1] - a[1]);

  console.log('=== SHAPE DISTRIBUTION ===\n');
  console.log('Legend: F=formality, A=activityContext, S=season, R=socialRegister, -=missing\n');
  for (const [shape, count] of sortedShapes) {
    const pct = ((count / stats.total) * 100).toFixed(1);
    console.log(`${shape}: ${count} outfits (${pct}%)`);
  }
  console.log();

  // Root cause analysis
  console.log('=== ROOT CAUSE ANALYSIS ===\n');

  // Check most common incomplete shapes
  const incompleteShapes = sortedShapes.filter(([shape]) => shape !== 'FASR');

  if (incompleteShapes.length > 0) {
    console.log('Most common incomplete patterns:\n');

    for (const [shape, count] of incompleteShapes.slice(0, 5)) {
      const examples = shapeExamples[shape] || [];
      const pct = ((count / stats.total) * 100).toFixed(1);
      console.log(`\n${shape} (${count} outfits, ${pct}%):`);

      if (examples.length > 0) {
        const example = examples[0];
        console.log(`  Example outfit_id: ${example.outfit_id}`);
        console.log(`  Has stylePillar: ${example.attributes.stylePillar !== undefined}`);
        console.log(`  Has vibes: ${example.attributes.vibes !== undefined}`);
        console.log(`  Has occasions: ${example.attributes.occasions !== undefined}`);
        console.log(`  Keys present: ${Object.keys(example.attributes).join(', ')}`);

        // Check for common patterns
        const attrs = example.attributes;

        if (!attrs.formality && !attrs.activityContext && !attrs.season && !attrs.socialRegister) {
          console.log('  → ALL FOUR AXES MISSING (likely tagged with old version)');
        } else if (attrs.formality && !attrs.activityContext && !attrs.season && !attrs.socialRegister) {
          console.log('  → Only formality present (partial implementation?)');
        } else if (!attrs.formality && !attrs.activityContext && !attrs.season && !attrs.socialRegister) {
          console.log('  → No axes but has other attributes (pre-axis implementation)');
        }
      }
    }
  }

  console.log('\n=== HYPOTHESIS CHECK ===\n');

  // Hypothesis 1: Older v1 code wrote attributes without axes
  const noAxesAtAll = coverage.filter(c =>
    !c.hasFormality && !c.hasActivityContext && !c.hasSeason && !c.hasSocialRegister
  ).length;
  console.log(`Hypothesis 1: Pre-axis implementation`);
  console.log(`  Outfits with NO axes: ${noAxesAtAll} (${((noAxesAtAll / stats.total) * 100).toFixed(1)}%)`);

  if (noAxesAtAll > 0) {
    const example = coverage.find(c =>
      !c.hasFormality && !c.hasActivityContext && !c.hasSeason && !c.socialRegister
    );
    if (example) {
      console.log(`  → CONFIRMED: Some v1 outfits were tagged before axes were added`);
    }
  }

  // Hypothesis 2: Partial writes (some axes dropped)
  const partialWrites = coverage.filter(c =>
    (c.hasFormality || c.hasActivityContext || c.hasSeason || c.hasSocialRegister) && !c.allFourPresent
  ).length;
  console.log(`\nHypothesis 2: Partial writes (some axes dropped conditionally)`);
  console.log(`  Outfits with SOME axes but not all: ${partialWrites} (${((partialWrites / stats.total) * 100).toFixed(1)}%)`);

  if (partialWrites > 0) {
    console.log(`  → Needs investigation: Why would some axes be written but not others?`);
    console.log(`  → Check storage helper write logic, schema writer, or conditional persistence`);
  }

  // Hypothesis 3: Schema writer drops fields conditionally
  console.log(`\nHypothesis 3: Storage layer drops fields conditionally`);
  console.log(`  → Check lib/supabase-outfit-storage.ts saveOutfits() function`);
  console.log(`  → Check for any conditional logic that might drop null/undefined axis values`);

  console.log('\n=== INVESTIGATION COMPLETE ===\n');
}

investigatePersistence().catch(console.error);
