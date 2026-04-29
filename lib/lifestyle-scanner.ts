/**
 * Lifestyle Image Scanner
 * Core scanning logic with Gemini API
 */

import { jsonrepair } from 'jsonrepair';
import type { LifestyleImage, ImageSource } from './lifestyle-image-types';

const GEMINI_MODEL = 'gemini-2.5-flash';
const TEMPERATURE = 0.2;
const MAX_TOKENS = 4096; // Increased to reduce truncation (2048 was still causing truncation)

// Retry configuration (production-hardened)
const MAX_RETRIES = 3;
const RETRY_DELAY = 5000; // 5 seconds between retries

// Image optimization (reduce payload size)
const OPTIMIZED_IMAGE_WIDTH = 800; // 800px is sufficient for AI vision analysis

/**
 * System prompt for lifestyle image analysis
 * This is the exact prompt from LIFESTYLE-IMAGE-SCAN-SPEC-v1.md
 */
const SYSTEM_PROMPT = `You are an expert fashion analyst tagging lifestyle images for a style personalization system.
Your task is to analyze the complete outfit shown in this image and return a structured JSON tag object.

CRITICAL INSTRUCTIONS:
- Analyze the OUTFIT as a whole — the gestalt look — not individual products.
- Use ONLY the controlled vocabulary provided. Do not invent terms.
- Return ONLY a valid JSON object. No markdown fences, no preamble, no explanation outside the JSON.
- If a field cannot be determined, use null (strings), [] (arrays), or 0.0 (numbers) as specified.

---

STYLE PILLAR SPECTRUM
Assign exactly one. These are ordered on a continuous aesthetic spectrum:
Classic (0.0) → Minimal (1.0) → Romantic (2.0) → Bohemian (3.0) → Maximal (4.0) → Streetwear (5.0) → Utility (6.0) → Athletic (7.0) → Casual (8.0)

Pillar definitions:
- Classic: Timeless, structured, heritage-coded. Blazers, trench coats, clean trousers, leather loafers. Zero trend-dependence.
- Minimal: Deliberately pared-down. Neutral palette, architectural cuts, quality-forward. Reduction as aesthetic intent.
- Romantic: Emotionally expressive, ornamental dressing. Florals, lace, ruffled details, delicate beauty. Menswear: floral prints, pleated shirt details, soft tailoring.
- Bohemian: Free-spirited, earthen, globally-influenced. Flowing fabrics, layering, natural textures, artisanal details.
- Maximal: More is more. Bold print, high color saturation, layered accessories, clashing patterns, theatrical scale.
- Streetwear: Urban, culturally-coded, attitude-driven. Oversized silhouettes, logo-forward, dark palette, sneaker-anchored. Includes edgy, tomboy, urban.
- Utility: Function-first with aesthetic intent. Cargo, technical, workwear, military heritage. Structure and pockets.
- Athletic: Performance-adjacent or sport-coded even outside sport context. Technical fabrics, athletic silhouettes, sport branding.
- Casual: Unfussy, relaxed, everyday. Jeans, T-shirts, simple cuts. Comfort-first without a technical or sport coding.

TIEBREAKER — when two pillars compete:
1. Identify the outfit's anchor piece (most visual weight / style intent)
2. Check silhouette signals: tailored → Classic/Minimal; draped/layered → Bohemian/Casual; technical → Athletic/Utility; volume/print → Maximal; dark/oversized → Streetwear
3. Athletic vs Casual split test: strip sport context — does it read urban/editorial (Athletic) or clean/everyday (Casual)?
4. Prefer the more specific pillar when still tied

SPECTRUM COORDINATE
Assign a float at the pillar's anchor value (e.g., 3.0 for pure Bohemian) or drift toward adjacent pillar (e.g., 3.7 for Bohemian leaning Maximal). One decimal place. Range: 0.0–8.8.

SUB-TERM (use exactly one, or null)
Timeless Classic, Sophisticated, Polished, Dressy, Chic, Classic Chic, Tailored, Timeless, Menswear-inspired, Nautical, Preppy, Heritage, Modern Minimal, Sleek, Modern, Monochromatic, Elegant, Architectural, Refined, Understated, Romantic Minimal, Effortless Romantic, Ladylike, Delicate, Ethereal, Dandy, Feminine, Whimsical, Free-spirited, Natural, Hippie, Worldly, Vintage-inspired, Beachy, Artisanal, Eclectic, Artistic, Tropical, Daring Maximal, Vibrant, Exotic, Bold, Quirky, Glam, Streetwear, Urban, Edgy, Tomboy, Military, Utility Streetwear, Workwear, Utility Workwear, Rugged, Safari, Outdoorsy, Western, Street Sport, Performance, Club Sport, Athleisure, Sporty Casual, Pragmatic Casual, Smart Casual, Relaxed Classic

CRITICAL SUB-TERM CLARIFICATIONS:
- Dandy (2.3) = Menswear Romantic. Use for floral prints, ruffled shirts, soft tailoring on men.
- Beachy (3.1) = Natural, sun-bleached, organic coastal. NOT vibrant.
- Tropical (3.8) = Saturated, graphic tropical prints. Hot pink, cobalt, lime.
- Smart Casual (8.6) = Formality level, not aesthetic. Describes elevated Casual or relaxed Classic.

VIBES (1–3 terms only)
Fresh, Bold, Confident, Understated, Playful, Dreamy, Edgy, Polished, Relaxed, Effortless, Romantic, Dramatic, Earthy, Vibrant, Mysterious, Minimal, Luxe, Sporty, Intellectual, Whimsical, Nostalgic, Coastal, Maximalist, Urban, Wanderlust, Artsy, Sophisticated, Timeless

OCCASIONS (1–4 terms, only what is visually evident)
Everyday Casual, Brunch, Date Night, Girls Night Out, Casual Dinner, Work From Home, Office Casual, Business Professional, Business Meeting, Wedding Guest, Cocktail Party, Black Tie, Graduation, Baby Shower, Beach, Pool, Vacation, Resort, Festival, Concert, Farmers Market, Hiking, Running, Gym, Yoga, Golf, Tennis, Ski, Snowboard, Travel, City Exploring, Weekend Errands, School, Night Out

FORMALITY LEVEL (1.0–10.0)
1.0–2.5: Athletic/loungewear | 2.5–4.0: Casual | 4.0–5.5: Smart casual | 5.5–7.0: Business casual/cocktail-adjacent | 7.0–8.5: Formal/evening | 8.5–10.0: Black tie

SEASON — spring | summer | fall | winter | all-season (one or more)
GENDER — womenswear | menswear | unisex

QUALITY SCORE (0.0–1.0, average of 4 dimensions at 0.25 each)
1. Lighting: clean/accurate (1.0) → flat/mixed (0.5) → dark/distorted (0.0)
2. Composition: subject clear (1.0) → some noise (0.5) → cluttered/unclear (0.0)
3. Outfit legibility: all items readable (1.0) → partially obscured (0.5) → key items hidden (0.0)
4. Style clarity: pillar obvious (1.0) → inferrable (0.5) → ambiguous (0.0)

DISPLAY SUITABILITY FLAGS
Apply exactly:
- styleProfileReady: false if isCompleteOutfit=false OR pillarConfidence<0.4 OR any hard disqualifier
- styleQuizReady: false if pillarConfidence<0.4 OR qualityScore<0.5 OR isCompleteOutfit=false OR any hard disqualifier
- styleSwipeReady: false if qualityScore<0.5 OR non_retail_aesthetic OR any hard disqualifier
Hard disqualifiers (set ALL flags false): no_person_visible, explicit_or_inappropriate, non_fashion_content, image_too_small_or_corrupt
Other reasons to include in disqualifyingReasons: incomplete_outfit, low_pillar_confidence, cluttered_composition, non_retail_aesthetic

RECIPE GENERATION CANDIDATE
true if: isCompleteOutfit=true AND visibleItemCount>=2 AND pillarConfidence>=0.5 AND no hard disqualifiers

BRAND ADHERENCE (Nordstrom aesthetic alignment — ranking signal 0-100)
Nordstrom's brand is defined by: intentional composition, human warmth and connection, tactile quality, confident but approachable aesthetic, and modern elegance. Their imagery ranges from clean studio shots to bold color-flooded backgrounds — what unifies them is that every image looks ART DIRECTED and feels WARM and HUMAN and is shot in ELEVATED LOCATIONS.

Score HIGH (70-100) if:
- Deliberately composed — someone made intentional visual decisions
- Warm in tone — flattering light, rich or neutral color palette
- Human and present — subject feels real, connected, expressive
- Confident — the image has a point of view
- Fashion-forward but wearable
- ELEVATED LOCATION — clean studio, city/urban settings (brick walls, concrete, graffiti OK), modern architecture, well-maintained environments

Score MEDIUM (40-69) if:
- Competent but generic — could be any mid-tier retailer
- Slightly cold or impersonal
- Background present but not distracting
- Acceptable quality but nothing distinctive
- LOCATION DEDUCTS POINTS: Overly cluttered or distracting backgrounds that compete with the subject

Score LOW (0-39) if:
- Generic stock photo — anonymous, impersonal, no brand point of view
- Chaotic or cluttered background competing with subject
- Cold, clinical, or harsh lighting
- Poor technical quality
- Overly posed or stiff
- CHEAP LOCATION — dilapidated/abandoned buildings, broken/crumbling settings, peeling paint, decay, "snuck into abandoned warehouse" aesthetic (this looks low-end even if technically well-shot)

Return ONLY this JSON:
{
  "outfitAnalysis": {
    "stylePillar": "",
    "subTerm": null,
    "spectrumCoordinate": 0.0,
    "pillarConfidence": 0.0,
    "vibes": [],
    "occasions": [],
    "formalityLevel": 0.0,
    "season": [],
    "gender": "",
    "isCompleteOutfit": true,
    "visibleItemCount": 0,
    "reasoning": ""
  },
  "displaySuitability": {
    "styleProfileReady": true,
    "styleQuizReady": true,
    "styleSwipeReady": true,
    "qualityScore": 0.0,
    "disqualifyingReasons": []
  },
  "brandAdherence": {
    "score": 0,
    "reasoning": "",
    "hasHumanSubject": true,
    "backgroundType": "studio-clean",
    "imageTone": "warm",
    "isArtDirected": true
  },
  "recipeGenerationCandidate": true
}`;

