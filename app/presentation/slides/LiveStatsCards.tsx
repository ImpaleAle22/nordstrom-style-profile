'use client';

/**
 * Live Stats Cards - Fetches real counts from Supabase
 */

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase-client';

export default function LiveStatsCards() {
  // Start with current values (as of May 2026)
  const [recipeCount, setRecipeCount] = useState<number>(542);
  const [outfitCount, setOutfitCount] = useState<number>(42260);

  useEffect(() => {
    let mounted = true;

    const fetchCounts = async () => {
      try {
        // Fetch recipe count
        const { count: recipes, error: recipeError } = await supabase
          .from('recipes')
          .select('*', { count: 'exact', head: true });

        // Fetch outfit count
        const { count: outfits, error: outfitError } = await supabase
          .from('outfits')
          .select('*', { count: 'exact', head: true });

        if (mounted) {
          // Update counts if fetched successfully (null means error or RLS block)
          if (recipes !== null && !recipeError) {
            setRecipeCount(recipes);
          }
          if (outfits !== null && !outfitError) {
            setOutfitCount(outfits);
          }
        }
      } catch (error) {
        // Silently fail - we already have fallback values
      }
    };

    fetchCounts();

    return () => {
      mounted = false;
    };
  }, []);

  const formatNumber = (num: number) => {
    if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K`.replace('.0K', 'K');
    }
    return num.toLocaleString();
  };

  return (
    <div className="grid grid-cols-2 gap-8 my-12">
      <div className="text-center p-10 bg-gradient-to-br from-amber-50 to-orange-50 rounded-3xl">
        <div className="text-6xl font-bold text-gray-900 mb-3">
          {recipeCount.toLocaleString()}
        </div>
        <div className="text-xl text-gray-700">recipes</div>
      </div>
      <div className="text-center p-10 bg-gradient-to-br from-emerald-50 to-green-50 rounded-3xl">
        <div className="text-6xl font-bold text-gray-900 mb-3">
          {formatNumber(outfitCount)}+
        </div>
        <div className="text-xl text-gray-700">outfits</div>
      </div>
    </div>
  );
}
