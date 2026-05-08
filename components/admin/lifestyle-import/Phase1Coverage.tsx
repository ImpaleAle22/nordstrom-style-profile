'use client';

import { useState, useEffect } from 'react';
import { CoverageMatrix, calculateCoverage } from '@/lib/coverage-calculator';

interface Phase1CoverageProps {
  coverage: CoverageMatrix[];
  onCoverageReady: (coverage: CoverageMatrix[]) => void;
}

export default function Phase1Coverage({ coverage, onCoverageReady }: Phase1CoverageProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [localCoverage, setLocalCoverage] = useState<CoverageMatrix[]>(coverage);

  useEffect(() => {
    if (coverage.length === 0) {
      loadCoverage();
    } else {
      setLocalCoverage(coverage);
    }
  }, []);

  const loadCoverage = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await calculateCoverage();
      setLocalCoverage(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load coverage data');
    } finally {
      setLoading(false);
    }
  };

  const handleNext = () => {
    onCoverageReady(localCoverage);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-500/20 text-red-300 border-red-500';
      case 'medium': return 'bg-yellow-500/20 text-yellow-300 border-yellow-500';
      case 'low': return 'bg-green-500/20 text-green-300 border-green-500';
      default: return 'bg-slate-500/20 text-slate-300 border-slate-500';
    }
  };

  const getCellColor = (count: number, target: number = 20) => {
    const percentage = (count / target) * 100;
    if (percentage >= 75) return 'bg-green-500/30 text-green-200';
    if (percentage >= 50) return 'bg-yellow-500/30 text-yellow-200';
    if (percentage >= 25) return 'bg-orange-500/30 text-orange-200';
    return 'bg-red-500/30 text-red-200';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-slate-400">Loading coverage data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-500/10 border border-red-500 rounded-lg p-6">
        <h3 className="text-red-300 font-semibold mb-2">Error Loading Coverage</h3>
        <p className="text-red-200 mb-4">{error}</p>
        <button
          onClick={loadCoverage}
          className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition"
        >
          Retry
        </button>
      </div>
    );
  }

  const totalImages = localCoverage.reduce((sum, c) => sum + c.total, 0);
  const totalGap = localCoverage.reduce((sum, c) => sum + Math.max(0, c.gap), 0);
  const targetTotal = localCoverage.length * 40; // 9 pillars × 40 images

  return (
    <div className="space-y-8">
      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-slate-800/50 rounded-lg p-6 border border-slate-700">
          <div className="text-slate-400 text-sm mb-1">Total Images</div>
          <div className="text-3xl font-bold">{totalImages}</div>
        </div>
        <div className="bg-slate-800/50 rounded-lg p-6 border border-slate-700">
          <div className="text-slate-400 text-sm mb-1">Target</div>
          <div className="text-3xl font-bold">{targetTotal}</div>
        </div>
        <div className="bg-slate-800/50 rounded-lg p-6 border border-slate-700">
          <div className="text-slate-400 text-sm mb-1">Gap</div>
          <div className="text-3xl font-bold text-orange-400">{totalGap}</div>
        </div>
        <div className="bg-slate-800/50 rounded-lg p-6 border border-slate-700">
          <div className="text-slate-400 text-sm mb-1">Progress</div>
          <div className="text-3xl font-bold text-blue-400">
            {Math.round((totalImages / targetTotal) * 100)}%
          </div>
        </div>
      </div>

      {/* Coverage Heatmap */}
      <div className="bg-slate-800/50 rounded-lg p-6 border border-slate-700">
        <h2 className="text-xl font-semibold mb-4">Coverage by Pillar & Gender</h2>
        <p className="text-slate-400 mb-6">
          Target: 20 images per gender per pillar (40 total per pillar)
        </p>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-700">
                <th className="text-left py-3 px-4 text-slate-300 font-medium">Pillar</th>
                <th className="text-center py-3 px-4 text-slate-300 font-medium">Womenswear</th>
                <th className="text-center py-3 px-4 text-slate-300 font-medium">Menswear</th>
                <th className="text-center py-3 px-4 text-slate-300 font-medium">Total</th>
                <th className="text-center py-3 px-4 text-slate-300 font-medium">Gap</th>
                <th className="text-center py-3 px-4 text-slate-300 font-medium">Priority</th>
              </tr>
            </thead>
            <tbody>
              {localCoverage.map((row) => (
                <tr key={row.pillar} className="border-b border-slate-700/50">
                  <td className="py-3 px-4 font-medium capitalize">{row.pillar}</td>
                  <td className="py-3 px-4 text-center">
                    <span className={`inline-block px-3 py-1 rounded ${getCellColor(row.women)}`}>
                      {row.women}/20
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span className={`inline-block px-3 py-1 rounded ${getCellColor(row.men)}`}>
                      {row.men}/20
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center font-semibold">
                    {row.total}/40
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span className="text-orange-300">
                      {row.gap > 0 ? `+${row.gap}` : row.gap}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span className={`inline-block px-3 py-1 rounded border ${getPriorityColor(row.priority)}`}>
                      {row.priority}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Color Legend */}
      <div className="bg-slate-800/50 rounded-lg p-6 border border-slate-700">
        <h3 className="text-sm font-semibold mb-3 text-slate-300">Coverage Legend</h3>
        <div className="flex flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded bg-green-500/30"></div>
            <span className="text-sm text-slate-300">75-100% (15-20 images)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded bg-yellow-500/30"></div>
            <span className="text-sm text-slate-300">50-75% (10-15 images)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded bg-orange-500/30"></div>
            <span className="text-sm text-slate-300">25-50% (5-10 images)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded bg-red-500/30"></div>
            <span className="text-sm text-slate-300">0-25% (0-5 images)</span>
          </div>
        </div>
      </div>

      {/* Next Button */}
      <div className="flex justify-end gap-4">
        <button
          onClick={loadCoverage}
          className="px-6 py-3 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition"
        >
          Refresh Data
        </button>
        <button
          onClick={handleNext}
          className="px-8 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition font-semibold"
        >
          Next: Search for Images →
        </button>
      </div>
    </div>
  );
}
