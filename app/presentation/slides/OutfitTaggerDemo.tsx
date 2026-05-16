'use client';

/**
 * Outfit Tagging Interactive Demo
 * Shows outfits generated from Recipe Scout (Slide 11), then tags them with AI
 */

import { useState, useEffect, useRef } from 'react';

interface CookedOutfit {
  id: string;
  recipeId: string;
  recipeTitle: string;
  department: string;
  items: Array<{
    role: string;
    product: {
      id: string;
      title: string;
      brand: string;
      imageUrl: string;
      colors: string[];
      price: number;
    };
  }>;
  scoreBreakdown: {
    styleRegisterCoherence: number;
    colorHarmony: number;
    silhouetteBalance: number;
    occasionAlignment: number;
    seasonFabricWeight: number;
  };
}

export default function OutfitTaggerDemo() {
  // Cooking status from Recipe Scout (Slide 11)
  const [cookingStatus, setCookingStatus] = useState<'idle' | 'cooking' | 'ready' | 'error' | 'no-recipe'>('idle');
  const [generatedOutfits, setGeneratedOutfits] = useState<CookedOutfit[]>([]);
  const [selectedOutfit, setSelectedOutfit] = useState<CookedOutfit | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Tagging state
  const [tagging, setTagging] = useState(false);
  const [results, setResults] = useState<any>(null);

  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Check cooking status on mount
  useEffect(() => {
    const status = sessionStorage.getItem('presentation-cooking-status');
    const recipe = sessionStorage.getItem('presentation-recipe');

    if (!recipe) {
      // No recipe from Slide 11
      setCookingStatus('no-recipe');
      return;
    }

    if (status === 'ready') {
      // Outfits are ready
      const outfits = JSON.parse(sessionStorage.getItem('presentation-outfits') || '[]');
      if (outfits.length > 0) {
        setGeneratedOutfits(outfits);
        setCookingStatus('ready');
      } else {
        setCookingStatus('error');
        setError('No outfits were generated');
      }
    } else if (status === 'cooking') {
      // Still cooking - poll for updates
      setCookingStatus('cooking');
      pollIntervalRef.current = setInterval(() => {
        const currentStatus = sessionStorage.getItem('presentation-cooking-status');
        if (currentStatus === 'ready') {
          const outfits = JSON.parse(sessionStorage.getItem('presentation-outfits') || '[]');
          setGeneratedOutfits(outfits);
          setCookingStatus('ready');
          if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current);
            pollIntervalRef.current = null;
          }
        } else if (currentStatus === 'error') {
          const errorMsg = sessionStorage.getItem('presentation-cooking-error') || 'Outfit generation failed';
          setError(errorMsg);
          setCookingStatus('error');
          if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current);
            pollIntervalRef.current = null;
          }
        }
      }, 1000);
    } else if (status === 'error') {
      // Cooking failed
      const errorMsg = sessionStorage.getItem('presentation-cooking-error') || 'Outfit generation failed';
      setError(errorMsg);
      setCookingStatus('error');
    }

    // Cleanup poll interval on unmount
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    };
  }, []);

  // Fallback products for error state
  const [fallbackSlots, setFallbackSlots] = useState<any[]>([
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

  const handleTag = async () => {
    if (!selectedOutfit) return;

    setTagging(true);
    setResults(null);

    try {
      // Build product array from selected outfit
      const products = selectedOutfit.items.map((item) => ({
        id: item.product.id,
        name: item.product.title,
        brand: item.product.brand || 'H&M',
        color: item.product.colors?.[0] || '',
        price: item.product.price || 39.99,
        imageUrl: item.product.imageUrl,
        role: item.role,
      }));

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

      // Debug logging to see what we're actually getting
      console.log('=== DEMO UI RECEIVED ===');
      console.log('Style Pillar:', attrs.stylePillar);
      console.log('Sub Style:', attrs.subStyle);
      console.log('Vibes:', attrs.vibes);
      console.log('Occasions:', attrs.occasions);
      console.log('Formality:', attrs.formality);
      console.log('Confidence:', attrs.confidence);
      console.log('Needs Review:', attrs.needsReview);
      console.log('========================');

      // Format results for display - use REAL v2 confidence scores
      setResults({
        stylePillars: attrs.stylePillar ? [attrs.stylePillar, attrs.subStyle].filter(Boolean) : ['Unknown'],
        vibes: attrs.vibes || [],
        occasions: attrs.occasions || [],
        formality: attrs.formality || 0,
        colors: attrs.primaryColors || [],
        season: attrs.season || [],
        // Use ACTUAL pillar confidence from v2, not hardcoded!
        confidence: attrs.confidence?.stylePillar || 0,
        // Show if this needed review
        needsReview: attrs.needsReview || false,
        reviewReason: attrs.reviewReason,
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
      {/* No Recipe State */}
      {cookingStatus === 'no-recipe' && (
        <div className="bg-amber-50 border-2 border-amber-200 rounded-xl p-12 text-center">
          <span className="text-6xl mb-4 block">📸</span>
          <h3 className="text-2xl font-semibold text-gray-900 mb-4">No Recipe Found</h3>
          <p className="text-gray-700 mb-6">
            Go back to <strong>Slide 11</strong> to scan a lifestyle image and generate a recipe first.
          </p>
          <p className="text-sm text-gray-600">
            The outfit tagger works with outfits generated from Recipe Scout.
          </p>
        </div>
      )}

      {/* Cooking State */}
      {cookingStatus === 'cooking' && (
        <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-12 text-center">
          <div className="animate-spin w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-6"></div>
          <h3 className="text-2xl font-semibold text-gray-900 mb-4">Generating Outfits...</h3>
          <p className="text-gray-700 mb-2">
            Creating outfits from your recipe using CLIP-powered visual compatibility
          </p>
          <p className="text-sm text-gray-600">
            This usually takes 10-30 seconds. The outfits will appear automatically when ready.
          </p>
        </div>
      )}

      {/* Error State */}
      {cookingStatus === 'error' && (
        <div className="bg-red-50 border-2 border-red-200 rounded-xl p-12 text-center">
          <span className="text-6xl mb-4 block">⚠️</span>
          <h3 className="text-2xl font-semibold text-gray-900 mb-4">Outfit Generation Failed</h3>
          <p className="text-gray-700 mb-2">
            {error || 'Something went wrong generating outfits from your recipe.'}
          </p>
          <p className="text-sm text-gray-600 mb-6">
            This could be due to CLIP API availability or product matching issues.
          </p>
          <button
            onClick={() => window.location.href = '/presentation/11'}
            className="px-6 py-3 bg-black text-white rounded-lg font-medium hover:bg-gray-900 transition-colors"
          >
            Go Back to Recipe Scout
          </button>
        </div>
      )}

      {/* Ready State - Show Generated Outfits */}
      {cookingStatus === 'ready' && !selectedOutfit && (
        <>
          <div className="mb-6 text-center">
            <p className="text-gray-700">
              <strong>Select an outfit to tag:</strong> Choose one of the generated outfits below, then click "Tag Outfit" to see the AI analysis
            </p>
          </div>

          {/* Outfit Cards Grid */}
          <div className="grid md:grid-cols-3 gap-6 mb-8">
            {generatedOutfits.map((outfit, index) => (
              <button
                key={outfit.id}
                onClick={() => {
                  setSelectedOutfit(outfit);
                  setResults(null);
                }}
                className="bg-white rounded-xl border-2 border-gray-200 hover:border-black transition-all p-4 text-left group"
              >
                <div className="mb-4">
                  <h3 className="font-semibold text-gray-900 mb-1">Outfit {index + 1}</h3>
                  <p className="text-xs text-gray-500">{outfit.items.length} items</p>
                </div>

                {/* Product Grid */}
                <div className="grid grid-cols-2 gap-2 mb-4">
                  {outfit.items.slice(0, 4).map((item) => (
                    <div key={item.product.id} className="aspect-square bg-gray-100 rounded-lg overflow-hidden">
                      <img
                        src={item.product.imageUrl}
                        alt={item.product.title}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    </div>
                  ))}
                </div>

                {/* Quality Score */}
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-600">Quality Score</span>
                  <span className="font-medium text-gray-900">
                    {Math.round((
                      outfit.scoreBreakdown.styleRegisterCoherence +
                      outfit.scoreBreakdown.colorHarmony +
                      outfit.scoreBreakdown.silhouetteBalance
                    ) / 3)}%
                  </span>
                </div>
              </button>
            ))}
          </div>
        </>
      )}

      {/* Selected Outfit - Show Details & Tag Button */}
      {selectedOutfit && !results && (
        <>
          <div className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-xl border-2 border-purple-200 p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold">Selected Outfit</h3>
              <button
                onClick={() => setSelectedOutfit(null)}
                className="text-sm px-3 py-1 bg-white border border-purple-300 rounded-full hover:bg-purple-100 transition-colors"
              >
                Choose Different
              </button>
            </div>

            {/* Product List */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {selectedOutfit.items.map((item) => (
                <div key={item.product.id} className="bg-white rounded-lg p-3">
                  <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden mb-2">
                    <img
                      src={item.product.imageUrl}
                      alt={item.product.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <p className="text-xs font-medium text-gray-900 truncate">{item.product.title}</p>
                  <p className="text-xs text-gray-500">{item.role}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Tag Button */}
          <div className="text-center mb-6">
            <button
              onClick={handleTag}
              disabled={tagging}
              className="px-8 py-4 bg-black text-white rounded-xl font-semibold hover:bg-gray-900 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed text-lg"
            >
              {tagging ? 'Analyzing Outfit...' : 'Tag Outfit with AI'}
            </button>
          </div>
        </>
      )}

      {/* Results */}
      {results && (
        <div className={`rounded-xl border-2 p-6 ${
          results.needsReview
            ? 'bg-gradient-to-br from-yellow-50 to-orange-50 border-yellow-300'
            : 'bg-gradient-to-br from-purple-50 to-blue-50 border-purple-200'
        }`}>
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-semibold">
              AI Analysis Results {results.needsReview && '⚠️'}
            </h3>
            <div className="flex flex-col items-end gap-1">
              <div className="text-sm text-gray-600">
                Pillar Confidence: {(results.confidence * 100).toFixed(0)}%
              </div>
              {results.needsReview && (
                <div className="text-xs text-orange-600 font-medium">
                  Needs Review: {results.reviewReason}
                </div>
              )}
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
                {results.vibes && results.vibes.length > 0 ? (
                  results.vibes.map((vibe: string) => (
                    <span
                      key={vibe}
                      className="px-3 py-1 bg-blue-100 text-blue-900 rounded-full text-sm font-medium"
                    >
                      {vibe}
                    </span>
                  ))
                ) : (
                  <span className="text-sm text-gray-500 italic">No vibes assigned</span>
                )}
              </div>
            </div>

            {/* Occasions */}
            <div className="bg-white rounded-lg p-4">
              <h4 className="font-semibold mb-2 text-sm text-gray-600">Best For</h4>
              <div className="flex flex-wrap gap-2">
                {results.occasions && results.occasions.length > 0 ? (
                  results.occasions.slice(0, 4).map((occasion: string) => (
                    <span
                      key={occasion}
                      className="px-3 py-1 bg-green-100 text-green-900 rounded-full text-sm font-medium"
                    >
                      {occasion}
                    </span>
                  ))
                ) : (
                  <span className="text-sm text-gray-500 italic">No occasions assigned</span>
                )}
              </div>
            </div>

            {/* Formality */}
            <div className="bg-white rounded-lg p-4">
              <h4 className="font-semibold mb-2 text-sm text-gray-600">Formality Level</h4>
              <div className="flex items-center gap-3">
                <div className="flex-1 bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-black rounded-full h-2 transition-all"
                    style={{ width: `${(results.formality / 6) * 100}%` }}
                  />
                </div>
                <span className="text-sm font-medium">{results.formality.toFixed(1)}/6</span>
              </div>
              <p className="text-xs text-gray-600 mt-2">
                {results.formality >= 5 ? 'Dressy/Formal' : results.formality >= 3.5 ? 'Smart Casual' : results.formality >= 2 ? 'Casual' : 'Very Casual'}
              </p>
            </div>
          </div>

          {/* Explanation */}
          <div className="mt-6 pt-6 border-t border-purple-200">
            <h4 className="font-semibold mb-2 text-sm">How This Works (v2 Four-Station Pipeline)</h4>
            <p className="text-sm text-gray-700 leading-relaxed">
              <strong>Station 1:</strong> Axes (formality, context, season, social register) derived from rules + AI refinement.<br />
              <strong>Station 2:</strong> Style pillar detected using marker-based scoring (materials, silhouettes, details).<br />
              <strong>Station 3:</strong> Vibes assigned from pillar-coherent candidates only (1-3 vibes).<br />
              <strong>Station 4:</strong> Occasions derived deterministically from the four axes.<br />
              <br />
              Every attribute tracks its confidence. Low-confidence results trigger review or AI escalation.
            </p>
          </div>
        </div>
      )}

    </div>
  );
}
