'use client';

/**
 * Attribute Coverage Analysis Page
 *
 * Visualizes outfit inventory coverage across Style Pillars, Vibes, and Occasions.
 * Identifies gaps and generates recommendations for next bulk cook session.
 */

import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  LinearProgress,
  Button,
  Chip,
  Card,
  CardContent,
  Divider,
  Alert,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Accordion,
  AccordionSummary,
  AccordionDetails
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import DownloadIcon from '@mui/icons-material/Download';
import RefreshIcon from '@mui/icons-material/Refresh';

import { calculateCoverage, identifyGaps, exportCoverageToCSV } from '@/lib/attribute-analysis';
import type { CoverageStats, GapReport } from '@/lib/attribute-analysis';
import { STYLE_PILLARS, VIBES, OCCASIONS } from '@/lib/outfit-attributes';
import type { OccasionCategory } from '@/lib/outfit-attributes';

export default function AttributeCoveragePage() {
  const [stats, setStats] = useState<CoverageStats | null>(null);
  const [gaps, setGaps] = useState<GapReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadCoverageStats();
  }, []);

  async function loadCoverageStats() {
    setLoading(true);
    setError(null);

    try {
      const coverageStats = await calculateCoverage();
      const gapReport = identifyGaps(coverageStats);

      setStats(coverageStats);
      setGaps(gapReport);
    } catch (err: any) {
      console.error('Error loading coverage stats:', err);
      setError(err.message || 'Failed to load coverage statistics');
    } finally {
      setLoading(false);
    }
  }

  function handleExportCSV() {
    if (!stats) return;

    const csv = exportCoverageToCSV(stats);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `outfit-coverage-${Date.now()}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  function handleExportGaps() {
    if (!gaps) return;

    const json = JSON.stringify(gaps, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `gap-report-${Date.now()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  if (loading) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <CircularProgress size={60} />
        <Typography variant="h6" sx={{ mt: 2 }}>
          Analyzing outfit attributes...
        </Typography>
        <Typography variant="body2" color="text.secondary">
          This may take a moment for large inventories
        </Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 4 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
        <Button variant="contained" onClick={loadCoverageStats} startIcon={<RefreshIcon />}>
          Retry
        </Button>
      </Box>
    );
  }

  if (!stats || !gaps) {
    return (
      <Box sx={{ p: 4 }}>
        <Alert severity="info">
          No coverage data available. Tag outfits first.
        </Alert>
      </Box>
    );
  }

  const taggedPercent = ((stats.tagged / stats.total) * 100).toFixed(1);

  return (
    <Box sx={{ p: 4 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <div>
          <Typography variant="h4" gutterBottom>
            Outfit Attribute Coverage
          </Typography>
          <Typography variant="body1" color="text.secondary">
            {stats.total.toLocaleString()} total outfits | {stats.tagged.toLocaleString()} tagged ({taggedPercent}%)
          </Typography>
        </div>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="outlined"
            onClick={loadCoverageStats}
            startIcon={<RefreshIcon />}
          >
            Refresh
          </Button>
          <Button
            variant="outlined"
            onClick={handleExportCSV}
            startIcon={<DownloadIcon />}
          >
            Export CSV
          </Button>
          <Button
            variant="outlined"
            onClick={handleExportGaps}
            startIcon={<DownloadIcon />}
          >
            Export Gaps
          </Button>
        </Box>
      </Box>

      {/* Recommendations */}
      {gaps.recommendations.length > 0 && (
        <Alert severity="info" sx={{ mb: 4 }}>
          <Typography variant="subtitle2" gutterBottom>
            Recommendations for Next Bulk Cook:
          </Typography>
          <ul style={{ margin: 0, paddingLeft: 20 }}>
            {gaps.recommendations.map((rec, idx) => (
              <li key={idx}>
                <Typography variant="body2" dangerouslySetInnerHTML={{ __html: rec }} />
              </li>
            ))}
          </ul>
        </Alert>
      )}

      {/* Style Pillar Distribution */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Style Pillar Distribution
        </Typography>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          Each outfit should have exactly ONE Style Pillar
        </Typography>
        <Divider sx={{ my: 2 }} />

        <Grid container spacing={2}>
          {STYLE_PILLARS.map(pillar => {
            const count = stats.byStylePillar[pillar];
            const percent = ((count / stats.tagged) * 100).toFixed(1);
            const isUnderrepresented = gaps.underrepresentedPillars.some(g => g.pillar === pillar);

            return (
              <Grid item xs={12} key={pillar}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Typography variant="body2" sx={{ minWidth: 150 }}>
                    {pillar}
                    {isUnderrepresented && (
                      <Chip label="GAP" size="small" color="warning" sx={{ ml: 1 }} />
                    )}
                  </Typography>
                  <Box sx={{ flexGrow: 1 }}>
                    <LinearProgress
                      variant="determinate"
                      value={Math.min(parseFloat(percent), 100)}
                      sx={{ height: 8, borderRadius: 4 }}
                      color={isUnderrepresented ? 'warning' : 'primary'}
                    />
                  </Box>
                  <Typography variant="body2" sx={{ minWidth: 100, textAlign: 'right' }}>
                    {percent}% ({count.toLocaleString()})
                  </Typography>
                </Box>
              </Grid>
            );
          })}
        </Grid>
      </Paper>

      {/* Vibe Distribution */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Vibe Distribution
        </Typography>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          Outfits can have multiple vibes (1-3 typical)
        </Typography>
        <Divider sx={{ my: 2 }} />

        <Grid container spacing={1}>
          {VIBES.map(vibe => {
            const count = stats.byVibe[vibe];
            const percent = ((count / stats.tagged) * 100).toFixed(1);
            const isUnderrepresented = gaps.underrepresentedVibes.some(g => g.vibe === vibe);

            return (
              <Grid item xs={12} sm={6} key={vibe}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="body2" sx={{ minWidth: 120, fontSize: '0.875rem' }}>
                    {vibe}
                    {isUnderrepresented && (
                      <Chip label="!" size="small" color="warning" sx={{ ml: 0.5, fontSize: '0.7rem', height: 16 }} />
                    )}
                  </Typography>
                  <Box sx={{ flexGrow: 1 }}>
                    <LinearProgress
                      variant="determinate"
                      value={Math.min(parseFloat(percent), 100)}
                      sx={{ height: 6, borderRadius: 3 }}
                      color={isUnderrepresented ? 'warning' : 'primary'}
                    />
                  </Box>
                  <Typography variant="body2" sx={{ minWidth: 80, textAlign: 'right', fontSize: '0.875rem' }}>
                    {percent}% ({count})
                  </Typography>
                </Box>
              </Grid>
            );
          })}
        </Grid>
      </Paper>

      {/* Occasion Distribution by Category */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Occasion Coverage by Category
        </Typography>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          Outfits can serve multiple occasions
        </Typography>
        <Divider sx={{ my: 2 }} />

        {Object.entries(OCCASIONS).map(([category, occasions]) => {
          const categoryCount = stats.byOccasionCategory[category as OccasionCategory];
          const categoryPercent = ((categoryCount / stats.tagged) * 100).toFixed(1);

          return (
            <Accordion key={category} sx={{ mb: 1 }}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
                  <Typography variant="subtitle2" sx={{ minWidth: 150 }}>
                    {category}
                  </Typography>
                  <Box sx={{ flexGrow: 1 }}>
                    <LinearProgress
                      variant="determinate"
                      value={Math.min(parseFloat(categoryPercent), 100)}
                      sx={{ height: 6, borderRadius: 3 }}
                    />
                  </Box>
                  <Typography variant="body2" sx={{ minWidth: 100, textAlign: 'right' }}>
                    {categoryPercent}% ({categoryCount})
                  </Typography>
                </Box>
              </AccordionSummary>
              <AccordionDetails>
                <Grid container spacing={1}>
                  {occasions.map(occasion => {
                    const count = stats.byOccasion[occasion];
                    const percent = ((count / stats.tagged) * 100).toFixed(1);
                    const isUnderrepresented = gaps.underrepresentedOccasions.some(g => g.occasion === occasion);

                    return (
                      <Grid item xs={12} sm={6} key={occasion}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, pl: 2 }}>
                          <Typography variant="body2" sx={{ minWidth: 140, fontSize: '0.875rem' }}>
                            {occasion}
                            {isUnderrepresented && (
                              <Chip label="GAP" size="small" color="warning" sx={{ ml: 0.5, fontSize: '0.65rem', height: 16 }} />
                            )}
                          </Typography>
                          <Box sx={{ flexGrow: 1 }}>
                            <LinearProgress
                              variant="determinate"
                              value={Math.min(parseFloat(percent), 100)}
                              sx={{ height: 4, borderRadius: 2 }}
                              color={isUnderrepresented ? 'warning' : 'primary'}
                            />
                          </Box>
                          <Typography variant="body2" sx={{ minWidth: 70, textAlign: 'right', fontSize: '0.875rem' }}>
                            {count > 0 ? `${percent}% (${count})` : '0'}
                          </Typography>
                        </Box>
                      </Grid>
                    );
                  })}
                </Grid>
              </AccordionDetails>
            </Accordion>
          );
        })}
      </Paper>

      {/* Formality Distribution */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Formality Distribution
        </Typography>
        <Divider sx={{ my: 2 }} />

        <Grid container spacing={2}>
          {Object.entries(stats.formalityDistribution).map(([key, count]) => {
            const label = key
              .replace(/([A-Z])/g, ' $1')
              .replace(/^./, str => str.toUpperCase());
            const percent = ((count / stats.tagged) * 100).toFixed(1);

            return (
              <Grid item xs={12} sm={6} key={key}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Typography variant="body2" sx={{ minWidth: 140 }}>
                    {label}
                  </Typography>
                  <Box sx={{ flexGrow: 1 }}>
                    <LinearProgress
                      variant="determinate"
                      value={Math.min(parseFloat(percent), 100)}
                      sx={{ height: 6, borderRadius: 3 }}
                    />
                  </Box>
                  <Typography variant="body2" sx={{ minWidth: 80, textAlign: 'right' }}>
                    {percent}% ({count})
                  </Typography>
                </Box>
              </Grid>
            );
          })}
        </Grid>
      </Paper>

      {/* Gap Summary Tables */}
      {(gaps.underrepresentedPillars.length > 0 ||
        gaps.underrepresentedVibes.length > 0 ||
        gaps.underrepresentedOccasions.length > 0) && (
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Coverage Gaps (Action Items)
          </Typography>
          <Divider sx={{ my: 2 }} />

          {/* Pillar Gaps */}
          {gaps.underrepresentedPillars.length > 0 && (
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle2" gutterBottom>
                Underrepresented Style Pillars
              </Typography>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Pillar</TableCell>
                    <TableCell align="right">Current</TableCell>
                    <TableCell align="right">Ideal</TableCell>
                    <TableCell align="right">Gap</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {gaps.underrepresentedPillars.map(gap => (
                    <TableRow key={gap.pillar}>
                      <TableCell>{gap.pillar}</TableCell>
                      <TableCell align="right">{gap.count}</TableCell>
                      <TableCell align="right">{gap.idealCount}</TableCell>
                      <TableCell align="right">
                        <Chip label={`${gap.gapPercent}% under`} size="small" color="warning" />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>
          )}

          {/* Occasion Gaps (Top 10) */}
          {gaps.underrepresentedOccasions.length > 0 && (
            <Box>
              <Typography variant="subtitle2" gutterBottom>
                Top Occasion Gaps
              </Typography>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Occasion</TableCell>
                    <TableCell>Category</TableCell>
                    <TableCell align="right">Current</TableCell>
                    <TableCell align="right">Gap</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {gaps.underrepresentedOccasions.slice(0, 10).map(gap => (
                    <TableRow key={gap.occasion}>
                      <TableCell>{gap.occasion}</TableCell>
                      <TableCell>{gap.category}</TableCell>
                      <TableCell align="right">{gap.count}</TableCell>
                      <TableCell align="right">
                        <Chip label={`${gap.gapPercent}% under`} size="small" color="warning" />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>
          )}
        </Paper>
      )}
    </Box>
  );
}
