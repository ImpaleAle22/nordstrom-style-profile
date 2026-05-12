'use client';

/**
 * Lifestyle Image Library Manager
 * Loads from Supabase lifestyle_images table
 */

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase-client';

interface LifestyleImage {
  id: string;
  image_url: string;
  source?: string;
  gender: string;
  style_pillar: string;
  sub_term?: string;
  spectrum_coordinate?: number;
  pillar_confidence?: number;
  vibes?: string[];
  occasions?: string[];
  formality_level?: number;
  season?: string[];
  is_complete_outfit?: boolean;
  visible_item_count?: number;
  brand_adherence_score?: number;
  is_art_directed?: boolean;
  image_tone?: string;
  reasoning?: string;
  status?: string;
  tags?: Record<string, any>;
  created_at?: string;
}

// Canonical style pillars - matches lib/pillar-normalization.ts
const PILLAR_COLORS: Record<string, string> = {
  classic: '#2c3e50',
  minimal: '#95a5a6',
  romantic: '#e8a5c5',
  bohemian: '#d4a574',
  maximal: '#f39c12',
  casual: '#7fb3d5',
  streetwear: '#e74c3c',
  athletic: '#27ae60',
  utility: '#8b6f47',
};

export default function LifestyleImagesPage() {
  const [images, setImages] = useState<LifestyleImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [genderFilter, setGenderFilter] = useState<string>('all');
  const [pillarFilter, setPillarFilter] = useState<string>('all');
  const [showCoverageModal, setShowCoverageModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{ gender: string; style_pillar: string; sub_term: string }>({ gender: '', style_pillar: '', sub_term: '' });
  const [status, setStatus] = useState<{ message: string; color: string } | null>(null);

  useEffect(() => {
    loadImages();
  }, []);

  const loadImages = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('lifestyle_images')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      console.log('Loaded images from DB:', data?.length, 'images');
      if (data && data.length > 0) {
        console.log('Sample image:', data[0]);
      }
      setImages(data || []);
    } catch (error) {
      console.error('Failed to load images:', error);
      showStatus('Failed to load images from database', '#dc2626');
    } finally {
      setLoading(false);
    }
  };

  const showStatus = (message: string, color: string) => {
    setStatus({ message, color });
    setTimeout(() => setStatus(null), 4000);
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);
        const imagesToImport = data.results || data.images || [];

        if (imagesToImport.length === 0) {
          showStatus('No images found in file', '#dc2626');
          return;
        }

        showStatus(`Importing ${imagesToImport.length} images...`, '#3b82f6');

        // Transform to Supabase format
        const transformed = imagesToImport.map((img: any) => {
          // Handle both old format (finalPillar, gender at root) and new format (outfitAnalysis object)
          const outfitAnalysis = img.outfitAnalysis || {};
          const displaySuitability = img.displaySuitability || {};
          const brandAdherence = img.brandAdherence || {};

          const pillar = (
            outfitAnalysis.stylePillar ||
            img.finalPillar ||
            img.pillar ||
            img.aiPillar ||
            'uncategorized'
          ).toLowerCase().replace(/ /g, '_');

          const gender = outfitAnalysis.gender || img.gender || 'unknown';

          // Build subterms array from both old and new formats
          const subterms: string[] = [];
          if (outfitAnalysis.subTerm) subterms.push(outfitAnalysis.subTerm);
          if (img.subTerms) subterms.push(...img.subTerms);
          if (img.subterms) subterms.push(...img.subterms);

          return {
            image_id: img.imageId || img.image_id,
            image_url: img.imageUrl || img.image_url,
            thumbnail_url: img.thumbnailUrl || img.thumbnail_url || img.imageUrl || img.image_url,
            gender,
            pillar,
            subterms: [...new Set(subterms)], // Remove duplicates
            tags: {
              // Old format fields
              status: img.status,
              wasEdited: img.wasEdited,
              aiPillar: img.aiPillar,
              preCategorizedPillar: img.preCategorizedPillar,
              reasoning: img.reasoning,
              // New format fields
              source: img.source,
              outfitAnalysis: outfitAnalysis.spectrumCoordinate !== undefined ? {
                spectrumCoordinate: outfitAnalysis.spectrumCoordinate,
                pillarConfidence: outfitAnalysis.pillarConfidence,
                vibes: outfitAnalysis.vibes,
                occasions: outfitAnalysis.occasions,
                formalityLevel: outfitAnalysis.formalityLevel,
                season: outfitAnalysis.season,
                isCompleteOutfit: outfitAnalysis.isCompleteOutfit,
                visibleItemCount: outfitAnalysis.visibleItemCount,
                reasoning: outfitAnalysis.reasoning,
              } : undefined,
              displaySuitability: displaySuitability.qualityScore !== undefined ? displaySuitability : undefined,
              brandAdherence: brandAdherence.score !== undefined ? brandAdherence : undefined,
            },
          };
        });

        console.log('Transforming', transformed.length, 'images');
        console.log('Sample transformed image:', transformed[0]);

        // Insert into Supabase (batch insert)
        const { data: inserted, error } = await supabase
          .from('lifestyle_images')
          .upsert(transformed, { onConflict: 'image_id' });

        if (error) throw error;

        showStatus(`✓ Imported ${transformed.length} images successfully!`, '#10b981');
        await loadImages(); // Refresh
      } catch (error) {
        console.error('Failed to import:', error);
        showStatus('Failed to import images', '#dc2626');
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  };

  const handleDelete = async (id: string) => {
    console.log('🗑️ Delete requested for image:', id);

    if (!confirm('Delete this image from the database?')) {
      console.log('Delete cancelled by user');
      return;
    }

    try {
      console.log('Sending DELETE request to:', `/api/lifestyle-images/${id}`);

      const response = await fetch(`/api/lifestyle-images/${id}`, {
        method: 'DELETE',
      });

      console.log('Delete response status:', response.status, response.statusText);

      const result = await response.json();
      console.log('Delete response body:', result);

      if (!response.ok) {
        console.error('❌ Delete failed:', result);
        showStatus(`Failed to delete: ${result.error || 'Unknown error'} (${response.status})`, '#dc2626');
        return;
      }

      console.log('✅ Delete successful, removing from UI');
      const newImages = images.filter(img => img.id !== id);
      console.log('Images before:', images.length, 'after:', newImages.length);
      setImages(newImages);
      showStatus('✓ Image deleted successfully', '#10b981');
    } catch (error) {
      console.error('❌ Exception during delete:', error);
      showStatus('Failed to delete image: ' + String(error), '#dc2626');
    }
  };

  const handleEdit = (img: LifestyleImage) => {
    setEditingId(img.id);
    setEditForm({
      gender: img.gender || 'unknown',
      style_pillar: img.style_pillar || 'uncategorized',
      sub_term: img.sub_term || '',
    });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditForm({ gender: '', style_pillar: '', sub_term: '' });
  };

  const handleSaveEdit = async (id: string) => {
    try {
      const response = await fetch(`/api/lifestyle-images/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      });

      const result = await response.json();

      if (!response.ok) {
        showStatus('Failed to update: ' + (result.error || 'Unknown error'), '#dc2626');
        return;
      }

      // Update local state
      setImages(images.map(img =>
        img.id === id ? { ...img, ...editForm, updated_at: new Date().toISOString() } : img
      ));
      setEditingId(null);
      showStatus('✓ Image updated', '#10b981');
    } catch (error) {
      console.error('Failed to update image:', error);
      showStatus('Failed to update image: ' + String(error), '#dc2626');
    }
  };

  const handleExport = () => {
    if (images.length === 0) {
      showStatus('No images to export', '#dc2626');
      return;
    }

    const output = {
      exportedAt: new Date().toISOString(),
      source: 'lifestyle-images-supabase',
      imageCount: images.length,
      images: images,
    };

    const blob = new Blob([JSON.stringify(output, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `lifestyle-images-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    showStatus(`✓ Exported ${images.length} images`, '#10b981');
  };

  // Helper functions
  const extractGender = (img: LifestyleImage) => img.gender || 'unknown';
  const extractPillar = (img: LifestyleImage) => (img.style_pillar || 'uncategorized').toLowerCase();
  const extractSubTerm = (img: LifestyleImage) => img.sub_term;

  // Filter images
  const filteredImages = images.filter(img => {
    const gender = extractGender(img);
    const pillar = extractPillar(img);
    if (genderFilter !== 'all' && gender !== genderFilter) return false;
    if (pillarFilter !== 'all' && pillar !== pillarFilter) return false;
    return true;
  });

  // Group by pillar
  const byPillar: Record<string, LifestyleImage[]> = {};
  filteredImages.forEach(img => {
    const pillar = extractPillar(img);
    if (!byPillar[pillar]) byPillar[pillar] = [];
    byPillar[pillar].push(img);
  });

  // Calculate stats
  const totalCount = images.length;
  const womenCount = images.filter(img => extractGender(img) === 'womenswear').length;
  const menCount = images.filter(img => extractGender(img) === 'menswear').length;

  // Calculate coverage data
  const pillarCoverage = Object.keys(PILLAR_COLORS).map(pillar => {
    const pillarImages = images.filter(img => extractPillar(img) === pillar);
    const women = pillarImages.filter(img => extractGender(img) === 'womenswear').length;
    const men = pillarImages.filter(img => extractGender(img) === 'menswear').length;

    // Get sub-terms for this pillar
    const subTerms: Record<string, { total: number; women: number; men: number }> = {};
    pillarImages.forEach(img => {
      const subTerm = extractSubTerm(img);
      if (subTerm) {
        if (!subTerms[subTerm]) {
          subTerms[subTerm] = { total: 0, women: 0, men: 0 };
        }
        subTerms[subTerm].total++;
        if (extractGender(img) === 'womenswear') subTerms[subTerm].women++;
        if (extractGender(img) === 'menswear') subTerms[subTerm].men++;
      }
    });

    return {
      pillar,
      total: pillarImages.length,
      women,
      men,
      subTerms,
    };
  }).sort((a, b) => b.total - a.total);

  // Get list of all unique pillars from images
  const availablePillars = [...new Set(images.map(img => extractPillar(img)))].sort();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#FAF9F5' }}>
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-t-black rounded-full animate-spin mx-auto mb-4" style={{ borderColor: '#EDECEB', borderTopColor: '#0C0C0C' }} />
          <p style={{ color: '#8E8A82' }}>Loading images...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#FAF9F5' }}>
      {/* Header */}
      <div className="sticky top-0 z-50 bg-white border-b shadow-sm" style={{ borderColor: '#EDECEB' }}>
        <div className="max-w-[1600px] mx-auto px-10 py-5">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-semibold mb-1" style={{ letterSpacing: '-0.5px', color: '#0C0C0C' }}>
                Lifestyle Image Library
              </h1>
              <div className="flex gap-6 text-sm" style={{ color: '#8E8A82' }}>
                <span><strong>{totalCount}</strong> total</span>
                <span><strong>{womenCount}</strong> women</span>
                <span><strong>{menCount}</strong> men</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {status && (
                <span className="text-sm font-semibold" style={{ color: status.color }}>
                  {status.message}
                </span>
              )}
              <Link href="/admin/lifestyle-images/import" className="btn-primary">
                ✨ Add New Images
              </Link>
              <label className="btn-secondary cursor-pointer">
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImport}
                  className="hidden"
                />
                Import JSON
              </label>
              <button onClick={handleExport} className="btn-secondary">
                Export JSON
              </button>
              <button onClick={() => setShowCoverageModal(true)} className="btn-secondary">
                Coverage Report
              </button>
              <button onClick={loadImages} className="btn-secondary">
                Refresh
              </button>
              <Link href="/admin" className="text-sm hover:opacity-60 transition-opacity" style={{ color: '#8E8A82' }}>
                ← Back to Admin
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-[1600px] mx-auto px-10 py-10">
        {/* Filters */}
        <div className="bg-white p-7 rounded-xl mb-8 border" style={{ borderColor: '#EDECEB' }}>
          <div className="mb-6">
            <div className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: '#8E8A82' }}>
              Style Pillar
            </div>
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => setPillarFilter('all')}
                className={`filter-tab ${pillarFilter === 'all' ? 'active' : ''}`}
              >
                All Pillars
              </button>
              {availablePillars.map(p => (
                <button
                  key={p}
                  onClick={() => setPillarFilter(p)}
                  className={`filter-tab ${pillarFilter === p ? 'active' : ''}`}
                >
                  {p.replace(/_/g, ' ')}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: '#8E8A82' }}>
              Gender
            </div>
            <div className="flex gap-2 flex-wrap">
              {['all', 'womenswear', 'menswear'].map(g => (
                <button
                  key={g}
                  onClick={() => setGenderFilter(g)}
                  className={`filter-tab ${genderFilter === g ? 'active' : ''}`}
                >
                  {g === 'all' ? 'All' : g === 'womenswear' ? 'Womenswear' : 'Menswear'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Image Grid */}
        {Object.keys(byPillar).length === 0 ? (
          <div className="text-center py-20 bg-white rounded-xl border" style={{ borderColor: '#EDECEB' }}>
            <div className="text-6xl mb-4">
              {images.length === 0 ? '📦' : '🔍'}
            </div>
            <h3 className="text-xl font-semibold mb-2" style={{ color: '#0C0C0C' }}>
              {images.length === 0 ? 'No Images in Database' : 'No Images Match Filters'}
            </h3>
            <p className="text-sm mb-6" style={{ color: '#8E8A82' }}>
              {images.length === 0 ? 'Images from the lifestyle_images table will appear here' : 'Try adjusting your filter selection'}
            </p>
          </div>
        ) : (
          Object.entries(byPillar).map(([pillar, pillarImages]) => {
            const pillarWomen = pillarImages.filter(img => extractGender(img) === 'womenswear').length;
            const pillarMen = pillarImages.filter(img => extractGender(img) === 'menswear').length;

            // Get sub-term breakdown for this pillar
            const subTermBreakdown: Record<string, { total: number; women: number; men: number }> = {};
            pillarImages.forEach(img => {
              const subTerm = extractSubTerm(img);
              if (subTerm) {
                if (!subTermBreakdown[subTerm]) {
                  subTermBreakdown[subTerm] = { total: 0, women: 0, men: 0 };
                }
                subTermBreakdown[subTerm].total++;
                if (extractGender(img) === 'womenswear') subTermBreakdown[subTerm].women++;
                if (extractGender(img) === 'menswear') subTermBreakdown[subTerm].men++;
              }
            });

            return (
              <div key={pillar} className="mb-12">
                {/* Pillar Header */}
                <div className="bg-white p-5 rounded-t-xl border border-b-0" style={{ borderColor: '#EDECEB' }}>
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-4">
                      <div
                        className="w-1 h-10 rounded"
                        style={{ backgroundColor: PILLAR_COLORS[pillar] || '#95a5a6' }}
                      />
                      <h2 className="text-2xl font-semibold capitalize" style={{ letterSpacing: '-0.3px', color: '#0C0C0C' }}>
                        {pillar.replace(/_/g, ' ')}
                      </h2>
                    </div>
                    <div className="flex gap-5 text-sm" style={{ color: '#8E8A82' }}>
                      <span>{pillarImages.length} total</span>
                      <span>{pillarWomen}W / {pillarMen}M</span>
                    </div>
                  </div>

                  {/* Sub-term breakdown */}
                  {Object.keys(subTermBreakdown).length > 0 && (
                    <div className="flex gap-3 flex-wrap">
                      {Object.entries(subTermBreakdown)
                        .sort((a, b) => b[1].total - a[1].total)
                        .map(([subTerm, counts]) => (
                          <div
                            key={subTerm}
                            className="px-3 py-1.5 rounded-lg text-xs font-medium"
                            style={{
                              backgroundColor: '#FAF9F5',
                              color: '#0C0C0C',
                              border: '1px solid #EDECEB',
                            }}
                          >
                            <span className="font-semibold">{subTerm}</span>
                            <span style={{ color: '#8E8A82' }}> • {counts.total} ({counts.women}W / {counts.men}M)</span>
                          </div>
                        ))}
                    </div>
                  )}
                </div>

                {/* Image Grid */}
                <div className="grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-6 bg-white p-7 rounded-b-xl border" style={{ borderColor: '#EDECEB' }}>
                  {pillarImages.map(img => {
                    const gender = extractGender(img);
                    const genderLabel = gender === 'womenswear' ? 'Women' : gender === 'menswear' ? 'Men' : 'Unknown';
                    const subTerm = extractSubTerm(img);
                    const isEditing = editingId === img.id;

                    return (
                      <div
                        key={img.id}
                        className={`image-card bg-[#FAF9F5] rounded-xl overflow-hidden border-2 transition-all group ${
                          isEditing ? 'border-blue-500 shadow-xl' : 'border-transparent hover:shadow-xl hover:-translate-y-1'
                        }`}
                      >
                        <div className="relative w-full aspect-[3/4] bg-[#EDECEB]">
                          <img
                            src={img.image_url}
                            alt={img.id}
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                          <div className="absolute top-3 left-3 pointer-events-none">
                            <div className="gender-badge">{genderLabel}</div>
                          </div>
                          {!isEditing && (
                            <button
                              onClick={() => handleDelete(img.id)}
                              className="delete-btn"
                              title="Delete image"
                            >
                              ×
                            </button>
                          )}
                        </div>
                        <div className="p-4">
                          <div className="text-xs font-mono mb-3" style={{ color: '#B4B1A9' }}>
                            {img.id}
                          </div>

                          {isEditing ? (
                            <div className="space-y-3">
                              {/* Gender Select */}
                              <div>
                                <label className="text-xs font-semibold uppercase tracking-wide block mb-1" style={{ color: '#8E8A82' }}>
                                  Gender
                                </label>
                                <select
                                  value={editForm.gender}
                                  onChange={(e) => setEditForm({ ...editForm, gender: e.target.value })}
                                  className="w-full px-3 py-2 rounded-lg border text-sm"
                                  style={{ borderColor: '#EDECEB' }}
                                >
                                  <option value="womenswear">Womenswear</option>
                                  <option value="menswear">Menswear</option>
                                  <option value="unisex">Unisex</option>
                                  <option value="unknown">Unknown</option>
                                </select>
                              </div>

                              {/* Pillar Select */}
                              <div>
                                <label className="text-xs font-semibold uppercase tracking-wide block mb-1" style={{ color: '#8E8A82' }}>
                                  Style Pillar
                                </label>
                                <select
                                  value={editForm.style_pillar}
                                  onChange={(e) => setEditForm({ ...editForm, style_pillar: e.target.value })}
                                  className="w-full px-3 py-2 rounded-lg border text-sm capitalize"
                                  style={{ borderColor: '#EDECEB' }}
                                >
                                  <option value="uncategorized">Uncategorized</option>
                                  {Object.keys(PILLAR_COLORS).map(p => (
                                    <option key={p} value={p}>{p.replace(/_/g, ' ')}</option>
                                  ))}
                                </select>
                              </div>

                              {/* Sub-term Input */}
                              <div>
                                <label className="text-xs font-semibold uppercase tracking-wide block mb-1" style={{ color: '#8E8A82' }}>
                                  Sub-term
                                </label>
                                <input
                                  type="text"
                                  value={editForm.sub_term}
                                  onChange={(e) => setEditForm({ ...editForm, sub_term: e.target.value })}
                                  className="w-full px-3 py-2 rounded-lg border text-sm"
                                  style={{ borderColor: '#EDECEB' }}
                                  placeholder="e.g., Feminine, Modern Minimal"
                                />
                              </div>

                              {/* Action Buttons */}
                              <div className="flex gap-2 pt-2">
                                <button
                                  onClick={() => handleSaveEdit(img.id)}
                                  className="flex-1 px-3 py-2 rounded-lg text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                                >
                                  Save
                                </button>
                                <button
                                  onClick={handleCancelEdit}
                                  className="flex-1 px-3 py-2 rounded-lg text-sm font-semibold border hover:bg-gray-50 transition-colors"
                                  style={{ borderColor: '#EDECEB', color: '#0C0C0C' }}
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          ) : (
                            <>
                              <div className="flex flex-wrap gap-1.5 min-h-[28px] mb-3">
                                {/* Pillar tag */}
                                <div className="pillar-tag" style={{ backgroundColor: PILLAR_COLORS[pillar] || '#95a5a6' }}>
                                  {pillar.replace(/_/g, ' ')}
                                </div>

                                {/* Sub-term tag */}
                                {subTerm && (
                                  <div className="subterm-tag">
                                    {subTerm}
                                  </div>
                                )}
                              </div>

                              {/* Edit Button */}
                              <button
                                onClick={() => handleEdit(img)}
                                className="w-full px-3 py-2 rounded-lg text-sm font-semibold border hover:bg-gray-50 transition-colors"
                                style={{ borderColor: '#EDECEB', color: '#0C0C0C' }}
                              >
                                Edit Tags
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Coverage Modal */}
      {showCoverageModal && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-8"
          onClick={() => setShowCoverageModal(false)}
        >
          <div
            className="bg-white rounded-2xl max-w-5xl w-full max-h-[90vh] overflow-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="sticky top-0 bg-white border-b p-6 flex justify-between items-center" style={{ borderColor: '#EDECEB' }}>
              <h2 className="text-2xl font-semibold" style={{ color: '#0C0C0C' }}>
                Coverage Report
              </h2>
              <button
                onClick={() => setShowCoverageModal(false)}
                className="text-2xl hover:opacity-60 transition-opacity"
                style={{ color: '#8E8A82' }}
              >
                ×
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6">
              {/* Overall Stats */}
              <div className="grid grid-cols-3 gap-4 mb-8">
                <div className="bg-[#FAF9F5] p-4 rounded-lg border" style={{ borderColor: '#EDECEB' }}>
                  <div className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: '#8E8A82' }}>
                    Total Images
                  </div>
                  <div className="text-2xl font-semibold" style={{ color: '#0C0C0C' }}>{totalCount}</div>
                </div>
                <div className="bg-[#FAF9F5] p-4 rounded-lg border" style={{ borderColor: '#EDECEB' }}>
                  <div className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: '#8E8A82' }}>
                    Womenswear
                  </div>
                  <div className="text-2xl font-semibold" style={{ color: '#0C0C0C' }}>{womenCount}</div>
                </div>
                <div className="bg-[#FAF9F5] p-4 rounded-lg border" style={{ borderColor: '#EDECEB' }}>
                  <div className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: '#8E8A82' }}>
                    Menswear
                  </div>
                  <div className="text-2xl font-semibold" style={{ color: '#0C0C0C' }}>{menCount}</div>
                </div>
              </div>

              {/* Pillar Breakdown */}
              <h3 className="text-lg font-semibold mb-4" style={{ color: '#0C0C0C' }}>
                Coverage by Style Pillar
              </h3>

              <div className="space-y-6">
                {pillarCoverage.map(({ pillar, total, women, men, subTerms }) => (
                  <div key={pillar} className="border rounded-xl overflow-hidden" style={{ borderColor: '#EDECEB' }}>
                    {/* Pillar Header */}
                    <div
                      className="p-4 flex justify-between items-center"
                      style={{ backgroundColor: PILLAR_COLORS[pillar] || '#95a5a6' }}
                    >
                      <h4 className="text-lg font-semibold capitalize text-white">
                        {pillar.replace(/_/g, ' ')}
                      </h4>
                      <div className="flex gap-4 text-sm text-white font-medium">
                        <span>{total} total</span>
                        <span>{women}W / {men}M</span>
                      </div>
                    </div>

                    {/* Sub-terms */}
                    {Object.keys(subTerms).length > 0 ? (
                      <div className="p-4 bg-white">
                        <div className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: '#8E8A82' }}>
                          Sub-Terms
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          {Object.entries(subTerms)
                            .sort((a, b) => b[1].total - a[1].total)
                            .map(([subTerm, counts]) => (
                              <div
                                key={subTerm}
                                className="flex justify-between items-center p-3 rounded-lg"
                                style={{ backgroundColor: '#FAF9F5' }}
                              >
                                <span className="font-medium text-sm" style={{ color: '#0C0C0C' }}>
                                  {subTerm}
                                </span>
                                <span className="text-sm" style={{ color: '#8E8A82' }}>
                                  {counts.total} ({counts.women}W / {counts.men}M)
                                </span>
                              </div>
                            ))}
                        </div>
                      </div>
                    ) : (
                      <div className="p-4 bg-white text-center" style={{ color: '#8E8A82' }}>
                        No sub-terms tagged
                      </div>
                    )}
                  </div>
                ))}

                {/* Empty Pillars */}
                {Object.keys(PILLAR_COLORS).filter(p => !pillarCoverage.find(pc => pc.pillar === p)).length > 0 && (
                  <div className="border rounded-xl p-4" style={{ borderColor: '#EDECEB', backgroundColor: '#FAF9F5' }}>
                    <h4 className="text-sm font-semibold mb-2" style={{ color: '#dc2626' }}>
                      ⚠️ Pillars with No Images
                    </h4>
                    <div className="flex gap-2 flex-wrap">
                      {Object.keys(PILLAR_COLORS)
                        .filter(p => !pillarCoverage.find(pc => pc.pillar === p))
                        .map(pillar => (
                          <span
                            key={pillar}
                            className="px-3 py-1 rounded-lg text-sm font-medium capitalize"
                            style={{ backgroundColor: '#FEE2E2', color: '#991B1B' }}
                          >
                            {pillar.replace(/_/g, ' ')}
                          </span>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .btn-primary {
          padding: 12px 20px;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 600;
          background: #0C0C0C;
          color: white;
          border: none;
          cursor: pointer;
          letter-spacing: 0.3px;
          transition: all 0.2s;
          text-align: center;
          display: block;
        }
        .btn-primary:hover {
          background: #2c2c2c;
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }
        .btn-secondary {
          padding: 12px 20px;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 600;
          background: white;
          color: #0C0C0C;
          border: 2px solid #EDECEB;
          cursor: pointer;
          letter-spacing: 0.3px;
          transition: all 0.2s;
        }
        .btn-secondary:hover {
          border-color: #B4B1A9;
          transform: translateY(-1px);
        }
        .filter-tab {
          padding: 10px 18px;
          background: #FAF9F5;
          border: 2px solid transparent;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          color: #0C0C0C;
        }
        .filter-tab:hover {
          background: #EDECEB;
        }
        .filter-tab.active {
          background: #0C0C0C;
          color: white;
        }
        .gender-badge {
          padding: 6px 12px;
          border-radius: 6px;
          font-size: 11px;
          font-weight: 700;
          background: rgba(255, 255, 255, 0.95);
          color: #0C0C0C;
          letter-spacing: 0.5px;
          text-transform: uppercase;
          backdrop-filter: blur(8px);
        }
        .delete-btn {
          position: absolute;
          bottom: 12px;
          right: 12px;
          width: 36px;
          height: 36px;
          background: rgba(220, 38, 38, 0.95);
          color: white;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          font-size: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          opacity: 0;
          transition: all 0.2s;
          backdrop-filter: blur(8px);
          line-height: 1;
        }
        .image-card:hover .delete-btn {
          opacity: 1;
        }
        .delete-btn:hover {
          background: #991b1b;
          transform: scale(1.1);
        }
        .pillar-tag {
          padding: 4px 10px;
          border-radius: 6px;
          font-size: 11px;
          font-weight: 600;
          color: white;
          text-transform: capitalize;
          border: 1px solid rgba(255, 255, 255, 0.3);
        }
        .subterm-tag {
          padding: 4px 10px;
          border-radius: 6px;
          font-size: 11px;
          font-weight: 600;
          background: #0C0C0C;
          color: white;
        }
      `}</style>
    </div>
  );
}
