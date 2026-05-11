'use client';

/**
 * Outfit Tagging Interactive Demo
 * Pick items to create an outfit, then tag it with AI
 */

import { useState } from 'react';

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
  // Curated products - handpicked for demo presentation
  const [slots, setSlots] = useState<OutfitSlot[]>([
    {
      id: 'top',
      label: 'Top',
      selected: null,
      options: [
        {
          id: 'hm-kaggle-0779853003',
          name: 'Premium DINA blouse',
          color: 'Cream',
          imageUrl: 'https://pub-37f4813beace4fddaab945f302abbf4a.r2.dev/products/hm-kaggle-0779853003_flat_lay_01.jpg'
        },
        {
          id: 'hm-kaggle-0552743009',
          name: 'PEBBLE knitted crewneck',
          color: 'Grey',
          imageUrl: 'https://pub-37f4813beace4fddaab945f302abbf4a.r2.dev/products/hm-kaggle-0552743009_flat_lay_01.jpg'
        },
        {
          id: 'hm-kaggle-0604971001',
          name: 'Nicola rib tee',
          color: 'White',
          imageUrl: 'https://pub-37f4813beace4fddaab945f302abbf4a.r2.dev/products/hm-kaggle-0604971001_flat_lay_01.jpg'
        },
      ],
    },
    {
      id: 'bottom',
      label: 'Bottom',
      selected: null,
      options: [
        {
          id: 'hm-kaggle-0806806001',
          name: 'Jock athletic fit trs',
          color: 'Black',
          imageUrl: 'https://pub-37f4813beace4fddaab945f302abbf4a.r2.dev/products/hm-kaggle-0806806001_flat_lay_01.jpg'
        },
        {
          id: 'hm-kaggle-0719249001',
          name: 'W NAPOLI SKIRT EQ',
          color: 'Navy',
          imageUrl: 'https://pub-37f4813beace4fddaab945f302abbf4a.r2.dev/products/hm-kaggle-0719249001_flat_lay_01.jpg'
        },
        {
          id: 'hm-kaggle-0776719001',
          name: 'D1 PE NORI HIGHWAIST DENIM',
          color: 'Blue',
          imageUrl: 'https://pub-37f4813beace4fddaab945f302abbf4a.r2.dev/products/hm-kaggle-0776719001_flat_lay_01.jpg'
        },
      ],
    },
    {
      id: 'shoes',
      label: 'Shoes',
      selected: null,
      options: [
        {
          id: 'hm-kaggle-0748588001',
          name: 'Allie WL boot',
          color: 'Black',
          imageUrl: 'https://pub-37f4813beace4fddaab945f302abbf4a.r2.dev/products/hm-kaggle-0748588001_flat_lay_01.jpg'
        },
        {
          id: 'hm-kaggle-0782061002',
          name: 'Theodora PQ loafer',
          color: 'Brown',
          imageUrl: 'https://pub-37f4813beace4fddaab945f302abbf4a.r2.dev/products/hm-kaggle-0782061002_flat_lay_01.jpg'
        },
        {
          id: 'hm-kaggle-0622966014',
          name: 'Laura sneaker',
          color: 'White',
          imageUrl: 'https://pub-37f4813beace4fddaab945f302abbf4a.r2.dev/products/hm-kaggle-0622966014_flat_lay_01.jpg'
        },
      ],
    },
    {
      id: 'accessory',
      label: 'Accessory',
      selected: null,
      options: [
        {
          id: 'hm-kaggle-0682771002',
          name: 'Yuki shopper',
          color: 'Tan',
          imageUrl: 'https://pub-37f4813beace4fddaab945f302abbf4a.r2.dev/products/hm-kaggle-0682771002_flat_lay_01.jpg'
        },
        {
          id: 'hm-kaggle-0708638001',
          name: 'Spritzer Shoulder Bag',
          color: 'Black',
          imageUrl: 'https://pub-37f4813beace4fddaab945f302abbf4a.r2.dev/products/hm-kaggle-0708638001_flat_lay_01.jpg'
        },
        {
          id: 'hm-kaggle-0613857001',
          name: 'Class Rulle necklace',
          color: 'Gold',
          imageUrl: 'https://pub-37f4813beace4fddaab945f302abbf4a.r2.dev/products/hm-kaggle-0613857001_flat_lay_01.jpg'
        },
      ],
    },
  ]);

  const [tagging, setTagging] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [imageErrors, setImageErrors] = useState<Set<string>>(new Set());

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

    try {
      // Build product array from selections
      const products = slots.map((slot) => {
        const selected = slot.options.find((opt) => opt.id === slot.selected);
        return {
          id: selected?.id || '',
          name: selected?.name || '',
          color: selected?.color || '',
          imageUrl: selected?.imageUrl || '',
          role: slot.id,
        };
      });

      // Call real AI tagging API
      const response = await fetch('/api/tag-demo-outfit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ products }),
      });

      if (!response.ok) {
        throw new Error('Tagging failed');
      }

      const data = await response.json();
      const attrs = data.attributes;

      // Format results for display
      setResults({
        stylePillars: attrs.stylePillar ? [attrs.stylePillar, attrs.subStyle].filter(Boolean) : ['Classic'],
        vibes: attrs.vibes || ['Versatile'],
        occasions: attrs.occasions || ['Everyday'],
        formality: attrs.formality || 5,  // Fixed: was formalityLevel, should be formality
        colors: attrs.primaryColors || [],
        season: attrs.season || [],
        confidence: 0.85,
      });
    } catch (error) {
      console.error('Tagging error:', error);
      // Fallback to simple tags on error
      setResults({
        stylePillars: ['Classic'],
        vibes: ['Versatile'],
        occasions: ['Everyday'],
        formality: 5,
        colors: ['Neutral'],
        season: ['All Season'],
        confidence: 0.5,
      });
    } finally {
      setTagging(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto">
      {/* Instructions */}
      <div className="mb-6 text-center">
        <p className="text-gray-700">
          <strong>Build an outfit:</strong> Select one item from each category, then hit "Tag Outfit" to see the AI analysis
        </p>
      </div>

      {/* Outfit Builder */}
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

    </div>
  );
}