/**
 * Optimize image URL by reducing width to 800px
 * Reduces payload size while maintaining sufficient quality for AI analysis
 */
function optimizeImageUrl(url: string): string {
  try {
    const urlObj = new URL(url);

    // Pexels optimization
    if (url.includes('pexels.com')) {
      urlObj.searchParams.set('w', OPTIMIZED_IMAGE_WIDTH.toString());
      urlObj.searchParams.set('dpr', '1');
      urlObj.searchParams.delete('auto');
      return urlObj.toString();
    }

    // Unsplash optimization
    if (url.includes('unsplash.com')) {
      urlObj.searchParams.set('w', OPTIMIZED_IMAGE_WIDTH.toString());
      urlObj.searchParams.set('q', '80'); // Good quality
      urlObj.searchParams.delete('fm'); // Remove format constraints
      return urlObj.toString();
    }

    // For other URLs, return as-is (already optimized or custom CDN)
    return url;
  } catch (error) {
    // If URL parsing fails, return original
    return url;
  }
}

/**
 * Fetch image from URL and convert to base64
 * Optimizes image size before fetching
 */
async function fetchImageAsBase64(imageUrl: string): Promise<string> {
  const optimizedUrl = optimizeImageUrl(imageUrl);

  const response = await fetch(optimizedUrl);
  if (!response.ok) {
    throw new Error(`Failed to fetch image: ${response.statusText}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  const base64 = Buffer.from(arrayBuffer).toString('base64');
  return base64;
}

/**
 * Sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Call Gemini API with retry logic and exponential backoff
 */
async function callGeminiWithRetry(
  apiKey: string,
  imageData: string,
  retryCount = 0
): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: SYSTEM_PROMPT },
              {
                inline_data: {
                  mime_type: 'image/jpeg',
                  data: imageData,
                },
              },
            ],
          },
        ],
        generationConfig: {
          temperature: TEMPERATURE,
          maxOutputTokens: MAX_TOKENS,
        },
      }),
    });

    // Handle rate limiting (429) and server errors (5xx) with retry
    if (response.status === 429 || response.status >= 500) {
      if (retryCount < MAX_RETRIES) {
        const delay = RETRY_DELAY * Math.pow(2, retryCount); // Exponential backoff
        console.warn(
          `⏳ Gemini API ${response.status} error, retrying in ${delay / 1000}s... (attempt ${retryCount + 1}/${MAX_RETRIES})`
        );
        await sleep(delay);
        return callGeminiWithRetry(apiKey, imageData, retryCount + 1);
      }
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Gemini API error (${response.status}):`, errorText);
      throw new Error(`Gemini API error (${response.status}): ${errorText.substring(0, 200)}`);
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) {
      console.error('Empty response from Gemini. Full response:', JSON.stringify(data, null, 2));
      throw new Error('Empty response from Gemini');
    }

    // Log response length for debugging
    console.log(`Gemini response received: ${text.length} characters`);

    return text;
  } catch (error) {
    // Handle network errors with retry
    if (retryCount < MAX_RETRIES && error instanceof Error && error.message.includes('fetch')) {
      const delay = RETRY_DELAY * Math.pow(2, retryCount); // Exponential backoff
      console.warn(
        `⏳ Network error, retrying in ${delay / 1000}s... (attempt ${retryCount + 1}/${MAX_RETRIES})`
      );
      await sleep(delay);
      return callGeminiWithRetry(apiKey, imageData, retryCount + 1);
    }
    throw error;
  }
}

