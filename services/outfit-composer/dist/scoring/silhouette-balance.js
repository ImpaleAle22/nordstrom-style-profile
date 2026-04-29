"use strict";
/**
 * Silhouette & Proportion Balance Scoring
 *
 * Evaluates whether outfit has balanced proportions.
 * Part 2.6 of OUTFIT-BUILDING-RULES.md
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.inferSilhouette = inferSilhouette;
exports.scoreSilhouetteBalance = scoreSilhouetteBalance;
exports.analyzeSilhouetteBalance = analyzeSilhouetteBalance;
const FITTED_KEYWORDS = [
    'fitted', 'slim', 'skinny', 'bodycon', 'tailored', 'narrow', 'tight',
    'form-fitting', 'figure-hugging', 'contoured'
];
const RELAXED_KEYWORDS = [
    'relaxed', 'regular', 'classic fit', 'straight', 'comfortable', 'easy fit'
];
const OVERSIZED_KEYWORDS = [
    'oversized', 'boxy', 'baggy', 'wide leg', 'loose', 'roomy', 'boyfriend',
    'slouchy', 'voluminous', 'full'
];
const STRUCTURED_KEYWORDS = [
    'structured', 'tailored', 'blazer', 'formal', 'crisp', 'stiff'
];
const FLOWY_KEYWORDS = [
    'flowy', 'drape', 'flowing', 'fluid', 'soft', 'billowy', 'floaty',
    'a-line', 'swing', 'trapeze'
];
/**
 * Infer silhouette category from product
 */
function inferSilhouette(product) {
    const searchText = [
        product.title,
        product.productType3,
        product.productType4,
        product.silhouette,
    ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
    // Check keywords in priority order
    if (OVERSIZED_KEYWORDS.some((kw) => searchText.includes(kw)))
        return 'oversized';
    if (FITTED_KEYWORDS.some((kw) => searchText.includes(kw)))
        return 'fitted';
    if (FLOWY_KEYWORDS.some((kw) => searchText.includes(kw)))
        return 'flowy';
    if (STRUCTURED_KEYWORDS.some((kw) => searchText.includes(kw)))
        return 'structured';
    if (RELAXED_KEYWORDS.some((kw) => searchText.includes(kw)))
        return 'relaxed';
    return 'unknown';
}
/**
 * Check if top/bottom silhouette pairing is balanced
 *
 * Rules from OUTFIT-BUILDING-RULES.md:
 * - Oversized top → Slim/fitted bottom (good)
 * - Fitted top → Wide/oversized bottom (good)
 * - Oversized top + Oversized bottom (bad)
 * - Fitted top + Fitted bottom (acceptable)
 */
function isSilhouetteBalanced(top, bottom) {
    // Good pairings: opposite volumes
    if (top === 'oversized' && (bottom === 'fitted' || bottom === 'structured'))
        return true;
    if ((top === 'fitted' || top === 'structured') && (bottom === 'oversized' || bottom === 'flowy'))
        return true;
    // Good: structured + relaxed
    if (top === 'structured' && bottom === 'relaxed')
        return true;
    if (top === 'relaxed' && bottom === 'structured')
        return true;
    // Acceptable: both fitted or both relaxed
    if (top === 'fitted' && bottom === 'fitted')
        return true;
    if (top === 'relaxed' && bottom === 'relaxed')
        return true;
    // Bad: both oversized/voluminous
    if (top === 'oversized' && bottom === 'oversized')
        return false;
    if (top === 'flowy' && bottom === 'flowy')
        return false;
    // Unknown combinations: give benefit of doubt
    if (top === 'unknown' || bottom === 'unknown')
        return true;
    return true; // default to acceptable
}
/**
 * Score silhouette balance across outfit (0-100)
 */
function scoreSilhouetteBalance(products) {
    if (products.length === 0)
        return 0;
    if (products.length === 1)
        return 100;
    // Identify tops and bottoms (or one-piece)
    const tops = products.filter((p) => p.productType1 === 'Tops' ||
        p.productType1 === 'Outerwear' ||
        p.productType1 === 'Jacket/Sportcoat');
    const bottoms = products.filter((p) => p.productType1 === 'Bottoms' ||
        p.productType1 === 'Dresses' ||
        p.productType1 === 'Jumpsuits/Coveralls');
    // If we have both tops and bottoms, check balance
    if (tops.length > 0 && bottoms.length > 0) {
        const topSilhouette = inferSilhouette(tops[0]);
        const bottomSilhouette = inferSilhouette(bottoms[0]);
        const balanced = isSilhouetteBalanced(topSilhouette, bottomSilhouette);
        if (balanced) {
            // Check for excellent balance (opposite volumes)
            if ((topSilhouette === 'oversized' && bottomSilhouette === 'fitted') ||
                (topSilhouette === 'fitted' && bottomSilhouette === 'oversized')) {
                return 100; // Perfect proportion balance
            }
            return 85; // Good balance
        }
        else {
            return 30; // Poor balance (both oversized/voluminous)
        }
    }
    // One-piece garment: always balanced
    if (bottoms.some((p) => p.productType1 === 'Dresses' || p.productType1 === 'Jumpsuits/Coveralls')) {
        return 95;
    }
    // Insufficient data to evaluate
    return 50;
}
/**
 * Get detailed silhouette analysis for debugging
 */
function analyzeSilhouetteBalance(products) {
    const silhouettes = products.map((p) => ({
        product: `${p.brand} ${p.title}`,
        category: p.productType1 || 'Unknown',
        silhouette: inferSilhouette(p),
    }));
    const balanceScore = scoreSilhouetteBalance(products);
    let assessment = '';
    if (balanceScore >= 95) {
        assessment = 'Excellent - perfect proportion balance';
    }
    else if (balanceScore >= 80) {
        assessment = 'Good - balanced silhouettes';
    }
    else if (balanceScore >= 50) {
        assessment = 'Acceptable - insufficient data to evaluate';
    }
    else {
        assessment = 'Poor - both top and bottom are oversized/voluminous';
    }
    return { silhouettes, balanceScore, assessment };
}
//# sourceMappingURL=silhouette-balance.js.map