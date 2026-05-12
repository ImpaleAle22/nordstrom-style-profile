'use client';

import { useState } from 'react';
import Image from 'next/image';

export interface OutfitItem {
  product_id: string;
  title: string;
  brand: string;
  price: number;
  image_url: string;
  product_type: string;
  role: 'top' | 'bottom' | 'shoes' | 'accessory' | 'outerwear';
}

export interface OutfitRecommendation {
  outfit_id: string;
  title: string;
  description: string;
  match_score: number;
  match_reason: string;
  pillars: string[];
  occasions: string[];
  items: OutfitItem[];
  total_price: number;
  confidence: 'high' | 'medium' | 'low';
}

interface OutfitRecommendationTrayProps {
  title: string;
  subtitle?: string;
  outfits: OutfitRecommendation[];
  onOutfitClick?: (outfit: OutfitRecommendation) => void;
  onSaveOutfit?: (outfitId: string) => void;
}

export default function OutfitRecommendationTray({
  title,
  subtitle,
  outfits,
  onOutfitClick,
  onSaveOutfit
}: OutfitRecommendationTrayProps) {
  const [savedOutfits, setSavedOutfits] = useState<Set<string>>(new Set());

  const handleSave = (outfitId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSavedOutfits(prev => {
      const next = new Set(prev);
      if (next.has(outfitId)) {
        next.delete(outfitId);
      } else {
        next.add(outfitId);
      }
      return next;
    });
    onSaveOutfit?.(outfitId);
  };

  const getConfidenceColor = (confidence: string) => {
    switch (confidence) {
      case 'high': return 'text-green-400';
      case 'medium': return 'text-yellow-400';
      case 'low': return 'text-orange-400';
      default: return 'text-slate-400';
    }
  };

  return (
    <div className="mb-12">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-white mb-1">{title}</h2>
        {subtitle && <p className="text-slate-400">{subtitle}</p>}
      </div>

      {/* Scrollable tray */}
      <div className="relative">
        <div className="flex gap-6 overflow-x-auto pb-4 snap-x snap-mandatory scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-slate-900">
          {outfits.map((outfit) => {
            const isSaved = savedOutfits.has(outfit.outfit_id);

            return (
              <div
                key={outfit.outfit_id}
                className="flex-none w-[400px] snap-start"
              >
                <div
                  className="bg-slate-800/50 rounded-lg border border-slate-700 overflow-hidden hover:border-slate-600 transition-all cursor-pointer group"
                  onClick={() => onOutfitClick?.(outfit)}
                >
                  {/* Outfit preview - grid of product images */}
                  <div className="relative aspect-[4/3] bg-slate-900 p-4">
                    <div className="grid grid-cols-2 grid-rows-2 gap-2 h-full">
                      {outfit.items.slice(0, 4).map((item, idx) => (
                        <div
                          key={item.product_id}
                          className={`relative rounded-lg overflow-hidden bg-white ${
                            outfit.items.length === 3 && idx === 0 ? 'col-span-2' : ''
                          }`}
                        >
                          <Image
                            src={item.image_url}
                            alt={item.title}
                            fill
                            className="object-contain p-2"
                            sizes="(max-width: 400px) 50vw, 200px"
                          />
                        </div>
                      ))}
                      {outfit.items.length > 4 && (
                        <div className="absolute bottom-2 right-2 bg-black/80 backdrop-blur-sm text-white text-xs px-2 py-1 rounded">
                          +{outfit.items.length - 4} more
                        </div>
                      )}
                    </div>

                    {/* Match score badge */}
                    <div className="absolute top-2 left-2 bg-black/80 backdrop-blur-sm px-3 py-1 rounded-full">
                      <span className={`text-sm font-semibold ${getConfidenceColor(outfit.confidence)}`}>
                        {Math.round(outfit.match_score * 100)}% Match
                      </span>
                    </div>

                    {/* Save button */}
                    <button
                      onClick={(e) => handleSave(outfit.outfit_id, e)}
                      className="absolute top-2 right-2 w-10 h-10 rounded-full bg-black/80 backdrop-blur-sm hover:bg-black/90 transition flex items-center justify-center"
                    >
                      <svg
                        className={`w-5 h-5 ${isSaved ? 'fill-red-500' : 'fill-none'} stroke-current ${
                          isSaved ? 'text-red-500' : 'text-white'
                        }`}
                        viewBox="0 0 24 24"
                        strokeWidth="2"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                        />
                      </svg>
                    </button>
                  </div>

                  {/* Outfit details */}
                  <div className="p-4">
                    <h3 className="text-lg font-semibold text-white mb-1 group-hover:text-blue-400 transition">
                      {outfit.title}
                    </h3>
                    <p className="text-slate-400 text-sm mb-3 line-clamp-2">{outfit.description}</p>

                    {/* Match reason */}
                    <div className="mb-3 text-sm">
                      <span className="text-slate-500">Why this works: </span>
                      <span className="text-slate-300">{outfit.match_reason}</span>
                    </div>

                    {/* Tags */}
                    <div className="flex flex-wrap gap-2 mb-3">
                      {outfit.pillars.map((pillar) => (
                        <span
                          key={pillar}
                          className="px-2 py-1 bg-blue-500/20 text-blue-300 rounded text-xs"
                        >
                          {pillar}
                        </span>
                      ))}
                      {outfit.occasions.map((occasion) => (
                        <span
                          key={occasion}
                          className="px-2 py-1 bg-purple-500/20 text-purple-300 rounded text-xs"
                        >
                          {occasion}
                        </span>
                      ))}
                    </div>

                    {/* Item count and price */}
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-400">{outfit.items.length} items</span>
                      <span className="text-white font-semibold">
                        ${outfit.total_price.toLocaleString()}
                      </span>
                    </div>

                    {/* Actions */}
                    <div className="mt-4 flex gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onOutfitClick?.(outfit);
                        }}
                        className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition text-sm font-medium"
                      >
                        View Details
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          // Shop action
                        }}
                        className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition text-sm font-medium"
                      >
                        Shop
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Scroll indicators */}
        {outfits.length > 2 && (
          <div className="absolute right-0 top-0 bottom-0 w-16 bg-gradient-to-l from-slate-900 to-transparent pointer-events-none" />
        )}
      </div>
    </div>
  );
}