/**
 * Scan a lifestyle image using Gemini Vision API
 * Includes: retry logic, exponential backoff, image optimization
 */
export async function scanLifestyleImage(
  imageUrl: string,
  imageId: string,
  source: ImageSource,
  base64Data?: string
): Promise<LifestyleImage> {
  const apiKey = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY not configured');
  }

  // Get base64 image data (optimized for 800px width)
  let imageData = base64Data;
  if (!imageData) {
    imageData = await fetchImageAsBase64(imageUrl);
  }

  // Call Gemini API with retry logic
  const text = await callGeminiWithRetry(apiKey, imageData);

  // Parse JSON response
  let parsedResponse;
  try {
    parsedResponse = parseGeminiResponse(text);
  } catch (parseError) {
    // Retry once on parse failure
    console.warn('First parse attempt failed, retrying...', parseError);
    try {
      parsedResponse = parseGeminiResponse(text);
    } catch (secondError) {
      throw new Error(`Failed to parse Gemini response after 2 attempts: ${secondError}`);
    }
  }

  // Validate response structure - require at least outfitAnalysis
  if (!parsedResponse.outfitAnalysis) {
    console.error('========================================');
    console.error('INVALID GEMINI RESPONSE - Missing outfitAnalysis');
    console.error('Parsed response keys:', Object.keys(parsedResponse));
    console.error('Full parsed response:', JSON.stringify(parsedResponse, null, 2));
    console.error('========================================');
    throw new Error('Invalid response structure from Gemini - missing outfitAnalysis');
  }

  // Handle truncated responses (Gemini hit output limit)
  if (!parsedResponse.displaySuitability) {
    console.warn('⚠️ Truncated Gemini response - using defaults for missing displaySuitability');
    parsedResponse.displaySuitability = {
      styleProfileReady: true,
      styleQuizReady: true,
      styleSwipeReady: true,
      qualityScore: 0.7,
      disqualifyingReasons: ['truncated_response'],
    };
  }

  // Brand adherence is optional (fallback if not provided)
  if (!parsedResponse.brandAdherence) {
    console.warn('⚠️ Truncated Gemini response - using defaults for missing brandAdherence');
    parsedResponse.brandAdherence = {
      score: 50,
      reasoning: 'Not evaluated (truncated response)',
      hasHumanSubject: true,
      backgroundType: 'lifestyle-controlled',
      imageTone: 'neutral',
      isArtDirected: false,
    };
  }

  // Recipe generation candidate - default to true if missing
  if (parsedResponse.recipeGenerationCandidate === undefined) {
    console.warn('⚠️ Missing recipeGenerationCandidate, defaulting to true');
    parsedResponse.recipeGenerationCandidate = true;
  }

  // Build complete LifestyleImage object
  const lifestyleImage: LifestyleImage = {
    imageId,
    source,
    imageUrl,
    outfitAnalysis: parsedResponse.outfitAnalysis,
    displaySuitability: parsedResponse.displaySuitability,
    brandAdherence: parsedResponse.brandAdherence,
    recipeGenerationCandidate: parsedResponse.recipeGenerationCandidate,
    taggedAt: new Date().toISOString(),
    status: 'complete',
  };

  return lifestyleImage;
}

