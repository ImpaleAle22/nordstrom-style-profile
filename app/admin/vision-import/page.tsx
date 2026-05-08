/**
 * Vision Import Page
 *
 * Upload fashion photography and generate outfit recipes using AI vision analysis.
 */

'use client';

import { useState, useCallback } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  CircularProgress,
  Alert,
  Card,
  CardMedia,
  CardContent,
  Chip,
  Stack,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
} from '@mui/material';
import {
  CloudUpload as UploadIcon,
  Image as ImageIcon,
  CheckCircle as SuccessIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
} from '@mui/icons-material';
import { visionToRecipeSlots, validateRecipeStructure, validateProductAvailability, type ProductAvailabilityResult } from '@/lib/vision-to-recipe';
import { saveRecipe, createBatch, updateBatch } from '@/lib/indexeddb-storage';
import type { UnifiedRecipe } from '@/lib/unified-recipe-types';
import { useRouter } from 'next/navigation';

interface AnalysisResult {
  department: 'Womenswear' | 'Menswear';
  items: {
    role: string;
    title: string;
    description: string;
    color: string;
    material?: string;
  }[];
  suggestedItems?: {
    role: string;
    title: string;
    description: string;
    color: string;
    material?: string;
  }[];
  styleNotes: string;
  suggestedRecipe: string;
  confidence: number;
}

