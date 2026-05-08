'use client';

/**
 * Outfit Browser - REDESIGNED
 * Full-width horizontal cards with comprehensive filtering
 */

import { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Paper,
  Chip,
  Card,
  Stack,
  Tabs,
  Tab,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Alert,
  Pagination,
  TextField,
} from '@mui/material';
import {
  Checkroom as OutfitIcon,
  Delete as DeleteIcon,
  Refresh as RefreshIcon,
  BrokenImage as FixImageIcon,
  Download as ExportIcon,
  ContentCopy as DuplicateIcon,
} from '@mui/icons-material';
import { getAllOutfits, getOutfitStats, exportOutfitsToJSON, fixOutfitImageUrls, type StoredOutfit } from '@/lib/supabase-outfit-storage';
import { clearAllOutfits } from '@/lib/outfit-storage';
import { findDuplicateOutfits, removeDuplicateOutfits, generateDeduplicationReportText, type DeduplicationReport } from '@/lib/outfit-deduplication';
import type { ActivityContext, Season } from '@/lib/axis-types';
import OutfitDetailModal from '@/components/OutfitDetailModal';

type FilterTab = 'all' | 'primary' | 'secondary' | 'happy-accident' | 'tagged' | 'untagged';
type TagFilter = 'all' | 'missing-vibes' | 'missing-occasions' | 'low-confidence' | 'rules-only' | 'hybrid' | 'ai-axes';
type SortOption = 'quality' | 'alignment' | 'recent';

