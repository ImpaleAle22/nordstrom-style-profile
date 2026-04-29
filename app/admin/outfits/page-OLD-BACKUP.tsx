'use client';

/**
 * Outfit Browser
 * View and manage generated outfits from cooked recipes
 */

import { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Paper,
  Chip,
  Grid,
  Card,
  CardContent,
  CardMedia,
  Stack,
  Tabs,
  Tab,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Divider,
  Alert,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Pagination,
} from '@mui/material';
import {
  Checkroom as OutfitIcon,
  Delete as DeleteIcon,
  Refresh as RefreshIcon,
  Info as InfoIcon,
  ExpandMore as ExpandMoreIcon,
  BrokenImage as FixImageIcon,
  Download as ExportIcon,
  ContentCopy as DuplicateIcon,
} from '@mui/icons-material';
import { getAllOutfits, getOutfitStats, clearAllOutfits, fixOutfitImageUrls, exportOutfitsToJSON, deleteOutfitsByRecipe, type StoredOutfit } from '../../lib/outfit-storage';
import { findDuplicateOutfits, removeDuplicateOutfits, generateDeduplicationReportText, type DeduplicationReport } from '../../lib/outfit-deduplication';
import OutfitDetailModal from '../../components/OutfitDetailModal';

type FilterTab = 'all' | 'primary' | 'secondary' | 'happy-accident' | 'tagged' | 'untagged';

type SortOption = 'quality' | 'alignment' | 'recent';