export default function VisionImportPage() {
  const router = useRouter();
  const [image, setImage] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [showRecipeDialog, setShowRecipeDialog] = useState(false);
  const [saving, setSaving] = useState(false);

  // Phase 3: Product Availability Validation
  const [validating, setValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<ProductAvailabilityResult | null>(null);
  const [recipeVariations, setRecipeVariations] = useState<any>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      handleImageFile(file);
    } else {
      setError('Please upload an image file');
    }
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleImageFile(file);
    }
  }, []);

  const handleImageFile = (file: File) => {
    setError(null);

    // Compress image if over 2MB
    if (file.size > 2 * 1024 * 1024) {
      const img = new Image();
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;

      img.onload = () => {
        // Calculate new dimensions (max 1920px wide)
        const maxWidth = 1920;
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;
        ctx.drawImage(img, 0, 0, width, height);

        // Convert to JPEG with 85% quality
        const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.85);
        setImage(compressedDataUrl);
        setResult(null);
      };

      const reader = new FileReader();
      reader.onload = (e) => {
        img.src = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    } else {
      // File is small enough, use as-is
      const reader = new FileReader();
      reader.onload = (e) => {
        setImage(e.target?.result as string);
        setResult(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const analyzeImage = async () => {
    if (!image) return;

    setAnalyzing(true);
    setError(null);

    try {
      // Convert base64 to blob for API
      const base64Data = image.split(',')[1];

      const response = await fetch('/api/vision-analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageData: base64Data }),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      setResult(data);
    } catch (err) {
      console.error('Vision analysis failed:', err);
      setError(err instanceof Error ? err.message : 'Analysis failed');
    } finally {
      setAnalyzing(false);
    }
  };

  const reset = () => {
    setImage(null);
    setResult(null);
    setError(null);
    setShowRecipeDialog(false);
  };

  const handleCreateRecipe = async () => {
    if (!result) return;

    setValidating(true);
    setValidationResult(null);
    setError(null);

    try {
      // Phase 3: Validate product availability before showing dialog
      console.log('\n🔍 Phase 3: Validating product availability...');

      // Convert vision items to recipe variations
      const { variations, filtered } = visionToRecipeSlots(
        result.items,
        result.suggestedRecipe,
        result.suggestedItems
      );

      // Store variations for later use
      setRecipeVariations({ variations, filtered });

      // Validate first variation (primary recipe)
      if (variations.length > 0) {
        const primaryVariation = variations[0];
        const availabilityResult = await validateProductAvailability(primaryVariation.slots);
        setValidationResult(availabilityResult);

        console.log(`\n📊 Validation Results:`);
        console.log(`   Available: ${availabilityResult.availableSlots}/${availabilityResult.totalSlots}`);
        console.log(`   Unavailable: ${availabilityResult.unavailableSlots.length}`);

        if (!availabilityResult.isValid) {
          console.log(`\n⚠️  Warnings:`);
          availabilityResult.unavailableSlots.forEach(slot => {
            console.log(`   • ${slot.ingredientTitle}: ${slot.suggestion}`);
          });
        }
      }

      setShowRecipeDialog(true);
    } catch (err) {
      console.error('Validation error:', err);
      setError(err instanceof Error ? err.message : 'Validation failed');
    } finally {
      setValidating(false);
    }
  };

  const confirmCreateRecipe = async () => {
    if (!result || !recipeVariations) return;

    setSaving(true);
    setError(null);

    try {
      // Use previously validated variations
      const { variations, filtered } = recipeVariations;

      console.log('📝 Saving Recipe Variations (validated):');

      // Create batch record to group these recipes
      const now = new Date();
      const dateStr = now.toISOString().split('T')[0]; // YYYY-MM-DD
      const timeStr = now.toTimeString().split(' ')[0].replace(/:/g, ''); // HHMMSS
      const batchId = `batch-${dateStr}-${timeStr}`;

      await createBatch({
        batchId,
        createdAt: now.toISOString(),
        source: 'ai-vision',
        recipeCount: variations.length,
        label: result.suggestedRecipe, // Use the AI-suggested recipe name as label
        description: `Vision import: ${result.items.length} items detected (${filtered.length} filtered), ${variations.length} recipe${variations.length > 1 ? 's' : ''} created`,
        department: result.department,
        imageCount: 1, // Single image upload
        cookedCount: 0, // None cooked yet
      });

      console.log(`📦 Created batch: ${batchId}`);

      // Save each variation to IndexedDB with batchId
      for (const variation of variations) {
        const recipe: UnifiedRecipe = {
          id: `vision-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          title: variation.name,
          status: 'draft',
          department: result.department, // Detected from vision analysis
          slotCount: variation.slots.length,
          seasons: [], // All-season by default
          createdAt: now.toISOString(),
          updatedAt: now.toISOString(),
          batchId, // Link to batch
          slots: variation.slots,
          source: 'ai-vision',
          aiMetadata: {
            sourceProductId: 'vision-upload',
            sourceImageUrl: image || '',
            sourceProductContext: {
              title: result.suggestedRecipe,
              brand: 'Vision Import',
              department: 'Menswear',
              productType1: 'Vision Analysis',
            },
            confidence: result.confidence,
            notes: variation.description,
            scannedAt: now.toISOString(),
          },
        };

        await saveRecipe(recipe);
        console.log(`✅ Saved: ${recipe.title}`);
      }

      console.log(`\n✅ All ${variations.length} recipe(s) saved in batch ${batchId}!`);
      setShowRecipeDialog(false);

      // Navigate to recipes page
      router.push('/recipes');
    } catch (err) {
      console.error('Failed to save recipes:', err);
      setError(err instanceof Error ? err.message : 'Failed to save recipes');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box sx={{ p: 4, maxWidth: 1400, mx: 'auto' }}>
      <Typography variant="h4" gutterBottom>
        Vision Import
      </Typography>
      <Typography variant="body1" color="text.secondary" paragraph>
        Upload fashion photography to automatically generate outfit recipes using AI vision analysis.
      </Typography>

      <Box sx={{ display: 'flex', gap: 3, mt: 4 }}>
        {/* Upload Area */}
        <Box sx={{ flex: '0 0 400px' }}>
          {!image ? (
            <Paper
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              sx={{
                p: 4,
                textAlign: 'center',
                border: '2px dashed',
                borderColor: isDragging ? 'primary.main' : 'divider',
                bgcolor: isDragging ? 'action.hover' : 'background.paper',
                cursor: 'pointer',
                transition: 'all 0.2s',
                '&:hover': {
                  borderColor: 'primary.main',
                  bgcolor: 'action.hover',
                },
              }}
            >
              <ImageIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" gutterBottom>
                Drop image here
              </Typography>
              <Typography variant="body2" color="text.secondary" paragraph>
                or
              </Typography>
              <Button
                variant="contained"
                component="label"
                startIcon={<UploadIcon />}
              >
                Choose File
                <input
                  type="file"
                  hidden
                  accept="image/*"
                  onChange={handleFileSelect}
                />
              </Button>
              <Typography variant="caption" display="block" sx={{ mt: 2 }}>
                Supports: JPG, PNG, WebP
              </Typography>
            </Paper>
          ) : (
            <Card>
              <CardMedia
                component="img"
                image={image}
                alt="Uploaded outfit"
                sx={{ maxHeight: 500, objectFit: 'contain' }}
              />
              <CardContent>
                <Stack direction="row" spacing={1} justifyContent="center">
                  {!result && (
                    <Button
                      variant="contained"
                      onClick={analyzeImage}
                      disabled={analyzing}
                      startIcon={analyzing ? <CircularProgress size={20} /> : <ImageIcon />}
                    >
                      {analyzing ? 'Analyzing...' : 'Analyze Image'}
                    </Button>
                  )}
                  <Button variant="outlined" onClick={reset}>
                    Upload New
                  </Button>
                </Stack>
              </CardContent>
            </Card>
          )}

          {error && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {error}
            </Alert>
          )}
        </Box>

        {/* Results Area */}
        {result && (
          <Box sx={{ flex: 1 }}>
            <Paper sx={{ p: 3 }}>
              <Stack direction="row" alignItems="center" spacing={1} mb={2}>
                <SuccessIcon color="success" />
                <Typography variant="h6">Analysis Complete</Typography>
                <Chip
                  label={result.department}
                  size="small"
                  color="primary"
                  variant="outlined"
                />
                <Chip
                  label={`${(result.confidence * 100).toFixed(0)}% confidence`}
                  size="small"
                  color={result.confidence > 0.8 ? 'success' : 'warning'}
                />
              </Stack>

              <Typography variant="subtitle1" gutterBottom fontWeight="bold">
                Detected Items:
              </Typography>
              <Stack spacing={1} mb={3}>
                {result.items.map((item, i) => (
                  <Box
                    key={i}
                    sx={{
                      p: 1.5,
                      border: '1px solid',
                      borderColor: 'divider',
                      borderRadius: 1,
                    }}
                  >
                    <Stack direction="row" spacing={1} alignItems="center" mb={0.5}>
                      <Chip label={item.role} size="small" color="primary" />
                      <Typography variant="body1" fontWeight="bold">
                        {item.title}
                      </Typography>
                    </Stack>
                    <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.85rem' }}>
                      {item.description}
                    </Typography>
                    <Stack direction="row" spacing={1} mt={0.5}>
                      <Chip label={item.color} size="small" variant="outlined" />
                      {item.material && (
                        <Chip label={item.material} size="small" variant="outlined" />
                      )}
                    </Stack>
                  </Box>
                ))}
              </Stack>

              <Typography variant="subtitle1" gutterBottom fontWeight="bold">
                Style Notes:
              </Typography>
              <Typography variant="body2" color="text.secondary" paragraph>
                {result.styleNotes}
              </Typography>

              <Typography variant="subtitle1" gutterBottom fontWeight="bold">
                Suggested Recipe:
              </Typography>
              <Typography variant="body2" color="text.secondary" paragraph>
                {result.suggestedRecipe}
              </Typography>

              <Button
                variant="contained"
                fullWidth
                sx={{ mt: 2 }}
                onClick={handleCreateRecipe}
                disabled={validating}
                startIcon={validating ? <CircularProgress size={20} /> : undefined}
              >
                {validating ? 'Validating Products...' : 'Create Recipe from Analysis'}
              </Button>
            </Paper>
          </Box>
        )}
      </Box>

      {/* Recipe Preview Dialog */}
      {result && (
        <Dialog open={showRecipeDialog} onClose={() => setShowRecipeDialog(false)} maxWidth="md" fullWidth>
          <DialogTitle>Create Recipe Variations from Vision Analysis</DialogTitle>
          <DialogContent>
            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}

            {/* Phase 3: Product Availability Warnings */}
            {validationResult && !validationResult.isValid && (
              <Alert severity="warning" icon={<WarningIcon />} sx={{ mb: 2 }}>
                <Typography variant="body2" fontWeight="bold" gutterBottom>
                  Product Availability Issues:
                </Typography>
                <Typography variant="body2" paragraph>
                  {validationResult.unavailableSlots.length} of {validationResult.totalSlots} items may not be available in the catalog:
                </Typography>
                <List dense sx={{ ml: 2 }}>
                  {validationResult.unavailableSlots.map((slot, i) => (
                    <ListItem key={i} sx={{ py: 0, display: 'list-item' }}>
                      <Typography variant="body2">
                        <strong>{slot.ingredientTitle}</strong> ({slot.role})
                      </Typography>
                      {slot.suggestion && (
                        <Typography variant="caption" color="text.secondary" sx={{ ml: 2 }}>
                          💡 {slot.suggestion}
                        </Typography>
                      )}
                    </ListItem>
                  ))}
                </List>
                {validationResult.suggestions && (
                  <Typography variant="body2" sx={{ mt: 1, fontStyle: 'italic' }}>
                    {validationResult.suggestions}
                  </Typography>
                )}
              </Alert>
            )}

            {recipeVariations && (() => {
              const { variations, filtered } = recipeVariations;

              return (
                <>
                  <Stack direction="row" spacing={1} alignItems="center" mb={2}>
                    <Chip label={result.department} color="primary" size="small" />
                    <Typography variant="body2" color="text.secondary">
                      {variations.length === 1
                        ? 'One recipe will be created from this outfit.'
                        : `${variations.length} recipe variations will be created.`}
                    </Typography>
                  </Stack>

                  {variations.map((variation: any, varIdx: number) => {
                    const validation = validateRecipeStructure(variation.slots);

                    return (
                      <Box key={varIdx} sx={{ mb: 3, p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                        <Typography variant="h6" gutterBottom>
                          {varIdx + 1}. {variation.name}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" paragraph>
                          {variation.description}
                        </Typography>
                        {variation.needsCompletion && (
                          <Alert severity="info" sx={{ mb: 2 }}>
                            Auto-completed: Some slots were suggested to meet minimum outfit requirements
                          </Alert>
                        )}

                        <Typography variant="subtitle2" gutterBottom>
                          {variation.slots.length} Items:
                        </Typography>
                        <List dense>
                          {variation.slots.map((slot, i) => {
                            // Check if this is an auto-suggested slot (low confidence)
                            const isSuggested = slot.ingredient.confidence && slot.ingredient.confidence < 0.6;

                            return (
                              <ListItem key={i} sx={{ py: 0.5 }}>
                                <ListItemText
                                  primary={
                                    <Box component="span" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                      {slot.ingredient.ingredientTitle}
                                      {isSuggested && (
                                        <Chip label="suggested" size="small" color="info" variant="outlined" sx={{ height: 18, fontSize: '0.7rem' }} />
                                      )}
                                    </Box>
                                  }
                                  secondary={slot.role}
                                />
                              </ListItem>
                            );
                          })}
                        </List>

                        {validation.errors.length > 0 && (
                          <Alert severity="error" icon={<ErrorIcon />} sx={{ mt: 1 }}>
                            {validation.errors.map((err, i) => (
                              <Typography key={i} variant="body2">• {err}</Typography>
                            ))}
                          </Alert>
                        )}

                        {validation.warnings.length > 0 && (
                          <Alert severity="warning" icon={<WarningIcon />} sx={{ mt: 1 }}>
                            {validation.warnings.map((warn, i) => (
                              <Typography key={i} variant="body2">• {warn}</Typography>
                            ))}
                          </Alert>
                        )}
                      </Box>
                    );
                  })}

                  {filtered.length > 0 && (
                    <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                      <Typography variant="subtitle2" gutterBottom>
                        🚫 {filtered.length} Item{filtered.length > 1 ? 's' : ''} Filtered Out
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {filtered.map(f => f.description).join(', ')}
                      </Typography>
                    </Box>
                  )}
                </>
              );
            })()}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setShowRecipeDialog(false)} disabled={saving}>Cancel</Button>
            <Button
              variant="contained"
              onClick={confirmCreateRecipe}
              disabled={saving}
              startIcon={saving ? <CircularProgress size={20} /> : undefined}
              color={validationResult && !validationResult.isValid ? 'warning' : 'primary'}
            >
              {saving ? 'Saving...' : (() => {
                if (!recipeVariations) return 'Create Recipe';
                const count = recipeVariations.variations.length;
                const hasWarnings = validationResult && !validationResult.isValid;
                const action = hasWarnings ? 'Cook Anyway' : 'Create';
                return `${action} (${count} ${count === 1 ? 'Recipe' : 'Recipes'})`;
              })()}
            </Button>
          </DialogActions>
        </Dialog>
      )}
    </Box>
  );
}
