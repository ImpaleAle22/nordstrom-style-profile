'use client';

/**
 * Recipe Scout Interactive Demo
 * Upload or fetch a lifestyle image and decompose it into a recipe
 */

import { useState, useRef } from 'react';

export default function RecipeScoutDemo() {
  const [imageUrl, setImageUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [dragActive, setDragActive] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'duplicate' | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const exampleImages = [
    'street style fall outfit',
    'minimal workwear look',
    'bohemian summer vibes',
  ];

  const realSampleUrls = [
    'https://images.pexels.com/photos/1926769/pexels-photo-1926769.jpeg',
    'https://images.pexels.com/photos/1336873/pexels-photo-1336873.jpeg',
    'https://images.pexels.com/photos/1472160/pexels-photo-1472160.jpeg',
  ];

  const handleScan = async (url?: string) => {
    const targetUrl = url || imageUrl;
    if (!targetUrl.trim()) return;

    setLoading(true);
    setResults(null);
    setSaveStatus(null);
    if (url) setImageUrl(url);

    try {
      // Step 1: Scan the lifestyle image for overall analysis
      const scanResponse = await fetch('/api/lifestyle-scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageUrl: targetUrl,
          source: 'demo',
          sessionId: `presentation-demo-${Date.now()}`,
        }),
      });

      if (!scanResponse.ok) {
        throw new Error('Scan failed');
      }

      const scanData = await scanResponse.json();

      if (!scanData.success || !scanData.image) {
        throw new Error(scanData.error || 'Scan failed');
      }

      const lifestyleImage = scanData.image;

      // Step 2: Generate recipe from the scanned image
      const recipeResponse = await fetch('/api/generate-recipes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          images: [lifestyleImage],
        }),
      });

      if (!recipeResponse.ok) {
        throw new Error('Recipe generation failed');
      }

      const recipeData = await recipeResponse.json();

      if (!recipeData.success || !recipeData.recipes || recipeData.recipes.length === 0) {
        throw new Error('No recipes generated');
      }

      const recipe = recipeData.recipes[0];

      // Determine save status
      if (recipeData.skippedDuplicates > 0) {
        setSaveStatus('duplicate');
      } else if (recipeData.savedToDatabase > 0) {
        setSaveStatus('saved');
      }

      // Transform recipe slots into display format
      const slots = recipe.slots.map((slot: any) => ({
        id: slot.role,
        label: slot.role.charAt(0).toUpperCase() + slot.role.slice(1),
        detected: slot.ingredient?.ingredientTitle || slot.ingredient?.searchQuery || 'Item detected',
        pillar: lifestyleImage.outfitAnalysis.stylePillar,
      }));

      if (slots.length === 0) {
        setResults({
          slots: [{ id: 'notice', label: 'Notice', detected: 'No garments detected in this image', pillar: '' }],
          overallStyle: [lifestyleImage.outfitAnalysis.stylePillar],
          occasion: lifestyleImage.outfitAnalysis.occasions[0] || 'N/A',
          season: lifestyleImage.outfitAnalysis.season.join('/') || 'N/A',
          formality: lifestyleImage.outfitAnalysis.formalityLevel,
        });
        setLoading(false);
        return;
      }

      setResults({
        slots,
        overallStyle: [lifestyleImage.outfitAnalysis.stylePillar, lifestyleImage.outfitAnalysis.subTerm].filter(Boolean),
        occasion: lifestyleImage.outfitAnalysis.occasions[0] || 'Casual',
        season: lifestyleImage.outfitAnalysis.season.join('/') || 'All Season',
        formality: Math.round(lifestyleImage.outfitAnalysis.formalityLevel),
      });
    } catch (error) {
      console.error('Scan error:', error);
      setResults({
        slots: [{ id: 'error', label: 'Error', detected: error instanceof Error ? error.message : 'Failed to analyze image. Please try another.', pillar: '' }],
        overallStyle: ['Error'],
        occasion: 'N/A',
        season: 'N/A',
        formality: 0,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleFileUpload = (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      setImageUrl(dataUrl);
      handleScan(dataUrl);
    };
    reader.readAsDataURL(file);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileUpload(e.target.files[0]);
    }
  };

  const handleFeelingLucky = () => {
    const randomUrl = realSampleUrls[Math.floor(Math.random() * realSampleUrls.length)];
    handleScan(randomUrl);
  };

  const handleGoogleSearch = () => {
    const searchQuery = encodeURIComponent('fashion street style outfit editorial');
    window.open(`https://www.google.com/search?q=${searchQuery}&tbm=isch`, '_blank');
  };

  return (
    <div className="max-w-5xl mx-auto">
      {/* Main Input Area */}
      <div
        className={`bg-white rounded-xl border-2 ${
          dragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
        } p-8 mb-6 transition-all`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        {/* Instructions */}
        <div className="text-center mb-6">
          <h3 className="text-lg font-semibold mb-2">Upload a Lifestyle Image</h3>
          <p className="text-sm text-gray-600">
            Paste a URL, drag & drop, or choose a file to scan
          </p>
        </div>

        {/* URL Input */}
        <div className="flex gap-3 mb-6">
          <input
            type="text"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleScan()}
            placeholder="Paste image URL here..."
            className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
          />
          <button
            onClick={() => handleScan()}
            disabled={loading || !imageUrl.trim()}
            className="px-8 py-3 bg-black text-white rounded-lg font-medium hover:bg-gray-900 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed whitespace-nowrap"
          >
            {loading ? 'Scanning...' : 'Scan Image'}
          </button>
        </div>

        {/* Divider */}
        <div className="flex items-center gap-4 mb-6">
          <div className="flex-1 border-t border-gray-300"></div>
          <span className="text-sm text-gray-500 font-medium">OR</span>
          <div className="flex-1 border-t border-gray-300"></div>
        </div>

        {/* File Upload & Quick Actions */}
        <div className="grid md:grid-cols-3 gap-3">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileInput}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={loading}
            className="px-4 py-3 bg-white border-2 border-gray-300 rounded-lg font-medium hover:bg-gray-50 hover:border-gray-400 transition-colors disabled:opacity-50"
          >
            📁 Choose File
          </button>
          <button
            onClick={handleFeelingLucky}
            disabled={loading}
            className="px-4 py-3 bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-lg font-medium hover:from-purple-600 hover:to-blue-600 transition-colors disabled:opacity-50"
          >
            ✨ Feeling Lucky
          </button>
          <button
            onClick={handleGoogleSearch}
            className="px-4 py-3 bg-white border-2 border-gray-300 rounded-lg font-medium hover:bg-gray-50 hover:border-gray-400 transition-colors"
          >
            🔍 Find on Google
          </button>
        </div>

        {dragActive && (
          <div className="mt-6 text-center">
            <p className="text-blue-600 font-medium animate-pulse">Drop image here</p>
          </div>
        )}
      </div>

      {/* Loading State */}
      {loading && (
        <div className="bg-white rounded-xl border-2 border-blue-200 p-12 text-center">
          <div className="animate-spin w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-700 font-medium">Analyzing image...</p>
          <p className="text-sm text-gray-500 mt-2">Detecting garments and extracting attributes</p>
        </div>
      )}

      {/* Save Status Banner */}
      {saveStatus && (
        <div className={`rounded-xl border-2 p-4 mb-6 ${
          saveStatus === 'saved'
            ? 'bg-green-50 border-green-200'
            : 'bg-blue-50 border-blue-200'
        }`}>
          <div className="flex items-center gap-2">
            <span className="text-xl">
              {saveStatus === 'saved' ? '✅' : 'ℹ️'}
            </span>
            <div>
              <p className={`font-medium ${
                saveStatus === 'saved' ? 'text-green-900' : 'text-blue-900'
              }`}>
                {saveStatus === 'saved'
                  ? 'Recipe saved to database!'
                  : 'Recipe already exists'}
              </p>
              <p className={`text-sm ${
                saveStatus === 'saved' ? 'text-green-700' : 'text-blue-700'
              }`}>
                {saveStatus === 'saved'
                  ? 'This recipe has been added to your recipe pool for future use.'
                  : 'This image has already been analyzed. Showing existing recipe.'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Results */}
      {results && !loading && (
        <div className="grid md:grid-cols-2 gap-6">
          {/* Image Preview */}
          <div className="bg-white rounded-xl border-2 border-gray-200 p-6">
            <h3 className="font-semibold mb-4">Lifestyle Image</h3>
            {imageUrl ? (
              <div className="aspect-[3/4] bg-gray-100 rounded-lg overflow-hidden shadow-sm">
                <img
                  src={imageUrl}
                  alt="Lifestyle"
                  className="w-full h-full object-cover"
                />
              </div>
            ) : (
              <div className="aspect-[3/4] bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg flex items-center justify-center">
                <p className="text-gray-500 text-sm">[Image Preview]</p>
              </div>
            )}
          </div>

          {/* Recipe Template */}
          <div className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-xl border-2 border-purple-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">Detected Recipe Template</h3>
              <button
                onClick={() => {
                  setResults(null);
                  setImageUrl('');
                  setSaveStatus(null);
                }}
                className="text-xs px-3 py-1 bg-white border border-purple-200 rounded-full hover:bg-purple-100 transition-colors"
              >
                Try Another
              </button>
            </div>

            {/* Slots */}
            <div className="space-y-3 mb-6">
              {results.slots.map((slot: any, index: number) => (
                <div key={`${slot.id}-${index}`} className="bg-white rounded-lg p-3 border border-gray-200 shadow-sm">
                  <div className="flex items-start justify-between mb-1">
                    <span className="text-sm font-medium text-gray-600">{slot.label}</span>
                    <span className="text-xs px-2 py-1 bg-purple-100 text-purple-900 rounded-full">
                      {slot.pillar}
                    </span>
                  </div>
                  <p className="text-sm text-gray-900">{slot.detected}</p>
                </div>
              ))}
            </div>

            {/* Metadata */}
            <div className="border-t border-purple-200 pt-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Overall Style:</span>
                <span className="font-medium">{results.overallStyle.join(', ')}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Occasion:</span>
                <span className="font-medium">{results.occasion}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Season:</span>
                <span className="font-medium">{results.season}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Formality:</span>
                <span className="font-medium">{results.formality}/10</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Explanation */}
      {!results && !loading && (
        <div className="bg-blue-50 rounded-xl border border-blue-200 p-6">
          <h3 className="font-semibold mb-3">How Recipe Scout Works</h3>
          <ul className="space-y-2 text-sm text-gray-700">
            <li className="flex items-start gap-2">
              <span className="text-blue-600 mt-1">•</span>
              <span>
                <strong>Image analysis:</strong> AI identifies all visible garments and accessories
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 mt-1">•</span>
              <span>
                <strong>Attribute extraction:</strong> Determines style, color, silhouette, formality for each item
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 mt-1">•</span>
              <span>
                <strong>Recipe template:</strong> Creates a structured brief with slots for each detected piece
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 mt-1">•</span>
              <span>
                <strong>Top of the funnel:</strong> These templates feed directly into the outfit cooking pipeline
              </span>
            </li>
          </ul>
        </div>
      )}
    </div>
  );
}
