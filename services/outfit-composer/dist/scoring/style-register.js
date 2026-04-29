"use strict";
/**
 * Style Register Coherence Scoring
 *
 * Evaluates whether outfit items maintain consistent style register.
 * Part 2.1 of OUTFIT-BUILDING-RULES.md
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.inferStyleRegister = inferStyleRegister;
exports.areRegistersCompatible = areRegistersCompatible;
exports.scoreStyleRegisterCoherence = scoreStyleRegisterCoherence;
exports.analyzeStyleRegisters = analyzeStyleRegisters;
const STYLE_REGISTER_INDEX = {
    'athletic': 0,
    'casual': 1,
    'smart-casual': 2,
    'business-casual': 3,
    'elevated': 4,
    'formal': 5,
};
const STYLE_KEYWORDS = {
    'athletic': [
        'athletic', 'sport', 'training', 'running', 'gym', 'yoga', 'performance',
        'moisture wicking', 'breathable', 'activewear', 'jogger', 'sweatpant',
        'sweatshirt', 'hoodie', 'sneaker', 'running shoe', 'track'
    ],
    'casual': [
        'casual', 'relaxed', 'everyday', 'weekend', 'denim', 't-shirt', 'tee',
        'jeans', 'chinos', 'flannel', 'sneaker', 'sandal', 'basic', 'graphic',
        'sweatshirt', 'hoodie'
    ],
    'smart-casual': [
        'smart casual', 'business casual', 'blazer', 'chinos', 'khakis',
        'button-up', 'blouse', 'loafer', 'oxford', 'derby', 'mule', 'flat',
        'midi dress', 'sheath', 'cardigan', 'tailored', 'structured'
    ],
    'business-casual': [
        'business casual', 'work', 'office', 'professional', 'tailored',
        'dress pant', 'trouser', 'blazer', 'dress shirt', 'polo', 'pencil skirt',
        'sheath dress', 'pump', 'oxford', 'loafer', 'structured'
    ],
    'elevated': [
        'elevated', 'evening', 'cocktail', 'date night', 'sophisticated',
        'silk', 'satin', 'velvet', 'cashmere', 'leather', 'midi dress', 'maxi dress',
        'heel', 'pump', 'stiletto', 'designer', 'luxury', 'statement'
    ],
    'formal': [
        'formal', 'black tie', 'gown', 'tuxedo', 'ball gown', 'evening gown',
        'cocktail dress', 'suit', 'formal', 'dressy', 'stiletto', 'patent leather',
        'bow tie', 'cufflink', 'formal wear'
    ],
};
/**
 * Infer style register from product attributes
 */
function inferStyleRegister(product) {
    const searchText = [
        product.title,
        product.productType2,
        product.productType3,
        product.occasions?.join(' '),
        product.activityContext?.join(' '),
        product.materials?.join(' '),
    ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
    // Score each register based on keyword matches
    const registerScores = {
        'athletic': 0,
        'casual': 0,
        'smart-casual': 0,
        'business-casual': 0,
        'elevated': 0,
        'formal': 0,
    };
    for (const [register, keywords] of Object.entries(STYLE_KEYWORDS)) {
        for (const keyword of keywords) {
            if (searchText.includes(keyword)) {
                registerScores[register] += 1;
            }
        }
    }
    // Return register with highest score, default to casual
    const topRegister = Object.entries(registerScores).reduce((a, b) => a[1] > b[1] ? a : b)[0];
    return registerScores[topRegister] > 0 ? topRegister : 'casual';
}
/**
 * Check if two style registers are compatible (adjacent ±1 or same)
 */
function areRegistersCompatible(a, b) {
    return Math.abs(STYLE_REGISTER_INDEX[a] - STYLE_REGISTER_INDEX[b]) <= 1;
}
/**
 * Score style register coherence across all outfit items (0-100)
 *
 * - 100: All items in same register
 * - 75-99: All items within ±1 register (compatible)
 * - 50-74: Some items within ±2 (needs bridging element)
 * - 0-49: Major register clash (±3 or more)
 */
function scoreStyleRegisterCoherence(products) {
    if (products.length === 0)
        return 0;
    if (products.length === 1)
        return 100;
    const registers = products.map(inferStyleRegister);
    const registerIndices = registers.map((r) => STYLE_REGISTER_INDEX[r]);
    const minIndex = Math.min(...registerIndices);
    const maxIndex = Math.max(...registerIndices);
    const spread = maxIndex - minIndex;
    // All same register
    if (spread === 0)
        return 100;
    // All within ±1 (compatible)
    if (spread === 1) {
        // Slight penalty for mixing even if compatible
        return 90;
    }
    // Within ±2 (needs bridging, but acceptable)
    if (spread === 2) {
        // Check if there's a bridging element (middle register present)
        const hasMiddle = registerIndices.includes(minIndex + 1);
        return hasMiddle ? 70 : 60;
    }
    // ±3 or more: major clash
    if (spread === 3)
        return 40;
    if (spread >= 4)
        return 20;
    return 50; // fallback
}
/**
 * Get detailed style register analysis for debugging
 */
function analyzeStyleRegisters(products) {
    const registers = products.map((p) => ({
        product: `${p.brand} ${p.title}`,
        register: inferStyleRegister(p),
    }));
    const coherenceScore = scoreStyleRegisterCoherence(products);
    let assessment = '';
    if (coherenceScore >= 90) {
        assessment = 'Excellent coherence - all items in same or adjacent registers';
    }
    else if (coherenceScore >= 70) {
        assessment = 'Good coherence - items compatible with bridging elements';
    }
    else if (coherenceScore >= 50) {
        assessment = 'Moderate coherence - some register mixing present';
    }
    else {
        assessment = 'Poor coherence - major register clash detected';
    }
    return { registers, coherenceScore, assessment };
}
//# sourceMappingURL=style-register.js.map