export default function OutfitsPage() {
  const [outfits, setOutfits] = useState<StoredOutfit[]>([]);
  const [filteredOutfits, setFilteredOutfits] = useState<StoredOutfit[]>([]);
  const [filterTab, setFilterTab] = useState<FilterTab>('all');
  const [tagFilter, setTagFilter] = useState<TagFilter>('all');
  const [activityFilter, setActivityFilter] = useState<ActivityContext | 'all'>('all');
  const [seasonFilter, setSeasonFilter] = useState<Season | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [recipeFilter, setRecipeFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<SortOption>('recent');
  const [stats, setStats] = useState<any>(null);
  const [isFixingImages, setIsFixingImages] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState<string>('');
  const [totalCount, setTotalCount] = useState(0);

  // Pagination
  const [page, setPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(100);

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
  }, [page, itemsPerPage]); // Reload when page/itemsPerPage changes

  useEffect(() => {
    applyFilters();
  }, [outfits, filterTab, tagFilter, activityFilter, seasonFilter, searchQuery, recipeFilter, sortBy]);

  async function loadOutfits() {
    try {
      setLoadingProgress(`Loading page ${page}...`);

      // Calculate offset for current page
      const offset = (page - 1) * itemsPerPage;

      // Load ONLY the current page of outfits (much faster!)
      const pageOutfits = await getAllOutfits({ offset, limit: itemsPerPage });

      setOutfits(pageOutfits);
      setLoadingProgress('');

      // Load stats on first page only
      if (page === 1) {
        setIsFixingImages(true);
        const result = await fixOutfitImageUrls();
        console.log('✓ Image migration complete:', result);

        const outfitStats = await getOutfitStats();
        setStats(outfitStats);
        setTotalCount(outfitStats.total);
        setIsFixingImages(false);
      }
    } catch (error) {
      console.error('Error loading outfits:', error);
      setLoadingProgress('');
      setIsFixingImages(false);
    }
  }

  function applyFilters() {
    let filtered = [...outfits];

    // Filter by pool tier (tabs)
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

    // Filter by tagging quality
    switch (tagFilter) {
      case 'missing-vibes':
        filtered = filtered.filter(o => o.attributes && (!o.attributes.vibes || o.attributes.vibes.length === 0));
        break;
      case 'missing-occasions':
        filtered = filtered.filter(o => o.attributes && (!o.attributes.occasions || o.attributes.occasions.length === 0));
        break;
      case 'low-confidence':
        filtered = filtered.filter(o => {
          const conf = o.attributes?.confidence?.stylePillar || 0;
          return conf < 0.7;
        });
        break;
      case 'rules-only':
        filtered = filtered.filter(o => o.attributes?.taggedBy === 'rules');
        break;
      case 'hybrid':
        filtered = filtered.filter(o => o.attributes?.taggedBy === 'hybrid');
        break;
      case 'ai-axes':
        filtered = filtered.filter(o => {
          const axisTaggedBy = o.attributes?.axisTaggedBy;
          return axisTaggedBy && Object.values(axisTaggedBy).some(source => source === 'ai');
        });
        break;
    }

    // Filter by activity context
    if (activityFilter !== 'all') {
      filtered = filtered.filter(o =>
        o.attributes?.activityContext === activityFilter ||
        o.attributes?.activityContextSecondary === activityFilter
      );
    }

    // Filter by season
    if (seasonFilter !== 'all') {
      filtered = filtered.filter(o =>
        o.attributes?.season && o.attributes.season.includes(seasonFilter)
      );
    }

    // Filter by recipe
    if (recipeFilter !== 'all') {
      filtered = filtered.filter((o) => o.recipeId === recipeFilter);
    }

    // Apply search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(o =>
        o.recipeTitle.toLowerCase().includes(query) ||
        o.items.some(item => item.product?.title?.toLowerCase().includes(query)) ||
        o.attributes?.stylePillar?.toLowerCase().includes(query) ||
        o.attributes?.activityContext?.toLowerCase().includes(query) ||
        o.attributes?.socialRegister?.toLowerCase().includes(query) ||
        o.attributes?.season?.some(s => s.toLowerCase().includes(query))
      );
    }

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'recent':
          // Most recently modified (created OR tagged/scanned)
          // Use the most recent timestamp between generatedAt and taggedAt
          const aDate = Math.max(
            new Date(a.generatedAt).getTime(),
            a.attributes?.taggedAt ? new Date(a.attributes.taggedAt).getTime() : 0
          );
          const bDate = Math.max(
            new Date(b.generatedAt).getTime(),
            b.attributes?.taggedAt ? new Date(b.attributes.taggedAt).getTime() : 0
          );
          return bDate - aDate;
        case 'quality':
          if (b.qualityScore !== a.qualityScore) {
            return b.qualityScore - a.qualityScore;
          }
          return b.alignmentScore - a.alignmentScore;
        case 'alignment':
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
    const { deleteOutfitsByRecipe } = await import('@/lib/outfit-storage');
    if (confirm(`Delete ${filteredOutfits.length} filtered outfits? This cannot be undone.`)) {
      await deleteOutfitsByRecipe(recipeFilter);
      await loadOutfits();
    }
  }

  async function handleFixImages() {
    try {
      setIsFixingImages(true);
      const result = await fixOutfitImageUrls();
      alert(`✓ Fixed ${result.updatedCount} outfits with missing images`);
      await loadOutfits();
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
      setLoadingProgress('Starting duplicate scan...');
      console.log('🔍 Scanning for duplicate outfits across entire database...');

      const report = await findDuplicateOutfits((current, total, message) => {
        const percent = Math.round((current / total) * 100);
        setLoadingProgress(`${message} (${percent}%)`);
      });

      setDuplicateReport(report);
      setShowDuplicateReport(true);
      setLoadingProgress('');

      const reportText = generateDeduplicationReportText(report);
      console.log('\n' + reportText);

      if (report.totalDuplicates === 0) {
        alert(`✓ No duplicate outfits found!\n\nScanned ${report.totalOutfits} total outfits.`);
      } else {
        alert(`Found ${report.totalDuplicates} duplicate outfits in ${report.duplicateGroups.length} groups.\n\nScanned ${report.totalOutfits} total outfits.\nSee report below for details.`);
      }
    } catch (error) {
      console.error('Error finding duplicates:', error);
      alert('Error finding duplicates. Check console for details.');
    } finally {
      setIsDeduplicating(false);
      setLoadingProgress('');
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
      setLoadingProgress('Starting duplicate removal...');

      const result = await removeDuplicateOutfits((current, total, message) => {
        const percent = Math.round((current / total) * 100);
        setLoadingProgress(`${message} (${percent}%)`);
      });

      setLoadingProgress('');
      alert(`✓ Removed ${result.removed} duplicate outfits. ${result.kept} unique outfits remain.`);

      await loadOutfits();
      setShowDuplicateReport(false);
      setDuplicateReport(null);
    } catch (error) {
      console.error('Error removing duplicates:', error);
      alert('Error removing duplicates. Check console for details.');
    } finally {
      setIsDeduplicating(false);
      setLoadingProgress('');
    }
  }

  const uniqueRecipes = Array.from(new Set(outfits.map((o) => o.recipeId)));

  // Calculate tag quality stats
  const tagStats = {
    missingVibes: outfits.filter(o => o.attributes && (!o.attributes.vibes || o.attributes.vibes.length === 0)).length,
    missingOccasions: outfits.filter(o => o.attributes && (!o.attributes.occasions || o.attributes.occasions.length === 0)).length,
    lowConfidence: outfits.filter(o => (o.attributes?.confidence?.stylePillar || 0) < 0.7).length,
  };

  if (outfits.length === 0) {
    return (
      <Container maxWidth="xl" sx={{ py: 4 }}>
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
    <Container maxWidth="xl" sx={{ py: 4 }}>
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
              <Chip label={`Tagged: ${stats.tagged || 0}`} color="info" />
              <Chip label={`Untagged: ${stats.untagged || 0}`} variant="outlined" />
              {tagStats.missingVibes > 0 && (
                <Chip label={`Missing Vibes: ${tagStats.missingVibes}`} color="warning" variant="outlined" />
              )}
              {tagStats.missingOccasions > 0 && (
                <Chip label={`Missing Occasions: ${tagStats.missingOccasions}`} color="warning" variant="outlined" />
              )}
              {tagStats.lowConfidence > 0 && (
                <Chip label={`Low Confidence: ${tagStats.lowConfidence}`} color="error" variant="outlined" />
              )}
            </Stack>
          </Paper>
        )}

        {/* Loading Progress */}
        {loadingProgress && (
          <Alert severity="info" sx={{ mb: 3 }}>
            {loadingProgress}
          </Alert>
        )}

        {/* Duplicate Report */}
        {showDuplicateReport && duplicateReport && duplicateReport.totalDuplicates > 0 && (
          <Alert severity="warning" sx={{ mb: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="body2">
                Found {duplicateReport.totalDuplicates} duplicate outfits
              </Typography>
              <Button
                variant="contained"
                color="error"
                size="small"
                startIcon={<DeleteIcon />}
                onClick={handleRemoveDuplicates}
                disabled={isDeduplicating}
              >
                {isDeduplicating ? 'Removing...' : 'Remove Duplicates'}
              </Button>
            </Box>
          </Alert>
        )}

        {/* Pool Tier Tabs */}
        <Paper sx={{ mb: 3 }}>
          <Tabs value={filterTab} onChange={(_, val) => setFilterTab(val)} variant="scrollable" scrollButtons="auto">
            <Tab label={`All${stats ? ` (${stats.total})` : ''}`} value="all" />
            <Tab label={`Primary${stats ? ` (${stats.primary})` : ''}`} value="primary" />
            <Tab label={`Secondary${stats ? ` (${stats.secondary})` : ''}`} value="secondary" />
            <Tab label="Happy Accidents" value="happy-accident" />
            <Tab label={`Tagged${stats ? ` (${stats.tagged})` : ''}`} value="tagged" />
            <Tab label={`Untagged${stats ? ` (${stats.untagged})` : ''}`} value="untagged" />
          </Tabs>
        </Paper>

        {/* Filters */}
        <Paper sx={{ p: 2, mb: 3 }}>
          <Stack spacing={2}>
            <Stack direction="row" spacing={2} flexWrap="wrap">
              <FormControl size="small" sx={{ minWidth: 200 }}>
                <InputLabel>Tag Quality</InputLabel>
                <Select
                  value={tagFilter}
                  label="Tag Quality"
                  onChange={(e) => setTagFilter(e.target.value as TagFilter)}
                >
                  <MenuItem value="all">All Outfits</MenuItem>
                  <MenuItem value="missing-vibes">Missing Vibes</MenuItem>
                  <MenuItem value="missing-occasions">Missing Occasions</MenuItem>
                  <MenuItem value="low-confidence">Low Confidence</MenuItem>
                  <MenuItem value="rules-only">Rules-Only</MenuItem>
                  <MenuItem value="hybrid">Hybrid (AI)</MenuItem>
                  <MenuItem value="ai-axes">AI-Refined Axes</MenuItem>
                </Select>
              </FormControl>

              <FormControl size="small" sx={{ minWidth: 180 }}>
                <InputLabel>Activity Context</InputLabel>
                <Select
                  value={activityFilter}
                  label="Activity Context"
                  onChange={(e) => setActivityFilter(e.target.value as ActivityContext | 'all')}
                >
                  <MenuItem value="all">All Contexts</MenuItem>
                  <MenuItem value="casual-low-key">Casual Low-Key</MenuItem>
                  <MenuItem value="social-daytime">Social Daytime</MenuItem>
                  <MenuItem value="social-evening">Social Evening</MenuItem>
                  <MenuItem value="professional">Professional</MenuItem>
                  <MenuItem value="event">Event</MenuItem>
                  <MenuItem value="active">Active</MenuItem>
                </Select>
              </FormControl>

              <FormControl size="small" sx={{ minWidth: 150 }}>
                <InputLabel>Season</InputLabel>
                <Select
                  value={seasonFilter}
                  label="Season"
                  onChange={(e) => setSeasonFilter(e.target.value as Season | 'all')}
                >
                  <MenuItem value="all">All Seasons</MenuItem>
                  <MenuItem value="spring">Spring</MenuItem>
                  <MenuItem value="summer">Summer</MenuItem>
                  <MenuItem value="fall">Fall</MenuItem>
                  <MenuItem value="winter">Winter</MenuItem>
                  <MenuItem value="all-season">All-Season</MenuItem>
                </Select>
              </FormControl>

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
            </Stack>

            <TextField
              size="small"
              label="Search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Recipe, product, pillar, activity..."
              sx={{ maxWidth: 400 }}
            />

            <Typography variant="body2" color="text.secondary">
              Showing {filteredOutfits.length} of {outfits.length} outfits
              {recipeFilter !== 'all' && (
                <Button
                  size="small"
                  color="error"
                  startIcon={<DeleteIcon />}
                  onClick={handleDeleteFiltered}
                  sx={{ ml: 2 }}
                >
                  Delete Filtered ({filteredOutfits.length})
                </Button>
              )}
            </Typography>
          </Stack>
        </Paper>
      </Box>

      {/* Full-Width Horizontal Outfit Cards */}
      <Stack spacing={2} sx={{ mb: 4 }}>
        {filteredOutfits.map((outfit) => (
          <Card
            key={outfit.outfitId}
            sx={{
              cursor: 'pointer',
              transition: 'all 0.2s',
              '&:hover': {
                boxShadow: 4,
              },
            }}
            onClick={() => {
              setSelectedOutfit(outfit);
              setShowDetailModal(true);
            }}
          >
            <Box sx={{ display: 'flex', p: 2, gap: 2 }}>
              {/* LEFT: Product Image Grid (Smaller) */}
              <Box
                sx={{
                  width: 240,
                  height: 200,
                  flexShrink: 0,
                  bgcolor: 'grey.50',
                  display: 'grid',
                  gridTemplateColumns: outfit.items.length === 4 ? '1fr 1fr' : '1fr 1fr 1fr',
                  gridTemplateRows: outfit.items.length === 4 ? '1fr 1fr' : '1fr 1fr',
                  gap: 0.5,
                  borderRadius: 1,
                  overflow: 'hidden',
                  border: '1px solid',
                  borderColor: 'grey.200',
                }}
              >
                {outfit.items.slice(0, 6).map((item, idx) => (
                  <Box
                    key={idx}
                    sx={{
                      bgcolor: 'white',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      overflow: 'hidden',
                    }}
                  >
                    {item.product?.imageUrl ? (
                      <Box
                        component="img"
                        src={item.product.imageUrl}
                        alt={item.product?.title || 'Product'}
                        sx={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'contain',
                          p: 0.5,
                        }}
                      />
                    ) : (
                      <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.65rem' }}>
                        No image
                      </Typography>
                    )}
                  </Box>
                ))}
              </Box>

              {/* RIGHT: Outfit Info */}
              <Box sx={{ flex: 1, minWidth: 0 }}>
                {/* Title & Primary Chips */}
                <Typography variant="h6" gutterBottom sx={{ mb: 1.5 }}>
                  {outfit.recipeTitle}
                </Typography>

                <Stack direction="row" spacing={0.5} sx={{ mb: 2 }} flexWrap="wrap" useFlexGap>
                  <Chip label={`Q: ${outfit.qualityScore}`} color="primary" size="small" />
                  <Chip label={`A: ${outfit.alignmentScore}`} color="secondary" size="small" />
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
                  {outfit.attributes?.stylePillar && (
                    <Chip label={outfit.attributes.stylePillar} size="small" variant="outlined" />
                  )}
                  {outfit.attributes && (
                    <Chip label="Tagged" color="info" size="small" variant="outlined" />
                  )}
                </Stack>

                {/* Two-column details with chips showing confidence & AI indicators */}
                {outfit.attributes && (
                  <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                    {/* Left column - 4-Axis Attributes */}
                    <Stack spacing={1}>
                      {/* Formality */}
                      {outfit.attributes.formality !== undefined && (
                        <Box>
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                            <strong>Formality</strong>
                          </Typography>
                          <Chip
                            label={outfit.attributes.formality.toFixed(1)}
                            size="small"
                            color={
                              (outfit.attributes.confidence?.formality || 0) >= 0.7 ? 'success' : 'warning'
                            }
                            variant={outfit.attributes.axisTaggedBy?.formality === 'ai' ? 'filled' : 'outlined'}
                          />
                        </Box>
                      )}

                      {/* Activity Context */}
                      {outfit.attributes.activityContext && (
                        <Box>
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                            <strong>Activity</strong>
                          </Typography>
                          <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                            <Chip
                              label={outfit.attributes.activityContext.replace(/-/g, ' ')}
                              size="small"
                              color={
                                (outfit.attributes.confidence?.activityContext || 0) >= 0.65 ? 'success' : 'warning'
                              }
                              variant={outfit.attributes.axisTaggedBy?.activityContext === 'ai' ? 'filled' : 'outlined'}
                              sx={{ fontSize: '0.7rem' }}
                            />
                            {outfit.attributes.activityContextSecondary && (
                              <Chip
                                label={outfit.attributes.activityContextSecondary.replace(/-/g, ' ')}
                                size="small"
                                color="default"
                                variant="outlined"
                                sx={{ fontSize: '0.7rem' }}
                              />
                            )}
                          </Stack>
                        </Box>
                      )}

                      {/* Season */}
                      {outfit.attributes.season && outfit.attributes.season.length > 0 && (
                        <Box>
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                            <strong>Season</strong>
                          </Typography>
                          <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                            {outfit.attributes.season.map(s => (
                              <Chip
                                key={s}
                                label={s}
                                size="small"
                                color={
                                  (outfit.attributes.confidence?.season || 0) >= 0.7 ? 'success' : 'warning'
                                }
                                variant={outfit.attributes.axisTaggedBy?.season === 'ai' ? 'filled' : 'outlined'}
                                sx={{ fontSize: '0.7rem' }}
                              />
                            ))}
                          </Stack>
                        </Box>
                      )}

                      {/* Social Register */}
                      {outfit.attributes.socialRegister && (
                        <Box>
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                            <strong>Social Register</strong>
                          </Typography>
                          <Chip
                            label={outfit.attributes.socialRegister.replace(/-/g, ' ')}
                            size="small"
                            color={
                              (outfit.attributes.confidence?.socialRegister || 0) >= 0.6 ? 'success' : 'warning'
                            }
                            variant={outfit.attributes.axisTaggedBy?.socialRegister === 'ai' ? 'filled' : 'outlined'}
                            sx={{ fontSize: '0.7rem' }}
                          />
                        </Box>
                      )}
                    </Stack>

                    {/* Right column - Vibes & Occasions */}
                    <Stack spacing={1}>
                      {/* Vibes */}
                      {outfit.attributes.vibes && outfit.attributes.vibes.length > 0 ? (
                        <Box>
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                            <strong>Vibes</strong>
                          </Typography>
                          <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                            {outfit.attributes.vibes.slice(0, 4).map(v => (
                              <Chip key={v} label={v} size="small" sx={{ fontSize: '0.7rem' }} />
                            ))}
                            {outfit.attributes.vibes.length > 4 && (
                              <Typography variant="caption" color="text.secondary" sx={{ alignSelf: 'center' }}>
                                +{outfit.attributes.vibes.length - 4} more
                              </Typography>
                            )}
                          </Stack>
                        </Box>
                      ) : (
                        <Box>
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                            <strong>Vibes</strong>
                          </Typography>
                          <Chip label="None" size="small" color="warning" />
                        </Box>
                      )}

                      {/* Occasions */}
                      {outfit.attributes.occasions && outfit.attributes.occasions.length > 0 ? (
                        <Box>
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                            <strong>Occasions</strong>
                          </Typography>
                          <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                            {outfit.attributes.occasions.slice(0, 4).map(o => (
                              <Chip key={o} label={o} size="small" sx={{ fontSize: '0.7rem' }} />
                            ))}
                            {outfit.attributes.occasions.length > 4 && (
                              <Typography variant="caption" color="text.secondary" sx={{ alignSelf: 'center' }}>
                                +{outfit.attributes.occasions.length - 4} more
                              </Typography>
                            )}
                          </Stack>
                        </Box>
                      ) : (
                        <Box>
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                            <strong>Occasions</strong>
                          </Typography>
                          <Chip label="None" size="small" color="warning" />
                        </Box>
                      )}

                      {/* Tagged By */}
                      {outfit.attributes.taggedBy && (
                        <Box>
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                            <strong>Tagged By</strong>
                          </Typography>
                          <Chip
                            label={outfit.attributes.taggedBy}
                            size="small"
                            color={outfit.attributes.taggedBy === 'rules' ? 'success' : 'info'}
                            variant="outlined"
                          />
                        </Box>
                      )}
                    </Stack>
                  </Box>
                )}

                {/* Metadata row */}
                <Typography variant="caption" color="text.disabled" sx={{ display: 'block', mt: 1 }}>
                  {outfit.items.length} items • {outfit.department} • Generated {new Date(outfit.generatedAt).toLocaleDateString()}
                </Typography>
              </Box>
            </Box>
          </Card>
        ))}
      </Stack>

      {/* Pagination */}
      {totalCount > 0 && (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 2, mt: 4 }}>
          <Typography variant="body2" color="text.secondary">
            Showing {(page - 1) * itemsPerPage + 1}-{Math.min(page * itemsPerPage, totalCount)} of {totalCount}
          </Typography>

          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Per Page</InputLabel>
            <Select
              value={itemsPerPage}
              label="Per Page"
              onChange={(e) => {
                setItemsPerPage(Number(e.target.value));
                setPage(1);
              }}
            >
              <MenuItem value={50}>50</MenuItem>
              <MenuItem value={100}>100</MenuItem>
              <MenuItem value={200}>200</MenuItem>
              <MenuItem value={500}>500</MenuItem>
            </Select>
          </FormControl>

          <Pagination
            count={Math.ceil(totalCount / itemsPerPage)}
            page={page}
            onChange={(_, value) => {
              setPage(value);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            color="primary"
            showFirstButton
            showLastButton
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
