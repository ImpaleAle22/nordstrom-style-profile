'use client';

/**
 * Outfit Tagging V2 - Admin UI
 *
 * Product-based batch builder for v2 tagging pipeline with:
 * - Filter by product characteristics (colors, materials, patterns, types)
 * - Balanced sampling by product attributes
 * - Run controls (dry-run/commit/selective-commit)
 * - Distribution testing across product categories
 * - Progress tracking
 */

import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  Alert,
  LinearProgress,
  Chip,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Stack,
  FormControlLabel,
  Checkbox,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Card,
  CardContent,
  Divider,
} from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import RefreshIcon from '@mui/icons-material/Refresh';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import FilterListIcon from '@mui/icons-material/FilterList';

export default function OutfitTaggingV2Page() {
  // State
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [progress, setProgress] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // Filter State
  const [filters, setFilters] = useState({
    productTypes: [] as string[],
    colors: [] as string[],
    materials: [] as string[],
    patterns: [] as string[],
    denimWashes: [] as string[],
    department: 'all' as 'all' | 'womens' | 'mens',
    excludeTagged: false,
  });

  // Available product values (loaded from database)
  const [availableValues, setAvailableValues] = useState({
    productTypes: [] as string[],
    colors: [] as string[],
    materials: [] as string[],
    patterns: [] as string[],
    denimWashes: [] as string[],
  });

  // Run Controls State
  const [runControls, setRunControls] = useState({
    mode: 'dry-run' as 'dry-run' | 'commit' | 'selective-commit',
    batchSize: 10,
    balancedBy: 'none' as 'none' | 'color' | 'productType' | 'pattern' | 'denimWash' | 'material',
    samplesPerGroup: 20,
  });

  // Load product values on mount
  useEffect(() => {
    loadProductValues();
  }, []);

  // Poll for progress updates
  useEffect(() => {
    if (!running || !sessionId) return;

    const interval = setInterval(async () => {
      try {
        const response = await fetch(`/api/admin/tagging-v2/run-batch?sessionId=${sessionId}`);
        const data = await response.json();

        if (data.progress) {
          setProgress(data.progress);

          // Stop polling if complete or error
          if (data.progress.phase === 'complete' || data.progress.phase === 'error') {
            setRunning(false);
          }
        }
      } catch (err) {
        console.error('Error polling progress:', err);
      }
    }, 2000); // Poll every 2 seconds

    return () => clearInterval(interval);
  }, [running, sessionId]);

  const loadProductValues = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/tagging-v2/product-values');
      const data = await response.json();

      if (response.ok) {
        setAvailableValues(data);
        console.log('Loaded product values:', data);
      } else {
        setError(data.error || 'Failed to load product values');
      }
    } catch (err) {
      console.error('Error loading product values:', err);
      setError('Failed to load product values');
    } finally {
      setLoading(false);
    }
  };

  const handleRunBatch = async () => {
    console.log('🚀 handleRunBatch called');
    console.log('Filters:', filters);
    console.log('Run Controls:', runControls);

    setRunning(true);
    setProgress(null);
    setError(null);

    try {
      console.log('📡 Sending POST request to /api/admin/tagging-v2/run-batch');
      const response = await fetch('/api/admin/tagging-v2/run-batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filters,
          runControls,
        }),
      });
      console.log('📥 Response status:', response.status);

      const data = await response.json();
      console.log('📥 Response data:', data);

      if (response.ok) {
        console.log('✅ Batch started successfully');
        setSessionId(data.sessionId);
        setProgress(data.progress);
      } else {
        console.error('❌ Server error:', data);
        setError(data.error || 'Failed to start batch');
        setRunning(false);
      }
    } catch (err) {
      console.error('❌ Error starting batch:', err);
      setError(`Failed to start batch: ${err instanceof Error ? err.message : String(err)}`);
      setRunning(false);
    }
  };

  const handleBatchSizeChange = (value: string) => {
    const num = parseInt(value);
    setRunControls({
      ...runControls,
      batchSize: isNaN(num) ? 1 : Math.max(1, Math.min(1000, num))
    });
  };

  const handleSamplesPerGroupChange = (value: string) => {
    const num = parseInt(value);
    setRunControls({
      ...runControls,
      samplesPerGroup: isNaN(num) ? 1 : Math.max(1, Math.min(100, num))
    });
  };

  const progressPercent = progress?.percent || 0;

  if (loading) {
    return (
      <Box sx={{ p: 4 }}>
        <Typography>Loading product values...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 4 }}>
      {/* Header */}
      <Typography variant="h4" gutterBottom>
        Outfit Tagging v2
      </Typography>
      <Typography variant="body2" color="text.secondary" gutterBottom sx={{ mb: 3 }}>
        Product-based batch builder: Test marker-evidence classification across diverse product characteristics
      </Typography>

      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Product-Based Filters */}
      <Accordion defaultExpanded>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Stack direction="row" spacing={1} alignItems="center">
            <FilterListIcon />
            <Typography>Product-Based Batch Selection</Typography>
          </Stack>
        </AccordionSummary>
        <AccordionDetails>
          <Grid container spacing={2}>
            {/* Product Types */}
            <Grid item xs={12}>
              <Typography variant="subtitle2" gutterBottom>
                Product Types
              </Typography>
              <FormControl fullWidth size="small">
                <InputLabel>Select Product Types</InputLabel>
                <Select
                  multiple
                  value={filters.productTypes}
                  label="Select Product Types"
                  onChange={(e) => setFilters({ ...filters, productTypes: e.target.value as string[] })}
                  renderValue={(selected) => (
                    <Stack direction="row" spacing={0.5} flexWrap="wrap">
                      {selected.map((value) => (
                        <Chip key={value} label={value} size="small" />
                      ))}
                    </Stack>
                  )}
                >
                  {availableValues.productTypes.map((type) => (
                    <MenuItem key={type} value={type}>
                      <Checkbox checked={filters.productTypes.includes(type)} />
                      {type}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                Find outfits containing these product types
              </Typography>
            </Grid>

            {/* Colors */}
            <Grid item xs={12}>
              <Typography variant="subtitle2" gutterBottom>
                Colors
              </Typography>
              <FormControl fullWidth size="small">
                <InputLabel>Select Colors</InputLabel>
                <Select
                  multiple
                  value={filters.colors}
                  label="Select Colors"
                  onChange={(e) => setFilters({ ...filters, colors: e.target.value as string[] })}
                  renderValue={(selected) => (
                    <Stack direction="row" spacing={0.5} flexWrap="wrap">
                      {selected.map((value) => (
                        <Chip key={value} label={value} size="small" />
                      ))}
                    </Stack>
                  )}
                >
                  {availableValues.colors.map((color) => (
                    <MenuItem key={color} value={color}>
                      <Checkbox checked={filters.colors.includes(color)} />
                      {color}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                Find outfits with items in these colors
              </Typography>
            </Grid>

            {/* Materials */}
            <Grid item xs={12}>
              <Typography variant="subtitle2" gutterBottom>
                Materials
              </Typography>
              <FormControl fullWidth size="small">
                <InputLabel>Select Materials</InputLabel>
                <Select
                  multiple
                  value={filters.materials}
                  label="Select Materials"
                  onChange={(e) => setFilters({ ...filters, materials: e.target.value as string[] })}
                  renderValue={(selected) => (
                    <Stack direction="row" spacing={0.5} flexWrap="wrap">
                      {selected.map((value) => (
                        <Chip key={value} label={value} size="small" />
                      ))}
                    </Stack>
                  )}
                >
                  {availableValues.materials.map((material) => (
                    <MenuItem key={material} value={material}>
                      <Checkbox checked={filters.materials.includes(material)} />
                      {material}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                Find outfits with items made from these materials
              </Typography>
            </Grid>

            {/* Patterns */}
            <Grid item xs={12}>
              <Typography variant="subtitle2" gutterBottom>
                Patterns
              </Typography>
              <FormControl fullWidth size="small">
                <InputLabel>Select Patterns</InputLabel>
                <Select
                  multiple
                  value={filters.patterns}
                  label="Select Patterns"
                  onChange={(e) => setFilters({ ...filters, patterns: e.target.value as string[] })}
                  renderValue={(selected) => (
                    <Stack direction="row" spacing={0.5} flexWrap="wrap">
                      {selected.map((value) => (
                        <Chip key={value} label={value} size="small" />
                      ))}
                    </Stack>
                  )}
                >
                  {availableValues.patterns.map((pattern) => (
                    <MenuItem key={pattern} value={pattern}>
                      <Checkbox checked={filters.patterns.includes(pattern)} />
                      {pattern}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                Find outfits with patterned items
              </Typography>
            </Grid>

            {/* Denim Washes */}
            <Grid item xs={12}>
              <Typography variant="subtitle2" gutterBottom>
                Denim Washes (Specific)
              </Typography>
              <FormControl fullWidth size="small">
                <InputLabel>Select Denim Washes</InputLabel>
                <Select
                  multiple
                  value={filters.denimWashes}
                  label="Select Denim Washes"
                  onChange={(e) => setFilters({ ...filters, denimWashes: e.target.value as string[] })}
                  renderValue={(selected) => (
                    <Stack direction="row" spacing={0.5} flexWrap="wrap">
                      {selected.map((value) => (
                        <Chip key={value} label={value} size="small" />
                      ))}
                    </Stack>
                  )}
                >
                  {availableValues.denimWashes.map((wash) => (
                    <MenuItem key={wash} value={wash}>
                      <Checkbox checked={filters.denimWashes.includes(wash)} />
                      {wash}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                Find outfits with denim in specific washes
              </Typography>
            </Grid>

            <Grid item xs={12}>
              <Divider sx={{ my: 1 }} />
            </Grid>

            {/* Department */}
            <Grid item xs={12} md={6}>
              <FormControl fullWidth size="small">
                <InputLabel>Department</InputLabel>
                <Select
                  value={filters.department}
                  label="Department"
                  onChange={(e) => setFilters({ ...filters, department: e.target.value as any })}
                >
                  <MenuItem value="all">All Departments</MenuItem>
                  <MenuItem value="womens">Womens</MenuItem>
                  <MenuItem value="mens">Mens</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            {/* Exclude Already Tagged */}
            <Grid item xs={12} md={6}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={filters.excludeTagged}
                    onChange={(e) => setFilters({ ...filters, excludeTagged: e.target.checked })}
                  />
                }
                label="Exclude outfits already tagged with v2"
              />
            </Grid>
          </Grid>
        </AccordionDetails>
      </Accordion>

      {/* Run Controls */}
      <Paper sx={{ p: 3, mt: 2 }}>
        <Typography variant="h6" gutterBottom>
          Run Controls
        </Typography>

        <Grid container spacing={2} sx={{ mt: 1 }}>
          {/* Mode */}
          <Grid item xs={12} md={4}>
            <FormControl fullWidth>
              <InputLabel>Mode</InputLabel>
              <Select
                value={runControls.mode}
                label="Mode"
                onChange={(e) => setRunControls({ ...runControls, mode: e.target.value as any })}
              >
                <MenuItem value="dry-run">Dry-Run (JSON file only)</MenuItem>
                <MenuItem value="commit">Commit (Write to Supabase)</MenuItem>
                <MenuItem value="selective-commit">Selective-Commit</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          {/* Batch Size */}
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              type="number"
              label="Batch Size"
              value={runControls.batchSize}
              onChange={(e) => handleBatchSizeChange(e.target.value)}
              inputProps={{ min: 1, max: 1000 }}
            />
          </Grid>

          {/* Balanced Sampling Options */}
          <Grid item xs={12}>
            <Typography variant="subtitle2" gutterBottom sx={{ mt: 1 }}>
              Balanced Sampling
            </Typography>
          </Grid>

          <Grid item xs={12} md={6}>
            <FormControl fullWidth>
              <InputLabel>Balance By</InputLabel>
              <Select
                value={runControls.balancedBy}
                label="Balance By"
                onChange={(e) => setRunControls({ ...runControls, balancedBy: e.target.value as any })}
              >
                <MenuItem value="none">No Balancing (Random Sample)</MenuItem>
                <MenuItem value="color">Color (N per color)</MenuItem>
                <MenuItem value="productType">Product Type (N per type)</MenuItem>
                <MenuItem value="pattern">Pattern (N per pattern)</MenuItem>
                <MenuItem value="denimWash">Denim Wash (N per wash)</MenuItem>
                <MenuItem value="material">Material (N per material)</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              type="number"
              label="Samples Per Group"
              value={runControls.samplesPerGroup}
              onChange={(e) => handleSamplesPerGroupChange(e.target.value)}
              inputProps={{ min: 1, max: 100 }}
              disabled={runControls.balancedBy === 'none'}
              helperText={
                runControls.balancedBy !== 'none'
                  ? `Get ${runControls.samplesPerGroup} outfits from each ${runControls.balancedBy} group`
                  : 'Enable balanced sampling to use'
              }
            />
          </Grid>

          {runControls.balancedBy !== 'none' && (
            <Grid item xs={12}>
              <Alert severity="info">
                Example: If you select "Color" with 20 samples, you'll get 20 outfits with red items, 20 with blue items, etc. Total batch size may be larger than specified.
              </Alert>
            </Grid>
          )}
        </Grid>

        {runControls.mode === 'commit' && (
          <Alert severity="warning" sx={{ mt: 2 }}>
            ⚠️ COMMIT mode will overwrite attributes in Supabase. The original attributes block is cleared before tagging.
          </Alert>
        )}

        {/* Run Button */}
        <Stack direction="row" spacing={2} sx={{ mt: 3 }}>
          <Button
            variant="contained"
            size="large"
            startIcon={<PlayArrowIcon />}
            onClick={handleRunBatch}
            disabled={running}
          >
            Run Batch ({runControls.batchSize} outfits)
          </Button>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={loadProductValues}
            disabled={running}
          >
            Refresh Values
          </Button>
        </Stack>

        {/* Progress */}
        {progress && (
          <Box sx={{ mt: 3 }}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              {progress.phase === 'querying' && 'Querying database...'}
              {progress.phase === 'tagging' && `Processing: ${progress.current} / ${progress.total}`}
              {progress.phase === 'complete' && 'Complete!'}
              {progress.phase === 'error' && `Error: ${progress.error}`}
            </Typography>
            <LinearProgress variant="determinate" value={progressPercent} />
          </Box>
        )}
      </Paper>

      {/* Results */}
      {progress?.results && (
        <Paper sx={{ p: 3, mt: 2 }}>
          <Typography variant="h6" gutterBottom>
            Batch Results
          </Typography>

          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={6} md={3}>
              <Card>
                <CardContent>
                  <Typography color="text.secondary" variant="body2">
                    Successful
                  </Typography>
                  <Typography variant="h4">{progress.results.successful}</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={6} md={3}>
              <Card>
                <CardContent>
                  <Typography color="text.secondary" variant="body2">
                    Failed
                  </Typography>
                  <Typography variant="h4">{progress.results.failed}</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={6} md={3}>
              <Card>
                <CardContent>
                  <Typography color="text.secondary" variant="body2">
                    Needs Review
                  </Typography>
                  <Typography variant="h4">{progress.results.needsReview}</Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          <Typography variant="subtitle1" sx={{ mt: 3, mb: 1 }}>
            Pillar Distribution
          </Typography>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Pillar</TableCell>
                  <TableCell align="right">Count</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {Object.entries(progress.results.pillarDistribution).map(([pillar, count]) => (
                  <TableRow key={pillar}>
                    <TableCell>{pillar}</TableCell>
                    <TableCell align="right">{count as number}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          <Alert severity="info" sx={{ mt: 2 }}>
            Results written to: <code>tagging-v2-dryrun-results.json</code>
          </Alert>
        </Paper>
      )}

      {/* Footer Links */}
      <Stack direction="row" spacing={2} sx={{ mt: 3 }}>
        <Button variant="text" href="/admin/outfit-tagging-v2/occasion-gaps">
          View Occasion Gaps
        </Button>
        <Button variant="text" href="/admin/outfit-tagging-v2/diff-inspector">
          Diff Inspector
        </Button>
      </Stack>
    </Box>
  );
}
