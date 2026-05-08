# Testing New CLIP API Endpoints

Quick guide to test the extended CLIP API locally before deploying.

## Setup

```bash
cd /Users/hqh4/claude/style-engine/services/clip-search-hf

# Install new dependencies
pip install -r requirements.txt

# Start server
python app.py
```

Server starts on `http://localhost:5002`

---

## Test 1: Embed Text

```bash
curl -X POST http://localhost:5002/embed-text \
  -H "Content-Type: application/json" \
  -d '{"text": "romantic date night outfit"}'
```

**Expected:**
```json
{
  "embedding": [0.123, -0.456, ...],  // 768 floats
  "dimensions": 768,
  "processingTime": 0.012
}
```

---

## Test 2: Embed Image (Pexels)

```bash
curl -X POST http://localhost:5002/embed-image \
  -H "Content-Type: application/json" \
  -d '{
    "imageUrl": "https://images.pexels.com/photos/1926769/pexels-photo-1926769.jpeg?auto=compress&cs=tinysrgb&w=800"
  }'
```

**Expected:**
```json
{
  "embedding": [0.234, -0.567, ...],  // 768 floats
  "dimensions": 768,
  "processingTime": 0.234
}
```

**Note:** Processing time includes image download, so may vary based on network.

---

## Test 3: Embed Style Concepts

```bash
curl -X POST http://localhost:5002/embed-concepts \
  -H "Content-Type: application/json" \
  -d '{
    "categories": ["pillars", "vibes"],
    "useCache": false
  }'
```

**Expected:**
```json
{
  "pillars": {
    "romantic fashion style outfit": [0.123, ...],
    "classic fashion style outfit": [0.456, ...],
    ...
  },
  "vibes": {
    "bold fashion": [0.789, ...],
    ...
  },
  "metadata": {
    "totalConcepts": 37,
    "processingTime": 1.234,
    "cached": false
  }
}
```

**Test caching:**
```bash
# Second request should return instantly
curl -X POST http://localhost:5002/embed-concepts \
  -H "Content-Type: application/json" \
  -d '{"useCache": true}'
```

Expected `processingTime < 0.001` and `"cached": true`

---

## Test 4: Semantic Search (Text)

```bash
curl -X POST http://localhost:5002/semantic-search \
  -H "Content-Type: application/json" \
  -d '{
    "query": "romantic date night outfit",
    "searchProducts": true,
    "searchConcepts": true,
    "conceptCategories": ["pillars", "vibes", "occasions"],
    "limit": 10
  }'
```

**Expected:**
```json
{
  "products": [
    {
      "productId": "12345",
      "title": "Floral Maxi Dress",
      "score": 0.85,
      ...
    }
  ],
  "concepts": {
    "pillars": [
      {
        "name": "romantic fashion style outfit",
        "score": 0.92
      }
    ],
    "vibes": [
      {
        "name": "dreamy fashion",
        "score": 0.88
      }
    ],
    "occasions": [
      {
        "name": "date night outfit",
        "score": 0.94
      }
    ]
  },
  "metadata": {
    "queryType": "text",
    "processingTime": 0.234
  }
}
```

---

## Test 5: Semantic Search (Image)

```bash
curl -X POST http://localhost:5002/semantic-search \
  -H "Content-Type: application/json" \
  -d '{
    "imageUrl": "https://images.pexels.com/photos/1926769/pexels-photo-1926769.jpeg?auto=compress&cs=tinysrgb&w=800",
    "searchProducts": true,
    "searchConcepts": true,
    "conceptCategories": ["pillars"],
    "limit": 5
  }'
```

**Expected:**
Similar structure but with `"queryType": "image"`

---

## Test 6: Similarity Validation

Test that similar concepts have high similarity:

```bash
# Get embedding for "romantic fashion"
curl -X POST http://localhost:5002/embed-text \
  -H "Content-Type: application/json" \
  -d '{"text": "romantic fashion style outfit"}' \
  > romantic.json

# Get embedding for "date night outfit"
curl -X POST http://localhost:5002/embed-text \
  -H "Content-Type: application/json" \
  -d '{"text": "date night outfit"}' \
  > date_night.json

# Manually compute cosine similarity (dot product of normalized vectors)
# Should be > 0.5 (related concepts)
```

---

## Test 7: Health Check

```bash
curl http://localhost:5002/health
```

**Expected:**
```json
{
  "status": "healthy",
  "products_loaded": 49000,
  "embeddings_loaded": 49000,
  "image_gaps": 0
}
```

