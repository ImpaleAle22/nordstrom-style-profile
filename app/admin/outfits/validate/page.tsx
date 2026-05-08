'use client';

import { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Typography,
  Paper,
  Alert,
  LinearProgress,
  Chip,
  Stack,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Tabs,
  Tab,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Warning as WarningIcon,
  Delete as DeleteIcon,
  Refresh as RefreshIcon,
  CheckCircle as CheckCircleIcon,
  FileDownload as FileDownloadIcon,
} from '@mui/icons-material';
import { getAllOutfits, deleteOutfit, saveOutfitsBatch } from '@/lib/supabase-outfit-storage';
import {
  scanAllOutfitsForMisalignment,
  getOutfitsToDelete,
  formatMisalignmentReport,
  type MisalignmentReport,
} from '@/lib/outfit-validation/misalignment-scanner';
import {
  hydrateOutfitsBatch,
  formatHydrationStats,
  type HydrationStats,
  type HydrationResult,
} from '@/lib/outfit-validation/product-hydration';
import {
  hydrateProductTypesInPlace,
  countMissingProductTypes,
} from '@/lib/outfit-validation/lightweight-hydration';

export default function OutfitValidationPage() {
  const [activeTab, setActiveTab] = useState(0);

  // Auto-load missing type stats when switching to lightweight hydration tab
  useEffect(() => {
    if (activeTab === 1 && !missingTypeStats && !lightweightHydrating) {
      countMissingProductTypes().then(setMissingTypeStats).catch(console.error);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  // Misalignment scanner state
  const [scanning, setScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [scanResults, setScanResults] = useState<{
    total: number;
    clean: number;
    withIssues: number;
    critical: number;
    high: number;
    medium: number;
    reports: MisalignmentReport[];
  } | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Hydration state
  const [hydrating, setHydrating] = useState(false);
  const [hydrationProgress, setHydrationProgress] = useState(0);
  const [hydrationStats, setHydrationStats] = useState<HydrationStats | null>(null);
  const [hydrationResults, setHydrationResults] = useState<HydrationResult[]>([]);

  // Lightweight hydration state
  const [lightweightHydrating, setLightweightHydrating] = useState(false);
  const [lightweightProgress, setLightweightProgress] = useState(0);
  const [lightweightStats, setLightweightStats] = useState<{
    totalOutfits: number;
    outfitsUpdated: number;
    fieldsUpdated: number;
  } | null>(null);
  const [missingTypeStats, setMissingTypeStats] = useState<{
    totalOutfits: number;
    missingType2: number;
    missingType3: number;
    missingType4: number;
  } | null>(null);

  // Scan outfits for misalignment
  const handleScan = async () => {
    setScanning(true);
    setScanProgress(0);
    setScanResults(null);

    try {
      const outfits = await getAllOutfits();
      console.log(`🔍 Scanning ${outfits.length} outfits for misalignment...`);

      const results = await scanAllOutfitsForMisalignment(outfits, {
        onProgress: (current, total) => {
          setScanProgress(Math.round((current / total) * 100));
        },
        batchSize: 100, // Process 100 outfits at a time
      });

      setScanResults(results);

      console.log('✅ Scan complete!');
      console.log(`   Clean: ${results.clean}`);
      console.log(`   Issues: ${results.withIssues} (${results.critical} critical, ${results.high} high, ${results.medium} medium)`);
    } catch (error: any) {
      console.error('Scan failed:', error);
      alert(`Scan failed: ${error.message}`);
    } finally {
      setScanning(false);
      setScanProgress(0);
    }
  };

  // Delete outfits with critical issues
  const handleDeleteCritical = async () => {
    if (!scanResults) return;

    const toDelete = getOutfitsToDelete(scanResults.reports);

    if (toDelete.length === 0) {
      alert('No outfits marked for deletion');
      return;
    }

    const confirmed = confirm(
      `Delete ${toDelete.length} outfits with critical misalignment issues?\n\n` +
      `This action cannot be undone.`
    );

    if (!confirmed) return;

    setDeleting(true);

    try {
      console.log(`🗑️  Deleting ${toDelete.length} outfits...`);

      for (const outfitId of toDelete) {
        await deleteOutfit(outfitId);
      }

      console.log('✅ Deletion complete!');
      alert(`Successfully deleted ${toDelete.length} outfits`);

      // Re-scan to update results
      handleScan();
    } catch (error: any) {
      console.error('Deletion failed:', error);
      alert(`Deletion failed: ${error.message}`);
    } finally {
      setDeleting(false);
    }
  };

  // Export issues to CSV
  const handleExportIssues = () => {
    if (!scanResults || scanResults.reports.length === 0) {
      alert('No issues to export');
      return;
    }

    // Convert reports to CSV format
    const csvRows = [
      // Header
      ['Outfit ID', 'Recipe Title', 'Severity', 'Issue Count', 'Issues'].join(','),
      // Data rows
      ...scanResults.reports.map(report => {
        const issuesText = report.issues
          .map(issue => `${issue.role}: ${issue.problem}`)
          .join('; ');

        return [
          report.outfitId,
          `"${report.recipeTitle.replace(/"/g, '""')}"`, // Escape quotes
          report.severity,
          report.issues.length,
          `"${issuesText.replace(/"/g, '""')}"` // Escape quotes
        ].join(',');
      })
    ];

    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `outfit-validation-issues-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    console.log(`✅ Exported ${scanResults.reports.length} issues to CSV`);
  };

  // Hydrate outfits with fresh product data
  const handleHydrate = async () => {
    setHydrating(true);
    setHydrationProgress(0);
    setHydrationStats(null);
    setHydrationResults([]);

    try {
      const allOutfits = await getAllOutfits();

      // SAFETY: Limit to most recent 1000 outfits to avoid browser crash
      const MAX_OUTFITS = 1000;
      if (allOutfits.length > MAX_OUTFITS) {
        const confirmed = confirm(
          `⚠️  WARNING: You have ${allOutfits.length.toLocaleString()} outfits.\n\n` +
          `Hydrating all of them will crash your browser.\n\n` +
          `Hydrate only the most recent ${MAX_OUTFITS} outfits?\n\n` +
          `(Newer outfits likely have better data already)`
        );

        if (!confirmed) {
          setHydrating(false);
          return;
        }
      }

      // Sort by generatedAt (most recent first) and take first N
      const outfits = allOutfits
        .sort((a, b) => new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime())
        .slice(0, MAX_OUTFITS);

      console.log(`💧 Hydrating ${outfits.length} outfits (most recent) out of ${allOutfits.length} total...`);

      const { outfits: updatedOutfits, stats, results } = await hydrateOutfitsBatch(outfits, {
        onProgress: (current, total) => {
          setHydrationProgress(Math.round((current / total) * 100));
        },
        batchSize: 50, // Now fast - using in-memory product lookup
      });

      // Save updated outfits
      if (stats.outfitsUpdated > 0) {
        console.log(`💾 Saving ${updatedOutfits.length} updated outfits...`);
        await saveOutfitsBatch(updatedOutfits);
      }

      setHydrationStats(stats);
      setHydrationResults(results);

      console.log('✅ Hydration complete!');
      console.log(formatHydrationStats(stats));

      if (stats.outfitsUpdated > 0) {
        alert(`Hydration complete!\n\n${stats.outfitsUpdated} outfits updated with ${stats.totalChanges} changes.`);
      } else {
        alert('Hydration complete! All outfits already have current product data.');
      }
    } catch (error: any) {
      console.error('Hydration failed:', error);
      alert(`Hydration failed: ${error.message}`);
    } finally {
      setHydrating(false);
      setHydrationProgress(0);
    }
  };

  // Count missing product types
  const handleCountMissing = async () => {
    try {
      const stats = await countMissingProductTypes();
      setMissingTypeStats(stats);
      console.log('Missing product types:', stats);
    } catch (error: any) {
      console.error('Failed to count missing types:', error);
      alert(`Failed to count: ${error.message}`);
    }
  };

  // Lightweight hydration (productType2/3/4 only)
  const handleLightweightHydrate = async () => {
    setLightweightHydrating(true);
    setLightweightProgress(0);
    setLightweightStats(null);

    try {
      console.log('🔧 Starting lightweight hydration (productType2/3/4 only)...');

      const result = await hydrateProductTypesInPlace({
        onProgress: (current, total, updated) => {
          setLightweightProgress(Math.round((current / total) * 100));
          console.log(`Progress: ${current}/${total} (${updated} updated)`);
        },
        batchSize: 100,
      });

      setLightweightStats(result);

      console.log('✅ Lightweight hydration complete!');
      console.log(`   Updated ${result.outfitsUpdated} outfits`);
      console.log(`   ${result.fieldsUpdated} fields updated`);

      alert(
        `Lightweight hydration complete!\n\n` +
        `${result.outfitsUpdated} outfits updated\n` +
        `${result.fieldsUpdated} product type fields added`
      );

      // Refresh missing count
      handleCountMissing();
    } catch (error: any) {
      console.error('Lightweight hydration failed:', error);
      alert(`Hydration failed: ${error.message}`);
    } finally {
      setLightweightHydrating(false);
      setLightweightProgress(0);
    }
  };

  return (
    <Box sx={{ p: 3, maxWidth: 1400, mx: 'auto' }}>
      <Typography variant="h4" gutterBottom>
        Outfit Validation & Maintenance
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Scan for misaligned products and refresh product data from master source
      </Typography>

      <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)} sx={{ mb: 3 }}>
        <Tab label="Misalignment Scanner" />
        <Tab label="Fix Product Types (Fast)" />
        <Tab label="Full Hydration (Slow)" />
      </Tabs>

      {/* Tab 1: Misalignment Scanner */}
      {activeTab === 0 && (
        <Box>
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Misalignment Scanner
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Detects outfits with severely mismatched products (e.g., swim shorts in bottoms role,
              lipstick in tops role, wrong product categories).
            </Typography>

            <Stack direction="row" spacing={2}>
              <Button
                variant="contained"
                onClick={handleScan}
                disabled={scanning}
                startIcon={<WarningIcon />}
              >
                {scanning ? `Scanning... (${scanProgress}%)` : 'Scan All Outfits'}
              </Button>

              {scanResults && scanResults.critical > 0 && (
                <Button
                  variant="contained"
                  color="error"
                  onClick={handleDeleteCritical}
                  disabled={deleting}
                  startIcon={<DeleteIcon />}
                >
                  {deleting ? 'Deleting...' : `Delete ${scanResults.critical} Critical Outfits`}
                </Button>
              )}

              {scanResults && scanResults.reports.length > 0 && (
                <Button
                  variant="outlined"
                  onClick={handleExportIssues}
                  startIcon={<FileDownloadIcon />}
                >
                  Export Issues CSV
                </Button>
              )}
            </Stack>

            {scanning && (
              <Box sx={{ mt: 2 }}>
                <LinearProgress variant="determinate" value={scanProgress} />
                <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
                  Processing outfits: {scanProgress}%
                </Typography>
              </Box>
            )}
          </Paper>

          {/* Scan Results */}
          {scanResults && (
            <>
              <Alert
                severity={scanResults.critical > 0 ? 'error' : scanResults.withIssues > 0 ? 'warning' : 'success'}
                sx={{ mb: 3 }}
              >
                {scanResults.critical > 0 && (
                  <Typography variant="body2" fontWeight="bold">
                    {scanResults.critical} outfits have CRITICAL issues and should be deleted
                  </Typography>
                )}
                {scanResults.critical === 0 && scanResults.withIssues > 0 && (
                  <Typography variant="body2">
                    {scanResults.withIssues} outfits have issues but are not critical
                  </Typography>
                )}
                {scanResults.withIssues === 0 && (
                  <Typography variant="body2">
                    All outfits are clean! No misalignment issues detected.
                  </Typography>
                )}
              </Alert>

              <Paper sx={{ p: 3, mb: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Summary
                </Typography>
                <Stack direction="row" spacing={2} flexWrap="wrap">
                  <Chip label={`Total: ${scanResults.total}`} />
                  <Chip label={`Clean: ${scanResults.clean}`} color="success" />
                  <Chip label={`Critical: ${scanResults.critical}`} color="error" />
                  <Chip label={`High: ${scanResults.high}`} color="warning" />
                  <Chip label={`Medium: ${scanResults.medium}`} />
                </Stack>
              </Paper>

              {/* Detailed Reports */}
              {scanResults.reports.length > 0 && (
                <Paper sx={{ p: 3 }}>
                  <Typography variant="h6" gutterBottom>
                    Issues Found ({scanResults.reports.length} outfits)
                  </Typography>

                  {scanResults.reports.map((report, idx) => (
                    <Accordion key={report.outfitId}>
                      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                        <Stack direction="row" spacing={2} alignItems="center" sx={{ width: '100%' }}>
                          <Chip
                            label={report.severity.toUpperCase()}
                            color={
                              report.severity === 'critical' ? 'error' :
                              report.severity === 'high' ? 'warning' : 'default'
                            }
                            size="small"
                          />
                          <Typography variant="body2" sx={{ flex: 1 }}>
                            {report.recipeTitle}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {report.issues.length} issue{report.issues.length !== 1 ? 's' : ''}
                          </Typography>
                        </Stack>
                      </AccordionSummary>
                      <AccordionDetails>
                        <pre style={{ fontSize: '12px', whiteSpace: 'pre-wrap' }}>
                          {formatMisalignmentReport(report)}
                        </pre>
                      </AccordionDetails>
                    </Accordion>
                  ))}
                </Paper>
              )}
            </>
          )}
        </Box>
      )}

      {/* Tab 2: Fix Product Types (Lightweight) */}
      {activeTab === 1 && (
        <Box>
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Fix Product Types (Lightweight & Fast)
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Updates ALL productType1/2/3/4 fields from master source. Overwrites any outdated or
              partial data to ensure consistency. This is what you need for the Misalignment Scanner to work properly.
            </Typography>

            <Alert severity="success" sx={{ mb: 2 }}>
              <Typography variant="body2">
                ✅ <strong>Can handle 42K+ outfits</strong> - Only updates 4 fields per product (super lightweight)
                <br />
                ✅ <strong>Updates directly in IndexedDB</strong> - Doesn't load everything into memory
                <br />
                ✅ <strong>Overwrites ALL type fields</strong> - Fixes partial/outdated data
              </Typography>
            </Alert>

            <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
              <Button
                variant="outlined"
                onClick={handleCountMissing}
                disabled={lightweightHydrating}
              >
                Check Status
              </Button>

              <Button
                variant="contained"
                onClick={handleLightweightHydrate}
                disabled={lightweightHydrating}
                color="primary"
              >
                {lightweightHydrating ? `Fixing... (${lightweightProgress}%)` : 'Fix All Product Types'}
              </Button>
            </Stack>

            {lightweightHydrating && (
              <Box sx={{ mt: 2 }}>
                <LinearProgress variant="determinate" value={lightweightProgress} />
                <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
                  Processing outfits: {lightweightProgress}%
                </Typography>
              </Box>
            )}
          </Paper>

          {/* Missing Type Stats */}
          {missingTypeStats && (
            <Paper sx={{ p: 3, mb: 3 }}>
              <Typography variant="h6" gutterBottom>
                Current Status
              </Typography>
              <Stack direction="row" spacing={2} flexWrap="wrap">
                <Chip label={`Total Outfits: ${missingTypeStats.totalOutfits.toLocaleString()}`} />
                <Chip
                  label={`Missing Type2: ${missingTypeStats.missingType2.toLocaleString()}`}
                  color={missingTypeStats.missingType2 > 0 ? 'error' : 'success'}
                />
                <Chip
                  label={`Missing Type3: ${missingTypeStats.missingType3.toLocaleString()}`}
                  color={missingTypeStats.missingType3 > 0 ? 'warning' : 'success'}
                />
                <Chip
                  label={`Missing Type4: ${missingTypeStats.missingType4.toLocaleString()}`}
                  color={missingTypeStats.missingType4 > 0 ? 'warning' : 'success'}
                />
              </Stack>
            </Paper>
          )}

          {/* Lightweight Hydration Results */}
          {lightweightStats && (
            <>
              <Alert severity="success" sx={{ mb: 3 }}>
                <Typography variant="body2">
                  ✅ Updated {lightweightStats.outfitsUpdated.toLocaleString()} outfits with{' '}
                  {lightweightStats.fieldsUpdated.toLocaleString()} product type fields
                </Typography>
              </Alert>

              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Results
                </Typography>
                <Stack direction="row" spacing={2} flexWrap="wrap">
                  <Chip label={`Total: ${lightweightStats.totalOutfits.toLocaleString()}`} />
                  <Chip
                    label={`Updated: ${lightweightStats.outfitsUpdated.toLocaleString()}`}
                    color="success"
                  />
                  <Chip
                    label={`Fields Fixed: ${lightweightStats.fieldsUpdated.toLocaleString()}`}
                    color="primary"
                  />
                </Stack>
              </Paper>
            </>
          )}
        </Box>
      )}

      {/* Tab 3: Full Product Hydration (Heavy) */}
      {activeTab === 2 && (
        <Box>
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Product Data Hydration
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Refreshes outfit product data from the master source. Use this when you've
              updated product metadata (colors, types, materials, etc.) and want those changes to
              flow through to existing outfits.
            </Typography>

            <Alert severity="warning" sx={{ mb: 2 }}>
              <Typography variant="body2" fontWeight="bold" gutterBottom>
                ⚠️  Memory Intensive Operation
              </Typography>
              <Typography variant="body2">
                <strong>Limitation:</strong> Can only hydrate ~1,000 outfits at a time (browser memory limits).
                <br />
                <strong>Recommendation:</strong> The data pipeline fix ensures new outfits get complete data.
                Consider deleting old outfits instead of hydrating them.
              </Typography>
            </Alert>

            <Alert severity="info" sx={{ mb: 2 }}>
              <Typography variant="body2">
                <strong>Why is this needed?</strong> Outfits store complete product data (not just IDs).
                When product metadata is updated, existing outfits still have the old data. This tool
                refreshes outfit products with current data from the master source.
              </Typography>
            </Alert>

            <Button
              variant="contained"
              onClick={handleHydrate}
              disabled={hydrating}
              startIcon={<RefreshIcon />}
            >
              {hydrating ? `Hydrating... (${hydrationProgress}%)` : 'Hydrate All Outfits'}
            </Button>

            {hydrating && <LinearProgress variant="determinate" value={hydrationProgress} sx={{ mt: 2 }} />}
          </Paper>

          {/* Hydration Results */}
          {hydrationStats && (
            <>
              <Alert
                severity={hydrationStats.outfitsUpdated > 0 ? 'success' : 'info'}
                sx={{ mb: 3 }}
              >
                <Typography variant="body2">
                  {hydrationStats.outfitsUpdated > 0
                    ? `Updated ${hydrationStats.outfitsUpdated} outfits with ${hydrationStats.totalChanges} changes`
                    : 'All outfits already have current product data'}
                </Typography>
              </Alert>

              <Paper sx={{ p: 3, mb: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Summary
                </Typography>
                <Stack direction="row" spacing={2} flexWrap="wrap">
                  <Chip label={`Total: ${hydrationStats.totalOutfits}`} />
                  <Chip label={`Updated: ${hydrationStats.outfitsUpdated}`} color="success" />
                  <Chip label={`Unchanged: ${hydrationStats.outfitsUnchanged}`} />
                  <Chip label={`Failed: ${hydrationStats.outfitsFailed}`} color="error" />
                  <Chip label={`Changes: ${hydrationStats.totalChanges}`} color="primary" />
                </Stack>
              </Paper>

              {Object.keys(hydrationStats.changesByField).length > 0 && (
                <Paper sx={{ p: 3 }}>
                  <Typography variant="h6" gutterBottom>
                    Changes by Field
                  </Typography>
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Field</TableCell>
                          <TableCell align="right">Changes</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {Object.entries(hydrationStats.changesByField)
                          .sort((a, b) => b[1] - a[1])
                          .map(([field, count]) => (
                            <TableRow key={field}>
                              <TableCell>{field}</TableCell>
                              <TableCell align="right">{count}</TableCell>
                            </TableRow>
                          ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Paper>
              )}
            </>
          )}
        </Box>
      )}
    </Box>
  );
}