export default function OutfitsPage() {
  const [outfits, setOutfits] = useState<StoredOutfit[]>([]);
  const [filteredOutfits, setFilteredOutfits] = useState<StoredOutfit[]>([]);
  const [filterTab, setFilterTab] = useState<FilterTab>('all');
  const [recipeFilter, setRecipeFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<SortOption>('recent');
  const [stats, setStats] = useState<any>(null);
  const [isFixingImages, setIsFixingImages] = useState(false);

  // Pagination
  const [page, setPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);

  // Deduplication
  const [duplicateReport, setDuplicateReport] = useState<DeduplicationReport | null>(null);
  const [showDuplicateReport, setShowDuplicateReport] = useState(false);
  const [isDeduplicating, setIsDeduplicating] = useState(false);

  // Detail Modal
  const [selectedOutfit, setSelectedOutfit] = useState<StoredOutfit | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  useEffect(() => {
    const load = async () => {
      await loadOutfits();
    };
    load();
  }, []);

  useEffect(() => {
    applyFilters();
    setPage(1); // Reset to first page when filters change
  }, [outfits, filterTab, recipeFilter, sortBy]);

  async function loadOutfits() {
    try {
      // Fix image URLs in existing outfits (migration for CLIP API v2)
      setIsFixingImages(true);
      const result = await fixOutfitImageUrls();
      console.log('✓ Image migration complete:', result);

      const allOutfits = await getAllOutfits();
      const outfitStats = await getOutfitStats();
      setOutfits(allOutfits);
      setStats(outfitStats);
    } catch (error) {
      console.error('Error loading outfits:', error);
    } finally {
      setIsFixingImages(false);
    }
  }

  function applyFilters() {
    let filtered = [...outfits];

    // Filter by pool tier
    if (filterTab === 'primary') {
      filtered = filtered.filter((o) => o.poolTier === 'primary');
    } else if (filterTab === 'secondary') {
      filtered = filtered.filter((o) => o.poolTier === 'secondary');
    } else if (filterTab === 'happy-accident') {
      filtered = filtered.filter((o) => o.poolTier === 'happy-accident');
    } else if (filterTab === 'tagged') {
      filtered = filtered.filter((o) => o.attributes && Object.keys(o.attributes).length > 0);
    } else if (filterTab === 'untagged') {
      filtered = filtered.filter((o) => !o.attributes || Object.keys(o.attributes).length === 0);
    }

    // Filter by recipe
    if (recipeFilter !== 'all') {
      filtered = filtered.filter((o) => o.recipeId === recipeFilter);
    }

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'recent':
          // Most recent first (descending timestamp)
          return new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime();
        case 'quality':
          // Quality score (primary), then alignment (secondary)
          if (b.qualityScore !== a.qualityScore) {
            return b.qualityScore - a.qualityScore;
          }
          return b.alignmentScore - a.alignmentScore;
        case 'alignment':
          // Alignment score (primary), then quality (secondary)
          if (b.alignmentScore !== a.alignmentScore) {
            return b.alignmentScore - a.alignmentScore;
          }
          return b.qualityScore - a.qualityScore;
        default:
          return 0;
      }
    });

    setFilteredOutfits(filtered);
  }

  async function handleClearAll() {
    if (confirm('Are you sure you want to delete all cooked outfits? This cannot be undone.')) {
      await clearAllOutfits();
      await loadOutfits();
    }
  }

  async function handleDeleteFiltered() {
    const count = filteredOutfits.length;
    const recipeName = recipeFilter !== 'all'
      ? outfits.find(o => o.recipeId === recipeFilter)?.recipeTitle || recipeFilter
      : null;

    const message = recipeName
      ? `Delete all ${count} outfits from "${recipeName}"? This cannot be undone.`
      : `Delete all ${count} filtered outfits? This cannot be undone.`;

    if (confirm(message)) {
      try {
        if (recipeFilter !== 'all') {
          // Delete by recipe (more efficient)
          await deleteOutfitsByRecipe(recipeFilter);
          console.log(`✓ Deleted ${count} outfits from ${recipeName}`);
        } else {
          // Would need to delete individual filtered outfits
          // For now, just support recipe-based deletion
          alert('Please select a specific recipe to delete its outfits.');
          return;
        }
        await loadOutfits();
        setRecipeFilter('all'); // Reset filter after deletion
      } catch (error) {
        console.error('Error deleting outfits:', error);
        alert('Error deleting outfits. Check console for details.');
      }
    }
  }

  async function handleFixImages() {
    try {
      setIsFixingImages(true);
      console.log('🔧 Manually fixing missing images...');
      const result = await fixOutfitImageUrls();
      console.log('✓ Fix complete:', result);

      // Reload outfits to show updated images
      const allOutfits = await getAllOutfits();
      const outfitStats = await getOutfitStats();
      setOutfits(allOutfits);
      setStats(outfitStats);

      alert(`Fixed ${result.fixed} malformed URLs and fetched ${result.fetched} missing images from CLIP API`);
    } catch (error) {
      console.error('Error fixing images:', error);
      alert('Error fixing images. Check console for details.');
    } finally {
      setIsFixingImages(false);
    }
  }

  async function handleExportOutfits() {
    try {
      await exportOutfitsToJSON();
      alert(`✓ Exported ${outfits.length} outfits to JSON file. Check your Downloads folder.`);
    } catch (error) {
      console.error('Error exporting outfits:', error);
      alert('Error exporting outfits. Check console for details.');
    }
  }

  async function handleFindDuplicates() {
    try {
      setIsDeduplicating(true);
      console.log('🔍 Scanning for duplicate outfits...');
      const report = await findDuplicateOutfits();
      setDuplicateReport(report);
      setShowDuplicateReport(true);

      const reportText = generateDeduplicationReportText(report);
      console.log('\n' + reportText);

      if (report.totalDuplicates === 0) {
        alert('✓ No duplicate outfits found!');
      } else {
        alert(`Found ${report.totalDuplicates} duplicate outfits in ${report.duplicateGroups.length} groups. See report below.`);
      }
    } catch (error) {
      console.error('Error finding duplicates:', error);
      alert('Error finding duplicates. Check console for details.');
    } finally {
      setIsDeduplicating(false);
    }
  }

  async function handleRemoveDuplicates() {
    if (!duplicateReport || duplicateReport.totalDuplicates === 0) {
      alert('No duplicates to remove. Run "Find Duplicates" first.');
      return;
    }

    const confirmed = confirm(
      `This will remove ${duplicateReport.totalDuplicates} duplicate outfits (keeps earliest version of each). Continue?`
    );

    if (!confirmed) return;

    try {
      setIsDeduplicating(true);
      const result = await removeDuplicateOutfits();
      alert(`✓ Removed ${result.removed} duplicate outfits. ${result.kept} unique outfits remain.`);

      // Reload outfits to show updated list
      await loadOutfits();
      setShowDuplicateReport(false);
      setDuplicateReport(null);
    } catch (error) {
      console.error('Error removing duplicates:', error);
      alert('Error removing duplicates. Check console for details.');
    } finally {
      setIsDeduplicating(false);
    }
  }

  const uniqueRecipes = Array.from(new Set(outfits.map((o) => o.recipeId)));

  // Helper: Distribute items across 3 columns for outfit grid
  function distributeItems(items: any[]): [any[], any[], any[]] {
    const count = items.length;

    if (count === 4) {
      // [1, 2, 1] - col1: 1 tall, col2: 2 stacked, col3: 1 tall
      return [[items[0]], [items[1], items[2]], [items[3]]];
    } else if (count === 5) {
      // [2, 1, 2] - col1: 2 stacked, col2: 1 tall, col3: 2 stacked
      return [[items[0], items[1]], [items[2]], [items[3], items[4]]];
    } else if (count === 6) {
      // [2, 2, 2] - all columns 2 stacked
      return [[items[0], items[1]], [items[2], items[3]], [items[4], items[5]]];
    } else {
      // Fallback for other counts (shouldn't happen with valid outfits)
      // Distribute as evenly as possible
      const perCol = Math.ceil(count / 3);
      return [
        items.slice(0, perCol),
        items.slice(perCol, perCol * 2),
        items.slice(perCol * 2),
      ];
    }
  }

  if (outfits.length === 0) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Box sx={{ mb: 4 }}>
          <Typography variant="h4" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <OutfitIcon color="primary" fontSize="large" />
            Generated Outfits
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Browse and manage outfits generated from recipe cooking
          </Typography>
        </Box>

        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <OutfitIcon sx={{ fontSize: 80, color: 'text.disabled', mb: 2 }} />
          <Typography variant="h6" gutterBottom>
            No Outfits Yet
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Cook some recipes in the Cooker to generate outfits
          </Typography>
          <Button variant="contained" href="/cooker">
            Go to Cooker
          </Button>
        </Paper>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Box>
            <Typography variant="h4" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <OutfitIcon color="primary" fontSize="large" />
              Generated Outfits
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Browse and manage outfits generated from recipe cooking
            </Typography>
          </Box>
          <Stack direction="row" spacing={1} flexWrap="wrap">
            <Button startIcon={<RefreshIcon />} onClick={loadOutfits}>
              Refresh
            </Button>
            <Button
              variant="outlined"
              color="primary"
              href="/outfits/validate"
            >
              Validate Outfits
            </Button>
            <Button
              startIcon={<FixImageIcon />}
              onClick={handleFixImages}
              disabled={isFixingImages}
              color="warning"
            >
              {isFixingImages ? 'Fixing Images...' : 'Fix Missing Images'}
            </Button>
            <Button
              startIcon={<DuplicateIcon />}
              onClick={handleFindDuplicates}
              disabled={isDeduplicating}
              color="secondary"
              variant="outlined"
            >
              {isDeduplicating ? 'Scanning...' : 'Find Duplicates'}
            </Button>
            <Button startIcon={<ExportIcon />} onClick={handleExportOutfits} color="info" variant="outlined">
              Export to JSON
            </Button>
            <Button startIcon={<DeleteIcon />} color="error" onClick={handleClearAll}>
              Clear All
            </Button>
          </Stack>
        </Box>

        {/* Stats */}
        {stats && (
          <Paper sx={{ p: 2, mb: 3 }}>
            <Stack direction="row" spacing={2} flexWrap="wrap">
              <Chip label={`Total: ${stats.total}`} />
              <Chip label={`Primary: ${stats.primary}`} color="success" />
              <Chip label={`Secondary: ${stats.secondary}`} color="warning" />
              <Chip label={`Tagged: ${outfits.filter(o => o.attributes && Object.keys(o.attributes).length > 0).length}`} color="info" />
              <Chip label={`Avg Score: ${Math.round(stats.avgScore)}`} variant="outlined" />
              <Chip label={`${stats.recipeCount} Recipes Cooked`} variant="outlined" />
            </Stack>
          </Paper>
        )}

        {/* Duplicate Report */}
        {showDuplicateReport && duplicateReport && (
          <Paper sx={{ p: 3, mb: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">Duplicate Outfits Report</Typography>
              <Button
                variant="contained"
                color="error"
                startIcon={<DeleteIcon />}
                onClick={handleRemoveDuplicates}
                disabled={duplicateReport.totalDuplicates === 0 || isDeduplicating}
              >
                {isDeduplicating ? 'Removing...' : `Remove ${duplicateReport.totalDuplicates} Duplicates`}
              </Button>
            </Box>

            <Stack direction="row" spacing={3} sx={{ mb: 2 }}>
              <Box>
                <Typography variant="h4" color="text.primary">
                  {duplicateReport.totalOutfits}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Total Outfits
                </Typography>
              </Box>
              <Divider orientation="vertical" flexItem />
              <Box>
                <Typography variant="h4" color="success.main">
                  {duplicateReport.uniqueOutfits}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Unique Outfits
                </Typography>
              </Box>
              <Divider orientation="vertical" flexItem />
              <Box>
                <Typography variant="h4" color="error.main">
                  {duplicateReport.totalDuplicates}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Duplicates
                </Typography>
              </Box>
            </Stack>

            {duplicateReport.totalDuplicates > 0 && (
              <Alert severity="warning" sx={{ mb: 2 }}>
                Found {duplicateReport.duplicateGroups.length} groups with duplicate outfits. These likely came from
                re-cooking the same recipe. Click "Remove Duplicates" to keep only the earliest version of each outfit.
              </Alert>
            )}

            {duplicateReport.totalDuplicates === 0 && (
              <Alert severity="success">No duplicate outfits found! All outfits are unique.</Alert>
            )}

            {duplicateReport.duplicateGroups.length > 0 && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Duplicate Groups:
                </Typography>
                <Stack spacing={1}>
                  {duplicateReport.duplicateGroups.slice(0, 10).map((group, idx) => (
                    <Paper key={idx} variant="outlined" sx={{ p: 2 }}>
                      <Typography variant="body2" fontWeight="medium" gutterBottom>
                        {group.outfits[0].recipeTitle}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" display="block">
                        Found {group.outfits.length} times • Keep: 1 • Remove: {group.duplicateIds.length}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" display="block" sx={{ fontSize: '0.7rem' }}>
                        Products: {group.outfits[0].items.map((i) => i.product.brand).join(', ')}
                      </Typography>
                    </Paper>
                  ))}
                  {duplicateReport.duplicateGroups.length > 10 && (
                    <Typography variant="caption" color="text.secondary">
                      ... and {duplicateReport.duplicateGroups.length - 10} more groups
                    </Typography>
                  )}
                </Stack>
              </Box>
            )}
          </Paper>
        )}

        {/* Scoring Guide */}
        <Accordion sx={{ mb: 3 }}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <InfoIcon fontSize="small" color="primary" />
              <Typography variant="body2" fontWeight="medium">
                Understanding Outfit Scores
              </Typography>
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            <Stack spacing={2}>
              <Box>
                <Typography variant="subtitle2" gutterBottom>
                  Two-Score System:
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  <strong>Q (Quality):</strong> How good is the outfit? (color harmony, style coherence, silhouette, fashionability)
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  <strong>A (Alignment):</strong> How well does it match the recipe? (ingredient fidelity, query relevance)
                </Typography>
              </Box>

              <Divider />

              <Box>
                <Typography variant="subtitle2" gutterBottom>
                  Tier Classification:
                </Typography>
                <Stack spacing={1}>
                  <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                    <Chip label="Primary" color="success" size="small" />
                    <Typography variant="body2" color="text.secondary">
                      Quality ≥70 AND Alignment ≥80 (perfect match)
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                    <Chip label="Secondary" color="warning" size="small" />
                    <Typography variant="body2" color="text.secondary">
                      Quality ≥70 AND Alignment 60-79 (good enough)
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                    <Chip label="Happy Accident" color="info" size="small" />
                    <Typography variant="body2" color="text.secondary">
                      Quality ≥70 BUT Alignment &lt;60 (good outfit, wrong recipe)
                    </Typography>
                  </Box>
                </Stack>
              </Box>

              <Alert severity="info" icon={<InfoIcon />}>
                <Typography variant="caption">
                  <strong>Pro Tip:</strong> If a recipe produces 0 Primary outfits, it needs revision. Consider only linking Primary outfits for best results.
                </Typography>
              </Alert>
            </Stack>
          </AccordionDetails>
        </Accordion>

        {/* Filters */}
        <Paper sx={{ p: 2, mb: 3 }}>
          <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
            <Tabs value={filterTab} onChange={(_, val) => setFilterTab(val)} variant="scrollable" scrollButtons="auto">
              <Tab label={`All (${outfits.length})`} value="all" />
              <Tab
                label={`Primary (${outfits.filter((o) => o.poolTier === 'primary').length})`}
                value="primary"
              />
              <Tab
                label={`Secondary (${outfits.filter((o) => o.poolTier === 'secondary').length})`}
                value="secondary"
              />
              <Tab
                label={`Happy Accidents (${outfits.filter((o) => o.poolTier === 'happy-accident').length})`}
                value="happy-accident"
              />
              <Tab
                label={`Tagged (${outfits.filter((o) => o.attributes && Object.keys(o.attributes).length > 0).length})`}
                value="tagged"
              />
              <Tab
                label={`Untagged (${outfits.filter((o) => !o.attributes || Object.keys(o.attributes).length === 0).length})`}
                value="untagged"
              />
            </Tabs>

            <Box sx={{ flexGrow: 1 }} />

            <FormControl size="small" sx={{ minWidth: 200 }}>
              <InputLabel>Recipe</InputLabel>
              <Select
                value={recipeFilter}
                label="Recipe"
                onChange={(e) => setRecipeFilter(e.target.value)}
              >
                <MenuItem value="all">All Recipes</MenuItem>
                {uniqueRecipes.map((recipeId) => {
                  const outfit = outfits.find((o) => o.recipeId === recipeId);
                  return (
                    <MenuItem key={recipeId} value={recipeId}>
                      {outfit?.recipeTitle || recipeId}
                    </MenuItem>
                  );
                })}
              </Select>
            </FormControl>

            <FormControl size="small" sx={{ minWidth: 180 }}>
              <InputLabel>Sort By</InputLabel>
              <Select
                value={sortBy}
                label="Sort By"
                onChange={(e) => setSortBy(e.target.value as SortOption)}
              >
                <MenuItem value="recent">Most Recent</MenuItem>
                <MenuItem value="quality">Quality Score</MenuItem>
                <MenuItem value="alignment">Alignment Score</MenuItem>
              </Select>
            </FormControl>

            {recipeFilter !== 'all' && (
              <Button
                variant="outlined"
                color="error"
                startIcon={<DeleteIcon />}
                onClick={handleDeleteFiltered}
                size="small"
              >
                Delete ({filteredOutfits.length})
              </Button>
            )}
          </Stack>
        </Paper>
      </Box>

      {/* Pagination Controls */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Stack direction="row" spacing={2} alignItems="center" justifyContent="space-between" flexWrap="wrap">
          <Typography variant="body2" color="text.secondary">
            Showing {Math.min((page - 1) * itemsPerPage + 1, filteredOutfits.length)}-
            {Math.min(page * itemsPerPage, filteredOutfits.length)} of {filteredOutfits.length} outfits
          </Typography>

          <Stack direction="row" spacing={2} alignItems="center">
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>Per Page</InputLabel>
              <Select
                value={itemsPerPage}
                label="Per Page"
                onChange={(e) => {
                  setItemsPerPage(Number(e.target.value));
                  setPage(1); // Reset to first page when changing items per page
                }}
              >
                <MenuItem value={25}>25</MenuItem>
                <MenuItem value={50}>50</MenuItem>
                <MenuItem value={100}>100</MenuItem>
                <MenuItem value={200}>200</MenuItem>
              </Select>
            </FormControl>

            <Pagination
              count={Math.ceil(filteredOutfits.length / itemsPerPage)}
              page={page}
              onChange={(_, value) => setPage(value)}
              color="primary"
              showFirstButton
              showLastButton
            />
          </Stack>
        </Stack>
      </Paper>

      {/* Outfits Grid */}
      <Grid container spacing={3}>
        {filteredOutfits.slice((page - 1) * itemsPerPage, page * itemsPerPage).map((outfit) => (
          <Grid item xs={12} md={6} lg={4} key={outfit.outfitId}>
            <Card
              sx={{
                cursor: 'pointer',
                transition: 'all 0.2s',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: 4,
                },
              }}
              onClick={() => {
                setSelectedOutfit(outfit);
                setShowDetailModal(true);
              }}
            >
              {/* 3-Column Outfit Grid (3x2 based layout) */}
              <Box
                sx={{
                  height: 320,
                  bgcolor: 'grey.50',
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr 1fr',
                  gap: 1,
                  p: 1,
                }}
              >
                {(() => {
                  const [col1, col2, col3] = distributeItems(outfit.items);

                  return (
                    <>
                      {/* Column 1 */}
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                        {col1.map((item, idx) => (
                          <Box
                            key={idx}
                            sx={{
                              flex: col1.length === 1 ? '1 1 100%' : '1 1 50%',
                              bgcolor: 'white',
                              borderRadius: 1,
                              overflow: 'hidden',
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              justifyContent: 'center',
                              border: '1px solid',
                              borderColor: 'grey.200',
                            }}
                          >
                            {item.product.imageUrl ? (
                              <Box
                                component="img"
                                src={item.product.imageUrl}
                                alt={item.product.title}
                                sx={{
                                  width: '100%',
                                  height: '100%',
                                  objectFit: 'contain',
                                  p: 1,
                                }}
                              />
                            ) : (
                              <Box sx={{ color: 'grey.400', fontSize: '0.75rem', textAlign: 'center', p: 1 }}>
                                No image
                              </Box>
                            )}
                          </Box>
                        ))}
                      </Box>

                      {/* Column 2 */}
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                        {col2.map((item, idx) => (
                          <Box
                            key={idx}
                            sx={{
                              flex: col2.length === 1 ? '1 1 100%' : '1 1 50%',
                              bgcolor: 'white',
                              borderRadius: 1,
                              overflow: 'hidden',
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              justifyContent: 'center',
                              border: '1px solid',
                              borderColor: 'grey.200',
                            }}
                          >
                            {item.product.imageUrl ? (
                              <Box
                                component="img"
                                src={item.product.imageUrl}
                                alt={item.product.title}
                                sx={{
                                  width: '100%',
                                  height: '100%',
                                  objectFit: 'contain',
                                  p: 1,
                                }}
                              />
                            ) : (
                              <Box sx={{ color: 'grey.400', fontSize: '0.75rem', textAlign: 'center', p: 1 }}>
                                No image
                              </Box>
                            )}
                          </Box>
                        ))}
                      </Box>

                      {/* Column 3 */}
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                        {col3.map((item, idx) => (
                          <Box
                            key={idx}
                            sx={{
                              flex: col3.length === 1 ? '1 1 100%' : '1 1 50%',
                              bgcolor: 'white',
                              borderRadius: 1,
                              overflow: 'hidden',
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              justifyContent: 'center',
                              border: '1px solid',
                              borderColor: 'grey.200',
                            }}
                          >
                            {item.product.imageUrl ? (
                              <Box
                                component="img"
                                src={item.product.imageUrl}
                                alt={item.product.title}
                                sx={{
                                  width: '100%',
                                  height: '100%',
                                  objectFit: 'contain',
                                  p: 1,
                                }}
                              />
                            ) : (
                              <Box sx={{ color: 'grey.400', fontSize: '0.75rem', textAlign: 'center', p: 1 }}>
                                No image
                              </Box>
                            )}
                          </Box>
                        ))}
                      </Box>
                    </>
                  );
                })()}
              </Box>
              <CardContent>
                {/* Simplified Card Content - Click for full details */}

                {/* Recipe Title */}
                <Typography variant="subtitle1" gutterBottom fontWeight="bold" sx={{ mb: 1.5 }}>
                  {outfit.recipeTitle}
                </Typography>

                {/* Key Scores & Status */}
                <Stack direction="row" spacing={1} sx={{ mb: 2 }} flexWrap="wrap" useFlexGap>
                  <Chip
                    label={`Quality ${outfit.qualityScore}`}
                    color="primary"
                    size="small"
                  />
                  <Chip
                    label={outfit.poolTier}
                    color={
                      outfit.poolTier === 'primary'
                        ? 'success'
                        : outfit.poolTier === 'happy-accident'
                        ? 'info'
                        : 'warning'
                    }
                    size="small"
                  />
                  {outfit.attributes && outfit.attributes.stylePillar && (
                    <Chip
                      label={outfit.attributes.stylePillar}
                      color="secondary"
                      variant="outlined"
                      size="small"
                    />
                  )}
                  {outfit.attributes && (
                    <Chip
                      label="Tagged"
                      color="info"
                      size="small"
                      variant="outlined"
                    />
                  )}
                </Stack>

                {/* Click indicator */}
                <Typography variant="caption" color="primary.main" sx={{ fontStyle: 'italic' }}>
                  Click for full details →
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Bottom Pagination */}
      {filteredOutfits.length > 0 && (
        <Box sx={{ mt: 4, display: 'flex', justifyContent: 'center' }}>
          <Pagination
            count={Math.ceil(filteredOutfits.length / itemsPerPage)}
            page={page}
            onChange={(_, value) => {
              setPage(value);
              window.scrollTo({ top: 0, behavior: 'smooth' }); // Scroll to top on page change
            }}
            color="primary"
            showFirstButton
            showLastButton
            size="large"
          />
        </Box>
      )}

      {filteredOutfits.length === 0 && (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="body1" color="text.secondary">
            No outfits match the current filters
          </Typography>
        </Paper>
      )}

      {/* Outfit Detail Modal */}
      <OutfitDetailModal
        outfit={selectedOutfit}
        open={showDetailModal}
        onClose={() => {
          setShowDetailModal(false);
          setSelectedOutfit(null);
        }}
      />
    </Container>
  );
}
