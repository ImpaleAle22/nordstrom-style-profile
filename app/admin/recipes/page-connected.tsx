'use client';

import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  Stack,
  Chip,
  Grid,
  CircularProgress,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { useRouter } from 'next/navigation';
import { useAllOutfitRecipes } from '@/lib/recipe-hooks';

export default function RecipesPageConnected() {
  const router = useRouter();
  const { recipes, isLoading, isError } = useAllOutfitRecipes();

  if (isLoading) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '100vh',
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  if (isError) {
    return (
      <Box sx={{ p: 6 }}>
        <Typography variant="h4" color="error">
          Error loading recipes
        </Typography>
        <Typography variant="body1" sx={{ mt: 2 }}>
          Could not connect to Sanity CMS. Please check your environment variables.
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 6, maxWidth: 1400, mx: 'auto' }}>
      {/* Header */}
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        sx={{ mb: 4 }}
      >
        <Box>
          <Typography variant="h2" gutterBottom>
            Outfit Recipes
          </Typography>
          <Typography variant="body1" color="text.secondary">
            {recipes.length} {recipes.length === 1 ? 'recipe' : 'recipes'} total
          </Typography>
        </Box>
        <Button
          variant="contained"
          size="large"
          startIcon={<AddIcon />}
          onClick={() => router.push('/recipes/outfit/new')}
        >
          New Recipe
        </Button>
      </Stack>

      {/* Empty State */}
      {recipes.length === 0 && (
        <Card variant="outlined" sx={{ textAlign: 'center', py: 8 }}>
          <CardContent>
            <Typography variant="h4" gutterBottom>
              No recipes yet
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
              Create your first outfit recipe to get started
            </Typography>
            <Button
              variant="contained"
              size="large"
              startIcon={<AddIcon />}
              onClick={() => router.push('/recipes/outfit/new')}
            >
              Create First Recipe
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Recipe Grid */}
      {recipes.length > 0 && (
        <Grid container spacing={3}>
          {recipes.map((recipe) => (
            <Grid item xs={12} sm={6} md={4} key={recipe._id}>
              <Card
                variant="outlined"
                sx={{
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  '&:hover': {
                    borderColor: 'primary.main',
                    boxShadow: 2,
                  },
                }}
                onClick={() => router.push(`/recipes/outfit/${recipe._id}`)}
              >
                <CardContent>
                  <Stack spacing={2}>
                    {/* Title */}
                    <Typography variant="h5" fontWeight={600}>
                      {recipe.title}
                    </Typography>

                    {/* Metadata */}
                    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                      <Chip
                        label={recipe.department}
                        size="small"
                        variant="outlined"
                      />
                      {recipe.season && (
                        <Chip label={recipe.season} size="small" variant="outlined" />
                      )}
                      <Chip
                        label={`${recipe.slotCount} slots`}
                        size="small"
                        variant="outlined"
                      />
                      {recipe.aiGenerated && (
                        <Chip
                          label="AI Generated"
                          size="small"
                          color="secondary"
                          variant="outlined"
                        />
                      )}
                    </Stack>

                    {/* Stats */}
                    <Box>
                      <Typography variant="body2" color="text.secondary">
                        {recipe.sampleCount} sample outfit
                        {recipe.sampleCount !== 1 ? 's' : ''}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Created {new Date(recipe._createdAt).toLocaleDateString()}
                      </Typography>
                    </Box>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
    </Box>
  );
}
