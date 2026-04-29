/**
 * Pattern Auto-Approval System (Phase 2)
 * Automatically approves high-confidence patterns and adds them to formality-patterns.json
 *
 * Workflow:
 * 1. Analyze pattern candidates for coherence
 * 2. Generate pattern suggestions
 * 3. Auto-approve high-confidence patterns (10+ examples, 80%+ coherence)
 * 4. Write approved patterns to formality-patterns.json
 * 5. Notify system of new patterns
 */

import {
  getAllPatternCandidates,
  updatePatternCandidateStatus,
  type PatternCandidate,
} from '../indexeddb-storage';
import fs from 'fs';
import path from 'path';

/**
 * Pattern suggestion with coherence metrics
 */
export interface PatternSuggestion {
  id: string;
  name: string;
  description: string;
  candidates: PatternCandidate[];
  rules: {
    [role: string]: {
      minFormality?: number;
      maxFormality?: number;
      keywords?: string[];
      productTypes?: string[];
    };
  };

  // Coherence metrics
  coherenceScore: number; // 0-1, how similar the candidates are
  exampleCount: number;   // Number of examples
  confidence: number;     // 0-1, confidence in pattern validity

  // Auto-approval decision
  autoApprove: boolean;
  autoApprovalReason?: string;
}

/**
 * Analyze pattern candidates and generate suggestions
 */
export function analyzePatternCandidates(candidates: PatternCandidate[]): PatternSuggestion[] {
  const pending = candidates.filter(c => c.reviewStatus === 'pending');

  if (pending.length === 0) {
    return [];
  }

  // Group by formality signature
  const groups = new Map<string, PatternCandidate[]>();

  pending.forEach(candidate => {
    const signature = candidate.items
      .map(item => `${item.role}:${item.formality}`)
      .sort()
      .join('|');

    if (!groups.has(signature)) {
      groups.set(signature, []);
    }
    groups.get(signature)!.push(candidate);
  });

  // Generate suggestions for groups with 3+ examples
  const suggestions: PatternSuggestion[] = [];
  let patternIndex = 1;

  groups.forEach((groupCandidates, signature) => {
    if (groupCandidates.length < 3) return;

    const suggestion = extractPatternWithCoherence(groupCandidates, patternIndex);
    suggestions.push(suggestion);
    patternIndex++;
  });

  // Sort by confidence (high to low)
  return suggestions.sort((a, b) => b.confidence - a.confidence);
}

/**
 * Extract pattern from candidates with coherence scoring
 */
