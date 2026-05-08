# CLAUDE.md - Nordstrom Style Intelligence

**Last Updated:** 2026-04-29
**Deadline:** May 8, 2026 (9 days remaining)
**Contest:** Claude Code Competition

---

## 🎯 PROJECT VISION

### What We're Building

**A self-guided demo/presentation** showcasing AI-powered personalized fashion discovery:

1. **Password-protected landing page** - Safe to share with leadership
2. **Interactive slide presentation** - Step-through demo with next/previous arrows
3. **Two exploration paths:**
   - **Style Profile** - Visual display of customer style intelligence
   - **Style Swipes** - Interactive Tinder-style discovery interface
4. **Admin tools** - Behind-the-scenes recipe cooking, tagging, product management

**Key Concept:** "Universal embedding space" - Products, outfits, customers, occasions, colors, style pillars, vibes, recipes, lifestyle images all embedded together

### Data Sources for Style Intelligence

- Style Quiz (structured preference gathering)
- Style Swipes (Tinder-like interactions)
- Request a Look form (structured + unstructured)
- AI Chat (conversational)
- Saved/edited outfits
- Implicit signals (clicks, dwell time, navigation)
- **"Style Memory"** - Large text field per customer for unstructured notes

---

## 🏗️ INFRASTRUCTURE

### Deployed Services

| Service | Platform | URL | Purpose |
|---------|----------|-----|---------|
| **Main App** | Vercel | https://nordstrom-style-profile.vercel.app | Customer-facing Next.js app |
| **CLIP API** | Hugging Face Spaces | https://briancassidy-style-clip-search.hf.space | Visual similarity search (49K products) |
| **Database** | Supabase | https://slsrksnenvagilmdwxka.supabase.co | All data storage |
| **Images** | Cloudflare R2 | https://14cac9ed5c6670895b9bf1f751f09e36.r2.cloudflarestorage.com | Product images (backup/CDN) |
| **Code** | GitHub | https://github.com/ImpaleAle22/nordstrom-style-profile | Version control |

### Local Directory Structure

```
/Users/hqh4/claude/style-engine/          # CLEAN SLATE - Fresh clone
├── app/                                   # Next.js 16 App Router
│   ├── page.tsx                          # Landing (personas vs interactive)
│   ├── personas/page.tsx                 # 9 demo personas
│   ├── profile/[customerId]/page.tsx     # Style profile display
│   ├── swipe/[customerId]/page.tsx       # Swipe UI (Tinder-style)
│   ├── interactive/page.tsx              # Interactive demo entry
│   └── admin/                            # Admin tools (recipe cooking, tagging)
├── lib/                                   # Utilities (59 files)
│   ├── supabase-client.ts                # Database connection
│   ├── attribute-tagger.ts               # AI outfit tagging
│   └── indexeddb-storage.ts              # Client-side caching
├── services/
│   ├── clip-search/                      # CLIP API (Python/Flask)
│   └── outfit-composer/                  # Outfit generation service
└── .env.local                            # ✅ Created with all credentials

/Users/hqh4/claude/edit-engine/           # OLD - Merge source (can delete after migration)
/Users/hqh4/claude/style-profile/         # OLD - Merge source (can delete after migration)
```

---

## 📊 DATA INVENTORY

### Products (Supabase)
- **Count:** ~49,000 products (not 1,885!)
- **Storage:** Supabase `products` table
- **Embeddings:** FashionSigLIP vectors for visual similarity
- **Images:** Cloudflare R2 with URL fallbacks
- **Attributes:** Colors, patterns, materials, product types, gender, price, brand

### Customer Data (Supabase)
- **Customer Profiles:** 9 demo personas with style intelligence
- **Lifestyle Images:** 192 tagged images (pillars, vibes, occasions)
- **Swipe Stacks:** 5 pre-built card decks
- **Swipe Sessions:** Real-time interaction tracking

