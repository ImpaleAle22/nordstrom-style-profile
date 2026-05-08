'use client';

/**
 * Attribute Tagging Test Page
 *
 * Flexible control panel for batch tagging outfits:
 * - Sort by newest/oldest/random/diverse
 * - Configure batch size
 * - Filter by department, date range, tagged status
 * - Preview before running
 */

import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  Alert,
  Card,
  CardContent,
  LinearProgress,
  Chip,
  Divider,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Stack,
  FormControlLabel,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import RefreshIcon from '@mui/icons-material/Refresh';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import FilterListIcon from '@mui/icons-material/FilterList';
import { useRouter } from 'next/navigation';

import { getAllOutfits, type StoredOutfit } from '@/lib/supabase-outfit-storage';
import { batchTagOutfits, resetTaggingProgress, clearAllAttributes } from '@/lib/batch-tagger';
import { sampleDiverseOutfits, sampleRandomOutfits } from '@/lib/outfit-sampler';
import type { OutfitAttributes } from '@/lib/outfit-attributes';

interface TaggingBreakdown {
  stylePillars: Record<string, number>;
  vibes: Record<string, number>;
  occasions: Record<string, number>;
  formalityDistribution: Record<string, number>;
  activityContexts: Record<string, number>;
  socialRegisters: Record<string, number>;
  totalTagged: number;
  totalWithAttributes: number;
}

