/**
 * Server-Side Transaction Data Provider
 *
 * ⚠️ IMPORTANT: This module can ONLY be used in server-side code (API routes, server components).
 * It imports Node.js 'fs' module which is not available in browser environments.
 *
 * For client-side code, use ClientTransactionDataProvider from transaction-cache.ts
 */

import type { TransactionDataProvider, TransactionData } from './transaction-cache';
import fs from 'fs/promises';

/**
 * Server-Side Transaction Data Provider
 *
 * Loads hm-transaction-stats.json once into memory (Map)
 * Used by Customer Website (Next.js server components)
 */
export class ServerTransactionDataProvider implements TransactionDataProvider {
  private data: Map<string, TransactionData> | null = null;

  constructor(private filePath: string) {}

  /**
   * Load data from file
   */
  private async loadData(): Promise<Map<string, TransactionData>> {
    if (this.data) return this.data;

    try {
      const fileContent = await fs.readFile(this.filePath, 'utf-8');
      const json = JSON.parse(fileContent);

      this.data = new Map(Object.entries(json.products));
      console.log(`[TransactionCache] Loaded ${this.data.size} products from ${this.filePath}`);

      return this.data;
    } catch (error) {
      console.error('[TransactionCache] Failed to load file:', error);
      throw error;
    }
  }

  async getTransactionData(productId: string): Promise<TransactionData | null> {
    const data = await this.loadData();
    return data.get(productId) || null;
  }

  async getTransactionDataBatch(productIds: string[]): Promise<Map<string, TransactionData>> {
    const data = await this.loadData();
    const result = new Map<string, TransactionData>();

    for (const productId of productIds) {
      const txData = data.get(productId);
      if (txData) {
        result.set(productId, txData);
      }
    }

    return result;
  }

  async getCacheStats(): Promise<{ size: number; coverage: number }> {
    const data = await this.loadData();
    return { size: data.size, coverage: 100 };
  }
}
