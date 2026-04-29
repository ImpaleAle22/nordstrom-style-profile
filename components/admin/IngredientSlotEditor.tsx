'use client';

import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Autocomplete,
  Button,
  Stack,
  Chip,
  IconButton,
  Collapse
} from '@mui/material';
import LockIcon from '@mui/icons-material/Lock';
import LockOpenIcon from '@mui/icons-material/LockOpen';
import EditIcon from '@mui/icons-material/Edit';
import { useState } from 'react';
import type { IngredientSet } from '@/lib/types';

interface IngredientSlotEditorProps {
  slotIndex: number;
  role?: string;
  productType: string;
  value: IngredientSet | null;
  availableIngredients: IngredientSet[];
  onChange: (ingredient: IngredientSet | null) => void;
}

export default function IngredientSlotEditor({
  slotIndex,
  role,
  productType,
  value,
  availableIngredients,
  onChange
}: IngredientSlotEditorProps) {
  const [isLocked, setIsLocked] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  // Form state for creating new ingredient
  const [displayTitle, setDisplayTitle] = useState('');
  const [query, setQuery] = useState('');
  const [brands, setBrands] = useState('');
  const [tags, setTags] = useState('');

  const handleSelectExisting = (ingredient: IngredientSet | null) => {
    if (ingredient) {
      onChange(ingredient);
      setIsLocked(true);
      setIsExpanded(false);
    }
  };

  const handleUnlock = () => {
    setIsLocked(false);
    // When unlocking, populate form with current values to create variant
    if (value) {
      setDisplayTitle(value.displayTitle);
      setQuery(value.query);
      setBrands(value.brands?.join(', ') || '');
      setTags(value.tags?.join(', ') || '');
    }
  };

  const handleCreateNew = () => {
    // Create new ingredient set object
    const newIngredient: IngredientSet = {
      _id: `temp-${Date.now()}`,
      setId: `ingredient-${Date.now()}`,
      displayTitle,
      query,
      department: 'Womenswear', // Will be inherited from recipe
      productType1: productType,
      brands: brands ? brands.split(',').map(b => b.trim()) : undefined,
      tags: tags ? tags.split(',').map(t => t.trim()) : undefined,
      products: [],
      usedInRecipes: 0
    };
    onChange(newIngredient);
    setIsLocked(true);
    setIsExpanded(false);
  };

  const isFormValid = displayTitle.trim() !== '' && query.trim() !== '';

  return (
    <Card variant="outlined">
      <CardContent>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 2 }}>
          <Box>
            <Typography variant="h4" gutterBottom>
              Slot {slotIndex + 1}: {productType}
            </Typography>
            {role && (
              <Typography variant="caption" color="text.secondary">
                Role: {role}
              </Typography>
            )}
          </Box>
          {value && isLocked && (
            <Stack direction="row" spacing={1}>
              <IconButton size="small" onClick={handleUnlock} title="Unlock to edit/create variant">
                <LockOpenIcon fontSize="small" />
              </IconButton>
            </Stack>
          )}
        </Stack>

        {!value || !isLocked ? (
          <Stack spacing={3}>
            <Autocomplete
              options={availableIngredients}
              getOptionLabel={(option) => option.displayTitle}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Select Existing Ingredient"
                  placeholder="Search existing ingredients..."
                  helperText="Choose an existing ingredient set or create a new one below"
                />
              )}
              renderOption={(props, option) => (
                <li {...props}>
                  <Box>
                    <Typography variant="body2">{option.displayTitle}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {option.query} • Used in {option.usedInRecipes || 0} recipes
                    </Typography>
                  </Box>
                </li>
              )}
              onChange={(_event, newValue) => handleSelectExisting(newValue)}
              fullWidth
            />

            <Box sx={{ textAlign: 'center', py: 1 }}>
              <Typography variant="caption" color="text.secondary">
                OR
              </Typography>
            </Box>

            <Box>
              <Button
                variant="outlined"
                fullWidth
                onClick={() => setIsExpanded(!isExpanded)}
                endIcon={<EditIcon />}
              >
                {isExpanded ? 'Hide Form' : 'Create New Ingredient Set'}
              </Button>
            </Box>

            <Collapse in={isExpanded}>
              <Stack spacing={2} sx={{ pt: 2, borderTop: 1, borderColor: 'divider' }}>
                <Typography variant="body2" fontWeight={500}>
                  New Ingredient Set for {productType}
                </Typography>

                <TextField
                  label="Display Title"
                  value={displayTitle}
                  onChange={(e) => setDisplayTitle(e.target.value)}
                  placeholder="e.g., Silk Blouses - Neutral Tones"
                  required
                  fullWidth
                />

                <TextField
                  label="Search Query"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="e.g., silk blouse"
                  helperText="The search query that will find matching products"
                  required
                  fullWidth
                />

                <TextField
                  label="Brands (Optional)"
                  value={brands}
                  onChange={(e) => setBrands(e.target.value)}
                  placeholder="e.g., Theory, Vince, Equipment"
                  helperText="Comma-separated list of brand names to filter by"
                  fullWidth
                />

                <TextField
                  label="Tags (Optional)"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  placeholder="e.g., neutral, workwear, silk"
                  helperText="Comma-separated tags for categorizing"
                  fullWidth
                />

                <Button
                  variant="contained"
                  onClick={handleCreateNew}
                  disabled={!isFormValid}
                  fullWidth
                >
                  Create Ingredient Set
                </Button>
              </Stack>
            </Collapse>
          </Stack>
        ) : (
          // Locked state - showing selected ingredient
          <Box>
            <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
              <Chip label="Locked" icon={<LockIcon />} size="small" color="success" />
              {value.basedOn && <Chip label="Variant" size="small" variant="outlined" />}
            </Stack>

            <Stack spacing={2}>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Display Title
                </Typography>
                <Typography variant="body2">{value.displayTitle}</Typography>
              </Box>

              <Box>
                <Typography variant="caption" color="text.secondary">
                  Search Query
                </Typography>
                <Typography variant="body2" fontFamily="monospace" sx={{ bgcolor: 'grey.100', px: 1.5, py: 0.5, borderRadius: 1, display: 'inline-block' }}>
                  {value.query}
                </Typography>
              </Box>

              {value.brands && value.brands.length > 0 && (
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Brands
                  </Typography>
                  <Typography variant="body2">{value.brands.join(', ')}</Typography>
                </Box>
              )}

              {value.tags && value.tags.length > 0 && (
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Tags
                  </Typography>
                  <Stack direction="row" spacing={0.5}>
                    {value.tags.map((tag) => (
                      <Chip key={tag} label={tag} size="small" variant="outlined" />
                    ))}
                  </Stack>
                </Box>
              )}

              {value.usedInRecipes !== undefined && value.usedInRecipes > 0 && (
                <Typography variant="caption" color="text.secondary">
                  This ingredient is used in {value.usedInRecipes} other recipe{value.usedInRecipes !== 1 ? 's' : ''}
                </Typography>
              )}
            </Stack>
          </Box>
        )}
      </CardContent>
    </Card>
  );
}
