# Lifestyle Image Import Tool

**5-phase workflow** for searching, selecting, tagging, and importing lifestyle images from stock photo APIs.

## Quick Start

```bash
npm run dev
# Navigate to: http://localhost:3002/admin/lifestyle-images/import
```

Or access via **Admin Nav → Products → Lifestyle Images**

## Workflow Overview

```
Coverage Analysis → Search → Select → AI Tag → Review & Import
```

### Phase 1: Coverage Analysis
- Shows current coverage by pillar × gender
- Highlights gaps (target: 20 images per gender per pillar)
- Color-coded heatmap (green = good, red = needs images)

### Phase 2: Search
- **Manual Search**: Enter custom queries
- **Auto-Search**: Automatically generates targeted queries for gaps
- Aggregates from **2 APIs**:
  - Pexels (200 req/hour)
  - Unsplash (50 req/hour)
- Sequential batching with 15s delays to respect rate limits

### Phase 3: Selection
- Interactive grid with keyboard shortcuts:
  - `K` - Keep/select current image
  - `D` - Skip/deselect current image
  - `Space` - Preview full image
  - `Arrow keys` - Navigate grid
  - `Cmd+A` - Select all
  - `?` - Show keyboard shortcuts
- Click to toggle selection
- Visual checkmarks on selected images
- Export JSON backup

### Phase 4: AI Tagging
- Uses existing **Recipe Scout** (Gemini Vision API)
- Streams results in real-time (NDJSON)
- Tags each image with:
  - Style pillar (9 options)
  - Gender (womenswear/menswear)
  - Vibes, occasions, formality
  - Brand adherence score (0-100)
  - Quality score
- Shows progress bar and activity log
- Error handling with retry option

### Phase 5: Review & Import
- Preview all tagged images with AI results
- Edit tags manually (modal editor)
- Remove low-quality images
- **One-click bulk import** to Supabase
- Attribution tracking (photographer credits)

## API Endpoints

### `POST /api/stock-search`
Aggregates stock photo results from multiple APIs.

**Request:**
```json
{
  "query": "romantic fashion woman portrait",
  "sources": ["pexels", "unsplash"],
  "perPage": 30
}
```

**Response:**
```json
{
  "results": [
    {
      "id": "pexels_12345",
      "source": "pexels",
      "url": "https://...",
      "thumbnail": "https://...",
      "photographer": "Jane Doe",
      "photographerUrl": "https://...",
      "avgColor": "#f0f0f0"
    }
  ],
  "metadata": {
    "pexelsCount": 30,
    "unsplashCount": 20,
    "totalCount": 50
  }
}
```

### `POST /api/lifestyle-scan-batch` (Reused)
Already exists! Tags images with AI vision analysis.

**Request:**
```json
{
  "images": [
    {
      "imageUrl": "https://...",
      "imageId": "pexels_12345",
      "source": "stock-pexels"
    }
  ],
  "batchSize": 10,
  "delayMs": 5000
}
```

**Response:** NDJSON stream
```ndjson
{"status":"processing","imageId":"pexels_12345"}
{"status":"complete","imageId":"pexels_12345","image":{...}}
{"status":"error","imageId":"pexels_67890","error":"..."}
```

### `POST /api/lifestyle-images/bulk-import`
Inserts tagged images to Supabase.

**Request:**
```json
{
  "images": [
    {
      "id": "pexels_12345",
      "url": "https://...",
      "source": "pexels",
      "photographer": "Jane Doe",
      "lifestyleData": {
        "outfitAnalysis": { ... },
        "brandAdherence": { ... }
      }
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "imported": 25
}
```

## Environment Variables

Required in `.env.local`:

```bash
# Pexels API
PEXELS_API_KEY=your_key_here

# Unsplash API
UNSPLASH_ACCESS_KEY=your_key_here

# Gemini (already configured)
GEMINI_API_KEY=your_key_here

# Supabase (already configured)
NEXT_PUBLIC_SUPABASE_URL=your_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_key
```

## Coverage Goals

**Target:** 360 total images
- 9 pillars × 40 images each (20 womenswear + 20 menswear)

**Current:** ~192 images (check Coverage Analysis)

## Attribution Requirements

**Pexels:**
```html
Photo by <a href="{photographer_url}">{photographer}</a> on
<a href="https://www.pexels.com">Pexels</a>
```

**Unsplash:**
```html
Photo by <a href="{photographer_url}?utm_source=style_engine">{photographer}</a> on
<a href="https://unsplash.com/?utm_source=style_engine">Unsplash</a>
```

Photographer data is stored in the `lifestyle_images` table for future display.

## Performance

**Old workflow (HTML tools):**
- ~4.5 hours for 50 images
- Manual DB imports
- Disconnected from admin

**New workflow:**
- ~37 minutes for 50 images
- Integrated into admin
- **86% faster**

## File Structure

```
app/
├── admin/lifestyle-images/import/
│   ├── page.tsx                    # Main container
│   └── README.md                   # This file
└── api/
    ├── stock-search/route.ts       # API aggregator
    └── lifestyle-images/
        └── bulk-import/route.ts    # Batch insert

components/admin/lifestyle-import/
├── Phase1Coverage.tsx              # Coverage heatmap
├── Phase2Search.tsx                # Search UI
├── Phase3Selection.tsx             # Grid + keyboard shortcuts
├── Phase4Tagging.tsx               # AI tagging progress
└── Phase5Review.tsx                # Review + import

lib/
├── coverage-calculator.ts          # Gap analysis
└── stock-image-types.ts            # Type definitions
```

## Troubleshooting

**"Rate limit exceeded"**
- Pexels: 200/hour limit hit
- Unsplash: 50/hour limit hit
- Solution: Wait 1 hour or reduce perPage value

**"Tagging failed"**
- Check Gemini API key in `.env.local`
- Verify image URLs are accessible
- Check browser console for errors

**"Import failed"**
- Check Supabase credentials
- Verify RLS policies allow inserts
- Check for duplicate image URLs

**"No search results"**
- Try different query terms
- Check API keys are valid
- Use Auto-Search for coverage-driven queries

## Next Steps

1. Run Coverage Analysis to see gaps
2. Use Auto-Search for 5 targeted queries
3. Select 20-50 images with keyboard shortcuts
4. Tag with AI (automatic)
5. Import to Supabase (one click)
6. Repeat until all pillars have 20+ images per gender

## Support

See main `CLAUDE.md` for project context and credentials.
