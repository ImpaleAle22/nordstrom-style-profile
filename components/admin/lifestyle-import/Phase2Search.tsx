'use client';

import { useState } from 'react';
import { CoverageMatrix, generateGapQueries } from '@/lib/coverage-calculator';
import { StockImage } from '@/lib/stock-image-types';

interface Phase2SearchProps {
  coverage: CoverageMatrix[];
  onSearchComplete: (results: StockImage[]) => void;
  onBack: () => void;
}

export default function Phase2Search({ coverage, onSearchComplete, onBack }: Phase2SearchProps) {
  const [manualQuery, setManualQuery] = useState('');
  const [sources, setSources] = useState<('pexels' | 'unsplash')[]>(['pexels', 'unsplash']);
  const [perPage, setPerPage] = useState(30);
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<StockImage[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [metadata, setMetadata] = useState<any>(null);

  const handleManualSearch = async () => {
    if (!manualQuery.trim()) return;

    setSearching(true);
    setError(null);

    try {
      const response = await fetch('/api/stock-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: manualQuery,
          sources,
          perPage
        })
      });

      if (!response.ok) {
        throw new Error(`Search failed: ${response.statusText}`);
      }

      const data = await response.json();
      setSearchResults(data.results);
      setMetadata(data.metadata);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed');
    } finally {
      setSearching(false);
    }
  };

  const handleAutoSearch = async () => {
    const queries = generateGapQueries(coverage);

    if (queries.length === 0) {
      setError('No coverage gaps found. All pillars have sufficient images.');
      return;
    }

    setSearching(true);
    setError(null);

    try {
      const allResults: StockImage[] = [];

      // Search sequentially with delay to respect rate limits
      for (let i = 0; i < Math.min(queries.length, 5); i++) {
        const query = queries[i];
        console.log(`[Auto Search] Query ${i + 1}/${Math.min(queries.length, 5)}: ${query}`);

        const response = await fetch('/api/stock-search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query,
            sources,
            perPage: 10 // Lower per-page for auto-search to get variety
          })
        });

        if (response.ok) {
          const data = await response.json();
          allResults.push(...data.results);
        }

        // Delay between searches to respect rate limits (15 seconds)
        if (i < Math.min(queries.length, 5) - 1) {
          await new Promise(resolve => setTimeout(resolve, 15000));
        }
      }

      // Remove duplicates by ID
      const uniqueResults = Array.from(
        new Map(allResults.map(img => [img.id, img])).values()
      );

      setSearchResults(uniqueResults);
      setMetadata({
        totalCount: uniqueResults.length,
        queriesExecuted: Math.min(queries.length, 5)
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Auto-search failed');
    } finally {
      setSearching(false);
    }
  };

  const handleNext = () => {
    if (searchResults.length === 0) {
      setError('No search results to select from. Please search first.');
      return;
    }
    onSearchComplete(searchResults);
  };

  const toggleSource = (source: 'pexels' | 'unsplash') => {
    if (sources.includes(source)) {
      if (sources.length > 1) {
        setSources(sources.filter(s => s !== source));
      }
    } else {
      setSources([...sources, source]);
    }
  };

  return (
    <div className="space-y-8">
      {/* Search Controls */}
      <div className="bg-slate-800/50 rounded-lg p-6 border border-slate-700">
        <h2 className="text-xl font-semibold mb-4">Search Stock Photos</h2>

        {/* Source Selection */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-slate-300 mb-3">
            Image Sources
          </label>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={sources.includes('pexels')}
                onChange={() => toggleSource('pexels')}
                className="w-5 h-5 rounded border-slate-600 bg-slate-700 text-blue-500 focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-slate-200">Pexels (200/hr)</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={sources.includes('unsplash')}
                onChange={() => toggleSource('unsplash')}
                className="w-5 h-5 rounded border-slate-600 bg-slate-700 text-blue-500 focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-slate-200">Unsplash (50/hr)</span>
            </label>
          </div>
        </div>

        {/* Results Per Page */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-slate-300 mb-3">
            Results Per Query
          </label>
          <input
            type="range"
            min="10"
            max="50"
            step="10"
            value={perPage}
            onChange={(e) => setPerPage(Number(e.target.value))}
            className="w-full"
          />
          <div className="text-center text-slate-400 text-sm mt-2">{perPage} images</div>
        </div>

        {/* Manual Search */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-slate-300 mb-3">
            Manual Search Query
          </label>
          <div className="flex gap-3">
            <input
              type="text"
              value={manualQuery}
              onChange={(e) => setManualQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleManualSearch()}
              placeholder="e.g., romantic fashion woman portrait white background"
              className="flex-1 px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={handleManualSearch}
              disabled={searching || !manualQuery.trim()}
              className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-slate-600 disabled:cursor-not-allowed transition font-semibold"
            >
              {searching ? 'Searching...' : 'Search'}
            </button>
          </div>
        </div>

        {/* Auto Search */}
        <div className="pt-6 border-t border-slate-700">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-sm font-medium text-slate-300">Auto-Search for Gaps</h3>
              <p className="text-sm text-slate-400 mt-1">
                Automatically searches for images to fill coverage gaps (5 queries × 15s delay)
              </p>
            </div>
            <button
              onClick={handleAutoSearch}
              disabled={searching}
              className="px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:bg-slate-600 disabled:cursor-not-allowed transition font-semibold"
            >
              {searching ? 'Searching...' : 'Auto-Search'}
            </button>
          </div>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-500/10 border border-red-500 rounded-lg p-4">
          <p className="text-red-300">{error}</p>
        </div>
      )}

      {/* Search Results Preview */}
      {searchResults.length > 0 && (
        <div className="bg-slate-800/50 rounded-lg p-6 border border-slate-700">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">
              Search Results ({searchResults.length} images)
            </h3>
            {metadata && (
              <div className="text-sm text-slate-400">
                {metadata.pexelsCount !== undefined && (
                  <span className="mr-4">Pexels: {metadata.pexelsCount}</span>
                )}
                {metadata.unsplashCount !== undefined && (
                  <span>Unsplash: {metadata.unsplashCount}</span>
                )}
              </div>
            )}
          </div>

          {/* Preview Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-6">
            {searchResults.slice(0, 12).map((img) => (
              <div key={img.id} className="relative aspect-[3/4] rounded-lg overflow-hidden border border-slate-700">
                <img
                  src={img.thumbnail}
                  alt={img.alt || 'Stock photo'}
                  className="w-full h-full object-cover"
                />
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2">
                  <div className="text-xs text-white/80 truncate">{img.source}</div>
                </div>
              </div>
            ))}
          </div>

          {searchResults.length > 12 && (
            <p className="text-center text-slate-400 text-sm">
              + {searchResults.length - 12} more images (view in selection phase)
            </p>
          )}
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between">
        <button
          onClick={onBack}
          className="px-6 py-3 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition"
        >
          ← Back to Coverage
        </button>
        <button
          onClick={handleNext}
          disabled={searchResults.length === 0}
          className="px-8 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-slate-600 disabled:cursor-not-allowed transition font-semibold"
        >
          Next: Select Images ({searchResults.length}) →
        </button>
      </div>
    </div>
  );
}
