'use client';

import { useState, useEffect, useRef } from 'react';
import { StockImage } from '@/lib/stock-image-types';

interface Phase3SelectionProps {
  searchResults: StockImage[];
  selectedIds: Set<string>;
  onToggleSelection: (imageId: string) => void;
  onSelectAll: () => void;
  onClearSelection: () => void;
  onNext: () => void;
  onBack: () => void;
}

export default function Phase3Selection({
  searchResults,
  selectedIds,
  onToggleSelection,
  onSelectAll,
  onClearSelection,
  onNext,
  onBack
}: Phase3SelectionProps) {
  const [focusedIndex, setFocusedIndex] = useState(0);
  const [previewImage, setPreviewImage] = useState<StockImage | null>(null);
  const [showHelp, setShowHelp] = useState(false);
  const gridRef = useRef<HTMLDivElement>(null);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      const currentImage = searchResults[focusedIndex];
      if (!currentImage) return;

      if (e.key === 'k' || e.key === 'K') {
        e.preventDefault();
        onToggleSelection(currentImage.id);
        // Move to next image after selection
        setFocusedIndex(prev => Math.min(prev + 1, searchResults.length - 1));
      } else if (e.key === 'd' || e.key === 'D') {
        e.preventDefault();
        // If selected, deselect
        if (selectedIds.has(currentImage.id)) {
          onToggleSelection(currentImage.id);
        }
        // Move to next image
        setFocusedIndex(prev => Math.min(prev + 1, searchResults.length - 1));
      } else if (e.key === ' ') {
        e.preventDefault();
        setPreviewImage(currentImage);
      } else if (e.key === 'Escape') {
        setPreviewImage(null);
        setShowHelp(false);
      } else if (e.key === '?') {
        e.preventDefault();
        setShowHelp(true);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        setFocusedIndex(prev => Math.min(prev + 1, searchResults.length - 1));
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setFocusedIndex(prev => Math.max(prev - 1, 0));
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        // Move down one row (assume 4 columns)
        setFocusedIndex(prev => Math.min(prev + 4, searchResults.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        // Move up one row
        setFocusedIndex(prev => Math.max(prev - 4, 0));
      } else if ((e.metaKey || e.ctrlKey) && e.key === 'a') {
        e.preventDefault();
        onSelectAll();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [focusedIndex, searchResults, selectedIds]);

  // Scroll focused item into view
  useEffect(() => {
    const focusedElement = document.getElementById(`image-${focusedIndex}`);
    if (focusedElement) {
      focusedElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [focusedIndex]);

  const handleExportJSON = () => {
    const selectedImages = searchResults.filter(img => selectedIds.has(img.id));
    const dataStr = JSON.stringify(selectedImages, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `selected-images-${Date.now()}.json`;
    link.click();
  };

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="bg-slate-800/50 rounded-lg p-6 border border-slate-700">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold mb-2">Select Images</h2>
            <p className="text-slate-400">
              Click images or use keyboard shortcuts: <kbd className="px-2 py-1 bg-slate-700 rounded text-xs">K</kbd> to keep, <kbd className="px-2 py-1 bg-slate-700 rounded text-xs">D</kbd> to skip
            </p>
          </div>
          <button
            onClick={() => setShowHelp(true)}
            className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition"
          >
            Keyboard Shortcuts (?)
          </button>
        </div>

        {/* Stats Bar */}
        <div className="flex items-center justify-between mt-6 pt-6 border-t border-slate-700">
          <div className="flex gap-6">
            <div>
              <span className="text-slate-400 text-sm">Total Results:</span>
              <span className="ml-2 font-semibold text-white">{searchResults.length}</span>
            </div>
            <div>
              <span className="text-slate-400 text-sm">Selected:</span>
              <span className="ml-2 font-semibold text-green-400">{selectedIds.size}</span>
            </div>
            <div>
              <span className="text-slate-400 text-sm">Focused:</span>
              <span className="ml-2 font-semibold text-blue-400">#{focusedIndex + 1}</span>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={onSelectAll}
              className="px-4 py-2 bg-green-500/20 text-green-300 rounded-lg hover:bg-green-500/30 transition border border-green-500/50"
            >
              Select All
            </button>
            <button
              onClick={onClearSelection}
              className="px-4 py-2 bg-red-500/20 text-red-300 rounded-lg hover:bg-red-500/30 transition border border-red-500/50"
            >
              Clear Selection
            </button>
            <button
              onClick={handleExportJSON}
              disabled={selectedIds.size === 0}
              className="px-4 py-2 bg-blue-500/20 text-blue-300 rounded-lg hover:bg-blue-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition border border-blue-500/50"
            >
              Export JSON
            </button>
          </div>
        </div>
      </div>

      {/* Image Grid */}
      <div
        ref={gridRef}
        className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-6"
      >
        {searchResults.map((img, idx) => {
          const isSelected = selectedIds.has(img.id);
          const isFocused = idx === focusedIndex;

          return (
            <div
              key={img.id}
              id={`image-${idx}`}
              onClick={() => onToggleSelection(img.id)}
              className={`
                relative group cursor-pointer rounded-lg overflow-hidden
                transition-all duration-200
                ${isSelected ? 'ring-4 ring-green-500 scale-[1.02]' : 'hover:ring-2 hover:ring-blue-500'}
                ${isFocused ? 'ring-2 ring-blue-400 ring-offset-2 ring-offset-slate-900' : ''}
              `}
            >
              {/* Image */}
              <div className="aspect-[3/4] bg-slate-800 border border-slate-700">
                <img
                  src={img.thumbnail}
                  alt={img.alt || 'Stock photo'}
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Selection Checkmark */}
              {isSelected && (
                <div className="absolute top-3 right-3 w-10 h-10 bg-green-500 rounded-full flex items-center justify-center shadow-lg">
                  <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              )}

              {/* Focus Indicator */}
              {isFocused && (
                <div className="absolute top-3 left-3 px-2 py-1 bg-blue-500 text-white text-xs font-semibold rounded">
                  FOCUSED
                </div>
              )}

              {/* Info Overlay */}
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black via-black/80 to-transparent p-4 opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="text-white text-sm font-medium mb-1 truncate">
                  {img.photographer}
                </div>
                <div className="text-slate-300 text-xs capitalize">
                  {img.source}
                </div>
              </div>

              {/* Preview Button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setPreviewImage(img);
                }}
                className="absolute top-3 left-3 w-8 h-8 bg-black/60 backdrop-blur-sm rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/80"
              >
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                </svg>
              </button>
            </div>
          );
        })}
      </div>

      {/* Navigation */}
      <div className="flex justify-between pt-6">
        <button
          onClick={onBack}
          className="px-6 py-3 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition"
        >
          ← Back to Search
        </button>
        <button
          onClick={onNext}
          disabled={selectedIds.size === 0}
          className="px-8 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-slate-600 disabled:cursor-not-allowed transition font-semibold"
        >
          Next: Tag Selected ({selectedIds.size}) →
        </button>
      </div>

      {/* Help Modal */}
      {showHelp && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-6">
          <div className="bg-slate-800 rounded-lg p-8 max-w-2xl w-full border border-slate-700">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold">Keyboard Shortcuts</h3>
              <button
                onClick={() => setShowHelp(false)}
                className="text-slate-400 hover:text-white transition"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <kbd className="px-3 py-2 bg-slate-700 rounded text-lg font-mono w-20 text-center">K</kbd>
                <span className="text-slate-300">Keep / Select current image</span>
              </div>
              <div className="flex items-center gap-4">
                <kbd className="px-3 py-2 bg-slate-700 rounded text-lg font-mono w-20 text-center">D</kbd>
                <span className="text-slate-300">Skip / Deselect current image</span>
              </div>
              <div className="flex items-center gap-4">
                <kbd className="px-3 py-2 bg-slate-700 rounded text-lg font-mono w-20 text-center">Space</kbd>
                <span className="text-slate-300">Preview current image</span>
              </div>
              <div className="flex items-center gap-4">
                <kbd className="px-3 py-2 bg-slate-700 rounded text-lg font-mono w-20 text-center">← →</kbd>
                <span className="text-slate-300">Navigate left/right</span>
              </div>
              <div className="flex items-center gap-4">
                <kbd className="px-3 py-2 bg-slate-700 rounded text-lg font-mono w-20 text-center">↑ ↓</kbd>
                <span className="text-slate-300">Navigate up/down</span>
              </div>
              <div className="flex items-center gap-4">
                <kbd className="px-3 py-2 bg-slate-700 rounded text-lg font-mono w-20 text-center">Cmd+A</kbd>
                <span className="text-slate-300">Select all images</span>
              </div>
              <div className="flex items-center gap-4">
                <kbd className="px-3 py-2 bg-slate-700 rounded text-lg font-mono w-20 text-center">?</kbd>
                <span className="text-slate-300">Show this help</span>
              </div>
              <div className="flex items-center gap-4">
                <kbd className="px-3 py-2 bg-slate-700 rounded text-lg font-mono w-20 text-center">Esc</kbd>
                <span className="text-slate-300">Close preview/help</span>
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-slate-700">
              <button
                onClick={() => setShowHelp(false)}
                className="w-full px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition font-semibold"
              >
                Got it!
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {previewImage && (
        <div
          onClick={() => setPreviewImage(null)}
          className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-6"
        >
          <div className="max-w-4xl max-h-[90vh] flex flex-col">
            <img
              src={previewImage.url}
              alt={previewImage.alt || 'Preview'}
              className="max-h-[80vh] w-auto object-contain rounded-lg"
            />
            <div className="mt-4 text-center">
              <p className="text-white font-medium">{previewImage.photographer}</p>
              <p className="text-slate-400 text-sm capitalize">{previewImage.source}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
