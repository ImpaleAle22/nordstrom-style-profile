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

interface OutfitCardProps {
  outfit: OutfitRecommendation;
  layout?: 'card' | 'compact' | 'large';
  onClick?: () => void;
  customerId?: string; // For recording interactions
  showFeedback?: boolean; // Toggle feedback buttons (default: true)
}

export default function OutfitCard({
  outfit,
  layout = 'card',
  onClick,
  customerId = 'Aisha Patel', // Default to one of the demo personas
  showFeedback = true,
}: OutfitCardProps) {
  const itemCount = outfit.items.length;

  // Feedback state
  const [isHearted, setIsHearted] = useState(false);
  const [thumbsState, setThumbsState] = useState<'up' | 'down' | null>(null);
  const [feedbackCounts, setFeedbackCounts] = useState({
    hearts: 0,
    thumbs_up: 0,
    thumbs_down: 0,
  });

  // Record interaction
  const recordInteraction = async (interactionType: string) => {
    try {
      const response = await fetch('/api/interactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_id: customerId,
          interaction_type: interactionType,
          outfit_id: outfit.outfit_id,
          source: 'web_app',
          context: 'for_you_page',
        }),
      });

      if (!response.ok) {
        console.error('Failed to record interaction:', await response.text());
      } else {
        console.log('✓ Recorded:', interactionType, 'for', outfit.outfit_id);
      }
    } catch (error) {
      console.error('Error recording interaction:', error);
    }
  };

  // Handle heart toggle
  const handleHeart = (e: React.MouseEvent) => {
    e.stopPropagation();
    const newState = !isHearted;
    setIsHearted(newState);
    setFeedbackCounts((prev) => ({
      ...prev,
      hearts: prev.hearts + (newState ? 1 : -1),
    }));
    recordInteraction(newState ? 'outfit_heart' : 'outfit_unheart');
  };

  // Handle thumbs
  const handleThumbsUp = (e: React.MouseEvent) => {
    e.stopPropagation();
    const newState = thumbsState === 'up' ? null : 'up';
    setThumbsState(newState);
    setFeedbackCounts((prev) => ({
      ...prev,
      thumbs_up: prev.thumbs_up + (newState === 'up' ? 1 : -1),
      thumbs_down: thumbsState === 'down' ? prev.thumbs_down - 1 : prev.thumbs_down,
    }));
    recordInteraction(newState === 'up' ? 'outfit_thumbs_up' : 'outfit_thumbs_down');
  };

  const handleThumbsDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    const newState = thumbsState === 'down' ? null : 'down';
    setThumbsState(newState);
    setFeedbackCounts((prev) => ({
      ...prev,
      thumbs_down: prev.thumbs_down + (newState === 'down' ? 1 : -1),
      thumbs_up: thumbsState === 'up' ? prev.thumbs_up - 1 : prev.thumbs_up,
    }));
    recordInteraction(newState === 'down' ? 'outfit_thumbs_down' : 'outfit_thumbs_up');
  };

  // Grid layout logic
  const getGridLayout = () => {
    if (itemCount === 6) {
      // 6 items: 2 columns, 3 rows, all small tiles
      return (
        <div className="grid grid-cols-2 grid-rows-3 gap-3 h-full">
          {outfit.items.map((item) => (
            <div
              key={item.product_id}
              className="relative rounded-2xl overflow-hidden bg-white"
            >
              <Image
                src={item.image_url}
                alt={item.title}
                fill
                className="object-contain p-4"
                style={{
                  maskImage: 'radial-gradient(ellipse 100% 100% at center, black 60%, transparent 100%)',
                  WebkitMaskImage: 'radial-gradient(ellipse 100% 100% at center, black 60%, transparent 100%)',
                }}
                sizes="200px"
              />
            </div>
          ))}
        </div>
      );
    } else if (itemCount === 5) {
      // 5 items: Column 1 = 3 small, Column 2 = 1 big + 1 small
      return (
        <div className="grid grid-cols-2 grid-rows-3 gap-3 h-full">
          {/* Column 1: 3 small tiles */}
          {outfit.items.slice(0, 3).map((item) => (
            <div
              key={item.product_id}
              className="relative rounded-2xl overflow-hidden bg-white"
            >
              <Image
                src={item.image_url}
                alt={item.title}
                fill
                className="object-contain p-4"
                style={{
                  maskImage: 'radial-gradient(ellipse 100% 100% at center, black 60%, transparent 100%)',
                  WebkitMaskImage: 'radial-gradient(ellipse 100% 100% at center, black 60%, transparent 100%)',
                }}
                sizes="200px"
              />
            </div>
          ))}
          {/* Column 2: 1 big tile (row-span-2) */}
          <div className="relative rounded-2xl overflow-hidden bg-white row-span-2">
            <Image
              src={outfit.items[3].image_url}
              alt={outfit.items[3].title}
              fill
              className="object-contain p-6"
              style={{
                maskImage: 'radial-gradient(ellipse 100% 100% at center, black 60%, transparent 100%)',
                WebkitMaskImage: 'radial-gradient(ellipse 100% 100% at center, black 60%, transparent 100%)',
              }}
              sizes="300px"
            />
          </div>
          {/* Column 2: 1 small tile */}
          <div className="relative rounded-2xl overflow-hidden bg-white">
            <Image
              src={outfit.items[4].image_url}
              alt={outfit.items[4].title}
              fill
              className="object-contain p-4"
              style={{
                maskImage: 'radial-gradient(ellipse 100% 100% at center, black 60%, transparent 100%)',
                WebkitMaskImage: 'radial-gradient(ellipse 100% 100% at center, black 60%, transparent 100%)',
              }}
              sizes="200px"
            />
          </div>
        </div>
      );
    } else if (itemCount === 4) {
      // 4 items: Column 1 = small + big, Column 2 = big + small
      return (
        <div className="grid grid-cols-2 grid-rows-3 gap-3 h-full">
          {/* Column 1: 1 small tile */}
          <div className="relative rounded-2xl overflow-hidden bg-white">
            <Image
              src={outfit.items[0].image_url}
              alt={outfit.items[0].title}
              fill
              className="object-contain p-4"
              style={{
                maskImage: 'radial-gradient(ellipse 100% 100% at center, black 60%, transparent 100%)',
                WebkitMaskImage: 'radial-gradient(ellipse 100% 100% at center, black 60%, transparent 100%)',
              }}
              sizes="200px"
            />
          </div>
          {/* Column 2: 1 big tile (row-span-2) */}
          <div className="relative rounded-2xl overflow-hidden bg-white row-span-2">
            <Image
              src={outfit.items[2].image_url}
              alt={outfit.items[2].title}
              fill
              className="object-contain p-6"
              style={{
                maskImage: 'radial-gradient(ellipse 100% 100% at center, black 60%, transparent 100%)',
                WebkitMaskImage: 'radial-gradient(ellipse 100% 100% at center, black 60%, transparent 100%)',
              }}
              sizes="300px"
            />
          </div>
          {/* Column 1: 1 big tile (row-span-2) */}
          <div className="relative rounded-2xl overflow-hidden bg-white row-span-2">
            <Image
              src={outfit.items[1].image_url}
              alt={outfit.items[1].title}
              fill
              className="object-contain p-6"
              style={{
                maskImage: 'radial-gradient(ellipse 100% 100% at center, black 60%, transparent 100%)',
                WebkitMaskImage: 'radial-gradient(ellipse 100% 100% at center, black 60%, transparent 100%)',
              }}
              sizes="300px"
            />
          </div>
          {/* Column 2: 1 small tile */}
          <div className="relative rounded-2xl overflow-hidden bg-white">
            <Image
              src={outfit.items[3].image_url}
              alt={outfit.items[3].title}
              fill
              className="object-contain p-4"
              style={{
                maskImage: 'radial-gradient(ellipse 100% 100% at center, black 60%, transparent 100%)',
                WebkitMaskImage: 'radial-gradient(ellipse 100% 100% at center, black 60%, transparent 100%)',
              }}
              sizes="200px"
            />
          </div>
        </div>
      );
    } else {
      return (
        <div className="grid grid-cols-2 gap-3 h-full">
          {outfit.items.map((item) => (
            <div
              key={item.product_id}
              className="relative rounded-2xl overflow-hidden bg-white"
            >
              <Image
                src={item.image_url}
                alt={item.title}
                fill
                className="object-contain p-4"
                style={{
                  maskImage: 'radial-gradient(ellipse 100% 100% at center, black 60%, transparent 100%)',
                  WebkitMaskImage: 'radial-gradient(ellipse 100% 100% at center, black 60%, transparent 100%)',
                }}
                sizes="200px"
              />
            </div>
          ))}
        </div>
      );
    }
  };

  const tags = [...outfit.pillars, ...outfit.occasions].slice(0, 3);

  // Feedback buttons component
  const FeedbackButtons = ({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) => {
    if (!showFeedback) return null;

    const iconSize = size === 'sm' ? 'w-4 h-4' : size === 'lg' ? 'w-6 h-6' : 'w-5 h-5';
    const buttonPadding = size === 'sm' ? 'p-2' : size === 'lg' ? 'p-3' : 'p-2.5';
    const textSize = size === 'sm' ? 'text-xs' : size === 'lg' ? 'text-base' : 'text-sm';

    return (
      <div className="flex gap-2 items-center">
        {/* Heart button */}
        <button
          onClick={handleHeart}
          className={`${buttonPadding} rounded-full transition-all ${
            isHearted
              ? 'bg-red-500 text-white'
              : 'bg-white/80 text-gray-700 hover:bg-red-50'
          }`}
          title="Heart this outfit"
        >
          <svg
            className={iconSize}
            fill={isHearted ? 'currentColor' : 'none'}
            stroke="currentColor"
            strokeWidth="2"
            viewBox="0 0 24 24"
          >
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
          </svg>
        </button>

        {/* Thumbs up */}
        <button
          onClick={handleThumbsUp}
          className={`${buttonPadding} rounded-full transition-all ${
            thumbsState === 'up'
              ? 'bg-green-500 text-white'
              : 'bg-white/80 text-gray-700 hover:bg-green-50'
          }`}
          title="Thumbs up"
        >
          <svg className={iconSize} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" />
          </svg>
        </button>

        {/* Thumbs down */}
        <button
          onClick={handleThumbsDown}
          className={`${buttonPadding} rounded-full transition-all ${
            thumbsState === 'down'
              ? 'bg-orange-500 text-white'
              : 'bg-white/80 text-gray-700 hover:bg-orange-50'
          }`}
          title="Thumbs down"
        >
          <svg className={iconSize} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3zm7-13h2.67A2.31 2.31 0 0 1 22 4v7a2.31 2.31 0 0 1-2.33 2H17" />
          </svg>
        </button>
      </div>
    );
  };

  // Layout variations
  if (layout === 'compact') {
    return (
      <div
        className="w-[320px] hover:scale-[1.02] transition-transform duration-200"
      >
        <div className="bg-[#E8E3DC] rounded-2xl p-4 h-[420px] flex flex-col">
          <div className="flex-1 mb-3" onClick={onClick} style={{ cursor: onClick ? 'pointer' : 'default' }}>
            {getGridLayout()}
          </div>
          <div className="flex items-center justify-between gap-2">
            <div className="flex flex-wrap gap-2 flex-1">
              {tags.map((tag, idx) => (
                <span
                  key={`${tag}-${idx}`}
                  className="px-3 py-1 bg-white/80 rounded-full text-xs text-gray-700 font-medium"
                >
                  {tag}
                </span>
              ))}
            </div>
            <FeedbackButtons size="sm" />
          </div>
        </div>
      </div>
    );
  }

  if (layout === 'large') {
    return (
      <div
        className="w-full max-w-[600px] hover:scale-[1.01] transition-transform duration-200"
      >
        <div className="bg-[#E8E3DC] rounded-3xl p-8 h-[680px] flex flex-col">
          <div className="flex-1 mb-6" onClick={onClick} style={{ cursor: onClick ? 'pointer' : 'default' }}>
            {getGridLayout()}
          </div>
          <div className="space-y-3">
            <h3 className="text-2xl font-bold text-gray-900">{outfit.title}</h3>
            <p className="text-gray-600">{outfit.description}</p>
            <div className="flex flex-wrap gap-2">
              {tags.map((tag, idx) => (
                <span
                  key={`${tag}-${idx}`}
                  className="px-5 py-2 bg-white/90 rounded-full text-sm text-gray-700 font-medium"
                >
                  {tag}
                </span>
              ))}
            </div>
            <div className="flex justify-between items-center pt-4">
              <div className="flex items-center gap-4">
                <span className="text-gray-600">Total</span>
                <span className="text-2xl font-bold text-gray-900">
                  ${outfit.total_price}
                </span>
              </div>
              <FeedbackButtons size="lg" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Default 'card' layout
  return (
    <div
      className="flex-none w-[460px] hover:scale-[1.02] transition-transform duration-200"
    >
      <div className="bg-[#E8E3DC] rounded-3xl p-5 h-[580px] flex flex-col">
        <div className="flex-1 mb-4" onClick={onClick} style={{ cursor: onClick ? 'pointer' : 'default' }}>
          {getGridLayout()}
        </div>
        <div className="flex items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2 flex-1">
            {tags.map((tag, idx) => (
              <span
                key={`${tag}-${idx}`}
                className="px-4 py-2 bg-white/80 rounded-full text-sm text-gray-700 font-medium"
              >
                {tag}
              </span>
            ))}
          </div>
          <FeedbackButtons size="md" />
        </div>
      </div>
    </div>
  );
}
