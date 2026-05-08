'use client';

/**
 * CLIP Search Interactive Demo
 * Search for visually similar products
 */

import { useState } from 'react';

export default function ClipSearchDemo() {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  const [error, setError] = useState('');
  const [imageErrors, setImageErrors] = useState<Set<string>>(new Set());

  const exampleQueries = [
    'Coastal grandmother cardigan',
    'Boardroom but make it interesting',
    'Black turtleneck minimalist',
    'Romantic pink dress',
    'Sleek leather boots edgy',
    'Vintage denim jacket',
    'Effortless weekend brunch',
    'Downtown gallery opening',
  ];

  const handleSearch = async (searchQuery?: string) => {
    const queryToUse = searchQuery || query;
    if (!queryToUse.trim()) return;

    if (searchQuery) setQuery(searchQuery);

    setLoading(true);
    setError('');
    setResults([]);
    setImageErrors(new Set());

    try {
      const response = await fetch('/api/clip-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: queryToUse, limit: 12 }),
      });

      if (!response.ok) {
        throw new Error('Search failed');
      }

      const data = await response.json();
      setResults(data.results || []);

      // Show info message if using mock data
      if (data.mock) {
        setError(data.message || 'Using demo data');
      }
    } catch (err) {
      setError('Search service temporarily unavailable. Showing concept with demo data.');
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleImageError = (productId: string) => {
    setImageErrors(prev => new Set(prev).add(productId));
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Intro Text */}
      <div className="max-w-3xl mx-auto text-center mb-6">
        <p className="text-xl text-gray-700 mb-4">
          Type a concept — not a keyword. A feeling.
        </p>
        {/* Example Query Pills */}
        <div className="flex flex-wrap gap-3 justify-center mb-6">
          {exampleQueries.map((example) => (
            <button
              key={example}
              onClick={() => handleSearch(example)}
              disabled={loading}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-full text-gray-700 transition-colors disabled:opacity-50 text-sm"
            >
              "{example}"
            </button>
          ))}
        </div>
      </div>

      {/* Search Box */}
      <div className="mb-6">
        <div className="flex gap-3">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="Describe what you're looking for..."
            className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-gray-500"
          />
          <button
            onClick={() => handleSearch()}
            disabled={loading || !query.trim()}
            className="px-8 py-3 bg-black text-white rounded-lg font-medium hover:bg-gray-900 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {loading ? 'Searching...' : 'Search'}
          </button>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
            <p className="text-sm text-blue-800">
              🔥 Model warming up... This first search may take a moment. Subsequent searches will be much faster!
            </p>
          </div>
          <div className="grid grid-cols-4 gap-4">
            {[...Array(12)].map((_, i) => (
              <div key={i} className="bg-white rounded-lg border border-gray-200 p-3 animate-pulse">
                <div className="aspect-[2/3] bg-gray-200 rounded-lg mb-3"></div>
                <div className="h-4 bg-gray-200 rounded mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-2/3"></div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && !loading && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <p className="text-sm text-yellow-800">{error}</p>
        </div>
      )}

      {/* Results */}
      {results.length > 0 && !loading && (
        <div>
          <div className="grid grid-cols-4 gap-4">
            {results.map((result, index) => (
              <div
                key={result.productId || index}
                className="bg-white rounded-lg border border-gray-200 p-3 hover:border-gray-400 transition-colors"
              >
                {/* Product image */}
                {result.imageUrl && !imageErrors.has(result.productId) ? (
                  <div className="aspect-[2/3] bg-gray-100 rounded-lg mb-3 overflow-hidden relative">
                    <img
                      src={result.imageUrl}
                      alt={result.title || 'Product'}
                      className="w-full h-full object-cover"
                      onError={() => handleImageError(result.productId)}
                      loading="lazy"
                    />
                  </div>
                ) : (
                  <div className="aspect-[2/3] bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg mb-3 flex flex-col items-center justify-center p-4">
                    <div className="text-4xl mb-2">👕</div>
                    <p className="text-xs text-gray-500 text-center">Image not available</p>
                  </div>
                )}
                <p className="text-xs font-medium truncate mb-1" title={result.title}>
                  {result.title || `Product ${index + 1}`}
                </p>
                {result.brand && (
                  <p className="text-xs text-gray-500 truncate mb-1">{result.brand}</p>
                )}
                <div className="flex items-center justify-between">
                  {result.price && (
                    <p className="text-xs font-semibold text-gray-700">${result.price}</p>
                  )}
                  {result.score && (
                    <p className="text-xs text-gray-400">
                      {(result.score * 100).toFixed(0)}%
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Explanation */}
      {!results.length && !loading && (
        <div className="bg-blue-50 rounded-xl border border-blue-200 p-6">
          <h3 className="font-semibold mb-3">How CLIP Search Works</h3>
          <ul className="space-y-2 text-sm text-gray-700">
            <li className="flex items-start gap-2">
              <span className="text-blue-600 mt-1">•</span>
              <span>
                <strong>Visual embeddings:</strong> Every product is encoded into a high-dimensional vector space
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 mt-1">•</span>
              <span>
                <strong>Similarity matching:</strong> Finds products closest to your query in embedding space
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 mt-1">•</span>
              <span>
                <strong>Beyond keywords:</strong> Understands style, vibe, and visual characteristics
              </span>
            </li>
          </ul>
        </div>
      )}
    </div>
  );
}
