'use client';

/**
 * Recipe Scout Interactive Demo
 * Upload or fetch a lifestyle image and decompose it into a recipe
 */

import { useState, useRef, useEffect } from 'react';

export default function RecipeScoutDemo() {
  const [imageUrl, setImageUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState<{ step: number; label: string } | null>(null);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<any>(null);
  const [dragActive, setDragActive] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'duplicate' | null>(null);
  const [cookingStatus, setCookingStatus] = useState<'idle' | 'cooking' | 'ready' | 'error'>('idle');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Smooth progress animation effect
  useEffect(() => {
    if (!loadingStep) {
      setProgress(0);
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
      return;
    }

    // Define progress ranges and timing for each step
    const stepConfig = {
      1: { start: 0, target: 45, duration: 8000 },   // Step 1: 0% -> 45% over 8 seconds
      2: { start: 50, target: 95, duration: 10000 }, // Step 2: 50% -> 95% over 10 seconds
    };

    const config = stepConfig[loadingStep.step as 1 | 2];
    if (!config) return;

    // Set initial progress for this step
    setProgress(config.start);

    // Calculate how often to update (60fps = ~16ms)
    const updateInterval = 50; // Update every 50ms for smooth animation
    const steps = config.duration / updateInterval;
    const increment = (config.target - config.start) / steps;

    let currentProgress = config.start;

    progressIntervalRef.current = setInterval(() => {
      currentProgress += increment;
      if (currentProgress >= config.target) {
        setProgress(config.target);
        if (progressIntervalRef.current) {
          clearInterval(progressIntervalRef.current);
          progressIntervalRef.current = null;
        }
      } else {
        setProgress(currentProgress);
      }
    }, updateInterval);

    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
    };
  }, [loadingStep]);

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
    setCookingStatus('idle');  // Reset cooking status
    if (url) setImageUrl(url);

    try {
      // Step 1: Scan the lifestyle image for overall analysis
      setLoadingStep({ step: 1, label: 'Analyzing outfit style, occasions, and formality...' });
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
      setLoadingStep({ step: 2, label: 'Detecting individual garments and creating recipe...' });
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

      console.log('Recipe generation response:', recipeData);

      if (!recipeData.success) {
        const errorMsg = recipeData.error || 'Recipe generation failed';
        // Provide helpful guidance based on error type
        if (errorMsg.includes('Insufficient items')) {
          throw new Error(
            'Could not detect enough items in this image (need 4+ garments). ' +
            'Try an image where you can clearly see: top + bottom + shoes + accessories, or a full outfit with shoes.'
          );
        }
        throw new Error(errorMsg);
      }

      if (!recipeData.recipes || recipeData.recipes.length === 0) {
        // Check if it was skipped as duplicate
        if (recipeData.skippedDuplicates > 0) {
          throw new Error('This image has already been analyzed. Try a different image.');
        }
        // Otherwise, likely insufficient items detected
        throw new Error(
          'Recipe generation failed - not enough garments detected. ' +
          'Make sure the image shows a complete outfit with at least 4 visible items (top, bottom, shoes, accessories).'
        );
      }

      const recipe = recipeData.recipes[0];

      // Determine save status
      if (recipeData.skippedDuplicates > 0) {
        setSaveStatus('duplicate');
      } else if (recipeData.savedToDatabase > 0) {
        setSaveStatus('saved');
      }

      // Store recipe for Slide 16 and trigger background outfit cooking
      console.log('[RECIPE SCOUT] Storing recipe and starting outfit cooking...');
      sessionStorage.setItem('presentation-recipe', JSON.stringify(recipe));
      sessionStorage.setItem('presentation-cooking-status', 'cooking');
      setCookingStatus('cooking');

      // Start cooking in background (non-blocking)
      fetch('/api/cook-recipe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipe,
          options: {
            strategy: 'gemini-flash-lite',  // Fast strategy
            targetCount: 3,  // Just 3 outfits for demo
            productsPerIngredient: 20,  // Increase pool for better results
            minQuality: 40,  // Lower threshold to get more results
            saveToSanity: false,  // Don't save to database
          },
        }),
      })
        .then(async res => {
          const result = await res.json();
          console.log('[RECIPE SCOUT] Cooking response:', {
            status: res.status,
            hasOutfits: !!result.outfits,
            outfitsCount: result.outfits?.length || 0,
            hasError: !!result.error,
            stats: result.stats,
          });

          // Handle error response
          if (!res.ok || result.error) {
            throw new Error(result.error || `Cook failed with status ${res.status}`);
          }

          // Handle successful response
          if (result.outfits && result.outfits.length > 0) {
            // Store top 3 outfits for Slide 16
            sessionStorage.setItem('presentation-outfits', JSON.stringify(result.outfits.slice(0, 3)));
            sessionStorage.setItem('presentation-cooking-status', 'ready');
            setCookingStatus('ready');
            console.log('[RECIPE SCOUT] ✓ Stored', result.outfits.length, 'outfits for Slide 16');
          } else {
            // Log diagnostic info for debugging
            console.error('[RECIPE SCOUT] No outfits generated. Diagnostics:', {
              totalGenerated: result.stats?.totalGenerated,
              totalScored: result.stats?.totalScored,
              totalSaved: result.stats?.totalSaved,
              errors: result.errors,
              diagnostics: result.diagnostics,
            });
            throw new Error('No outfits generated - cooking succeeded but returned empty results');
          }
        })
        .catch(error => {
          console.error('[RECIPE SCOUT] Cooking failed:', error);
          sessionStorage.setItem('presentation-cooking-status', 'error');
          sessionStorage.setItem('presentation-cooking-error', error.message || 'Outfit generation failed');
          setCookingStatus('error');
        });

      // Transform recipe slots into display format
      // Note: Style pillar is an OUTFIT-level attribute, not item-level
      const slots = recipe.slots.map((slot: any) => ({
        id: slot.role,
        label: slot.role.charAt(0).toUpperCase() + slot.role.slice(1),
        detected: slot.ingredient?.ingredientTitle || slot.ingredient?.searchQuery || 'Item detected',
        // Removed: pillar tag (outfit-level attribute shouldn't apply to individual items)
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

      // Complete! Set progress to 100% and show briefly before displaying results
      setProgress(100);
      await new Promise(resolve => setTimeout(resolve, 300)); // Brief pause to show completion
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
      setLoadingStep(null);
      // Clean up progress animation
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
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

  const handleGoogleSearch = () => {
    const searchQuery = encodeURIComponent('2026 outfit ideas');
    window.open(`https://www.google.com/search?q=${searchQuery}&tbm=isch`, '_blank');
  };

  return (
    <div className="max-w-5xl mx-auto">
      {/* Main Input Area - Hide when loading or results present */}
      {!loading && !results && (
      <div
        className={`bg-white rounded-xl border-2 ${
          dragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
        } mb-6 transition-all`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <div className="grid grid-cols-3 gap-6 p-8">
          {/* Left Column - Controls (2/3) */}
          <div className="col-span-2">
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
                {loading ? 'Scanning...' : 'Scan'}
              </button>
            </div>

            {/* Divider */}
            <div className="flex items-center gap-4 mb-6">
              <div className="flex-1 border-t border-gray-300"></div>
              <span className="text-sm text-gray-500 font-medium">OR</span>
              <div className="flex-1 border-t border-gray-300"></div>
            </div>

            {/* Drop Zone + Buttons Side by Side */}
            <div className="grid grid-cols-2 gap-4">
              {/* Drop Zone - Left Half */}
              <div className={`border-2 border-dashed rounded-xl p-8 transition-all ${
                dragActive
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-300 bg-gray-50'
              }`}>
                <div className="text-center">
                  <div className="text-4xl mb-3">📸</div>
                  <p className={`font-medium mb-2 ${dragActive ? 'text-blue-600' : 'text-gray-700'}`}>
                    {dragActive ? 'Drop image here' : 'Drag & drop'}
                  </p>
                  <p className="text-sm text-gray-500">
                    Drop image to scan
                  </p>
                </div>
              </div>

              {/* Buttons - Right Half */}
              <div className="flex flex-col gap-3">
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
                  className="flex-1 px-4 py-3 bg-white border-2 border-gray-300 rounded-lg font-medium hover:bg-gray-50 hover:border-gray-400 transition-colors disabled:opacity-50"
                >
                  📁 Choose File
                </button>
                <button
                  onClick={handleGoogleSearch}
                  className="flex-1 px-4 py-3 bg-white border-2 border-gray-300 rounded-lg font-medium hover:bg-gray-50 hover:border-gray-400 transition-colors"
                >
                  🔍 Find on Google
                </button>
              </div>
            </div>
          </div>

          {/* Right Column - Image Guidelines (1/3) */}
          <div className="border-l border-gray-200 pl-6">
            <h4 className="font-semibold text-gray-900 mb-4">Image Guidelines</h4>
            <ul className="space-y-3 text-sm text-gray-700">
              <li className="flex items-start gap-2">
                <span className="text-green-600 mt-0.5">✓</span>
                <span>Single person in frame</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600 mt-0.5">✓</span>
                <span>Head-to-toe outfit visible</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600 mt-0.5">✓</span>
                <span>Clear, well-lit photo</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600 mt-0.5">✓</span>
                <span>Editorial or street style shots work best</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="bg-white rounded-xl border-2 border-blue-200 p-12 text-center">
          <div className="animate-spin w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>

          {loadingStep && (
            <>
              <p className="text-gray-700 font-medium mb-2">
                Step {loadingStep.step} of 2
              </p>
              <p className="text-sm text-gray-600 mb-4">{loadingStep.label}</p>

              {/* Progress bar */}
              <div className="max-w-md mx-auto">
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500 transition-all duration-300 ease-out"
                    style={{ width: `${progress}%` }}
                  ></div>
                </div>
                <div className="flex justify-between text-xs text-gray-500 mt-2">
                  <span className={loadingStep.step >= 1 ? 'text-blue-600 font-medium' : ''}>
                    {loadingStep.step === 1 ? '→ ' : '✓ '}Outfit Analysis
                  </span>
                  <span className={loadingStep.step >= 2 ? 'text-blue-600 font-medium' : ''}>
                    {loadingStep.step === 2 ? '→ ' : ''}Recipe Generation
                  </span>
                </div>
              </div>
            </>
          )}

          {!loadingStep && (
            <>
              <p className="text-gray-700 font-medium">Analyzing image...</p>
              <p className="text-sm text-gray-500 mt-2">Detecting garments and extracting attributes</p>
            </>
          )}
        </div>
      )}

      {/* Results */}
      {results && !loading && (
        <div className="grid grid-cols-3 gap-6">
          {/* Image Preview - 1/3 width */}
          <div className="col-span-1 bg-white rounded-xl border-2 border-gray-200 p-4">
            <h3 className="font-semibold text-sm mb-3">Lifestyle Image</h3>
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
                <p className="text-gray-500 text-xs">[Image Preview]</p>
              </div>
            )}
          </div>

          {/* Recipe Template + Status - 2/3 width */}
          <div className="col-span-2 space-y-4">
            {/* Recipe Template Card */}
            <div className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-xl border-2 border-purple-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold">Detected Recipe Template</h3>
                <button
                  onClick={() => {
                    setResults(null);
                    setImageUrl('');
                    setSaveStatus(null);
                    setCookingStatus('idle');
                    // Clear session storage
                    sessionStorage.removeItem('presentation-recipe');
                    sessionStorage.removeItem('presentation-cooking-status');
                    sessionStorage.removeItem('presentation-outfits');
                    sessionStorage.removeItem('presentation-cooking-error');
                  }}
                  className="text-xs px-3 py-1 bg-white border border-purple-200 rounded-full hover:bg-purple-100 transition-colors"
                >
                  Try Another
                </button>
              </div>

              {/* Save Status - Inline at top of recipe */}
              {saveStatus && (
                <div className={`rounded-lg p-2.5 mb-4 flex items-start gap-2 ${
                  saveStatus === 'saved'
                    ? 'bg-green-100 border border-green-300'
                    : 'bg-blue-100 border border-blue-300'
                }`}>
                  <span className="text-base flex-shrink-0">
                    {saveStatus === 'saved' ? '✅' : 'ℹ️'}
                  </span>
                  <div>
                    <p className={`text-xs font-medium ${
                      saveStatus === 'saved' ? 'text-green-900' : 'text-blue-900'
                    }`}>
                      {saveStatus === 'saved'
                        ? 'Recipe saved to database'
                        : 'Recipe already exists'}
                    </p>
                  </div>
                </div>
              )}

              {/* Recipe Slots - Two Column Grid */}
              <div className="grid grid-cols-2 gap-3">
                {results.slots.map((slot: any, index: number) => (
                  <div key={`${slot.id}-${index}`} className={`rounded-lg p-3 border shadow-sm ${
                    slot.id === 'error' || slot.id === 'notice'
                      ? 'bg-red-50 border-red-200 col-span-2'
                      : 'bg-white border-gray-200'
                  }`}>
                    <div className="mb-1">
                      <span className={`text-xs font-semibold uppercase tracking-wide ${
                        slot.id === 'error' || slot.id === 'notice'
                          ? 'text-red-700'
                          : 'text-purple-700'
                      }`}>{slot.label}</span>
                    </div>
                    <p className={`text-sm leading-snug ${
                      slot.id === 'error' || slot.id === 'notice'
                        ? 'text-red-900'
                        : 'text-gray-900'
                    }`}>{slot.detected}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Cooking Status - Separate Card Below */}
            {cookingStatus !== 'idle' && (
              <div>
                {cookingStatus === 'cooking' && (
                  <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4 flex items-start gap-3">
                    <div className="animate-spin w-5 h-5 border-3 border-blue-500 border-t-transparent rounded-full flex-shrink-0 mt-0.5"></div>
                    <div>
                      <p className="text-sm font-semibold text-blue-900">Generating outfits in background...</p>
                      <p className="text-xs text-blue-700 mt-1">These will be ready for tagging on Slide 16</p>
                    </div>
                  </div>
                )}
                {cookingStatus === 'ready' && (
                  <div className="bg-green-50 border-2 border-green-200 rounded-xl p-4 flex items-start gap-3">
                    <span className="text-xl flex-shrink-0">✅</span>
                    <div>
                      <p className="text-sm font-semibold text-green-900">Outfits ready!</p>
                      <p className="text-xs text-green-700 mt-1">Continue to Slide 16 to see and tag them</p>
                    </div>
                  </div>
                )}
                {cookingStatus === 'error' && (
                  <div className="bg-amber-50 border-2 border-amber-200 rounded-xl p-4 flex items-start gap-3">
                    <span className="text-xl flex-shrink-0">⚠️</span>
                    <div>
                      <p className="text-sm font-semibold text-amber-900">Outfit generation had issues</p>
                      <p className="text-xs text-amber-700 mt-1">Slide 16 will use fallback products instead</p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
