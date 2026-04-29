/**
 * Token Usage Tracker
 *
 * Real-time tracking of AI API token consumption
 */

interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  apiCalls: number;
}

interface CostEstimate {
  inputCost: number;
  outputCost: number;
  totalCost: number;
}

// Gemini Flash Lite pricing (per 1M tokens)
const GEMINI_PRICING = {
  input: 0.075,  // $0.075 per 1M input tokens
  output: 0.30,  // $0.30 per 1M output tokens
};

class TokenTracker {
  private usage: TokenUsage = {
    promptTokens: 0,
    completionTokens: 0,
    totalTokens: 0,
    apiCalls: 0,
  };

  /**
   * Record token usage from an API call
   */
  record(promptTokens: number, completionTokens: number) {
    this.usage.promptTokens += promptTokens;
    this.usage.completionTokens += completionTokens;
    this.usage.totalTokens += promptTokens + completionTokens;
    this.usage.apiCalls++;
  }

  /**
   * Get current usage
   */
  getUsage(): TokenUsage {
    return { ...this.usage };
  }

  /**
   * Get cost estimate
   */
  getCostEstimate(): CostEstimate {
    const inputCost = (this.usage.promptTokens / 1_000_000) * GEMINI_PRICING.input;
    const outputCost = (this.usage.completionTokens / 1_000_000) * GEMINI_PRICING.output;
    return {
      inputCost,
      outputCost,
      totalCost: inputCost + outputCost,
    };
  }

  /**
   * Log summary to console
   */
  logSummary() {
    const cost = this.getCostEstimate();
    console.log('\n💰 TOKEN USAGE SUMMARY:');
    console.log(`   API Calls: ${this.usage.apiCalls.toLocaleString()}`);
    console.log(`   Input Tokens: ${this.usage.promptTokens.toLocaleString()}`);
    console.log(`   Output Tokens: ${this.usage.completionTokens.toLocaleString()}`);
    console.log(`   Total Tokens: ${this.usage.totalTokens.toLocaleString()}`);
    console.log(`   Estimated Cost: $${cost.totalCost.toFixed(4)}`);
    console.log(`     (Input: $${cost.inputCost.toFixed(4)} + Output: $${cost.outputCost.toFixed(4)})`);
  }

  /**
   * Reset tracker
   */
  reset() {
    this.usage = {
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0,
      apiCalls: 0,
    };
  }

  /**
   * Get formatted summary string
   */
  getSummaryString(): string {
    const cost = this.getCostEstimate();
    return `${this.usage.apiCalls} calls | ${this.usage.totalTokens.toLocaleString()} tokens | $${cost.totalCost.toFixed(4)}`;
  }
}

// Global singleton instance
export const tokenTracker = new TokenTracker();
