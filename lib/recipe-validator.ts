/**
 * Recipe Validator
 * Checks recipes for configuration errors that lead to low-alignment outfits
 */

import type { UnifiedRecipe } from './unified-recipe-types';

export interface RecipeViolation {
  recipeId: string;
  recipeTitle: string;
  violationType: 'duplicate-accessory-subtype' | 'invalid-slot-count' | 'missing-footwear' | 'conflicting-garments' | 'invalid-role';
  severity: 'error' | 'warning';
  details: string;
  slots?: string[]; // The problematic slots
  recommendation: string;
}

export interface RecipeValidationReport {
  totalRecipes: number;
  validRecipes: number;
  invalidRecipes: number;
  violations: RecipeViolation[];
  violationsByType: Record<string, number>;
  recipesSummary: Array<{
    recipeId: string;
    recipeTitle: string;
    status: 'valid' | 'has-warnings' | 'has-errors';
    errorCount: number;
    warningCount: number;
  }>;
}

/**
 * Valid outfit roles
 */
const VALID_ROLES = [
  'tops',
  'bottoms',
  'one-piece',
  'outerwear',
  'shoes',
  'accessories',
  'bags',
  'hats',
] as const;

/**
 * Footwear roles (at least one required)
 */
const FOOTWEAR_ROLES = ['shoes'];

/**
 * Accessory sub-types that should not appear twice
 */
const ACCESSORY_SUBTYPES = [
  'sunglasses',
  'glasses',
  'belt',
  'belts',
  'bag',
  'bags',
  'purse',
  'handbag',
  'backpack',
  'tote',
  'clutch',
  'crossbody',
  'shoulder bag',
  'necklace',
  'bracelet',
  'ring',
  'earrings',
  'watch',
  'scarf',
  'hat',
  'cap',
  'beanie',
];

/**
 * Extract potential accessory sub-type from ingredient title or query
 */
function extractAccessorySubtype(ingredientTitle: string, searchQuery: string): string | null {
  const combinedText = `${ingredientTitle} ${searchQuery}`.toLowerCase();

  // Check for known accessory sub-types
  for (const subtype of ACCESSORY_SUBTYPES) {
    if (combinedText.includes(subtype)) {
      return subtype;
    }
  }

  return null;
}

/**
 * Check for duplicate accessory sub-types in recipe
 */
function checkDuplicateAccessorySubtypes(recipe: UnifiedRecipe): RecipeViolation[] {
  const violations: RecipeViolation[] = [];

  if (!recipe.slots || recipe.slots.length === 0) {
    return violations;
  }

  // Map role → accessory sub-types
  const accessorySlots = recipe.slots.filter(
    (slot) => slot.role === 'accessories' || slot.role === 'bags' || slot.role === 'hats'
  );

  if (accessorySlots.length < 2) {
    return violations; // Can't have duplicates with 0-1 accessory slots
  }

  // Extract sub-types from each accessory slot
  const subtypeMap = new Map<string, string[]>(); // subtype → [ingredientTitles]

  for (const slot of accessorySlots) {
    const subtype = extractAccessorySubtype(slot.ingredient.ingredientTitle, slot.ingredient.searchQuery);
    if (subtype) {
      if (!subtypeMap.has(subtype)) {
        subtypeMap.set(subtype, []);
      }
      subtypeMap.get(subtype)!.push(slot.ingredient.ingredientTitle);
    }
  }

  // Check for duplicates
  for (const [subtype, ingredientTitles] of subtypeMap.entries()) {
    if (ingredientTitles.length > 1) {
      violations.push({
        recipeId: recipe.id,
        recipeTitle: recipe.title,
        violationType: 'duplicate-accessory-subtype',
        severity: 'error',
        details: `Recipe has ${ingredientTitles.length} slots requesting "${subtype}": ${ingredientTitles.join(', ')}`,
        slots: ingredientTitles,
        recommendation: `Remove duplicate slots or change one to a different accessory type. Outfits will have low Alignment scores because the cooker must swap one out.`,
      });
    }
  }

  return violations;
}

/**
 * Check for invalid slot count (should be 4-6)
 */
