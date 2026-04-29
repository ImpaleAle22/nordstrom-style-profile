"use strict";
/**
 * Main Outfit Composer API
 *
 * Orchestrates the complete outfit composition pipeline:
 * 1. Fetch recipe from Sanity
 * 2. Generate combinations with Claude
 * 3. Validate hard rules
 * 4. Score soft rules
 * 5. Filter by confidence threshold
 * 6. Return ranked outfits
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.composeOutfits = composeOutfits;
const sanity_client_1 = require("./sanity-client");
const claude_api_1 = require("./claude-api");
const scoring_1 = require("./scoring");
const outfit_building_rules_1 = require("../../recipe-builder/lib/outfit-building-rules");
/**
 * Validate outfit items against hard rules
 */
function validateOutfit(items) {
    const slots = items.map((item) => ({
        role: item.role,
    }));
    const result = (0, outfit_building_rules_1.validateOutfitRecipe)({ slots });
    return {
        valid: result.valid,
        errors: result.errors,
    };
}
/**
 * Main compose function
 */
async function composeOutfits(request) {
    const startTime = Date.now();
    try {
        console.log(`\n🎨 Starting outfit composition for recipe: ${request.recipeId}`);
        console.log(`   Customer: ${request.customerSignals.gender}, ${request.customerSignals.season}`);
        // 1. Fetch recipe from Sanity
        console.log('\n📦 Fetching recipe from Sanity...');
        const recipe = await (0, sanity_client_1.fetchOutfitRecipe)(request.recipeId);
        if (!recipe) {
            return {
                success: false,
                outfits: [],
                metadata: {
                    recipeTitle: 'Unknown',
                    totalCombinationsEvaluated: 0,
                    processingTimeMs: Date.now() - startTime,
                },
                error: `Recipe ${request.recipeId} not found`,
            };
        }
        console.log(`✅ Found recipe: "${recipe.title}" (${recipe.slots.length} slots)`);
        // Check if recipe has products in all slots
        const emptySlots = recipe.slots.filter((s) => !s.ingredientSet?.products.length);
        if (emptySlots.length > 0) {
            return {
                success: false,
                outfits: [],
                metadata: {
                    recipeTitle: recipe.title,
                    totalCombinationsEvaluated: 0,
                    processingTimeMs: Date.now() - startTime,
                },
                error: `Recipe has ${emptySlots.length} empty ingredient sets`,
            };
        }
        // 2. Generate outfit combinations with Claude
        const maxOutfits = request.maxOutfits || 5;
        const generatedOutfits = await (0, claude_api_1.generateOutfits)(recipe, request.customerSignals, maxOutfits);
        console.log(`\n🔍 Evaluating ${generatedOutfits.length} generated outfits...`);
        // 3. Validate and score each outfit
        const evaluatedOutfits = [];
        let validCount = 0;
        let invalidCount = 0;
        for (let i = 0; i < generatedOutfits.length; i++) {
            const generated = generatedOutfits[i];
            const outfitId = `${recipe.recipeId}_outfit_${Date.now()}_${i + 1}`;
            // Validate hard rules
            const validation = validateOutfit(generated.items);
            if (!validation.valid) {
                console.log(`   ❌ Outfit ${i + 1}: INVALID - ${validation.errors.join(', ')}`);
                invalidCount++;
                continue;
            }
            // Score soft rules
            const products = generated.items.map((item) => item.product);
            const evaluation = (0, scoring_1.evaluateOutfit)(products, recipe.theme, request.customerSignals);
            evaluatedOutfits.push({
                outfitId,
                recipeId: recipe.recipeId,
                items: generated.items,
                confidenceScore: evaluation.confidenceScore,
                poolTier: evaluation.poolTier,
                scoreBreakdown: evaluation.breakdown,
                aiReasoning: generated.reasoning,
            });
            validCount++;
            console.log(`   ✅ Outfit ${i + 1}: ${evaluation.confidenceScore}/100 (${evaluation.poolTier}) - ` +
                `Style: ${evaluation.breakdown.styleRegisterCoherence}, ` +
                `Color: ${evaluation.breakdown.colorHarmony}, ` +
                `Silhouette: ${evaluation.breakdown.silhouetteBalance}`);
        }
        // 4. Filter by minimum confidence threshold
        const minConfidence = request.minConfidence || 50;
        const filteredOutfits = evaluatedOutfits.filter((outfit) => outfit.confidenceScore >= minConfidence);
        console.log(`\n📊 Results: ${validCount} valid, ${invalidCount} invalid, ` +
            `${filteredOutfits.length} above threshold (${minConfidence})`);
        // 5. Sort by confidence score (highest first)
        filteredOutfits.sort((a, b) => b.confidenceScore - a.confidenceScore);
        const processingTime = Date.now() - startTime;
        console.log(`⏱️  Completed in ${processingTime}ms\n`);
        return {
            success: true,
            outfits: filteredOutfits,
            metadata: {
                recipeTitle: recipe.title,
                totalCombinationsEvaluated: generatedOutfits.length,
                processingTimeMs: processingTime,
            },
        };
    }
    catch (error) {
        const processingTime = Date.now() - startTime;
        console.error('❌ Composition failed:', error);
        return {
            success: false,
            outfits: [],
            metadata: {
                recipeTitle: 'Error',
                totalCombinationsEvaluated: 0,
                processingTimeMs: processingTime,
            },
            error: error instanceof Error ? error.message : 'Unknown error',
        };
    }
}
//# sourceMappingURL=composer.js.map