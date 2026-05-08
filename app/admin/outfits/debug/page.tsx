'use client';

/**
 * Debug Outfit Image URLs
 */

import { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Paper,
  Button,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
} from '@mui/material';
import { Refresh as RefreshIcon } from '@mui/icons-material';
import { getAllOutfits } from '@/lib/outfit-storage';

export default function DebugPage() {
  const [imageUrls, setImageUrls] = useState<Array<{url: string, count: number}>>([]);
  const [sampleUrls, setSampleUrls] = useState<string[]>([]);
  const [outfitCount, setOutfitCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const loadImageUrls = async () => {
    setLoading(true);
    try {
      const outfits = await getAllOutfits();
      setOutfitCount(outfits.length);

      // Extract all imageUrls and count occurrences
      const urlMap = new Map<string, number>();
      const samples: string[] = [];

      outfits.forEach(outfit => {
        outfit.items.forEach(item => {
          const url = item.product.imageUrl;
          if (url) {
            // Extract just the path part to see patterns
            const pattern = url.includes('product-images-unified/')
              ? 'product-images-unified/'
              : url.includes('product-images/')
              ? 'product-images/'
              : 'other';

            urlMap.set(pattern, (urlMap.get(pattern) || 0) + 1);

            // Collect sample URLs (first 5 of each pattern)
            if (samples.length < 10) {
              samples.push(url);
            }
          }
        });
      });

      const urls = Array.from(urlMap.entries()).map(([url, count]) => ({ url, count }));
      setImageUrls(urls);
      setSampleUrls(samples);
    } catch (error) {
      console.error('Error loading outfits:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadImageUrls();
  }, []);

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Paper sx={{ p: 4 }}>
        <Typography variant="h4" gutterBottom>
          Debug Image URLs
        </Typography>
        <Typography variant="body2" color="text.secondary" paragraph>
          Check what image URL patterns are in the stored outfits
        </Typography>

        <Button
          variant="outlined"
          startIcon={<RefreshIcon />}
          onClick={loadImageUrls}
          disabled={loading}
          sx={{ mb: 3 }}
        >
          Refresh
        </Button>

        {outfitCount > 0 && (
          <Alert severity="info" sx={{ mb: 3 }}>
            IndexedDB contains <strong>{outfitCount.toLocaleString()}</strong> outfits
          </Alert>
        )}

        {imageUrls.length > 0 ? (
          <>
            <Table sx={{ mb: 4 }}>
              <TableHead>
                <TableRow>
                  <TableCell>URL Pattern</TableCell>
                  <TableCell align="right">Count</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {imageUrls.map((item, idx) => (
                  <TableRow key={idx}>
                    <TableCell>
                      <code>{item.url}</code>
                    </TableCell>
                    <TableCell align="right">
                      {item.count.toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <Typography variant="h6" gutterBottom>
              Sample URLs
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {sampleUrls.map((url, idx) => (
                <Box key={idx}>
                  <code style={{ fontSize: '11px', wordBreak: 'break-all' }}>{url}</code>
                  <Box sx={{ mt: 1, mb: 2 }}>
                    <img
                      src={url}
                      alt={`Sample ${idx}`}
                      style={{ maxWidth: '200px', maxHeight: '200px', objectFit: 'contain', background: '#f5f5f5' }}
                      onError={(e) => {
                        e.currentTarget.style.border = '2px solid red';
                      }}
                      onLoad={(e) => {
                        e.currentTarget.style.border = '2px solid green';
                      }}
                    />
                  </Box>
                </Box>
              ))}
            </Box>
          </>
        ) : (
          <Alert severity="info">
            {loading ? 'Loading...' : 'No data'}
          </Alert>
        )}
      </Paper>
    </Container>
  );
}
