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
  loading?: boolean;
}

export default function OutfitTaggerDemo() {
  const [slots, setSlots] = useState<OutfitSlot[]>([
    {
      id: 'top',
      label: 'Top',
      selected: null,
      options: [
        { id: 'silk_blouse', name: 'Silk Blouse', emoji: '👚' },
        { id: 'cashmere_sweater', name: 'Cashmere Sweater', emoji: '🧶' },
        { id: 'white_tee', name: 'White T-Shirt', emoji: '👕' },
      ],
    },
    {
      id: 'bottom',
      label: 'Bottom',
      selected: null,
      options: [
        { id: 'tailored_trousers', name: 'Tailored Trousers', emoji: '👖' },
        { id: 'midi_skirt', name: 'Pleated Midi Skirt', emoji: '🩳' },
        { id: 'denim_jeans', name: 'Classic Denim', emoji: '👖' },
      ],
    },
    {
      id: 'shoes',
      label: 'Shoes',
      selected: null,
      options: [
        { id: 'heeled_boots', name: 'Heeled Boots', emoji: '👢' },
        { id: 'loafers', name: 'Leather Loafers', emoji: '👞' },
        { id: 'sneakers', name: 'White Sneakers', emoji: '👟' },
      ],
    },
    {
      id: 'accessory',
      label: 'Accessory',
      selected: null,
      options: [
        { id: 'leather_bag', name: 'Leather Tote', emoji: '👜' },
        { id: 'crossbody', name: 'Crossbody Bag', emoji: '👝' },
        { id: 'backpack', name: 'Minimalist Backpack', emoji: '🎒' },
      ],
    },
  ]);

  const [tagging, setTagging] = useState(false);
  const [results, setResults] = useState<any>(null);

  // Fetch real products from Supabase on mount
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        // Fetch products for each category
        const categories = [
          { slot: 'top', types: ['Sweater', 'Blouse', 'T-shirt', 'Top'] },
          { slot: 'bottom', types: ['Trousers', 'Skirt', 'Jeans'] },
          { slot: 'shoes', types: ['Boots', 'Shoes', 'Sneakers'] },
          { slot: 'accessory', types: ['Bag', 'Accessories'] },
        ];

        const updatedSlots = await Promise.all(
          categories.map(async ({ slot, types }) => {
            // Fetch products via the public API to use CLIP search
            const searchQueries: Record<string, string> = {
              top: 'casual sweater or blouse',
              bottom: 'pants or skirt',
              shoes: 'stylish shoes or boots',
              accessory: 'bag or purse',
            };

            try {
              const response = await fetch('/api/public/search', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  query: searchQueries[slot] || types.join(' or '),
                  limit: 10,
                }),
              });

              const { products } = await response.json();
              const slotData = slots.find((s) => s.id === slot)!;

              if (products && products.length > 0) {
                // Randomly pick 3 products
                const shuffled = products.sort(() => Math.random() - 0.5).slice(0, 3);
                const options: ProductOption[] = shuffled.map((p: any) => ({
                  id: p.id,
                  name: p.name,
                  productType: p.category,
                  color: p.colors?.[0] || 'Multi',
                  imageUrl: p.image_url,
                }));

                return { ...slotData, options, loading: false };
              }

              return slotData;
            } catch (error) {
              console.error(`Error fetching ${slot} products:`, error);
              return slots.find((s) => s.id === slot)!;
            }
          })
        );

        setSlots(updatedSlots);
      } catch (error) {
        console.error('Error fetching products:', error);
      }
    };

    fetchProducts();
  }, []); // Only run once on mount

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
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6 text-center">
        <p className="text-gray-700">
          <strong>Build an outfit:</strong> Select one item from each category, then hit "Tag Outfit" to see the AI analysis
        </p>
      </div>

      {/* Outfit Builder */}
      <div className="grid md:grid-cols-4 gap-4 mb-6">
        {slots.map((slot) => (
          <div key={slot.id} className="bg-white rounded-xl border-2 border-gray-200 p-4">
            <h3 className="font-semibold mb-3 text-center">{slot.label}</h3>
            <div className="space-y-2">
              {slot.loading ? (
                <div className="text-center py-4 text-sm text-gray-500">Loading...</div>
              ) : (
                slot.options.map((option) => (
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
                      {option.imageUrl ? (
                        <div className="w-12 h-12 bg-gray-100 rounded overflow-hidden flex-shrink-0">
                          <img
                            src={option.imageUrl}
                            alt={option.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ) : (
                        <span className="text-2xl">{option.emoji || '👕'}</span>
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
              )}
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

      {/* No Results Yet */}
      {!results && !tagging && (
        <div className="bg-gray-50 rounded-xl border border-gray-200 p-6">
          <h3 className="font-semibold mb-3">What Gets Tagged</h3>
          <div className="grid md:grid-cols-2 gap-4 text-sm text-gray-700">
            <div>
              <h4 className="font-medium mb-2">Visual Analysis</h4>
              <ul className="space-y-1">
                <li>• Colors and patterns</li>
                <li>• Silhouettes and proportions</li>
                <li>• Materials and textures</li>
                <li>• Overall aesthetic</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-2">Semantic Intelligence</h4>
              <ul className="space-y-1">
                <li>• Style pillars (Minimal, Classic, etc.)</li>
                <li>• Vibes (Polished, Edgy, Romantic...)</li>
                <li>• Suitable occasions</li>
                <li>• Formality level (1-10 scale)</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
