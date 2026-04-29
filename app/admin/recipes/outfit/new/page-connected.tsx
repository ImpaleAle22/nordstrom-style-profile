'use client';

import {
  Typography,
  Box,
  TextField,
  Button,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  IconButton,
  Checkbox,
  FormControlLabel,
  Grid,
  Alert,
  CircularProgress,
  Snackbar,
} from '@mui/material';
import LockIcon from '@mui/icons-material/Lock';
import LockOpenIcon from '@mui/icons-material/LockOpen';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import OutfitIngredientEditorConnected from '@/components/admin/OutfitIngredientEditorConnected';
import {
  saveOutfitRecipe,
  generateRecipeTitle,
  validateRecipe,
  type IngredientData,
  type RecipeFormData,
} from '@/lib/recipe-actions';

type SlotCount = 4 | 5 | 6;
type Department = 'Womenswear' | 'Menswear';

export default function NewOutfitRecipePageConnected() {
  const router = useRouter();

  // Recipe metadata
  const [title, setTitle] = useState('');
  const [isTitleLocked, setIsTitleLocked] = useState(true);
  const [department, setDepartment] = useState<Department>('Womenswear');
  const [isDepartmentLocked, setIsDepartmentLocked] = useState(false);
  const [slotCount, setSlotCount] = useState<SlotCount>(5);

  // Season checkboxes
  const [seasons, setSeasons] = useState<string[]>([]);

  // Active ingredient being edited (0-indexed)
  const [activeSlotIndex, setActiveSlotIndex] = useState<number>(0);

  // Ingredient slots data
  const [ingredients, setIngredients] = useState<(IngredientData | null)[]>(
    new Array(5).fill(null)
  );

  // Save state
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);

  const handleSlotCountChange = (
    _event: React.MouseEvent<HTMLElement>,
    newValue: SlotCount | null
  ) => {
    if (newValue !== null) {
      setSlotCount(newValue);
      setIngredients(new Array(newValue).fill(null));
      if (activeSlotIndex >= newValue) {
        setActiveSlotIndex(0);
      }
    }
  };

  const handleSeasonToggle = (season: string) => {
    setSeasons((prev) =>
      prev.includes(season) ? prev.filter((s) => s !== season) : [...prev, season]
    );
  };

  const handleIngredientChange = (slotIndex: number, value: IngredientData) => {
    const newIngredients = [...ingredients];
    newIngredients[slotIndex] = value;
    setIngredients(newIngredients);

    // Auto-generate title if locked
    if (isTitleLocked) {
      const generatedTitle = generateRecipeTitle(newIngredients);
      setTitle(generatedTitle);
    }
  };

  const handleGenerateTitle = () => {
    const generatedTitle = generateRecipeTitle(ingredients);
    setTitle(generatedTitle);
    setIsTitleLocked(true);
  };

  const handleDepartmentLock = () => {
    setIsDepartmentLocked(true);
  };

  const handleSaveRecipe = async () => {
    // Clear previous errors
    setSaveError(null);

    // Build recipe data
    const recipeData: RecipeFormData = {
      title,
      department,
      seasons,
      ingredients,
    };

    // Validate
    const validation = validateRecipe(recipeData);
    if (!validation.valid) {
      setSaveError(validation.errors.join('. '));
      return;
    }

    // Save to Sanity
    setIsSaving(true);
    try {
      const result = await saveOutfitRecipe(recipeData);

      if (result.success) {
        setShowSuccess(true);
        // Redirect to recipe list after 2 seconds
        setTimeout(() => {
          router.push('/recipes');
        }, 2000);
      } else {
        setSaveError(result.error || 'Failed to save recipe');
      }
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setIsSaving(false);
    }
  };

  // Count filled ingredients
  const filledCount = ingredients.filter((ing) => ing !== null).length;
  const canSave = filledCount >= 2 && title.length > 0;

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'grey.50' }}>
      {/* Left Column - Recipe Metadata & Ingredients List */}
      <Box
        sx={{
          width: 400,
          bgcolor: 'background.paper',
          borderRight: 1,
          borderColor: 'divider',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
        }}
      >
        <Box sx={{ p: 4, pb: 10, overflow: 'auto', flex: 1 }}>
          <Typography variant="h2" gutterBottom>
            Outfit Recipe
          </Typography>

          <Stack spacing={3}>
            {/* Recipe Title - Locked by default */}
            <Box>
              <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
                <Typography variant="caption" color="text.secondary">
                  Recipe Title
                </Typography>
                <IconButton
                  size="small"
                  onClick={() => setIsTitleLocked(!isTitleLocked)}
                  title={
                    isTitleLocked ? 'Unlock to edit manually' : 'Lock to auto-generate'
                  }
                >
                  {isTitleLocked ? (
                    <LockIcon fontSize="small" />
                  ) : (
                    <LockOpenIcon fontSize="small" />
                  )}
                </IconButton>
                {isTitleLocked && (
                  <Button
                    size="small"
                    startIcon={<AutoAwesomeIcon />}
                    onClick={handleGenerateTitle}
                  >
                    Generate
                  </Button>
                )}
              </Stack>
              <TextField
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                fullWidth
                disabled={isTitleLocked}
                placeholder="Title will be auto-generated..."
                size="small"
              />
            </Box>

            {/* Number of Slots */}
            <Box>
              <Typography variant="body2" fontWeight={500} gutterBottom>
                Number of Slots
              </Typography>
              <ToggleButtonGroup
                value={slotCount}
                exclusive
                onChange={handleSlotCountChange}
                size="small"
                fullWidth
              >
                <ToggleButton value={4}>4</ToggleButton>
                <ToggleButton value={5}>5</ToggleButton>
                <ToggleButton value={6}>6</ToggleButton>
              </ToggleButtonGroup>
            </Box>

            {/* Department */}
            <Box>
              <Typography variant="body2" fontWeight={500} gutterBottom>
                Department
              </Typography>
              <ToggleButtonGroup
                value={department}
                exclusive
                onChange={(_e, value) =>
                  value && !isDepartmentLocked && setDepartment(value)
                }
                size="small"
                fullWidth
                disabled={isDepartmentLocked}
              >
                <ToggleButton value="Womenswear" disabled={isDepartmentLocked}>
                  Womenswear
                </ToggleButton>
                <ToggleButton value="Menswear" disabled={isDepartmentLocked}>
                  Menswear
                </ToggleButton>
              </ToggleButtonGroup>
            </Box>

            {/* Season (Optional) */}
            <Box>
              <Typography variant="body2" fontWeight={500} gutterBottom>
                Season (Optional)
              </Typography>
              <Grid container spacing={0.5}>
                <Grid item xs={6}>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={seasons.includes('Spring')}
                        onChange={() => handleSeasonToggle('Spring')}
                        size="small"
                      />
                    }
                    label="Spring"
                  />
                </Grid>
                <Grid item xs={6}>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={seasons.includes('Summer')}
                        onChange={() => handleSeasonToggle('Summer')}
                        size="small"
                      />
                    }
                    label="Summer"
                  />
                </Grid>
                <Grid item xs={6}>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={seasons.includes('Fall')}
                        onChange={() => handleSeasonToggle('Fall')}
                        size="small"
                      />
                    }
                    label="Fall"
                  />
                </Grid>
                <Grid item xs={6}>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={seasons.includes('Winter')}
                        onChange={() => handleSeasonToggle('Winter')}
                        size="small"
                      />
                    }
                    label="Winter"
                  />
                </Grid>
              </Grid>
            </Box>

            {/* Ingredients List */}
            <Box>
              <Typography variant="body2" fontWeight={500} gutterBottom>
                Ingredients ({filledCount}/{slotCount})
              </Typography>
              <Stack spacing={1}>
                {Array.from({ length: slotCount }, (_, index) => {
                  const ingredient = ingredients[index];
                  const hasIngredient = ingredient?.ingredientTitle;
                  const isActive = activeSlotIndex === index;
                  const displayText = hasIngredient
                    ? ingredient.ingredientTitle
                    : 'Add ingredient';

                  return (
                    <Button
                      key={index}
                      variant="outlined"
                      onClick={() => setActiveSlotIndex(index)}
                      sx={{
                        justifyContent: 'flex-start',
                        textAlign: 'left',
                        textTransform: 'none',
                        px: 2,
                        py: 2,
                        minHeight: 56,
                        borderWidth: isActive ? 2 : 1,
                        borderColor: isActive ? 'primary.main' : 'divider',
                        bgcolor: isActive ? 'primary.50' : 'transparent',
                        opacity: hasIngredient ? 1 : 0.6,
                        '&:hover': {
                          borderColor: 'primary.main',
                          bgcolor: 'primary.50',
                          opacity: 1,
                        },
                      }}
                      fullWidth
                    >
                      <Box
                        component="span"
                        sx={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: 24,
                          height: 24,
                          borderRadius: '50%',
                          bgcolor: hasIngredient ? 'primary.main' : 'grey.300',
                          color: 'white',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          mr: 2,
                          flexShrink: 0,
                        }}
                      >
                        {index + 1}
                      </Box>
                      <Typography
                        variant="body2"
                        sx={{
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          color: hasIngredient ? 'text.primary' : 'text.secondary',
                          fontWeight: hasIngredient ? 500 : 400,
                        }}
                      >
                        {displayText}
                      </Typography>
                    </Button>
                  );
                })}
              </Stack>
            </Box>
          </Stack>
        </Box>

        {/* Sticky Bottom Bar - Save Recipe */}
        <Box
          sx={{
            position: 'sticky',
            bottom: 0,
            left: 0,
            right: 0,
            p: 3,
            bgcolor: 'background.paper',
            borderTop: 1,
            borderColor: 'divider',
            zIndex: 10,
          }}
        >
          {saveError && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setSaveError(null)}>
              {saveError}
            </Alert>
          )}

          <Button
            variant="contained"
            size="large"
            fullWidth
            onClick={handleSaveRecipe}
            disabled={!canSave || isSaving}
            startIcon={isSaving ? <CircularProgress size={20} /> : null}
          >
            {isSaving ? 'Saving...' : 'Save Recipe'}
          </Button>

          {!canSave && (
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ display: 'block', textAlign: 'center', mt: 1 }}
            >
              Fill at least 2 ingredients to save
            </Typography>
          )}
        </Box>
      </Box>

      {/* Right Column - Active Ingredient Editor */}
      <Box sx={{ flex: 1, p: 6, overflow: 'auto' }}>
        <OutfitIngredientEditorConnected
          slotIndex={activeSlotIndex}
          department={department}
          value={ingredients[activeSlotIndex]}
          allIngredients={ingredients}
          onChange={(value) => handleIngredientChange(activeSlotIndex, value)}
          onDepartmentLock={handleDepartmentLock}
        />
      </Box>

      {/* Success Snackbar */}
      <Snackbar
        open={showSuccess}
        autoHideDuration={3000}
        onClose={() => setShowSuccess(false)}
        message="Recipe saved successfully! Redirecting..."
      />
    </Box>
  );
}
