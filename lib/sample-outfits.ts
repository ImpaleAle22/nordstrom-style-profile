import { OutfitRecommendation } from '@/components/profile/OutfitRecommendationTray';

// Sample outfit recommendations for the working profile (Minimal/Classic style)
export const SAMPLE_OUTFITS: OutfitRecommendation[] = [
  {
    outfit_id: 'outfit_001',
    title: 'Modern Minimal Office',
    description: 'Elevated basics for a polished professional look with clean lines and neutral tones',
    match_score: 0.94,
    match_reason: 'Matches your minimal and classic style preferences',
    pillars: ['Minimal', 'Classic', 'Professional'],
    occasions: ['Work', 'Business Meeting'],
    total_price: 645,
    confidence: 'high',
    items: [
      {
        product_id: 'prod_001',
        title: 'Tailored Blazer',
        brand: 'Everlane',
        price: 248,
        image_url: 'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=400',
        product_type: 'Blazer',
        role: 'outerwear'
      },
      {
        product_id: 'prod_002',
        title: 'Silk Blouse',
        brand: 'Vince',
        price: 195,
        image_url: 'https://images.unsplash.com/photo-1618932260643-eee4a2f652a6?w=400',
        product_type: 'Blouse',
        role: 'top'
      },
      {
        product_id: 'prod_003',
        title: 'High-Waisted Trousers',
        brand: 'COS',
        price: 129,
        image_url: 'https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?w=400',
        product_type: 'Pants',
        role: 'bottom'
      },
      {
        product_id: 'prod_004',
        title: 'Leather Loafers',
        brand: 'Everlane',
        price: 168,
        image_url: 'https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=400',
        product_type: 'Shoes',
        role: 'shoes'
      }
    ]
  },
  {
    outfit_id: 'outfit_002',
    title: 'Weekend Casual Chic',
    description: 'Effortlessly stylish for brunch, errands, or casual meetups',
    match_score: 0.91,
    match_reason: 'Aligns with your casual and minimal aesthetic',
    pillars: ['Casual', 'Minimal'],
    occasions: ['Weekend', 'Brunch'],
    total_price: 438,
    confidence: 'high',
    items: [
      {
        product_id: 'prod_005',
        title: 'Cashmere Crewneck',
        brand: 'Everlane',
        price: 128,
        image_url: 'https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?w=400',
        product_type: 'Sweater',
        role: 'top'
      },
      {
        product_id: 'prod_006',
        title: 'High-Rise Jeans',
        brand: 'Madewell',
        price: 128,
        image_url: 'https://images.unsplash.com/photo-1542272604-787c3835535d?w=400',
        product_type: 'Jeans',
        role: 'bottom'
      },
      {
        product_id: 'prod_007',
        title: 'White Sneakers',
        brand: 'Veja',
        price: 150,
        image_url: 'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=400',
        product_type: 'Sneakers',
        role: 'shoes'
      },
      {
        product_id: 'prod_008',
        title: 'Minimal Tote',
        brand: 'Cuyana',
        price: 178,
        image_url: 'https://images.unsplash.com/photo-1590874103328-eac38a683ce7?w=400',
        product_type: 'Bag',
        role: 'accessory'
      }
    ]
  },
  {
    outfit_id: 'outfit_003',
    title: 'Evening Elevated',
    description: 'Sophisticated and polished for dinner dates or evening events',
    match_score: 0.89,
    match_reason: 'Sophisticated pieces matching your classic preferences',
    pillars: ['Classic', 'Modern'],
    occasions: ['Date Night', 'Evening Out'],
    total_price: 892,
    confidence: 'high',
    items: [
      {
        product_id: 'prod_009',
        title: 'Silk Slip Dress',
        brand: 'Vince',
        price: 395,
        image_url: 'https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=400',
        product_type: 'Dress',
        role: 'top'
      },
      {
        product_id: 'prod_010',
        title: 'Tailored Blazer',
        brand: 'The Row',
        price: 1290,
        image_url: 'https://images.unsplash.com/photo-1591369822096-ffd140ec948f?w=400',
        product_type: 'Blazer',
        role: 'outerwear'
      },
      {
        product_id: 'prod_011',
        title: 'Strappy Heels',
        brand: 'Sam Edelman',
        price: 140,
        image_url: 'https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=400',
        product_type: 'Heels',
        role: 'shoes'
      },
      {
        product_id: 'prod_012',
        title: 'Minimal Clutch',
        brand: 'Cuyana',
        price: 148,
        image_url: 'https://images.unsplash.com/photo-1566150905458-1bf1fc113f0d?w=400',
        product_type: 'Clutch',
        role: 'accessory'
      }
    ]
  },
  {
    outfit_id: 'outfit_004',
    title: 'Smart Casual Friday',
    description: 'Bridge work and weekend with this versatile outfit',
    match_score: 0.87,
    match_reason: 'Versatile pieces matching multiple style pillars',
    pillars: ['Casual', 'Professional'],
    occasions: ['Work', 'Happy Hour'],
    total_price: 521,
    confidence: 'medium',
    items: [
      {
        product_id: 'prod_013',
        title: 'Merino Turtleneck',
        brand: 'Everlane',
        price: 88,
        image_url: 'https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?w=400',
        product_type: 'Sweater',
        role: 'top'
      },
      {
        product_id: 'prod_014',
        title: 'Wool Trousers',
        brand: 'COS',
        price: 150,
        image_url: 'https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?w=400',
        product_type: 'Pants',
        role: 'bottom'
      },
      {
        product_id: 'prod_015',
        title: 'Chelsea Boots',
        brand: 'Nisolo',
        price: 228,
        image_url: 'https://images.unsplash.com/photo-1608256246200-53e635b5b65f?w=400',
        product_type: 'Boots',
        role: 'shoes'
      },
      {
        product_id: 'prod_016',
        title: 'Gold Hoops',
        brand: 'Mejuri',
        price: 55,
        image_url: 'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=400',
        product_type: 'Jewelry',
        role: 'accessory'
      }
    ]
  },
  {
    outfit_id: 'outfit_005',
    title: 'Layered Minimalism',
    description: 'Textured neutrals create depth in this monochromatic look',
    match_score: 0.92,
    match_reason: 'Perfect for your minimal style with sophisticated layering',
    pillars: ['Minimal', 'Modern'],
    occasions: ['Work', 'Casual'],
    total_price: 695,
    confidence: 'high',
    items: [
      {
        product_id: 'prod_017',
        title: 'Oversized Cardigan',
        brand: 'Vince',
        price: 325,
        image_url: 'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=400',
        product_type: 'Cardigan',
        role: 'outerwear'
      },
      {
        product_id: 'prod_018',
        title: 'Cotton Tee',
        brand: 'Everlane',
        price: 28,
        image_url: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400',
        product_type: 'T-Shirt',
        role: 'top'
      },
      {
        product_id: 'prod_019',
        title: 'Wide-Leg Pants',
        brand: 'COS',
        price: 165,
        image_url: 'https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?w=400',
        product_type: 'Pants',
        role: 'bottom'
      },
      {
        product_id: 'prod_020',
        title: 'Minimal Mules',
        brand: 'Everlane',
        price: 145,
        image_url: 'https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=400',
        product_type: 'Shoes',
        role: 'shoes'
      }
    ]
  }
];

// Additional trays by category
export const TRENDING_OUTFITS = SAMPLE_OUTFITS.slice(0, 3);
export const NEW_ARRIVALS = SAMPLE_OUTFITS.slice(2, 5);
export const SEASONAL_PICKS = SAMPLE_OUTFITS.slice(1, 4);