export default function TestTaggingPage() {
  const router = useRouter();

  // State
  const [allOutfits, setAllOutfits] = useState<StoredOutfit[]>([]);
  const [filteredOutfits, setFilteredOutfits] = useState<StoredOutfit[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState<any>(null);
  const [results, setResults] = useState<any>(null);
  const [taggedOutfitIds, setTaggedOutfitIds] = useState<string[]>([]);
  const [taggingBreakdown, setTaggingBreakdown] = useState<TaggingBreakdown | null>(null);

  // Filter/Sort Controls
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'random' | 'diverse'>('newest');
  const [batchSize, setBatchSize] = useState<number>(100);
  const [department, setDepartment] = useState<'all' | 'Womenswear' | 'Menswear'>('all');
  const [taggedStatus, setTaggedStatus] = useState<'all' | 'tagged' | 'untagged'>('untagged');
  const [qualityMin, setQualityMin] = useState<number>(0);
  const [qualityMax, setQualityMax] = useState<number>(100);
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [showPreview, setShowPreview] = useState(false);

  // Load outfits on mount
  useEffect(() => {
    loadOutfits();
  }, []);

  // Update filtered outfits when filters change
  useEffect(() => {
    applyFilters();
  }, [allOutfits, sortBy, batchSize, department, taggedStatus, qualityMin, qualityMax, dateFrom, dateTo]);

  async function loadOutfits() {
    setLoading(true);
    try {
      const outfits = await getAllOutfits();
      setAllOutfits(outfits);
    } catch (error) {
      console.error('Failed to load outfits:', error);
    } finally {
      setLoading(false);
    }
  }

  function applyFilters() {
    let filtered = [...allOutfits];

    // Department filter
    if (department !== 'all') {
      filtered = filtered.filter(o => o.department === department);
    }

    // Tagged status filter
    if (taggedStatus === 'tagged') {
      filtered = filtered.filter(o => o.attributes && Object.keys(o.attributes).length > 0);
    } else if (taggedStatus === 'untagged') {
      filtered = filtered.filter(o => !o.attributes || Object.keys(o.attributes).length === 0);
    }

    // Quality range filter
    filtered = filtered.filter(o => o.qualityScore >= qualityMin && o.qualityScore <= qualityMax);

    // Date range filter
    if (dateFrom) {
      const fromDate = new Date(dateFrom);
      filtered = filtered.filter(o => new Date(o.createdAt) >= fromDate);
    }
    if (dateTo) {
      const toDate = new Date(dateTo);
      toDate.setHours(23, 59, 59, 999); // End of day
      filtered = filtered.filter(o => new Date(o.createdAt) <= toDate);
    }

    // Sort
    if (sortBy === 'newest') {
      filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } else if (sortBy === 'oldest') {
      filtered.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    } else if (sortBy === 'random') {
      filtered = sampleRandomOutfits(filtered, filtered.length);
    } else if (sortBy === 'diverse') {
      filtered = sampleDiverseOutfits(filtered, Math.min(filtered.length, 2000));
    }

    // Apply batch size limit
    filtered = filtered.slice(0, batchSize);

    setFilteredOutfits(filtered);
  }

  function analyzeTaggedOutfits(outfits: StoredOutfit[]): TaggingBreakdown {
    const breakdown: TaggingBreakdown = {
      stylePillars: {},
      vibes: {},
      occasions: {},
      formalityDistribution: { '1.0-2.0': 0, '2.0-3.0': 0, '3.0-4.0': 0, '4.0-5.0': 0, '5.0-6.0': 0 },
      activityContexts: {},
      socialRegisters: {},
      totalTagged: outfits.length,
      totalWithAttributes: 0,
    };

    for (const outfit of outfits) {
      if (!outfit.attributes) continue;

      breakdown.totalWithAttributes++;
      const attrs = outfit.attributes;

      // Style Pillar (single value)
      if (attrs.stylePillar) {
        breakdown.stylePillars[attrs.stylePillar] = (breakdown.stylePillars[attrs.stylePillar] || 0) + 1;
      }

      // Vibes (array)
      if (attrs.vibes) {
        for (const vibe of attrs.vibes) {
          breakdown.vibes[vibe] = (breakdown.vibes[vibe] || 0) + 1;
        }
      }

      // Occasions (array)
      if (attrs.occasions) {
        for (const occasion of attrs.occasions) {
          breakdown.occasions[occasion] = (breakdown.occasions[occasion] || 0) + 1;
        }
      }

      // Formality (numeric 1-6)
      if (attrs.formality) {
        const formality = attrs.formality;
        if (formality >= 1 && formality < 2) breakdown.formalityDistribution['1.0-2.0']++;
        else if (formality >= 2 && formality < 3) breakdown.formalityDistribution['2.0-3.0']++;
        else if (formality >= 3 && formality < 4) breakdown.formalityDistribution['3.0-4.0']++;
        else if (formality >= 4 && formality < 5) breakdown.formalityDistribution['4.0-5.0']++;
        else if (formality >= 5 && formality <= 6) breakdown.formalityDistribution['5.0-6.0']++;
      }

      // Activity Context
      if (attrs.activityContext) {
        breakdown.activityContexts[attrs.activityContext] = (breakdown.activityContexts[attrs.activityContext] || 0) + 1;
      }
      if (attrs.activityContextSecondary) {
        breakdown.activityContexts[attrs.activityContextSecondary] = (breakdown.activityContexts[attrs.activityContextSecondary] || 0) + 1;
      }

      // Social Register
      if (attrs.socialRegister) {
        breakdown.socialRegisters[attrs.socialRegister] = (breakdown.socialRegisters[attrs.socialRegister] || 0) + 1;
      }
    }

    return breakdown;
  }

  async function runTagging() {
    if (filteredOutfits.length === 0) {
      alert('No outfits match the current filters');
      return;
    }

    if (!confirm(`Tag ${filteredOutfits.length} outfits? This may take ${estimateTime(filteredOutfits.length)}.`)) {
      return;
    }

    setRunning(true);
    setProgress({
      phase: 'tagging',
      processed: 0,
      total: filteredOutfits.length,
      percent: 0,
      rulesOnly: 0,
      aiAssisted: 0,
      hybrid: 0,
      errors: 0,
      estimatedTimeRemaining: 'calculating...'
    });

    resetTaggingProgress();

    // Store outfit IDs for later analysis
    const outfitIds = filteredOutfits.map(o => o.outfitId);
    setTaggedOutfitIds(outfitIds);

    try {
      console.log(`Tagging ${filteredOutfits.length} outfits...`);
      const startTime = Date.now();

      const result = await batchTagOutfits({
        resume: false,
        outfitIds: outfitIds,
        onProgress: (p) => setProgress(p)
      });

      const elapsed = (Date.now() - startTime) / 1000;

      setResults({
        success: result.success,
        count: filteredOutfits.length,
        time: elapsed,
        rulesOnly: result.stats.rulesOnly,
        aiAssisted: result.stats.aiAssisted,
        errors: result.stats.errors,
      });

      console.log('Tagging complete!', result);

      // Reload outfits to get fresh attribute data
      const allOutfitsRefreshed = await getAllOutfits();
      const taggedOutfits = allOutfitsRefreshed.filter(o => outfitIds.includes(o.outfitId));

      // Analyze what was tagged
      const breakdown = analyzeTaggedOutfits(taggedOutfits);
      setTaggingBreakdown(breakdown);
      console.log('Tagging breakdown:', breakdown);

      // Reload full list to update tagged status
      await loadOutfits();
    } catch (error) {
      console.error('Tagging error:', error);
      alert('Tagging failed. Check console for details.');
    } finally {
      setRunning(false);
      setProgress(null);
    }
  }

  function estimateTime(count: number): string {
    const seconds = count * 4; // ~4 seconds per outfit average
    if (seconds < 60) return `~${seconds}s`;
    if (seconds < 3600) return `~${Math.round(seconds / 60)} minutes`;
    return `~${(seconds / 3600).toFixed(1)} hours`;
  }

  function exportBreakdown() {
    if (!taggingBreakdown) return;

    const data = {
      timestamp: new Date().toISOString(),
      summary: {
        totalTagged: taggingBreakdown.totalTagged,
        totalWithAttributes: taggingBreakdown.totalWithAttributes,
      },
      breakdown: taggingBreakdown,
      outfitIds: taggedOutfitIds,
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tagging-breakdown-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function applyPreset(preset: 'quick' | 'medium' | 'large' | 'full') {
    switch (preset) {
      case 'quick':
        setBatchSize(100);
        setSortBy('random');
        setTaggedStatus('untagged');
        break;
      case 'medium':
        setBatchSize(500);
        setSortBy('diverse');
        setTaggedStatus('untagged');
        break;
      case 'large':
        setBatchSize(2000);
        setSortBy('diverse');
        setTaggedStatus('untagged');
        break;
      case 'full':
        setBatchSize(999999);
        setSortBy('newest');
        setTaggedStatus('all');
        break;
    }
  }

  if (loading) {
    return (
      <Box sx={{ p: 4, display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <Typography variant="h6" color="text.secondary">Loading outfits...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 4, maxWidth: 1400, mx: 'auto' }}>
      <Typography variant="h4" gutterBottom>
        Batch Tagging Control Panel
      </Typography>
      <Typography variant="body1" color="text.secondary" paragraph>
        Configure filters and sorting to tag specific outfits. Preview before running.
      </Typography>

      {/* Stats Summary */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h4">{allOutfits.length}</Typography>
              <Typography variant="body2" color="text.secondary">Total Outfits</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h4" color="success.main">{allOutfits.filter(o => o.attributes && Object.keys(o.attributes).length > 0).length}</Typography>
              <Typography variant="body2" color="text.secondary">Already Tagged</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h4" color="info.main">{filteredOutfits.length}</Typography>
              <Typography variant="body2" color="text.secondary">Matches Filters</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" color="primary.main">{estimateTime(filteredOutfits.length)}</Typography>
              <Typography variant="body2" color="text.secondary">Estimated Time</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Quick Presets */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>Quick Presets</Typography>
        <Stack direction="row" spacing={2} flexWrap="wrap">
          <Button variant="outlined" onClick={() => applyPreset('quick')}>
            Quick Test (100 random)
          </Button>
          <Button variant="outlined" onClick={() => applyPreset('medium')}>
            Medium Sample (500 diverse)
          </Button>
          <Button variant="outlined" onClick={() => applyPreset('large')}>
            Large Sample (2k diverse)
          </Button>
          <Button variant="outlined" color="error" onClick={() => applyPreset('full')}>
            Full Run (All)
          </Button>
        </Stack>
      </Paper>

      {/* Filter Controls */}
      <Accordion defaultExpanded sx={{ mb: 3 }}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Stack direction="row" spacing={1} alignItems="center">
            <FilterListIcon />
            <Typography variant="h6">Filters & Sorting</Typography>
          </Stack>
        </AccordionSummary>
        <AccordionDetails>
          <Grid container spacing={2}>
            {/* Sort By */}
            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth size="small">
                <InputLabel>Sort By</InputLabel>
                <Select value={sortBy} label="Sort By" onChange={(e) => setSortBy(e.target.value as any)}>
                  <MenuItem value="newest">Newest First</MenuItem>
                  <MenuItem value="oldest">Oldest First</MenuItem>
                  <MenuItem value="random">Random</MenuItem>
                  <MenuItem value="diverse">Diverse Sample</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            {/* Batch Size */}
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                fullWidth
                size="small"
                label="Batch Size"
                type="number"
                value={batchSize}
                onChange={(e) => setBatchSize(Math.max(1, parseInt(e.target.value) || 1))}
                inputProps={{ min: 1, max: 99999 }}
              />
            </Grid>

            {/* Department */}
            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth size="small">
                <InputLabel>Department</InputLabel>
                <Select value={department} label="Department" onChange={(e) => setDepartment(e.target.value as any)}>
                  <MenuItem value="all">All</MenuItem>
                  <MenuItem value="Womenswear">Womenswear</MenuItem>
                  <MenuItem value="Menswear">Menswear</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            {/* Tagged Status */}
            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth size="small">
                <InputLabel>Tagged Status</InputLabel>
                <Select value={taggedStatus} label="Tagged Status" onChange={(e) => setTaggedStatus(e.target.value as any)}>
                  <MenuItem value="all">All</MenuItem>
                  <MenuItem value="tagged">Already Tagged</MenuItem>
                  <MenuItem value="untagged">Not Tagged</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            {/* Quality Range */}
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                fullWidth
                size="small"
                label="Min Quality Score"
                type="number"
                value={qualityMin}
                onChange={(e) => setQualityMin(Math.max(0, Math.min(100, parseInt(e.target.value) || 0)))}
                inputProps={{ min: 0, max: 100 }}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                fullWidth
                size="small"
                label="Max Quality Score"
                type="number"
                value={qualityMax}
                onChange={(e) => setQualityMax(Math.max(0, Math.min(100, parseInt(e.target.value) || 100)))}
                inputProps={{ min: 0, max: 100 }}
              />
            </Grid>

            {/* Date Range */}
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                fullWidth
                size="small"
                label="From Date"
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                fullWidth
                size="small"
                label="To Date"
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
          </Grid>

          <Box sx={{ mt: 2 }}>
            <Button
              size="small"
              onClick={() => {
                setSortBy('newest');
                setBatchSize(100);
                setDepartment('all');
                setTaggedStatus('untagged');
                setQualityMin(0);
                setQualityMax(100);
                setDateFrom('');
                setDateTo('');
              }}
            >
              Reset Filters
            </Button>
          </Box>
        </AccordionDetails>
      </Accordion>

      {/* Progress Display */}
      {progress && running && (
        <Alert severity="info" sx={{ mb: 3 }}>
          <Typography variant="subtitle1" gutterBottom>
            Tagging in Progress...
          </Typography>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
            <Typography variant="body2">
              {progress.processed} / {progress.total} outfits
            </Typography>
            <Typography variant="body2">
              {progress.percent.toFixed(1)}%
            </Typography>
          </Box>
          <LinearProgress variant="determinate" value={progress.percent} sx={{ mb: 2 }} />
          <Stack direction="row" spacing={1} flexWrap="wrap">
            <Chip label={`Rules: ${progress.rulesOnly}`} size="small" />
            <Chip label={`AI: ${progress.aiAssisted}`} size="small" color="secondary" />
            <Chip label={`Hybrid: ${progress.hybrid}`} size="small" color="info" />
            {progress.errors > 0 && (
              <Chip label={`Errors: ${progress.errors}`} size="small" color="error" />
            )}
          </Stack>
          {progress.estimatedTimeRemaining && (
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
              ETA: {progress.estimatedTimeRemaining}
            </Typography>
          )}
        </Alert>
      )}

      {/* Results Display */}
      {results && !running && (
        <>
          <Alert severity="success" sx={{ mb: 3 }}>
            <Typography variant="subtitle1" gutterBottom>
              ✅ Tagging Complete!
            </Typography>
            <Typography variant="body2">
              Tagged {results.count} outfits in {(results.time / 60).toFixed(1)} minutes
            </Typography>
            <Typography variant="body2">
              Rules-only: {results.rulesOnly} ({((results.rulesOnly / results.count) * 100).toFixed(0)}%)
            </Typography>
            <Typography variant="body2">
              AI-assisted: {results.aiAssisted} ({((results.aiAssisted / results.count) * 100).toFixed(0)}%)
            </Typography>
            {results.errors > 0 && (
              <Typography variant="body2" color="error.main">
                Errors: {results.errors}
              </Typography>
            )}
            <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
              <Button
                size="small"
                variant="outlined"
                onClick={() => {
                  setResults(null);
                  setTaggingBreakdown(null);
                  setTaggedOutfitIds([]);
                }}
              >
                Clear Results
              </Button>
            </Stack>
          </Alert>

          {/* Tagging Breakdown */}
          {taggingBreakdown && (
            <Paper sx={{ p: 3, mb: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Box>
                  <Typography variant="h6" gutterBottom>
                    Tagging Summary - What Got Tagged
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {taggingBreakdown.totalWithAttributes} of {taggingBreakdown.totalTagged} outfits successfully tagged
                  </Typography>
                </Box>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={exportBreakdown}
                >
                  Export JSON
                </Button>
              </Box>

              <Grid container spacing={3}>
                {/* Style Pillars */}
                <Grid item xs={12} md={6}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="subtitle1" gutterBottom fontWeight="bold">
                        Style Pillars
                      </Typography>
                      <Stack spacing={1}>
                        {Object.entries(taggingBreakdown.stylePillars)
                          .sort(([, a], [, b]) => b - a)
                          .slice(0, 10)
                          .map(([pillar, count]) => (
                            <Box key={pillar} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <Typography variant="body2">{pillar}</Typography>
                              <Stack direction="row" spacing={1} alignItems="center">
                                <Chip
                                  label={count}
                                  size="small"
                                  color="primary"
                                />
                                <Typography variant="caption" color="text.secondary" sx={{ minWidth: 40, textAlign: 'right' }}>
                                  {((count / taggingBreakdown.totalWithAttributes) * 100).toFixed(0)}%
                                </Typography>
                              </Stack>
                            </Box>
                          ))}
                      </Stack>
                    </CardContent>
                  </Card>
                </Grid>

                {/* Formality Distribution */}
                <Grid item xs={12} md={6}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="subtitle1" gutterBottom fontWeight="bold">
                        Formality Distribution
                      </Typography>
                      <Stack spacing={1}>
                        {Object.entries(taggingBreakdown.formalityDistribution)
                          .map(([range, count]) => (
                            <Box key={range} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <Typography variant="body2">{range}</Typography>
                              <Stack direction="row" spacing={1} alignItems="center">
                                <Chip
                                  label={count}
                                  size="small"
                                  color="info"
                                />
                                <Typography variant="caption" color="text.secondary" sx={{ minWidth: 40, textAlign: 'right' }}>
                                  {((count / taggingBreakdown.totalWithAttributes) * 100).toFixed(0)}%
                                </Typography>
                              </Stack>
                            </Box>
                          ))}
                      </Stack>
                    </CardContent>
                  </Card>
                </Grid>

                {/* Top Occasions */}
                <Grid item xs={12} md={6}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="subtitle1" gutterBottom fontWeight="bold">
                        Top Occasions
                      </Typography>
                      <Stack spacing={1}>
                        {Object.entries(taggingBreakdown.occasions)
                          .sort(([, a], [, b]) => b - a)
                          .slice(0, 10)
                          .map(([occasion, count]) => (
                            <Box key={occasion} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <Typography variant="body2">{occasion}</Typography>
                              <Stack direction="row" spacing={1} alignItems="center">
                                <Chip
                                  label={count}
                                  size="small"
                                  color="success"
                                />
                                <Typography variant="caption" color="text.secondary" sx={{ minWidth: 40, textAlign: 'right' }}>
                                  {((count / taggingBreakdown.totalWithAttributes) * 100).toFixed(0)}%
                                </Typography>
                              </Stack>
                            </Box>
                          ))}
                      </Stack>
                      {Object.keys(taggingBreakdown.occasions).length > 10 && (
                        <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                          +{Object.keys(taggingBreakdown.occasions).length - 10} more occasions
                        </Typography>
                      )}
                    </CardContent>
                  </Card>
                </Grid>

                {/* Top Vibes */}
                <Grid item xs={12} md={6}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="subtitle1" gutterBottom fontWeight="bold">
                        Top Vibes
                      </Typography>
                      <Stack spacing={1}>
                        {Object.entries(taggingBreakdown.vibes)
                          .sort(([, a], [, b]) => b - a)
                          .slice(0, 10)
                          .map(([vibe, count]) => (
                            <Box key={vibe} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <Typography variant="body2">{vibe}</Typography>
                              <Stack direction="row" spacing={1} alignItems="center">
                                <Chip
                                  label={count}
                                  size="small"
                                  color="secondary"
                                />
                                <Typography variant="caption" color="text.secondary" sx={{ minWidth: 40, textAlign: 'right' }}>
                                  {((count / taggingBreakdown.totalWithAttributes) * 100).toFixed(0)}%
                                </Typography>
                              </Stack>
                            </Box>
                          ))}
                      </Stack>
                      {Object.keys(taggingBreakdown.vibes).length > 10 && (
                        <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                          +{Object.keys(taggingBreakdown.vibes).length - 10} more vibes
                        </Typography>
                      )}
                    </CardContent>
                  </Card>
                </Grid>

                {/* Activity Contexts */}
                <Grid item xs={12} md={6}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="subtitle1" gutterBottom fontWeight="bold">
                        Activity Contexts
                      </Typography>
                      <Stack spacing={1}>
                        {Object.entries(taggingBreakdown.activityContexts)
                          .sort(([, a], [, b]) => b - a)
                          .map(([context, count]) => (
                            <Box key={context} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <Typography variant="body2">{context}</Typography>
                              <Stack direction="row" spacing={1} alignItems="center">
                                <Chip
                                  label={count}
                                  size="small"
                                  color="warning"
                                />
                                <Typography variant="caption" color="text.secondary" sx={{ minWidth: 40, textAlign: 'right' }}>
                                  {((count / taggingBreakdown.totalWithAttributes) * 100).toFixed(0)}%
                                </Typography>
                              </Stack>
                            </Box>
                          ))}
                      </Stack>
                    </CardContent>
                  </Card>
                </Grid>

                {/* Social Registers */}
                <Grid item xs={12} md={6}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="subtitle1" gutterBottom fontWeight="bold">
                        Social Registers
                      </Typography>
                      <Stack spacing={1}>
                        {Object.entries(taggingBreakdown.socialRegisters)
                          .sort(([, a], [, b]) => b - a)
                          .map(([register, count]) => (
                            <Box key={register} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <Typography variant="body2">{register}</Typography>
                              <Stack direction="row" spacing={1} alignItems="center">
                                <Chip
                                  label={count}
                                  size="small"
                                  color="error"
                                />
                                <Typography variant="caption" color="text.secondary" sx={{ minWidth: 40, textAlign: 'right' }}>
                                  {((count / taggingBreakdown.totalWithAttributes) * 100).toFixed(0)}%
                                </Typography>
                              </Stack>
                            </Box>
                          ))}
                      </Stack>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            </Paper>
          )}
        </>
      )}

      {/* Action Buttons */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
          <Button
            variant="contained"
            size="large"
            onClick={runTagging}
            disabled={running || filteredOutfits.length === 0}
            startIcon={<PlayArrowIcon />}
          >
            Tag {filteredOutfits.length} Outfits
          </Button>
          <Button
            variant="outlined"
            onClick={() => setShowPreview(!showPreview)}
            disabled={filteredOutfits.length === 0}
          >
            {showPreview ? 'Hide' : 'Show'} Preview ({filteredOutfits.length})
          </Button>
          <Button
            variant="outlined"
            onClick={loadOutfits}
            startIcon={<RefreshIcon />}
            disabled={running}
          >
            Refresh
          </Button>
        </Stack>
      </Paper>

      {/* Preview Section */}
      {showPreview && filteredOutfits.length > 0 && (
        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Preview ({filteredOutfits.length} outfits)
          </Typography>
          <TableContainer sx={{ maxHeight: 400 }}>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell>Recipe</TableCell>
                  <TableCell>Department</TableCell>
                  <TableCell>Quality</TableCell>
                  <TableCell>Created</TableCell>
                  <TableCell>Tagged?</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredOutfits.slice(0, 50).map((outfit) => (
                  <TableRow key={outfit.outfitId}>
                    <TableCell>{outfit.recipeTitle || outfit.recipeId}</TableCell>
                    <TableCell>{outfit.department}</TableCell>
                    <TableCell>{outfit.qualityScore.toFixed(1)}</TableCell>
                    <TableCell>{new Date(outfit.createdAt).toLocaleDateString()}</TableCell>
                    <TableCell>
                      {outfit.attributes && Object.keys(outfit.attributes).length > 0 ? (
                        <Chip label="Yes" color="success" size="small" />
                      ) : (
                        <Chip label="No" color="default" size="small" />
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          {filteredOutfits.length > 50 && (
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
              Showing first 50 of {filteredOutfits.length} outfits
            </Typography>
          )}
        </Paper>
      )}

      {/* Quick Actions */}
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          Other Actions
        </Typography>
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
          <Button
            variant="outlined"
            onClick={() => router.push('/outfit-coverage')}
          >
            Coverage Analysis
          </Button>
          <Button
            variant="outlined"
            onClick={() => router.push('/auto-analysis')}
          >
            🤖 Rule Analysis
          </Button>
          <Button
            variant="outlined"
            onClick={() => router.push('/product-coverage')}
          >
            Product Coverage
          </Button>
          <Button
            variant="outlined"
            onClick={() => {
              resetTaggingProgress();
              setResults(null);
              setTaggingBreakdown(null);
              setTaggedOutfitIds([]);
            }}
          >
            Clear Results
          </Button>
          <Button
            variant="outlined"
            color="error"
            onClick={async () => {
              if (confirm('This will clear ALL outfit attributes. Are you sure?')) {
                const cleared = await clearAllAttributes();
                alert(`Cleared attributes from ${cleared} outfits`);
                await loadOutfits();
              }
            }}
          >
            Clear All Tags
          </Button>
        </Stack>
      </Paper>
    </Box>
  );
}
