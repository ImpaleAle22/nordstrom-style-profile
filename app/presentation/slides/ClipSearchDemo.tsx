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
    'black turtleneck sweater minimalist',
    'romantic pink dress date night',
    'casual denim jacket vintage',
    'sleek leather boots edgy',
    'flowy floral midi skirt boho',
    'tailored blazer professional',
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
      {/* Search Box */}
      <div className="bg-white rounded-xl border-2 border-gray-200 p-6 mb-6">
        <div className="flex gap-3 mb-4">
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

        {/* Example Queries */}
        <div className="flex flex-wrap gap-2">
          <span className="text-sm text-gray-600 mr-2">Try:</span>
          {exampleQueries.map((example) => (
            <button
              key={example}
              onClick={() => handleSearch(example)}
              disabled={loading}
              className="text-sm px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors disabled:opacity-50"
            >
              {example}
            </button>
          ))}
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <p className="text-sm text-yellow-800">{error}</p>
        </div>
      )}

      {/* Results */}
      {results.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-4">
            Visual Similarity Results
          </h3>
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
                <strong>Semantic search:</strong> Your text query is embedded in the same space
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
