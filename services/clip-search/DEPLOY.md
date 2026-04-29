# CLIP API Deployment Guide

FashionSigLIP semantic search service for outfit cooking.

## Quick Deploy to Railway

### 1. Upload Products File to R2

The `products-lightweight.json` file (815MB) is too large for GitHub.
Upload it to your Cloudflare R2 bucket:

```bash
# From services/clip-search directory
# Use Cloudflare dashboard or CLI to upload products-lightweight.json
# Make it publicly accessible
# You'll get a URL like: https://14cac9ed5c6670895b9bf1f751f09e36.r2.cloudflarestorage.com/products-lightweight.json
```

**Or use Cloudflare CLI:**
```bash
# Install Wrangler
npm install -g wrangler

# Upload file
wrangler r2 object put nordstrom-products/products-lightweight.json --file products-lightweight.json
```

### 2. Push to GitHub

```bash
cd /Users/hqh4/claude/edit-engine
git add services/clip-search/
git commit -m "Add CLIP service deployment config"
git push origin main
```

### 3. Deploy on Railway

1. Go to https://railway.app/new
2. Click "Deploy from GitHub repo"
3. Select: `ImpaleAle22/nordstrom-style-profile`
4. **Important:** Set root directory to `services/clip-search`
5. Railway will auto-detect Dockerfile
6. **Before deploying:** Add environment variable:
   - Key: `PRODUCTS_FILE_URL`
   - Value: `https://14cac9ed5c6670895b9bf1f751f09e36.r2.cloudflarestorage.com/products-lightweight.json`
7. Click "Deploy"

**Note:** First startup takes ~2-3 minutes:
- Downloads 815MB products file from R2
- Loads FashionSigLIP model
- Processes embeddings

Subsequent restarts are faster (file is cached).

### 4. Get Your CLIP API URL

After deployment completes:
- Railway will give you a URL like: `https://clip-api-production-xxxx.up.railway.app`
- Copy this URL

### 5. Update Vercel Environment Variables

Go to Vercel dashboard → Settings → Environment Variables:

Add:
```
CLIP_API_URL=https://your-railway-url.up.railway.app
```

Redeploy Vercel app.

## Alternative: Deploy to Render

1. Go to https://render.com/new
2. Select "Web Service"
3. Connect GitHub repo
4. **Root Directory:** `services/clip-search`
5. **Environment:** Docker
6. **Plan:** Free (should work, 815MB image fits in 512MB RAM after loading)
7. Deploy

## Local Testing

```bash
cd /Users/hqh4/claude/edit-engine/services/clip-search
python app.py
```

Visit: http://localhost:5002/health

## What's Included

- **48,990 products** with FashionSigLIP embeddings
- **815MB** lightweight products file (vs 1.2GB original)
- **Cloudflare R2 image URLs** - all images hosted
- **Flask API** with CORS enabled
- **Health check** endpoint

## API Endpoints

- `GET /health` - Health check
- `GET /search?q=<query>&limit=<num>` - Semantic search
- `POST /search` - Advanced search with filters

## Memory Requirements

- **RAM:** ~2GB (model + embeddings)
- **Disk:** ~1GB (Docker image + products file)
- **Startup time:** ~30 seconds (loading embeddings)

## Troubleshooting

### Out of Memory
- Use Render Standard ($7/mo) or Railway Pro
- Or reduce products file size further

### Slow Startup
- Normal! Loading 49k embeddings takes ~30s
- Railway/Render will keep service warm

### 502 Errors
- Wait 30-60s after deployment (service is loading)
- Check logs for errors
