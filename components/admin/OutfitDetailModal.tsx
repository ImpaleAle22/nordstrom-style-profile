/**
 * Outfit Detail Modal
 * Shows complete outfit information in a modal
 */

'use client';

import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Stack,
  Chip,
  Divider,
  Grid,
  Card,
  CardMedia,
  CardContent,
  Table,
  TableBody,
  TableRow,
  TableCell,
} from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';
import type { StoredOutfit } from '../../lib/outfit-storage';

interface OutfitDetailModalProps {
  outfit: StoredOutfit | null;
  open: boolean;
  onClose: () => void;
}

export default function OutfitDetailModal({ outfit, open, onClose }: OutfitDetailModalProps) {
  if (!outfit) return null;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: { maxHeight: '90vh' }
      }}
    >
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6">{outfit.recipeTitle}</Typography>
        <Button onClick={onClose} color="inherit" startIcon={<CloseIcon />} size="small">
          Close
        </Button>
      </DialogTitle>

      <DialogContent dividers>
        {/* Product Items Grid */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle2" gutterBottom fontWeight="bold">
            Products ({outfit.items.length} items)
          </Typography>
          <Grid container spacing={2}>
            {outfit.items.map((item, idx) => (
              <Grid item xs={6} sm={4} key={idx}>
                <Card variant="outlined">
                  <CardMedia
                    component="img"
                    image={item.product.imageUrl || '/placeholder.png'}
                    alt={item.product.title}
                    sx={{
                      height: 200,
                      objectFit: 'contain',
                      bgcolor: 'grey.50',
                      p: 1,
                    }}
                  />
                  <CardContent sx={{ p: 1.5 }}>
                    <Chip label={item.role} size="small" sx={{ mb: 0.5 }} />
                    <Typography variant="caption" display="block" sx={{ fontWeight: 500 }}>
                      {item.product.brand}
                    </Typography>
                    <Typography variant="caption" display="block" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                      {item.product.title}
                    </Typography>
                    <Typography variant="caption" display="block" sx={{ mt: 0.5, fontWeight: 600 }}>
                      ${item.product.price}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Box>

        <Divider sx={{ my: 3 }} />

        {/* Scores & Metadata */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle2" gutterBottom fontWeight="bold">
            Outfit Scores & Metadata
          </Typography>
          <Table size="small">
            <TableBody>
              <TableRow>
                <TableCell sx={{ fontWeight: 500 }}>Quality Score</TableCell>
                <TableCell>{outfit.qualityScore}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell sx={{ fontWeight: 500 }}>Alignment Score</TableCell>
                <TableCell>{outfit.alignmentScore}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell sx={{ fontWeight: 500 }}>Confidence Score</TableCell>
                <TableCell>{outfit.confidenceScore}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell sx={{ fontWeight: 500 }}>Pool Tier</TableCell>
                <TableCell>
                  <Chip
                    label={outfit.poolTier}
                    size="small"
                    color={
                      outfit.poolTier === 'primary'
                        ? 'success'
                        : outfit.poolTier === 'happy-accident'
                        ? 'info'
                        : 'warning'
                    }
                  />
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell sx={{ fontWeight: 500 }}>Department</TableCell>
                <TableCell>{outfit.department}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell sx={{ fontWeight: 500 }}>Strategy</TableCell>
                <TableCell>{outfit.strategy}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell sx={{ fontWeight: 500 }}>Generated</TableCell>
                <TableCell>{new Date(outfit.generatedAt).toLocaleString()}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell sx={{ fontWeight: 500 }}>Outfit ID</TableCell>
                <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.75rem', userSelect: 'all' }}>
                  {outfit.outfitId}
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell sx={{ fontWeight: 500 }}>Recipe ID</TableCell>
                <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.75rem', userSelect: 'all' }}>
                  {outfit.recipeId}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </Box>

        {/* Score Breakdown */}
        {outfit.scoreBreakdown && (
          <>
            <Divider sx={{ my: 3 }} />
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle2" gutterBottom fontWeight="bold">
                Score Breakdown
              </Typography>
              <Table size="small">
                <TableBody>
                  <TableRow>
                    <TableCell>Style Register Coherence</TableCell>
                    <TableCell>{outfit.scoreBreakdown.styleRegisterCoherence}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Color Harmony</TableCell>
                    <TableCell>{outfit.scoreBreakdown.colorHarmony}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Silhouette Balance</TableCell>
                    <TableCell>{outfit.scoreBreakdown.silhouetteBalance}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Occasion Alignment</TableCell>
                    <TableCell>{outfit.scoreBreakdown.occasionAlignment}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Season Fabric Weight</TableCell>
                    <TableCell>{outfit.scoreBreakdown.seasonFabricWeight}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </Box>
          </>
        )}

        {/* Attributes */}
        {outfit.attributes && (
          <>
            <Divider sx={{ my: 3 }} />
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" gutterBottom fontWeight="bold">
                Outfit Attributes
              </Typography>

              {/* Style Pillar */}
              {outfit.attributes.stylePillar && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
                    Style Pillar
                  </Typography>
                  <Chip label={outfit.attributes.stylePillar} color="primary" />
                </Box>
              )}

              {/* Formality */}
              {outfit.attributes.formality !== undefined && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
                    Formality
                  </Typography>
                  <Chip label={outfit.attributes.formality.toFixed(1)} color="info" />
                </Box>
              )}

              {/* Vibes */}
              {outfit.attributes.vibes && outfit.attributes.vibes.length > 0 && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
                    Vibes
                  </Typography>
                  <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                    {outfit.attributes.vibes.map((vibe, i) => (
                      <Chip key={i} label={vibe} size="small" variant="outlined" />
                    ))}
                  </Stack>
                </Box>
              )}

              {/* Occasions */}
              {outfit.attributes.occasions && outfit.attributes.occasions.length > 0 && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
                    Occasions
                  </Typography>
                  <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                    {outfit.attributes.occasions.map((occasion, i) => (
                      <Chip key={i} label={occasion} size="small" variant="outlined" />
                    ))}
                  </Stack>
                </Box>
              )}

              {/* Activity Context */}
              {outfit.attributes.activityContext && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
                    Activity Context
                  </Typography>
                  <Chip label={outfit.attributes.activityContext} size="small" />
                  {outfit.attributes.activityContextSecondary && (
                    <Chip label={outfit.attributes.activityContextSecondary} size="small" sx={{ ml: 0.5 }} />
                  )}
                </Box>
              )}

              {/* Social Register */}
              {outfit.attributes.socialRegister && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
                    Social Register
                  </Typography>
                  <Chip label={outfit.attributes.socialRegister} size="small" />
                </Box>
              )}

              {/* Season */}
              {outfit.attributes.season && outfit.attributes.season.length > 0 && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
                    Season
                  </Typography>
                  <Stack direction="row" spacing={0.5}>
                    {outfit.attributes.season.map((s, i) => (
                      <Chip key={i} label={s} size="small" variant="outlined" />
                    ))}
                  </Stack>
                </Box>
              )}

              {/* Tagging Metadata */}
              <Box sx={{ mt: 3, pt: 2, borderTop: 1, borderColor: 'divider' }}>
                <Typography variant="caption" color="text.secondary" display="block">
                  Tagged by: <strong>{outfit.attributes.taggedBy}</strong>
                </Typography>
                <Typography variant="caption" color="text.secondary" display="block">
                  Tagged at: {new Date(outfit.attributes.taggedAt).toLocaleString()}
                </Typography>
                {outfit.attributes.confidence && (
                  <Typography variant="caption" color="text.secondary" display="block">
                    Confidence: Style Pillar {(outfit.attributes.confidence.stylePillar * 100).toFixed(0)}%,
                    Vibes {(outfit.attributes.confidence.vibes * 100).toFixed(0)}%,
                    Occasions {(outfit.attributes.confidence.occasions * 100).toFixed(0)}%
                  </Typography>
                )}
              </Box>
            </Box>
          </>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} variant="contained">
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
}
