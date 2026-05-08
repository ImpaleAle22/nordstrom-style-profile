'use client';

/**
 * Outfit Tagging Interactive Demo
 * Pick items to create an outfit, then tag it with AI
 */

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase-client';

interface ProductOption {
  id: string;
  name: string;
  emoji?: string;
  imageUrl?: string;
  productType?: string;
  color?: string;
}

interface OutfitSlot {
  id: string;
  label: string;
  options: ProductOption[];
  selected: string | null;
}

export default function OutfitTaggerDemo() {
  const [slots, setSlots] = useState<OutfitSlot[]>([
    { id: 'top', label: 'Top', selected: null, options: [] },
    { id: 'bottom', label: 'Bottom', selected: null, options: [] },
    { id: 'shoes', label: 'Shoes', selected: null, options: [] },
    { id: 'accessory', label: 'Accessory', selected: null, options: [] },
  ]);

  const [tagging, setTagging] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [imageErrors, setImageErrors] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  // Load curated products using CLIP search on mount
  useEffect(() => {
    async function loadCuratedProducts() {
      try {
        // Define search queries for each slot/option - all womenswear, prefer flat lay shots
        const searches = [
          // Tops
          { slot: 'top', query: 'women cream silk blouse feminine elegant flat lay', limit: 2, index: 1 }, // Skip to 2nd result
          { slot: 'top', query: 'women grey cashmere sweater soft cozy flat lay', limit: 1, index: 0 },
          { slot: 'top', query: 'women white t-shirt classic simple flat lay', limit: 1, index: 0 },
          // Bottoms
          { slot: 'bottom', query: 'women black tailored trousers professional flat lay', limit: 3, index: 2 },
          { slot: 'bottom', query: 'women navy pleated midi skirt flat lay', limit: 1, index: 0 },
          { slot: 'bottom', query: 'women blue denim jeans classic flat lay', limit: 3, index: 2 },
          // Shoes
          { slot: 'shoes', query: 'women black heeled boots ankle flat lay', limit: 1, index: 0 },
          { slot: 'shoes', query: 'women brown leather loafers flat lay', limit: 1, index: 0 },
          { slot: 'shoes', query: 'women white sneakers clean minimal flat lay', limit: 1, index: 0 },
          // Accessories
          { slot: 'accessory', query: 'women tan leather tote bag flat lay', limit: 1, index: 0 },
          { slot: 'accessory', query: 'women black crossbody bag flat lay', limit: 1, index: 0 },
          { slot: 'accessory', query: 'women silver chain necklace delicate flat lay', limit: 1, index: 0 },
        ];

        // Fetch all products in parallel
        const searchPromises = searches.map(async ({ query, limit, index }) => {
          const response = await fetch('/api/clip-search', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query, limit }),
          });
          const data = await response.json();
          return data.results?.[index] || null;
        });

        const products = await Promise.all(searchPromises);

        // Group products by slot
        const groupedSlots = {
          top: products.slice(0, 3).filter(Boolean),
          bottom: products.slice(3, 6).filter(Boolean),
          shoes: products.slice(6, 9).filter(Boolean),
          accessory: products.slice(9, 12).filter(Boolean),
        };

        setSlots([
          {
            id: 'top',
            label: 'Top',
            selected: null,
            options: groupedSlots.top.map(p => ({
              id: p.productId,
              name: p.title,
              color: p.color || '',
              imageUrl: p.imageUrl,
            })),
          },
          {
            id: 'bottom',
            label: 'Bottom',
            selected: null,
            options: groupedSlots.bottom.map(p => ({
              id: p.productId,
              name: p.title,
              color: p.color || '',
              imageUrl: p.imageUrl,
            })),
          },
          {
            id: 'shoes',
            label: 'Shoes',
            selected: null,
            options: groupedSlots.shoes.map(p => ({
              id: p.productId,
              name: p.title,
              color: p.color || '',
              imageUrl: p.imageUrl,
            })),
          },
          {
            id: 'accessory',
            label: 'Accessory',
            selected: null,
            options: groupedSlots.accessory.map(p => ({
              id: p.productId,
              name: p.title,
              color: p.color || '',
              imageUrl: p.imageUrl,
            })),
          },
        ]);
      } catch (error) {
        console.error('Failed to load curated products:', error);
      } finally {
        setLoading(false);
      }
    }

    loadCuratedProducts();
  }, []);

  const handleImageError = (productId: string) => {
    setImageErrors(prev => new Set(prev).add(productId));
  };

  const handleSelectItem = (slotId: string, optionId: string) => {
    setSlots(
      slots.map((slot) =>
        slot.id === slotId ? { ...slot, selected: optionId } : slot
      )
    );
    setResults(null); // Clear previous results
  };

  const isOutfitComplete = slots.every((slot) => slot.selected !== null);

  const handleTag = async () => {
    if (!isOutfitComplete) return;

    setTagging(true);

    // Simulate AI tagging with a delay
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Generate results based on selections
    const selectedItems = slots.map((slot) => {
      const selected = slot.options.find((opt) => opt.id === slot.selected);
      return selected?.name || '';
    });

    // Simple logic to determine style based on selections
    const hasCashmere = selectedItems.some((item) => item.includes('Cashmere'));
    const hasSilk = selectedItems.some((item) => item.includes('Silk'));
    const hasTailored = selectedItems.some((item) => item.includes('Tailored'));
    const hasSneakers = selectedItems.some((item) => item.includes('Sneakers'));
    const hasJeans = selectedItems.some((item) => item.includes('Denim'));

    let stylePillars = [];
    let vibes = [];
    let occasions = [];
    let formality = 5;

    if (hasCashmere || hasSilk || hasTailored) {
      stylePillars.push('Classic');
      stylePillars.push('Minimal');
      formality = 7;
      vibes.push('Polished', 'Sophisticated');
      occasions.push('Work', 'Business Lunch', 'Client Meeting');
    }

    if (hasSneakers || hasJeans) {
      stylePillars.push('Casual');
      formality = 4;
      vibes.push('Effortless', 'Relaxed');
      occasions.push('Weekend Brunch', 'Coffee Date', 'Casual Friday');
    }

    if (!hasSneakers && !hasJeans && (hasCashmere || hasSilk)) {
      stylePillars.push('Romantic');
      vibes.push('Elegant', 'Refined');
      occasions.push('Dinner Date', 'Art Gallery Opening');
    }

    // Ensure we have at least some tags
    if (stylePillars.length === 0) stylePillars = ['Classic', 'Minimal'];
    if (vibes.length === 0) vibes = ['Versatile', 'Timeless'];
    if (occasions.length === 0) occasions = ['Everyday', 'Work', 'Weekend'];

    setResults({
      stylePillars: [...new Set(stylePillars)],
      vibes: [...new Set(vibes)],
      occasions: [...new Set(occasions)],
      formality,
      colors: ['Neutral', 'Monochrome'],
      season: ['Fall', 'Winter'],
      confidence: 0.87,
    });

    setTagging(false);
  };

  return (
    <div className="max-w-5xl mx-auto">
      {/* Instructions */}
      <div className="mb-6 text-center">
        <p className="text-gray-700">
          <strong>Build an outfit:</strong> Select one item from each category, then hit "Tag Outfit" to see the AI analysis
        </p>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          <p className="mt-4 text-gray-600">Loading products...</p>
        </div>
      )}

      {!loading && slots.every(slot => slot.options.length === 0) && (
        <div className="text-center py-12">
          <p className="text-gray-600">Unable to load products. Please check your connection.</p>
        </div>
      )}

      {/* Outfit Builder */}
      {!loading && slots.some(slot => slot.options.length > 0) && (
      <>
      <div className="grid md:grid-cols-4 gap-4 mb-6">
        {slots.map((slot) => (
          <div key={slot.id} className="bg-white rounded-xl border-2 border-gray-200 p-4">
            <h3 className="font-semibold mb-3 text-center">{slot.label}</h3>
            <div className="space-y-2">
              {slot.options.map((option) => (
                  <button
                    key={option.id}
                    onClick={() => handleSelectItem(slot.id, option.id)}
                    className={`w-full p-2 rounded-lg border-2 transition-all text-left ${
                      slot.selected === option.id
                        ? 'border-black bg-gray-50'
                        : 'border-gray-200 hover:border-gray-400'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {option.imageUrl && !imageErrors.has(option.id) ? (
                        <div className="w-16 h-24 bg-gray-100 rounded overflow-hidden flex-shrink-0">
                          <img
                            src={option.imageUrl}
                            alt={option.name}
                            className="w-full h-full object-cover"
                            onError={() => handleImageError(option.id)}
                            loading="lazy"
                          />
                        </div>
                      ) : (
                        <div className="w-16 h-24 bg-gradient-to-br from-gray-100 to-gray-200 rounded flex-shrink-0 flex items-center justify-center">
                          <span className="text-2xl">👕</span>
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{option.name}</p>
                        {option.color && (
                          <p className="text-xs text-gray-500 truncate">{option.color}</p>
                        )}
                      </div>
                    </div>
                  </button>
                ))
              }
            </div>
          </div>
        ))}
      </div>

      {/* Tag Button */}
      <div className="text-center mb-6">
        <button
          onClick={handleTag}
          disabled={!isOutfitComplete || tagging}
          className="px-8 py-4 bg-black text-white rounded-xl font-semibold hover:bg-gray-900 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed text-lg"
        >
          {tagging ? 'Analyzing Outfit...' : isOutfitComplete ? 'Tag Outfit with AI' : 'Select All Items First'}
        </button>
      </div>

      {/* Results */}
      {results && (
        <div className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-xl border-2 border-purple-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-semibold">AI Analysis Results</h3>
            <div className="text-sm text-gray-600">
              Confidence: {(results.confidence * 100).toFixed(0)}%
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Style Pillars */}
            <div className="bg-white rounded-lg p-4">
              <h4 className="font-semibold mb-2 text-sm text-gray-600">Style Pillars</h4>
              <div className="flex flex-wrap gap-2">
                {results.stylePillars.map((pillar: string) => (
                  <span
                    key={pillar}
                    className="px-3 py-1 bg-purple-100 text-purple-900 rounded-full text-sm font-medium"
                  >
                    {pillar}
                  </span>
                ))}
              </div>
            </div>

            {/* Vibes */}
            <div className="bg-white rounded-lg p-4">
              <h4 className="font-semibold mb-2 text-sm text-gray-600">Vibes</h4>
              <div className="flex flex-wrap gap-2">
                {results.vibes.map((vibe: string) => (
                  <span
                    key={vibe}
                    className="px-3 py-1 bg-blue-100 text-blue-900 rounded-full text-sm font-medium"
                  >
                    {vibe}
                  </span>
                ))}
              </div>
            </div>

            {/* Occasions */}
            <div className="bg-white rounded-lg p-4">
              <h4 className="font-semibold mb-2 text-sm text-gray-600">Best For</h4>
              <div className="flex flex-wrap gap-2">
                {results.occasions.slice(0, 3).map((occasion: string) => (
                  <span
                    key={occasion}
                    className="px-3 py-1 bg-green-100 text-green-900 rounded-full text-sm font-medium"
                  >
                    {occasion}
                  </span>
                ))}
              </div>
            </div>

            {/* Formality */}
            <div className="bg-white rounded-lg p-4">
              <h4 className="font-semibold mb-2 text-sm text-gray-600">Formality Level</h4>
              <div className="flex items-center gap-3">
                <div className="flex-1 bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-black rounded-full h-2 transition-all"
                    style={{ width: `${(results.formality / 10) * 100}%` }}
                  />
                </div>
                <span className="text-sm font-medium">{results.formality}/10</span>
              </div>
              <p className="text-xs text-gray-600 mt-2">
                {results.formality >= 7 ? 'Formal/Professional' : results.formality >= 5 ? 'Smart Casual' : 'Casual'}
              </p>
            </div>
          </div>

          {/* Explanation */}
          <div className="mt-6 pt-6 border-t border-purple-200">
            <h4 className="font-semibold mb-2 text-sm">How This Works</h4>
            <p className="text-sm text-gray-700">
              The AI analyzes each item's attributes (silhouette, material, color, style) and synthesizes them into
              outfit-level intelligence: style pillars, vibes, occasions, and formality. This same process runs on all
              lifestyle images and generated outfits to create a searchable, semantic catalog.
            </p>
          </div>
        </div>
      )}
      </>
      )}

    </div>
  );
}