function extractPatternWithCoherence(
  candidates: PatternCandidate[],
  index: number
): PatternSuggestion {
  // Analyze items to find common patterns
  const roleAnalysis = new Map<string, { formalities: number[]; keywords: string[]; productTypes: string[] }>();

  candidates.forEach(candidate => {
    candidate.items.forEach(item => {
      if (!roleAnalysis.has(item.role)) {
        roleAnalysis.set(item.role, { formalities: [], keywords: [], productTypes: [] });
      }
      const analysis = roleAnalysis.get(item.role)!;
      analysis.formalities.push(item.formality);

      // Extract keywords from product title
      const titleWords = item.product.title.toLowerCase().split(/\s+/);
      const commonKeywords = ['dress', 'tailored', 'casual', 'sneaker', 'tee', 't-shirt', 'blazer', 'jean', 'pant', 'trouser'];
      titleWords.forEach(word => {
        if (commonKeywords.some(kw => word.includes(kw))) {
          analysis.keywords.push(word);
        }
      });

      // Extract product types
      if (item.product.productType2) {
        analysis.productTypes.push(item.product.productType2.toLowerCase());
      }
    });
  });

  // Build pattern rules
  const rules: any = {};
  roleAnalysis.forEach((analysis, role) => {
    const minFormality = Math.min(...analysis.formalities);
    const maxFormality = Math.max(...analysis.formalities);

    // Calculate keyword coherence (keywords appearing in >50% of examples)
    const keywordCounts = new Map<string, number>();
    analysis.keywords.forEach(kw => {
      keywordCounts.set(kw, (keywordCounts.get(kw) || 0) + 1);
    });

    const threshold = candidates.length * 0.5;
    const commonKeywords = Array.from(keywordCounts.entries())
      .filter(([_, count]) => count >= threshold)
      .sort((a, b) => b[1] - a[1]) // Sort by frequency
      .map(([kw]) => kw)
      .slice(0, 3); // Top 3 keywords

    // Calculate productType coherence
    const typeCounts = new Map<string, number>();
    analysis.productTypes.forEach(type => {
      typeCounts.set(type, (typeCounts.get(type) || 0) + 1);
    });

    const commonTypes = Array.from(typeCounts.entries())
      .filter(([_, count]) => count >= threshold)
      .sort((a, b) => b[1] - a[1])
      .map(([type]) => type)
      .slice(0, 2);

    rules[role] = {
      minFormality: minFormality === maxFormality ? minFormality : undefined,
      maxFormality: maxFormality === minFormality ? maxFormality : undefined,
      keywords: commonKeywords.length > 0 ? commonKeywords : undefined,
      productTypes: commonTypes.length > 0 ? commonTypes : undefined,
    };

    // Clean up undefined fields
    Object.keys(rules[role]).forEach(key => {
      if (rules[role][key] === undefined) {
        delete rules[role][key];
      }
    });
  });

  // Calculate coherence score
  const coherenceScore = calculateCoherenceScore(candidates, roleAnalysis);

  // Calculate confidence (based on example count + coherence)
  const exampleCount = candidates.length;
  const exampleWeight = Math.min(exampleCount / 10, 1); // Max at 10 examples
  const confidence = (exampleWeight * 0.5) + (coherenceScore * 0.5);

  // Determine if auto-approve (10+ examples AND 80%+ coherence)
  const autoApprove = exampleCount >= 10 && coherenceScore >= 0.8;
  const autoApprovalReason = autoApprove
    ? `High confidence: ${exampleCount} examples with ${Math.round(coherenceScore * 100)}% coherence`
    : undefined;

  // Generate pattern name and description
  const roleNames = Array.from(roleAnalysis.keys())
    .map(r => r.charAt(0).toUpperCase() + r.slice(1))
    .join(' + ');
  const formalityRange = `F${Math.min(...Array.from(roleAnalysis.values()).flatMap(a => a.formalities))}-${Math.max(...Array.from(roleAnalysis.values()).flatMap(a => a.formalities))}`;

  return {
    id: `auto-pattern-${Date.now()}-${index}`,
    name: `Auto-Discovered ${roleNames}`,
    description: `${roleNames} mix (${formalityRange})`,
    candidates,
    rules,
    coherenceScore,
    exampleCount,
    confidence,
    autoApprove,
    autoApprovalReason,
  };
}

/**
 * Calculate coherence score for a group of candidates
 * Returns 0-1 score indicating how similar the candidates are
 */
function calculateCoherenceScore(
  candidates: PatternCandidate[],
  roleAnalysis: Map<string, { formalities: number[]; keywords: string[]; productTypes: string[] }>
): number {
  let totalScore = 0;
  let scoreCount = 0;

  roleAnalysis.forEach((analysis) => {
    // Formality coherence: how tight is the formality range?
    const formalityRange = Math.max(...analysis.formalities) - Math.min(...analysis.formalities);
    const formalityScore = 1 - (formalityRange / 5); // 5 is max possible range
    totalScore += Math.max(formalityScore, 0);
    scoreCount++;

    // Keyword coherence: what % of candidates share common keywords?
    const keywordCounts = new Map<string, number>();
    analysis.keywords.forEach(kw => {
      keywordCounts.set(kw, (keywordCounts.get(kw) || 0) + 1);
    });

    const maxKeywordCount = Math.max(...Array.from(keywordCounts.values()), 0);
    const keywordScore = maxKeywordCount / candidates.length;
    totalScore += keywordScore;
    scoreCount++;

    // ProductType coherence: what % of candidates share product types?
    const typeCounts = new Map<string, number>();
    analysis.productTypes.forEach(type => {
      typeCounts.set(type, (typeCounts.get(type) || 0) + 1);
    });

    const maxTypeCount = Math.max(...Array.from(typeCounts.values()), 0);
    const typeScore = maxTypeCount / candidates.length;
    totalScore += typeScore;
    scoreCount++;
  });

  return scoreCount > 0 ? totalScore / scoreCount : 0;
}

/**
 * Check if we should run auto-approval
 * Returns true if there are pending candidates to analyze
 */
export async function shouldRunAutoApproval(): Promise<boolean> {
  const candidates = await getAllPatternCandidates();
  const pending = candidates.filter(c => c.reviewStatus === 'pending');

  // Run if we have at least 3 pending candidates
  return pending.length >= 3;
}

/**
 * Auto-approve high-confidence patterns
 * Returns list of approved patterns
 */
