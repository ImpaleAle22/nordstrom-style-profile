# Nordstrom Style Profile - Customer App

Customer-facing Next.js application for personalized style intelligence.

## Running the App

```bash
npm install
npm run dev
```

App runs on: **http://localhost:3002** (port 3000 is used by website)

## Features

✅ **Style Profile Dashboard** - View personalized style breakdown
✅ **Style Swipes** - Tinder-style card interface  
✅ **Customer Selection** - 9 demo personas
✅ **Supabase Integration** - Real-time data

## Routes

- `/` - Customer selection
- `/profile/[customerId]` - Style profile page
- `/swipe/[customerId]` - Style swipes interface

## Data in Supabase

- **192 lifestyle images** (tagged with pillars, vibes, occasions)
- **9 customer profiles** (with style intelligence)
- **5 swipe stacks** (pre-built card decks)
- **Swipe sessions** (saved automatically)

## Swipe Controls

- **Mouse:** Drag cards left/right
- **Touch:** Swipe gestures on mobile
- **Keyboard:** Arrow keys (← no, → yes)

## Environment Variables

Create a `.env.local` file with:

```bash
# Supabase (Required)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# AI APIs (Optional - for future features)
GEMINI_API_KEY=your_gemini_api_key
NEXT_PUBLIC_GEMINI_API_KEY=your_gemini_api_key
```

## Vercel Deployment

### One-Click Deploy

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/yourusername/customer-app)

### Manual Deployment

1. **Push to GitHub:**
   ```bash
   git add .
   git commit -m "Deploy to Vercel"
   git push origin main
   ```

2. **Import to Vercel:**
   - Go to [vercel.com/new](https://vercel.com/new)
   - Import your GitHub repository
   - Framework: Next.js (auto-detected)
   - Root Directory: `./` (or leave default)

3. **Configure Environment Variables:**
   In Vercel dashboard → Settings → Environment Variables, add:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `GEMINI_API_KEY` (optional)
   - `NEXT_PUBLIC_GEMINI_API_KEY` (optional)

4. **Deploy:**
   - Click "Deploy"
   - Wait ~2 minutes for build
   - Visit your live URL

### Vercel CLI Deployment

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Deploy to production
vercel --prod
```

## Build Verification

Test the production build locally:

```bash
npm run build
npm run start
```

Visit http://localhost:3000 to verify all pages work correctly.
