'use client';

import { Container, Typography, Box, Grid, Card, CardContent, Button, Stack } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import RestaurantIcon from '@mui/icons-material/Restaurant';
import CategoryIcon from '@mui/icons-material/Category';
import WarningIcon from '@mui/icons-material/Warning';
import { useState, useEffect } from 'react';
import { getProductGapCount } from '../lib/indexeddb-storage';

export default function Home() {
  const [gapCount, setGapCount] = useState<number>(0);

  useEffect(() => {
    async function loadGapCount() {
      try {
        const count = await getProductGapCount('active');
        setGapCount(count);
      } catch (error) {
        console.error('Failed to load gap count:', error);
      }
    }
    loadGapCount();
  }, []);
  return (
    <Container maxWidth="lg" sx={{ py: 8 }}>
      <Box sx={{ mb: 6 }}>
        <Typography variant="h1" gutterBottom>
          Recipe Builder
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Create and manage content recipes for personalized shopping edits
        </Typography>
      </Box>

      <Grid container spacing={2.5}>
        {/* Quick Actions */}
        <Grid item xs={12}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="h3" gutterBottom>
                Quick Actions
              </Typography>
              <Stack direction="row" spacing={2} sx={{ mt: 3 }}>
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  size="large"
                  href="/recipes/outfit/new"
                >
                  New Outfit Recipe
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<AddIcon />}
                  size="large"
                  href="/recipes/campaign/new"
                >
                  New Campaign Recipe
                </Button>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        {/* Stats Cards */}
        <Grid item xs={12} md={6}>
          <Card variant="outlined">
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 2 }}>
                <RestaurantIcon color="primary" sx={{ fontSize: 32 }} />
                <Typography variant="h3">Recipes</Typography>
              </Stack>
              <Typography variant="h2" color="primary">
                12
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Total recipes across all types
              </Typography>
              <Button sx={{ mt: 2 }} href="/recipes">
                View All Recipes
              </Button>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card variant="outlined" sx={{ borderColor: gapCount > 0 ? 'warning.main' : undefined }}>
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 2 }}>
                <WarningIcon color={gapCount > 0 ? 'warning' : 'disabled'} sx={{ fontSize: 32 }} />
                <Typography variant="h3">Product Gaps</Typography>
              </Stack>
              <Typography variant="h2" color={gapCount > 0 ? 'warning.main' : 'text.secondary'}>
                {gapCount}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Missing products detected during recipe cooking
              </Typography>
              <Button sx={{ mt: 2 }} href="/product-gaps" color={gapCount > 0 ? 'warning' : 'inherit'}>
                {gapCount > 0 ? 'Review Gaps' : 'View Dashboard'}
              </Button>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Container>
  );
}