### Outfit Data
- ❓ **Location unclear** - Need to verify if in Supabase or IndexedDB
- **Attributes:** Style pillars, vibes, occasions (AI-tagged)
- **Composition:** 4-6 items with roles (tops, bottoms, shoes, accessories)

---

## 🔑 ENVIRONMENT VARIABLES

**All credentials saved in `.env.local`** - DO NOT commit to git

### Critical Variables

```bash
# AI APIs (Paid Accounts)
GEMINI_API_KEY=<your-gemini-api-key>
ANTHROPIC_API_KEY=<your-anthropic-api-key>

# Supabase (Production Database)
NEXT_PUBLIC_SUPABASE_URL=<your-supabase-url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-supabase-anon-key>

# CLIP Search (✅ Deployed on Hugging Face Spaces - FREE!)
CLIP_API_URL=https://briancassidy-style-clip-search.hf.space
NEXT_PUBLIC_CLIP_API_URL=https://briancassidy-style-clip-search.hf.space

# Cloudflare R2 (Image Storage)
R2_BASE_URL=<your-r2-url>
```

**See `.env.local` for complete list** (Pexels, Unsplash, dev settings)

---

## 🚀 DEVELOPMENT WORKFLOW

### Running Locally

```bash
cd /Users/hqh4/claude/style-engine

# First time setup
npm install
# .env.local already created ✅

# Start dev server
npm run dev

# Open browser
open http://localhost:3002
```

### Key Routes

- `/` - Landing page (two paths: personas or interactive)
- `/personas` - Demo persona selection (9 customers)
- `/profile/[customerId]` - Style profile display
- `/swipe/[customerId]` - Style swipe interface
- `/interactive` - Interactive demo entry point
- `/admin` - Admin tools (recipe cooking, tagging)

### Testing Deployed App

```bash
# Test production deployment
open https://nordstrom-style-profile.vercel.app

# Check admin tools
open https://nordstrom-style-profile.vercel.app/admin
```

---

## ⚠️ CRITICAL RULES (From Past Mistakes)

### 1. Data Safety Protocol

**NEVER hold large datasets in memory without incremental saves**

- ❌ Loading 8GB JSON all at once
- ❌ Processing 25M records without checkpointing
- ✅ Incremental saves every 100K records
- ✅ Status file updating frequently
- ✅ Resume capability from checkpoints

### 2. Test Before Scale

**ALWAYS run small test first (100-1,000 records)**

```python
if args.sample:
    items = items[:1000]
    print("RUNNING IN SAMPLE MODE - 1K items only")
```

### 3. Progress Visibility

**Use tqdm for all loops >1000 iterations**

```python
from tqdm import tqdm
for item in tqdm(items, desc='Processing'):
    process(item)
```

### 4. Stream Large Files

**NEVER load multi-GB files entirely into memory**

```python
import ijson
with open('huge.json', 'rb') as f:
    for record in ijson.items(f, 'item'):
        process(record)
```

### 5. ALWAYS Save AI API Results

**NEVER run AI extraction without saving the FULL results**

- ❌ Running AI validation and only saving conflict summaries
- ❌ "Testing" AI extraction without saving outputs for later use
- ❌ Assuming you can "just re-run it" later
- ✅ Save COMPLETE AI responses to JSONL file immediately
- ✅ Include: input, output, metadata, timestamps
- ✅ If you need to re-use the data, load from saved file

**Real example of waste:**
- Ran AI extraction on 855 products (~$15-20)
- Only saved 22 conflict examples, not the full AI results
- Had to re-run the SAME extraction to actually use the data (~$15-20)
- Total waste: $30-40 because results weren't saved

**Correct pattern:**
```python
results_file = 'ai-extraction-results.jsonl'
with open(results_file, 'a') as f:
    for product in products:
        ai_result = call_ai_api(product)
        # Save IMMEDIATELY
        f.write(json.dumps({
            'product_id': product['id'],
            'input': product,
            'ai_output': ai_result,
            'timestamp': datetime.now().isoformat()
        }) + '\n')
        f.flush()  # Force write to disk
```