function checkSlotCount(recipe: UnifiedRecipe): RecipeViolation[] {
  const violations: RecipeViolation[] = [];

  if (!recipe.slots || recipe.slots.length === 0) {
    violations.push({
      recipeId: recipe.id,
      recipeTitle: recipe.title,
      violationType: 'invalid-slot-count',
      severity: 'error',
      details: 'Recipe has 0 ingredient slots',
      recommendation: 'Add 4-6 ingredient slots to define the outfit structure',
    });
    return violations;
  }

  const count = recipe.slots.length;

  if (count < 4) {
    violations.push({
      recipeId: recipe.id,
      recipeTitle: recipe.title,
      violationType: 'invalid-slot-count',
      severity: 'error',
      details: `Recipe has only ${count} slots (minimum: 4)`,
      recommendation: 'Add more slots to create a complete outfit (tops, bottoms/one-piece, shoes, accessories)',
    });
  } else if (count > 6) {
    violations.push({
      recipeId: recipe.id,
      recipeTitle: recipe.title,
      violationType: 'invalid-slot-count',
      severity: 'warning',
      details: `Recipe has ${count} slots (maximum: 6)`,
      recommendation: 'Consider reducing to 6 slots for better outfit composition',
    });
  }

  return violations;
}

/**
 * Check for missing footwear (required)
 */
function checkFootwear(recipe: UnifiedRecipe): RecipeViolation[] {
  const violations: RecipeViolation[] = [];

  if (!recipe.slots || recipe.slots.length === 0) {
    return violations; // Already caught by slot count check
  }

  const hasFootwear = recipe.slots.some((slot) => FOOTWEAR_ROLES.includes(slot.role));

  if (!hasFootwear) {
    violations.push({
      recipeId: recipe.id,
      recipeTitle: recipe.title,
      violationType: 'missing-footwear',
      severity: 'error',
      details: 'Recipe does not include a footwear slot (shoes)',
      recommendation: 'Add a shoes slot - footwear is required for complete outfits',
    });
  }

  return violations;
}

/**
 * Check for invalid roles
 */
function checkInvalidRoles(recipe: UnifiedRecipe): RecipeViolation[] {
  const violations: RecipeViolation[] = [];

  if (!recipe.slots || recipe.slots.length === 0) {
    return violations;
  }

  const invalidRoles = recipe.slots.filter((slot) => !VALID_ROLES.includes(slot.role as any));

  if (invalidRoles.length > 0) {
    violations.push({
      recipeId: recipe.id,
      recipeTitle: recipe.title,
      violationType: 'invalid-role',
      severity: 'error',
      details: `Recipe has ${invalidRoles.length} slots with invalid roles: ${invalidRoles.map((slot) => slot.role).join(', ')}`,
      slots: invalidRoles.map((slot) => `${slot.ingredient.ingredientTitle} (role: ${slot.role})`),
      recommendation: `Valid roles are: ${VALID_ROLES.join(', ')}`,
    });
  }

  return violations;
}

/**
 * Check for conflicting garments (e.g., dress + pants)
 */
function checkConflictingGarments(recipe: UnifiedRecipe): RecipeViolation[] {
  const violations: RecipeViolation[] = [];

  if (!recipe.slots || recipe.slots.length === 0) {
    return violations;
  }

  const hasOnePiece = recipe.slots.some((slot) => slot.role === 'one-piece');
  const hasBottoms = recipe.slots.some((slot) => slot.role === 'bottoms');

  if (hasOnePiece && hasBottoms) {
    violations.push({
      recipeId: recipe.id,
      recipeTitle: recipe.title,
      violationType: 'conflicting-garments',
      severity: 'warning',
      details: 'Recipe has both one-piece (dress/jumpsuit) and bottoms slots',
      recommendation: 'Choose either one-piece OR tops+bottoms. Having both will force the cooker to pick one path, lowering Alignment scores.',
    });
  }

  return violations;
}

/**
 * Validate a single recipe
 */
export function validateRecipe(recipe: UnifiedRecipe): RecipeViolation[] {
  const violations: RecipeViolation[] = [];

  // Run all validation checks
  violations.push(...checkSlotCount(recipe));
  violations.push(...checkFootwear(recipe));
  violations.push(...checkInvalidRoles(recipe));
  violations.push(...checkDuplicateAccessorySubtypes(recipe));
  violations.push(...checkConflictingGarments(recipe));

  return violations;
}

/**
 * Validate all recipes and generate report
 */
