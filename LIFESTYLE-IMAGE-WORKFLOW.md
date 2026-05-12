# Lifestyle Image Workflow Guide

**How to add new lifestyle images to the system**

---

## Current Status

**Images in Database:** 182 (check admin page for current count)
**Coverage:** All 9 canonical pillars have some images
**Location:** Supabase `lifestyle_images` table

---

## 3 Ways to Add New Images

### Option 1: Bulk Import via Pexels/Unsplash (Recommended)

**Best for:** Getting 50-100+ images quickly with AI tagging

**Steps:**

1. **Use the bulk import API endpoint:**
```bash
# This endpoint fetches from Pexels/Unsplash and auto-tags with AI
curl -X POST https://nordstrom-style-profile.vercel.app/api/lifestyle-images/bulk-import \
  -H "Content-Type: application/json" \
  -d '{
    "source": "pexels",
    "count": 50,
    "pillars": ["romantic", "classic", "minimal"]
  }'
```

2. **Or use the admin validation tool:**
   - Go to `/admin/lifestyle-images/validate`
   - This tool helps QA the AI tagging before importing

**Pros:**
- Fast (50 images in ~5 minutes)
- Free stock photos
- AI auto-tags pillars, gender, vibes, occasions
- High quality images

**Cons:**
- Generic stock photo aesthetic
- May not match Nordstrom brand exactly

---

### Option 2: Import Pre-Tagged JSON File

**Best for:** Importing curated images that were tagged elsewhere

**Steps:**

1. **Prepare JSON file** in this format:
```json
{
  "images": [
    {
      "id": "custom_001",
      "url": "https://example.com/image.jpg",
      "source": "custom",
      "lifestyleData": {
        "outfitAnalysis": {
          "stylePillar": "romantic",
          "gender": "womenswear",
          "subTerm": "Feminine",
          "vibes": ["soft", "dreamy", "elegant"],
          "occasions": ["date_night", "garden_party"],
          "formalityLevel": 3,
          "season": ["spring", "summer"],
          "isCompleteOutfit": true,
          "visibleItemCount": 4,
          "reasoning": "Flowing dress with floral details"
        },
        "brandAdherence": {
          "score": 0.85
        }
      }
    }
  ]
}
```

2. **Import via Admin UI:**
   - Go to http://localhost:3002/admin/lifestyle-images
   - Click "Import JSON" button
   - Select your JSON file
   - Wait for import to complete
   - Click "Refresh" to see new images

**Pros:**
- Full control over tagging
- Can use your own images
- No AI needed

**Cons:**
- Manual work to create JSON
- Need to host images somewhere

---

### Option 3: Manual Entry via API

**Best for:** Adding individual images one at a time

**Steps:**

1. **POST to the API:**
```bash
curl -X POST https://nordstrom-style-profile.vercel.app/api/lifestyle-images \
  -H "Content-Type: application/json" \
  -d '{
    "image_url": "https://example.com/image.jpg",
    "gender": "womenswear",
    "style_pillar": "classic",
    "sub_term": "Timeless",
    "vibes": ["elegant", "sophisticated"],
    "occasions": ["work", "professional"],
    "status": "active"
  }'
```

2. **Or insert directly in Supabase:**
   - Go to Supabase dashboard
   - Navigate to `lifestyle_images` table
   - Click "Insert row"
   - Fill in the fields

**Pros:**
- Quick for 1-2 images
- No file preparation needed

**Cons:**
- Slow for bulk
- Manual tagging required

---

## Image Requirements

### Technical Requirements
- **Format:** JPG or PNG
- **Size:** Minimum 800px width
- **Aspect Ratio:** 3:4 portrait preferred (for outfit images)
- **URL:** Publicly accessible HTTPS URL

### Content Requirements
- **Subject:** Complete outfits or styled looks
- **People:** Ideally visible but not required
- **Background:** Clean, not distracting
- **Quality:** Professional photography
- **Brand Fit:** Should feel "Nordstrom" - elevated, aspirational

### Tagging Requirements
- **Pillar:** One of 9 canonical pillars (classic, minimal, romantic, bohemian, maximal, casual, streetwear, athletic, utility)
- **Gender:** womenswear or menswear
- **Sub-term:** Optional refinement (e.g., "Feminine", "Modern Minimal")
- **Vibes:** 2-4 descriptive words (e.g., "soft", "edgy", "polished")
- **Occasions:** 1-3 use cases (e.g., "date_night", "work", "weekend")

---

## Recommended Workflow for Coverage Gaps

**Goal:** Get 20-30 images per pillar, balanced across gender

### Step 1: Check Coverage
```bash
# Open admin page
open http://localhost:3002/admin/lifestyle-images

# Click "Coverage Report" button
# Identify pillars with low counts
```

### Step 2: Prioritize Gaps
Example current gaps (update based on your report):
- Streetwear: Need more images
- Maximal: Need menswear images
- Athletic: Good coverage