/**
 * Parse Gemini response text to JSON
 * Strips markdown fences and extracts JSON object
 */
function parseGeminiResponse(text: string): {
  outfitAnalysis: LifestyleImage['outfitAnalysis'];
  displaySuitability: LifestyleImage['displaySuitability'];
  brandAdherence: LifestyleImage['brandAdherence'];
  recipeGenerationCandidate: boolean;
} {
  let jsonStr = text.trim();

  // Strip markdown code blocks
  if (jsonStr.startsWith('```')) {
    jsonStr = jsonStr.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  }

  // Extract JSON if there's surrounding text
  const firstBrace = jsonStr.indexOf('{');
  const lastBrace = jsonStr.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    jsonStr = jsonStr.substring(firstBrace, lastBrace + 1);
  }

  // Try parsing with jsonrepair first (handles most malformations)
  try {
    const repairedJson = jsonrepair(jsonStr);
    const parsed = JSON.parse(repairedJson);
    return parsed;
  } catch (repairError) {
    // jsonrepair failed, try manual cleaning
  }

  // Fallback: Clean common JSON issues from Gemini manually
  jsonStr = cleanGeminiJson(jsonStr);

  try {
    return JSON.parse(jsonStr);
  } catch (parseError) {
    // Log the problematic JSON for debugging
    console.error('========================================');
    console.error('GEMINI JSON PARSE ERROR (after jsonrepair + manual cleaning)');
    console.error('Error:', parseError instanceof Error ? parseError.message : parseError);
    console.error('Problematic JSON (first 1000 chars):');
    console.error(jsonStr.substring(0, 1000));
    if (jsonStr.length > 1000) {
      console.error(`... (${jsonStr.length - 1000} more characters)`);
    }
    console.error('========================================');
    throw parseError;
  }
}

