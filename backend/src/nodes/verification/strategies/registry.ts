import { VerificationStrategy } from './base';

export class VerificationStrategyRegistry {
  private strategies: Map<string, Map<string, VerificationStrategy>> = new Map();

  /**
   * Register a verification strategy for a domain and type
   */
  register(domain: string, type: string, strategy: VerificationStrategy): void {
    if (!this.strategies.has(domain)) {
      this.strategies.set(domain, new Map());
    }
    const domainStrategies = this.strategies.get(domain)!;
    domainStrategies.set(type, strategy);
  }

  /**
   * Get a verification strategy by domain and type
   */
  get(domain: string, type: string): VerificationStrategy | undefined {
    const domainStrategies = this.strategies.get(domain);
    if (!domainStrategies) {
      return undefined;
    }
    return domainStrategies.get(type);
  }

  /**
   * Get all strategies for a domain, or all strategies if domain is not specified
   */
  getAll(domain?: string): Map<string, VerificationStrategy> {
    if (domain) {
      return this.strategies.get(domain) || new Map();
    }
    // Return all strategies across all domains
    const allStrategies = new Map<string, VerificationStrategy>();
    for (const [domainName, domainStrategies] of this.strategies.entries()) {
      for (const [type, strategy] of domainStrategies.entries()) {
        allStrategies.set(`${domainName}.${type}`, strategy);
      }
    }
    return allStrategies;
  }

  /**
   * Check if a strategy exists for a domain and type
   */
  has(domain: string, type: string): boolean {
    return this.get(domain, type) !== undefined;
  }
}

// Export singleton instance
export const verificationStrategyRegistry = new VerificationStrategyRegistry();