---

## Integration Test (Full Workflow)

### Python Script

Create `test_workflow.py`:

```python
import requests
import json
import numpy as np

CLIP_API = "http://localhost:5002"

def cosine_similarity(a, b):
    """Compute cosine similarity between two vectors."""
    return np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b))

# Step 1: Embed style concept
print("1. Embedding style concept...")
response = requests.post(f"{CLIP_API}/embed-text", json={
    "text": "romantic fashion style outfit"
})
romantic_embedding = np.array(response.json()['embedding'])
print(f"   ✓ Romantic embedding: {len(romantic_embedding)} dimensions")

# Step 2: Embed lifestyle image
print("\n2. Embedding lifestyle image...")
response = requests.post(f"{CLIP_API}/embed-image", json={
    "imageUrl": "https://images.pexels.com/photos/1926769/pexels-photo-1926769.jpeg?auto=compress&cs=tinysrgb&w=800"
})
image_embedding = np.array(response.json()['embedding'])
print(f"   ✓ Image embedding: {len(image_embedding)} dimensions")

# Step 3: Compute similarity
print("\n3. Computing similarity...")
similarity = cosine_similarity(romantic_embedding, image_embedding)
print(f"   ✓ Similarity: {similarity:.3f}")

if similarity > 0.6:
    print("   ✅ HIGH confidence - image matches romantic style")
elif similarity > 0.4:
    print("   ⚠️  MEDIUM confidence - some romantic elements")
else:
    print("   ❌ LOW confidence - different style")

# Step 4: Find products matching image
print("\n4. Finding matching products...")
response = requests.post(f"{CLIP_API}/semantic-search", json={
    "imageUrl": "https://images.pexels.com/photos/1926769/pexels-photo-1926769.jpeg?auto=compress&cs=tinysrgb&w=800",
    "searchProducts": True,
    "limit": 5
})
results = response.json()
print(f"   ✓ Found {len(results['products'])} products")
for p in results['products'][:3]:
    print(f"     - {p['title']} ({p['brand']}) - Score: {p['score']:.3f}")

# Step 5: Semantic search with text
print("\n5. Semantic search: 'romantic date night outfit'")
response = requests.post(f"{CLIP_API}/semantic-search", json={
    "query": "romantic date night outfit",
    "searchProducts": True,
    "searchConcepts": True,
    "conceptCategories": ["pillars", "vibes", "occasions"],
    "limit": 3
})
results = response.json()
print(f"   ✓ Top pillar: {results['concepts']['pillars'][0]['name']} ({results['concepts']['pillars'][0]['score']:.3f})")
print(f"   ✓ Top vibe: {results['concepts']['vibes'][0]['name']} ({results['concepts']['vibes'][0]['score']:.3f})")
print(f"   ✓ Top occasion: {results['concepts']['occasions'][0]['name']} ({results['concepts']['occasions'][0]['score']:.3f})")

print("\n✅ All tests passed!")
```

Run:
```bash
python test_workflow.py
```

---

## Expected Results Summary

| Test | Endpoint | Response Time | Success Criteria |
|------|----------|---------------|------------------|
| Text embedding | `/embed-text` | <20ms | Returns 768 floats |
| Image embedding | `/embed-image` | <500ms | Returns 768 floats |
| Concept embedding | `/embed-concepts` | <5s (first), <1ms (cached) | Returns all categories |
| Semantic search (text) | `/semantic-search` | <300ms | Returns products + concepts |
| Semantic search (image) | `/semantic-search` | <600ms | Returns products + concepts |
| Health check | `/health` | <10ms | Returns "healthy" |

---

## Common Issues

### "Model not loaded"
- Wait 30-60s after starting server for model to load
- Check console output for "Model loaded" message

### "Failed to fetch image"
- Check image URL is publicly accessible
- Try with a different image URL
- Increase timeout in code if needed

### "No embeddings loaded"
- Make sure `products.json` exists in the directory
- Check console output during startup

### Slow performance
- First request is slower (cold start)
- Image embedding includes download time
- Concept caching should speed up subsequent requests

---

## Next: Deploy to Hugging Face

Once all tests pass locally:

```bash
cd services/clip-search-hf

# Commit changes
git add .
git commit -m "Add unified embedding space endpoints"

# Push to Hugging Face Spaces
git push hf main
```

Check deployment at: https://briancassidy-style-clip-search.hf.space/health

---

## Questions?

See `UNIFIED-EMBEDDING-SPACE.md` for architecture details.
