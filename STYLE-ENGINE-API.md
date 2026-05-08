# Nordstrom Style Engine - Public API Documentation

**Base URL:** `https://nordstrom-style-profile.vercel.app`

This API provides access to 49,000+ fashion products with AI-powered semantic search using CLIP embeddings. Perfect for building product recommendation tools, style applications, and fashion discovery experiences.

---

## 🔑 Authentication & Rate Limits

Authentication is **optional** but recommended for higher limits.

| Tier | Daily Limit | Authentication |
|------|------------|----------------|
| **Free** | 100 requests/day | None required |
| **Premium** | 10,000 requests/day | API key in header |

**Test it now (no auth):**
```bash
curl "https://nordstrom-style-profile.vercel.app/api/public/search" \
  -H "Content-Type: application/json" \
  -d '{"query": "cozy warm fall sweaters", "limit": 5}'
```

**With API key (higher limits):**
```bash
curl "https://nordstrom-style-profile.vercel.app/api/public/search" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-api-key-here" \
  -d '{"query": "cozy warm fall sweaters", "limit": 5}'
```

**Need an API key?** Contact the team or see `API-KEY-INFO.md` for details.

---

## 📡 API Endpoints

### 1. Semantic Product Search

**The main feature** - search products using natural language.

```
POST /api/public/search
```

**Request Body:**
```json
{
  "query": "cozy warm fall sweaters",
  "limit": 12,
  "gender": "womenswear"
}
```

**Parameters:**
- `query` (required): Natural language search query
- `limit` (optional): Number of results (default: 12, max: 50)
- `gender` (optional): Filter by "womenswear", "menswear", or "all" (default: "all")

**Response:**
```json
{
  "query": "cozy warm fall sweaters",
  "count": 12,
  "products": [
    {
      "id": "prod_123",
      "name": "Cashmere Turtleneck Sweater",
      "brand": "Halogen",
      "price": 129.00,
      "image_url": "https://...",
      "product_url": "https://...",
      "gender": "womenswear",
      "category": "Clothing",
      "subcategory": "Sweaters",
      "colors": ["beige", "cream"],
      "similarity_score": 0.89
    }
  ]
}
```

**Example Queries:**
- "minimalist black leather jacket"
- "summer wedding guest dress"
- "professional work pants for women"
- "casual sneakers for everyday"
- "cozy loungewear"
- "elegant evening accessories"

---

### 2. Get Product Details

Fetch specific products by ID or browse the catalog.

```
GET /api/public/products
```

**Query Parameters:**

**Single Product:**
```
GET /api/public/products?id=prod_123
```

**Multiple Products:**
```
GET /api/public/products?ids=prod_123,prod_456,prod_789
```

**Browse/Paginate:**
```
GET /api/public/products?limit=50&offset=0
```

**Response (single):**
```json
{
  "product": {
    "id": "prod_123",
    "name": "Cashmere Turtleneck",
    "brand": "Halogen",
    "price": 129.00,
    "image_url": "https://...",
    "colors": ["beige", "cream"],
    "materials": ["cashmere"],
    "category": "Clothing",
    "subcategory": "Sweaters",
    "gender": "womenswear"
  }
}
```

---

### 3. Get Outfit Details

Access styled outfits with product combinations.

```
GET /api/public/outfits
```

**Query Parameters:**

**Single Outfit:**
```
GET /api/public/outfits?id=outfit_abc123
```

**Multiple Outfits:**
```
GET /api/public/outfits?ids=outfit_abc123,outfit_def456
```

**Browse by Quality Tier:**
```
GET /api/public/outfits?pool=primary&limit=20
```

- `pool`: "primary" (highest quality), "secondary", "suppressed"
- `limit`: Results per page (default: 50)
- `offset`: Pagination offset (default: 0)

**Response:**
```json
{
  "total": 20000,
  "count": 20,
  "outfits": [
    {
      "outfit_id": "outfit_abc123",
      "recipe_id": "minimalist_work",
      "items": [
        {
          "product": { "id": "prod_123", "name": "..." },
          "role": "top",
          "slot": 1
        }
      ],
      "attributes": {
        "pillars": ["minimalist", "classic"],
        "vibes": ["professional", "polished"],
        "occasions": ["work", "business casual"],
        "formality": 0.7,
        "color_palette": ["black", "white", "gray"]
      },
      "pool_tier": "primary"
    }
  ]
}
```

---

## 🛠️ Use Cases

### Product Recommendation Tray
```javascript
// Search for products
const response = await fetch('https://nordstrom-style-profile.vercel.app/api/public/search', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    query: 'minimalist work blazers',
    limit: 12,
    gender: 'womenswear'
  })
});

const { products } = await response.json();

// Display products in a grid
products.forEach(product => {
  console.log(`${product.name} - $${product.price}`);
  console.log(`Similarity: ${(product.similarity_score * 100).toFixed(0)}%`);
});
```

