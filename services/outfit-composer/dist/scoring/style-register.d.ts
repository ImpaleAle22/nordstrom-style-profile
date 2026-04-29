/**
 * Style Register Coherence Scoring
 *
 * Evaluates whether outfit items maintain consistent style register.
 * Part 2.1 of OUTFIT-BUILDING-RULES.md
 */
import type { Product, StyleRegister } from '../types';
/**
 * Infer style register from product attributes
 */
export declare function inferStyleRegister(product: Product): StyleRegister;
/**
 * Check if two style registers are compatible (adjacent ±1 or same)
 */
export declare function areRegistersCompatible(a: StyleRegister, b: StyleRegister): boolean;
/**
 * Score style register coherence across all outfit items (0-100)
 *
 * - 100: All items in same register
 * - 75-99: All items within ±1 register (compatible)
 * - 50-74: Some items within ±2 (needs bridging element)
 * - 0-49: Major register clash (±3 or more)
 */
export declare function scoreStyleRegisterCoherence(products: Product[]): number;
/**
 * Get detailed style register analysis for debugging
 */
export declare function analyzeStyleRegisters(products: Product[]): {
    registers: Array<{
        product: string;
        register: StyleRegister;
    }>;
    coherenceScore: number;
    assessment: string;
};
//# sourceMappingURL=style-register.d.ts.map