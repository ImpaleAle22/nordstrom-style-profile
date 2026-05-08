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
  AlertTitle,
  Collapse
} from '@mui/material';
import LockIcon from '@mui/icons-material/Lock';
import LockOpenIcon from '@mui/icons-material/LockOpen';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import { useState } from 'react';
import OutfitIngredientEditor from '@/components/OutfitIngredientEditor';
import RecipeReviewModal from '@/components/RecipeReviewModal';
import RecipePublishedModal from '@/components/RecipePublishedModal';
import { validateRecipe, type RecipeFormData } from '@/lib/recipe-actions';
import { getRoleFromPT1, type OutfitRole } from '@/lib/role-mappings';

type SlotCount = 4 | 5 | 6;
type Department = 'Womenswear' | 'Menswear';

interface IngredientData {
  productTypes: string[];
  ingredientTitle: string;
  searchQuery: string;
  brands: string[];
  materials: string[];
}

export default function NewOutfitRecipePage() {
  // Recipe metadata (title will be generated in review modal)
  const [title, setTitle] = useState(''); // Will be set by review modal
  const [department, setDepartment] = useState<Department>('Womenswear');
  const [isDepartmentLocked, setIsDepartmentLocked] = useState(false);
  const [slotCount, setSlotCount] = useState<SlotCount>(5);

  // Season checkboxes
  const [seasons, setSeasons] = useState<string[]>([]);

  // Active ingredient being edited (0-indexed)
  const [activeSlotIndex, setActiveSlotIndex] = useState<number>(0);

  // Ingredient slots data
  const [ingredients, setIngredients] = useState<(IngredientData | null)[]>(new Array(5).fill(null));

  // Validation state
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [validationWarnings, setValidationWarnings] = useState<string[]>([]);
  const [showValidation, setShowValidation] = useState(false);

  // Review modal state
  const [showReviewModal, setShowReviewModal] = useState(false);

  // Published modal state
  const [showPublishedModal, setShowPublishedModal] = useState(false);
  const [publishedRecipeId, setPublishedRecipeId] = useState('');
  const [publishedRecipeTitle, setPublishedRecipeTitle] = useState('');

  const handleSlotCountChange = (_event: React.MouseEvent<HTMLElement>, newValue: SlotCount | null) => {
    if (newValue !== null) {
      setSlotCount(newValue);

      // Preserve existing ingredient data when changing slot count
      setIngredients((prev) => {
        if (newValue > prev.length) {
          // Adding slots: keep existing, add nulls
          return [...prev, ...new Array(newValue - prev.length).fill(null)];
        } else {
          // Removing slots: keep first N slots
          return prev.slice(0, newValue);
        }
      });

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
  };


  const handleDepartmentLock = () => {
    setIsDepartmentLocked(true);
  };

  const handleReviewRecipe = () => {
    setShowReviewModal(true);
  };

  const handlePublishRecipe = (generatedTitle: string) => {
    // Generate recipe ID
    const recipeId = `recipe_${Date.now()}`;
    const recipeTitle = generatedTitle || 'Untitled Recipe';

    // Save title to state for display in success modal
    setTitle(recipeTitle);

    // Create slots array with roles
    const slots = ingredients
      .filter((ing) => ing !== null)
      .map((ing) => ({
        role: getRoleFromPT1(ing!.productTypes[0]) as OutfitRole,
        ingredient: ing,
      }));

    // Create recipe object (Unified Format)
    const recipe = {
      id: recipeId,
      title: recipeTitle,
      department,
      slotCount,
      seasons,
      slots, // ← Changed from ingredients to slots
      createdAt: new Date().toISOString(),
      status: 'published' as const,
      source: 'manual' as const, // ← Track source
    };

    // Save to localStorage (Recipe Manager)
    const existingRecipes = JSON.parse(localStorage.getItem('outfit-recipes') || '[]');
    existingRecipes.push(recipe);
    localStorage.setItem('outfit-recipes', JSON.stringify(existingRecipes));

    // Store published recipe info and show success modal
    setPublishedRecipeId(recipeId);
    setPublishedRecipeTitle(recipeTitle);
    setShowReviewModal(false);
    setShowPublishedModal(true);

    // Reset form
    setTitle('');
    setIngredients(new Array(slotCount).fill(null));
    setSeasons([]);
    setActiveSlotIndex(0);
  };

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
          position: 'relative'
        }}
      >
        <Box sx={{ p: 4, pb: 10, overflow: 'auto', flex: 1 }}>
        <Typography variant="h2" gutterBottom>
          Outfit Recipe
        </Typography>

        <Stack spacing={3}>
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
              onChange={(_e, value) => value && !isDepartmentLocked && setDepartment(value)}
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
              Ingredients
            </Typography>
            <Stack spacing={1}>
              {Array.from({ length: slotCount }, (_, index) => {
                const ingredient = ingredients[index];
                const hasIngredient = ingredient?.ingredientTitle;
                const isActive = activeSlotIndex === index;
                const displayText = hasIngredient ? ingredient.ingredientTitle : 'Add ingredient';

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
                        opacity: 1
                      }
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
                        flexShrink: 0
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
                        fontWeight: hasIngredient ? 500 : 400
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

        {/* Sticky Bottom Bar - Review Recipe */}
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
            zIndex: 10
          }}
        >
          <Button
            variant="contained"
            size="large"
            fullWidth
            onClick={handleReviewRecipe}
          >
            Review Recipe
          </Button>
        </Box>
      </Box>

      {/* Right Column - Active Ingredient Editor */}
      <Box sx={{ flex: 1, p: 6, overflow: 'auto' }}>
        <OutfitIngredientEditor
          slotIndex={activeSlotIndex}
          department={department}
          value={ingredients[activeSlotIndex]}
          allIngredients={ingredients}
          onChange={(value) => handleIngredientChange(activeSlotIndex, value)}
          onDepartmentLock={handleDepartmentLock}
        />
      </Box>

      {/* Recipe Review Modal */}
      <RecipeReviewModal
        open={showReviewModal}
        onClose={() => setShowReviewModal(false)}
        onPublish={handlePublishRecipe}
        title={title}
        department={department}
        slotCount={slotCount}
        seasons={seasons}
        ingredients={ingredients}
      />

      {/* Recipe Published Success Modal */}
      <RecipePublishedModal
        open={showPublishedModal}
        recipeTitle={publishedRecipeTitle}
        recipeId={publishedRecipeId}
      />
    </Box>
  );
}
