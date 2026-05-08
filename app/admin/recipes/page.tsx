'use client';

import {
  Container,
  Typography,
  Box,
  Tabs,
  Tab,
  TextField,
  Button,
  InputAdornment,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
  Grid,
  Card,
  CardContent,
  IconButton,
  Stack,
  Paper,
  Pagination,
  Divider,
  Menu,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import EditIcon from '@mui/icons-material/Edit';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';
import RefreshIcon from '@mui/icons-material/Refresh';
import DownloadIcon from '@mui/icons-material/Download';
import CleaningServicesIcon from '@mui/icons-material/CleaningServices';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getAllRecipes, deleteRecipe as deleteRecipeFromDB, exportRecipesToJSON, type RecipeBuilderRecipe } from '@/lib/supabase-recipe-storage';
import { deleteOutfitsByRecipe } from '@/lib/supabase-outfit-storage';
import { getAllRecipeStatuses, type RecipeStatus } from '@/lib/supabase-recipe-status';
import { clearAllOutfits, deleteRecipeStatus } from '@/lib/indexeddb-storage';
import RecipeDetailModal from '@/components/RecipeDetailModal';

type RecipeTab = 'all' | 'campaign' | 'outfit' | 'trend';

export default function RecipesPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<RecipeTab>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [recipes, setRecipes] = useState<RecipeBuilderRecipe[]>([]);
  const [recipeStatuses, setRecipeStatuses] = useState<Map<string, RecipeStatus>>(new Map());

  // Filter states
  const [slotCountFilter, setSlotCountFilter] = useState<string>('');
  const [departmentFilter, setDepartmentFilter] = useState<string>('');
  const [seasonFilter, setSeasonFilter] = useState<string>('');
  const [sourceFilter, setSourceFilter] = useState<string>('');
  const [sortBy, setSortBy] = useState<string>('newest');

  // Pagination
  const [page, setPage] = useState(0);
  const recipesPerPage = 12;

  // Modal state
  const [selectedRecipe, setSelectedRecipe] = useState<RecipeBuilderRecipe | null>(null);
  const [selectedRecipeStatus, setSelectedRecipeStatus] = useState<RecipeStatus | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  // New Recipe dropdown state
  const [newRecipeAnchor, setNewRecipeAnchor] = useState<null | HTMLElement>(null);

  useEffect(() => {
    // Load recipes and statuses from IndexedDB
    async function loadData() {
      const loadedRecipes = await getAllRecipes();
      setRecipes(loadedRecipes);

      const statuses = await getAllRecipeStatuses();
      const statusMap = new Map(statuses.map(s => [s.recipeId, s]));
      setRecipeStatuses(statusMap);

      // Check if we should auto-open a specific recipe (from violation tracking)
      const openRecipeId = sessionStorage.getItem('openRecipeId');
      if (openRecipeId) {
        sessionStorage.removeItem('openRecipeId'); // Clear immediately

        // Find and open the recipe
        const recipeToOpen = loadedRecipes.find(r => r.id === openRecipeId);
        if (recipeToOpen) {
          console.log('Auto-opening recipe from violation tracking:', recipeToOpen.title);
          setSelectedRecipe(recipeToOpen);
          setModalOpen(true);
        } else {
          console.warn('Recipe not found:', openRecipeId);
        }
      }
    }
    loadData();
  }, []);

  const handleViewDetails = (recipe: RecipeBuilderRecipe) => {
    setSelectedRecipe(recipe);
    setSelectedRecipeStatus(recipeStatuses.get(recipe.id) || null);
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setSelectedRecipe(null);
    setSelectedRecipeStatus(null);
  };

  const handleDeleteRecipe = async (recipeId: string) => {
    if (confirm('Are you sure you want to delete this recipe?')) {
      try {
        await deleteRecipeFromDB(recipeId);
        const updatedRecipes = recipes.filter(r => r.id !== recipeId);
        setRecipes(updatedRecipes);

        // Close modal if this recipe is currently open
        if (selectedRecipe?.id === recipeId) {
          handleCloseModal();
        }
      } catch (error) {
        console.error('Failed to delete recipe:', error);
        alert('Error deleting recipe. Check console for details.');
      }
    }
  };

  const handleRecookRecipe = async (recipeId: string) => {
    if (confirm('This will delete all existing outfits for this recipe and redirect to the cooker. Continue?')) {
      try {
        // Delete existing outfits
        await deleteOutfitsByRecipe(recipeId);
        // Delete status
        await deleteRecipeStatus(recipeId);
        console.log(`✓ Cleared outfits for recipe ${recipeId}`);

        // Redirect to cooker with this recipe pre-selected
        sessionStorage.setItem('cookRecipeId', recipeId);
        window.location.href = '/cooker';
      } catch (error) {
        console.error('Failed to clear outfits:', error);
        alert('Error clearing outfits. Check console for details.');
      }
    }
  };

  const handleClearAllOutfits = async () => {
    const outfitCount = Array.from(recipeStatuses.values()).reduce((sum, s) => sum + s.outfitCount, 0);

    if (confirm(`This will delete ALL ${outfitCount} outfits and status records. This cannot be undone. Continue?`)) {
      try {
        await clearAllOutfits();
        // Clear all statuses by deleting them one by one
        for (const recipeId of recipeStatuses.keys()) {
          await deleteRecipeStatus(recipeId);
        }

        // Reload statuses
        setRecipeStatuses(new Map());
        console.log(`✓ Cleared all outfits and statuses`);
        alert(`Successfully cleared ${outfitCount} outfits`);
      } catch (error) {
        console.error('Failed to clear all outfits:', error);
        alert('Error clearing outfits. Check console for details.');
      }
    }
  };

  const handleExportRecipes = async () => {
    try {
      await exportRecipesToJSON();
      alert(`✓ Exported ${recipes.length} recipes to JSON file. Check your Downloads folder.`);
    } catch (error) {
      console.error('Error exporting recipes:', error);
      alert('Error exporting recipes. Check console for details.');
    }
  };

  const handleTabChange = (_event: React.SyntheticEvent, newValue: RecipeTab) => {
    setActiveTab(newValue);
    setPage(0); // Reset to first page
  };

  const handleClearFilters = () => {
    setSearchQuery('');
    setSlotCountFilter('');
    setDepartmentFilter('');
    setSeasonFilter('');
    setSourceFilter('');
    setSortBy('newest');
    setPage(0);
  };

  // Apply filters
  let filteredRecipes = recipes.filter(recipe => {
    // Tab filter - only show outfit recipes on outfit tab
    // (All tab shows everything, other tabs would filter by type when those exist)
    if (activeTab === 'outfit') {
      // For now, all recipes are outfit recipes
      // Future: filter by recipe.type === 'outfit'
    }

    // Search query - search in title AND ingredient titles
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const titleMatch = recipe.title.toLowerCase().includes(query);

      // Also search ingredient titles
      const ingredientMatch = recipe.slots?.some(slot =>
        slot.ingredient.ingredientTitle.toLowerCase().includes(query) ||
        slot.ingredient.searchQuery.toLowerCase().includes(query)
      ) || false;

      if (!titleMatch && !ingredientMatch) {
        return false;
      }
    }

    // Slot count
    if (slotCountFilter && recipe.slotCount !== parseInt(slotCountFilter)) {
      return false;
    }

    // Department
    if (departmentFilter && recipe.department !== departmentFilter) {
      return false;
    }

    // Season (any match in array or empty array)
    if (seasonFilter) {
      if (seasonFilter === 'All Season') {
        // Show recipes with no seasons selected
        if (recipe.seasons.length > 0) return false;
      } else {
        // Show recipes that include this season
        if (!recipe.seasons.includes(seasonFilter)) return false;
      }
    }

    // Source
    if (sourceFilter) {
      const recipeSource = recipe.source || 'manual';
      if (recipeSource !== sourceFilter) return false;
    }

    return true;
  });

  // Apply sorting
  filteredRecipes = [...filteredRecipes].sort((a, b) => {
    switch (sortBy) {
      case 'newest':
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      case 'oldest':
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      case 'a-z':
        return a.title.localeCompare(b.title);
      case 'z-a':
        return b.title.localeCompare(a.title);
      default:
        return 0;
    }
  });

  // Pagination
  const totalPages = Math.ceil(filteredRecipes.length / recipesPerPage);
  const paginatedRecipes = filteredRecipes.slice(
    page * recipesPerPage,
    (page + 1) * recipesPerPage
  );

  const activeFilterCount = [
    slotCountFilter,
    departmentFilter,
    seasonFilter,
    sourceFilter,
    searchQuery
  ].filter(Boolean).length;

  const colors = { bg: '#f3e5f5', text: '#9c27b0', border: '#ce93d8' };

  // Minimal card for "All Recipes" tab
  const MinimalRecipeCard = ({ recipe, onViewDetails, onDelete }: { recipe: RecipeBuilderRecipe; onViewDetails: (recipe: RecipeBuilderRecipe) => void; onDelete: (id: string) => void }) => {
    const slotCount = recipe.slotCount || (recipe.slots?.length || 0);
    const source = recipe.source || 'manual';
    const isAI = source === 'ai-vision';
    const status = recipeStatuses.get(recipe.id);

    return (
      <Card variant="outlined" sx={{ borderRadius: 2 }}>
        {/* Badges at top INSIDE card */}
        <Box sx={{ display: 'flex', alignItems: 'center', p: 2, pb: 0 }}>
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

        <CardContent sx={{ p: 2, pt: 2, '&:last-child': { pb: 2 } }}>
          {/* Title */}
          <Typography variant="h6" sx={{ fontWeight: 600, fontSize: '18px', mb: 2 }}>
            {recipe.title}
          </Typography>

          <Divider />

          {/* Metadata grid */}
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 3, my: 2 }}>
            <Box>
              <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5 }}>
                last cook date
              </Typography>
              <Typography variant="body1" fontWeight={600}>
                {status
                  ? new Date(status.lastCookedAt).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: '2-digit',
                      day: '2-digit'
                    }).replace(/\//g, '-')
                  : 'Never'}
              </Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5 }}>
                outfits created
              </Typography>
              <Typography variant="body1" fontWeight={600}>
                {status
                  ? `${status.outfitCount} (${status.linkedCount} linked)`
                  : `0 / ${recipe.department}`}
              </Typography>
            </Box>
          </Box>
        </CardContent>

        <Divider />

        {/* Actions footer */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 2 }}>
          <Stack direction="row" spacing={1}>
            {status && (
              <IconButton
                size="small"
                onClick={() => handleRecookRecipe(recipe.id)}
                title="Re-cook this recipe"
                color="warning"
              >
                <RefreshIcon fontSize="small" />
              </IconButton>
            )}
            <IconButton
              size="small"
              onClick={() => onViewDetails(recipe)}
              title="Edit this recipe"
            >
              <EditIcon fontSize="small" />
            </IconButton>
            <IconButton size="small">
              <VisibilityOffIcon fontSize="small" />
            </IconButton>
            <IconButton size="small" onClick={() => onDelete(recipe.id)}>
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Stack>
          <Typography
            variant="body1"
            onClick={() => onViewDetails(recipe)}
            sx={{
              fontWeight: 600,
              textDecoration: 'underline',
              color: 'text.primary',
              cursor: 'pointer',
              '&:hover': { color: 'primary.main' },
            }}
          >
            View Details
          </Typography>
        </Box>
      </Card>
    );
  };

  // Detailed card for "Outfit Recipes" tab (with thumbnails)
  const DetailedOutfitCard = ({ recipe, onViewDetails, onDelete }: { recipe: RecipeBuilderRecipe; onViewDetails: (recipe: RecipeBuilderRecipe) => void; onDelete: (id: string) => void }) => {
    const slots = recipe.slots || [];
    const slotCount = recipe.slotCount || slots.length;
    const source = recipe.source || 'manual';
    const isAI = source === 'ai-vision';
    const seasonsText = recipe.seasons && recipe.seasons.length > 0 ? recipe.seasons.join(', ') : 'All Season';
    const status = recipeStatuses.get(recipe.id);

    return (
      <Card variant="outlined" sx={{ borderRadius: 2, overflow: 'visible' }}>
        {/* Badges at top INSIDE card */}
        <Box sx={{ display: 'flex', alignItems: 'center', p: 2, pb: 0 }}>
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

        <CardContent sx={{ p: 2, pt: 2, '&:last-child': { pb: 2 } }}>
          {/* Title */}
          <Typography variant="h6" sx={{ fontWeight: 600, fontSize: '18px', mb: 2 }}>
            {recipe.title}
          </Typography>

          <Divider />

          {/* Metadata grid */}
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 3, my: 2 }}>
            <Box>
              <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5 }}>
                last cook date
              </Typography>
              <Typography variant="body1" fontWeight={600}>
                {status
                  ? new Date(status.lastCookedAt).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: '2-digit',
                      day: '2-digit'
                    }).replace(/\//g, '-')
                  : 'Never'}
              </Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5 }}>
                outfits created
              </Typography>
              <Typography variant="body1" fontWeight={600}>
                {status
                  ? `${status.outfitCount} (${status.linkedCount} linked)`
                  : `0 / ${recipe.department}`}
              </Typography>
            </Box>
          </Box>

          <Divider />

          {/* Department and Season chips */}
          <Box sx={{ display: 'flex', gap: 1.5, my: 2 }}>
            <Chip
              label={recipe.department}
              sx={{
                fontSize: '14px',
                height: '32px',
                bgcolor: 'grey.100',
                border: 'none',
                borderRadius: 4,
              }}
            />
            <Chip
              label={seasonsText}
              sx={{
                fontSize: '14px',
                height: '32px',
                bgcolor: 'grey.100',
                border: 'none',
                borderRadius: 4,
              }}
            />
          </Box>

          <Divider />

          {/* Product Thumbnails - Grey background with product groups */}
          <Box sx={{ bgcolor: 'grey.50', p: 2, borderRadius: 1, mt: 2 }}>
            <Box sx={{ display: 'grid', gridTemplateRows: '1fr 1fr', gap: 1.5 }}>
              {/* Row 1 - First half of slots */}
              <Box sx={{ display: 'flex', gap: 1.5 }}>
                {Array.from({ length: Math.ceil(slotCount / 2) }).map((_, i) => (
                  <Box
                    key={`row1-${i}`}
                    sx={{
                      flex: 1,
                      display: 'flex',
                      gap: 0.75,
                    }}
                  >
                    {/* Product placeholders */}
                    {Array.from({ length: 5 }).map((_, j) => (
                      <Box
                        key={j}
                        sx={{
                          flex: 1,
                          aspectRatio: '3/4',
                          bgcolor: 'white',
                          borderRadius: 0.5,
                          border: '1px solid',
                          borderColor: 'grey.200',
                        }}
                      />
                    ))}
                  </Box>
                ))}
              </Box>

              {/* Row 2 - Second half of slots */}
              <Box sx={{ display: 'flex', gap: 1.5 }}>
                {Array.from({ length: Math.floor(slotCount / 2) }).map((_, i) => (
                  <Box
                    key={`row2-${i}`}
                    sx={{
                      flex: 1,
                      display: 'flex',
                      gap: 0.75,
                    }}
                  >
                    {/* Product placeholders */}
                    {Array.from({ length: 5 }).map((_, j) => (
                      <Box
                        key={j}
                        sx={{
                          flex: 1,
                          aspectRatio: '3/4',
                          bgcolor: 'white',
                          borderRadius: 0.5,
                          border: '1px solid',
                          borderColor: 'grey.200',
                        }}
                      />
                    ))}
                  </Box>
                ))}
              </Box>
            </Box>
          </Box>
        </CardContent>

        <Divider />

        {/* Actions footer */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 2 }}>
          <Stack direction="row" spacing={1}>
            {status && (
              <IconButton
                size="small"
                onClick={() => handleRecookRecipe(recipe.id)}
                title="Re-cook this recipe"
                color="warning"
              >
                <RefreshIcon fontSize="small" />
              </IconButton>
            )}
            <IconButton
              size="small"
              onClick={() => onViewDetails(recipe)}
              title="Edit this recipe"
            >
              <EditIcon fontSize="small" />
            </IconButton>
            <IconButton size="small">
              <VisibilityOffIcon fontSize="small" />
            </IconButton>
            <IconButton size="small" onClick={() => onDelete(recipe.id)}>
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Stack>
          <Typography
            variant="body1"
            onClick={() => onViewDetails(recipe)}
            sx={{
              fontWeight: 600,
              textDecoration: 'underline',
              color: 'text.primary',
              cursor: 'pointer',
              '&:hover': { color: 'primary.main' },
            }}
          >
            View Details
          </Typography>
        </Box>
      </Card>
    );
  };

  return (
    <Box sx={{ bgcolor: 'grey.50', minHeight: '100vh' }}>
      {/* Header */}
      <Paper elevation={0} sx={{ borderBottom: 1, borderColor: 'divider', bgcolor: 'white' }}>
        <Container maxWidth="xl" sx={{ py: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box
              sx={{
                width: 40,
                height: 40,
                bgcolor: 'black',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontWeight: 'bold',
              }}
            >
              N
            </Box>
            <Typography variant="h6" fontWeight={600}>
              Recipe Manager
            </Typography>
            <Box sx={{ flexGrow: 1 }} />
            <Button
              variant="outlined"
              color="error"
              onClick={handleClearAllOutfits}
              disabled={recipeStatuses.size === 0}
              sx={{ mr: 1 }}
            >
              Clear All Outfits
            </Button>
            <Button
              variant="outlined"
              color="info"
              startIcon={<DownloadIcon />}
              onClick={handleExportRecipes}
              disabled={recipes.length === 0}
              sx={{ mr: 1 }}
            >
              Export Recipes
            </Button>
            <Button
              variant="outlined"
              color="warning"
              startIcon={<CleaningServicesIcon />}
              href="/recipes/cleanup"
              sx={{ mr: 1 }}
            >
              Cleanup Storage
            </Button>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              endIcon={<KeyboardArrowDownIcon />}
              onClick={(e) => setNewRecipeAnchor(e.currentTarget)}
            >
              New Recipe
            </Button>
            <Menu
              anchorEl={newRecipeAnchor}
              open={Boolean(newRecipeAnchor)}
              onClose={() => setNewRecipeAnchor(null)}
              anchorOrigin={{
                vertical: 'bottom',
                horizontal: 'right',
              }}
              transformOrigin={{
                vertical: 'top',
                horizontal: 'right',
              }}
            >
              <MenuItem
                onClick={() => {
                  setNewRecipeAnchor(null);
                  router.push('/recipes/outfit/new');
                }}
              >
                Manual Outfit Recipe Builder
              </MenuItem>
              <MenuItem
                onClick={() => {
                  setNewRecipeAnchor(null);
                  router.push('/vision-import');
                }}
              >
                Vision Import
              </MenuItem>
              <MenuItem
                onClick={() => {
                  setNewRecipeAnchor(null);
                  router.push('/lifestyle-scan');
                }}
              >
                Lifestyle Scanner
              </MenuItem>
            </Menu>
          </Box>
        </Container>
      </Paper>

      {/* Tabs */}
      <Paper elevation={0} sx={{ borderBottom: 1, borderColor: 'divider', bgcolor: 'white' }}>
        <Container maxWidth="xl">
          <Tabs value={activeTab} onChange={handleTabChange}>
            <Tab label="All Recipes" value="all" />
            <Tab label="Campaign Recipes" value="campaign" disabled />
            <Tab label="Outfit Recipes" value="outfit" />
            <Tab label="Trend Recipes" value="trend" disabled />
          </Tabs>
        </Container>
      </Paper>

      {/* Content */}
      <Container maxWidth="xl" sx={{ py: 4 }}>
        {/* Quick Stats */}
        <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
          <Card sx={{ flex: 1 }}>
            <CardContent>
              <Typography variant="caption" color="text.secondary">
                Total Recipes
              </Typography>
              <Typography variant="h4">{recipes.length}</Typography>
            </CardContent>
          </Card>
          <Card sx={{ flex: 1 }}>
            <CardContent>
              <Typography variant="caption" color="text.secondary">
                AI-Generated
              </Typography>
              <Typography variant="h4">
                {recipes.filter(r => r.source === 'ai-vision').length}
              </Typography>
            </CardContent>
          </Card>
          <Card sx={{ flex: 1 }}>
            <CardContent>
              <Typography variant="caption" color="text.secondary">
                Manual
              </Typography>
              <Typography variant="h4">
                {recipes.filter(r => !r.source || r.source === 'manual').length}
              </Typography>
            </CardContent>
          </Card>
          <Card sx={{ flex: 1 }}>
            <CardContent>
              <Typography variant="caption" color="text.secondary">
                Womenswear
              </Typography>
              <Typography variant="h4">
                {recipes.filter(r => r.department === 'Womenswear').length}
              </Typography>
            </CardContent>
          </Card>
          <Card sx={{ flex: 1 }}>
            <CardContent>
              <Typography variant="caption" color="text.secondary">
                Menswear
              </Typography>
              <Typography variant="h4">
                {recipes.filter(r => r.department === 'Menswear').length}
              </Typography>
            </CardContent>
          </Card>
        </Box>

        {/* Search and Filters */}
        <Paper sx={{ p: 3, mb: 3 }}>
          {/* Search Bar */}
          <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
            <TextField
              fullWidth
              placeholder="Search recipes by title..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(0); // Reset to first page on search
              }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
            />
            {activeFilterCount > 0 && (
              <Button
                variant="outlined"
                onClick={handleClearFilters}
                startIcon={<CloseIcon />}
                sx={{ minWidth: 140 }}
              >
                Clear ({activeFilterCount})
              </Button>
            )}
          </Box>

          {/* Filter Section Title */}
          <Typography variant="body2" fontWeight={600} sx={{ mb: 2 }}>
            {activeTab === 'all' ? 'All Recipe Filters' :
             activeTab === 'outfit' ? 'Outfit Recipe Filters' :
             activeTab === 'campaign' ? 'Campaign Recipe Filters' :
             'Trend Recipe Filters'}
          </Typography>

          {/* Results Count */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="caption" color="text.secondary">
              {filteredRecipes.length} {filteredRecipes.length === 1 ? 'recipe' : 'recipes'} found
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Showing {paginatedRecipes.length} of {filteredRecipes.length}
            </Typography>
          </Box>

          {/* Filter Dropdowns */}
          <Grid container spacing={2} sx={{ mb: 2 }}>
            <Grid item xs={2.4}>
              <FormControl fullWidth size="small">
                <InputLabel>Slot Count</InputLabel>
                <Select
                  label="Slot Count"
                  value={slotCountFilter}
                  onChange={(e) => {
                    setSlotCountFilter(e.target.value);
                    setPage(0);
                  }}
                >
                  <MenuItem value="">All</MenuItem>
                  <MenuItem value="4">4 items</MenuItem>
                  <MenuItem value="5">5 items</MenuItem>
                  <MenuItem value="6">6 items</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={2.4}>
              <FormControl fullWidth size="small">
                <InputLabel>Department</InputLabel>
                <Select
                  label="Department"
                  value={departmentFilter}
                  onChange={(e) => {
                    setDepartmentFilter(e.target.value);
                    setPage(0);
                  }}
                >
                  <MenuItem value="">All</MenuItem>
                  <MenuItem value="Womenswear">Womenswear</MenuItem>
                  <MenuItem value="Menswear">Menswear</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={2.4}>
              <FormControl fullWidth size="small">
                <InputLabel>Season</InputLabel>
                <Select
                  label="Season"
                  value={seasonFilter}
                  onChange={(e) => {
                    setSeasonFilter(e.target.value);
                    setPage(0);
                  }}
                >
                  <MenuItem value="">All</MenuItem>
                  <MenuItem value="All Season">All Season</MenuItem>
                  <MenuItem value="Spring">Spring</MenuItem>
                  <MenuItem value="Summer">Summer</MenuItem>
                  <MenuItem value="Fall">Fall</MenuItem>
                  <MenuItem value="Winter">Winter</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={2.4}>
              <FormControl fullWidth size="small">
                <InputLabel>Source</InputLabel>
                <Select
                  label="Source"
                  value={sourceFilter}
                  onChange={(e) => {
                    setSourceFilter(e.target.value);
                    setPage(0);
                  }}
                >
                  <MenuItem value="">All</MenuItem>
                  <MenuItem value="manual">Manual</MenuItem>
                  <MenuItem value="ai-vision">AI-Generated</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={2.4}>
              <FormControl fullWidth size="small">
                <InputLabel>Sort By</InputLabel>
                <Select
                  label="Sort By"
                  value={sortBy}
                  onChange={(e) => {
                    setSortBy(e.target.value);
                    setPage(0);
                  }}
                >
                  <MenuItem value="newest">Newest First</MenuItem>
                  <MenuItem value="oldest">Oldest First</MenuItem>
                  <MenuItem value="a-z">A → Z</MenuItem>
                  <MenuItem value="z-a">Z → A</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </Paper>

        {/* Recipe Grid */}
        {paginatedRecipes.length > 0 ? (
          <>
            <Grid container spacing={3}>
              {paginatedRecipes.map((recipe) => (
                <Grid item xs={12} md={6} lg={4} key={recipe.id}>
                  {activeTab === 'outfit' ? (
                    <DetailedOutfitCard recipe={recipe} onViewDetails={handleViewDetails} onDelete={handleDeleteRecipe} />
                  ) : (
                    <MinimalRecipeCard recipe={recipe} onViewDetails={handleViewDetails} onDelete={handleDeleteRecipe} />
                  )}
                </Grid>
              ))}
            </Grid>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
                <Pagination
                  count={totalPages}
                  page={page + 1}
                  onChange={(_event, value) => setPage(value - 1)}
                  color="primary"
                  size="large"
                  showFirstButton
                  showLastButton
                />
              </Box>
            )}
          </>
        ) : (
          <Paper sx={{ p: 8, textAlign: 'center' }}>
            <Typography variant="body1" color="text.secondary">
              No recipes found
            </Typography>
            {activeFilterCount > 0 && (
              <Button
                variant="text"
                onClick={handleClearFilters}
                sx={{ mt: 2 }}
              >
                Clear all filters
              </Button>
            )}
          </Paper>
        )}
      </Container>

      {/* Recipe Detail Modal */}
      <RecipeDetailModal
        open={modalOpen}
        onClose={handleCloseModal}
        recipe={selectedRecipe}
        recipeStatus={selectedRecipeStatus}
        onDelete={handleDeleteRecipe}
      />
    </Box>
  );
}
