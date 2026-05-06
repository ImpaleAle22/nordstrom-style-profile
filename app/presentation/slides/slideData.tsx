/**
 * Slide Data - Presentation Content
 * Based on PRESENTATION-TEXT-v2.md
 */

import ClipSearchDemo from './ClipSearchDemo';
import OutfitTaggerDemo from './OutfitTaggerDemo';

export interface Slide {
  id: string;
  title: string;
  subtitle?: string;
  content: React.ReactNode;
  layout?: 'title' | 'content' | 'demo' | 'split';
}

export const slides: Slide[] = [
  // SLIDE 1: Title with Video Background
  {
    id: 'title',
    title: 'Style Engine',
    subtitle: '',
    layout: 'title',
    content: (
      <>
        {/* Video Background - Behind everything */}
        <video
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 w-full h-full object-cover"
          style={{ zIndex: 0 }}
          onLoadedMetadata={(e) => {
            e.currentTarget.playbackRate = 0.5; // 50% speed - adjust as needed
          }}
        >
          <source src="/presentation-video.mp4" type="video/mp4" />
        </video>

        {/* Dark overlay for readability */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'linear-gradient(to top, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0.3) 50%, rgba(0,0,0,0.1) 100%)',
            zIndex: 1
          }}
        />

        {/* Bottom tagline - Above video and overlay */}
        <div className="absolute bottom-0 inset-x-0 pb-20 flex justify-center" style={{ zIndex: 20 }}>
          <p className="text-lg tracking-wider" style={{ color: '#FFFFFF' }}>
            Built with Claude Code · Nordstrom Experience Design · 2026
          </p>
        </div>
      </>
    ),
  },

  // SLIDE 2: It started with the Playlist
  {
    id: 'playlist',
    title: 'It started with the Playlist',
    layout: 'content',
    content: (
      <div className="grid grid-cols-2 gap-12 h-full">
        {/* Left Column - Text */}
        <div className="space-y-6 flex flex-col justify-center pl-10">
          <p className="text-xl text-gray-700 leading-relaxed">
            The Playlist concept that Clair has been championing and the Personalized Edit concept I had explored share a lot of DNA.
          </p>
          <p className="text-xl text-gray-700 leading-relaxed">
            Could I build something like that for the Claude Code contest?
          </p>
          <div className="space-y-3 text-lg text-gray-600 pl-6 border-l-4 border-gray-300">
            <p>Step one: build the component.</p>
            <p>Step two: populate it with some dummy data.</p>
          </div>
          <p className="text-2xl font-semibold text-gray-900 pt-6">
            Step two turned out to be the whole project.
          </p>
        </div>

        {/* Right Column - Screenshot Collage */}
        <div className="flex items-center justify-center">
          <div
            className="rounded-lg overflow-hidden"
            style={{
              backgroundColor: '#EDECEB',
              aspectRatio: '1/1',
              width: '100%',
              maxWidth: '400px'
            }}
          >
            {/* Placeholder for concept collage image */}
            <div className="w-full h-full flex items-center justify-center text-gray-400 text-center px-4">
              Concept Screenshots<br/>Collage
            </div>
          </div>
        </div>
      </div>
    ),
  },

  // SLIDE 3: How much data does a Playlist actually need?
  {
    id: 'data-needs',
    title: 'How much data does a Playlist actually need?',
    layout: 'content',
    content: (
      <div className="max-w-4xl mx-auto space-y-8">
        <p className="text-xl text-gray-700">
          To make one Playlist both <em>feel real</em> and be <em>completely interactive</em> — every feature working or appearing to work as if it were live in production:
        </p>
        <div className="space-y-6 my-8">
          {/* Row 1: Three items */}
          <div className="grid grid-cols-3 gap-6">
            <div className="bg-gradient-to-br from-gray-50 to-gray-100 p-6 rounded-2xl">
              <div className="text-4xl font-bold text-gray-900 mb-2">8–12</div>
              <div className="text-gray-700">outfits</div>
            </div>
            <div className="bg-gradient-to-br from-gray-50 to-gray-100 p-6 rounded-2xl">
              <div className="text-4xl font-bold text-gray-900 mb-2">1–3</div>
              <div className="text-gray-700">Recommendation product sets</div>
            </div>
            <div className="bg-gradient-to-br from-gray-50 to-gray-100 p-6 rounded-2xl">
              <div className="text-4xl font-bold text-gray-900 mb-2">100–150+</div>
              <div className="text-gray-700">Unique Products</div>
            </div>
          </div>

          {/* Row 2: Two items */}
          <div className="grid grid-cols-2 gap-6">
            <div className="bg-gradient-to-br from-gray-50 to-gray-100 p-6 rounded-2xl">
              <div className="text-4xl font-bold text-gray-900 mb-2">Editorial</div>
              <div className="text-gray-700">content</div>
            </div>
            <div className="bg-gradient-to-br from-gray-50 to-gray-100 p-6 rounded-2xl">
              <div className="text-4xl font-bold text-gray-900 mb-2">Trend</div>
              <div className="text-gray-700">content</div>
            </div>
          </div>

          {/* Row 3: Two items */}
          <div className="grid grid-cols-2 gap-6">
            <div className="bg-gradient-to-br from-gray-50 to-gray-100 p-6 rounded-2xl">
              <div className="text-4xl font-bold text-gray-900 mb-2">Outfit Editing</div>
              <div className="text-gray-700">Compatible alternatives for every slot</div>
            </div>
            <div className="bg-gradient-to-br from-gray-50 to-gray-100 p-6 rounded-2xl">
              <div className="text-4xl font-bold text-gray-900 mb-2">Customer Profiles</div>
              <div className="text-gray-700">Data to personalize against</div>
            </div>
          </div>
        </div>
        <p className="text-xl font-semibold text-gray-900">
          And how much more do you need to make it feel personalized for different personas?
        </p>
      </div>
    ),
  },

  // SLIDE 4: New goal
  {
    id: 'new-goal',
    title: 'New goal',
    layout: 'content',
    content: (
      <div className="max-w-4xl mx-auto space-y-12 text-center">
        <div className="space-y-4">
          <p className="text-3xl text-gray-400 line-through">Build the Playlist</p>
          <div className="h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent my-8" />
          <p className="text-4xl font-bold text-gray-900 leading-tight">
            Build the API that makes the Playlist<br />(and so much more) possible.
          </p>
        </div>
        <div className="bg-blue-50 border-2 border-blue-200 rounded-3xl p-12 text-left">
          <p className="text-xl text-gray-700 leading-relaxed">
            A tool XD team members can call when they need real place holder product data for prototypes they build in Claude Code. Feed it a concept. Get back outfits, products, tagged content — all usable, all real enough to demo with.
          </p>
        </div>
      </div>
    ),
  },

  // SLIDE 5: First problem: get the products
  {
    id: 'get-products',
    title: 'First problem: get the products',
    layout: 'content',
    content: (
      <div className="max-w-4xl mx-auto space-y-8">
        <p className="text-xl text-gray-700 leading-relaxed">
          Started pulling products together. Manual copying. Scraping. Puppeteer scripts. Every trick that seemed like it might work.
        </p>
        <div className="text-center my-12">
          <div className="text-6xl font-bold text-gray-900 mb-4">2,000 products</div>
          <p className="text-lg text-gray-600">Felt like a win.</p>
        </div>
        <p className="text-xl text-gray-700">Then audited the category coverage.</p>
        <div className="grid grid-cols-2 gap-4 my-8">
          <div className="p-4 bg-gray-100 rounded-xl">
            <span className="text-gray-700">Tops?</span> <span className="font-semibold">Decent.</span>
          </div>
          <div className="p-4 bg-red-50 rounded-xl">
            <span className="text-gray-700">Shoes?</span> <span className="font-semibold text-red-700">Thin.</span>
          </div>
          <div className="p-4 bg-red-50 rounded-xl">
            <span className="text-gray-700">Outerwear?</span> <span className="font-semibold text-red-700">Sparse.</span>
          </div>
          <div className="p-4 bg-red-100 rounded-xl">
            <span className="text-gray-700">Accessories?</span> <span className="font-semibold text-red-800">Basically nothing.</span>
          </div>
        </div>
        <p className="text-xl text-gray-900 font-semibold">
          2,000 products sounds like a lot until you try to build outfits from them. The gaps were everywhere.
        </p>
        <p className="text-2xl font-bold text-gray-900 text-center pt-6">
          Needed more. A lot more.
        </p>
      </div>
    ),
  },

  // SLIDE 6: The unlock
  {
    id: 'unlock',
    title: 'The unlock',
    layout: 'content',
    content: (
      <div className="max-w-4xl mx-auto space-y-8">
        <p className="text-xl text-gray-700 leading-relaxed">
          Discovered the H&M Kaggle dataset. Open source. Publicly available. Part of a machine learning competition H&M ran a few years ago.
        </p>
        <div className="grid grid-cols-3 gap-6 my-12">
          <div className="text-center p-8 bg-gradient-to-br from-green-50 to-green-100 rounded-3xl">
            <div className="text-5xl font-bold text-gray-900 mb-3">~105K</div>
            <div className="text-gray-700">Total products</div>
          </div>
          <div className="text-center p-8 bg-gradient-to-br from-blue-50 to-blue-100 rounded-3xl">
            <div className="text-5xl font-bold text-gray-900 mb-3">~47K</div>
            <div className="text-gray-700">Outfit-eligible items</div>
          </div>
          <div className="text-center p-8 bg-gradient-to-br from-purple-50 to-purple-100 rounded-3xl">
            <div className="text-5xl font-bold text-gray-900 mb-3">31M</div>
            <div className="text-gray-700">Purchase transactions</div>
          </div>
        </div>
        <p className="text-xl font-semibold text-gray-900">
          Category coverage: instantly workable.
        </p>
        <p className="text-lg text-gray-600 leading-relaxed">
          The purchase transaction data is interesting too — 31 million real co-purchase pairs that could eventually train a compatibility model. But that's future work. Right now: <strong className="text-gray-900">47,000 products to build outfits from.</strong>
        </p>
      </div>
    ),
  },

  // SLIDE 7: Ok. Now build the outfits.
  {
    id: 'build-outfits',
    title: 'Ok. Now build the outfits.',
    layout: 'content',
    content: (
      <div className="max-w-5xl mx-auto space-y-10">
        {/* Two Attempts - Side by Side */}
        <div className="grid grid-cols-2 gap-8">
          {/* Attempt 1 */}
          <div className="bg-white border-2 border-gray-200 rounded-2xl p-8 space-y-4">
            <div className="text-2xl font-bold text-gray-900">Attempt 1</div>
            <div className="text-lg font-medium text-gray-600">Just ask the AI</div>
            <p className="text-lg text-gray-600 italic pl-4 border-l-4 border-gray-300">
              "Here are 47,000 products. Make me an outfit."
            </p>
            <p className="text-lg text-gray-700 leading-relaxed">
              Technically: outfits. Practically: random items grouped together. No real sense of whether pieces actually look good together.
            </p>
          </div>

          {/* Attempt 2 */}
          <div className="bg-white border-2 border-gray-200 rounded-2xl p-8 space-y-4">
            <div className="text-2xl font-bold text-gray-900">Attempt 2</div>
            <div className="text-lg font-medium text-gray-600">AI + Rules</div>
            <p className="text-lg text-gray-700 leading-relaxed">
              Added hard constraints. 4–6 pieces. Footwear required. No doubling up on roles. Formality has to make sense.
            </p>
            <p className="text-lg text-gray-700 leading-relaxed">
              Better. More coherent. Still missing something.
            </p>
          </div>
        </div>

        {/* Key Insight */}
        <div className="bg-yellow-50 border-2 border-yellow-200 rounded-3xl p-8 text-center">
          <p className="text-2xl font-semibold text-gray-900">
            The model could read descriptions.<br />
            It couldn't <em>see</em> the clothes.
          </p>
        </div>
      </div>
    ),
  },

  // SLIDE 8: Remember Fashion Map Search?
  {
    id: 'fashion-map',
    title: 'Remember Fashion Map Search?',
    layout: 'content',
    content: (
      <div className="max-w-4xl mx-auto space-y-8">
        <p className="text-xl text-gray-700 leading-relaxed">
          The ACE team built Fashion Map Search using CLIP — a model that maps images and text into the same space, so visually similar things end up numerically close to each other, regardless of how their descriptions are written.
        </p>
        <p className="text-xl text-gray-700 leading-relaxed">
          I implemented a newer, more powerful version of the same idea.
        </p>
        <div className="bg-gradient-to-br from-indigo-50 to-purple-50 border-2 border-indigo-200 rounded-3xl p-10 my-10">
          <div className="text-3xl font-bold text-gray-900 mb-4">Marqo-FashionSigLIP</div>
          <p className="text-lg text-gray-700 leading-relaxed">
            A CLIP model released this year, trained specifically on fashion data. It outperforms the SigLIP v2 model that ACE and Recs currently use on fashion-specific tasks.
          </p>
        </div>
        <div className="space-y-6">
          <p className="text-xl text-gray-700">Adding it to the outfit engine changed the question the system was asking:</p>
          <div className="text-center space-y-6">
            <p className="text-lg text-gray-500 italic">"Do these items' descriptions match?"</p>
            <div className="text-4xl text-gray-400">↓</div>
            <p className="text-2xl font-bold text-gray-900">"Do these items actually look good together?"</p>
          </div>
        </div>
        <p className="text-xl font-semibold text-gray-900 text-center pt-6">
          That's the unlock. Outfitting went from coherent-but-off to genuinely good.
        </p>
      </div>
    ),
  },

  // SLIDE 9: Demo — Semantic Search
  {
    id: 'clip-demo',
    title: 'Demo — Semantic Search',
    layout: 'demo',
    content: (
      <div className="space-y-8">
        <div className="max-w-3xl mx-auto text-center space-y-4">
          <p className="text-xl text-gray-700">
            Type a concept — not a keyword. A feeling.
          </p>
          <div className="flex flex-wrap gap-3 justify-center text-sm">
            <span className="px-4 py-2 bg-gray-100 rounded-full text-gray-700">"Coastal grandmother cardigan"</span>
            <span className="px-4 py-2 bg-gray-100 rounded-full text-gray-700">"Goth girl birthday dress"</span>
            <span className="px-4 py-2 bg-gray-100 rounded-full text-gray-700">"Boardroom but make it interesting"</span>
          </div>
        </div>
        <ClipSearchDemo />
      </div>
    ),
  },

  // SLIDE 10: A lifestyle photo is already an outfit brief
  {
    id: 'lifestyle-photo',
    title: 'A lifestyle photo is already an outfit brief',
    layout: 'content',
    content: (
      <div className="max-w-4xl mx-auto space-y-8">
        <p className="text-xl text-gray-700 leading-relaxed">
          Once CLIP was working, a new input surface opened up: lifestyle photography.
        </p>
        <p className="text-xl text-gray-700 leading-relaxed">
          A styled editorial image already has everything — silhouette balance, color harmony, occasion context — baked in by whoever shot it.
        </p>
        <div className="bg-gradient-to-br from-teal-50 to-cyan-50 border-2 border-teal-200 rounded-3xl p-10 my-10">
          <div className="text-2xl font-bold text-gray-900 mb-4">Recipe Scout</div>
          <p className="text-lg text-gray-700 leading-relaxed">
            Scans a lifestyle image, identifies the pieces, infers their attributes, and produces a recipe template. The top of the content funnel. It goes out into the world and comes back with a brief.
          </p>
        </div>
        <p className="text-lg text-gray-600 italic text-center">
          [Demo: upload or fetch an image → watch it become a recipe]
        </p>
      </div>
    ),
  },

  // SLIDE 11: From recipes to 20,000 outfits
  {
    id: 'scale',
    title: 'From recipes to 20,000 outfits',
    layout: 'content',
    content: (
      <div className="max-w-4xl mx-auto space-y-10">
        <p className="text-xl text-gray-700 leading-relaxed">
          With CLIP-powered outfit building and Recipe Scout generating templates, the system could run at scale.
        </p>
        <div className="grid grid-cols-2 gap-8 my-12">
          <div className="text-center p-10 bg-gradient-to-br from-amber-50 to-orange-50 rounded-3xl">
            <div className="text-6xl font-bold text-gray-900 mb-3">357</div>
            <div className="text-xl text-gray-700">recipes</div>
          </div>
          <div className="text-center p-10 bg-gradient-to-br from-emerald-50 to-green-50 rounded-3xl">
            <div className="text-6xl font-bold text-gray-900 mb-3">20,000+</div>
            <div className="text-xl text-gray-700">outfits</div>
          </div>
        </div>
        <div className="space-y-4">
          <p className="text-xl font-semibold text-gray-900">Each outfit gets a confidence score:</p>
          <div className="space-y-3 text-lg">
            <div className="flex items-center gap-4 p-4 bg-green-50 rounded-xl">
              <div className="font-bold text-green-700 text-xl">≥75</div>
              <div className="text-gray-700">— Displayable</div>
            </div>
            <div className="flex items-center gap-4 p-4 bg-yellow-50 rounded-xl">
              <div className="font-bold text-yellow-700 text-xl">50–74</div>
              <div className="text-gray-700">— Suppressed until the pool improves</div>
            </div>
            <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl">
              <div className="font-bold text-gray-500 text-xl">&lt;50</div>
              <div className="text-gray-700">— Not shown</div>
            </div>
          </div>
        </div>
      </div>
    ),
  },

  // SLIDE 12: Now tag all of it
  {
    id: 'tagging',
    title: 'Now tag all of it',
    layout: 'content',
    content: (
      <div className="max-w-5xl mx-auto space-y-8">
        <p className="text-xl text-gray-700 leading-relaxed">
          CLIP tells you if two pieces look compatible. It doesn't tell you if an outfit is <em>Minimal or Romantic. Work or Weekend. Summer or transitional.</em> That requires semantic tagging — a hybrid approach combining rules and AI.
        </p>

        {/* Three Cards with Arrows - Rules → AI → Confidence */}
        <div className="my-12">
          <div className="flex items-stretch gap-4">
            {/* Card 1: Rules Fire First */}
            <div className="flex-1 flex flex-col bg-blue-50 border-2 border-blue-200 rounded-2xl p-6">
              <div className="text-xl font-bold text-gray-900 mb-3">1. Rules Fire First</div>
              <p className="text-gray-700 leading-relaxed flex-1">
                Deterministic logic scans structured data — colors, materials, product types. Fast pattern matching produces instant tags with known confidence.
              </p>
            </div>

            {/* Arrow */}
            <div className="text-4xl text-gray-400 flex-shrink-0 self-center">→</div>

            {/* Card 2: AI Fills Gaps */}
            <div className="flex-1 flex flex-col bg-purple-50 border-2 border-purple-200 rounded-2xl p-6">
              <div className="text-xl font-bold text-gray-900 mb-3">2. AI Fills the Gaps</div>
              <p className="text-gray-700 leading-relaxed flex-1">
                When rules can't extract from titles or descriptions (confidence sub-70%), vision models analyze images and context for attributes rules missed.
              </p>
            </div>

            {/* Arrow */}
            <div className="text-4xl text-gray-400 flex-shrink-0 self-center">→</div>

            {/* Card 3: Confidence Scoring */}
            <div className="flex-1 flex flex-col bg-green-50 border-2 border-green-200 rounded-2xl p-6">
              <div className="text-xl font-bold text-gray-900 mb-3">3. Confidence Tracked</div>
              <p className="text-gray-700 leading-relaxed flex-1">
                Every attribute tracks its source and confidence. High scores propagate. Low scores trigger review or re-tagging workflows.
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6">
          <div className="p-6 bg-white border-2 border-gray-200 rounded-2xl">
            <div className="text-lg font-bold text-gray-900 mb-3">Product-Level Tags</div>
            <ul className="space-y-2 text-gray-700">
              <li>• Color palette & materials</li>
              <li>• Product type & silhouette</li>
              <li>• Formality indicators</li>
              <li>• Season/weather appropriateness</li>
              <li>• Style pillar affinity scores</li>
            </ul>
          </div>

          <div className="p-6 bg-white border-2 border-gray-200 rounded-2xl">
            <div className="text-lg font-bold text-gray-900 mb-3">Outfit-Level Tags</div>
            <ul className="space-y-2 text-gray-700">
              <li>• Style Pillar (dominant aesthetic)</li>
              <li>• Vibe (emotional register)</li>
              <li>• Occasions (use cases)</li>
              <li>• Formality score (0-10)</li>
              <li>• Composition analysis</li>
            </ul>
          </div>
        </div>

        <p className="text-lg text-gray-700 leading-relaxed italic">
          Product tags help predict what outfits can be built. Outfit tags validate and refine product understanding. The system learns bidirectionally.
        </p>
      </div>
    ),
  },

  // SLIDE 13: Three fuzzy things
  {
    id: 'fuzzy-things',
    title: 'Three fuzzy things that needed their own approach',
    layout: 'content',
    content: (
      <div className="max-w-4xl mx-auto">
        <div className="grid grid-cols-3 gap-6">
          <div className="p-10 bg-gradient-to-br from-rose-50 to-pink-50 rounded-3xl text-center">
            <div className="text-5xl mb-4">🎨</div>
            <div className="text-2xl font-bold text-gray-900">Style Pillar</div>
          </div>
          <div className="p-10 bg-gradient-to-br from-violet-50 to-purple-50 rounded-3xl text-center">
            <div className="text-5xl mb-4">✨</div>
            <div className="text-2xl font-bold text-gray-900">Vibe</div>
          </div>
          <div className="p-10 bg-gradient-to-br from-sky-50 to-blue-50 rounded-3xl text-center">
            <div className="text-5xl mb-4">📅</div>
            <div className="text-2xl font-bold text-gray-900">Occasion</div>
          </div>
        </div>
        <p className="text-xl text-gray-700 text-center mt-12">
          Each one is fuzzy in a different way. Each needed its own approach.
        </p>
      </div>
    ),
  },

  // SLIDE 14: Style Pillar
  {
    id: 'style-pillar',
    title: 'Style Pillar',
    layout: 'content',
    content: (
      <div className="max-w-5xl mx-auto space-y-8">
        <p className="text-xl text-gray-700 italic text-center">
          What aesthetic register is this outfit?
        </p>
        <div className="bg-gradient-to-r from-rose-50 via-purple-50 to-blue-50 rounded-3xl p-8 my-8">
          <div className="flex flex-wrap justify-center gap-4 text-lg font-semibold text-gray-900">
            <span>Romantic</span>
            <span className="text-gray-400">·</span>
            <span>Bohemian</span>
            <span className="text-gray-400">·</span>
            <span>Casual</span>
            <span className="text-gray-400">·</span>
            <span>Classic</span>
            <span className="text-gray-400">·</span>
            <span>Minimal</span>
            <span className="text-gray-400">·</span>
            <span>Maximal</span>
            <span className="text-gray-400">·</span>
            <span>Streetwear</span>
            <span className="text-gray-400">·</span>
            <span>Athletic</span>
            <span className="text-gray-400">·</span>
            <span>Utility</span>
          </div>
        </div>
        <p className="text-lg text-gray-700 leading-relaxed">
          Nine pillars. Gender-agnostic. Arranged on a continuous spectrum — not discrete buckets.
        </p>
        <p className="text-lg text-gray-700 leading-relaxed">
          Each pillar has sub-terms that act as scoring dimensions. A piece can be 60% Classic, 30% Minimal, 10% Casual. The highest-scoring pillar wins — but the others aren't lost.
        </p>
      </div>
    ),
  },

  // SLIDE 15: Vibe + Occasion
  {
    id: 'vibe-occasion',
    title: 'Vibe + Occasion',
    layout: 'content',
    content: (
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="space-y-6">
          <div className="text-2xl font-bold text-gray-900">Vibes</div>
          <p className="text-lg text-gray-700 leading-relaxed">
            The emotional register — independent of Pillar. An outfit can be Athletic pillar with a Grunge vibe. Classic pillar with a Romantic vibe. 28 active terms, kept strictly separate from Pillar vocabulary.
          </p>
        </div>
        <div className="space-y-6">
          <div className="text-2xl font-bold text-gray-900">Occasions</div>
          <p className="text-lg text-gray-700 leading-relaxed">
            Derived, not tagged directly. Four axes score independently:
          </p>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-gray-100 rounded-xl">1. Formality</div>
            <div className="p-4 bg-gray-100 rounded-xl">2. Activity context</div>
            <div className="p-4 bg-gray-100 rounded-xl">3. Season</div>
            <div className="p-4 bg-gray-100 rounded-xl">4. Social register</div>
          </div>
        </div>
        <div className="bg-red-50 border-2 border-red-200 rounded-3xl p-8">
          <p className="text-lg text-gray-700 leading-relaxed">
            The old approach (single formality axis) put <strong className="text-red-700">80% of outfits in "Date Night" or "Casual Dinner."</strong> Four axes produce specific, varied occasions from the same outfits.
          </p>
        </div>
      </div>
    ),
  },

  // SLIDE 16: Demo — Outfit Tagging
  {
    id: 'tagger-demo',
    title: 'Demo — Outfit Tagging',
    layout: 'demo',
    content: (
      <div className="space-y-8">
        <p className="text-xl text-gray-700 text-center max-w-3xl mx-auto">
          Watch the system work — rules fire, AI fills gaps, reasoning is visible for every decision.
        </p>
        <OutfitTaggerDemo />
      </div>
    ),
  },

  // SLIDE 17: The content engine works
  {
    id: 'engine-works',
    title: 'The content engine works. The Playlist is still waiting.',
    layout: 'content',
    content: (
      <div className="max-w-4xl mx-auto space-y-10">
        <div className="space-y-4 text-xl">
          <div className="flex items-center gap-4">
            <span className="text-3xl text-green-600">✓</span>
            <span className="text-gray-700">Outfits</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-3xl text-green-600">✓</span>
            <span className="text-gray-700">Tagging</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-3xl text-green-600">✓</span>
            <span className="text-gray-700">Recipe system</span>
          </div>
        </div>
        <div className="bg-blue-50 border-2 border-blue-200 rounded-3xl p-10 space-y-6">
          <p className="text-xl text-gray-700 leading-relaxed">
            But the Playlist needs more than outfits. It needs trend content. Campaign content. And — most importantly — it needs to know <em>who it's for.</em>
          </p>
          <p className="text-xl text-gray-900 font-semibold">
            The outfit engine is the supply side.
          </p>
          <p className="text-2xl text-gray-900 font-bold text-center pt-4">
            The supply side is ready. The demand side is next.
          </p>
        </div>
      </div>
    ),
  },

  // SLIDE 18: The Style Profile
  {
    id: 'style-profile-intro',
    title: 'The Style Profile',
    layout: 'content',
    content: (
      <div className="max-w-4xl mx-auto space-y-8">
        <p className="text-xl text-gray-700 leading-relaxed">
          The Playlist personalizes against a customer. That customer needs a profile.
        </p>
        <div className="bg-gradient-to-br from-purple-50 to-pink-50 border-2 border-purple-200 rounded-3xl p-12">
          <p className="text-2xl text-gray-900 font-semibold leading-relaxed">
            The idea: a style profile that can be created from almost nothing and gets smarter over time.
          </p>
          <div className="mt-8 space-y-3 text-lg text-gray-700">
            <p>• No lengthy onboarding.</p>
            <p>• No mandatory quiz.</p>
            <p>• Start with whatever signal exists — a single swipe, a purchase, a search — and build from there.</p>
          </div>
        </div>
      </div>
    ),
  },

  // SLIDE 19: What the profile knows
  {
    id: 'profile-knows',
    title: 'What the profile knows',
    layout: 'content',
    content: (
      <div className="max-w-5xl mx-auto space-y-10">
        <div className="grid grid-cols-2 gap-8">
          <div className="p-8 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-3xl">
            <div className="text-2xl font-bold text-gray-900 mb-4">Style Space Map</div>
            <p className="text-gray-700 leading-relaxed">
              The customer's position across 9 style dimensions, visualized. The map reshapes around their centroid — their taste is the center of the world.
            </p>
          </div>
          <div className="p-8 bg-gradient-to-br from-purple-50 to-pink-50 rounded-3xl">
            <div className="text-2xl font-bold text-gray-900 mb-4">Personality Narrative</div>
            <p className="text-gray-700 leading-relaxed">
              A human-voiced paragraph synthesized from their pillar weights and memory. Generated fresh each time.
            </p>
          </div>
        </div>
        <div className="p-10 bg-gradient-to-br from-amber-50 to-orange-50 rounded-3xl">
          <div className="text-2xl font-bold text-gray-900 mb-6">Semantic Memory</div>
          <p className="text-lg text-gray-700 mb-6">Three types of what the system knows:</p>
          <div className="space-y-4 text-gray-700">
            <div><strong>Stated</strong> — things they've said directly</div>
            <div><strong>Inferred</strong> — patterns the system noticed</div>
            <div><strong>Life Context</strong> — facts about their life (kids, job, hobbies)</div>
          </div>
          <p className="text-lg text-gray-700 mt-6">
            Each memory shows its source. Customers can push back on what's wrong.
          </p>
        </div>
        <div className="bg-green-50 border-2 border-green-200 rounded-3xl p-8">
          <p className="text-xl font-semibold text-gray-900 mb-3">Core principle:</p>
          <p className="text-lg text-gray-700 leading-relaxed">
            Never delete. Flag conflicts. A 2022 floral purchase and a 2024 "I hate florals" chat quote both stay in the record. Data is precious.
          </p>
        </div>
      </div>
    ),
  },

  // SLIDE 20: How the profile learns
  {
    id: 'profile-learns',
    title: 'How the profile learns',
    layout: 'content',
    content: (
      <div className="max-w-4xl mx-auto space-y-8">
        <p className="text-xl text-gray-700 text-center mb-10">
          Three layers working together:
        </p>
        <div className="space-y-6">
          <div className="p-8 bg-gradient-to-r from-blue-50 to-cyan-50 border-2 border-blue-200 rounded-3xl">
            <div className="text-2xl font-bold text-gray-900 mb-4">Rules Engine</div>
            <p className="text-lg text-gray-700 leading-relaxed">
              Deterministic. Every swipe, purchase, and search updates pillar weights by fixed amounts. Fast, consistent, auditable.
            </p>
          </div>
          <div className="p-8 bg-gradient-to-r from-purple-50 to-pink-50 border-2 border-purple-200 rounded-3xl">
            <div className="text-2xl font-bold text-gray-900 mb-4">Semantic Brain</div>
            <p className="text-lg text-gray-700 leading-relaxed">
              LLM-powered. Reads text events (chat, search queries, stylist notes, RAL forms) and extracts memories, spots patterns, flags conflicts. Temperature 0 — deterministic outputs.
            </p>
          </div>
          <div className="p-8 bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-200 rounded-3xl">
            <div className="text-2xl font-bold text-gray-900 mb-4">Synthesizer</div>
            <p className="text-lg text-gray-700 leading-relaxed">
              Merges both. Updates the profile state. Applies recency decay. Never overwrites history.
            </p>
          </div>
        </div>
      </div>
    ),
  },

  // SLIDE 21: Demo — The Style Profile
  {
    id: 'profile-demo',
    title: 'Demo — The Style Profile',
    layout: 'content',
    content: (
      <div className="max-w-4xl mx-auto space-y-10 text-center">
        <p className="text-xl text-gray-700 leading-relaxed">
          Nine customer personas. Each one a different style story with months of interaction history.
        </p>
        <p className="text-xl text-gray-700 leading-relaxed">
          Step through the session scrubber. Watch the profile learn in real time — memories surface, pillar weights shift, the map moves.
        </p>
        <div className="pt-8">
          <a
            href="/demo"
            className="inline-flex items-center gap-3 px-10 py-5 bg-black text-white text-xl font-semibold rounded-2xl hover:bg-gray-800 transition-all hover:scale-105"
          >
            Launch Style Profile Demo
            <span className="text-2xl">→</span>
          </a>
        </div>
      </div>
    ),
  },

  // SLIDE 22: What this is, really
  {
    id: 'conclusion',
    title: 'What this is, really',
    layout: 'content',
    content: (
      <div className="max-w-4xl mx-auto space-y-10">
        <p className="text-xl text-gray-700 leading-relaxed">
          A few weeks ago this was a contest entry idea.
        </p>
        <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-3xl p-12 space-y-6">
          <p className="text-xl text-gray-700 leading-relaxed">
            It became a content engine with 20,000+ outfits, a style taxonomy built from scratch, a visual search tool that outperforms what's currently in production, and a personalization layer that learns from almost no input.
          </p>
        </div>
        <p className="text-xl text-gray-700 leading-relaxed">
          The Playlist isn't done. But it's no longer blocked by infrastructure.
        </p>
        <p className="text-3xl font-bold text-gray-900 text-center pt-8">
          Neither is anything else that's been waiting on this problem.
        </p>
        <div className="pt-12 text-center">
          <p className="text-lg text-gray-500">
            edit-engine · Nordstrom Experience Design · Claude Code Contest · 2026
          </p>
        </div>
      </div>
    ),
  },
];
