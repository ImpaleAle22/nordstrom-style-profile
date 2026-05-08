'use client';

import { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
  TextField,
  Button,
  Chip,
  Stack,
  LinearProgress,
  Alert,
  TablePagination,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
} from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import { getAllOutfits } from '@/lib/indexeddb-storage';

interface ProductUsage {
  id: string;
  title: string;
  brand: string;
  price: number;
  department: string;
  imageUrl: string;
  count: number;
  roles: string[];
}

type SortField = 'count' | 'title' | 'brand' | 'price';
type SortDirection = 'asc' | 'desc';

export default function AnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<ProductUsage[]>([]);
  const [sortField, setSortField] = useState<SortField>('count');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [searchQuery, setSearchQuery] = useState('');
  const [totalOutfits, setTotalOutfits] = useState(0);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(50);

  useEffect(() => {
    async function loadData() {
      try {
        console.log('Loading outfits for product analysis...');
        const outfits = await getAllOutfits();
        setTotalOutfits(outfits.length);

        console.log(`Analyzing ${outfits.length} outfits...`);

        // Debug: Check first outfit's image paths
        if (outfits.length > 0 && outfits[0].items.length > 0) {
          console.log('Sample product imageUrl:', outfits[0].items[0].product.imageUrl);
        }

        // Count product usage
        const productUsage = new Map<string, ProductUsage>();

        outfits.forEach((outfit) => {
          outfit.items.forEach((item) => {
            const product = item.product;
            const key = product.id;

            if (!productUsage.has(key)) {
              productUsage.set(key, {
                id: product.id,
                title: product.title,
                brand: product.brand,
                price: product.price,
                department: product.department,
                imageUrl: product.imageUrl,
                count: 0,
                roles: [],
              });
            }

            const usage = productUsage.get(key)!;
            usage.count++;
            if (!usage.roles.includes(item.role)) {
              usage.roles.push(item.role);
            }
          });
        });

        const sortedProducts = Array.from(productUsage.values()).sort(
          (a, b) => b.count - a.count
        );

        setProducts(sortedProducts);
        console.log(`Found ${sortedProducts.length} unique products`);
      } catch (error) {
        console.error('Error loading analytics:', error);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  const handleSort = (field: SortField) => {
    const isAsc = sortField === field && sortDirection === 'asc';
    setSortDirection(isAsc ? 'desc' : 'asc');
    setSortField(field);
    setPage(0); // Reset to first page when sorting
  };

  const handleChangePage = (_event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0); // Reset to first page when changing rows per page
  };

  const exportToCSV = () => {
    const csv = [
      'Rank,Product ID,Brand,Title,Department,Price,Outfit Count,Roles',
      ...filteredAndSortedProducts.map((p, idx) =>
        `${idx + 1},"${p.id}","${p.brand}","${p.title}","${p.department}",${p.price},${p.count},"${p.roles.join(', ')}"`
      ),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `product-usage-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Filter and sort products
  const filteredAndSortedProducts = products
    .filter((p) => {
      if (!searchQuery) return true;
      const query = searchQuery.toLowerCase();
      return (
        p.title.toLowerCase().includes(query) ||
        p.brand.toLowerCase().includes(query)
      );
    })
    .sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'count':
          comparison = a.count - b.count;
          break;
        case 'title':
          comparison = a.title.localeCompare(b.title);
          break;
        case 'brand':
          comparison = a.brand.localeCompare(b.brand);
          break;
        case 'price':
          comparison = a.price - b.price;
          break;
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });

  // Paginated results
  const paginatedResults = filteredAndSortedProducts.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  if (loading) {
    return (
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <LinearProgress />
        <Typography sx={{ mt: 2, textAlign: 'center' }}>
          Loading product analytics...
        </Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom>
          📊 Product Usage Analytics
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Analyze which products appear most frequently in generated outfits
        </Typography>
      </Box>

      {/* Stats */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Stack direction="row" spacing={4} flexWrap="wrap">
          <Box>
            <Typography variant="h3" color="primary">
              {totalOutfits.toLocaleString()}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Total Outfits
            </Typography>
          </Box>
          <Box>
            <Typography variant="h3" color="primary">
              {products.length.toLocaleString()}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Unique Products
            </Typography>
          </Box>
          {products.length > 0 && (
            <>
              <Box>
                <Typography variant="h3" color="primary">
                  {products[0].count}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Most Used Product
                </Typography>
              </Box>
              <Box>
                <Typography variant="h3" color="primary">
                  {Math.round(totalOutfits / products.length)}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Avg Uses Per Product
                </Typography>
              </Box>
            </>
          )}
        </Stack>
      </Paper>

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Stack direction="row" spacing={2} alignItems="center">
          <TextField
            label="Search products"
            variant="outlined"
            size="small"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setPage(0); // Reset to first page when searching
            }}
            sx={{ flexGrow: 1 }}
          />
          <Button
            variant="contained"
            startIcon={<DownloadIcon />}
            onClick={exportToCSV}
          >
            Export CSV
          </Button>
        </Stack>
      </Paper>

      {/* Results count */}
      {searchQuery && (
        <Alert severity="info" sx={{ mb: 2 }}>
          Showing {filteredAndSortedProducts.length} of {products.length} products
        </Alert>
      )}

      {/* Table */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Rank</TableCell>
              <TableCell>Image</TableCell>
              <TableCell>
                <TableSortLabel
                  active={sortField === 'brand'}
                  direction={sortField === 'brand' ? sortDirection : 'asc'}
                  onClick={() => handleSort('brand')}
                >
                  Brand
                </TableSortLabel>
              </TableCell>
              <TableCell>
                <TableSortLabel
                  active={sortField === 'title'}
                  direction={sortField === 'title' ? sortDirection : 'asc'}
                  onClick={() => handleSort('title')}
                >
                  Product
                </TableSortLabel>
              </TableCell>
              <TableCell>Roles</TableCell>
              <TableCell>Department</TableCell>
              <TableCell align="right">
                <TableSortLabel
                  active={sortField === 'price'}
                  direction={sortField === 'price' ? sortDirection : 'asc'}
                  onClick={() => handleSort('price')}
                >
                  Price
                </TableSortLabel>
              </TableCell>
              <TableCell align="right">
                <TableSortLabel
                  active={sortField === 'count'}
                  direction={sortField === 'count' ? sortDirection : 'asc'}
                  onClick={() => handleSort('count')}
                >
                  Outfit Count
                </TableSortLabel>
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {paginatedResults.map((product, index) => (
              <TableRow key={product.id} hover>
                <TableCell>{page * rowsPerPage + index + 1}</TableCell>
                <TableCell>
                  <Box
                    component="img"
                    src={product.imageUrl}
                    alt={product.title}
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="50" height="67" viewBox="0 0 50 67"%3E%3Crect fill="%23eee" width="50" height="67"/%3E%3Ctext x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="12" fill="%23999"%3ENo Image%3C/text%3E%3C/svg%3E';
                    }}
                    sx={{
                      width: 50,
                      height: 67,
                      objectFit: 'cover',
                      borderRadius: 1,
                      bgcolor: 'grey.100',
                    }}
                  />
                </TableCell>
                <TableCell>{product.brand}</TableCell>
                <TableCell>
                  <Typography variant="body2">{product.title}</Typography>
                </TableCell>
                <TableCell>
                  <Stack direction="row" spacing={0.5} flexWrap="wrap">
                    {product.roles.map((role) => (
                      <Chip key={role} label={role} size="small" />
                    ))}
                  </Stack>
                </TableCell>
                <TableCell>
                  <Chip label={product.department} size="small" />
                </TableCell>
                <TableCell align="right">${product.price}</TableCell>
                <TableCell align="right">
                  <Typography variant="body1" fontWeight="bold">
                    {product.count}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {((product.count / totalOutfits) * 100).toFixed(1)}%
                  </Typography>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <TablePagination
          rowsPerPageOptions={[25, 50, 100, 200]}
          component="div"
          count={filteredAndSortedProducts.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
        />
      </TableContainer>
    </Container>
  );
}
