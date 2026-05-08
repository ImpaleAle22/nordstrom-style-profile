/**
 * Batch Input Component
 *
 * Reusable input field for applying batches across different tools.
 * Detects batch type automatically and triggers appropriate action.
 */

'use client';

import { useState } from 'react';
import { Box, TextField, Button, Alert, Chip } from '@mui/material';
import { Search as SearchIcon } from '@mui/icons-material';

interface BatchInputProps {
  onApply: (batchIds: string[], batchInfo: BatchInfo) => void;
  placeholder?: string;
  acceptedTypes?: ('recipes' | 'outfits' | 'products')[];
}

interface BatchInfo {
  batchId: string;
  type: 'recipes' | 'outfits' | 'products';
  count: number;
  label?: string;
}

export default function BatchInput({
  onApply,
  placeholder = 'Enter batch number (e.g., 0001)',
  acceptedTypes = ['recipes', 'outfits', 'products'],
}: BatchInputProps) {
  const [batchNumber, setBatchNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [appliedBatch, setAppliedBatch] = useState<BatchInfo | null>(null);

  const handleApply = async () => {
    if (!batchNumber.trim()) {
      setError('Please enter a batch number');
      return;
    }

    setLoading(true);
    setError(null);
    setAppliedBatch(null);

    try {
      // Load batches from API
      const response = await fetch('/api/batches');
      if (!response.ok) {
        throw new Error('Failed to load batches from server');
      }

      const data = await response.json();
      const batchId = batchNumber.padStart(4, '0');
      const batch = data.batches[batchId];

      if (!batch) {
        throw new Error(`Batch ${batchNumber} not found`);
      }

      // Check if batch type is accepted
      if (!acceptedTypes.includes(batch.type)) {
        throw new Error(`This tool only accepts ${acceptedTypes.join(', ')} batches. Batch ${batchId} is type: ${batch.type}`);
      }

      const batchInfo: BatchInfo = {
        batchId: batchId,
        type: batch.type,
        count: batch.count,
        label: batch.label,
      };

      setAppliedBatch(batchInfo);
      onApply(batch.ids, batchInfo);
    } catch (err) {
      console.error('Batch load error:', err);
      setError(err instanceof Error ? err.message : 'Failed to load batch');
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setBatchNumber('');
    setError(null);
    setAppliedBatch(null);
    onApply([], null as any);
  };

  return (
    <Box sx={{ mb: 2 }}>
      <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
        <TextField
          size="small"
          value={batchNumber}
          onChange={(e) => setBatchNumber(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleApply()}
          placeholder={placeholder}
          disabled={loading}
          sx={{ width: 200 }}
        />
        <Button
          variant="contained"
          onClick={handleApply}
          disabled={loading || !batchNumber.trim()}
          startIcon={<SearchIcon />}
        >
          Apply Batch
        </Button>
        {appliedBatch && (
          <Button variant="outlined" onClick={handleClear}>
            Clear
          </Button>
        )}
      </Box>

      {error && (
        <Alert severity="error" sx={{ mt: 1 }}>
          {error}
        </Alert>
      )}

      {appliedBatch && (
        <Alert severity="success" sx={{ mt: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            Batch {appliedBatch.batchId} applied
            <Chip label={appliedBatch.type} size="small" color="primary" />
            <Chip label={`${appliedBatch.count} items`} size="small" variant="outlined" />
            {appliedBatch.label && <span>— {appliedBatch.label}</span>}
          </Box>
        </Alert>
      )}
    </Box>
  );
}
