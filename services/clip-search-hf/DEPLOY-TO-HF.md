# Deploy CLIP Search to Hugging Face Spaces

> ⚠️ **Note:** This space is named `style-clip-search` (not "nordstrom") because it's public.
> The GitHub repo `nordstrom-style-profile` should also be renamed to something generic for public use.

## Why Hugging Face Spaces?

- ✅ **FREE** hosting (vs Railway $5-20/month)
- ✅ Built for ML models
- ✅ Persistent storage
- ✅ Good performance
- ✅ Easy deployment with Git

## Step 1: Export Clean Products from Supabase (15 minutes)

The current CLIP dataset has beauty products and junk. Export fresh data from Supabase:

```bash
cd /Users/hqh4/claude/style-engine/scripts

# Run export script
node export-clip-products-from-supabase.js
```

This creates `products-clip-supabase.json` with ~49K clean, outfit-eligible products.

## Step 2: Create Hugging Face Space (5 minutes)

1. **Go to:** https://huggingface.co/new-space
2. **Space name:** `style-clip-search` ✅ (no company names in public repos!)
3. **License:** MIT
4. **Space SDK:** Docker
5. **Visibility:** Public (required for free hosting)
6. **Click:** Create Space

## Step 3: Clone and Setup (5 minutes)

```bash
# Clone your new Space
git clone https://huggingface.co/spaces/YOUR-USERNAME/style-clip-search
cd style-clip-search

# Copy files from this directory
cp /Users/hqh4/claude/style-engine/services/clip-search-hf/* .

# You should have:
# - README.md (with HF config)
# - Dockerfile
# - app.py
# - requirements.txt
```

## Step 4: Upload Products File (10 minutes)

Hugging Face Spaces has two options for large files:

### Option A: Git LFS (Recommended)

```bash
# Install Git LFS if needed
brew install git-lfs
git lfs install

# Track large files
git lfs track "*.json"
git add .gitattributes

# Copy and commit products file
cp /Users/hqh4/claude/style-engine/scripts/products-clip-supabase.json products.json
git add products.json
git commit -m "Add clean products from Supabase"
git push
```

### Option B: External URL (If file too large)

Upload `products-clip-supabase.json` to:
- Your R2 bucket: `https://14cac9ed5c6670895b9bf1f751f09e36.r2.cloudflarestorage.com/products-clip-supabase.json`
- Or GitHub releases

Then set environment variable in HF Space settings:
```
PRODUCTS_URL=https://YOUR-R2-URL/products-clip-supabase.json
```

## Step 5: Deploy (Auto)

```bash
# Add and commit all files
git add README.md Dockerfile app.py requirements.txt
git commit -m "Initial CLIP search API deployment"
git push
```

Hugging Face will automatically:
1. Build Docker image
2. Download products file
3. Load FashionSigLIP model
4. Start API server on port 7860

**Build time:** ~5-10 minutes

## Step 6: Test Your Space

Once deployment completes, your API will be at:
```
https://YOUR-USERNAME-style-clip-search.hf.space
```

Test it:

```bash
# Health check
curl https://YOUR-USERNAME-style-clip-search.hf.space/health

# Search
curl -X POST https://YOUR-USERNAME-style-clip-search.hf.space/search \
  -H "Content-Type: application/json" \
  -d '{"query": "cute goth girl dress", "limit": 6}'
```

## Step 7: Update Next.js App

Update `.env.local`:

```bash
# Old Railway URL
# CLIP_API_URL=https://nordstrom-style-profile-production.up.railway.app

# New Hugging Face Spaces URL
CLIP_API_URL=https://YOUR-USERNAME-style-clip-search.hf.space
NEXT_PUBLIC_CLIP_API_URL=https://YOUR-USERNAME-style-clip-search.hf.space
```

Also update in **Vercel environment variables**:
1. Go to Vercel dashboard → Settings → Environment Variables
2. Update `CLIP_API_URL` and `NEXT_PUBLIC_CLIP_API_URL`
3. Redeploy

## Step 8: Shut Down Railway (Optional)

Once HF Spaces is working:

```bash
# Go to Railway dashboard
# https://railway.app/dashboard

# Find your CLIP service
# Click Settings → Delete Service
```

This stops the charges!

## Troubleshooting

### "Out of memory" during build
- HF Free tier has 16GB RAM (should be enough)
- If it fails, upgrade to Pro ($9/month, still cheaper than Railway)

### Products file too large for Git LFS
- Use Option B (external URL)
- Or compress the JSON file first

### Model download fails
- HF Spaces has good internet connection, should work
- Check logs in Space settings

### API not responding
- Check Space logs for errors
- Verify port 7860 is used
- Make sure Dockerfile EXPOSE matches

## Cost Comparison

| Service | Monthly Cost | RAM | Storage | Notes |
|---------|-------------|-----|---------|-------|
| Railway | $5-20 | 8GB | 5GB | Was charging unexpectedly |
| HF Free | **$0** | 16GB | 50GB | Public spaces only |
| HF Pro | $9 | 32GB | 100GB | Private spaces, more resources |

## Performance Notes

- **Cold starts:** ~30-60 seconds (HF keeps popular spaces warm)
- **Search speed:** ~100-200ms per query
- **Concurrent requests:** Handles multiple users
- **Uptime:** Very reliable

## Next Steps

After deployment:
1. ✅ Test CLIP search in presentation demo
2. ✅ Verify no beauty products in results
3. ✅ Update documentation with new URL
4. ✅ Shut down Railway to stop charges

## Support

- HF Spaces docs: https://huggingface.co/docs/hub/spaces
- Discord: https://discord.gg/huggingface
- Forum: https://discuss.huggingface.co/
