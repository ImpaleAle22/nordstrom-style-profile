'use client';

/**
 * Demo Product Curator
 * Select products for the outfit tagger demo
 */

import { useState, useEffect } from 'react';

interface Product {
  productId: string;
  title: string;
  color?: string;
  imageUrl?: string;
  selected?: boolean;
}

interface Slot {
  id: string;
  label: string;
  searches: { label: string; query: string }[];
  products: Record<string, Product[]>;
}

export default function DemoProductCurator() {
  const [slots, setSlots] = useState<Slot[]>([
    {
      id: 'top',
      label: 'Tops',
      searches: [
        { label: 'Cream Silk Blouse', query: 'women cream silk blouse feminine elegant flat lay' },
        { label: 'Grey Cashmere Sweater', query: 'women grey cashmere sweater soft cozy flat lay' },
        { label: 'White T-Shirt', query: 'women white t-shirt classic simple flat lay' },
      ],
      products: {},
    },
    {
      id: 'bottom',
      label: 'Bottoms',
      searches: [
        { label: 'Black Tailored Trousers', query: 'women black tailored trousers professional flat lay' },
        { label: 'Navy Pleated Midi Skirt', query: 'women navy pleated midi skirt flat lay' },
        { label: 'Blue Denim Jeans', query: 'women blue denim jeans classic flat lay' },
      ],
      products: {},
    },
    {
      id: 'shoes',
      label: 'Shoes',
      searches: [
        { label: 'Black Heeled Boots', query: 'women black heeled boots ankle flat lay' },
        { label: 'Brown Leather Loafers', query: 'women brown leather loafers flat lay' },
        { label: 'White Sneakers', query: 'women white sneakers clean minimal flat lay' },
      ],
      products: {},
    },
    {
      id: 'accessory',
      label: 'Accessories',
      searches: [
        { label: 'Tan Leather Tote', query: 'women tan leather tote bag flat lay' },
        { label: 'Black Crossbody Bag', query: 'women black crossbody bag flat lay' },
        { label: 'Silver Chain Necklace', query: 'women silver chain necklace delicate flat lay' },
      ],
      products: {},
    },
  ]);

  const [loading, setLoading] = useState(false);
  const [selectedProducts, setSelectedProducts] = useState<Record<string, string[]>>({});

  useEffect(() => {
    loadAllProducts();
  }, []);

  const loadAllProducts = async () => {
    setLoading(true);
    const updatedSlots = [...slots];

    for (const slot of updatedSlots) {
      for (const search of slot.searches) {
        try {
          const response = await fetch('/api/clip-search', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query: search.query, limit: 10 }),
          });
          const data = await response.json();

          slot.products[search.label] = (data.results || []).map((p: any) => ({
            productId: p.productId,
            title: p.title,
            color: p.color,
            imageUrl: p.imageUrl,
            selected: false,
          }));
        } catch (error) {
          console.error(`Failed to load ${search.label}:`, error);
          slot.products[search.label] = [];
        }
      }
    }

    setSlots(updatedSlots);
    setLoading(false);
  };

  const toggleProduct = (slotId: string, searchLabel: string, productId: string) => {
    const key = `${slotId}-${searchLabel}`;
    const current = selectedProducts[key] || [];

    if (current.includes(productId)) {
      setSelectedProducts({
        ...selectedProducts,
        [key]: current.filter(id => id !== productId),
      });
    } else {
      setSelectedProducts({
        ...selectedProducts,
        [key]: [...current, productId],
      });
    }
  };

  const exportSelections = () => {
    const output: any = {};

    for (const slot of slots) {
      output[slot.id] = {};
      for (const search of slot.searches) {
        const key = `${slot.id}-${search.label}`;
        const selectedIds = selectedProducts[key] || [];
        const products = slot.products[search.label] || [];

        output[slot.id][search.label] = products
          .filter(p => selectedIds.includes(p.productId))
          .map(p => ({
            id: p.productId,
            name: p.title,
            color: p.color,
            imageUrl: p.imageUrl,
          }));
      }
    }

    console.log('Selected products:', output);
    alert('Check console for selected products JSON');
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Demo Product Curator</h1>
          <button
            onClick={exportSelections}
            className="px-6 py-3 bg-black text-white rounded-lg font-medium hover:bg-gray-800"
          >
            Export Selections
          </button>
        </div>

        {loading && (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mb-4"></div>
            <p className="text-gray-600">Loading products...</p>
          </div>
        )}

        {!loading && slots.map(slot => (
          <div key={slot.id} className="mb-12">
            <h2 className="text-2xl font-bold mb-6">{slot.label}</h2>

            {slot.searches.map(search => {
              const products = slot.products[search.label] || [];
              const key = `${slot.id}-${search.label}`;
              const selected = selectedProducts[key] || [];

              return (
                <div key={search.label} className="mb-8 bg-white rounded-xl border-2 border-gray-200 p-6">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-semibold">{search.label}</h3>
                    <span className="text-sm text-gray-500">{selected.length} selected</span>
                  </div>

                  <div className="grid grid-cols-5 gap-4">
                    {products.map((product, index) => (
                      <button
                        key={product.productId}
                        onClick={() => toggleProduct(slot.id, search.label, product.productId)}
                        className={`border-2 rounded-lg p-3 transition-all ${
                          selected.includes(product.productId)
                            ? 'border-green-500 bg-green-50'
                            : 'border-gray-200 hover:border-gray-400'
                        }`}
                      >
                        {product.imageUrl ? (
                          <div className="aspect-[2/3] bg-gray-100 rounded overflow-hidden mb-2">
                            <img
                              src={product.imageUrl}
                              alt={product.title}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        ) : (
                          <div className="aspect-[2/3] bg-gradient-to-br from-gray-100 to-gray-200 rounded mb-2 flex items-center justify-center">
                            <span className="text-3xl">👕</span>
                          </div>
                        )}
                        <p className="text-xs font-medium truncate">{product.title}</p>
                        <p className="text-xs text-gray-500 truncate">{product.color}</p>
                        <p className="text-xs text-gray-400 mt-1">#{index + 1}</p>
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