### Style Discovery Tool
```javascript
// Find products for multiple occasions
const occasions = [
  'casual weekend brunch',
  'date night outfit',
  'professional work look'
];

for (const occasion of occasions) {
  const response = await fetch('https://nordstrom-style-profile.vercel.app/api/public/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: occasion, limit: 8 })
  });

  const { products } = await response.json();
  console.log(`\n${occasion}:`);
  console.log(products.map(p => p.name).join('\n'));
}
```

### Outfit Builder
```javascript
// Get high-quality pre-styled outfits
const response = await fetch(
  'https://nordstrom-style-profile.vercel.app/api/public/outfits?pool=primary&limit=10'
);

const { outfits } = await response.json();

outfits.forEach(outfit => {
  console.log(`\nOutfit: ${outfit.recipe_id}`);
  console.log(`Style: ${outfit.attributes.pillars.join(', ')}`);
  console.log(`Items: ${outfit.items.length}`);
  outfit.items.forEach(item => {
    console.log(`  - ${item.role}: ${item.product.name}`);
  });
});
```

---

## 📊 Data Overview

**Products:** ~49,000 products
- Categories: Clothing, Shoes, Accessories
- Brands: 100+ fashion brands
- Gender: Womenswear, Menswear
- Each product has visual embeddings for semantic search

**Outfits:** ~20,000 styled outfits
- 4-6 items per outfit
- AI-tagged with style attributes
- Quality tiers (primary, secondary, suppressed)
- Compatible product alternatives

---

## 🚀 Getting Started with Claude Code

1. **Copy this entire document**
2. **Paste into a fresh Claude Code session**
3. **Say:** "Build me a product recommendation tool using this API"
4. **Claude will create a working app instantly**

**Example prompts:**
- "Make me a product recommendation tray with cozy warm fall sweaters"
- "Build a style quiz that shows products based on user answers"
- "Create a random outfit generator using the outfits endpoint"
- "Make a search interface where I can type natural language queries"

---

## 🔒 API Limits & Fair Use

- **Rate Limits:** None currently (please be reasonable)
- **Data Access:** Read-only
- **Attribution:** Not required but appreciated
- **Commercial Use:** Contact for licensing

---

## 💡 Advanced Features

### CLIP Embeddings
All products have 512-dimensional visual embeddings generated by FashionSigLIP. The search endpoint uses cosine similarity to find visually and semantically similar items.

### Outfit Attributes
Outfits are tagged with:
- **Style Pillars:** minimalist, maximalist, classic, romantic, etc.
- **Vibes:** professional, casual, edgy, bohemian, etc.
- **Occasions:** work, date night, weekend, formal, etc.
- **Formality Score:** 0.0 (very casual) to 1.0 (very formal)
- **Color Palette:** Dominant colors in the outfit

---

## 📞 Support

**Questions?** Create an issue on GitHub or reach out to the team.

**Found a bug?** We'd love to know! Open an issue with details.

**Want more data access?** Contact us about additional endpoints or private data access.

---

## 🎯 Example: Complete Product Finder

```html
<!DOCTYPE html>
<html>
<head>
  <title>Nordstrom Product Finder</title>
  <style>
    body { font-family: system-ui; max-width: 1200px; margin: 50px auto; padding: 20px; }
    .search-box { display: flex; gap: 10px; margin-bottom: 30px; }
    .search-box input { flex: 1; padding: 12px; font-size: 16px; border: 2px solid #ddd; border-radius: 8px; }
    .search-box button { padding: 12px 24px; background: #000; color: #fff; border: none; border-radius: 8px; cursor: pointer; }
    .products { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; }
    .product { border: 1px solid #ddd; border-radius: 8px; padding: 12px; }
    .product img { width: 100%; aspect-ratio: 3/4; object-fit: cover; border-radius: 4px; }
    .product h3 { font-size: 14px; margin: 10px 0 5px; }
    .product .price { font-weight: bold; }
  </style>
</head>
<body>
  <h1>Product Finder</h1>
  <div class="search-box">
    <input type="text" id="query" placeholder="Try: cozy warm fall sweaters">
    <button onclick="search()">Search</button>
  </div>
  <div class="products" id="results"></div>

  <script>
    async function search() {
      const query = document.getElementById('query').value;
      const response = await fetch('https://nordstrom-style-profile.vercel.app/api/public/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, limit: 12 })
      });

      const { products } = await response.json();

      document.getElementById('results').innerHTML = products.map(p => `
        <div class="product">
          <img src="${p.image_url}" alt="${p.name}">
          <h3>${p.name}</h3>
          <p>${p.brand}</p>
          <p class="price">$${p.price.toFixed(2)}</p>
        </div>
      `).join('');
    }

    // Search on Enter key
    document.getElementById('query').addEventListener('keypress', (e) => {
      if (e.key === 'Enter') search();
    });
  </script>
</body>
</html>
```

Save this as `index.html` and open it in a browser - it works immediately!

---

**Built with:** Next.js 16 · Supabase · CLIP (FashionSigLIP) · Claude AI · Gemini AI

**Last Updated:** May 6, 2026
