"use strict";
/**
 * Type definitions for Outfit Composer Service
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.CONFIDENCE_THRESHOLDS = exports.DEFAULT_SCORING_WEIGHTS = exports.SCORE_THRESHOLDS = exports.DEFAULT_ALIGNMENT_WEIGHTS = exports.DEFAULT_QUALITY_WEIGHTS = void 0;
exports.DEFAULT_QUALITY_WEIGHTS = {
    colorHarmony: 0.35,
    styleCoherence: 0.30,
    silhouetteBalance: 0.25,
    generalFashionability: 0.10,
};
exports.DEFAULT_ALIGNMENT_WEIGHTS = {
    ingredientFidelity: 0.00, // DISABLED: Only 48% of products have materials (unreliable)
    queryRelevance: 1.00, // PRIMARY: Do products match search queries? (CLIP semantic similarity)
    seasonMatching: 0.00, // Season is emergent from outfit, not prescribed
    brandMatching: 0.00, // Brands are suggestions, not requirements
};
/**
 * Score thresholds for classification
 */
exports.SCORE_THRESHOLDS = {
    quality: {
        high: 70,
        medium: 50,
    },
    alignment: {
        high: 70, // Lowered from 80: CLIP scores of 70+ indicate good semantic match
        medium: 55, // Lowered from 60: More forgiving for variety
    },
};
/** @deprecated Use DEFAULT_QUALITY_WEIGHTS instead */
exports.DEFAULT_SCORING_WEIGHTS = {
    styleRegisterCoherence: 0.25,
    colorHarmony: 0.25,
    silhouetteBalance: 0.20,
    occasionAlignment: 0.15,
    seasonFabricWeight: 0.15,
};
/** @deprecated Use SCORE_THRESHOLDS instead */
exports.CONFIDENCE_THRESHOLDS = {
    primary: 75,
    secondary: 50,
    suppress: 0,
};
//# sourceMappingURL=types.js.map