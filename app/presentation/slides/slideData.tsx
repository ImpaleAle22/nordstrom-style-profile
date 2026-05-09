/**
 * Slide Data - Presentation Content
 * Based on PRESENTATION-TEXT-v2.md
 */

import ClipSearchDemo from './ClipSearchDemo';
import OutfitTaggerDemo from './OutfitTaggerDemo';
import RecipeScoutDemo from './RecipeScoutDemo';
import LiveStatsCards from './LiveStatsCards';

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
      <div className="grid grid-cols-2 gap-12 items-end">
        {/* Left Column - Text */}
        <div className="space-y-6 pl-10">
          <p className="text-xl text-gray-700 leading-relaxed">
            The Playlist concept that Clair has championed and the Personalized Edit concept I explored share a lot of DNA.
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
        <div className="flex justify-end">
          <img
            src="/playlist-mockup.png"
            alt="Playlist concept mockup"
            className="w-auto h-auto"
            style={{ maxHeight: '450px' }}
          />
        </div>
      </div>
    ),
  },

  // SLIDE 3: How much data do I need?
  {
    id: 'data-needs',
    title: 'How much data do I need?',
    layout: 'content',
    content: (
      <div className="max-w-4xl mx-auto space-y-5">
        <p className="text-xl text-gray-700">
          To make one Playlist <em>feel real</em> and be <em>fully interactive</em>:
        </p>
        <div className="space-y-4 my-5">
          {/* Row 1: Three items */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-gradient-to-br from-gray-50 to-gray-100 px-5 pt-4 pb-4 rounded-2xl">
              <div className="text-4xl font-bold text-gray-900 mb-1">8–12</div>
              <div className="text-gray-700">outfits</div>
            </div>
            <div className="bg-gradient-to-br from-gray-50 to-gray-100 px-5 pt-4 pb-4 rounded-2xl">
              <div className="text-4xl font-bold text-gray-900 mb-1">1–3</div>
              <div className="text-gray-700">Recommendation sets</div>
            </div>
            <div className="bg-gradient-to-br from-gray-50 to-gray-100 px-5 pt-4 pb-4 rounded-2xl">
              <div className="text-4xl font-bold text-gray-900 mb-1">100–150+</div>
              <div className="text-gray-700">Unique Products</div>
            </div>
          </div>

          {/* Row 2: Two items */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gradient-to-br from-gray-50 to-gray-100 px-5 pt-4 pb-4 rounded-2xl">
              <div className="text-4xl font-bold text-gray-900 mb-1">Editorial</div>
              <div className="text-gray-700">content</div>
            </div>
            <div className="bg-gradient-to-br from-gray-50 to-gray-100 px-5 pt-4 pb-4 rounded-2xl">
              <div className="text-4xl font-bold text-gray-900 mb-1">Trend</div>
              <div className="text-gray-700">content</div>
            </div>
          </div>

          {/* Row 3: Two items */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gradient-to-br from-gray-50 to-gray-100 px-5 pt-4 pb-4 rounded-2xl">
              <div className="text-2xl font-bold text-gray-900 mb-1">Outfit Editing</div>
              <div className="text-gray-700">Compatible alternatives for every slot</div>
            </div>
            <div className="bg-gradient-to-br from-gray-50 to-gray-100 px-5 pt-4 pb-4 rounded-2xl">
              <div className="text-2xl font-bold text-gray-900 mb-1">Customer Profiles</div>
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
            Build the content engine that makes the Playlist<br />(and so much more) possible.
          </p>
        </div>
        <div className="bg-blue-50 border-2 border-blue-200 rounded-3xl p-12 text-left">
          <p className="text-xl text-gray-700 leading-relaxed">
            A vast pool of products organized into outfits, lifestyle images, and a tagging system that includes style pillars, vibes, and occasions. Semantic search, visual similarity, concept-based queries. Real content, ready to use in Claude Code prototypes.
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
        <div className="text-center my-8">
          <div className="text-6xl font-bold text-gray-900 mb-4">2,000 products</div>
        </div>
        <p className="text-xl text-gray-700 text-center">Felt like a win. Then I audited the category coverage.</p>
        <div className="flex gap-4 my-8">
          <div className="flex-1 p-4 bg-gray-100 rounded-xl whitespace-nowrap">
            <span className="text-gray-700">Tops?</span> <span className="font-semibold">Decent.</span>
          </div>
          <div className="flex-1 p-4 bg-red-50 rounded-xl whitespace-nowrap">
            <span className="text-gray-700">Shoes?</span> <span className="font-semibold text-red-700">Thin.</span>
          </div>
          <div className="flex-1 p-4 bg-red-50 rounded-xl whitespace-nowrap">
            <span className="text-gray-700">Outerwear?</span> <span className="font-semibold text-red-700">Sparse.</span>
          </div>
          <div className="flex-1 p-4 bg-red-100 rounded-xl whitespace-nowrap">
            <span className="text-gray-700">Accessories?</span> <span className="font-semibold text-red-800">Basically nothing.</span>
          </div>
        </div>
        <p className="text-xl text-gray-900 font-semibold text-center">
          2,000 products sounds like a lot until you try to build outfits. The gaps were everywhere.
        </p>
        <p className="text-2xl font-bold text-gray-900 text-center pt-1.5">
          Needed more. A lot more.
        </p>
      </div>
    ),
  },

  // SLIDE 6: The unlock
  {
    id: 'unlock',
    title: 'The breakthrough',
    layout: 'content',
    content: (
      <div className="max-w-4xl mx-auto space-y-8">
        <p className="text-xl text-gray-700 leading-relaxed">
          Discovered the H&M Kaggle dataset. Open source. Publicly available. Part of a machine learning competition H&M ran a few years ago.
        </p>
        <div className="grid grid-cols-2 gap-6 my-12">
          <div className="text-center p-8 bg-gradient-to-br from-green-50 to-green-100 rounded-3xl">
            <div className="text-5xl font-bold text-gray-900 mb-3">~105K</div>
            <div className="text-gray-700">Total products</div>
          </div>
          <div className="text-center p-8 bg-gradient-to-br from-blue-50 to-blue-100 rounded-3xl">
            <div className="text-5xl font-bold text-gray-900 mb-3">~47K</div>
            <div className="text-gray-700">Outfit-eligible items</div>
          </div>
        </div>
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
              Technically: outfits. Practically: the prefiltering was sub-par. The product sets selected weren't setting up good outfits.
            </p>
          </div>

          {/* Attempt 2 */}
          <div className="bg-white border-2 border-gray-200 rounded-2xl p-8 space-y-4">
            <div className="text-2xl font-bold text-gray-900">Attempt 2</div>
            <div className="text-lg font-medium text-gray-600">AI + Rules</div>
            <p className="text-lg text-gray-700 leading-relaxed">
              Added hard constraints. 4–6 pieces. Footwear required. Rules tailored to each role. Formality has to make sense.
            </p>
            <p className="text-lg text-gray-700 leading-relaxed">
              Better. More coherent. Still missing something.
            </p>
          </div>
        </div>

        {/* Key Insight */}
        <div className="bg-yellow-50 border-2 border-yellow-200 rounded-3xl p-8 text-center">
          <p className="text-2xl font-semibold text-gray-900">
            The outfit building process still wasn't meeting expectations.<br />
            Something was missing.
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
        <div className="flex gap-6 items-center">
          <div className="flex-1">
            <p className="text-xl text-gray-700 leading-relaxed">
              The ACE team built Fashion Map Search using CLIP, an embedding model that maps images and text into the same space. I implemented a newer, more powerful version released this year, trained specifically on fashion data.
            </p>
          </div>
          <div className="bg-gradient-to-br from-indigo-50 to-purple-50 border-2 border-indigo-200 rounded-3xl px-8 py-6 flex items-center gap-4 whitespace-nowrap">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" className="w-12 h-12 flex-shrink-0" fill="currentColor">
              <path d="M344,144H168a24.028,24.028,0,0,0-24,24V344a24.028,24.028,0,0,0,24,24H344a24.028,24.028,0,0,0,24-24V168A24.028,24.028,0,0,0,344,144Zm8,200a8.009,8.009,0,0,1-8,8H168a8.009,8.009,0,0,1-8-8V168a8.009,8.009,0,0,1,8-8H344a8.009,8.009,0,0,1,8,8Z"/>
              <path d="M221.657,218.343a8,8,0,0,0-11.314,0l-32,32a8,8,0,0,0,0,11.314l32,32a8,8,0,1,0,11.314-11.314L195.314,256l26.343-26.343A8,8,0,0,0,221.657,218.343Z"/>
              <path d="M301.657,218.343a8,8,0,0,0-11.314,11.314L316.686,256l-26.343,26.343a8,8,0,0,0,11.314,11.314l32-32a8,8,0,0,0,0-11.314Z"/>
              <path d="M265.94,216.239a8,8,0,0,0-9.7,5.821l-16,64a8,8,0,1,0,15.522,3.88l16-64A8,8,0,0,0,265.94,216.239Z"/>
              <path d="M408,216a24.039,24.039,0,0,0,22.624-16H456a8,8,0,0,0,7.59-5.47L477.766,152H488a8,8,0,0,0,0-16H472a8,8,0,0,0-7.59,5.47L450.234,184h-19.61A23.985,23.985,0,0,0,400,169.376V152a40.059,40.059,0,0,0-33.57-39.476A23.981,23.981,0,0,0,352,81.376V24a8,8,0,0,0-16,0V81.376A23.985,23.985,0,0,0,321.376,112H302.624A23.985,23.985,0,0,0,288,81.376V24a8,8,0,0,0-16,0V81.376A23.985,23.985,0,0,0,257.376,112H190.624A23.985,23.985,0,0,0,176,81.376V24a8,8,0,0,0-16,0V81.376a23.984,23.984,0,0,0-14.431,31.148A40.059,40.059,0,0,0,112,152v17.376A23.985,23.985,0,0,0,81.376,184H61.766L47.589,141.47A8,8,0,0,0,40,136H24a8,8,0,0,0,0,16H34.234l14.177,42.53A8,8,0,0,0,56,200H81.376A23.985,23.985,0,0,0,112,214.624v18.752A23.985,23.985,0,0,0,81.376,248H24a8,8,0,0,0,0,16H81.376A23.985,23.985,0,0,0,112,278.624v18.752A23.985,23.985,0,0,0,81.376,312H56a8,8,0,0,0-7.589,5.47L34.234,360H24a8,8,0,0,0,0,16H40a8,8,0,0,0,7.589-5.47L61.766,328h19.61A23.985,23.985,0,0,0,112,342.624V360a40.059,40.059,0,0,0,33.569,39.476A23.984,23.984,0,0,0,160,430.624V488a8,8,0,0,0,16,0V430.624A23.985,23.985,0,0,0,190.624,400h66.752A23.985,23.985,0,0,0,272,430.624V488a8,8,0,0,0,16,0V430.624A23.985,23.985,0,0,0,302.624,400h18.752A23.985,23.985,0,0,0,336,430.624V488a8,8,0,0,0,16,0V430.624a23.981,23.981,0,0,0,14.43-31.148A40.059,40.059,0,0,0,400,360V342.624A23.985,23.985,0,0,0,430.624,328h19.61l14.176,42.53A8,8,0,0,0,472,376h16a8,8,0,0,0,0-16H477.766L463.59,317.47A8,8,0,0,0,456,312H430.624A23.985,23.985,0,0,0,400,297.376V278.624A23.985,23.985,0,0,0,430.624,264H488a8,8,0,0,0,0-16H430.624A23.985,23.985,0,0,0,400,233.376V214.624A23.885,23.885,0,0,0,408,216Zm0-32a8,8,0,1,1-8,8A8.009,8.009,0,0,1,408,184ZM104,328a8,8,0,1,1,8-8A8.009,8.009,0,0,1,104,328Zm0-64a8,8,0,1,1,8-8A8.009,8.009,0,0,1,104,264Zm0-64a8,8,0,1,1,8-8A8.009,8.009,0,0,1,104,200ZM344,96a8,8,0,1,1-8,8A8.009,8.009,0,0,1,344,96Zm-64,0a8,8,0,1,1-8,8A8.009,8.009,0,0,1,280,96ZM168,96a8,8,0,1,1-8,8A8.009,8.009,0,0,1,168,96Zm0,320a8,8,0,1,1,8-8A8.009,8.009,0,0,1,168,416Zm112,0a8,8,0,1,1,8-8A8.009,8.009,0,0,1,280,416Zm64,0a8,8,0,1,1,8-8A8.009,8.009,0,0,1,344,416Zm40-56a24.028,24.028,0,0,1-24,24H152a24.028,24.028,0,0,1-24-24V152a24.028,24.028,0,0,1,24-24H360a24.028,24.028,0,0,1,24,24Zm24-48a8,8,0,1,1-8,8A8.009,8.009,0,0,1,408,312Zm0-64a8,8,0,1,1-8,8A8.009,8.009,0,0,1,408,248Z"/>
            </svg>
            <div className="text-2xl font-bold text-gray-900">Marqo-FashionSigLIP</div>
          </div>
        </div>
        <div className="space-y-6">
          <p className="text-xl font-semibold text-gray-900 text-center">Adding it to the outfit engine changed the question the system was asking:</p>
          <div className="grid grid-cols-2 gap-6">
            <div className="p-6 bg-gray-50 border-2 border-gray-200 rounded-2xl">
              <p className="text-lg text-gray-700 leading-relaxed">
                "Do the attributes of these products make a logical outfit?"
              </p>
            </div>
            <div className="p-6 bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200 rounded-2xl">
              <p className="text-lg text-gray-900 font-semibold leading-relaxed">
                "Do these items actually <strong>look</strong> good together?"
              </p>
            </div>
          </div>
        </div>
        <p className="text-xl font-semibold text-gray-900 text-center pt-3">
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
        <ClipSearchDemo />
      </div>
    ),
  },

  // SLIDE 10: From recipes to outfits
  {
    id: 'scale',
    title: 'From recipes to outfits',
    layout: 'content',
    content: (
      <div className="max-w-4xl mx-auto space-y-10">
        <p className="text-xl text-gray-700 leading-relaxed">
          With CLIP-powered outfit building and Recipe Scout generating high-fidelity outfit templates, the system could run at scale.
        </p>
        <LiveStatsCards />
      </div>
    ),
  },

  // SLIDE 11: A lifestyle photo is already an outfit brief
  {
    id: 'lifestyle-photo',
    title: 'A lifestyle photo is already an outfit brief',
    layout: 'demo',
    content: (
      <div className="max-w-4xl mx-auto space-y-8">
        <p className="text-xl text-gray-700 leading-relaxed mb-8">
          A styled editorial image already has everything baked in by whoever styled the model. Recipe Scout scans them, identifies each piece and its attributes, and produces a recipe template.
        </p>
        <RecipeScoutDemo />
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
        {/* Three Cards with Arrows - Rules → AI → Confidence */}
        <div className="mt-4 mb-12">
          <div className="flex items-stretch gap-4">
            {/* Card 1: Rules Fire First */}
            <div className="flex-1 flex flex-col bg-blue-50 border-2 border-blue-200 rounded-2xl p-6">
              <div className="text-xl font-bold text-gray-900 mb-3">1. Rules Fire First</div>
              <p className="text-gray-700 leading-relaxed flex-1">
                Scans structured product data. Fast pattern matching produces instant tags with tracked confidence scores.
              </p>
            </div>

            {/* Arrow */}
            <div className="text-4xl text-gray-400 flex-shrink-0 self-center">→</div>

            {/* Card 2: AI Fills Gaps */}
            <div className="flex-1 flex flex-col bg-purple-50 border-2 border-purple-200 rounded-2xl p-6">
              <div className="text-xl font-bold text-gray-900 mb-3">2. AI Fills the Gaps</div>
              <p className="text-gray-700 leading-relaxed flex-1">
                When rules can't extract from structured data, vision models analyze images and context for tags rules missed.
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
              <li>• Color palette, materials, product type & silhouette</li>
              <li>• Formality indicators and season/weather appropriateness</li>
              <li>• Style pillar affinity scores across all nine pillars</li>
            </ul>
          </div>

          <div className="p-6 bg-white border-2 border-gray-200 rounded-2xl">
            <div className="text-lg font-bold text-gray-900 mb-3">Outfit-Level Tags</div>
            <ul className="space-y-2 text-gray-700">
              <li>• Style Pillar (aesthetic) and Vibe (emotional tone)</li>
              <li>• Occasions (use cases) and Formality score (0-10 scale)</li>
              <li>• Composition analysis: balance, proportion, color harmony</li>
            </ul>
          </div>
        </div>
      </div>
    ),
  },

  // SLIDE 13: Three fuzzy things
  {
    id: 'fuzzy-things',
    title: 'Three fuzzy things',
    layout: 'content',
    content: (
      <div className="max-w-4xl mx-auto">
        <div className="grid grid-cols-3 gap-6">
          <div className="p-10 bg-gradient-to-br from-rose-50 to-pink-50 rounded-3xl text-center">
            <div className="mb-6 flex justify-center items-center h-24">
              <img src="/icon-style-pillar.svg" alt="Style Pillar" className="w-24 h-24 object-contain" />
            </div>
            <div className="text-2xl font-bold text-gray-900">Style Pillar</div>
          </div>
          <div className="p-10 bg-gradient-to-br from-violet-50 to-purple-50 rounded-3xl text-center">
            <div className="mb-6 flex justify-center items-center h-24">
              <img src="/icon-vibe.svg" alt="Vibe" className="w-24 h-24 object-contain" />
            </div>
            <div className="text-2xl font-bold text-gray-900">Vibe</div>
          </div>
          <div className="p-10 bg-gradient-to-br from-sky-50 to-blue-50 rounded-3xl text-center">
            <div className="mb-6 flex justify-center items-center h-24">
              <img src="/icon-occasion.svg" alt="Occasion" className="w-24 h-24 object-contain" />
            </div>
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
        <div className="bg-gradient-to-r from-rose-50 via-purple-50 to-blue-50 rounded-3xl p-10 my-8">
          <div className="flex flex-wrap justify-center gap-3 text-xl font-semibold text-gray-900">
            <span>Classic</span>
            <span className="text-gray-400">·</span>
            <span>Minimal</span>
            <span className="text-gray-400">·</span>
            <span>Casual</span>
            <span className="text-gray-400">·</span>
            <span>Bohemian</span>
            <span className="text-gray-400">·</span>
            <span>Romantic</span>
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
        <p className="text-xl font-bold text-gray-900 text-center leading-relaxed">
          Nine pillars. Gender-agnostic. Arranged on a continuous spectrum, not discrete buckets.<br />
          Sub-pillars add nuance and fill gaps.
        </p>

        {/* Sub-pillar word cloud */}
        <div className="bg-gray-50 rounded-2xl p-8 mt-12">
          <div className="flex flex-wrap justify-center gap-x-6 gap-y-4 items-center">
            <span className="text-2xl text-gray-700 font-medium">tailored</span>
            <span className="text-base text-gray-500">clean</span>
            <span className="text-xl text-gray-600">relaxed</span>
            <span className="text-lg text-gray-500">flowing</span>
            <span className="text-2xl text-gray-700 font-medium">soft</span>
            <span className="text-base text-gray-500">bold</span>
            <span className="text-xl text-gray-600">urban</span>
            <span className="text-lg text-gray-500">sporty</span>
            <span className="text-2xl text-gray-700 font-medium">functional</span>
            <span className="text-base text-gray-500">sophisticated</span>
            <span className="text-xl text-gray-600">sleek</span>
            <span className="text-lg text-gray-500">effortless</span>
            <span className="text-2xl text-gray-700 font-medium">artistic</span>
            <span className="text-base text-gray-500">delicate</span>
            <span className="text-xl text-gray-600">dramatic</span>
            <span className="text-lg text-gray-500">edgy</span>
            <span className="text-2xl text-gray-700 font-medium">active</span>
            <span className="text-base text-gray-500">practical</span>
            <span className="text-xl text-gray-600">timeless</span>
            <span className="text-lg text-gray-500">modern</span>
            <span className="text-base text-gray-500">comfortable</span>
            <span className="text-2xl text-gray-700 font-medium">eclectic</span>
            <span className="text-lg text-gray-500">feminine</span>
            <span className="text-xl text-gray-600">statement</span>
            <span className="text-base text-gray-500">contemporary</span>
            <span className="text-lg text-gray-500">performance</span>
            <span className="text-2xl text-gray-700 font-medium">rugged</span>
          </div>
        </div>
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
            The emotional register, independent of Pillar. An outfit can be Athletic pillar with a Grunge vibe. Classic pillar with an Elegant vibe. 28 active terms, kept strictly separate from Pillar vocabulary.
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
        <OutfitTaggerDemo />
      </div>
    ),
  },

  // SLIDE 17: The Style Profile
  {
    id: 'style-profile-intro',
    title: 'The Style Profile',
    layout: 'content',
    content: (
      <div className="max-w-4xl mx-auto space-y-10">
        <p className="text-xl text-gray-700 leading-relaxed">
          The foundation was solid. Products as content. AI and CLIP powered outfit building. Tagging at scale. Recipe Scout turning lifestyle images into templates.
        </p>
        <p className="text-xl text-gray-700 leading-relaxed">
          I was looking for the next piece of infrastructure that could help power prototype building. The Playlist personalizes against a customer. That customer needs a profile.
        </p>
        <div className="bg-gradient-to-br from-purple-50 to-pink-50 border-2 border-purple-200 rounded-3xl p-12">
          <p className="text-2xl text-gray-900 font-semibold leading-relaxed">
            Style profiles add a data structure for personalizing prototypes and bring editorial photography into the mix.
          </p>
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
        <div className="grid grid-cols-2 gap-8">
          <div className="bg-green-50 rounded-3xl p-8">
            <div className="text-2xl font-bold text-gray-900 mb-4">What Feeds In</div>
            <div className="space-y-2 text-gray-700">
              <div>• Style Quiz</div>
              <div>• Swipes</div>
              <div>• AI Chat</div>
              <div>• Request a Look forms</div>
              <div>• Saved & edited outfits</div>
              <div>• Clicks & dwell time</div>
            </div>
            <p className="text-lg text-gray-700 mt-6 italic">
              Start with one signal, build from there.
            </p>
          </div>
          <div className="p-8 bg-gradient-to-br from-amber-50 to-orange-50 rounded-3xl">
            <div className="text-2xl font-bold text-gray-900 mb-4">Semantic Memory</div>
            <p className="text-lg text-gray-700 mb-4">Three types of knowledge:</p>
            <div className="space-y-3 text-gray-700">
              <div><strong>Stated</strong> — things they've said directly</div>
              <div><strong>Inferred</strong> — patterns the system noticed</div>
              <div><strong>Life Context</strong> — facts about their life (kids, job, hobbies)</div>
            </div>
            <p className="text-lg text-gray-700 mt-4">
              Each memory shows its source. Customers can push back on what's wrong.
            </p>
            <p className="text-lg text-gray-700 mt-4 font-semibold">
              Never delete. Flag conflicts. Data is precious.
            </p>
          </div>
        </div>
      </div>
    ),
  },

  // SLIDE 19: How the profile learns
  {
    id: 'profile-learns',
    title: 'How the profile learns',
    layout: 'content',
    content: (
      <div className="max-w-6xl mx-auto space-y-8">
        <p className="text-xl text-gray-700 text-center mb-10">
          Three layers working together:
        </p>
        <div className="grid grid-cols-3 gap-6">
          <div className="p-6 bg-gradient-to-r from-blue-50 to-cyan-50 border-2 border-blue-200 rounded-3xl">
            <div className="text-xl font-bold text-gray-900 mb-3">Behavioral Signals</div>
            <p className="text-gray-700 leading-relaxed">
              Deterministic. Every swipe, purchase, and search updates pillar weights by fixed amounts. Fast, consistent, auditable.
            </p>
          </div>
          <div className="p-6 bg-gradient-to-r from-purple-50 to-pink-50 border-2 border-purple-200 rounded-3xl">
            <div className="text-xl font-bold text-gray-900 mb-3">Semantic Brain</div>
            <p className="text-gray-700 leading-relaxed">
              LLM-powered. Reads text events (chat, search queries, stylist notes, RAL forms) and extracts memories, spots patterns, flags conflicts. Temperature 0 — deterministic outputs.
            </p>
          </div>
          <div className="p-6 bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-200 rounded-3xl">
            <div className="text-xl font-bold text-gray-900 mb-3">Synthesizer</div>
            <p className="text-gray-700 leading-relaxed">
              Merges both. Updates the profile state. Applies recency decay. Never overwrites history.
            </p>
          </div>
        </div>
      </div>
    ),
  },

  // SLIDE 20: What got built
  {
    id: 'conclusion',
    title: 'What got built',
    layout: 'content',
    content: (
      <div className="max-w-4xl mx-auto space-y-10">
        <p className="text-xl text-gray-700 leading-relaxed">
          Started with a simple goal: populate the Playlist with dummy data for a contest entry.
        </p>
        <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-3xl p-12 space-y-6">
          <div className="space-y-4 text-lg text-gray-700">
            <p>• <strong>49,000 products</strong> organized and tagged as content</p>
            <p>• <strong>42,000+ outfits</strong> generated with CLIP-powered visual compatibility</p>
            <p>• <strong>Style taxonomy</strong> with 9 pillars, sub-styles, vibes, and occasions</p>
            <p>• <strong>Recipe Scout</strong> extracting outfit templates from lifestyle photography</p>
            <p>• <strong>Style profiles</strong> that learn from minimal customer signals</p>
          </div>
        </div>
        <p className="text-2xl font-bold text-gray-900 text-center pt-6">
          Infrastructure for building prototypes that feel real.
        </p>
      </div>
    ),
  },

  // SLIDE 21: Try it yourself
  {
    id: 'profile-demo',
    title: 'Try it yourself',
    layout: 'content',
    content: (
      <div className="max-w-4xl mx-auto space-y-10 text-center">
        <p className="text-xl text-gray-700 leading-relaxed">
          The style profile is still a work in progress, but you can explore what's built so far. There are two ways to experience it: explore nine pre-built personas with months of interaction history, or build your own profile from scratch by swiping through outfits. Either way, you'll see how the system learns and adapts in real time.
        </p>
        <div className="pt-8">
          <a
            href="/demo"
            className="inline-flex items-center gap-3 px-10 py-5 bg-black text-white text-xl font-semibold rounded-2xl hover:bg-gray-800 transition-all hover:scale-105"
          >
            Launch Demo
            <span className="text-2xl">→</span>
          </a>
        </div>
      </div>
    ),
  },
];
