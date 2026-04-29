# CLIP API Deployment - Action Items

## What We Just Did

✅ Created lightweight products file (815MB, 48,990 products with embeddings)
✅ Updated CLIP service to use R2 image URLs
✅ Created deployment configs for Railway/Render
✅ Set up automatic download of products file on startup

## What YOU Need to Do Next

### Step 1: Upload Products File to R2 (5 minutes)

The file is here: `/Users/hqh4/claude/edit-engine/services/clip-search/products-lightweight.json`

**Upload to your R2 bucket and make it publicly accessible.**

Your R2 URL: `https://14cac9ed5c6670895b9bf1f751f09e36.r2.cloudflarestorage.com`

After upload, the file should be accessible at:
`https://14cac9ed5c6670895b9bf1f751f09e36.r2.cloudflarestorage.com/products-lightweight.json`

### Step 2: Push Code to GitHub (2 minutes)

```bash
cd /Users/hqh4/claude/edit-engine/customer-app
git commit -m "Add CLIP API service for deployment"
git push origin main
```

### Step 3: Deploy to Railway (10 minutes)

1. **Go to:** https://railway.app/new
2. **Click:** "Deploy from GitHub repo"
3. **Select:** `ImpaleAle22/nordstrom-style-profile`
4. **Set Root Directory:** `services/clip-search`
5. **Add Environment Variable:**
   - **Name:** `PRODUCTS_FILE_URL`
   - **Value:** `https://14cac9ed5c6670895b9bf1f751f09e36.r2.cloudflarestorage.com/products-lightweight.json`
6. **Click:** Deploy

**Wait 2-3 minutes** for first deployment (downloading products file + loading model).

### Step 4: Get Your CLIP API URL

After deployment completes, Railway will give you a URL like:
`https://clip-api-production-xxxx.up.railway.app`

**Test it:**
```bash
curl https://YOUR-RAILWAY-URL/health
```

Should return: `{"status": "healthy"}`

### Step 5: Update Vercel Environment Variables

1. Go to Vercel dashboard
2. Settings → Environment Variables
3. Add new variable:
   - **Name:** `CLIP_API_URL`
   - **Value:** `https://YOUR-RAILWAY-URL` (no trailing slash)
4. Redeploy your Vercel app

### Step 6: Test Admin Tools

Visit your deployed app:
`https://nordstrom-style-profile.vercel.app/admin`

Test:
- ✅ Recipe cooking (should fetch products from CLIP)
- ✅ Semantic search
- ✅ Product browsing

## Troubleshooting

### "Download failed" in Railway logs
- Check that products file is uploaded to R2
- Check that file is publicly accessible
- Verify URL in `PRODUCTS_FILE_URL` env var

### "Out of memory" in Railway
- Railway free tier may not have enough RAM
- Upgrade to Pro ($5/mo) or use Render Standard ($7/mo)

### CLIP API not responding from Vercel
- Check `CLIP_API_URL` env var in Vercel (no trailing slash)
- Make sure Railway service is running
- Test health endpoint directly

## Alternative: Deploy to Render

If Railway doesn't work, use Render:

1. Go to https://render.com/new
2. Select "Web Service"
3. Connect your GitHub repo
4. **Root Directory:** `services/clip-search`
5. **Environment:** Docker
6. **Environment Variables:**
   - `PRODUCTS_FILE_URL=https://14cac9ed5c6670895b9bf1f751f09e36.r2.cloudflarestorage.com/products-lightweight.json`
7. **Plan:** Standard ($7/mo) - Free tier may not have enough RAM
8. Deploy

## What This Enables

Once deployed, your admin tools will work on Vercel:

✅ **Recipe Cooking** - Generate outfits from recipes
✅ **Semantic Product Search** - "red cocktail dress", "hiking boots"
✅ **Outfit Tagging** - AI-powered attribute tagging
✅ **Product Management** - Browse and filter 49k products
✅ **Lifestyle Scanning** - Generate recipes from lifestyle images

**The key unlock:** CLIP lets you cook from all 49k products without needing full AI vision scans. Only heavily-used products get rewarded with deep scans.
