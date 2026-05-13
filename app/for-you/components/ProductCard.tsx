'use client';

import { useState } from 'react';
import Image from 'next/image';

export interface Product {
  product_id: string;
  title: string;
  brand: string;
  price: number;
  image_url: string;
  product_type: string;
  colors?: string[];
  match_score?: number;
}

interface ProductCardProps {
  product: Product;
  layout?: 'grid' | 'list';
  onClick?: () => void;
  showMatchScore?: boolean;
}

export default function ProductCard({
  product,
  layout = 'grid',
  onClick,
  showMatchScore = false,
}: ProductCardProps) {
  const [bgColor, setBgColor] = useState<string>('rgb(238, 237, 232)'); // default tiled bg

  // Sample corner pixels to get background color
  const handleImageLoad = (img: HTMLImageElement) => {
    console.log('🎨 Sampling image:', product.product_id, img.src);
    try {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) {
        console.log('❌ No canvas context');
        return;
      }

      ctx.drawImage(img, 0, 0);

      // Sample corners (avoiding edge pixels)
      const w = img.naturalWidth;
      const h = img.naturalHeight;
      const samples = [
        [5, 5],           // top-left
        [w - 6, 5],       // top-right
        [5, h - 6],       // bottom-left
        [w - 6, h - 6],   // bottom-right
      ];

      const colors = samples.map(([x, y]) => {
        const data = ctx.getImageData(x, y, 1, 1).data;
        return [data[0], data[1], data[2]];
      });

      console.log('📊 Sampled colors:', colors);

      // Reject outliers: remove colors far from median brightness
      const brightness = colors.map(([r, g, b]) => r + g + b);
      const sorted = [...brightness].sort((a, b) => a - b);
      const median = sorted[Math.floor(sorted.length / 2)];

      const filtered = colors.filter((_, i) =>
        Math.abs(brightness[i] - median) < 150 // outlier threshold
      );

      if (filtered.length === 0) {
        console.log('⚠️ All samples filtered out');
        return;
      }

      // Average the valid samples
      const [r, g, b] = filtered.reduce(
        (acc, color) => [acc[0] + color[0], acc[1] + color[1], acc[2] + color[2]],
        [0, 0, 0]
      ).map(v => Math.round(v / filtered.length));

      const newColor = `rgb(${r}, ${g}, ${b})`;
      console.log('✅ Setting color:', newColor);
      setBgColor(newColor);
    } catch (error) {
      console.error('❌ Image sampling failed:', error);
    }
  };
  if (layout === 'list') {
    return (
      <div
        className="flex gap-4 bg-white border border-gray-200 rounded-xl p-4 cursor-pointer hover:border-gray-300 transition-colors"
        onClick={onClick}
      >
        <div
          className="relative w-32 h-32 flex-shrink-0 rounded-[30px] transition-colors duration-300"
          style={{ backgroundColor: bgColor }}
        >
          <div
            className="w-full h-full p-2 rounded-[30px] overflow-hidden"
            style={{
              maskImage: 'radial-gradient(ellipse 100% 100% at center, black 60%, transparent 100%)',
              WebkitMaskImage: 'radial-gradient(ellipse 100% 100% at center, black 60%, transparent 100%)',
            }}
          >
            <Image
              src={product.image_url}
              alt={product.title}
              fill
              className="object-contain"
              sizes="128px"
              onLoad={(e) => handleImageLoad(e.currentTarget as HTMLImageElement)}
            />
          </div>
        </div>
        <div className="flex-1 flex flex-col justify-between">
          <div>
            <h3 className="text-lg font-semibold text-black mb-1">{product.title}</h3>
            <p className="text-sm text-gray-600 mb-2">{product.brand}</p>
            <p className="text-xs text-gray-500">{product.product_type}</p>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xl font-bold text-black">${product.price}</span>
            {showMatchScore && product.match_score && (
              <span className="px-3 py-1 bg-green-50 text-green-700 rounded-full text-sm font-medium">
                {Math.round(product.match_score * 100)}% match
              </span>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Grid layout (default)
  return (
    <div
      className="group cursor-pointer hover:scale-[1.02] transition-transform duration-200"
      onClick={onClick}
    >
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden hover:border-gray-300 transition-colors">
        {/* Image container */}
        <div
          className="relative aspect-square rounded-[30px] transition-colors duration-300"
          style={{ backgroundColor: bgColor }}
        >
          <div
            className="w-full h-full p-4 rounded-[30px] overflow-hidden"
            style={{
              maskImage: 'radial-gradient(ellipse 100% 100% at center, black 60%, transparent 100%)',
              WebkitMaskImage: 'radial-gradient(ellipse 100% 100% at center, black 60%, transparent 100%)',
            }}
          >
            <Image
              src={product.image_url}
              alt={product.title}
              fill
              className="object-contain"
              sizes="300px"
              onLoad={(e) => handleImageLoad(e.currentTarget as HTMLImageElement)}
            />
          </div>
          {showMatchScore && product.match_score && (
            <div className="absolute top-3 right-3 px-3 py-1 bg-green-600 text-white rounded-full text-xs font-semibold">
              {Math.round(product.match_score * 100)}%
            </div>
          )}
        </div>

        {/* Info */}
        <div className="p-4">
          <p className="text-sm text-gray-600 mb-1">{product.brand}</p>
          <h3 className="text-black font-medium mb-2 line-clamp-2">{product.title}</h3>
          <div className="flex items-center justify-between">
            <span className="text-lg font-bold text-black">${product.price}</span>
            {product.colors && product.colors.length > 0 && (
              <div className="flex gap-1">
                {product.colors.slice(0, 3).map((color, idx) => (
                  <div
                    key={idx}
                    className="w-4 h-4 rounded-full border-2 border-gray-300"
                    style={{
                      backgroundColor: color.toLowerCase().replace(/\s/g, ''),
                    }}
                    title={color}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
