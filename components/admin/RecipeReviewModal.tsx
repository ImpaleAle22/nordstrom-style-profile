"use client";

import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Typography,
  Button,
  Stack,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Chip,
  Grid,
  Alert,
  AlertTitle,
  TextField,
  IconButton,
  CircularProgress,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import RefreshIcon from "@mui/icons-material/Refresh";
import EditIcon from "@mui/icons-material/Edit";
import CheckIcon from "@mui/icons-material/Check";
import { useState, useEffect } from "react";

interface IngredientData {
  productTypes: string[];
  ingredientTitle: string;
  searchQuery: string;
  brands: string[];
  materials: string[];
}

interface RecipeReviewModalProps {
  open: boolean;
  onClose: () => void;
  onPublish: (title: string) => void;
  title: string;
  department: string;
  slotCount: number;
  seasons: string[];
  ingredients: (IngredientData | null)[];
}

export default function RecipeReviewModal({
  open,
  onClose,
  onPublish,
  title: initialTitle,
  department,
  slotCount,
  seasons,
  ingredients,
}: RecipeReviewModalProps) {
  const [generatedTitle, setGeneratedTitle] = useState(initialTitle || '');
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [isGeneratingTitle, setIsGeneratingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState('');

  const filledSlots = ingredients.filter(
    (ing) => ing && ing.ingredientTitle
  ).length;
  const allSlotsFilled = filledSlots === slotCount;
  const hasTitle = generatedTitle && generatedTitle.trim() !== '';
  const canPublish = allSlotsFilled && hasTitle;

  // Generate title when modal opens
  useEffect(() => {
    if (open && !generatedTitle) {
      generateTitle();
    }
  }, [open]);

  const generateTitle = async () => {
    setIsGeneratingTitle(true);
    try {
      const filledIngredients = ingredients.filter(
        (ing) => ing && ing.ingredientTitle
      );

      const response = await fetch('/api/generate-title', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          department,
          slotCount,
          seasons,
          ingredients: filledIngredients,
        }),
      });

      const data = await response.json();
      if (data.title) {
        setGeneratedTitle(data.title);
      } else {
        setGeneratedTitle('Untitled Outfit Recipe');
      }
    } catch (error) {
      console.error('Error generating title:', error);
      setGeneratedTitle('Untitled Outfit Recipe');
    } finally {
      setIsGeneratingTitle(false);
    }
  };

  const handleEditTitle = () => {
    setEditedTitle(generatedTitle);
    setIsEditingTitle(true);
  };

  const handleSaveTitle = () => {
    setGeneratedTitle(editedTitle);
    setIsEditingTitle(false);
  };

  const handlePublish = () => {
    onPublish(generatedTitle);
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: { minHeight: "80vh", maxHeight: "90vh" },
      }}
    >
      <DialogTitle sx={{ pb: 2 }}>
        <Stack direction="row" alignItems="center" spacing={2}>
          <Box
            sx={{
              width: 36,
              height: 36,
              borderRadius: "50%",
              bgcolor: "grey.900",
              color: "white",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "1rem",
              fontWeight: 700,
            }}
          >
            {filledSlots}
          </Box>
          <Typography variant="h5" component="span" sx={{ fontWeight: 600 }}>
            Recipe Curation
          </Typography>
        </Stack>
      </DialogTitle>

      <DialogContent sx={{ pt: 3 }}>
        <Stack spacing={4}>
          {/* Warning Alert */}
          <Alert severity="warning" icon={<WarningAmberIcon />}>
            <AlertTitle sx={{ fontWeight: 600 }}>
              Published recipes can't be edited
            </AlertTitle>
            Verify your spelling and filters are correct before publishing.
          </Alert>

          {/* Recipe Metadata */}
          <Box
            sx={{
              p: 3,
              bgcolor: "grey.50",
              borderRadius: 1,
              border: 1,
              borderColor: "divider",
            }}
          >
            <Stack spacing={2}>
              <Box>
                <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.5 }}>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    fontWeight={600}
                    sx={{ textTransform: "uppercase", letterSpacing: 0.5 }}
                  >
                    Title
                  </Typography>
                  {isGeneratingTitle ? (
                    <CircularProgress size={16} />
                  ) : (
                    <>
                      <IconButton
                        size="small"
                        onClick={generateTitle}
                        title="Regenerate title"
                        sx={{ p: 0.5 }}
                      >
                        <RefreshIcon fontSize="small" />
                      </IconButton>
                      {!isEditingTitle ? (
                        <IconButton
                          size="small"
                          onClick={handleEditTitle}
                          title="Edit title"
                          sx={{ p: 0.5 }}
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                      ) : (
                        <IconButton
                          size="small"
                          onClick={handleSaveTitle}
                          title="Save title"
                          sx={{ p: 0.5 }}
                          color="primary"
                        >
                          <CheckIcon fontSize="small" />
                        </IconButton>
                      )}
                    </>
                  )}
                </Stack>
                {isEditingTitle ? (
                  <TextField
                    value={editedTitle}
                    onChange={(e) => setEditedTitle(e.target.value)}
                    fullWidth
                    size="small"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleSaveTitle();
                      }
                    }}
                  />
                ) : (
                  <Typography variant="body1" sx={{ mt: 0.5 }}>
                    {generatedTitle || "(Generating...)"}
                  </Typography>
                )}
              </Box>

              <Grid container spacing={2}>
                <Grid item xs={4}>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    fontWeight={600}
                    sx={{ textTransform: "uppercase", letterSpacing: 0.5 }}
                  >
                    Gender
                  </Typography>
                  <Typography variant="body2" sx={{ mt: 0.5 }}>
                    {department}
                  </Typography>
                </Grid>

                <Grid item xs={4}>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    fontWeight={600}
                    sx={{ textTransform: "uppercase", letterSpacing: 0.5 }}
                  >
                    Slots
                  </Typography>
                  <Typography variant="body2" sx={{ mt: 0.5 }}>
                    {slotCount}
                  </Typography>
                </Grid>

                <Grid item xs={4}>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    fontWeight={600}
                    sx={{ textTransform: "uppercase", letterSpacing: 0.5 }}
                  >
                    Season
                  </Typography>
                  <Typography variant="body2" sx={{ mt: 0.5 }}>
                    {seasons.length > 0 ? seasons.join(", ") : "All seasons"}
                  </Typography>
                </Grid>
              </Grid>
            </Stack>
          </Box>

          {/* Ingredients List */}
          <Stack spacing={1}>
            {ingredients.map((ingredient, index) => {
              if (!ingredient || !ingredient.ingredientTitle) {
                return (
                  <Accordion key={index} disabled sx={{ bgcolor: "grey.50" }}>
                    <AccordionSummary>
                      <Typography color="text.disabled" variant="body2">
                        Slot {index + 1} (Empty)
                      </Typography>
                    </AccordionSummary>
                  </Accordion>
                );
              }

              const allFilters = [
                ...ingredient.brands,
                ...ingredient.materials,
              ];

              return (
                <Accordion key={index} sx={{ border: 1, borderColor: "divider" }}>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography fontWeight={500} variant="body1">
                      {ingredient.ingredientTitle}
                    </Typography>
                  </AccordionSummary>
                  <AccordionDetails sx={{ pt: 0 }}>
                    <Stack spacing={2.5}>
                      {/* Search Query */}
                      <Box>
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          fontWeight={600}
                          sx={{
                            display: "block",
                            mb: 0.5,
                            textTransform: "uppercase",
                            letterSpacing: 0.5
                          }}
                        >
                          Search Query
                        </Typography>
                        <Typography variant="body2" color="text.primary">
                          {ingredient.searchQuery || "(No search query)"}
                        </Typography>
                      </Box>

                      {/* Product Type & Filters */}
                      <Box>
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          fontWeight={600}
                          sx={{
                            display: "block",
                            mb: 1,
                            textTransform: "uppercase",
                            letterSpacing: 0.5
                          }}
                        >
                          Filters
                        </Typography>
                        <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                          {ingredient.productTypes.length > 0 && (
                            <Chip
                              label={ingredient.productTypes[0]}
                              size="small"
                              color="primary"
                              variant="filled"
                            />
                          )}
                          {ingredient.brands.map((brand, i) => (
                            <Chip
                              key={`brand-${i}`}
                              label={brand}
                              size="small"
                              variant="outlined"
                            />
                          ))}
                          {ingredient.materials.map((material, i) => (
                            <Chip
                              key={`material-${i}`}
                              label={material}
                              size="small"
                              variant="outlined"
                            />
                          ))}
                          {ingredient.productTypes.length === 0 && allFilters.length === 0 && (
                            <Typography variant="body2" color="text.secondary">
                              No filters applied
                            </Typography>
                          )}
                        </Stack>
                      </Box>
                    </Stack>
                  </AccordionDetails>
                </Accordion>
              );
            })}
          </Stack>
        </Stack>
      </DialogContent>

      <DialogActions sx={{ p: 3, flexDirection: 'column', gap: 1 }}>
        <Stack direction="row" spacing={2} sx={{ width: '100%' }}>
          <Button
            onClick={onClose}
            variant="outlined"
            size="large"
            fullWidth
            sx={{ flex: 1 }}
          >
            Back to Edit Recipe
          </Button>
          <Button
            onClick={handlePublish}
            variant="contained"
            size="large"
            fullWidth
            sx={{ flex: 1 }}
            disabled={!canPublish}
          >
            Publish Recipe
          </Button>
        </Stack>
        {!canPublish && (
          <Typography variant="caption" color="error" sx={{ textAlign: 'center' }}>
            {!hasTitle && 'Missing title. '}
            {!allSlotsFilled && `${slotCount - filledSlots} slot(s) empty.`}
          </Typography>
        )}
      </DialogActions>
    </Dialog>
  );
}
