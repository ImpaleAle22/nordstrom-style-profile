'use client';

/**
 * Diff Inspector
 *
 * Displays v1 → v2 tagging changes from dry-run results.
 * Shows:
 * - Pillar distribution changes
 * - needsReview rate
 * - Significant pillar changes (e.g., Casual → Streetwear)
 * - Spot-check view (random 20 outfits side-by-side)
 * - "Commit this batch" button for selective-commit
 */

import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Alert,
  Chip,
  Stack,
  Card,
  CardContent,
  Grid,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Divider,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';

interface DiffResult {
  outfitId: string;
  currentAttributes: any;
  proposedAttributes: any;
  diff: {
    stylePillarChanged: boolean;
    subStyleChanged: boolean;
    vibesChanged: boolean;
    occasionsChanged: boolean;
    needsReview: boolean;
  };
}

interface DryRunResult {
  runId: string;
  results: DiffResult[];
}

export default function DiffInspectorPage() {
  const [latestRun, setLatestRun] = useState<DryRunResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [spotCheckSample, setSpotCheckSample] = useState<DiffResult[]>([]);

  useEffect(() => {
    loadLatestRun();
  }, []);

  const loadLatestRun = async () => {
    setLoading(true);
    setError(null);

    try {
      // TODO: Call API route to get latest dry-run
      // For now, mock data
      const mockRun: DryRunResult = {
        runId: '2026-05-13T21:00:00Z',
        results: [
          {
            outfitId: 'ai_h_m_mens_jacket_1',
            currentAttributes: {
              stylePillar: 'Casual',
              subStyle: 'Relaxed',
              vibes: ['Relaxed', 'Effortless'],
              taggerVersion: 'v1',
            },
            proposedAttributes: {
              stylePillar: 'Streetwear',
              subStyle: 'Urban',
              vibes: ['Bold', 'Confident'],
              taggerVersion: 'v2',
            },
            diff: {
              stylePillarChanged: true,
              subStyleChanged: true,
              vibesChanged: true,
              occasionsChanged: false,
              needsReview: false,
            },
          },
          {
            outfitId: 'ai_h_m_womens_dress_2',
            currentAttributes: {
              stylePillar: 'Romantic',
              subStyle: 'Feminine',
              vibes: ['Elegant', 'Fresh'],
              taggerVersion: 'v1',
            },
            proposedAttributes: {
              stylePillar: 'Romantic',
              subStyle: 'Feminine',
              vibes: ['Elegant', 'Fresh', 'Feminine'],
              taggerVersion: 'v2',
            },
            diff: {
              stylePillarChanged: false,
              subStyleChanged: false,
              vibesChanged: true,
              occasionsChanged: false,
              needsReview: false,
            },
          },
        ],
      };

      setLatestRun(mockRun);

      // Random spot-check sample (20 outfits)
      const shuffled = [...mockRun.results].sort(() => 0.5 - Math.random());
      setSpotCheckSample(shuffled.slice(0, Math.min(20, shuffled.length)));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dry-run results');
    } finally {
      setLoading(false);
    }
  };

  const handleCommitBatch = async () => {
    if (!latestRun) return;

    if (!confirm(`Commit ${latestRun.results.length} outfits to Supabase? This will overwrite v1 attributes.`)) {
      return;
    }

    try {
      // TODO: Call API route to run selective-commit with outfit IDs from this run
      alert('Commit successful! (TODO: implement)');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to commit batch');
    }
  };

  if (loading) {
    return (
      <Box sx={{ p: 4 }}>
        <Typography>Loading...</Typography>
      </Box>
    );
  }

  if (!latestRun) {
    return (
      <Box sx={{ p: 4 }}>
        <Alert severity="info">
          No dry-run results found. Run a dry-run batch first.
        </Alert>
        <Button variant="outlined" href="/admin/outfit-tagging-v2" sx={{ mt: 2 }}>
          Back to Batch Builder
        </Button>
      </Box>
    );
  }

  // Calculate summary stats
  const totalOutfits = latestRun.results.length;
  const needsReviewCount = latestRun.results.filter(r => r.diff.needsReview).length;
  const pillarChangedCount = latestRun.results.filter(r => r.diff.stylePillarChanged).length;
  const vibesChangedCount = latestRun.results.filter(r => r.diff.vibesChanged).length;

  // Pillar distribution (v1 → v2 transitions)
  const pillarTransitions: Record<string, number> = {};
  latestRun.results.forEach(r => {
    const v1Pillar = r.currentAttributes?.stylePillar || 'null';
    const v2Pillar = r.proposedAttributes?.stylePillar || 'null';
    const key = `${v1Pillar} → ${v2Pillar}`;
    pillarTransitions[key] = (pillarTransitions[key] || 0) + 1;
  });

  return (
    <Box sx={{ p: 4 }}>
      {/* Header */}
      <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 3 }}>
        <Button
          variant="outlined"
          startIcon={<ArrowBackIcon />}
          href="/admin/outfit-tagging-v2"
        >
          Back
        </Button>
        <Box sx={{ flex: 1 }}>
          <Typography variant="h4" gutterBottom>
            Diff Inspector
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Run ID: {latestRun.runId} • {totalOutfits} outfits
          </Typography>
        </Box>
        <Button
          variant="outlined"
          startIcon={<RefreshIcon />}
          onClick={loadLatestRun}
        >
          Refresh
        </Button>
        <Button
          variant="contained"
          color="primary"
          startIcon={<CheckCircleIcon />}
          onClick={handleCommitBatch}
        >
          Commit This Batch
        </Button>
      </Stack>

      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Summary Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" variant="body2">
                Total Processed
              </Typography>
              <Typography variant="h4">{totalOutfits}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" variant="body2">
                Needs Review
              </Typography>
              <Typography variant="h4">{needsReviewCount}</Typography>
              <Typography variant="body2" color="text.secondary">
                {((needsReviewCount / totalOutfits) * 100).toFixed(1)}%
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" variant="body2">
                Pillar Changed
              </Typography>
              <Typography variant="h4">{pillarChangedCount}</Typography>
              <Typography variant="body2" color="text.secondary">
                {((pillarChangedCount / totalOutfits) * 100).toFixed(1)}%
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" variant="body2">
                Vibes Changed
              </Typography>
              <Typography variant="h4">{vibesChangedCount}</Typography>
              <Typography variant="body2" color="text.secondary">
                {((vibesChangedCount / totalOutfits) * 100).toFixed(1)}%
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Pillar Distribution Table */}
      <Accordion defaultExpanded>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="h6">Pillar Distribution (v1 → v2)</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Transition</TableCell>
                  <TableCell align="right">Count</TableCell>
                  <TableCell align="right">Percentage</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {Object.entries(pillarTransitions)
                  .sort((a, b) => b[1] - a[1])
                  .map(([transition, count]) => {
                    const [v1, v2] = transition.split(' → ');
                    const isChanged = v1 !== v2;
                    return (
                      <TableRow key={transition}>
                        <TableCell>
                          <Stack direction="row" spacing={1} alignItems="center">
                            <Chip label={v1} size="small" variant="outlined" />
                            <Typography>→</Typography>
                            <Chip
                              label={v2}
                              size="small"
                              color={isChanged ? 'warning' : 'default'}
                            />
                          </Stack>
                        </TableCell>
                        <TableCell align="right">{count}</TableCell>
                        <TableCell align="right">
                          {((count / totalOutfits) * 100).toFixed(1)}%
                        </TableCell>
                      </TableRow>
                    );
                  })}
              </TableBody>
            </Table>
          </TableContainer>
        </AccordionDetails>
      </Accordion>

      {/* Spot Check View */}
      <Accordion sx={{ mt: 2 }}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="h6">
            Spot Check ({spotCheckSample.length} random outfits)
          </Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Stack spacing={2}>
            {spotCheckSample.map((result, idx) => (
              <Paper key={idx} sx={{ p: 2 }} variant="outlined">
                <Typography variant="subtitle2" gutterBottom sx={{ fontFamily: 'monospace' }}>
                  {result.outfitId}
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      v1 (Current)
                    </Typography>
                    <Typography variant="body2">
                      <strong>Pillar:</strong> {result.currentAttributes?.stylePillar || 'null'}
                    </Typography>
                    <Typography variant="body2">
                      <strong>Sub:</strong> {result.currentAttributes?.subStyle || 'null'}
                    </Typography>
                    <Typography variant="body2">
                      <strong>Vibes:</strong> {result.currentAttributes?.vibes?.join(', ') || 'none'}
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      v2 (Proposed)
                    </Typography>
                    <Typography variant="body2">
                      <strong>Pillar:</strong> {result.proposedAttributes?.stylePillar || 'null'}
                      {result.diff.stylePillarChanged && <Chip label="CHANGED" size="small" color="warning" sx={{ ml: 1 }} />}
                    </Typography>
                    <Typography variant="body2">
                      <strong>Sub:</strong> {result.proposedAttributes?.subStyle || 'null'}
                    </Typography>
                    <Typography variant="body2">
                      <strong>Vibes:</strong> {result.proposedAttributes?.vibes?.join(', ') || 'none'}
                      {result.diff.vibesChanged && <Chip label="CHANGED" size="small" color="info" sx={{ ml: 1 }} />}
                    </Typography>
                  </Grid>
                </Grid>
              </Paper>
            ))}
          </Stack>
        </AccordionDetails>
      </Accordion>
    </Box>
  );
}
