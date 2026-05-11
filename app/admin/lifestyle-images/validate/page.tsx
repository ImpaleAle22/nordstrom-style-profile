'use client';

import { useState, useEffect } from 'react';
import { embedImage, embedConcepts, cosineSimilarity, type StyleConcepts } from '@/lib/clip-client';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface LifestyleImage {
  id: string;
  image_url: string;
  style_pillar: string;
  gender: string;
  pillar_confidence: number;
  source: string;
}

interface ValidationResult {
  image: LifestyleImage;
  embedding: number[];
  clipTopPillar: string;
  clipSimilarity: number;
  clipConfidence: 'high' | 'medium' | 'low';
  matches: boolean;
  topPillars: Array<{ name: string; score: number }>;
  suggestedSubTerm?: { name: string; score: number };
}

export default function LifestyleValidationPage() {
  const [loading, setLoading] = useState(false);
  const [images, setImages] = useState<LifestyleImage[]>([]);
  const [validationResults, setValidationResults] = useState<ValidationResult[]>([]);
  const [styleConcepts, setStyleConcepts] = useState<StyleConcepts | null>(null);
  const [progress, setProgress] = useState(0);
  const [logs, setLogs] = useState<string[]>([]);
  const [filterMismatch, setFilterMismatch] = useState(false);
  const [filterLowConfidence, setFilterLowConfidence] = useState(false);

  const addLog = (message: string) => {
    setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${message}`]);
  };

  // Load lifestyle images from Supabase
  const loadImages = async (limit: number = 50) => {
    try {
      addLog(`Loading ${limit} lifestyle images from Supabase...`);
      const { data, error } = await supabase
        .from('lifestyle_images')
        .select('id, image_url, style_pillar, gender, pillar_confidence, source')
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      setImages(data || []);
      addLog(`✓ Loaded ${data?.length || 0} images`);
    } catch (error) {
      addLog(`✗ Error loading images: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  // Warm up CLIP API (prevents cold start timeouts)
  const warmupCLIP = async () => {
    try {
      addLog('Warming up CLIP API...');
      const response = await fetch(`${process.env.NEXT_PUBLIC_CLIP_API_URL}/health`);
      if (!response.ok) throw new Error('Health check failed');
      addLog('✓ CLIP API ready');
      return true;
    } catch (error) {
      addLog(`⚠️  CLIP API warmup failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return false;
    }
  };

  // Load CLIP style concepts
  const loadStyleConcepts = async () => {
    try {
      addLog('Loading CLIP style concepts...');

      // Warm up API first
      await warmupCLIP();

      const concepts = await embedConcepts({
        categories: ['pillars', 'sub_terms'],
        useCache: true
      });
      setStyleConcepts(concepts);
      addLog(`✓ Loaded ${concepts.metadata.totalConcepts} style concepts (${Object.keys(concepts.pillars).length} pillars + sub-terms)`);
    } catch (error) {
      addLog(`✗ Error loading style concepts: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  // Validate all images
  const validateImages = async () => {
    if (!styleConcepts) {
      addLog('✗ Style concepts not loaded');
      return;
    }

    setLoading(true);
    setValidationResults([]);
    setProgress(0);

    addLog(`Starting validation of ${images.length} images...`);

    const results: ValidationResult[] = [];

    for (let i = 0; i < images.length; i++) {
      const image = images[i];

      try {
        addLog(`Validating ${i + 1}/${images.length}: ${image.id}...`);

        // Generate CLIP embedding (with longer timeout for first few images in case of cold start)
        const timeout = i < 3 ? 45000 : 30000; // 45s for first 3, 30s for rest
        const { embedding } = await embedImage(image.image_url, timeout);

        // Calculate similarity to all pillars
        const pillarScores = Object.entries(styleConcepts.pillars).map(([name, emb]) => ({
          name: name.replace(' fashion style outfit', '').toLowerCase(),
          score: cosineSimilarity(embedding, emb)
        })).sort((a, b) => b.score - a.score);

        const topPillar = pillarScores[0];
        const assignedPillarKey = `${image.style_pillar} fashion style outfit`;
        const assignedPillarEmb = styleConcepts.pillars[assignedPillarKey];

        let clipSimilarity = 0;
        if (assignedPillarEmb) {
          clipSimilarity = cosineSimilarity(embedding, assignedPillarEmb);
        }

        const clipConfidence = clipSimilarity > 0.6 ? 'high'
                             : clipSimilarity > 0.4 ? 'medium'
                             : 'low';

        const matches = topPillar.name === image.style_pillar.toLowerCase();

        // Find best matching sub-term for the assigned pillar
        let suggestedSubTerm: { name: string; score: number } | undefined;
        if (styleConcepts.sub_terms && styleConcepts.sub_terms[image.style_pillar.toLowerCase()]) {
          const subTerms = styleConcepts.sub_terms[image.style_pillar.toLowerCase()];
          const subTermScores = Object.entries(subTerms).map(([name, emb]) => ({
            name: name.replace(' outfit', ''),
            score: cosineSimilarity(embedding, emb)
          })).sort((a, b) => b.score - a.score);

          if (subTermScores.length > 0) {
            suggestedSubTerm = subTermScores[0];
          }
        }

        const result: ValidationResult = {
          image,
          embedding,
          clipTopPillar: topPillar.name,
          clipSimilarity,
          clipConfidence,
          matches,
          topPillars: pillarScores.slice(0, 3),
          suggestedSubTerm
        };

        results.push(result);
        setValidationResults([...results]);
        setProgress(i + 1);

        const emoji = matches ? '✅' : '⚠️';
        const confEmoji = clipConfidence === 'high' ? '🟢' : clipConfidence === 'medium' ? '🟡' : '🔴';
        const subTermMsg = suggestedSubTerm ? ` | Sub: ${suggestedSubTerm.name} (${(suggestedSubTerm.score * 100).toFixed(0)}%)` : '';
        addLog(`  ${emoji} ${image.style_pillar} → CLIP: ${topPillar.name} ${confEmoji} (${(clipSimilarity * 100).toFixed(1)}%)${subTermMsg}`);

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        addLog(`  ✗ Error validating ${image.id}: ${errorMsg}`);

        // If cold start timeout, suggest retrying
        if (errorMsg.includes('cold-starting')) {
          addLog(`     💡 Tip: Hugging Face Space may be waking up. Try again in 30 seconds.`);
        }
      }
    }

    addLog(`✓ Validation complete! ${results.length}/${images.length} images processed`);
    setLoading(false);
  };

  // Initialize
  useEffect(() => {
    loadImages(50);
    loadStyleConcepts();
  }, []);

  // Calculate stats
  const stats = {
    total: validationResults.length,
    matches: validationResults.filter(r => r.matches).length,
    mismatches: validationResults.filter(r => !r.matches).length,
    highConfidence: validationResults.filter(r => r.clipConfidence === 'high').length,
    mediumConfidence: validationResults.filter(r => r.clipConfidence === 'medium').length,
    lowConfidence: validationResults.filter(r => r.clipConfidence === 'low').length,
  };

  // Apply filters
  const filteredResults = validationResults.filter(result => {
    if (filterMismatch && result.matches) return false;
    if (filterLowConfidence && result.clipConfidence === 'low') return false;
    return true;
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
      {/* Header */}
      <div className="border-b border-slate-700 bg-slate-900/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <h1 className="text-3xl font-bold mb-2">Lifestyle Image Validation</h1>
          <p className="text-slate-400">
            Validate existing AI pillar tags using CLIP visual embeddings
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        {/* Controls */}
        <div className="bg-slate-800/50 rounded-lg p-6 border border-slate-700">
          <h2 className="text-xl font-semibold mb-4">Controls</h2>
          <div className="flex gap-4">
            <button
              onClick={() => loadImages(50)}
              disabled={loading}
              className="px-6 py-3 bg-slate-700 text-white rounded-lg hover:bg-slate-600 disabled:bg-slate-800 transition"
            >
              Load 50 Images
            </button>
            <button
              onClick={() => loadImages(100)}
              disabled={loading}
              className="px-6 py-3 bg-slate-700 text-white rounded-lg hover:bg-slate-600 disabled:bg-slate-800 transition"
            >
              Load 100 Images
            </button>
            <button
              onClick={validateImages}
              disabled={loading || images.length === 0 || !styleConcepts}
              className="px-8 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-slate-600 disabled:cursor-not-allowed transition font-semibold"
            >
              {loading ? `Validating... ${progress}/${images.length}` : 'Start Validation'}
            </button>
          </div>
        </div>

        {/* Stats */}
        {validationResults.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
            <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
              <div className="text-slate-400 text-sm mb-1">Total</div>
              <div className="text-2xl font-bold">{stats.total}</div>
            </div>
            <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
              <div className="text-slate-400 text-sm mb-1">Matches</div>
              <div className="text-2xl font-bold text-green-400">{stats.matches}</div>
              <div className="text-xs text-slate-500">{stats.total > 0 ? ((stats.matches / stats.total) * 100).toFixed(0) : 0}%</div>
            </div>
            <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
              <div className="text-slate-400 text-sm mb-1">Mismatches</div>
              <div className="text-2xl font-bold text-orange-400">{stats.mismatches}</div>
              <div className="text-xs text-slate-500">{stats.total > 0 ? ((stats.mismatches / stats.total) * 100).toFixed(0) : 0}%</div>
            </div>
            <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
              <div className="text-slate-400 text-sm mb-1">High Confidence</div>
              <div className="text-2xl font-bold text-green-400">{stats.highConfidence}</div>
            </div>
            <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
              <div className="text-slate-400 text-sm mb-1">Medium</div>
              <div className="text-2xl font-bold text-yellow-400">{stats.mediumConfidence}</div>
            </div>
            <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
              <div className="text-slate-400 text-sm mb-1">Low Confidence</div>
              <div className="text-2xl font-bold text-red-400">{stats.lowConfidence}</div>
            </div>
          </div>
        )}

        {/* Filters */}
        {validationResults.length > 0 && (
          <div className="bg-slate-800/50 rounded-lg p-6 border border-slate-700">
            <h3 className="text-lg font-semibold mb-4">Filters</h3>
            <div className="flex gap-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={filterMismatch}
                  onChange={(e) => setFilterMismatch(e.target.checked)}
                  className="w-5 h-5 rounded border-slate-600 bg-slate-700 text-blue-500"
                />
                <span className="text-slate-300">Show only mismatches ({stats.mismatches})</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={filterLowConfidence}
                  onChange={(e) => setFilterLowConfidence(e.target.checked)}
                  className="w-5 h-5 rounded border-slate-600 bg-slate-700 text-blue-500"
                />
                <span className="text-slate-300">Hide low confidence ({stats.lowConfidence})</span>
              </label>
            </div>
          </div>
        )}

        {/* Results Grid */}
        {filteredResults.length > 0 && (
          <div className="bg-slate-800/50 rounded-lg p-6 border border-slate-700">
            <h3 className="text-lg font-semibold mb-4">
              Validation Results ({filteredResults.length})
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredResults.map((result) => (
                <div
                  key={result.image.id}
                  className={`bg-slate-900/50 rounded-lg overflow-hidden border-2 ${
                    result.matches ? 'border-green-500/30' : 'border-orange-500/50'
                  }`}
                >
                  {/* Image */}
                  <div className="aspect-[3/4] relative">
                    <img
                      src={result.image.image_url}
                      alt={result.image.style_pillar}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-2 right-2">
                      <span className="text-2xl">
                        {result.matches ? '✅' : '⚠️'}
                      </span>
                    </div>
                  </div>

                  {/* Details */}
                  <div className="p-4 space-y-3">
                    {/* Assigned Pillar (Gemini) */}
                    <div>
                      <div className="text-xs text-slate-400 mb-1">Gemini Tag</div>
                      <div className="text-sm font-semibold capitalize">
                        {result.image.style_pillar}
                      </div>
                      <div className="text-xs text-slate-500">
                        Confidence: {(result.image.pillar_confidence * 100).toFixed(0)}%
                      </div>
                    </div>

                    {/* CLIP Validation */}
                    <div className="pt-2 border-t border-slate-700">
                      <div className="text-xs text-slate-400 mb-1">CLIP Top Match</div>
                      <div className="text-sm font-semibold capitalize">
                        {result.clipTopPillar}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`text-xs px-2 py-0.5 rounded font-medium ${
                          result.clipConfidence === 'high'
                            ? 'bg-green-500/20 text-green-300'
                            : result.clipConfidence === 'medium'
                              ? 'bg-yellow-500/20 text-yellow-300'
                              : 'bg-red-500/20 text-red-300'
                        }`}>
                          {result.clipConfidence.toUpperCase()}
                        </span>
                        <span className="text-xs text-slate-400">
                          {(result.clipSimilarity * 100).toFixed(1)}%
                        </span>
                      </div>
                    </div>

                    {/* Suggested Sub-Term */}
                    {result.suggestedSubTerm && (
                      <div className="pt-2 border-t border-slate-700">
                        <div className="text-xs text-slate-400 mb-1">Suggested Sub-Term</div>
                        <div className="text-sm font-semibold text-blue-300 capitalize">
                          {result.suggestedSubTerm.name}
                        </div>
                        <div className="text-xs text-slate-500">
                          Similarity: {(result.suggestedSubTerm.score * 100).toFixed(0)}%
                        </div>
                      </div>
                    )}

                    {/* Top 3 Pillars */}
                    <div className="pt-2 border-t border-slate-700">
                      <div className="text-xs text-slate-400 mb-1">CLIP Top 3</div>
                      <div className="space-y-1">
                        {result.topPillars.map((pillar, idx) => (
                          <div key={pillar.name} className="flex justify-between text-xs">
                            <span className="capitalize text-slate-300">
                              {idx + 1}. {pillar.name}
                            </span>
                            <span className="text-slate-500">
                              {(pillar.score * 100).toFixed(0)}%
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Source */}
                    <div className="pt-2 border-t border-slate-700">
                      <div className="text-xs text-slate-500">
                        Source: {result.image.source}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
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
      </div>
    </div>
  );
}
