'use client';

/**
 * Recipe Cookability Analyzer
 * Client-side analysis of which recipes are likely to cook successfully
 */

import { useState, useEffect } from 'react';
import { Container, Typography, Box, Paper, CircularProgress, Chip, Stack, Divider, Alert } from '@mui/material';
import { Science as AnalyzeIcon, CheckCircle, Warning, Error as ErrorIcon } from '@mui/icons-material';
import { getAllRecipes } from '@/lib/recipe-adapter';

interface RecipeAnalysis {
  recipeId: string;
  title: string;
  department: string;
  slotCount: number;
  cookabilityScore: number;
  reasons: string[];
  slots: Array<{
    role: string;
    ingredientTitle: string;
    searchQuery: string;
    productTypes: string[];
  }>;
}

// Product types with good coverage
const WELL_COVERED = ['Tops', 'Bottoms', 'Dresses', 'Shoes', 'Outerwear'];

// Terms that indicate very specific/rare products
const RARE_TERMS = ['shimmer', 'sequin', 'metallic', 'vintage', 'distressed', 'platform', 'wedge'];

// Categories with low coverage
const LOW_COVERAGE = ['jewelry', 'necklace', 'earring', 'bracelet', 'ring', 'bag', 'purse', 'clutch', 'tote'];

function analyzeRecipe(recipe: any): RecipeAnalysis {
  let score = 100;
  const reasons: string[] = [];

  if (!recipe.slots || recipe.slots.length === 0) {
    return {
      recipeId: recipe.id,
      title: recipe.title,
      department: recipe.department,
      slotCount: 0,
      cookabilityScore: 0,
      reasons: ['No slots defined'],
      slots: [],
    };
  }

  const slots = recipe.slots.map((slot: any) => ({
    role: slot.role,
    ingredientTitle: slot.ingredient.ingredientTitle,
    searchQuery: slot.ingredient.searchQuery,
    productTypes: slot.ingredient.productTypes,
  }));

  for (const slot of slots) {
    const productType = slot.productTypes[0];
    const query = slot.searchQuery.toLowerCase();

    // Check product type coverage
    if (!WELL_COVERED.includes(productType)) {
      score -= 15;
      reasons.push(`⚠️ ${slot.role}: "${productType}" has limited coverage`);
    }

    // Check for rare/specific terms
    if (RARE_TERMS.some(term => query.includes(term))) {
      score -= 15;
      reasons.push(`⚠️ ${slot.role}: Very specific search ("${slot.searchQuery}")`);
    }

    // Check for low-coverage categories
    if (LOW_COVERAGE.some(term => query.includes(term))) {
      score -= 25;
      reasons.push(`❌ ${slot.role}: Low coverage category ("${slot.ingredientTitle}")`);
    }

    // Check for color specificity
    const colors = ['yellow', 'purple', 'gold', 'tan', 'burgundy', 'olive'];
    if (colors.some(color => query.includes(color))) {
      score -= 10;
      reasons.push(`⚠️ ${slot.role}: Specific color may limit matches`);
    }
  }

  if (reasons.length === 0) {
    reasons.push('✅ All slots use well-covered product types');
  }

  return {
    recipeId: recipe.id,
    title: recipe.title,
    department: recipe.department,
    slotCount: slots.length,
    cookabilityScore: Math.max(0, score),
    reasons,
    slots,
  };
}