export async function autoApprovePatterns(): Promise<PatternSuggestion[]> {
  console.log('\n🤖 AUTO-APPROVAL: Analyzing pattern candidates...');

  // Get all candidates
  const candidates = await getAllPatternCandidates();
  const pending = candidates.filter(c => c.reviewStatus === 'pending');

  console.log(`   Found ${pending.length} pending candidates`);

  if (pending.length < 3) {
    console.log('   Not enough candidates for pattern analysis (need 3+)');
    return [];
  }

  // Analyze and generate suggestions
  const suggestions = analyzePatternCandidates(candidates);

  console.log(`   Generated ${suggestions.length} pattern suggestions`);

  // Filter to auto-approvable patterns
  const autoApprovable = suggestions.filter(s => s.autoApprove);

  console.log(`   Found ${autoApprovable.length} high-confidence patterns for auto-approval`);

  if (autoApprovable.length === 0) {
    console.log('   No patterns meet auto-approval criteria (10+ examples, 80%+ coherence)');
    return [];
  }

  // Auto-approve each pattern
  const approved: PatternSuggestion[] = [];

  for (const pattern of autoApprovable) {
    try {
      // Mark candidates as approved
      for (const candidate of pattern.candidates) {
        await updatePatternCandidateStatus(
          candidate.candidateId,
          'approved',
          `Auto-approved: ${pattern.autoApprovalReason}`
        );
      }

      // Add to formality-patterns.json
      await addPatternToConfig(pattern);

      approved.push(pattern);

      console.log(`\n   ✅ AUTO-APPROVED: ${pattern.name}`);
      console.log(`      Reason: ${pattern.autoApprovalReason}`);
      console.log(`      Examples: ${pattern.exampleCount}`);
      console.log(`      Coherence: ${Math.round(pattern.coherenceScore * 100)}%`);
    } catch (error) {
      console.error(`   ❌ Failed to auto-approve pattern ${pattern.name}:`, error);
    }
  }

  return approved;
}

/**
 * Add pattern to formality-patterns.json
 */
async function addPatternToConfig(pattern: PatternSuggestion): Promise<void> {
  const configPath = path.join(process.cwd(), 'lib/recipe-cooking/formality-patterns.json');

  // Read current config
  const configData = fs.readFileSync(configPath, 'utf-8');
  const config = JSON.parse(configData);

  // Check if pattern already exists (by similar rules)
  const exists = config.patterns.some((p: any) => {
    return JSON.stringify(p.rules) === JSON.stringify(pattern.rules);
  });

  if (exists) {
    console.log(`      ⚠️  Similar pattern already exists - skipping`);
    return;
  }

  // Add new pattern
  const newPattern = {
    id: pattern.id,
    name: pattern.name,
    description: pattern.description,
    enabled: true,
    rules: pattern.rules,
    metadata: {
      autoApproved: true,
      approvedAt: new Date().toISOString(),
      exampleCount: pattern.exampleCount,
      coherenceScore: Math.round(pattern.coherenceScore * 100),
    },
  };

  config.patterns.push(newPattern);

  // Write back to file
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');

  console.log(`      ✅ Added to formality-patterns.json`);
}

/**
 * Full auto-approval workflow
 * Call this after cooking recipes with Discovery Mode
 */
export async function runAutoApprovalWorkflow(): Promise<{
  analyzed: number;
  suggested: number;
  approved: number;
  patterns: PatternSuggestion[];
}> {
  const shouldRun = await shouldRunAutoApproval();

  if (!shouldRun) {
    return {
      analyzed: 0,
      suggested: 0,
      approved: 0,
      patterns: [],
    };
  }

  console.log('\n' + '='.repeat(60));
  console.log('🤖 AUTO-APPROVAL WORKFLOW');
  console.log('='.repeat(60));

  const candidates = await getAllPatternCandidates();
  const pending = candidates.filter(c => c.reviewStatus === 'pending');

  const suggestions = analyzePatternCandidates(candidates);
  const approvedPatterns = await autoApprovePatterns();

  console.log('\n' + '='.repeat(60));
  console.log('✅ AUTO-APPROVAL COMPLETE');
  console.log('='.repeat(60));
  console.log(`Analyzed: ${pending.length} candidates`);
  console.log(`Suggested: ${suggestions.length} patterns`);
  console.log(`Auto-approved: ${approvedPatterns.length} patterns`);

  if (approvedPatterns.length > 0) {
    console.log('\nApproved Patterns:');
    approvedPatterns.forEach(p => {
      console.log(`  • ${p.name} (${p.exampleCount} examples, ${Math.round(p.coherenceScore * 100)}% coherence)`);
    });
  }

  console.log('='.repeat(60) + '\n');

  return {
    analyzed: pending.length,
    suggested: suggestions.length,
    approved: approvedPatterns.length,
    patterns: approvedPatterns,
  };
}
