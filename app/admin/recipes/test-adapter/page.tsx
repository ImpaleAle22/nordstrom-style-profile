'use client';

import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Container,
  Card,
  CardContent,
  Button,
  Stack,
  Divider,
  Chip,
} from '@mui/material';
import { getAllRecipes, type RecipeBuilderRecipe } from '@/lib/supabase-recipe-storage';
import {
  convertRecipeToComposerFormat,
  type ComposerRecipe,
} from '@/lib/recipe-adapter';

export default function TestAdapterPage() {
  const [recipes, setRecipes] = useState<RecipeBuilderRecipe[]>([]);
  const [selectedRecipe, setSelectedRecipe] = useState<RecipeBuilderRecipe | null>(null);
  const [convertedRecipe, setConvertedRecipe] = useState<ComposerRecipe | null>(null);

  useEffect(() => {
    // Load recipes from localStorage
    const loadedRecipes = getAllRecipes();
    setRecipes(loadedRecipes);
  }, []);

  const handleSelectRecipe = (recipe: RecipeBuilderRecipe) => {
    setSelectedRecipe(recipe);
    const converted = convertRecipeToComposerFormat(recipe);
    setConvertedRecipe(converted);
  };

  return (
    <Container maxWidth="xl" sx={{ py: 6 }}>
      <Typography variant="h3" gutterBottom>
        Recipe Adapter Test
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        Test conversion from Recipe Builder format → Outfit Composer format
      </Typography>

      <Stack direction="row" spacing={3}>
        {/* Recipe List */}
        <Box sx={{ width: 300 }}>
          <Typography variant="h6" gutterBottom>
            Published Recipes ({recipes.length})
          </Typography>
          <Stack spacing={2}>
            {recipes.length === 0 ? (
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="body2" color="text.secondary">
                    No recipes found. Create one first!
                  </Typography>
                </CardContent>
              </Card>
            ) : (
              recipes.map((recipe) => (
                <Card
                  key={recipe.id}
                  variant="outlined"
                  sx={{
                    cursor: 'pointer',
                    bgcolor:
                      selectedRecipe?.id === recipe.id
                        ? 'primary.50'
                        : 'background.paper',
                    borderColor:
                      selectedRecipe?.id === recipe.id
                        ? 'primary.main'
                        : 'divider',
                    '&:hover': {
                      borderColor: 'primary.main',
                      bgcolor: 'primary.50',
                    },
                  }}
                  onClick={() => handleSelectRecipe(recipe)}
                >
                  <CardContent>
                    <Typography variant="body1" fontWeight={500} gutterBottom>
                      {recipe.title}
                    </Typography>
                    <Stack direction="row" spacing={1} sx={{ mb: 1 }}>
                      <Chip label={recipe.department} size="small" />
                      <Chip label={`${recipe.slotCount} slots`} size="small" />
                    </Stack>
                    {recipe.seasons.length > 0 && (
                      <Typography variant="caption" color="text.secondary">
                        {recipe.seasons.join(', ')}
                      </Typography>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </Stack>
        </Box>

        {/* Conversion Results */}
        <Box sx={{ flex: 1 }}>
          {!selectedRecipe ? (
            <Card variant="outlined">
              <CardContent>
                <Typography variant="body1" color="text.secondary">
                  Select a recipe to test conversion
                </Typography>
              </CardContent>
            </Card>
          ) : (
            <Stack spacing={3}>
              {/* Recipe Builder Format */}
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom color="primary">
                    Recipe Builder Format (localStorage)
                  </Typography>
                  <Box
                    component="pre"
                    sx={{
                      bgcolor: 'grey.50',
                      p: 2,
                      borderRadius: 1,
                      overflow: 'auto',
                      fontSize: '0.875rem',
                      fontFamily: 'monospace',
                    }}
                  >
                    {JSON.stringify(selectedRecipe, null, 2)}
                  </Box>
                </CardContent>
              </Card>

              <Divider>
                <Chip label="CONVERTED TO" />
              </Divider>

              {/* Outfit Composer Format */}
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom color="success.main">
                    Outfit Composer Format
                  </Typography>
                  <Box
                    component="pre"
                    sx={{
                      bgcolor: 'grey.50',
                      p: 2,
                      borderRadius: 1,
                      overflow: 'auto',
                      fontSize: '0.875rem',
                      fontFamily: 'monospace',
                    }}
                  >
                    {JSON.stringify(convertedRecipe, null, 2)}
                  </Box>
                </CardContent>
              </Card>

              {/* Slot Breakdown */}
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Slot Breakdown
                  </Typography>
                  <Stack spacing={2}>
                    {convertedRecipe?.slots.map((slot, i) => (
                      <Box
                        key={i}
                        sx={{
                          p: 2,
                          bgcolor: 'grey.50',
                          borderRadius: 1,
                          border: 1,
                          borderColor: 'divider',
                        }}
                      >
                        <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 1 }}>
                          <Chip label={`Slot ${i + 1}`} color="primary" size="small" />
                          <Chip label={`Role: ${slot.role}`} variant="outlined" size="small" />
                        </Stack>
                        <Typography variant="body2" fontWeight={500}>
                          {slot.ingredientSet.displayTitle}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                          Query: {slot.ingredientSet.query}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                          PT1: {slot.ingredientSet.productType1}
                          {slot.ingredientSet.productType2 && ` | PT2: ${slot.ingredientSet.productType2.join(', ')}`}
                        </Typography>
                        {slot.ingredientSet.brands && slot.ingredientSet.brands.length > 0 && (
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                            Brands: {slot.ingredientSet.brands.join(', ')}
                          </Typography>
                        )}
                      </Box>
                    ))}
                  </Stack>
                </CardContent>
              </Card>

              {/* Copy Button */}
              <Button
                variant="contained"
                size="large"
                onClick={() => {
                  navigator.clipboard.writeText(JSON.stringify(convertedRecipe, null, 2));
                  alert('Copied Composer format to clipboard!');
                }}
              >
                Copy Composer Format to Clipboard
              </Button>
            </Stack>
          )}
        </Box>
      </Stack>
    </Container>
  );
}
