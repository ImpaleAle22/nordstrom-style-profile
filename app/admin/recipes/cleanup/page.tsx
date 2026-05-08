'use client';

/**
 * Recipe Cleanup Utility
 * Strip base64 images from existing recipes in IndexedDB to save space
 */

import { useState } from 'react';
import {
  Container,
  Typography,
  Box,
  Button,
  Paper,
  Alert,
  LinearProgress,
  Chip,
  Stack,
} from '@mui/material';
import CleaningServicesIcon from '@mui/icons-material/CleaningServices';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { getAllRecipes, saveRecipesBatch } from '@/lib/indexeddb-storage';

interface CleanupStats {
  totalRecipes: number;
  recipesWithImages: number;
  totalSizeBeforeMB: number;
  totalSizeAfterMB: number;
  savedMB: number;
  completed: boolean;
}

export default function RecipeCleanupPage() {
  const [cleaning, setCleaning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [stats, setStats] = useState<CleanupStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function runCleanup() {
    setCleaning(true);
    setError(null);
    setProgress(0);

    try {
      // Load all recipes
      setProgress(10);
      const recipes = await getAllRecipes();

      // Calculate sizes and strip images
      let totalSizeBefore = 0;
      let totalSizeAfter = 0;
      let recipesWithImages = 0;

      const cleanedRecipes = recipes.map((recipe, index) => {
        const recipeSizeBefore = JSON.stringify(recipe).length;
        totalSizeBefore += recipeSizeBefore;

        // Check if recipe has base64 image
        const hasBase64 = recipe.aiMetadata?.sourceImageUrl?.startsWith('data:image');

        let cleaned = recipe;
        if (hasBase64) {
          recipesWithImages++;

          // Strip the base64 data
          cleaned = {
            ...recipe,
            aiMetadata: {
              ...recipe.aiMetadata,
              sourceImageUrl: recipe.aiMetadata.sourceImageUrl.split(',')[0] + ',<base64-stripped-for-storage>'
            }
          };
        }

        const recipeSizeAfter = JSON.stringify(cleaned).length;
        totalSizeAfter += recipeSizeAfter;

        // Update progress
        setProgress(10 + (index / recipes.length) * 70);

        return cleaned;
      });

      // Save cleaned recipes back to IndexedDB
      setProgress(80);
      await saveRecipesBatch(cleanedRecipes);

      // Calculate stats
      const savedBytes = totalSizeBefore - totalSizeAfter;
      const statsData: CleanupStats = {
        totalRecipes: recipes.length,
        recipesWithImages,
        totalSizeBeforeMB: totalSizeBefore / 1024 / 1024,
        totalSizeAfterMB: totalSizeAfter / 1024 / 1024,
        savedMB: savedBytes / 1024 / 1024,
        completed: true,
      };

      setStats(statsData);
      setProgress(100);

      console.log('✓ Recipe cleanup completed:', statsData);
    } catch (err) {
      console.error('Cleanup failed:', err);
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setCleaning(false);
    }
  }

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom>
          Recipe Storage Cleanup
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Strip base64-encoded images from recipes to reduce IndexedDB storage usage.
          This will free up browser storage without affecting recipe functionality.
        </Typography>
      </Box>

      {/* Warning Box */}
      <Alert severity="info" sx={{ mb: 3 }}>
        <Typography variant="body2" fontWeight={600} gutterBottom>
          What this does:
        </Typography>
        <Typography variant="body2" component="div">
          • Removes embedded base64 images from recipe metadata<br />
          • Keeps all recipe data (ingredients, slots, titles, etc.)<br />
          • Can save 2+ GB of browser storage<br />
          • Safe operation - recipes remain fully functional
        </Typography>
      </Alert>

      {/* Action Button */}
      {!stats && (
        <Paper sx={{ p: 3, textAlign: 'center', mb: 3 }}>
          <Button
            variant="contained"
            size="large"
            startIcon={<CleaningServicesIcon />}
            onClick={runCleanup}
            disabled={cleaning}
            sx={{ minWidth: 200 }}
          >
            {cleaning ? 'Cleaning...' : 'Run Cleanup'}
          </Button>

          {cleaning && (
            <Box sx={{ mt: 3 }}>
              <LinearProgress variant="determinate" value={progress} />
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                Progress: {Math.round(progress)}%
              </Typography>
            </Box>
          )}
        </Paper>
      )}

      {/* Error Display */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          <Typography variant="body2" fontWeight={600}>
            Cleanup failed:
          </Typography>
          <Typography variant="body2">{error}</Typography>
        </Alert>
      )}

      {/* Results Display */}
      {stats && stats.completed && (
        <Paper sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
            <CheckCircleIcon color="success" fontSize="large" />
            <Typography variant="h5" color="success.main">
              Cleanup Complete!
            </Typography>
          </Box>

          <Stack spacing={2}>
            <Box>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Total Recipes Processed
              </Typography>
              <Typography variant="h4">{stats.totalRecipes}</Typography>
            </Box>

            <Box>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Recipes with Base64 Images
              </Typography>
              <Typography variant="h4" color="warning.main">
                {stats.recipesWithImages}
              </Typography>
            </Box>

            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              <Chip
                label={`Before: ${stats.totalSizeBeforeMB.toFixed(1)} MB`}
                color="error"
                variant="outlined"
              />
              <Chip
                label={`After: ${stats.totalSizeAfterMB.toFixed(1)} MB`}
                color="success"
                variant="outlined"
              />
            </Box>

            <Box>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Storage Saved
              </Typography>
              <Typography variant="h3" color="success.main">
                {stats.savedMB.toFixed(1)} MB
              </Typography>
              <Typography variant="caption" color="text.secondary">
                ({((stats.savedMB / stats.totalSizeBeforeMB) * 100).toFixed(1)}% reduction)
              </Typography>
            </Box>
          </Stack>

          <Box sx={{ mt: 3, pt: 3, borderTop: 1, borderColor: 'divider' }}>
            <Button
              variant="outlined"
              onClick={() => window.location.href = '/recipes'}
              fullWidth
            >
              Return to Recipes
            </Button>
          </Box>
        </Paper>
      )}
    </Container>
  );
}
