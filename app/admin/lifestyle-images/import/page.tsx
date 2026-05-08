'use client';

import { useState } from 'react';
import { WorkflowPhase, WorkflowState, StockImage, TaggedImage, TaggingError } from '@/lib/stock-image-types';
import { CoverageMatrix } from '@/lib/coverage-calculator';
import Phase1Coverage from '@/components/admin/lifestyle-import/Phase1Coverage';
import Phase2Search from '@/components/admin/lifestyle-import/Phase2Search';
import Phase3Selection from '@/components/admin/lifestyle-import/Phase3Selection';
import Phase4Tagging from '@/components/admin/lifestyle-import/Phase4Tagging';
import Phase5Review from '@/components/admin/lifestyle-import/Phase5Review';

export default function LifestyleImageImportPage() {
  const [workflowState, setWorkflowState] = useState<WorkflowState>({
    phase: 1,
    searchResults: [],
    selectedIds: new Set(),
    taggedResults: [],
    taggingProgress: {
      total: 0,
      completed: 0,
      failed: 0
    },
    taggingErrors: []
  });

  const [coverage, setCoverage] = useState<CoverageMatrix[]>([]);

  // Phase navigation
  const goToPhase = (phase: WorkflowPhase) => {
    setWorkflowState(prev => ({ ...prev, phase }));
  };

  // Phase 1 → 2: Coverage analyzed, move to search
  const handleCoverageReady = (coverageData: CoverageMatrix[]) => {
    setCoverage(coverageData);
    goToPhase(2);
  };

  // Phase 2 → 3: Search completed, move to selection
  const handleSearchComplete = (results: StockImage[]) => {
    setWorkflowState(prev => ({
      ...prev,
      phase: 3,
      searchResults: results,
      selectedIds: new Set() // Reset selection
    }));
  };

  // Phase 3 → 4: Images selected, move to tagging
  const handleSelectionComplete = () => {
    const selectedImages = workflowState.searchResults.filter(img =>
      workflowState.selectedIds.has(img.id)
    );

    setWorkflowState(prev => ({
      ...prev,
      phase: 4,
      taggingProgress: {
        total: selectedImages.length,
        completed: 0,
        failed: 0
      }
    }));
  };

  // Phase 4 → 5: Tagging completed, move to review
  const handleTaggingComplete = (tagged: TaggedImage[], errors: TaggingError[]) => {
    setWorkflowState(prev => ({
      ...prev,
      phase: 5,
      taggedResults: tagged,
      taggingErrors: errors
    }));
  };

  // Phase 5 → Done: Import completed
  const handleImportComplete = () => {
    // Reset workflow for next batch
    setWorkflowState({
      phase: 1,
      searchResults: [],
      selectedIds: new Set(),
      taggedResults: [],
      taggingProgress: {
        total: 0,
        completed: 0,
        failed: 0
      },
      taggingErrors: []
    });
  };

  // Selection state management
  const toggleSelection = (imageId: string) => {
    setWorkflowState(prev => {
      const newSelectedIds = new Set(prev.selectedIds);
      if (newSelectedIds.has(imageId)) {
        newSelectedIds.delete(imageId);
      } else {
        newSelectedIds.add(imageId);
      }
      return { ...prev, selectedIds: newSelectedIds };
    });
  };

  const selectAll = () => {
    setWorkflowState(prev => ({
      ...prev,
      selectedIds: new Set(prev.searchResults.map(img => img.id))
    }));
  };

  const clearSelection = () => {
    setWorkflowState(prev => ({
      ...prev,
      selectedIds: new Set()
    }));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
      {/* Header */}
      <div className="border-b border-slate-700 bg-slate-900/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <h1 className="text-3xl font-bold mb-2">Lifestyle Image Import Tool</h1>
          <p className="text-slate-400">
            Search, select, tag, and import lifestyle images in 5 simple steps
          </p>
        </div>
      </div>

      {/* Phase Stepper */}
      <div className="border-b border-slate-700 bg-slate-900/30">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            {[
              { num: 1, label: 'Coverage' },
              { num: 2, label: 'Search' },
              { num: 3, label: 'Select' },
              { num: 4, label: 'Tag' },
              { num: 5, label: 'Review' }
            ].map((step, idx) => (
              <div key={step.num} className="flex items-center flex-1">
                <button
                  onClick={() => {
                    // Only allow going back to previous phases
                    if (step.num < workflowState.phase) {
                      goToPhase(step.num as WorkflowPhase);
                    }
                  }}
                  disabled={step.num > workflowState.phase}
                  className={`
                    flex items-center justify-center w-10 h-10 rounded-full font-semibold
                    transition-all duration-200
                    ${step.num === workflowState.phase
                      ? 'bg-blue-500 text-white ring-4 ring-blue-500/30'
                      : step.num < workflowState.phase
                        ? 'bg-green-500 text-white cursor-pointer hover:ring-4 hover:ring-green-500/30'
                        : 'bg-slate-700 text-slate-400 cursor-not-allowed'
                    }
                  `}
                >
                  {step.num < workflowState.phase ? '✓' : step.num}
                </button>
                <div className="ml-3 flex-1">
                  <div className={`text-sm font-medium ${
                    step.num === workflowState.phase ? 'text-white' : 'text-slate-400'
                  }`}>
                    {step.label}
                  </div>
                </div>
                {idx < 4 && (
                  <div className={`flex-1 h-0.5 mx-4 ${
                    step.num < workflowState.phase ? 'bg-green-500' : 'bg-slate-700'
                  }`} />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Phase Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {workflowState.phase === 1 && (
          <Phase1Coverage
            coverage={coverage}
            onCoverageReady={handleCoverageReady}
          />
        )}

        {workflowState.phase === 2 && (
          <Phase2Search
            coverage={coverage}
            onSearchComplete={handleSearchComplete}
            onBack={() => goToPhase(1)}
          />
        )}

        {workflowState.phase === 3 && (
          <Phase3Selection
            searchResults={workflowState.searchResults}
            selectedIds={workflowState.selectedIds}
            onToggleSelection={toggleSelection}
            onSelectAll={selectAll}
            onClearSelection={clearSelection}
            onNext={handleSelectionComplete}
            onBack={() => goToPhase(2)}
          />
        )}

        {workflowState.phase === 4 && (
          <Phase4Tagging
            selectedImages={workflowState.searchResults.filter(img =>
              workflowState.selectedIds.has(img.id)
            )}
            onTaggingComplete={handleTaggingComplete}
            onBack={() => goToPhase(3)}
          />
        )}

        {workflowState.phase === 5 && (
          <Phase5Review
            taggedResults={workflowState.taggedResults}
            taggingErrors={workflowState.taggingErrors}
            onImportComplete={handleImportComplete}
            onBack={() => goToPhase(4)}
          />
        )}
      </div>
    </div>
  );
}
