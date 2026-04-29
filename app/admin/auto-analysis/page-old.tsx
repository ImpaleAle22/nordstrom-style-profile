'use client';

/**
 * Automatic Rule Analysis Page
 *
 * Automatically analyzes AI reasoning to identify rule improvement opportunities.
 * NO MANUAL REVIEW NEEDED - learns from AI's decisions and reasoning.
 */

import { useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  Alert,
  Card,
  CardContent,
  Chip,
  LinearProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Divider
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import { useRouter } from 'next/navigation';

import {
  analyzeRuleGaps,
  exportAnalysis,
  printAnalysis,
  type AnalysisReport,
  type RuleGap
} from '@/lib/automatic-rule-analysis';

export default function AutoAnalysisPage() {
  const router = useRouter();
  const [analyzing, setAnalyzing] = useState(false);
  const [report, setReport] = useState<AnalysisReport | null>(null);

  async function runAnalysis() {
    setAnalyzing(true);
    try {
      const result = await analyzeRuleGaps();
      setReport(result);
      printAnalysis(result); // Also log to console
    } catch (error) {
      console.error('Analysis failed:', error);
      alert('Analysis failed. Check console for details.');
    } finally {
      setAnalyzing(false);
    }
  }

  function getGapTypeColor(type: RuleGap['gapType']) {
    switch (type) {
      case 'missing-signal': return 'error';
      case 'wrong-threshold': return 'warning';
      case 'incorrect-hint': return 'secondary';
      case 'missed-attribute': return 'info';
      default: return 'default';
    }
  }

  return (
    <Box sx={{ p: 4 }}>
      <Typography variant="h4" gutterBottom>
        Automatic Rule Analysis
      </Typography>
      <Typography variant="body2" color="text.secondary" paragraph>
        Automatically analyzes AI reasoning to identify rule improvement opportunities. No manual review needed!
      </Typography>

      <Alert severity="info" sx={{ mb: 3 }}>
        <strong>How it works:</strong> Compares what the rules suggested vs. what the AI chose, analyzes AI reasoning text for patterns,
        and automatically identifies gaps where rules should be improved.
      </Alert>

      {/* Run Analysis */}
      {!report && (
        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Ready to Analyze
          </Typography>
          <Typography variant="body2" paragraph>
            This will analyze all tagged outfits to find patterns where AI had to override rules.
          </Typography>
          <Button
            variant="contained"
            onClick={runAnalysis}
            disabled={analyzing}
            startIcon={<AutoFixHighIcon />}
          >
            {analyzing ? 'Analyzing...' : 'Run Automatic Analysis'}
          </Button>
          {analyzing && <LinearProgress sx={{ mt: 2 }} />}
        </Paper>
      )}

      {/* Results */}
      {report && (
        <>
          {/* Summary */}
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Analysis Summary
            </Typography>

            {report.totalOutfits === 0 ? (
              <Alert severity="warning">
                No tagged outfits found. Run Phase 1 tagging first.
              </Alert>
            ) : (
              <>
                <Box sx={{ display: 'flex', gap: 4, mb: 3 }}>
                  <Box>
                    <Typography variant="h3" color="primary">
                      {(report.summary.rulesOnlyRate * 100).toFixed(0)}%
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Rules-Only Rate
                    </Typography>
                  </Box>
                  <Divider orientation="vertical" flexItem />
                  <Box>
                    <Typography variant="body2">
                      Total Analyzed: <strong>{report.totalOutfits}</strong>
                    </Typography>
                    <Typography variant="body2" color="success.main">
                      Rules-Only: {report.rulesOnlyCount} ({(report.summary.rulesOnlyRate * 100).toFixed(0)}%)
                    </Typography>
                    <Typography variant="body2" color="warning.main">
                      Hybrid (AI): {report.hybridCount} ({((1 - report.summary.rulesOnlyRate) * 100).toFixed(0)}%)
                    </Typography>
                  </Box>
                  <Divider orientation="vertical" flexItem />
                  <Box>
                    <Typography variant="body2">
                      Avg Rules Confidence: <strong>{(report.summary.avgRulesConfidence * 100).toFixed(0)}%</strong>
                    </Typography>
                    <Typography variant="body2">
                      Avg AI Confidence: <strong>{(report.summary.avgAIConfidence * 100).toFixed(0)}%</strong>
                    </Typography>
                  </Box>
                </Box>

                <LinearProgress
                  variant="determinate"
                  value={report.summary.rulesOnlyRate * 100}
                  sx={{ height: 8, borderRadius: 1 }}
                />
                <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                  Higher is better - means rules are confident enough to avoid AI calls
                </Typography>
              </>
            )}
          </Paper>

          {/* Gaps */}
          {report.gaps.length === 0 ? (
            <Alert severity="success">
              No significant rule gaps detected! Your rules are well-calibrated.
            </Alert>
          ) : (
            <Paper sx={{ p: 3, mb: 3 }}>
              <Typography variant="h6" gutterBottom>
                Identified Rule Gaps ({report.gaps.length})
              </Typography>
              <Typography variant="body2" color="text.secondary" paragraph>
                Patterns where AI consistently had to step in. Sorted by confidence.
              </Typography>

              {report.gaps.map((gap, idx) => (
                <Accordion key={idx}>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
                      <Chip
                        label={gap.gapType.replace('-', ' ')}
                        size="small"
                        color={getGapTypeColor(gap.gapType)}
                      />
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="subtitle1">{gap.description}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {gap.frequency} occurrences • {gap.attribute} • {(gap.confidence * 100).toFixed(0)}% confidence
                        </Typography>
                      </Box>
                    </Box>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Alert severity="success" sx={{ mb: 2 }}>
                      <strong>Suggested Fix:</strong> {gap.suggestedFix}
                    </Alert>

                    <Typography variant="subtitle2" gutterBottom>
                      Example Cases:
                    </Typography>
                    <TableContainer>
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell>Outfit</TableCell>
                            <TableCell>AI Chose</TableCell>
                            <TableCell>AI Reasoning</TableCell>
                            <TableCell>Context</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {gap.examples.slice(0, 5).map((example, i) => (
                            <TableRow key={i}>
                              <TableCell>
                                <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>
                                  {example.outfitId.slice(0, 8)}
                                </Typography>
                              </TableCell>
                              <TableCell>
                                <Chip label={example.aiChose} size="small" color="primary" />
                                <br />
                                <Typography variant="caption" color="text.secondary">
                                  {(example.aiConfidence * 100).toFixed(0)}% confidence
                                </Typography>
                              </TableCell>
                              <TableCell>
                                <Typography variant="caption">
                                  {example.aiReasoning.slice(0, 150)}
                                  {example.aiReasoning.length > 150 && '...'}
                                </Typography>
                              </TableCell>
                              <TableCell>
                                <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                                  {example.outfitContext.hasAthletic && (
                                    <Chip label="Athletic" size="small" />
                                  )}
                                  {example.outfitContext.hasBrightColors && (
                                    <Chip label="Bright Colors" size="small" color="warning" />
                                  )}
                                  <Chip
                                    label={`${example.outfitContext.colorCount} colors`}
                                    size="small"
                                    variant="outlined"
                                  />
                                </Box>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>

                    <Divider sx={{ my: 2 }} />

                    <Typography variant="caption" color="text.secondary">
                      <strong>Example Products:</strong>
                    </Typography>
                    <Box component="ul" sx={{ mt: 0.5, pl: 3 }}>
                      {gap.examples[0]?.outfitContext.productTitles.slice(0, 4).map((title, i) => (
                        <Typography key={i} component="li" variant="caption" color="text.secondary">
                          {title}
                        </Typography>
                      ))}
                    </Box>
                  </AccordionDetails>
                </Accordion>
              ))}
            </Paper>
          )}

          {/* Top Missing Signals */}
          {report.summary.topMissingSignals.length > 0 && (
            <Paper sx={{ p: 3, mb: 3 }}>
              <Typography variant="h6" gutterBottom>
                Top Missing Signals
              </Typography>
              <Typography variant="body2" color="text.secondary" paragraph>
                Signals that AI frequently mentions but rules don't detect.
              </Typography>
              <Box component="ul" sx={{ pl: 3 }}>
                {report.summary.topMissingSignals.map((signal, idx) => (
                  <Typography key={idx} component="li" variant="body2" paragraph>
                    {signal}
                  </Typography>
                ))}
              </Box>
            </Paper>
          )}

          {/* Actions */}
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Actions
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              <Button
                variant="contained"
                onClick={runAnalysis}
              >
                Run Again
              </Button>
              <Button
                variant="outlined"
                onClick={() => {
                  const json = exportAnalysis(report);
                  const blob = new Blob([json], { type: 'application/json' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `rule-analysis-${new Date().toISOString()}.json`;
                  a.click();
                }}
              >
                Export Report
              </Button>
              <Button
                variant="outlined"
                onClick={() => printAnalysis(report)}
              >
                Print to Console
              </Button>
              <Button variant="outlined" onClick={() => router.push('/test-tagging')}>
                Back to Test Tagging
              </Button>
            </Box>
          </Paper>
        </>
      )}
    </Box>
  );
}
