'use client';

import {
  Dialog,
  DialogContent,
  Box,
  Typography,
  IconButton,
  Chip,
  Grid,
  Card,
  CardContent,
  Divider,
  Stack,
  Button,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import EditIcon from '@mui/icons-material/Edit';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import DeleteIcon from '@mui/icons-material/Delete';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import ScienceIcon from '@mui/icons-material/Science';
import { useRouter } from 'next/navigation';
import type { RecipeBuilderRecipe } from '@/lib/recipe-adapter';

interface RecipeDetailModalProps {
  open: boolean;
  onClose: () => void;
  recipe: RecipeBuilderRecipe | null;
  onDelete?: (id: string) => void;
}

export default function RecipeDetailModal({ open, onClose, recipe, onDelete }: RecipeDetailModalProps) {
  const router = useRouter();

  if (!recipe) return null;

  const slots = recipe.slots || [];
  const seasonsText = recipe.seasons && recipe.seasons.length > 0 ? recipe.seasons.join(', ') : 'All Season';
  const colors = { bg: '#f3e5f5', text: '#9c27b0', border: '#ce93d8' };

  const handleCookRecipe = () => {
    // Store recipe ID in sessionStorage for cooker page to pick up
    sessionStorage.setItem('cookRecipeId', recipe.id);
    router.push('/cooker');
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          maxHeight: '90vh',
        },
      }}
    >
      <DialogContent sx={{ p: 4 }}>
        {/* Header Actions */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
          <Stack direction="row" spacing={1}>
            <Button
              variant="contained"
              size="small"
              startIcon={<ScienceIcon />}
              onClick={handleCookRecipe}
              sx={{ textTransform: 'none' }}
            >
              Cook Recipe
            </Button>
            <IconButton size="small">
              <EditIcon fontSize="small" />
            </IconButton>
            <IconButton size="small">
              <VisibilityOffIcon fontSize="small" />
            </IconButton>
            <IconButton size="small" onClick={() => onDelete && onDelete(recipe.id)}>
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Stack>
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>

        {/* Recipe Header */}
        <Box sx={{ mb: 3 }}>
          {/* Badges */}
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <Chip
              label="Outfit"
              variant="outlined"
              sx={{
                fontFamily: 'monospace',
                fontWeight: 600,
                fontSize: '13px',
                height: '28px',
                borderRadius: 1.5,
                borderColor: colors.text,
                color: colors.text,
                borderWidth: 2,
              }}
            />
            <Typography sx={{ mx: 0.5, color: colors.text, fontWeight: 700 }}>•</Typography>
            <Chip
              label=".RECIPE"
              variant="outlined"
              sx={{
                fontFamily: 'monospace',
                fontWeight: 600,
                fontSize: '13px',
                height: '28px',
                borderRadius: 1.5,
                borderColor: colors.text,
                color: colors.text,
                borderWidth: 2,
              }}
            />
            <Box sx={{ flexGrow: 1 }} />
            <Chip
              label={`#${recipe.id.split('_').pop()?.slice(0, 4) || recipe.id.slice(0, 4)}`}
              variant="outlined"
              sx={{
                fontFamily: 'monospace',
                fontWeight: 600,
                fontSize: '13px',
                height: '28px',
                borderRadius: 1.5,
                borderColor: colors.text,
                color: colors.text,
                borderWidth: 2,
              }}
            />
          </Box>

          {/* Title */}
          <Typography variant="h4" sx={{ fontWeight: 600, mb: 2 }}>
            {recipe.title}
          </Typography>

          <Divider sx={{ mb: 2 }} />

          {/* Metadata */}
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 3, mb: 2 }}>
            <Box>
              <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5 }}>
                last cook date
              </Typography>
              <Typography variant="h6" fontWeight={600}>
                {new Date(recipe.createdAt).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: '2-digit',
                  day: '2-digit',
                }).replace(/\//g, '-')}
              </Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5 }}>
                outfits created
              </Typography>
              <Typography variant="h6" fontWeight={600}>
                384 {recipe.department}
              </Typography>
            </Box>
          </Box>

          {/* Department and Season chips */}
          <Box sx={{ display: 'flex', gap: 1.5 }}>
            <Chip
              label={recipe.department}
              sx={{
                fontSize: '14px',
                height: '32px',
                bgcolor: 'grey.100',
                borderRadius: 4,
              }}
            />
            <Chip
              label={seasonsText}
              sx={{
                fontSize: '14px',
                height: '32px',
                bgcolor: 'grey.100',
                borderRadius: 4,
              }}
            />
          </Box>
        </Box>

        {/* Ingredient Slots Grid */}
        <Grid container spacing={2}>
          {slots.map((slot, index) => {
            const ingredient = slot.ingredient;

            // Skip slots with no ingredient (data issue)
            if (!ingredient) {
              return (
                <Grid item xs={12} md={6} key={index}>
                  <Card sx={{ bgcolor: 'error.50', border: 1, borderColor: 'error.200' }}>
                    <CardContent>
                      <Typography variant="body2" color="error">
                        ⚠️ Missing ingredient for role: {slot.role}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              );
            }

            const pt2Text = ingredient.materials?.join(', ') || 'N/A';
            const brandsText = ingredient.brands?.length > 0 ? ingredient.brands.join(', ') : 'some brands go here';

            return (
              <Grid item xs={12} md={6} key={index}>
                <Card sx={{ bgcolor: 'grey.50' }}>
                  <CardContent>
                    {/* Ingredient Header */}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                      <AutoAwesomeIcon sx={{ color: 'primary.main' }} />
                      <Typography variant="h6" fontWeight={600}>
                        {ingredient.ingredientTitle}
                      </Typography>
                    </Box>

                    {/* Product Thumbnails */}
                    <Box
                      sx={{
                        bgcolor: 'white',
                        p: 1.5,
                        borderRadius: 1,
                        mb: 2,
                        display: 'flex',
                        gap: 1,
                        overflowX: 'auto',
                      }}
                    >
                      {/* Placeholder for product images */}
                      {Array.from({ length: 8 }).map((_, i) => (
                        <Box
                          key={i}
                          sx={{
                            minWidth: 60,
                            width: 60,
                            height: 80,
                            bgcolor: 'grey.200',
                            borderRadius: 1,
                          }}
                        />
                      ))}
                    </Box>

                    {/* Ingredient Details */}
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="caption" color="text.secondary">
                          query
                        </Typography>
                        <Typography variant="body2" fontWeight={500} sx={{ textAlign: 'right' }}>
                          {ingredient.searchQuery}
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="caption" color="text.secondary">
                          department
                        </Typography>
                        <Typography variant="body2" fontWeight={500}>
                          {recipe.department}
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="caption" color="text.secondary">
                          productType
                        </Typography>
                        <Typography variant="body2" fontWeight={500} sx={{ textAlign: 'right' }}>
                          {ingredient.productTypes[0]} - {pt2Text}
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="caption" color="text.secondary">
                          brand
                        </Typography>
                        <Typography variant="body2" fontWeight={500} sx={{ textAlign: 'right' }}>
                          {brandsText}
                        </Typography>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      </DialogContent>
    </Dialog>
  );
}
