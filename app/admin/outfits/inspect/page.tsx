'use client';

/**
 * Inspect Outfit Data
 * Shows raw outfit data to diagnose image URL issues
 */

import { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Paper,
  Button,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Alert,
} from '@mui/material';
import { Refresh as RefreshIcon } from '@mui/icons-material';
import { getAllOutfits } from '@/lib/outfit-storage';
import type { StoredOutfit } from '@/lib/outfit-storage';

export default function InspectPage() {
  const [outfit, setOutfit] = useState<StoredOutfit | null>(null);
  const [loading, setLoading] = useState(false);

  const loadFirstOutfit = async () => {
    setLoading(true);
    try {
      const outfits = await getAllOutfits();
      if (outfits.length > 0) {
        setOutfit(outfits[0]);
      }
    } catch (error) {
      console.error('Error loading outfit:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFirstOutfit();
  }, []);

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Paper sx={{ p: 4 }}>
        <Typography variant="h4" gutterBottom>
          Inspect First Outfit
        </Typography>
        <Typography variant="body2" color="text.secondary" paragraph>
          Shows raw data for the first outfit to diagnose image URL issues
        </Typography>

        <Button
          variant="outlined"
          startIcon={<RefreshIcon />}
          onClick={loadFirstOutfit}
          disabled={loading}
          sx={{ mb: 3 }}
        >
          Refresh
        </Button>

        {outfit ? (
          <>
            <Alert severity="info" sx={{ mb: 3 }}>
              Outfit ID: <code>{outfit.outfitId}</code>
            </Alert>

            <Typography variant="h6" gutterBottom>
              Items and Image URLs
            </Typography>

            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Role</TableCell>
                  <TableCell>Product Title</TableCell>
                  <TableCell>Image URL</TableCell>
                  <TableCell>Preview</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {outfit.items.map((item, idx) => (
                  <TableRow key={idx}>
                    <TableCell>{item.role}</TableCell>
                    <TableCell>{item.product.title}</TableCell>
                    <TableCell>
                      <Box sx={{ maxWidth: 400, wordBreak: 'break-all', fontSize: '11px' }}>
                        {item.product.imageUrl || <span style={{ color: 'red' }}>EMPTY/NULL</span>}
                      </Box>
                    </TableCell>
                    <TableCell>
                      {item.product.imageUrl ? (
                        <img
                          src={item.product.imageUrl}
                          alt={item.product.title}
                          style={{ width: '100px', height: '100px', objectFit: 'contain', border: '1px solid #ddd' }}
                          onError={(e) => {
                            e.currentTarget.style.border = '2px solid red';
                          }}
                          onLoad={(e) => {
                            e.currentTarget.style.border = '2px solid green';
                          }}
                        />
                      ) : (
                        <span style={{ color: 'red' }}>No URL</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <Box sx={{ mt: 4 }}>
              <Typography variant="h6" gutterBottom>
                Raw JSON
              </Typography>
              <Box
                component="pre"
                sx={{
                  background: '#f5f5f5',
                  p: 2,
                  overflow: 'auto',
                  maxHeight: '400px',
                  fontSize: '11px',
                }}
              >
                {JSON.stringify(outfit, null, 2)}
              </Box>
            </Box>
          </>
        ) : (
          <Alert severity="info">
            {loading ? 'Loading...' : 'No outfits found'}
          </Alert>
        )}
      </Paper>
    </Container>
  );
}