export default function AnalyzePage() {
  const [loading, setLoading] = useState(true);
  const [analysis, setAnalysis] = useState<RecipeAnalysis[]>([]);

  useEffect(() => {
    const recipes = getAllRecipes();
    const analyzed = recipes
      .filter(r => r.slots && r.slots.length >= 4)
      .map(analyzeRecipe)
      .sort((a, b) => b.cookabilityScore - a.cookabilityScore);

    setAnalysis(analyzed);
    setLoading(false);
  }, []);

  const excellent = analysis.filter(r => r.cookabilityScore >= 90);
  const good = analysis.filter(r => r.cookabilityScore >= 70 && r.cookabilityScore < 90);
  const fair = analysis.filter(r => r.cookabilityScore >= 50 && r.cookabilityScore < 70);
  const poor = analysis.filter(r => r.cookabilityScore < 50);

  function getScoreColor(score: number) {
    if (score >= 90) return 'success';
    if (score >= 70) return 'info';
    if (score >= 50) return 'warning';
    return 'error';
  }

  function getScoreIcon(score: number) {
    if (score >= 70) return <CheckCircle />;
    if (score >= 50) return <Warning />;
    return <ErrorIcon />;
  }

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4, textAlign: 'center' }}>
        <CircularProgress />
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <AnalyzeIcon color="primary" fontSize="large" />
          Recipe Cookability Analysis
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Analysis of which recipes are likely to cook successfully based on product availability
        </Typography>
      </Box>

      {/* Summary */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>Summary</Typography>
        <Divider sx={{ mb: 2 }} />
        <Stack direction="row" spacing={2} flexWrap="wrap">
          <Chip label={`Total Recipes: ${analysis.length}`} />
          <Chip label={`Excellent (90+): ${excellent.length}`} color="success" />
          <Chip label={`Good (70-89): ${good.length}`} color="info" />
          <Chip label={`Fair (50-69): ${fair.length}`} color="warning" />
          <Chip label={`Poor (<50): ${poor.length}`} color="error" />
        </Stack>
      </Paper>

      {/* Top Recommendations */}
      {excellent.length > 0 && (
        <Paper sx={{ p: 3, mb: 3 }}>
          <Alert severity="success" sx={{ mb: 2 }}>
            🎉 {excellent.length} recipes have excellent cookability (90+). Start with these!
          </Alert>
          <Typography variant="h6" gutterBottom>Excellent Recipes (Score 90+)</Typography>
          <Divider sx={{ mb: 2 }} />
          <Stack spacing={2}>
            {excellent.map((recipe) => (
              <Paper key={recipe.recipeId} variant="outlined" sx={{ p: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                  <Chip
                    icon={getScoreIcon(recipe.cookabilityScore)}
                    label={`${recipe.cookabilityScore}`}
                    color={getScoreColor(recipe.cookabilityScore)}
                    size="small"
                  />
                  <Typography variant="subtitle1" sx={{ fontWeight: 600, flex: 1 }}>
                    {recipe.title}
                  </Typography>
                  <Chip label={recipe.department} size="small" />
                  <Chip label={`${recipe.slotCount} slots`} size="small" variant="outlined" />
                </Box>
                <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
                  ID: {recipe.recipeId}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {recipe.reasons.join(' • ')}
                </Typography>
              </Paper>
            ))}
          </Stack>
        </Paper>
      )}

      {/* Good Recipes */}
      {good.length > 0 && (
        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" gutterBottom>Good Recipes (Score 70-89)</Typography>
          <Divider sx={{ mb: 2 }} />
          <Stack spacing={2}>
            {good.slice(0, 10).map((recipe) => (
              <Paper key={recipe.recipeId} variant="outlined" sx={{ p: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                  <Chip
                    icon={getScoreIcon(recipe.cookabilityScore)}
                    label={`${recipe.cookabilityScore}`}
                    color={getScoreColor(recipe.cookabilityScore)}
                    size="small"
                  />
                  <Typography variant="subtitle1" sx={{ fontWeight: 600, flex: 1 }}>
                    {recipe.title}
                  </Typography>
                  <Chip label={recipe.department} size="small" />
                  <Chip label={`${recipe.slotCount} slots`} size="small" variant="outlined" />
                </Box>
                <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
                  ID: {recipe.recipeId}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {recipe.reasons.join(' • ')}
                </Typography>
              </Paper>
            ))}
            {good.length > 10 && (
              <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center' }}>
                ... and {good.length - 10} more
              </Typography>
            )}
          </Stack>
        </Paper>
      )}

      {/* Fair/Poor Summary */}
      {(fair.length > 0 || poor.length > 0) && (
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>Lower Cookability Recipes</Typography>
          <Divider sx={{ mb: 2 }} />
          <Alert severity="warning">
            {fair.length} fair recipes (50-69) and {poor.length} poor recipes (&lt;50) will likely fail due to missing products.
            These need more product coverage before they can cook successfully.
          </Alert>
        </Paper>
      )}
    </Container>
  );
}
