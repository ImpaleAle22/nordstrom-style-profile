"use strict";
/**
 * Color Harmony Scoring
 *
 * Evaluates color compatibility across outfit items.
 * Part 2.2 of OUTFIT-BUILDING-RULES.md
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.isNeutral = isNeutral;
exports.getPrimaryColor = getPrimaryColor;
exports.getAllColors = getAllColors;
exports.scoreColorHarmony = scoreColorHarmony;
exports.analyzeColorHarmony = analyzeColorHarmony;
const NEUTRAL_COLORS = new Set([
    'black', 'white', 'ivory', 'cream', 'off-white', 'off white',
    'beige', 'sand', 'camel', 'tan', 'khaki',
    'taupe', 'stone', 'grey', 'gray', 'charcoal',
    'navy', 'brown',
]);
/**
 * Check if a color is neutral
 */
function isNeutral(color) {
    return NEUTRAL_COLORS.has(color.toLowerCase().trim());
}
/**
 * Extract primary color from product
 */
function getPrimaryColor(product) {
    // Priority: simplifiedColors > dominantColors > vanityColor
    if (product.simplifiedColors && product.simplifiedColors.length > 0) {
        return product.simplifiedColors[0].toLowerCase();
    }
    if (product.dominantColors && product.dominantColors.length > 0) {
        return product.dominantColors[0].toLowerCase();
    }
    if (product.vanityColor) {
        return product.vanityColor.toLowerCase();
    }
    return null;
}
/**
 * Get all colors from product
 */
function getAllColors(product) {
    const colors = new Set();
    if (product.simplifiedColors) {
        product.simplifiedColors.forEach((c) => colors.add(c.toLowerCase()));
    }
    if (product.dominantColors) {
        product.dominantColors.forEach((c) => colors.add(c.toLowerCase()));
    }
    if (product.vanityColor) {
        colors.add(product.vanityColor.toLowerCase());
    }
    return Array.from(colors);
}
/**
 * Check if outfit satisfies monochromatic harmony (single color family)
 */
function isMonochromatic(colors) {
    if (colors.length === 0)
        return false;
    // All colors are same or all are neutrals
    const uniqueNonNeutral = colors.filter((c) => !isNeutral(c));
    return uniqueNonNeutral.length <= 1;
}
/**
 * Check if outfit satisfies neutral anchor harmony (neutrals + one accent)
 */
function isNeutralAnchor(colors) {
    const neutrals = colors.filter(isNeutral);
    const accents = colors.filter((c) => !isNeutral(c));
    // Most items neutral, 0-2 accent colors
    return neutrals.length >= colors.length * 0.5 && accents.length <= 2;
}
/**
 * Check if outfit is all neutrals
 */
function isTonalNeutral(colors) {
    return colors.every(isNeutral);
}
/**
 * Score color harmony across outfit items (0-100)
 *
 * Models (from OUTFIT-BUILDING-RULES.md):
 * - Monochromatic: 100
 * - Tonal neutral (all neutrals): 95
 * - Neutral anchor (neutrals + 1-2 accents): 90
 * - Analogous/complementary (advanced analysis): 80
 * - Mixed but not clashing: 60
 * - Unknown/insufficient data: 50
 * - Clashing: 20
 */
function scoreColorHarmony(products) {
    if (products.length === 0)
        return 0;
    if (products.length === 1)
        return 100;
    const primaryColors = products
        .map(getPrimaryColor)
        .filter((c) => c !== null);
    // Insufficient color data
    if (primaryColors.length === 0) {
        return 50; // neutral score when we can't evaluate
    }
    // Check harmony models
    if (isTonalNeutral(primaryColors))
        return 95;
    if (isMonochromatic(primaryColors))
        return 100;
    if (isNeutralAnchor(primaryColors))
        return 90;
    // Count color diversity
    const uniqueColors = new Set(primaryColors);
    const colorCount = uniqueColors.size;
    // 2-3 colors could be analogous/complementary (we don't have color wheel data yet)
    if (colorCount <= 3) {
        // Give benefit of doubt for small color palettes
        return 75;
    }
    // 4+ colors: likely too busy unless mostly neutrals
    const neutralCount = primaryColors.filter(isNeutral).length;
    const neutralRatio = neutralCount / primaryColors.length;
    if (neutralRatio >= 0.6)
        return 70; // mostly neutral with multiple accents
    if (neutralRatio >= 0.4)
        return 60; // mixed but not terrible
    // Too many non-neutral colors: likely clashing
    return 35;
}
/**
 * Get detailed color harmony analysis for debugging
 */
function analyzeColorHarmony(products) {
    const colors = products.map((p) => ({
        product: `${p.brand} ${p.title}`,
        colors: getAllColors(p),
    }));
    const harmonyScore = scoreColorHarmony(products);
    const primaryColors = products
        .map(getPrimaryColor)
        .filter((c) => c !== null);
    let harmonyModel = 'Unknown';
    let assessment = '';
    if (isTonalNeutral(primaryColors)) {
        harmonyModel = 'Tonal Neutral (all neutrals)';
        assessment = 'Excellent - sophisticated neutral palette';
    }
    else if (isMonochromatic(primaryColors)) {
        harmonyModel = 'Monochromatic';
        assessment = 'Excellent - cohesive single color family';
    }
    else if (isNeutralAnchor(primaryColors)) {
        harmonyModel = 'Neutral Anchor';
        assessment = 'Excellent - neutrals with accent colors';
    }
    else if (harmonyScore >= 70) {
        harmonyModel = 'Analogous/Complementary';
        assessment = 'Good - balanced color palette';
    }
    else if (harmonyScore >= 50) {
        harmonyModel = 'Mixed Palette';
        assessment = 'Acceptable - diverse colors present';
    }
    else {
        harmonyModel = 'Clashing';
        assessment = 'Poor - too many competing colors';
    }
    return { colors, harmonyScore, harmonyModel, assessment };
}
//# sourceMappingURL=color-harmony.js.map