/**
 * Clean common JSON issues from Gemini responses
 * Multiple passes to handle various malformation patterns
 */
function cleanGeminiJson(jsonStr: string): string {
  // Remove trailing commas before closing brackets/braces
  jsonStr = jsonStr.replace(/,(\s*[}\]])/g, '$1');

  // Fix missing commas between array elements: "item1" "item2" -> "item1", "item2"
  jsonStr = jsonStr.replace(/"(\s+)"/g, '", "');

  // Fix missing commas after closing brackets/braces followed by opening ones
  jsonStr = jsonStr.replace(/](\s*)\[/g, '], [');
  jsonStr = jsonStr.replace(/}(\s*){/g, '}, {');

  // Fix missing commas between array elements (value followed by value)
  jsonStr = jsonStr.replace(/](\s+)"/g, '], "');
  jsonStr = jsonStr.replace(/"(\s+)\[/g, '", [');

  // Fix missing commas after string values before property names
  jsonStr = jsonStr.replace(/"(\s+)([a-zA-Z_][a-zA-Z0-9_]*):/g, '", "$2":');

  // Fix unquoted property names (more aggressive pattern)
  // Match: word characters followed by colon, not already quoted
  jsonStr = jsonStr.replace(/([{,]\s*)([a-zA-Z_][a-zA-Z0-9_]*)(\s*):/g, '$1"$2"$3:');

  // Remove comments (// or /* */)
  jsonStr = jsonStr.replace(/\/\/[^\n]*/g, '');
  jsonStr = jsonStr.replace(/\/\*[\s\S]*?\*\//g, '');

  // Fix single quotes to double quotes for property names
  jsonStr = jsonStr.replace(/'([^']*?)':/g, '"$1":');

  // Remove control characters except newlines (which should already be in strings)
  jsonStr = jsonStr.replace(/[\x00-\x09\x0B-\x1F\x7F]/g, '');

  // Fix unterminated strings by escaping internal quotes
  // This is tricky - look for quotes followed by non-quote characters then a newline
  // jsonStr = jsonStr.replace(/"([^"]*)\n([^"]*?)"/g, '"$1\\n$2"');

  // Second pass: catch any remaining trailing commas
  jsonStr = jsonStr.replace(/,(\s*[}\]])/g, '$1');

  return jsonStr;
}