export function validateAllRecipes(recipes: UnifiedRecipe[]): RecipeValidationReport {
  const allViolations: RecipeViolation[] = [];
  const violationsByType: Record<string, number> = {};
  const recipesSummary: RecipeValidationReport['recipesSummary'] = [];

  for (const recipe of recipes) {
    const violations = validateRecipe(recipe);
    allViolations.push(...violations);

    // Count by type
    for (const violation of violations) {
      violationsByType[violation.violationType] =
        (violationsByType[violation.violationType] || 0) + 1;
    }

    // Summary for this recipe
    const errorCount = violations.filter((v) => v.severity === 'error').length;
    const warningCount = violations.filter((v) => v.severity === 'warning').length;

    let status: 'valid' | 'has-warnings' | 'has-errors' = 'valid';
    if (errorCount > 0) {
      status = 'has-errors';
    } else if (warningCount > 0) {
      status = 'has-warnings';
    }

    recipesSummary.push({
      recipeId: recipe.id,
      recipeTitle: recipe.title,
      status,
      errorCount,
      warningCount,
    });
  }

  const invalidRecipes = recipesSummary.filter((r) => r.status !== 'valid').length;
  const validRecipes = recipes.length - invalidRecipes;

  return {
    totalRecipes: recipes.length,
    validRecipes,
    invalidRecipes,
    violations: allViolations,
    violationsByType,
    recipesSummary,
  };
}

/**
 * Generate human-readable report
 */
export function generateReportText(report: RecipeValidationReport): string {
  let text = '═══════════════════════════════════════════\n';
  text += '   RECIPE VALIDATION REPORT\n';
  text += '═══════════════════════════════════════════\n\n';

  text += `Total Recipes: ${report.totalRecipes}\n`;
  text += `✅ Valid: ${report.validRecipes} (${Math.round((report.validRecipes / report.totalRecipes) * 100)}%)\n`;
  text += `⚠️  Invalid: ${report.invalidRecipes} (${Math.round((report.invalidRecipes / report.totalRecipes) * 100)}%)\n\n`;

  if (report.invalidRecipes === 0) {
    text += '🎉 All recipes are valid!\n';
    return text;
  }

  text += '═══════════════════════════════════════════\n';
  text += '   VIOLATIONS BY TYPE\n';
  text += '═══════════════════════════════════════════\n\n';

  for (const [type, count] of Object.entries(report.violationsByType)) {
    text += `${type}: ${count}\n`;
  }

  text += '\n═══════════════════════════════════════════\n';
  text += '   DETAILED VIOLATIONS\n';
  text += '═══════════════════════════════════════════\n\n';

  // Group violations by recipe
  const violationsByRecipe = new Map<string, RecipeViolation[]>();
  for (const violation of report.violations) {
    if (!violationsByRecipe.has(violation.recipeId)) {
      violationsByRecipe.set(violation.recipeId, []);
    }
    violationsByRecipe.get(violation.recipeId)!.push(violation);
  }

  for (const [recipeId, violations] of violationsByRecipe.entries()) {
    const recipe = violations[0];
    const errorCount = violations.filter((v) => v.severity === 'error').length;
    const warningCount = violations.filter((v) => v.severity === 'warning').length;

    text += `\n📋 ${recipe.recipeTitle}\n`;
    text += `   ID: ${recipeId}\n`;
    text += `   Issues: ${errorCount} errors, ${warningCount} warnings\n\n`;

    for (const violation of violations) {
      const icon = violation.severity === 'error' ? '❌' : '⚠️ ';
      text += `   ${icon} [${violation.violationType}]\n`;
      text += `      ${violation.details}\n`;
      text += `      → ${violation.recommendation}\n\n`;
    }

    text += '   ───────────────────────────────────────\n';
  }

  text += '\n═══════════════════════════════════════════\n';
  text += '   RECIPES REQUIRING ATTENTION\n';
  text += '═══════════════════════════════════════════\n\n';

  const recipesWithErrors = report.recipesSummary.filter((r) => r.status === 'has-errors');
  const recipesWithWarnings = report.recipesSummary.filter((r) => r.status === 'has-warnings');

  if (recipesWithErrors.length > 0) {
    text += `🚨 ${recipesWithErrors.length} recipes with ERRORS (must fix before cooking):\n\n`;
    for (const recipe of recipesWithErrors) {
      text += `   - ${recipe.recipeTitle} (${recipe.errorCount} errors)\n`;
    }
    text += '\n';
  }

  if (recipesWithWarnings.length > 0) {
    text += `⚠️  ${recipesWithWarnings.length} recipes with WARNINGS (should review):\n\n`;
    for (const recipe of recipesWithWarnings) {
      text += `   - ${recipe.recipeTitle} (${recipe.warningCount} warnings)\n`;
    }
  }

  return text;
}
