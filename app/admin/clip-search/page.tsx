/**
 * CLIP Search Tester
 *
 * Quick interface to test CLIP semantic search queries
 * and see what products they return.
 */

'use client';

import { useState } from 'react';
import {
  Box,
  TextField,
  Button,
  Typography,
  Card,
  CardMedia,
  CardContent,
  Grid,
  Chip,
  Stack,
  CircularProgress,
  Alert,
  Paper,
} from '@mui/material';
import {
  Search as SearchIcon,
  Image as ImageIcon,
} from '@mui/icons-material';

interface Product {
  id: string;
  title: string;
  brand: string;
  price: number;
  imageUrl: string;
  colors: string[];
  department: string;
  productType1: string;
  productType2?: string;
  similarity?: number;
}

export default function ClipSearchPage() {
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<Product[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [searchTime, setSearchTime] = useState<number>(0);

  const handleSearch = async () => {
    if (!query.trim()) return;

    setSearching(true);
    setError(null);
    const startTime = Date.now();

    try {
      // Check if CLIP service is running
      const healthCheck = await fetch('http://localhost:5002/health');
      if (!healthCheck.ok) {
        throw new Error('CLIP search service not running (http://localhost:5002)');
      }

      // Perform search
      const response = await fetch(`http://localhost:5002/search?q=${encodeURIComponent(query)}&limit=20`);

      if (!response.ok) {
        throw new Error(`Search failed: ${response.status}`);
      }

      const data = await response.json();
      setResults(data.results || []);
      setSearchTime(Date.now() - startTime);
    } catch (err) {
      console.error('Search error:', err);
      setError(err instanceof Error ? err.message : 'Search failed');
      setResults([]);
    } finally {
      setSearching(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <Box sx={{ p: 4 }}>
      <Typography variant="h4" gutterBottom>
        CLIP Search Tester
      </Typography>
      <Typography variant="body1" color="text.secondary" paragraph>
        Test semantic product search queries to see what results are returned.
      </Typography>

      {/* Search Bar */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Stack direction="row" spacing={2} alignItems="flex-start">
          <TextField
            fullWidth
            label="Search Query"
            placeholder="e.g., floral midi dress, leather ankle boots, oversized blazer"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={searching}
            helperText="Enter a natural language description of what you're looking for"
          />
          <Button
            variant="contained"
            size="large"
            onClick={handleSearch}
            disabled={searching || !query.trim()}
            startIcon={searching ? <CircularProgress size={20} /> : <SearchIcon />}
            sx={{ minWidth: 120, height: 56 }}
          >
            {searching ? 'Searching...' : 'Search'}
          </Button>
        </Stack>

        {/* Quick test queries */}
        <Box sx={{ mt: 2 }}>
          <Typography variant="caption" color="text.secondary" sx={{ mr: 1 }}>
            Quick tests:
          </Typography>
          {[
            'white t-shirt',
            'black leather jacket',
            'floral summer dress',
            'high waisted jeans',
            'running sneakers',
          ].map((testQuery) => (
            <Chip
              key={testQuery}
              label={testQuery}
              size="small"
              onClick={() => setQuery(testQuery)}
              sx={{ mr: 0.5, mb: 0.5 }}
            />
          ))}
        </Box>
      </Paper>

      {/* Error */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
          {error.includes('not running') && (
            <Box sx={{ mt: 1 }}>
              <Typography variant="body2">
                Start the CLIP service: <code>cd services/clip-search && python3 app.py</code>
              </Typography>
            </Box>
          )}
        </Alert>
      )}

      {/* Results Stats */}
      {results.length > 0 && (
        <Box sx={{ mb: 2 }}>
          <Typography variant="body2" color="text.secondary">
            Found <strong>{results.length}</strong> results in <strong>{searchTime}ms</strong>
          </Typography>
        </Box>
      )}

      {/* Results Grid */}
      {results.length > 0 && (
        <Grid container spacing={2}>
          {results.map((product) => (
            <Grid item xs={12} sm={6} md={4} lg={3} key={product.id}>
              <Card>
                <CardMedia
                  component="img"
                  height="300"
                  image={product.imageUrl}
                  alt={product.title}
                  sx={{ objectFit: 'cover', bgcolor: 'grey.100' }}
                  onError={(e: any) => {
                    e.target.style.display = 'none';
                  }}
                />
                <CardContent>
                  <Stack spacing={1}>
                    <Typography variant="h6" fontSize="0.9rem" sx={{ height: 40, overflow: 'hidden' }}>
                      {product.title}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {product.brand}
                    </Typography>
                    <Typography variant="body1" fontWeight="bold">
                      ${product.price}
                    </Typography>
                    {product.similarity !== undefined && (
                      <Chip
                        label={`${(product.similarity * 100).toFixed(1)}% match`}
                        size="small"
                        color={product.similarity > 0.8 ? 'success' : product.similarity > 0.6 ? 'primary' : 'default'}
                      />
                    )}
                    <Stack direction="row" spacing={0.5} flexWrap="wrap">
                      <Chip label={product.department} size="small" variant="outlined" />
                      <Chip label={product.productType1} size="small" variant="outlined" />
                      {product.simplifiedColors?.slice(0, 2).map((color) => (
                        <Chip key={color} label={color} size="small" variant="outlined" />
                      ))}
                    </Stack>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Empty State */}
      {!searching && !error && results.length === 0 && query && (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <ImageIcon sx={{ fontSize: 64, color: 'text.disabled' }} />
          <Typography variant="h6" color="text.secondary">
            No results found
          </Typography>
        </Box>
      )}
    </Box>
  );
}