### Step 3: Bulk Import for Gaps
```bash
# Example: Import 20 streetwear images
curl -X POST http://localhost:3002/api/lifestyle-images/bulk-import \
  -H "Content-Type: application/json" \
  -d '{
    "source": "pexels",
    "count": 20,
    "query": "urban street style fashion",
    "targetPillar": "streetwear",
    "targetGender": "womenswear"
  }'
```

### Step 4: QA New Images
1. Go to admin page
2. Filter by the pillar you just imported
3. Review each image:
   - Is the pillar correct?
   - Is the gender correct?
   - Is the sub-term accurate?
4. Click "Edit Tags" to fix any mistakes
5. Click "Delete" (×) to remove bad images

### Step 5: Export Backup
```bash
# Click "Export JSON" button
# Save file as: lifestyle-images-backup-2026-05-11.json
# Store in safe location (Dropbox, Google Drive, etc.)
```

---

## Image Sources

### Free Stock Photos
1. **Pexels** (https://pexels.com)
   - Best for: Fashion, lifestyle, people
   - API: Built into bulk-import endpoint
   - Quality: High

2. **Unsplash** (https://unsplash.com)
   - Best for: Artistic, editorial style
   - API: Built into bulk-import endpoint
   - Quality: Very high

### Premium Options (Future)
1. **Getty Images**
   - Best for: Editorial, runway, brand campaigns
   - Cost: $$$
   - Quality: Professional

2. **Shutterstock**
   - Best for: Variety, studio shots
   - Cost: $$
   - Quality: Commercial

3. **Custom Photoshoots**
   - Best for: Perfect brand match
   - Cost: $$$$
   - Quality: Bespoke

---

## Troubleshooting

### Import Returns 0 Images
**Problem:** JSON file format incorrect
**Solution:** Check JSON matches exact format above

### Images Don't Show in Profile View
**Problem:** Status not set to 'active' or 'live'
**Solution:** Use admin page to edit status field

### Wrong Pillar/Gender
**Problem:** AI tagging made a mistake
**Solution:** Use "Edit Tags" button in admin UI

### Delete Doesn't Work
**Problem:** RLS permissions or ID mismatch
**Solution:** Check browser console for detailed error logs

### Images Load Slowly
**Problem:** Large image file sizes
**Solution:** Use image URLs with query params for resizing
Example: `?w=800&h=1200&fit=crop`

---

## Quality Standards

### ✅ Good Images
- Complete outfit visible
- Professional photography
- Clear pillar aesthetic
- Aspirational but accessible
- Diverse representation
- Clean background

### ❌ Bad Images
- Only shows part of outfit
- Poor lighting or focus
- Cluttered background
- Too editorial/runway (unless maximal pillar)
- Overly casual (unless casual pillar)
- Low resolution

---

## Database Schema Reference

```sql
CREATE TABLE lifestyle_images (
  id TEXT PRIMARY KEY,
  image_url TEXT NOT NULL,
  source TEXT,
  gender TEXT,
  style_pillar TEXT,
  sub_term TEXT,
  spectrum_coordinate NUMERIC,
  pillar_confidence NUMERIC,
  vibes TEXT[],
  occasions TEXT[],
  formality_level INTEGER,
  season TEXT[],
  is_complete_outfit BOOLEAN,
  visible_item_count INTEGER,
  brand_adherence_score NUMERIC,
  is_art_directed BOOLEAN,
  image_tone TEXT,
  reasoning TEXT,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

---

## Next Steps

### Immediate (Do Now)
1. [ ] Run Coverage Report
2. [ ] Identify biggest gaps
3. [ ] Import 20-30 images for each gap pillar
4. [ ] QA and fix tags
5. [ ] Export backup

### Short Term (This Week)
1. [ ] Get to 250+ total images (from 182)
2. [ ] Balance gender (aim for 50/50 split per pillar)
3. [ ] Add sub-terms to existing images
4. [ ] Test profile view with new images

### Long Term (Next Month)
1. [ ] Replace generic stock photos with curated images
2. [ ] Add seasonal collections
3. [ ] Create lookbooks per pillar
4. [ ] Set up automated weekly imports

---

## Quick Reference Commands

```bash
# View coverage
open http://localhost:3002/admin/lifestyle-images
# Click "Coverage Report"

# Import 50 mixed images
curl -X POST http://localhost:3002/api/lifestyle-images/bulk-import \
  -H "Content-Type: application/json" \
  -d '{"source": "pexels", "count": 50}'

# Export all images
# Click "Export JSON" in admin UI

# Check total count
curl -s http://localhost:3002/api/lifestyle-images | jq '.results | length'

# View specific pillar
# Admin UI → Filter by pillar

# Delete image
# Admin UI → Click × button on image card
```

---

**Questions?** Check the admin UI at `/admin/lifestyle-images` or review the API at `/api/lifestyle-images`
