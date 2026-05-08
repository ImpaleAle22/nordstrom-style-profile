---
title: Fashion CLIP Search API
emoji: 👗
colorFrom: blue
colorTo: purple
sdk: docker
pinned: false
license: mit
---

# Fashion CLIP Search API

Visual similarity search API using FashionSigLIP embeddings for 25K+ fashion products.

## Features

- **Semantic Search**: Text queries like "moody autumn vibes" or "business casual but make it fun"
- **Visual Similarity**: Find products similar to a query based on visual features
- **Fast**: Pre-computed embeddings for instant search
- **Filtered**: Only outfit-eligible products (no beauty, home goods, etc.)

## API Endpoints

### POST /search
Search for products by text query.

```bash
curl -X POST https://YOUR-SPACE.hf.space/search \
  -H "Content-Type: application/json" \
  -d '{"query": "black cocktail dress", "limit": 10}'
```

### GET /health
Health check endpoint.

```bash
curl https://YOUR-SPACE.hf.space/health
```

## Dataset

Products sourced from Supabase, filtered to only include outfit-eligible items:
- Tops, Bottoms, Dresses, Shoes, Accessories
- Outerwear, Jewelry, Swimwear, Underwear
- All with FashionSigLIP embeddings

## Model

Uses **Marqo-FashionSigLIP** - a CLIP model trained specifically on fashion data.
