# Vercel Deployment Guide

Complete guide for deploying the Nordstrom Style Profile customer app to Vercel.

## Prerequisites

- GitHub account
- Vercel account (free tier works)
- Supabase project with data imported

## Quick Deploy (5 minutes)

### Step 1: Push to GitHub

```bash
cd /Users/hqh4/claude/edit-engine/customer-app

# Initialize git if needed
git init
git add .
git commit -m "Initial commit - Nordstrom Style Profile"

# Create GitHub repo and push
# Option A: Using GitHub CLI
gh repo create nordstrom-style-profile --public --source=. --remote=origin --push

# Option B: Manually
# 1. Create repo on GitHub: https://github.com/new
# 2. Add remote and push:
git remote add origin https://github.com/YOUR_USERNAME/nordstrom-style-profile.git
git branch -M main
git push -u origin main
```

### Step 2: Import to Vercel

1. Go to [vercel.com/new](https://vercel.com/new)
2. Click "Import Git Repository"
3. Select your GitHub repository
4. Configure project:
   - **Framework Preset:** Next.js (auto-detected)
   - **Root Directory:** `./` (leave default)
   - **Build Command:** `npm run build` (default)
   - **Output Directory:** `.next` (default)

### Step 3: Configure Environment Variables

In Vercel dashboard → Settings → Environment Variables, add:

**Required:**
```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

**Optional (for future features):**
```bash
GEMINI_API_KEY=your_gemini_api_key
NEXT_PUBLIC_GEMINI_API_KEY=your_gemini_api_key
ANTHROPIC_API_KEY=your_anthropic_api_key
```

**Note:** Do NOT add `NODE_TLS_REJECT_UNAUTHORIZED=0` to production (development only).

### Step 4: Deploy

1. Click "Deploy"
2. Wait ~2 minutes for build to complete
3. Visit your live URL (e.g., `nordstrom-style-profile.vercel.app`)

## Vercel CLI Deployment

Alternative deployment method using the CLI:

```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Deploy to preview
vercel

# Deploy to production
vercel --prod
```

## Testing Production Build Locally

Before deploying, test the production build locally:

```bash
# Build for production
npm run build

# Start production server
npm run start

# Visit http://localhost:3000
```

**Check these pages work:**
- Home: http://localhost:3000
- Profile: http://localhost:3000/profile/cold_start
- Swipe: http://localhost:3000/swipe/cold_start

## Post-Deployment Verification

After deploying, verify:

1. **Home page loads** - Should show 9 customer profiles
2. **Profile page works** - Shows style pillars and confidence
3. **Swipe UI works** - Cards load and swipe interactions function
4. **Session tracking** - Check Supabase `swipe_sessions` table for new entries

## Troubleshooting

### Issue: "No customer profiles found"

**Cause:** RLS policies blocking anonymous access

**Fix:** Run this SQL in Supabase SQL Editor:

```sql
CREATE POLICY "Anyone can view customer profiles (demo)"
  ON customer_profiles FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Anyone can view active swipe stacks"
  ON swipe_stacks FOR SELECT
  TO anon, authenticated
  USING (status = 'active');

CREATE POLICY "Anyone can create swipe sessions (demo)"
  ON swipe_sessions FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Anyone can view swipe sessions (demo)"
  ON swipe_sessions FOR SELECT
  TO anon
  USING (true);
```

### Issue: Build fails with TypeScript errors

**Fix:** Check that all dependencies are installed:
```bash
npm install
npm run build
```

### Issue: Images not loading

**Cause:** Supabase image URLs not accessible or CORS issue

**Fix:** Check Supabase storage settings allow public access

### Issue: Environment variables not working

**Cause:** Missing `NEXT_PUBLIC_` prefix for client-side variables

**Fix:** All client-side environment variables MUST start with `NEXT_PUBLIC_`

## Custom Domain (Optional)

To add a custom domain:

1. Go to Vercel dashboard → Settings → Domains
2. Add your domain (e.g., `style.nordstrom.com`)
3. Configure DNS records as shown by Vercel
4. Wait for DNS propagation (~10 minutes)

## Continuous Deployment

Vercel automatically deploys on every push to `main`:

```bash
# Make changes
git add .
git commit -m "Update feature"
git push origin main

# Vercel automatically builds and deploys
```

## Preview Deployments

Every branch/PR gets a preview URL:

```bash
# Create feature branch
git checkout -b feature/new-ui
git push origin feature/new-ui

# Vercel creates preview URL: nordstrom-style-profile-git-feature-new-ui.vercel.app
```

## Production Checklist

Before going live:

- [ ] All environment variables set in Vercel
- [ ] RLS policies configured in Supabase
- [ ] Production build tested locally
- [ ] All pages load correctly on preview URL
- [ ] Swipe sessions save to database
- [ ] Mobile responsive design verified
- [ ] Analytics/monitoring set up (optional)

## Support

For issues:
- Vercel Docs: https://vercel.com/docs
- Next.js Docs: https://nextjs.org/docs
- Supabase Docs: https://supabase.com/docs

## Contest Submission

For Claude Code contest (May 1st deadline):

1. Deploy to Vercel (live demo required)
2. Public GitHub repository
3. Working demo with all features:
   - Customer selection
   - Style profile view
   - Interactive swipe UI
   - Session tracking

**Live Demo URL:** `https://YOUR-APP.vercel.app`
