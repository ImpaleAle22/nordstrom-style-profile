'use client';

/**
 * Occasion Gaps Viewer
 *
 * Displays axis combinations that returned zero occasions from OCCASION_MAPPING table.
 * Used to identify gaps for table extension per spec §2.4.
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
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import DeleteIcon from '@mui/icons-material/Delete';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

interface OccasionGap {
  timestamp: string;
  outfitId?: string;
  formality: number;
  activityContext: string;
  activityContextSecondary?: string;
  socialRegister: string;
}

export default function OccasionGapsPage() {
  const [gaps, setGaps] = useState<OccasionGap[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadGaps();
  }, []);

  const loadGaps = async () => {
    setLoading(true);
    setError(null);

    try {
      // TODO: Call API route to get occasion gaps
      // For now, mock data
      const mockGaps: OccasionGap[] = [
        {
          timestamp: '2026-05-13T21:15:23Z',
          outfitId: 'test-gray-sweater-bad',
          formality: 1.0,
          activityContext: 'social-daytime',
          socialRegister: 'intimate',
        },
        {
          timestamp: '2026-05-13T21:20:45Z',
          outfitId: 'ai_h_m_mens_123',
          formality: 5.5,
          activityContext: 'event',
          socialRegister: 'evaluative',
        },
      ];

      setGaps(mockGaps);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load gaps');
    } finally {
      setLoading(false);
    }
  };

  const handleClearGaps = async () => {
    if (!confirm('Clear all logged occasion gaps? This cannot be undone.')) {
      return;
    }

    try {
      // TODO: Call API route to clear gaps
      setGaps([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to clear gaps');
    }
  };

  // Group gaps by axis combination
  const gapGroups = gaps.reduce((acc, gap) => {
    const key = `${gap.activityContext}|${gap.formality}|${gap.socialRegister}`;
    if (!acc[key]) {
      acc[key] = {
        activityContext: gap.activityContext,
        activityContextSecondary: gap.activityContextSecondary,
        formality: gap.formality,
        socialRegister: gap.socialRegister,
        count: 0,
        outfitIds: [],
      };
    }
    acc[key].count++;
    if (gap.outfitId) {
      acc[key].outfitIds.push(gap.outfitId);
    }
    return acc;
  }, {} as Record<string, any>);

  const groupedGaps = Object.values(gapGroups);

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
            Occasion Mapping Gaps
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Axis combinations that returned zero occasions from OCCASION_MAPPING table
          </Typography>
        </Box>
        <Button
          variant="outlined"
          startIcon={<RefreshIcon />}
          onClick={loadGaps}
          disabled={loading}
        >
          Refresh
        </Button>
        <Button
          variant="outlined"
          color="error"
          startIcon={<DeleteIcon />}
          onClick={handleClearGaps}
          disabled={loading || gaps.length === 0}
        >
          Clear All
        </Button>
      </Stack>

      {/* Info Alert */}
      <Alert severity="info" sx={{ mb: 3 }}>
        These gaps indicate axis combinations with no mapped occasions in <code>lib/occasion-mapping.ts</code>.
        During Gate 4, these should be reviewed and new mapping entries added to close the gaps.
      </Alert>

      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Summary */}
      {!loading && (
        <Paper sx={{ p: 2, mb: 3 }}>
          <Stack direction="row" spacing={3}>
            <Box>
              <Typography variant="body2" color="text.secondary">
                Total Gaps
              </Typography>
              <Typography variant="h5">{gaps.length}</Typography>
            </Box>
            <Box>
              <Typography variant="body2" color="text.secondary">
                Unique Combinations
              </Typography>
              <Typography variant="h5">{groupedGaps.length}</Typography>
            </Box>
          </Stack>
        </Paper>
      )}

      {/* Gaps Table */}
      {loading ? (
        <Typography>Loading...</Typography>
      ) : groupedGaps.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography color="text.secondary">
            No occasion gaps logged yet. Run v2 tagging to detect gaps.
          </Typography>
        </Paper>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Activity Context</TableCell>
                <TableCell align="right">Formality</TableCell>
                <TableCell>Social Register</TableCell>
                <TableCell align="right">Count</TableCell>
                <TableCell>Outfit IDs (sample)</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {groupedGaps.map((gap, idx) => (
                <TableRow key={idx}>
                  <TableCell>
                    <Stack direction="row" spacing={1}>
                      <Chip label={gap.activityContext} size="small" />
                      {gap.activityContextSecondary && (
                        <Chip
                          label={gap.activityContextSecondary}
                          size="small"
                          variant="outlined"
                        />
                      )}
                    </Stack>
                  </TableCell>
                  <TableCell align="right">
                    <Chip label={gap.formality.toFixed(1)} size="small" color="primary" />
                  </TableCell>
                  <TableCell>
                    <Chip label={gap.socialRegister} size="small" color="secondary" />
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="body2" fontWeight="bold">
                      {gap.count}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>
                      {gap.outfitIds.slice(0, 2).join(', ')}
                      {gap.outfitIds.length > 2 && ` +${gap.outfitIds.length - 2} more`}
                    </Typography>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Proposed Mappings Section */}
      {groupedGaps.length > 0 && (
        <Paper sx={{ p: 3, mt: 3 }}>
          <Typography variant="h6" gutterBottom>
            Proposed OCCASION_MAPPING Additions
          </Typography>
          <Alert severity="warning" sx={{ mb: 2 }}>
            Review these axis combinations and add appropriate occasion mappings to{' '}
            <code>lib/occasion-mapping.ts</code>
          </Alert>

          <Box sx={{ fontFamily: 'monospace', fontSize: '0.875rem', whiteSpace: 'pre-wrap' }}>
            {groupedGaps.map((gap, idx) => (
              <Box key={idx} sx={{ mb: 2, p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
                {`{
  activityContext: '${gap.activityContext}',
  formalityMin: ${(gap.formality - 0.5).toFixed(1)},
  formalityMax: ${(gap.formality + 0.5).toFixed(1)},
  socialRegister: '${gap.socialRegister}',
  occasions: [
    // TODO: Add appropriate occasions for this combination
    // Example: 'Coffee Date', 'Casual Dinner', etc.
  ]
},`}
              </Box>
            ))}
          </Box>
        </Paper>
      )}
    </Box>
  );
}