Then later, just load and use:
```python
with open('ai-extraction-results.jsonl', 'r') as f:
    for line in f:
        result = json.loads(line)
        # Use saved results, no need to call API again
        update_database(result)
```

**User has corrected these mistakes MULTIPLE TIMES**

---

## 🤖 AI MODELS & USAGE

### Gemini (Google) - Primary AI

**Use for bulk operations:**
- `gemini-2.5-flash-lite` - Vision scanning, outfit tagging
- Fast, cost-effective for 20K+ items
- Located in: `lib/attribute-tagger.ts`, old scripts

### Claude (Anthropic) - Secondary AI

**Use for quality/composition:**
- `claude-sonnet-4-6` - Outfit generation, high-quality work
- More expensive but better reasoning
- Located in: `services/outfit-composer/`

### Model Selection

- **Bulk (>1K items):** Gemini Flash Lite
- **Precision (<100 items):** Claude Sonnet or Gemini Pro
- **Production APIs:** Balance quality vs cost

---

## 🎨 TAGGING DIVERSITY FIXES (April 17, 2026)

**Problem:** Almost all outfits tagged identically ("Casual Dinner", "Date Night")

**Fixes Applied:**
1. ✅ Increased AI temperature 0.3 → 0.6 (more variety)
2. ✅ Removed top-3 limit for occasions
3. ✅ Lowered occasion threshold 0.5 → 0.4
4. ✅ Updated AI prompts for comprehensive tagging
5. ✅ Tightened formality ranges
6. ✅ Added color-based intelligence

**Status:** Ready to test on sample outfits

**See:** `TAGGING-DIVERSITY-FIXES-APPLIED.md` in old directories

---

## 📋 IMMEDIATE NEXT STEPS

### ✅ DONE
1. Fresh clone to `/Users/hqh4/claude/style-engine`
2. Created `.env.local` with all credentials
3. Created comprehensive `CLAUDE.md`
4. Documented infrastructure map
5. Verified Vercel deployment is live

### ✅ JUST COMPLETED (2026-04-30)
1. **Password Gate** - Simple password protection at root
   - Password: `nordstrom2026` or `demo`
   - Stores access in sessionStorage
   - Professional dark gradient design

2. **Interactive Presentation** - 9-slide journey
   - Intro → Challenge → Vision → Foundation
   - CLIP Search Demo (interactive with mock data)
   - Outfit Tagger Demo (interactive item selection)
   - Style Intelligence → Possibilities → CTA
   - Skip button throughout
   - Previous/Next navigation

3. **Interactive Demo Flow** - Complete user journey
   - Name entry page
   - Cold start profile (no data state)
   - Active profile (shows stats after swipes)
   - Real-time updates from localStorage
   - Integrates with existing swipe UI

4. **Demo User System** - localStorage-based profiles
   - Demo users (prefix `demo_`) bypass Supabase
   - Swipe data saves to localStorage
   - Profile auto-updates after swipe sessions
   - Calculates style pillars from liked cards
   - Confidence score increases with activity

5. **Choose Path Page** - Fork to personas or interactive

### 🔄 IN PROGRESS
1. **Testing Full Demo Flow** - Need to walk through end-to-end
   - Password → Presentation → Interactive → Swipes → Profile
   - Verify profile updates correctly
   - Check all navigation links

2. ✅ **CLIP API Deployment** - COMPLETE
   - Deployed to Hugging Face Spaces (FREE)
   - URL: https://briancassidy-style-clip-search.hf.space
   - Ready for outfit cooking and semantic search

### ⏭️ TODO (Priority Order)
1. **Test & Polish Demo** - Complete user testing
2. **Fix TypeScript errors** - After demo is working
3. **Mobile responsiveness** - Test on phones/tablets
4. **Deploy to Vercel** - Push demo to production
5. **Delete old directories** - Clean up after confirmed working

