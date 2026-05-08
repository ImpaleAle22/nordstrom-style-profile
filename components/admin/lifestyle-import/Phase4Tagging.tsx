'use client';

import { useState } from 'react';
import { StockImage, TaggedImage, TaggingError } from '@/lib/stock-image-types';

interface Phase4TaggingProps {
  selectedImages: StockImage[];
  onTaggingComplete: (tagged: TaggedImage[], errors: TaggingError[]) => void;
  onBack: () => void;
}

export default function Phase4Tagging({ selectedImages, onTaggingComplete, onBack }: Phase4TaggingProps) {
  const [tagging, setTagging] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentImage, setCurrentImage] = useState<string>('');
  const [taggedResults, setTaggedResults] = useState<TaggedImage[]>([]);
  const [errors, setErrors] = useState<TaggingError[]>([]);
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (message: string) => {
    setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${message}`]);
  };

  const startTagging = async () => {
    setTagging(true);
    setProgress(0);
    setTaggedResults([]);
    setErrors([]);
    setLogs([]);

    addLog(`Starting tagging for ${selectedImages.length} images...`);

    try {
      // Call the existing lifecycle-scan-batch API
      const response = await fetch('/api/lifestyle-scan-batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          images: selectedImages.map(img => ({
            imageUrl: img.url,
            imageId: img.id,
            source: `stock-${img.source}`,
            photographer: img.photographer,
            photographerUrl: img.photographerUrl
          })),
          batchSize: 10,
          delayMs: 5000 // 5 second delay between batches
        })
      });

      if (!response.ok) {
        throw new Error(`Tagging API failed: ${response.statusText}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body');
      }

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.trim()) continue;

          try {
            const result = JSON.parse(line);

            if (result.status === 'processing') {
              setCurrentImage(result.imageId);
              addLog(`Analyzing ${result.imageId}...`);
            } else if (result.status === 'complete') {
              const sourceImage = selectedImages.find(img => img.id === result.imageId);
              const tagged: TaggedImage = {
                id: result.image.imageId || result.imageId,
                url: result.image.imageUrl,
                source: sourceImage?.source || 'pexels',
                photographer: sourceImage?.photographer,
                photographerUrl: sourceImage?.photographerUrl,
                lifestyleData: {
                  outfitAnalysis: result.image.outfitAnalysis,
                  brandAdherence: result.image.brandAdherence
                }
              };

              setTaggedResults(prev => [...prev, tagged]);
              setProgress(prev => prev + 1);
              addLog(`✓ Tagged ${result.imageId} as ${result.image.outfitAnalysis.stylePillar}`);
            } else if (result.status === 'error') {
              const error: TaggingError = {
                imageId: result.imageId,
                imageUrl: selectedImages.find(img => img.id === result.imageId)?.url || '',
                error: result.error
              };
              setErrors(prev => [...prev, error]);
              addLog(`✗ Error tagging ${result.imageId}: ${result.error}`);
            }
          } catch (parseError) {
            console.error('Failed to parse NDJSON line:', line, parseError);
          }
        }
      }

      addLog(`Tagging complete! ${taggedResults.length} successful, ${errors.length} failed.`);
    } catch (error) {
      addLog(`Fatal error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setTagging(false);
      setCurrentImage('');
    }
  };

  const handleComplete = () => {
    onTaggingComplete(taggedResults, errors);
  };

  const retryFailed = () => {
    // TODO: Implement retry logic for failed images
    addLog('Retry functionality coming soon...');
  };

  const isComplete = !tagging && (taggedResults.length > 0 || errors.length > 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-slate-800/50 rounded-lg p-6 border border-slate-700">
        <h2 className="text-xl font-semibold mb-2">AI Tagging with Recipe Scout</h2>
        <p className="text-slate-400">
          Using Gemini Vision AI to analyze and tag {selectedImages.length} images
        </p>
      </div>

      {/* Progress Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-slate-800/50 rounded-lg p-6 border border-slate-700">
          <div className="text-slate-400 text-sm mb-1">Total</div>
          <div className="text-3xl font-bold">{selectedImages.length}</div>
        </div>
        <div className="bg-slate-800/50 rounded-lg p-6 border border-slate-700">
          <div className="text-slate-400 text-sm mb-1">Completed</div>
          <div className="text-3xl font-bold text-green-400">{taggedResults.length}</div>
        </div>
        <div className="bg-slate-800/50 rounded-lg p-6 border border-slate-700">
          <div className="text-slate-400 text-sm mb-1">Failed</div>
          <div className="text-3xl font-bold text-red-400">{errors.length}</div>
        </div>
        <div className="bg-slate-800/50 rounded-lg p-6 border border-slate-700">
          <div className="text-slate-400 text-sm mb-1">Progress</div>
          <div className="text-3xl font-bold text-blue-400">
            {selectedImages.length > 0
              ? Math.round(((taggedResults.length + errors.length) / selectedImages.length) * 100)
              : 0}%
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      {tagging && (
        <div className="bg-slate-800/50 rounded-lg p-6 border border-slate-700">
          <div className="mb-4">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-slate-300">Tagging in progress...</span>
              <span className="text-slate-400">
                {taggedResults.length + errors.length} / {selectedImages.length}
              </span>
            </div>
            <div className="h-3 bg-slate-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-green-500 transition-all duration-500"
                style={{
                  width: `${selectedImages.length > 0
                    ? ((taggedResults.length + errors.length) / selectedImages.length) * 100
                    : 0}%`
                }}
              />
            </div>
          </div>

          {currentImage && (
            <div className="flex items-center gap-3 text-slate-300">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500"></div>
              <span>Analyzing: {currentImage}</span>
            </div>
          )}
        </div>
      )}

      {/* Start Button */}
      {!tagging && taggedResults.length === 0 && errors.length === 0 && (
        <div className="bg-slate-800/50 rounded-lg p-8 border border-slate-700 text-center">
          <p className="text-slate-400 mb-6">
            Ready to tag {selectedImages.length} images. This will take approximately{' '}
            {Math.ceil((selectedImages.length / 10) * 5)} seconds.
          </p>
          <button
            onClick={startTagging}
            className="px-8 py-4 bg-green-500 text-white rounded-lg hover:bg-green-600 transition font-semibold text-lg"
          >
            Start AI Tagging
          </button>
        </div>
      )}

      {/* Error List */}
      {errors.length > 0 && (
        <div className="bg-red-500/10 border border-red-500 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-red-300 font-semibold">
              Failed to Tag {errors.length} Image{errors.length !== 1 ? 's' : ''}
            </h3>
            <button
              onClick={retryFailed}
              disabled={tagging}
              className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 disabled:bg-slate-600 transition"
            >
              Retry Failed
            </button>
          </div>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {errors.map((err, idx) => (
              <div key={idx} className="text-sm text-red-200 bg-red-500/10 rounded p-3">
                <div className="font-medium">{err.imageId}</div>
                <div className="text-red-300/80">{err.error}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Success Preview */}
      {taggedResults.length > 0 && (
        <div className="bg-slate-800/50 rounded-lg p-6 border border-slate-700">
          <h3 className="text-lg font-semibold mb-4">
            Successfully Tagged ({taggedResults.length})
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {taggedResults.slice(0, 12).map((img) => (
              <div key={img.id} className="relative">
                <div className="aspect-[3/4] rounded-lg overflow-hidden border border-slate-700">
                  <img
                    src={selectedImages.find(s => s.id === img.id)?.thumbnail || img.url}
                    alt="Tagged"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="mt-2 text-xs">
                  <div className="font-medium text-slate-200 capitalize truncate">
                    {img.lifestyleData.outfitAnalysis.stylePillar}
                  </div>
                  <div className="text-slate-400 capitalize">
                    {img.lifestyleData.outfitAnalysis.gender}
                  </div>
                </div>
              </div>
            ))}
          </div>
          {taggedResults.length > 12 && (
            <p className="text-center text-slate-400 text-sm mt-4">
              + {taggedResults.length - 12} more images
            </p>
          )}
        </div>
      )}

      {/* Activity Log */}
      <div className="bg-slate-800/50 rounded-lg p-6 border border-slate-700">
        <h3 className="text-lg font-semibold mb-4">Activity Log</h3>
        <div className="bg-slate-900/50 rounded p-4 font-mono text-xs text-slate-300 max-h-64 overflow-y-auto">
          {logs.length === 0 ? (
            <div className="text-slate-500">No activity yet...</div>
          ) : (
            logs.map((log, idx) => (
              <div key={idx} className="mb-1">{log}</div>
            ))
          )}
        </div>
      </div>

      {/* Navigation */}
      <div className="flex justify-between">
        <button
          onClick={onBack}
          disabled={tagging}
          className="px-6 py-3 bg-slate-700 text-white rounded-lg hover:bg-slate-600 disabled:bg-slate-800 disabled:cursor-not-allowed transition"
        >
          ← Back to Selection
        </button>
        <button
          onClick={handleComplete}
          disabled={!isComplete || taggedResults.length === 0}
          className="px-8 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-slate-600 disabled:cursor-not-allowed transition font-semibold"
        >
          Next: Review & Import ({taggedResults.length}) →
        </button>
      </div>
    </div>
  );
}
