'use client';

/**
 * Product Inventory Browser
 *
 * Browse all 49,953 products with server-side filtering and pagination
 * - AI-tagged vs untagged (visionMetadata presence)
 * - Department, product type
 * - Search products
 *
 * WARNING: Master file is 1.2GB - uses streaming API with server-side pagination
 */

import { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Paper,
  Grid,
  Card,
  CardMedia,
  CardContent,
  Chip,
  Stack,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Tabs,
  Tab,
  LinearProgress,
  Pagination,
} from '@mui/material';
import {
  Inventory as ProductIcon,
  CheckCircle as ScannedIcon,
  Warning as UnscannedIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';

interface Product {
  productId: string;
  title: string;
  brand: string;
  price: number;
  department: string;
  imageUrl: string;
  colors?: string[];
  materials?: string[];
  productType1?: string;
  productType2?: string;
  productType3?: string;
  productType4?: string;
  visionMetadata?: {
    dominantColors?: string[];
    patterns?: string[];
    materials?: string[];
    analyzedAt?: string;
    [key: string]: any;
  };
}

type FilterTab = 'all' | 'ai-tagged' | 'untagged';

export default function ProductCoveragePage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalProducts, setTotalProducts] = useState(0);
  const [filteredCount, setFilteredCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // Filters
  const [filterTab, setFilterTab] = useState<FilterTab>('all');
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');
  const [type1Filter, setType1Filter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Pagination
  const [page, setPage] = useState(1);
  const itemsPerPage = 24;

  useEffect(() => {
    loadProducts();
  }, [page, filterTab, departmentFilter, type1Filter, searchQuery]);

  async function loadProducts() {
    setLoading(true);
    try {
      // Build query params
      const params = new URLSearchParams({
        page: page.toString(),
        limit: itemsPerPage.toString(),
      });

      if (departmentFilter !== 'all') {
        params.set('department', departmentFilter);
      }

      if (type1Filter !== 'all') {
        params.set('productType', type1Filter);
      }

      if (filterTab === 'ai-tagged') {
        params.set('aiTagged', 'true');
      } else if (filterTab === 'untagged') {
        params.set('aiTagged', 'false');
      }

      if (searchQuery) {
        params.set('search', searchQuery);
      }

      const response = await fetch(`/api/products?${params.toString()}`);

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to load products');
      }

      const data = await response.json();

      setProducts(data.products);
      setTotalProducts(data.stats.totalProducts);
      setFilteredCount(data.pagination.total);
      setTotalPages(data.pagination.totalPages);
    } catch (error) {
      console.error('Error loading products:', error);
      alert(`Failed to load products: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  }

  // Calculate stats (from totals, not from loaded products array)
  const stats = {
    total: totalProducts,
    filtered: filteredCount,
    aiTagged: 0, // Would need separate API call to get these
    untagged: 0,
  };

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Box>
            <Typography variant="h4" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <ProductIcon color="primary" fontSize="large" />
              Product Inventory
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Browse {stats.total.toLocaleString()} products with server-side filtering (1.2GB dataset)
            </Typography>
          </Box>
          <Button startIcon={<RefreshIcon />} onClick={() => loadProducts()}>
            Refresh
          </Button>
        </Box>

        {/* Stats */}
        <Paper sx={{ p: 2 }}>
          <Stack direction="row" spacing={2} flexWrap="wrap">
            <Chip label={`Total: ${stats.total.toLocaleString()}`} />
            {stats.filtered !== stats.total && (
              <Chip label={`Filtered: ${stats.filtered.toLocaleString()}`} color="primary" />
            )}
            <Chip label={`Page ${page} of ${totalPages.toLocaleString()}`} variant="outlined" />
          </Stack>
        </Paper>
      </Box>

      {/* AI Scan Status Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Tabs value={filterTab} onChange={(_, val) => { setFilterTab(val); setPage(1); }}>
          <Tab label="All Products" value="all" />
          <Tab
            label="AI-Tagged"
            value="ai-tagged"
            icon={<ScannedIcon />}
            iconPosition="start"
          />
          <Tab
            label="Untagged"
            value="untagged"
            icon={<UnscannedIcon />}
            iconPosition="start"
          />
        </Tabs>
      </Paper>

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Stack spacing={2}>
          <Stack direction="row" spacing={2} flexWrap="wrap">
            <FormControl size="small" sx={{ minWidth: 180 }}>
              <InputLabel>Department</InputLabel>
              <Select
                value={departmentFilter}
                label="Department"
                onChange={(e) => { setDepartmentFilter(e.target.value); setPage(1); }}
              >
                <MenuItem value="all">All Departments</MenuItem>
                <MenuItem value="Womens">Womens</MenuItem>
                <MenuItem value="Mens">Mens</MenuItem>
              </Select>
            </FormControl>

            <FormControl size="small" sx={{ minWidth: 180 }}>
              <InputLabel>Product Type</InputLabel>
              <Select
                value={type1Filter}
                label="Product Type"
                onChange={(e) => { setType1Filter(e.target.value); setPage(1); }}
              >
                <MenuItem value="all">All Types</MenuItem>
                <MenuItem value="Tops">Tops</MenuItem>
                <MenuItem value="Bottoms">Bottoms</MenuItem>
                <MenuItem value="Dresses">Dresses</MenuItem>
                <MenuItem value="Shoes">Shoes</MenuItem>
                <MenuItem value="Outerwear">Outerwear</MenuItem>
                <MenuItem value="Bags">Bags</MenuItem>
                <MenuItem value="Accessories">Accessories</MenuItem>
              </Select>
            </FormControl>
          </Stack>

          <TextField
            size="small"
            label="Search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                setPage(1);
                loadProducts();
              }
            }}
            placeholder="Product name, brand, or type... (press Enter to search)"
            fullWidth
          />

          <Typography variant="body2" color="text.secondary">
            Showing {products.length} products (page {page} of {totalPages.toLocaleString()})
          </Typography>
        </Stack>
      </Paper>

      {/* Loading State */}
      {loading && (
        <Box sx={{ mb: 4 }}>
          <LinearProgress />
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1, textAlign: 'center' }}>
            Streaming and filtering products...
          </Typography>
        </Box>
      )}

      {/* Product Grid */}
      {!loading && (
        <>
          <Grid container spacing={2} sx={{ mb: 4 }}>
            {products.map(product => (
              <Grid item xs={12} sm={6} md={4} lg={3} xl={2} key={product.productId}>
                <Card
                  sx={{
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    position: 'relative',
                  }}
                >
                  {/* AI-Tagged badge */}
                  {product.visionMetadata && (
                    <Chip
                      label="AI"
                      color="success"
                      size="small"
                      sx={{
                        position: 'absolute',
                        top: 8,
                        right: 8,
                        zIndex: 1,
                      }}
                    />
                  )}

                  {/* Product Image */}
                  <CardMedia
                    component="img"
                    image={product.imageUrl}
                    alt={product.title}
                    sx={{
                      height: 200,
                      objectFit: 'contain',
                      bgcolor: 'grey.50',
                      p: 2,
                    }}
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200"%3E%3Crect fill="%23eee" width="200" height="200"/%3E%3Ctext x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="14" fill="%23999"%3ENo Image%3C/text%3E%3C/svg%3E';
                    }}
                  />

                  <CardContent sx={{ flexGrow: 1 }}>
                    {/* Brand */}
                    <Typography variant="caption" color="text.secondary" display="block">
                      {product.brand}
                    </Typography>

                    {/* Title */}
                    <Typography
                      variant="body2"
                      gutterBottom
                      sx={{
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                        minHeight: 40,
                        mb: 1,
                      }}
                    >
                      {product.title}
                    </Typography>

                    {/* Price */}
                    <Typography variant="h6" color="primary" gutterBottom>
                      ${product.price}
                    </Typography>

                    {/* Product Type */}
                    <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap sx={{ mb: 1 }}>
                      {product.productType1 && (
                        <Chip label={product.productType1} size="small" variant="outlined" />
                      )}
                      {product.productType2 && (
                        <Chip label={product.productType2} size="small" variant="outlined" sx={{ fontSize: '0.65rem' }} />
                      )}
                    </Stack>

                    {/* Vision Metadata */}
                    {product.visionMetadata && (
                      <Box sx={{ mt: 1 }}>
                        {product.visionMetadata.dominantColors && product.visionMetadata.dominantColors.length > 0 && (
                          <Typography variant="caption" color="text.secondary" display="block">
                            Colors: {product.visionMetadata.dominantColors.slice(0, 3).join(', ')}
                          </Typography>
                        )}
                        {product.visionMetadata.patterns && product.visionMetadata.patterns.length > 0 && (
                          <Typography variant="caption" color="text.secondary" display="block">
                            Patterns: {product.visionMetadata.patterns.slice(0, 2).join(', ')}
                          </Typography>
                        )}
                      </Box>
                    )}

                    {/* Department */}
                    <Typography variant="caption" color="text.disabled" display="block" sx={{ mt: 1 }}>
                      {product.department}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>

          {/* Pagination */}
          {totalPages > 1 && (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
              <Pagination
                count={totalPages}
                page={page}
                onChange={(_, value) => {
                  setPage(value);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                color="primary"
                showFirstButton
                showLastButton
                size="large"
              />
            </Box>
          )}

          {products.length === 0 && !loading && (
            <Paper sx={{ p: 4, textAlign: 'center' }}>
              <Typography variant="body1" color="text.secondary">
                No products match the current filters
              </Typography>
            </Paper>
          )}
        </>
      )}
    </Container>
  );
}