---

## 🐛 KNOWN ISSUES

### CLIP API Deployment ✅ RESOLVED
- **Solution:** Moved from Railway to Hugging Face Spaces
- **Status:** ✅ Deployed and working at https://briancassidy-style-clip-search.hf.space
- **Cost:** FREE (public space)
- **Performance:** ~100-200ms search latency, handles concurrent requests
- **Note:** Uses deduplicated product dataset (40K+ products)

### TypeScript Errors
- **Count:** 100s of errors
- **Source:** Monorepo merge issues
- **Strategy:** Fix architecture, then errors
- **Temporary:** Vercel checks disabled

### Data Architecture Confusion
- Multiple storage systems (Supabase, IndexedDB, local files)
- Need clear map of "what lives where"
- Interaction data should live with CUSTOMER records, not products

---

## 📚 KEY DOCUMENTATION

**In this directory:**
- `STATE-OF-THE-UNION.md` - Complete infrastructure audit
- `CLAUDE.md` - This file (project instructions)
- `DEPLOYMENT.md` - Vercel deployment guide
- `CLIP-DEPLOYMENT-STEPS.md` - Railway CLIP deployment
- `README.md` - App overview

**In old directories (reference only):**
- `/Users/hqh4/claude/edit-engine/CLAUDE.md` - Original project instructions
- `/Users/hqh4/claude/edit-engine/SESSION-PROGRESS-2026-04-28.md` - Recent session notes
- Memory files in `.claude/projects/.../memory/` - Auto-memory system

---

## 🎯 CONTEST SUBMISSION CHECKLIST

**Deadline: May 8, 2026**

### Must-Have
- [ ] Password-protected landing page
- [ ] Interactive slide presentation
- [ ] Style Profile page (✅ exists)
- [ ] Style Swipes page (✅ exists)
- [ ] Working demo flow
- [ ] Clean architecture
- [ ] No critical errors
- [ ] Live deployment on Vercel (✅ done)

### Nice-to-Have
- [ ] CLIP search working
- [ ] Admin tools accessible
- [ ] All TypeScript errors fixed
- [ ] Performance optimized
- [ ] Mobile responsive

### Submission Requirements
- ✅ Public GitHub repository
- ✅ Live demo URL: https://nordstrom-style-profile.vercel.app
- [ ] Working demo (need to test full flow)
- [ ] Documentation (in progress)

---

## 🔒 CREDENTIALS REFERENCE

**DO NOT SHARE PUBLICLY - ALL IN `.env.local`**

| Service | Key/URL | Purpose |
|---------|---------|---------|
| Gemini | AIzaSy...IDY | AI vision/tagging |
| Anthropic | sk-ant-api03-... | AI composition |
| Supabase URL | https://slsrks...co | Database |
| Supabase Anon | sb_publishable_... | DB access |
| Cloudflare R2 | https://14cac9... | Image storage |
| Pexels | kuHbk8... | Lifestyle images |
| Unsplash | m-GHjS... | Lifestyle images |

---

## 💡 DEVELOPMENT TIPS

### Next.js 16 Breaking Changes
- File structure may differ from training data
- Check `node_modules/next/dist/docs/` for guides
- Heed deprecation notices

### Image Handling
- Use axios with SSL bypass for development
- Optimize image URLs before fetching (800px width)
- Set `NODE_TLS_REJECT_UNAUTHORIZED=0` (dev only!)

### Database Queries
- Use Supabase client from `lib/supabase-client.ts`
- Check RLS policies if queries fail
- Test with anon key for public access

### Debugging
- Check browser console for client errors
- Check `npm run dev` terminal for server errors
- Test API routes with curl or Postman

---

**Last Updated:** 2026-04-29
**Next Review:** After Railway CLIP deployment or architecture cleanup

**Questions?** Check `STATE-OF-THE-UNION.md` for current status.
