'use client';

import { useState } from 'react';
import {
  Container,
  Typography,
  Box,
  Button,
  Paper,
  Alert,
  CircularProgress,
  Stack,
  Card,
  CardContent,
  Divider,
} from '@mui/material';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { importAIRecipes, getRecipeStats, clearAllRecipes } from '@/lib/recipe-adapter';
import type { UnifiedRecipe } from '@/lib/unified-recipe-types';

export default function ImportRecipesPage() {
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ success: boolean; count: number; message: string } | null>(null);
  const [stats, setStats] = useState<ReturnType<typeof getRecipeStats> | null>(null);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setImporting(true);
    setResult(null);

    try {
      const text = await file.text();
      const data = JSON.parse(text);

      // Support both formats:
      // 1. Direct array of UnifiedRecipe
      // 2. Object with recipes array (from transform script output)
      const recipes: UnifiedRecipe[] = Array.isArray(data) ? data : data.recipes || [];

      if (recipes.length === 0) {
        setResult({
          success: false,
          count: 0,
          message: 'No recipes found in file',
        });
        return;
      }

      const importedCount = importAIRecipes(recipes);

      setResult({
        success: true,
        count: importedCount,
        message: `Successfully imported ${importedCount} new recipes (${recipes.length - importedCount} duplicates skipped)`,
      });

      // Update stats
      setStats(getRecipeStats());
    } catch (error) {
      setResult({
        success: false,
        count: 0,
        message: error instanceof Error ? error.message : 'Failed to import recipes',
      });
    } finally {
      setImporting(false);
    }
  };

  const handleClearAll = () => {
    if (confirm('⚠️  Are you sure you want to delete ALL recipes? This cannot be undone!')) {
      clearAllRecipes();
      setStats(getRecipeStats());
      setResult({
        success: true,
        count: 0,
        message: 'All recipes cleared',
      });
    }
  };

  const handleRefreshStats = () => {
    setStats(getRecipeStats());
  };

  return (
    <Container maxWidth="md" sx={{ py: 6 }}>
      <Typography variant="h3" gutterBottom>
        Import AI Recipes
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        Import AI-generated recipes from JSON files into the Recipe Manager
      </Typography>

      {/* Current Stats */}
      {stats && (
        <Card sx={{ mb: 4 }}>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">Current Recipe Stats</Typography>
              <Button size="small" onClick={handleRefreshStats}>
                Refresh
              </Button>
            </Box>
            <Stack spacing={2}>
              <Box>
                <Typography variant="body2" color="text.secondary">
                  Total Recipes
                </Typography>
                <Typography variant="h4">{stats.total}</Typography>
              </Box>
              <Divider />
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                <Box>
                  <Typography variant="caption" color="text.secondary" display="block">
                    By Source
                  </Typography>
                  <Typography variant="body2">
                    Manual: {stats.bySource.manual} | AI: {stats.bySource.aiVision}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary" display="block">
                    By Department
                  </Typography>
                  <Typography variant="body2">
                    W: {stats.byDepartment.Womenswear} | M: {stats.byDepartment.Menswear}
                  </Typography>
                </Box>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary" display="block">
                  By Slot Count
                </Typography>
                <Typography variant="body2">
                  4-item: {stats.bySlotCount[4]} | 5-item: {stats.bySlotCount[5]} | 6-item: {stats.bySlotCount[6]}
                </Typography>
              </Box>
            </Stack>
          </CardContent>
        </Card>
      )}

      {!stats && (
        <Alert severity="info" sx={{ mb: 4 }}>
          <Button size="small" onClick={handleRefreshStats}>
            Load Current Stats
          </Button>
        </Alert>
      )}

      {/* Upload Section */}
      <Paper sx={{ p: 4, textAlign: 'center' }}>
        <UploadFileIcon sx={{ fontSize: 64, color: 'primary.main', mb: 2 }} />
        <Typography variant="h6" gutterBottom>
          Upload Recipe JSON File
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Expected file: <code>/scripts/unified-recipes.json</code>
        </Typography>

        <Button
          variant="contained"
          component="label"
          disabled={importing}
          startIcon={importing ? <CircularProgress size={20} /> : <UploadFileIcon />}
        >
          {importing ? 'Importing...' : 'Choose File'}
          <input type="file" accept=".json" hidden onChange={handleFileUpload} />
        </Button>
      </Paper>

      {/* Result Message */}
      {result && (
        <Alert severity={result.success ? 'success' : 'error'} sx={{ mt: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {result.success && <CheckCircleIcon />}
            <Typography variant="body2">{result.message}</Typography>
          </Box>
        </Alert>
      )}

      {/* Danger Zone */}
      <Paper sx={{ p: 3, mt: 4, bgcolor: 'error.50', border: 1, borderColor: 'error.main' }}>
        <Typography variant="h6" color="error" gutterBottom>
          Danger Zone
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Clear all recipes from localStorage (cannot be undone)
        </Typography>
        <Button variant="outlined" color="error" onClick={handleClearAll}>
          Clear All Recipes
        </Button>
      </Paper>

      {/* Instructions */}
      <Paper sx={{ p: 3, mt: 4, bgcolor: 'grey.50' }}>
        <Typography variant="h6" gutterBottom>
          How to Import AI Recipes
        </Typography>
        <Typography component="div" variant="body2" color="text.secondary">
          <ol>
            <li>
              Generate unified recipes:
              <pre style={{ background: '#000', color: '#fff', padding: 8, borderRadius: 4, marginTop: 8 }}>
                cd /scripts && node transform-recipes-to-unified.cjs
              </pre>
            </li>
            <li>
              Upload the generated file: <code>/scripts/unified-recipes.json</code>
            </li>
            <li>Recipes will be imported into localStorage and appear in Recipe Manager</li>
          </ol>
        </Typography>
      </Paper>
    </Container>
  );
}
