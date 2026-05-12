'use client';

import { useState } from 'react';
import { TaggedImage, TaggingError } from '@/lib/stock-image-types';

interface Phase5ReviewProps {
  taggedResults: TaggedImage[];
  taggingErrors: TaggingError[];
  onImportComplete: () => void;
  onBack: () => void;
}

export default function Phase5Review({
  taggedResults,
  taggingErrors,
  onImportComplete,
  onBack
}: Phase5ReviewProps) {
  const [importing, setImporting] = useState(false);
  const [importSuccess, setImportSuccess] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [editingImage, setEditingImage] = useState<TaggedImage | null>(null);
  const [localTaggedResults, setLocalTaggedResults] = useState<TaggedImage[]>(taggedResults);
  const [showLowConfidence, setShowLowConfidence] = useState(true);

  // Calculate confidence stats
  const highConfidenceImages = localTaggedResults.filter(
    img => !img.clipValidation || img.clipValidation.confidence === 'high'
  );
  const mediumConfidenceImages = localTaggedResults.filter(
    img => img.clipValidation?.confidence === 'medium'
  );
  const lowConfidenceImages = localTaggedResults.filter(
    img => img.clipValidation?.confidence === 'low'
  );

  const imagesToDisplay = showLowConfidence
    ? localTaggedResults
    : localTaggedResults.filter(img => img.clipValidation?.confidence !== 'low');

  const handleImport = async () => {
    setImporting(true);
    setImportError(null);

    try {
      console.log('[Phase5] Starting import of', localTaggedResults.length, 'images');
      console.log('[Phase5] First image sample:', localTaggedResults[0]);

      const response = await fetch('/api/lifestyle-images/bulk-import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          images: localTaggedResults
        })
      });

      console.log('[Phase5] Response status:', response.status, response.statusText);

      if (!response.ok) {
        const errorData = await response.json();
        console.error('[Phase5] Import failed:', errorData);
        throw new Error(errorData.details || errorData.error || 'Import failed');
      }

      const result = await response.json();
      console.log('[Phase5] Import successful:', result);

      setImportSuccess(true);

      // Track Unsplash downloads for attribution
      await Promise.all(
        localTaggedResults
          .filter(img => img.source === 'unsplash' && img.photographerUrl)
          .map(async (img) => {
            // Extract download location from the original search result
            // This would need to be passed through from Phase 3
            // For now, we'll skip this step as it requires refactoring
            return Promise.resolve();
          })
      );

      // Wait 2 seconds then navigate to completion
      setTimeout(() => {
        onImportComplete();
      }, 2000);
    } catch (error) {
      setImportError(error instanceof Error ? error.message : 'Import failed');
    } finally {
      setImporting(false);
    }
  };

  const handleEdit = (image: TaggedImage) => {
    setEditingImage(image);
  };

  const handleSaveEdit = (updatedImage: TaggedImage) => {
    setLocalTaggedResults(prev =>
      prev.map(img => img.id === updatedImage.id ? updatedImage : img)
    );
    setEditingImage(null);
  };

  const handleRemove = (imageId: string) => {
    setLocalTaggedResults(prev => prev.filter(img => img.id !== imageId));
  };

  const exportJSON = () => {
    const dataStr = JSON.stringify(localTaggedResults, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `tagged-lifestyle-images-${Date.now()}.json`;
    link.click();
  };

  if (importSuccess) {
    return (
      <div className="bg-green-500/10 border border-green-500 rounded-lg p-12 text-center">
        <div className="inline-flex items-center justify-center w-20 h-20 bg-green-500 rounded-full mb-6">
          <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-3xl font-bold text-green-300 mb-3">Import Successful!</h2>
        <p className="text-green-200 text-lg">
          Successfully imported {localTaggedResults.length} lifestyle images to Supabase.
        </p>
        <p className="text-slate-400 mt-4">Redirecting to coverage analysis...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-slate-800/50 rounded-lg p-6 border border-slate-700">
        <h2 className="text-xl font-semibold mb-2">Review & Import</h2>
        <p className="text-slate-400">
          Review tagged images and import {localTaggedResults.length} images to database
        </p>

        {/* CLIP Confidence Stats */}
        {(highConfidenceImages.length > 0 || mediumConfidenceImages.length > 0 || lowConfidenceImages.length > 0) && (
          <div className="mt-4 pt-4 border-t border-slate-700">
            <div className="flex items-center justify-between">
              <div className="flex gap-6 text-sm">
                <div>
                  <span className="text-slate-400">High Confidence:</span>
                  <span className="ml-2 font-semibold text-green-400">{highConfidenceImages.length}</span>
                </div>
                <div>
                  <span className="text-slate-400">Medium:</span>
                  <span className="ml-2 font-semibold text-yellow-400">{mediumConfidenceImages.length}</span>
                </div>
                <div>
                  <span className="text-slate-400">Low:</span>
                  <span className="ml-2 font-semibold text-red-400">{lowConfidenceImages.length}</span>
                </div>
              </div>

              {lowConfidenceImages.length > 0 && (
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showLowConfidence}
                    onChange={(e) => setShowLowConfidence(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-600 bg-slate-700 text-blue-500"
                  />
                  <span className="text-sm text-slate-300">
                    Include {lowConfidenceImages.length} low-confidence images
                  </span>
                </label>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Import Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-slate-800/50 rounded-lg p-6 border border-slate-700">
          <div className="text-slate-400 text-sm mb-1">Will Import</div>
          <div className="text-3xl font-bold text-green-400">{imagesToDisplay.length}</div>
        </div>
        <div className="bg-slate-800/50 rounded-lg p-6 border border-slate-700">
          <div className="text-slate-400 text-sm mb-1">Filtered Out</div>
          <div className="text-3xl font-bold text-orange-400">
            {showLowConfidence ? 0 : lowConfidenceImages.length}
          </div>
        </div>
        <div className="bg-slate-800/50 rounded-lg p-6 border border-slate-700">
          <div className="text-slate-400 text-sm mb-1">Failed (Skipped)</div>
          <div className="text-3xl font-bold text-red-400">{taggingErrors.length}</div>
        </div>
        <div className="bg-slate-800/50 rounded-lg p-6 border border-slate-700">
          <div className="text-slate-400 text-sm mb-1">Coverage Increase</div>
          <div className="text-3xl font-bold text-blue-400">+{imagesToDisplay.length}</div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-4">
        <button
          onClick={exportJSON}
          className="px-6 py-3 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition"
        >
          Export JSON Backup
        </button>
      </div>

      {/* Tagged Images Grid */}
      <div className="bg-slate-800/50 rounded-lg p-6 border border-slate-700">
        <h3 className="text-lg font-semibold mb-4">Tagged Images ({imagesToDisplay.length})</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {imagesToDisplay.map((img) => (
            <div key={img.id} className="bg-slate-900/50 rounded-lg overflow-hidden border border-slate-700">
              {/* Image */}
              <div className="aspect-[3/4] relative">
                <img
                  src={img.url}
                  alt={img.lifestyleData.outfitAnalysis.stylePillar}
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-2 right-2 px-2 py-1 bg-black/80 backdrop-blur-sm rounded text-xs text-white capitalize">
                  {img.source}
                </div>
              </div>

              {/* Tags */}
              <div className="p-4 space-y-3">
                <div>
                  <div className="text-xs text-slate-400 mb-1">Style Pillar</div>
                  <div className="text-sm font-semibold capitalize">
                    {img.lifestyleData.outfitAnalysis.stylePillar}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className="text-xs text-slate-400 mb-1">Gender</div>
                    <div className="text-sm capitalize">
                      {img.lifestyleData.outfitAnalysis.gender}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-400 mb-1">Gemini Confidence</div>
                    <div className="text-sm">
                      {Math.round(img.lifestyleData.outfitAnalysis.pillarConfidence * 100)}%
                    </div>
                  </div>
                </div>

                {/* CLIP Validation Badge */}
                {img.clipValidation && (
                  <div>
                    <div className="text-xs text-slate-400 mb-1">CLIP Validation</div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-2 py-1 rounded font-medium ${
                        img.clipValidation.confidence === 'high'
                          ? 'bg-green-500/20 text-green-300'
                          : img.clipValidation.confidence === 'medium'
                            ? 'bg-yellow-500/20 text-yellow-300'
                            : 'bg-red-500/20 text-red-300'
                      }`}>
                        {img.clipValidation.confidence.toUpperCase()}
                      </span>
                      <span className="text-xs text-slate-400">
                        {(img.clipValidation.similarity * 100).toFixed(0)}%
                      </span>
                    </div>
                    {img.clipValidation.topPillars && img.clipValidation.topPillars.length > 0 && (
                      <div className="text-xs text-slate-500 mt-1">
                        Top: {img.clipValidation.topPillars[0].name}
                      </div>
                    )}
                  </div>
                )}

                <div>
                  <div className="text-xs text-slate-400 mb-1">Vibes</div>
                  <div className="flex flex-wrap gap-1">
                    {img.lifestyleData.outfitAnalysis.vibes.slice(0, 3).map((vibe, idx) => (
                      <span
                        key={idx}
                        className="text-xs px-2 py-0.5 bg-purple-500/20 text-purple-300 rounded"
                      >
                        {vibe}
                      </span>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="text-xs text-slate-400 mb-1">Brand Score</div>
                  <div className="text-sm">
                    {img.lifestyleData.brandAdherence.score}/100
                  </div>
                </div>

                {/* Attribution */}
                {img.photographer && (
                  <div className="pt-3 border-t border-slate-700">
                    <div className="text-xs text-slate-400">
                      Photo by <span className="text-slate-300">{img.photographer}</span>
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2 pt-2">
                  <button
                    onClick={() => handleEdit(img)}
                    className="flex-1 px-3 py-2 bg-blue-500/20 text-blue-300 rounded hover:bg-blue-500/30 transition text-sm"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleRemove(img.id)}
                    className="flex-1 px-3 py-2 bg-red-500/20 text-red-300 rounded hover:bg-red-500/30 transition text-sm"
                  >
                    Remove
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Import Error */}
      {importError && (
        <div className="bg-red-500/10 border border-red-500 rounded-lg p-6">
          <h3 className="text-red-300 font-semibold mb-2">Import Failed</h3>
          <p className="text-red-200">{importError}</p>
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between">
        <button
          onClick={onBack}
          disabled={importing}
          className="px-6 py-3 bg-slate-700 text-white rounded-lg hover:bg-slate-600 disabled:bg-slate-800 disabled:cursor-not-allowed transition"
        >
          ← Back to Tagging
        </button>
        <button
          onClick={handleImport}
          disabled={importing || localTaggedResults.length === 0}
          className="px-8 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:bg-slate-600 disabled:cursor-not-allowed transition font-semibold"
        >
          {importing ? 'Importing...' : `Import ${localTaggedResults.length} Images to Supabase`}
        </button>
      </div>

      {/* Edit Modal */}
      {editingImage && (
        <EditModal
          image={editingImage}
          onSave={handleSaveEdit}
          onCancel={() => setEditingImage(null)}
        />
      )}
    </div>
  );
}

// Edit Modal Component
function EditModal({
  image,
  onSave,
  onCancel
}: {
  image: TaggedImage;
  onSave: (image: TaggedImage) => void;
  onCancel: () => void;
}) {
  const [editedImage, setEditedImage] = useState<TaggedImage>(image);

  const pillars = ['romantic', 'classic', 'casual', 'dramatic', 'creative', 'alluring', 'modern', 'natural', 'timeless'];
  const genders = ['womenswear', 'menswear'];

  const handleSave = () => {
    onSave(editedImage);
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-6">
      <div className="bg-slate-800 rounded-lg p-8 max-w-2xl w-full border border-slate-700 max-h-[90vh] overflow-y-auto">
        <h3 className="text-2xl font-bold mb-6">Edit Tags</h3>

        <div className="space-y-6">
          {/* Style Pillar */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Style Pillar
            </label>
            <select
              value={editedImage.lifestyleData.outfitAnalysis.stylePillar}
              onChange={(e) => setEditedImage({
                ...editedImage,
                lifestyleData: {
                  ...editedImage.lifestyleData,
                  outfitAnalysis: {
                    ...editedImage.lifestyleData.outfitAnalysis,
                    stylePillar: e.target.value
                  }
                }
              })}
              className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white"
            >
              {pillars.map(pillar => (
                <option key={pillar} value={pillar} className="capitalize">
                  {pillar}
                </option>
              ))}
            </select>
          </div>

          {/* Gender */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Gender
            </label>
            <select
              value={editedImage.lifestyleData.outfitAnalysis.gender}
              onChange={(e) => setEditedImage({
                ...editedImage,
                lifestyleData: {
                  ...editedImage.lifestyleData,
                  outfitAnalysis: {
                    ...editedImage.lifestyleData.outfitAnalysis,
                    gender: e.target.value as 'womenswear' | 'menswear'
                  }
                }
              })}
              className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white"
            >
              {genders.map(gender => (
                <option key={gender} value={gender} className="capitalize">
                  {gender}
                </option>
              ))}
            </select>
          </div>

          {/* Pillar Confidence */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Pillar Confidence: {Math.round(editedImage.lifestyleData.outfitAnalysis.pillarConfidence * 100)}%
            </label>
            <input
              type="range"
              min="0"
              max="100"
              value={Math.round(editedImage.lifestyleData.outfitAnalysis.pillarConfidence * 100)}
              onChange={(e) => setEditedImage({
                ...editedImage,
                lifestyleData: {
                  ...editedImage.lifestyleData,
                  outfitAnalysis: {
                    ...editedImage.lifestyleData.outfitAnalysis,
                    pillarConfidence: Number(e.target.value) / 100
                  }
                }
              })}
              className="w-full"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-4 pt-6 border-t border-slate-700">
            <button
              onClick={onCancel}
              className="flex-1 px-6 py-3 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="flex-1 px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition font-semibold"
            >
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
