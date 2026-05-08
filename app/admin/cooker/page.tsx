'use client';

/**
 * Recipe Cooker Control Panel
 * Full-featured UI for cooking recipes with configurable strategies and parameters
 */

import { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Paper,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Button,
  Tabs,
  Tab,
  LinearProgress,
  CircularProgress,
  Alert,
  Chip,
  Grid,
  Card,
  CardContent,
  Divider,
  Stack,
  Switch,
  FormControlLabel,
  Checkbox,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import {
  PlayArrow as CookIcon,
  Science as LabIcon,
  Settings as SettingsIcon,
  CheckCircle as CheckIcon,
  Error as ErrorIcon,
  Info as InfoIcon,
  ExpandMore as ExpandMoreIcon,
} from '@mui/icons-material';
import { getAllRecipes, type RecipeBuilderRecipe } from '@/lib/supabase-recipe-storage';
import { fixDuplicateRecipeIds } from '@/lib/recipe-adapter';
import type { UnifiedRecipe } from '@/lib/unified-recipe-types';
import type { CookingOptions, CookingResult } from '@/lib/recipe-cooking/types';
import { saveOutfits } from '@/lib/supabase-outfit-storage';
import { getAllRecipeStatuses, type RecipeStatus } from '@/lib/supabase-recipe-status';
import { CLIP_API_URL, getClipStatusMessage } from '@/lib/clip-config';
import {
  generateSessionId,
  updateRecipeStatusAfterCooking,
  clearAllOutfits,
  getPatternCandidateCount,
} from '@/lib/indexeddb-storage';
import {
  analyzeHardRuleFailures,
  generateBulkViolationSummary,
  getViolationDisplayName,
  getViolationSeverity,
  type RecipeViolationReport,
  type BulkViolationSummary,
} from '@/lib/recipe-cooking/hard-rules-diagnostics';
import {
  filterRecipesNeedingCooking,
  filterRecipesByHealth,
  type RecipeHealthStatus,
} from '@/lib/smart-bulk-cook';
import BatchInput from '@/components/BatchInput';

// Convert RecipeBuilderRecipe to UnifiedRecipe format
function toUnifiedRecipe(recipe: RecipeBuilderRecipe): UnifiedRecipe {
  return {
    ...recipe,
    source: recipe.source || 'manual',
    aiMetadata: recipe.aiMetadata,
  };
}

export default function CookerPage() {
  // Recipe data
  const [recipes, setRecipes] = useState<UnifiedRecipe[]>([]);
  const [recipeStatuses, setRecipeStatuses] = useState<Map<string, RecipeStatus>>(new Map());
  const [loading, setLoading] = useState(true);

  // Cooking configuration
  const [strategy, setStrategy] = useState<string>('gemini-flash-lite');
  const [targetCount, setTargetCount] = useState(100); // Auto-adjusted based on strategy
  const [productsPerIngredient, setProductsPerIngredient] = useState(20);
  const [minQuality, setMinQuality] = useState(50);
  const [minAlignment, setMinAlignment] = useState(9);  // Link Primary AND Secondary (threshold: medium=9)
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [discoveryMode, setDiscoveryMode] = useState(false); // Phase 2: Pattern learning

  // Recipe selection
  const [selectedRecipeIds, setSelectedRecipeIds] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState<'all' | 'never-cooked' | 'success' | 'failed' | 'needs-review'>('all');

  // Batch filtering
  const [batchFilter, setBatchFilter] = useState<string[] | null>(null);
  const [batchInfo, setBatchInfo] = useState<{ batchId: string; type: string; count: number; label?: string } | null>(null);

  // Smart bulk cooking (skip recipes with existing outfits)
  const [skipExistingOutfits, setSkipExistingOutfits] = useState(true); // Default: ON
  const [minOutfitThreshold, setMinOutfitThreshold] = useState(10);
  const [smartCookingAnalysis, setSmartCookingAnalysis] = useState<{
    total: number;
    needsCooking: number;
    alreadyCooked: number;
    estimatedCost: string;
  } | null>(null);

  // Ingredient health checks
  const [healthCheckRunning, setHealthCheckRunning] = useState(false);
  const [healthCheckProgress, setHealthCheckProgress] = useState(0);
  const [healthCheckResults, setHealthCheckResults] = useState<{
    healthy: UnifiedRecipe[];
    unhealthy: UnifiedRecipe[];
    healthStatuses: RecipeHealthStatus[];
    summary: {
      total: number;
      healthy: number;
      unhealthy: number;
      totalEmptyIngredients: number;
    };
  } | null>(null);
  const [skipUnhealthyRecipes, setSkipUnhealthyRecipes] = useState(true); // Default: ON

  // Cooking state
  const [isCooking, setIsCooking] = useState(false);
  const [cookingProgress, setCookingProgress] = useState(0);
  const [currentRecipe, setCurrentRecipe] = useState('');
  const [results, setResults] = useState<CookingResult[]>([]);
  const [failedRecipes, setFailedRecipes] = useState<Array<{ title: string; error: string }>>([]);
  const [error, setError] = useState<string | null>(null);

  // Hard rules violation tracking
  const [violationReports, setViolationReports] = useState<RecipeViolationReport[]>([]);
  const [bulkViolationSummary, setBulkViolationSummary] = useState<BulkViolationSummary | null>(null);

  // CLIP API status
  const [clipStatus, setClipStatus] = useState<'checking' | 'online' | 'offline'>('checking');
  const [clipStatusMessage, setClipStatusMessage] = useState<string>('');

  // Load recipes
  useEffect(() => {
    loadRecipes();
    checkClipStatus();
  }, []);

  // Check for pre-selected recipe from sessionStorage
  useEffect(() => {
    const preSelectedId = sessionStorage.getItem('cookRecipeId');
    if (preSelectedId && recipes.length > 0) {
      setSelectedRecipeIds([preSelectedId]);
      sessionStorage.removeItem('cookRecipeId');
    }
  }, [recipes]);

  // Check CLIP API status
  async function checkClipStatus() {
    try {
      const response = await fetch(`${CLIP_API_URL}/health`);
      setClipStatus(response.ok ? 'online' : 'offline');
      const message = await getClipStatusMessage();
      setClipStatusMessage(message);
    } catch (err) {
      setClipStatus('offline');
      const message = await getClipStatusMessage();
      setClipStatusMessage(message);
    }
  }

  async function loadRecipes() {
    try {
      // Fix any duplicate recipe IDs before loading
      const { fixed, duplicates } = await fixDuplicateRecipeIds();
      if (fixed > 0) {
        console.log(`✓ Fixed ${fixed} duplicate recipe IDs:`, duplicates);
      }

      const allRecipes = await getAllRecipes();
      // Filter to only recipes with ingredients (ready to cook)
      const cookableRecipes = allRecipes
        .filter((r) => r.slots && r.slots.length >= 4)
        .map(toUnifiedRecipe);
      setRecipes(cookableRecipes);

      // Load recipe statuses
      const statuses = await getAllRecipeStatuses();
      const statusMap = new Map(statuses.map(s => [s.recipeId, s]));
      setRecipeStatuses(statusMap);
    } catch (err) {
      setError('Failed to load recipes');
    } finally {
      setLoading(false);
    }
  }

  // Auto-adjust target count based on strategy
  function handleStrategyChange(newStrategy: string) {
    setStrategy(newStrategy);
    // Smart defaults based on experiment data:
    // - Random: fast, generate more (200) to get good yield
    // - Gemini: expensive, generate fewer (100) but higher quality
    if (newStrategy === 'random-sampling') {
      setTargetCount(200);
    } else if (newStrategy.includes('gemini') || newStrategy.includes('claude')) {
      setTargetCount(100);
    }
  }

  // Health check handler
  async function handleHealthCheck() {
    setHealthCheckRunning(true);
    setHealthCheckProgress(0);
    setHealthCheckResults(null);

    try {
      const recipesToCheck = recipes.filter((r) => selectedRecipeIds.includes(r.id));

      if (recipesToCheck.length === 0) {
        setError('No recipes selected for health check');
        setHealthCheckRunning(false);
        return;
      }

      console.log(`🏥 Running health check on ${recipesToCheck.length} recipes...`);

      const results = await filterRecipesByHealth(
        recipesToCheck,
        (current, total) => {
          setHealthCheckProgress((current / total) * 100);
        }
      );

      setHealthCheckResults(results);

      console.log(`✓ Health check complete:`);
      console.log(`   Healthy: ${results.summary.healthy}/${results.summary.total}`);
      console.log(`   Unhealthy: ${results.summary.unhealthy}/${results.summary.total}`);
      console.log(`   Total empty ingredients: ${results.summary.totalEmptyIngredients}`);

      // Log detailed unhealthy recipes
      if (results.unhealthy.length > 0) {
        console.log(`\n⚠️ Unhealthy recipes (0-product ingredients):`);
        results.healthStatuses
          .filter((s) => !s.healthy)
          .forEach((status) => {
            console.log(`\n  ${status.recipeTitle}:`);
            status.ingredients
              .filter((ing) => !ing.healthy)
              .forEach((ing) => {
                console.log(`    ❌ ${ing.ingredientTitle} (${ing.role}): "${ing.searchQuery}" → 0 products`);
              });
          });
      }
    } catch (err: any) {
      setError(`Health check failed: ${err.message}`);
      console.error('Health check error:', err);
    } finally {
      setHealthCheckRunning(false);
    }
  }

  // Cook handler
  async function handleCook() {
    setIsCooking(true);
    setError(null);
    setResults([]);
    setFailedRecipes([]);
    setViolationReports([]);
    setBulkViolationSummary(null);
    setCookingProgress(0);

    const options: CookingOptions = {
      strategy: strategy as any,
      targetCount,
      productsPerIngredient,
      minQuality,
      minAlignment,
      generative: true, // Always use generative mode (best results)
      saveToSanity: false, // Always save locally during development
      discoveryMode: discoveryMode, // Pass Discovery Mode flag to API
    };

    try {
      let recipesToCook = recipes.filter((r) => selectedRecipeIds.includes(r.id));

      // Ingredient health check: filter out recipes with empty ingredient pools
      if (skipUnhealthyRecipes && recipesToCook.length > 0) {
          console.log('🏥 Running ingredient health check...');
          const healthResults = await filterRecipesByHealth(
            recipesToCook,
            (current, total) => {
              // Show progress in cooking progress bar
              setCookingProgress((current / total) * 50); // Use first 50% for health check
            }
          );

          console.log(`📊 Health check results:`);
          console.log(`   Healthy: ${healthResults.summary.healthy}`);
          console.log(`   Unhealthy (skipping): ${healthResults.summary.unhealthy}`);
          console.log(`   Empty ingredients: ${healthResults.summary.totalEmptyIngredients}`);

          recipesToCook = healthResults.healthy;
          setHealthCheckResults(healthResults);

          if (healthResults.unhealthy.length > 0) {
            console.log(`\n⚠️ Skipping ${healthResults.unhealthy.length} unhealthy recipes:`);
            healthResults.healthStatuses
              .filter((s) => !s.healthy)
              .forEach((status) => {
                console.log(`  - ${status.recipeTitle}: ${status.reason}`);
              });
          }

          if (recipesToCook.length === 0) {
            setError(`All ${healthResults.summary.total} selected recipes have empty ingredients. Review health check results and fix queries.`);
            setIsCooking(false);
            setCookingProgress(0);
            return;
          }
        }

      // Smart bulk cooking: filter out recipes with existing outfits
      if (skipExistingOutfits && recipesToCook.length > 0) {
        console.log('🧠 Smart bulk cooking enabled - analyzing existing outfits...');
        const filtered = await filterRecipesNeedingCooking(recipesToCook, minOutfitThreshold);

        console.log(`📊 Smart cooking analysis:`);
        console.log(`   Total selected: ${filtered.summary.total}`);
        console.log(`   Need cooking: ${filtered.summary.needsCooking}`);
        console.log(`   Already cooked (skipping): ${filtered.summary.alreadyCooked}`);
        console.log(`   ${filtered.summary.estimatedCost}`);

        recipesToCook = filtered.needsCooking;
        setSmartCookingAnalysis(filtered.summary);

        if (recipesToCook.length === 0) {
          setError(`All ${filtered.summary.total} selected recipes already have sufficient outfits (threshold: ${minOutfitThreshold}). Increase threshold or disable "Skip existing outfits" to re-cook.`);
          setIsCooking(false);
          return;
        }
      }

      if (recipesToCook.length === 0) {
        setError('No recipes selected');
        setIsCooking(false);
        return;
      }

      const cookingResults: CookingResult[] = [];
      const failedRecipes: Array<{ title: string; error: string }> = [];

      // Generate session ID for this cooking batch
      const sessionId = generateSessionId();
      console.log(`\n🆔 Session ID: ${sessionId}\n`);

      for (let i = 0; i < recipesToCook.length; i++) {
        const recipe = recipesToCook[i];
        setCurrentRecipe(recipe.title);
        setCookingProgress(((i + 1) / recipesToCook.length) * 100);

        console.log(`\n${'='.repeat(60)}`);
        console.log(`Cooking recipe ${i + 1}/${recipesToCook.length}: ${recipe.title}`);
        console.log('='.repeat(60));

        try {
          const response = await fetch('/api/cook-recipe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ recipe, options }),
          });

          if (!response.ok) {
            const errorData = await response.json();
            const errorMsg = errorData.error || 'Unknown error';
            console.error(`❌ Cook API error for "${recipe.title}":`, errorMsg);

            // Track failure
            failedRecipes.push({ title: recipe.title, error: errorMsg });

            // Continue to next recipe (don't throw)
            continue;
          }

          const result: CookingResult = await response.json();
          console.log(`✓ Cook result for "${recipe.title}":`, result.stats);
          cookingResults.push(result);

          // Save outfits to IndexedDB
          await saveOutfits(
            result.recipeId,
            result.recipeTitle,
            recipe.department,
            result.strategy,
            result.outfits
          );

          // Update recipe status tracking (outfit counts + pipeline stats)
          await updateRecipeStatusAfterCooking(result.recipeId, sessionId, {
            totalGenerated: result.stats.totalGenerated,
            formalityFiltered: result.stats.formalityFiltered,
            similarityFiltered: result.stats.similarityFiltered,
            totalScored: result.stats.totalScored,
          });
          console.log(`✓ Recipe status tracking updated for ${recipe.title}`);
        } catch (err: any) {
          // Catch any unexpected errors for this recipe
          const errorMsg = err.message || 'Unexpected error';
          console.error(`❌ Unexpected error cooking "${recipe.title}":`, err);

          // Track failure
          failedRecipes.push({ title: recipe.title, error: errorMsg });

          // Continue to next recipe
          continue;
        }
      }

      // Show summary
      console.log(`\n${'='.repeat(60)}`);
      console.log('BULK COOKING SUMMARY');
      console.log('='.repeat(60));
      console.log(`✓ Succeeded: ${cookingResults.length}/${recipesToCook.length}`);
      console.log(`✗ Failed: ${failedRecipes.length}/${recipesToCook.length}`);
      if (skipExistingOutfits && smartCookingAnalysis) {
        console.log(`\n🧠 Smart cooking: Skipped ${smartCookingAnalysis.alreadyCooked} recipes with existing outfits`);
        console.log(`   ${smartCookingAnalysis.estimatedCost}`);
      }
      if (failedRecipes.length > 0) {
        console.log('\nFailed recipes:');
        failedRecipes.forEach((f) => console.log(`  - ${f.title}: ${f.error}`));
      }
      console.log('='.repeat(60));

      // Discovery Mode summary
      if (discoveryMode) {
        const candidateCount = await getPatternCandidateCount();
        console.log(`\n🔬 Discovery Mode: ${candidateCount} pattern candidates captured`);
        console.log(`📊 Review suggestions at: http://localhost:3001/pattern-discovery\n`);
      }

      // Hard Rules Violation Analysis
      const violationReportsList: RecipeViolationReport[] = [];
      cookingResults.forEach((result) => {
        const recipe = recipesToCook.find(r => r.id === result.recipeId);
        if (!recipe) return;

        const report = analyzeHardRuleFailures(recipe, result.pipelineResults || [], {
          totalGenerated: result.stats.totalGenerated,
          totalScored: result.stats.totalScored,
        });

        if (report) {
          violationReportsList.push(report);
        }
      });

      // Generate bulk summary if there are violations
      let bulkSummary: BulkViolationSummary | null = null;
      if (violationReportsList.length > 0) {
        bulkSummary = generateBulkViolationSummary(violationReportsList);

        console.log(`\n${'='.repeat(60)}`);
        console.log('🔍 HARD RULES VIOLATION ANALYSIS');
        console.log('='.repeat(60));
        console.log(`Total recipes with violations: ${bulkSummary.totalRecipesFailed}`);
        console.log(`Total violations: ${bulkSummary.totalViolations}`);
        console.log(`\nViolations by type:`);
        bulkSummary.violationsByType.forEach((data, type) => {
          console.log(`  ${getViolationDisplayName(type)}: ${data.count} (${data.recipes.length} recipes)`);
        });
        console.log(`\nCritical fixes (single obvious issue): ${bulkSummary.criticalFixes.length}`);
        console.log(`Complex fixes (multiple issues): ${bulkSummary.complexFixes.length}`);
        console.log('='.repeat(60) + '\n');
      }

      setResults(cookingResults);
      setFailedRecipes(failedRecipes);
      setViolationReports(violationReportsList);
      setBulkViolationSummary(bulkSummary);
      setCurrentRecipe('');

      // Show summary message
      const withOutfits = cookingResults.filter(r => r.stats.totalSaved > 0);
      const zeroOutfits = cookingResults.filter(r => r.stats.totalSaved === 0);

      if (failedRecipes.length > 0 && cookingResults.length > 0) {
        // Some succeeded, some failed
        setError(
          `Completed with mixed results: ${withOutfits.length} generated outfits, ${zeroOutfits.length} with zero outfits, ${failedRecipes.length} failed. Check details below.`
        );
      } else if (failedRecipes.length > 0 && cookingResults.length === 0) {
        // All failed
        setError(
          `All ${failedRecipes.length} recipe(s) failed. Check console for details.`
        );
      } else if (zeroOutfits.length > 0) {
        // All completed but some have zero outfits
        setError(
          `${withOutfits.length} recipe(s) generated outfits, ${zeroOutfits.length} generated zero outfits. Check diagnostics below.`
        );
      }

      // Reload recipes to show updated statuses
      loadRecipes();
    } catch (err: any) {
      console.error('Cooking error:', err);
      setError(err.message || 'Cooking failed');
    } finally {
      setIsCooking(false);
      setCookingProgress(0);
    }
  }

  // Filter recipes by status
  function getFilteredRecipes(): UnifiedRecipe[] {
    let filtered = recipes;

    // Apply batch filter first (if active)
    if (batchFilter && batchFilter.length > 0) {
      const batchIds = new Set(batchFilter);
      filtered = filtered.filter((r) => batchIds.has(r.id));
    }

    // Then apply status filter
    if (statusFilter === 'all') return filtered;

    if (statusFilter === 'never-cooked') {
      return filtered.filter((r) => !recipeStatuses.has(r.id));
    }

    if (statusFilter === 'needs-review') {
      return filtered.filter((r) => {
        const status = recipeStatuses.get(r.id);
        if (!status) return false;
        // Needs review if: 0 linked OR < 10 linked
        return status.linkedCount === 0 || status.linkedCount < 10;
      });
    }

    if (statusFilter === 'success') {
      return filtered.filter((r) => {
        const status = recipeStatuses.get(r.id);
        if (!status) return false;
        return status.linkedCount >= 10;
      });
    }

    // No more "failed" filter - failures don't create status records
    if (statusFilter === 'failed') {
      return [];
    }

    return filtered;
  }

  // Calculate counts for each filter status
  function getStatusCounts() {
    const neverCooked = recipes.filter((r) => !recipeStatuses.has(r.id)).length;
    const success = recipes.filter((r) => {
      const status = recipeStatuses.get(r.id);
      return status && status.linkedCount >= 10;
    }).length;
    const needsReview = recipes.filter((r) => {
      const status = recipeStatuses.get(r.id);
      return status && (status.linkedCount === 0 || status.linkedCount < 10);
    }).length;
    const failed = 0; // No failed status records

    return { neverCooked, success, needsReview, failed };
  }

  // Get status badge for recipe
  function getStatusBadge(recipe: UnifiedRecipe) {
    const status = recipeStatuses.get(recipe.id);

    // Show "Never Cooked" badge for recipes without cooking history
    if (!status) {
      return <Chip label="Not Cooked" variant="outlined" size="small" sx={{ ml: 1, opacity: 0.6 }} />;
    }

    // Determine status based on linkedCount
    if (status.linkedCount >= 10) {
      return <Chip label="✓ Success" color="success" size="small" sx={{ ml: 1 }} />;
    } else if (status.linkedCount > 0) {
      return <Chip label="⚠ Low Yield" color="warning" size="small" sx={{ ml: 1 }} />;
    } else {
      return <Chip label="⚠ Needs Review" color="warning" size="small" sx={{ ml: 1 }} />;
    }
  }

  // Render mode-specific UI

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <LinearProgress />
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <LabIcon color="primary" fontSize="large" />
          Recipe Cooker Control Panel
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Generate outfit combinations from recipes. Pipelines auto-select based on strategy (Gemini vs Random).
        </Typography>

        {/* CLIP API Status */}
        <Box sx={{ mt: 2 }}>
          {clipStatus === 'checking' && (
            <Chip label="Checking CLIP API..." size="small" />
          )}
          {clipStatus === 'online' && (
            <Chip label={clipStatusMessage || `CLIP API: Online (${CLIP_API_URL})`} color="success" size="small" />
          )}
          {clipStatus === 'offline' && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {clipStatusMessage || 'CLIP API is offline'}
            </Alert>
          )}
        </Box>
      </Box>

      <Grid container spacing={3}>
        {/* Configuration Panel */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <SettingsIcon fontSize="small" />
              Settings
            </Typography>
            <Divider sx={{ mb: 2 }} />

            <Stack spacing={2.5}>
              {/* Strategy Selection - PRIMARY CONTROL */}
              <FormControl fullWidth>
                <InputLabel>Strategy</InputLabel>
                <Select
                  value={strategy}
                  label="Strategy"
                  onChange={(e) => handleStrategyChange(e.target.value)}
                >
                  <MenuItem value="random-sampling">
                    🎲 Random - Free, fast (49% link rate)
                  </MenuItem>
                  <MenuItem value="gemini-flash-lite">
                    ✨ Gemini - Best quality (74% link rate)
                  </MenuItem>
                  <MenuItem value="gemini-flash" disabled>
                    Gemini Flash (Coming Soon)
                  </MenuItem>
                  <MenuItem value="claude-sonnet" disabled>
                    Claude Sonnet (Coming Soon)
                  </MenuItem>
                </Select>
              </FormControl>

              {/* Pipeline Info */}
              <Alert severity="info" icon={<InfoIcon fontSize="small" />}>
                <Typography variant="caption" component="div" fontWeight="medium">
                  {discoveryMode ? 'Discovery Mode pipeline:' : 'Auto-selected pipeline:'}
                </Typography>
                <Typography variant="caption" component="div">
                  {discoveryMode
                    ? '→ Formality filter (captures candidates) + ' + (strategy === 'random-sampling' ? 'Similarity (0.40) + ' : '') + 'Hard rules'
                    : strategy === 'random-sampling'
                    ? '→ Similarity filter (0.40) + Hard rules'
                    : '→ Hard rules only (Gemini self-curates)'}
                </Typography>
                <Typography variant="caption" component="div" sx={{ mt: 0.5 }}>
                  Generating {targetCount} outfits • Saves quality ≥{minQuality} • Links alignment ≥{minAlignment}
                </Typography>
              </Alert>

              {/* Advanced Settings - COLLAPSED BY DEFAULT */}
              <Accordion
                expanded={showAdvanced}
                onChange={(_, expanded) => setShowAdvanced(expanded)}
                elevation={0}
                sx={{ border: 1, borderColor: 'divider' }}
              >
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography variant="body2" fontWeight="medium">
                    Advanced Settings
                  </Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Stack spacing={2}>
                    <TextField
                      label="Target Outfit Count"
                      type="number"
                      value={targetCount}
                      onChange={(e) => setTargetCount(parseInt(e.target.value))}
                      size="small"
                      fullWidth
                      helperText="Auto-set: Random=200, Gemini=100"
                    />

                    <TextField
                      label="Products per Ingredient"
                      type="number"
                      value={productsPerIngredient}
                      onChange={(e) => setProductsPerIngredient(parseInt(e.target.value))}
                      size="small"
                      fullWidth
                      helperText="CLIP search result limit (default: 20)"
                    />

                    <TextField
                      label="Min Quality Score"
                      type="number"
                      value={minQuality}
                      onChange={(e) => setMinQuality(parseInt(e.target.value))}
                      size="small"
                      fullWidth
                      helperText="Save outfits with quality ≥ this (default: 50)"
                    />

                    <TextField
                      label="Min Alignment Score"
                      type="number"
                      value={minAlignment}
                      onChange={(e) => setMinAlignment(parseInt(e.target.value))}
                      size="small"
                      fullWidth
                      helperText="Link to recipe if alignment ≥ this (default: 60)"
                    />

                    <Divider sx={{ my: 1 }} />

                    <FormControlLabel
                      control={
                        <Switch
                          checked={discoveryMode}
                          onChange={(e) => setDiscoveryMode(e.target.checked)}
                        />
                      }
                      label={
                        <Box>
                          <Typography variant="body2" fontWeight="medium">
                            Discovery Mode (Phase 2)
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Capture pattern candidates for automatic learning
                          </Typography>
                        </Box>
                      }
                    />

                    {discoveryMode && (
                      <Alert severity="info" sx={{ mt: 1 }}>
                        <Typography variant="caption">
                          Formality filter will capture rejected outfits as pattern candidates.
                          Review suggestions at <strong>/pattern-discovery</strong>
                        </Typography>
                      </Alert>
                    )}
                  </Stack>
                </AccordionDetails>
              </Accordion>
            </Stack>
          </Paper>
        </Grid>

        {/* Recipe Selection & Cooking */}
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Recipe Selection
            </Typography>
            <Divider sx={{ mb: 2 }} />

            {/* Batch Filter */}
            <BatchInput
              onApply={(ids, info) => {
                setBatchFilter(ids.length > 0 ? ids : null);
                setBatchInfo(info);
                // Reset selections when batch changes
                setSelectedRecipeIds([]);
              }}
              acceptedTypes={['recipes']}
              placeholder="Enter batch number (e.g., 0001)"
            />

            {/* Recipe Selection */}
            {(() => {
              const filteredRecipes = getFilteredRecipes();
              const counts = getStatusCounts();

              return (
                <Box>
                  {/* Status Filter */}
                  <Stack direction="row" spacing={1} sx={{ mb: 2, flexWrap: 'wrap', gap: 0.5 }}>
                    <Chip
                      label={`All (${recipes.length})`}
                      onClick={() => setStatusFilter('all')}
                      color={statusFilter === 'all' ? 'primary' : 'default'}
                      variant={statusFilter === 'all' ? 'filled' : 'outlined'}
                      size="small"
                    />
                    <Chip
                      label={`Never Cooked (${counts.neverCooked})`}
                      onClick={() => setStatusFilter('never-cooked')}
                      color={statusFilter === 'never-cooked' ? 'info' : 'default'}
                      variant={statusFilter === 'never-cooked' ? 'filled' : 'outlined'}
                      size="small"
                    />
                    <Chip
                      label={`Success (${counts.success})`}
                      onClick={() => setStatusFilter('success')}
                      color={statusFilter === 'success' ? 'success' : 'default'}
                      variant={statusFilter === 'success' ? 'filled' : 'outlined'}
                      size="small"
                    />
                    <Chip
                      label={`Needs Review (${counts.needsReview})`}
                      onClick={() => setStatusFilter('needs-review')}
                      color={statusFilter === 'needs-review' ? 'warning' : 'default'}
                      variant={statusFilter === 'needs-review' ? 'filled' : 'outlined'}
                      size="small"
                    />
                    <Chip
                      label={`Failed (${counts.failed})`}
                      onClick={() => setStatusFilter('failed')}
                      color={statusFilter === 'failed' ? 'error' : 'default'}
                      variant={statusFilter === 'failed' ? 'filled' : 'outlined'}
                      size="small"
                    />
                  </Stack>

                  <Typography variant="subtitle2" gutterBottom>
                    Select Recipes to Cook ({selectedRecipeIds.length} selected)
                  </Typography>
                  <Box sx={{ maxHeight: 300, overflow: 'auto', border: 1, borderColor: 'divider', borderRadius: 1, p: 1 }}>
                    {filteredRecipes.map((recipe) => (
                      <FormControlLabel
                        key={recipe.id}
                        control={
                          <Checkbox
                            checked={selectedRecipeIds.includes(recipe.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedRecipeIds([...selectedRecipeIds, recipe.id]);
                              } else {
                                setSelectedRecipeIds(selectedRecipeIds.filter((id) => id !== recipe.id));
                              }
                            }}
                          />
                        }
                        label={
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <span>
                              {recipe.title} ({recipe.department}, {recipe.slotCount} slots)
                            </span>
                            {getStatusBadge(recipe)}
                          </Box>
                        }
                      />
                    ))}
                  </Box>
                  <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                    <Button size="small" onClick={() => setSelectedRecipeIds(filteredRecipes.map((r) => r.id))}>
                      Select All {statusFilter !== 'all' ? `(${filteredRecipes.length})` : ''}
                    </Button>
                    <Button size="small" onClick={() => setSelectedRecipeIds([])}>
                      Clear All
                    </Button>
                  </Stack>

                  {/* Smart Bulk Cooking Options */}
                  <Box sx={{ mt: 3, p: 2, bgcolor: 'info.50', borderRadius: 1, border: 1, borderColor: 'info.200' }}>
                    <Typography variant="subtitle2" sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                      <InfoIcon fontSize="small" color="info" />
                      Smart Bulk Cooking
                    </Typography>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={skipExistingOutfits}
                          onChange={(e) => setSkipExistingOutfits(e.target.checked)}
                        />
                      }
                      label="Skip recipes with existing outfits"
                    />
                    {skipExistingOutfits && (
                      <TextField
                        label="Min Outfit Threshold"
                        type="number"
                        value={minOutfitThreshold}
                        onChange={(e) => setMinOutfitThreshold(parseInt(e.target.value) || 10)}
                        size="small"
                        sx={{ ml: 2, width: 150 }}
                        helperText="Skip if ≥ this many outfits"
                      />
                    )}
                  </Box>

                  {/* Ingredient Health Check */}
                  <Box sx={{ mt: 2, p: 2, bgcolor: 'warning.50', borderRadius: 1, border: 1, borderColor: 'warning.200' }}>
                    <Typography variant="subtitle2" sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                      <InfoIcon fontSize="small" color="warning" />
                      Ingredient Health Check
                    </Typography>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={skipUnhealthyRecipes}
                          onChange={(e) => setSkipUnhealthyRecipes(e.target.checked)}
                        />
                      }
                      label="Skip recipes with empty ingredient pools"
                    />
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={handleHealthCheck}
                      disabled={healthCheckRunning || selectedRecipeIds.length === 0}
                      sx={{ ml: 2 }}
                    >
                      {healthCheckRunning ? 'Checking...' : 'Run Health Check'}
                    </Button>
                    {healthCheckRunning && (
                      <Box sx={{ mt: 1 }}>
                        <LinearProgress variant="determinate" value={healthCheckProgress} />
                        <Typography variant="caption" color="text.secondary">
                          Checking ingredient pools... {Math.round(healthCheckProgress)}%
                        </Typography>
                      </Box>
                    )}
                    {healthCheckResults && (
                      <>
                        <Alert severity={healthCheckResults.summary.unhealthy > 0 ? 'warning' : 'success'} sx={{ mt: 1 }}>
                          <Typography variant="caption">
                            ✓ {healthCheckResults.summary.healthy} healthy • ⚠️ {healthCheckResults.summary.unhealthy} unhealthy
                            {healthCheckResults.summary.totalEmptyIngredients > 0 && ` (${healthCheckResults.summary.totalEmptyIngredients} empty ingredients)`}
                          </Typography>
                        </Alert>

                        {/* Show unhealthy recipe details */}
                        {healthCheckResults.summary.unhealthy > 0 && (
                          <Box sx={{ mt: 2 }}>
                            <Accordion>
                              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                                <Typography variant="subtitle2" color="warning.main">
                                  ⚠️ Unhealthy Recipes ({healthCheckResults.summary.unhealthy})
                                </Typography>
                              </AccordionSummary>
                              <AccordionDetails>
                                <Stack spacing={2}>
                                  {healthCheckResults.healthStatuses
                                    .filter((s) => !s.healthy)
                                    .map((status, idx) => (
                                      <Box key={idx} sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                                        <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                                          {status.recipeTitle}
                                        </Typography>
                                        <Typography variant="caption" color="text.secondary" gutterBottom display="block">
                                          {status.reason}
                                        </Typography>
                                        <Divider sx={{ my: 1 }} />
                                        <Typography variant="caption" fontWeight="bold" display="block" gutterBottom>
                                          Empty Ingredients:
                                        </Typography>
                                        {status.ingredients
                                          .filter((ing) => !ing.healthy)
                                          .map((ing, ingIdx) => (
                                            <Box key={ingIdx} sx={{ ml: 2, mb: 1 }}>
                                              <Typography variant="caption" color="error" display="block">
                                                ❌ <strong>{ing.ingredientTitle}</strong> ({ing.role})
                                              </Typography>
                                              <Typography variant="caption" color="text.secondary" display="block" sx={{ ml: 2 }}>
                                                Query: "{ing.searchQuery}"
                                              </Typography>
                                              <Typography variant="caption" color="text.secondary" display="block" sx={{ ml: 2 }}>
                                                Types: {ing.productTypes?.join(', ') || 'none'}
                                              </Typography>
                                              {ing.materials && ing.materials.length > 0 && (
                                                <Typography variant="caption" color="text.secondary" display="block" sx={{ ml: 2 }}>
                                                  Materials: {ing.materials.join(', ')}
                                                </Typography>
                                              )}
                                            </Box>
                                          ))}
                                      </Box>
                                    ))}
                                </Stack>
                              </AccordionDetails>
                            </Accordion>
                          </Box>
                        )}
                      </>
                    )}
                  </Box>
                </Box>
              );
            })()}

            <Button
              variant="contained"
              size="large"
              startIcon={<CookIcon />}
              onClick={handleCook}
              disabled={isCooking || recipes.length === 0}
              fullWidth
              sx={{ mt: 3 }}
            >
              {isCooking ? 'Cooking...' : 'Start Cooking'}
            </Button>

            {error && (
              <Alert severity="error" sx={{ mt: 2 }}>
                {error}
              </Alert>
            )}
          </Paper>
        </Grid>

        {/* Cooking Status Section */}
        {isCooking && (
          <Grid item xs={12}>
            <Paper sx={{ p: 3, bgcolor: 'primary.50' }}>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <CookIcon color="primary" />
                Cooking in Progress
              </Typography>
              <Divider sx={{ mb: 2 }} />
              <Typography variant="body1" gutterBottom sx={{ fontWeight: 500 }}>
                {currentRecipe}
              </Typography>
              <Box sx={{ mt: 2 }}>
                <LinearProgress
                  variant="determinate"
                  value={cookingProgress}
                  sx={{ height: 8, borderRadius: 1 }}
                />
                <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                  {Math.round(cookingProgress)}% complete
                </Typography>
              </Box>
            </Paper>
          </Grid>
        )}

        {/* Failed Recipes */}
        {failedRecipes.length > 0 && (
          <Grid item xs={12}>
            <Paper sx={{ p: 3, bgcolor: 'error.50' }}>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <ErrorIcon color="error" />
                Failed Recipes ({failedRecipes.length})
              </Typography>
              <Divider sx={{ mb: 2 }} />
              <Stack spacing={2}>
                {failedRecipes.map((failed, idx) => {
                  // Check if this is a "No combinations generated" error
                  const isZeroCombinations = failed.error === 'No combinations generated';
                  const result = results.find(r => r.recipeTitle === failed.title);

                  return (
                    <Alert key={idx} severity={isZeroCombinations ? 'warning' : 'error'}>
                      <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 1 }}>
                        {failed.title}
                      </Typography>
                      <Typography variant="body2" sx={{ mb: 1 }}>
                        {failed.error}
                      </Typography>

                      {isZeroCombinations && result?.diagnostics && (
                        <Box sx={{ mt: 2, p: 2, bgcolor: 'background.paper', borderRadius: 1 }}>
                          <Typography variant="caption" fontWeight="bold" display="block" sx={{ mb: 1 }}>
                            Diagnostics:
                          </Typography>

                          {result.diagnostics.productPools && (
                            <>
                              <Typography variant="caption" display="block" sx={{ mb: 0.5 }}>
                                Product pool sizes:
                              </Typography>
                              <Box sx={{ ml: 2, mb: 1 }}>
                                {result.diagnostics.productPools.map((pool, i) => (
                                  <Typography key={i} variant="caption" display="block" color={pool.productCount === 0 ? 'error' : 'text.secondary'}>
                                    • {pool.ingredient} ({pool.role}): {pool.productCount} products
                                  </Typography>
                                ))}
                              </Box>
                            </>
                          )}

                          {result.diagnostics.suggestion && (
                            <Typography variant="caption" display="block" sx={{ mt: 1, fontStyle: 'italic' }}>
                              💡 {result.diagnostics.suggestion}
                            </Typography>
                          )}
                        </Box>
                      )}
                    </Alert>
                  );
                })}
              </Stack>
            </Paper>
          </Grid>
        )}

        {/* Hard Rules Violations - Post-Cook Cleanup Analysis */}
        {bulkViolationSummary && bulkViolationSummary.totalRecipesFailed > 0 && (
          <Grid item xs={12}>
            {(() => {
              // Calculate complete failures (recipes that produced 0 valid outfits)
              const completeFailures = violationReports.filter(r => r.totalGenerated === r.totalFailed);
              const partialFailures = violationReports.filter(r => r.totalFailed > 0 && r.totalGenerated > r.totalFailed);
              const totalSuccessful = violationReports.reduce((sum, r) => sum + (r.totalGenerated - r.totalFailed), 0);
              const isAnyCompleteFail = completeFailures.length > 0;

              return (
                <Paper sx={{
                  p: 3,
                  bgcolor: isAnyCompleteFail ? 'error.50' : 'info.50',
                  border: 2,
                  borderColor: isAnyCompleteFail ? 'error.main' : 'info.main'
                }}>
                  <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <InfoIcon color={isAnyCompleteFail ? 'error' : 'info'} />
                    {isAnyCompleteFail ? '❌ Recipe Failures Detected' : 'ℹ️ Generation Quality Report'} ({bulkViolationSummary.totalRecipesFailed} recipes)
                  </Typography>
                  <Divider sx={{ mb: 2 }} />

                  <Alert severity={isAnyCompleteFail ? 'error' : 'info'} sx={{ mb: 3 }}>
                    <Typography variant="body2" gutterBottom>
                      <strong>
                        {isAnyCompleteFail
                          ? `${completeFailures.length} recipe${completeFailures.length !== 1 ? 's' : ''} produced 0 valid outfits — needs attention!`
                          : `${totalSuccessful} outfits generated successfully`
                        }
                      </strong>
                    </Typography>
                    <Typography variant="body2" sx={{ mt: 1 }}>
                      {bulkViolationSummary.totalViolations} outfit candidates filtered during generation (normal quality control).
                      {partialFailures.length > 0 && ` ${partialFailures.length} recipe${partialFailures.length !== 1 ? 's' : ''} had some filtering but still succeeded.`}
                    </Typography>
                    {!isAnyCompleteFail && (
                      <Typography variant="body2" sx={{ mt: 1, fontStyle: 'italic', color: 'text.secondary' }}>
                        💡 This is expected behavior — the kitchen pipeline filters out outfits that don't meet structural rules.
                      </Typography>
                    )}
                  </Alert>
                </Paper>
              );
            })()}
          </Grid>
        )}

        {/* Detailed Violation Breakdown - Only show if user wants to dig deeper */}
        {bulkViolationSummary && bulkViolationSummary.totalRecipesFailed > 0 && (
          <Grid item xs={12}>
            <Accordion variant="outlined">
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="subtitle1">
                  📊 View Detailed Violation Breakdown
                </Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Stack spacing={3}>

              {/* Violations by Type */}
              <Typography variant="subtitle1" fontWeight="bold" gutterBottom sx={{ mt: 3 }}>
                Violations by Type
              </Typography>
              <Grid container spacing={2} sx={{ mb: 3 }}>
                {Array.from(bulkViolationSummary.violationsByType.entries()).map(([type, data]) => (
                  <Grid item xs={12} md={6} key={type}>
                    <Accordion variant="outlined" sx={{ bgcolor: getViolationSeverity(type) === 'error' ? 'error.50' : 'warning.50' }}>
                      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                        <Box sx={{ width: '100%' }}>
                          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                            <Typography variant="subtitle2" fontWeight="bold">
                              {getViolationDisplayName(type)}
                            </Typography>
                            <Chip
                              label={`${data.count} violation${data.count !== 1 ? 's' : ''}`}
                              size="small"
                              color={getViolationSeverity(type) === 'error' ? 'error' : 'warning'}
                            />
                          </Stack>
                          <Typography variant="caption" color="text.secondary" display="block">
                            Affects {data.recipes.length} recipe{data.recipes.length !== 1 ? 's' : ''}
                          </Typography>
                        </Box>
                      </AccordionSummary>
                      <AccordionDetails>
                        <Typography variant="body2" sx={{ mb: 2, fontStyle: 'italic' }}>
                          {data.fixSuggestion}
                        </Typography>
                        <Divider sx={{ mb: 2 }} />
                        <Typography variant="caption" fontWeight="bold" display="block" sx={{ mb: 1 }}>
                          Affected Recipes:
                        </Typography>
                        <Stack spacing={1}>
                          {data.recipes.map((recipeTitle, idx) => {
                            const recipe = violationReports.find(r => r.recipeTitle === recipeTitle);
                            const successRate = recipe ? Math.round(((recipe.totalGenerated - recipe.totalFailed) / recipe.totalGenerated) * 100) : 0;
                            return (
                              <Box
                                key={idx}
                                sx={{
                                  p: 1,
                                  bgcolor: 'background.paper',
                                  borderRadius: 1,
                                  border: '1px solid',
                                  borderColor: 'divider',
                                }}
                              >
                                <Typography variant="body2" fontWeight="medium">{recipeTitle}</Typography>
                                {recipe && (
                                  <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
                                    {recipe.totalGenerated - recipe.totalFailed} valid / {recipe.totalGenerated} generated ({successRate}% success)
                                  </Typography>
                                )}
                              </Box>
                            );
                          })}
                        </Stack>
                      </AccordionDetails>
                    </Accordion>
                  </Grid>
                ))}
              </Grid>

              {/* Critical Fixes - Single Issue */}
              {bulkViolationSummary.criticalFixes.length > 0 && (
                <>
                  <Typography variant="subtitle1" fontWeight="bold" gutterBottom sx={{ mt: 3 }}>
                    Quick Fixes ({bulkViolationSummary.criticalFixes.length} recipes)
                  </Typography>
                  <Stack spacing={2} sx={{ mb: 3 }}>
                    {bulkViolationSummary.criticalFixes.map((report) => {
                      const successRate = Math.round(((report.totalGenerated - report.totalFailed) / report.totalGenerated) * 100);
                      const isCompleteFail = report.totalFailed === report.totalGenerated;

                      return (
                        <Card key={report.recipeId} variant="outlined" sx={{
                          borderColor: isCompleteFail ? 'error.main' : 'divider',
                          bgcolor: isCompleteFail ? 'error.50' : 'background.paper'
                        }}>
                          <CardContent>
                            <Box>
                              <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                                <Typography variant="subtitle2" fontWeight="bold">
                                  {report.recipeTitle}
                                </Typography>
                                {isCompleteFail && <Chip label="FAILED" size="small" color="error" />}
                              </Stack>
                              <Stack direction="row" spacing={1} sx={{ mb: 1.5 }}>
                                <Chip
                                  label={`${report.slotCount} slots · ${report.department}`}
                                  size="small"
                                  variant="outlined"
                                />
                                <Chip
                                  label={getViolationDisplayName(report.mostCommonViolation)}
                                  size="small"
                                  color={isCompleteFail ? 'error' : 'warning'}
                                />
                              </Stack>
                              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                                {report.totalGenerated - report.totalFailed} valid / {report.totalGenerated} generated ({successRate}% success)
                              </Typography>
                              <Typography variant="body2" sx={{ color: isCompleteFail ? 'error.dark' : 'info.dark', fontWeight: 500 }}>
                                {isCompleteFail ? '❌' : '💡'} {report.quickFix}
                              </Typography>
                            </Box>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </Stack>
                </>
              )}

              {/* Complex Fixes - Multiple Issues */}
              {bulkViolationSummary.complexFixes.length > 0 && (
                <>
                  <Typography variant="subtitle1" fontWeight="bold" gutterBottom sx={{ mt: 3 }}>
                    Complex Fixes ({bulkViolationSummary.complexFixes.length} recipes)
                  </Typography>
                  <Stack spacing={2}>
                    {bulkViolationSummary.complexFixes.map((report) => {
                      const successRate = Math.round(((report.totalGenerated - report.totalFailed) / report.totalGenerated) * 100);
                      const isCompleteFail = report.totalFailed === report.totalGenerated;

                      return (
                        <Card key={report.recipeId} variant="outlined" sx={{
                          borderColor: isCompleteFail ? 'error.main' : 'divider',
                          bgcolor: isCompleteFail ? 'error.50' : 'background.paper'
                        }}>
                          <CardContent>
                            <Box>
                              <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                                <Typography variant="subtitle2" fontWeight="bold">
                                  {report.recipeTitle}
                                </Typography>
                                {isCompleteFail && <Chip label="FAILED" size="small" color="error" />}
                              </Stack>
                              <Stack direction="row" spacing={1} sx={{ mb: 1.5 }}>
                                <Chip
                                  label={`${report.slotCount} slots · ${report.department}`}
                                  size="small"
                                  variant="outlined"
                                />
                              </Stack>
                              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                                {report.totalGenerated - report.totalFailed} valid / {report.totalGenerated} generated ({successRate}% success)
                              </Typography>
                              <Typography variant="body2" color="text.secondary" gutterBottom sx={{ mt: 1.5 }}>
                                {report.violations.length} violation type{report.violations.length !== 1 ? 's' : ''} detected:
                              </Typography>
                              <Stack spacing={0.5} sx={{ pl: 2 }}>
                                {report.violations.map((violation, idx) => (
                                  <Typography key={idx} variant="body2" color="text.secondary">
                                    • {violation.details}
                                  </Typography>
                                ))}
                              </Stack>
                            </Box>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </Stack>
                </>
              )}
                </Stack>
              </AccordionDetails>
            </Accordion>
          </Grid>
        )}

        {/* Discovery Mode Summary - Only show if candidates were actually captured */}
        {results.length > 0 && discoveryMode && (() => {
          // Count total candidates captured across all results
          const totalCandidatesCaptured = results.reduce((sum, result) => {
            const formalityStation = result.pipelineResults?.find(s => s.station === 'Formality Filter');
            const captured = formalityStation?.metrics?.candidatesCaptured || 0;
            return sum + captured;
          }, 0);

          // Only show if we actually captured candidates
          if (totalCandidatesCaptured === 0) return null;

          return (
            <Grid item xs={12}>
              <Paper sx={{ p: 3, bgcolor: 'info.50' }}>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <LabIcon color="info" />
                  Discovery Mode Results
                </Typography>
                <Divider sx={{ mb: 2 }} />
                <Alert severity="info">
                  <Typography variant="body2" gutterBottom>
                    <strong>{totalCandidatesCaptured} pattern candidate{totalCandidatesCaptured !== 1 ? 's' : ''}</strong> captured from formality filter rejections.
                  </Typography>
                  <Typography variant="body2">
                    <strong>Next step:</strong> Review pattern suggestions at{' '}
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={() => window.location.href = '/pattern-discovery'}
                      sx={{ ml: 1 }}
                    >
                      /pattern-discovery
                    </Button>
                  </Typography>
                </Alert>
              </Paper>
            </Grid>
          );
        })()}

        {/* Success Results */}
        {results.length > 0 && (() => {
          const successfulResults = results.filter(r => r.stats.totalSaved > 0);
          const zeroResults = results.filter(r => r.stats.totalSaved === 0);

          return (
            <>
              {/* Recipes with outfits */}
              {successfulResults.length > 0 && (
                <Grid item xs={12}>
                  <Paper sx={{ p: 3 }}>
                    <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <CheckIcon color="success" />
                      Successful Cooks ({successfulResults.length} recipe{successfulResults.length !== 1 ? 's' : ''})
                    </Typography>
                    <Divider sx={{ mb: 2 }} />

                    <Grid container spacing={2}>
                      {successfulResults.map((result) => (
                        <Grid item xs={12} md={6} key={result.recipeId}>
                          <Card variant="outlined">
                            <CardContent>
                              <Typography variant="subtitle1" gutterBottom>
                                {result.recipeTitle}
                              </Typography>
                              <Stack direction="row" spacing={1} sx={{ mb: 2 }} flexWrap="wrap" gap={0.5}>
                                <Chip
                                  label={`${result.stats.totalSaved} saved`}
                                  color="primary"
                                  size="small"
                                />
                                <Chip
                                  label={`Linked: ${result.stats.totalLinked}`}
                                  color="success"
                                  size="small"
                                />
                                <Chip
                                  label={`Unlinked: ${result.stats.totalUnlinked}`}
                                  color="info"
                                  size="small"
                                />
                                {result.stats.happyAccidents > 0 && (
                                  <Chip
                                    label={`Happy Accidents: ${result.stats.happyAccidents}`}
                                    color="secondary"
                                    size="small"
                                  />
                                )}
                              </Stack>
                              <Typography variant="body2" color="text.secondary">
                                Strategy: {result.strategy}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Generated: {result.stats.totalGenerated} combinations
                        </Typography>
                        {result.stats.formalityFiltered > 0 && (
                          <Typography variant="body2" color="text.secondary">
                            Formality filtered: {result.stats.formalityFiltered} (evening gown + sneakers, etc.)
                          </Typography>
                        )}
                        {result.stats.similarityFiltered > 0 && (
                          <Typography variant="body2" color="text.secondary">
                            Similarity filtered: {result.stats.similarityFiltered} (clashing items)
                          </Typography>
                        )}
                        <Typography variant="body2" color="text.secondary">
                          Valid: {result.stats.totalScored} (passed hard rules)
                        </Typography>
                        {result.ingredientHealth && result.ingredientHealth.missingIngredients.length > 0 && (
                          <Alert severity="error" sx={{ mt: 1 }}>
                            <Typography variant="body2" fontWeight="bold" gutterBottom>
                              ⚠️ Cooking with partial ingredients: {result.ingredientHealth.availableIngredients}/{result.ingredientHealth.totalIngredients} available
                            </Typography>
                            <Typography variant="caption" display="block" sx={{ mt: 1, mb: 0.5 }}>
                              Missing ingredients (0 products found):
                            </Typography>
                            {result.ingredientHealth.missingIngredients.map((missing, idx) => (
                              <Box key={idx} sx={{ ml: 2, mt: 0.5 }}>
                                <Typography variant="caption" display="block">
                                  • <strong>{missing.title}</strong> ({missing.role})
                                </Typography>
                                <Typography variant="caption" display="block" sx={{ ml: 2, fontStyle: 'italic' }}>
                                  Query: "{missing.query}"
                                </Typography>
                              </Box>
                            ))}
                          </Alert>
                        )}
                        {result.errors && result.errors.length > 0 && (
                          <Alert severity="warning" sx={{ mt: 1 }}>
                            {result.errors.join(', ')}
                          </Alert>
                        )}
                      </CardContent>
                    </Card>
                          </Grid>
                        ))}
                      </Grid>
                    </Paper>
                  </Grid>
                )}

                {/* Recipes with zero outfits */}
                {zeroResults.length > 0 && (
                  <Grid item xs={12}>
                    <Paper sx={{ p: 3, bgcolor: 'warning.50' }}>
                      <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <InfoIcon color="warning" />
                        Zero Results ({zeroResults.length} recipe{zeroResults.length !== 1 ? 's' : ''})
                      </Typography>
                      <Divider sx={{ mb: 2 }} />

                      <Alert severity="warning" sx={{ mb: 2 }}>
                        <Typography variant="body2">
                          These recipes completed cooking but generated no outfits. See diagnostics below for details.
                        </Typography>
                      </Alert>

                      <Stack spacing={2}>
                        {zeroResults.map((result) => (
                          <Card key={result.recipeId} variant="outlined" sx={{ bgcolor: 'background.paper' }}>
                            <CardContent>
                              <Typography variant="subtitle1" gutterBottom fontWeight="bold">
                                {result.recipeTitle}
                              </Typography>

                              <Stack direction="row" spacing={1} sx={{ mb: 2 }} flexWrap="wrap" gap={0.5}>
                                <Chip
                                  label={`Generated: ${result.stats.totalGenerated}`}
                                  color={result.stats.totalGenerated === 0 ? 'error' : 'default'}
                                  size="small"
                                />
                                {result.stats.formalityFiltered > 0 && (
                                  <Chip
                                    label={`Formality filtered: ${result.stats.formalityFiltered}`}
                                    color="warning"
                                    size="small"
                                  />
                                )}
                                {result.stats.similarityFiltered > 0 && (
                                  <Chip
                                    label={`Similarity filtered: ${result.stats.similarityFiltered}`}
                                    color="warning"
                                    size="small"
                                  />
                                )}
                                <Chip
                                  label={`Passed hard rules: ${result.stats.totalScored}`}
                                  color={result.stats.totalScored === 0 ? 'error' : 'default'}
                                  size="small"
                                />
                              </Stack>

                              {result.diagnostics && (
                                <Alert severity="info" sx={{ mt: 2 }}>
                                  <Typography variant="caption" fontWeight="bold" display="block" sx={{ mb: 1 }}>
                                    Diagnostics:
                                  </Typography>

                                  {result.diagnostics.productPools && (
                                    <Box sx={{ mb: 1 }}>
                                      <Typography variant="caption" display="block" sx={{ mb: 0.5 }}>
                                        Product pools:
                                      </Typography>
                                      <Box sx={{ ml: 2 }}>
                                        {result.diagnostics.productPools.map((pool, i) => (
                                          <Typography
                                            key={i}
                                            variant="caption"
                                            display="block"
                                            color={pool.productCount === 0 ? 'error' : 'text.secondary'}
                                          >
                                            • {pool.ingredient} ({pool.role}): {pool.productCount} products
                                          </Typography>
                                        ))}
                                      </Box>
                                    </Box>
                                  )}

                                  {result.diagnostics.suggestion && (
                                    <Typography variant="caption" display="block" sx={{ mt: 1, fontStyle: 'italic' }}>
                                      💡 {result.diagnostics.suggestion}
                                    </Typography>
                                  )}

                                  {result.stats.totalGenerated === 0 && (
                                    <Typography variant="caption" display="block" sx={{ mt: 1, color: 'error.main' }}>
                                      ⚠️ Strategy returned 0 combinations - possible AI generation failure or product pools too small.
                                    </Typography>
                                  )}
                                </Alert>
                              )}

                              <Typography variant="caption" display="block" sx={{ mt: 2, fontStyle: 'italic', color: 'text.secondary' }}>
                                Strategy: {result.strategy}
                              </Typography>
                            </CardContent>
                          </Card>
                        ))}
                      </Stack>
                    </Paper>
                  </Grid>
                )}
              </>
            );
          })()
        }
      </Grid>
    </Container>
  );
}
