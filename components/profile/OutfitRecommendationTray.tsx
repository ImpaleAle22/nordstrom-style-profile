'use client';

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

function OutfitCard({ outfit, onClick }: { outfit: OutfitRecommendation; onClick?: () => void }) {
  const itemCount = outfit.items.length;

  // Determine layout based on item count
  const getLayout = () => {
    if (itemCount === 6) {
      // 2x3 grid
      return (
        <div className="grid grid-cols-2 gap-3 h-full">
          {outfit.items.slice(0, 6).map((item) => (
            <div
              key={item.product_id}
              className="relative rounded-2xl overflow-hidden bg-white"
            >
              <Image
                src={item.image_url}
                alt={item.title}
                fill
                className="object-contain p-4"
                sizes="200px"
              />
            </div>
          ))}
        </div>
      );
    } else if (itemCount === 5) {
      // 2x2 grid on left, 1 large on right
      return (
        <div className="grid grid-cols-[1fr,1.2fr] gap-3 h-full">
          <div className="grid grid-cols-1 grid-rows-2 gap-3">
            {outfit.items.slice(0, 2).map((item) => (
              <div
                key={item.product_id}
                className="relative rounded-2xl overflow-hidden bg-white"
              >
                <Image
                  src={item.image_url}
                  alt={item.title}
                  fill
                  className="object-contain p-4"
                  sizes="200px"
                />
              </div>
            ))}
          </div>
          <div className="relative rounded-2xl overflow-hidden bg-white">
            <Image
              src={outfit.items[2].image_url}
              alt={outfit.items[2].title}
              fill
              className="object-contain p-6"
              sizes="300px"
            />
          </div>
          <div className="grid grid-cols-1 grid-rows-2 gap-3">
            {outfit.items.slice(3, 5).map((item) => (
              <div
                key={item.product_id}
                className="relative rounded-2xl overflow-hidden bg-white"
              >
                <Image
                  src={item.image_url}
                  alt={item.title}
                  fill
                  className="object-contain p-4"
                  sizes="200px"
                />
              </div>
            ))}
          </div>
        </div>
      );
    } else if (itemCount === 4) {
      // 2x2 grid on left, 1 large on right
      return (
        <div className="grid grid-cols-[1fr,1.2fr] gap-3 h-full">
          <div className="grid grid-cols-1 grid-rows-2 gap-3">
            {outfit.items.slice(0, 2).map((item) => (
              <div
                key={item.product_id}
                className="relative rounded-2xl overflow-hidden bg-white"
              >
                <Image
                  src={item.image_url}
                  alt={item.title}
                  fill
                  className="object-contain p-4"
                  sizes="200px"
                />
              </div>
            ))}
          </div>
          <div className="relative rounded-2xl overflow-hidden bg-white">
            <Image
              src={outfit.items[2].image_url}
              alt={outfit.items[2].title}
              fill
              className="object-contain p-6"
              sizes="300px"
            />
          </div>
          <div className="relative rounded-2xl overflow-hidden bg-white">
            <Image
              src={outfit.items[3].image_url}
              alt={outfit.items[3].title}
              fill
              className="object-contain p-4"
              sizes="200px"
            />
          </div>
        </div>
      );
    } else {
      // Default 2x2 grid for 3 or fewer items
      return (
        <div className="grid grid-cols-2 gap-3 h-full">
          {outfit.items.slice(0, 4).map((item) => (
            <div
              key={item.product_id}
              className="relative rounded-2xl overflow-hidden bg-white"
            >
              <Image
                src={item.image_url}
                alt={item.title}
                fill
                className="object-contain p-4"
                sizes="200px"
              />
            </div>
          ))}
        </div>
      );
    }
  };

  // Combine pillars and occasions for tags (limit to first 3)
  const tags = [...outfit.pillars, ...outfit.occasions].slice(0, 3);

  return (
    <div
      className="flex-none w-[460px] cursor-pointer hover:scale-[1.02] transition-transform duration-200"
      onClick={onClick}
    >
      <div className="bg-[#E8E3DC] rounded-3xl p-5 h-[580px] flex flex-col">
        {/* Product grid */}
        <div className="flex-1 mb-4">
          {getLayout()}
        </div>

        {/* Style tags */}
        <div className="flex flex-wrap gap-2">
          {tags.map((tag, idx) => (
            <span
              key={`${tag}-${idx}`}
              className="px-4 py-2 bg-white/80 rounded-full text-sm text-gray-700 font-medium"
            >
              {tag}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function OutfitRecommendationTray({
  title,
  subtitle,
  outfits,
  onOutfitClick,
}: OutfitRecommendationTrayProps) {
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
          {outfits.map((outfit, index) => (
            <OutfitCard
              key={outfit.outfit_id || `outfit-${index}`}
              outfit={outfit}
              onClick={() => onOutfitClick?.(outfit)}
            />
          ))}
        </div>

        {/* Scroll indicators */}
        {outfits.length > 2 && (
          <div className="absolute right-0 top-0 bottom-0 w-16 bg-gradient-to-l from-slate-900 to-transparent pointer-events-none" />
        )}
      </div>
    </div>
  );
}
