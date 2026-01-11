"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.verificationStrategyRegistry = exports.VerificationStrategyRegistry = void 0;
class VerificationStrategyRegistry {
    constructor() {
        this.strategies = new Map();
    }
    /**
     * Register a verification strategy for a domain and type
     */
    register(domain, type, strategy) {
        if (!this.strategies.has(domain)) {
            this.strategies.set(domain, new Map());
        }
        const domainStrategies = this.strategies.get(domain);
        domainStrategies.set(type, strategy);
    }
    /**
     * Get a verification strategy by domain and type
     */
    get(domain, type) {
        const domainStrategies = this.strategies.get(domain);
        if (!domainStrategies) {
            return undefined;
        }
        return domainStrategies.get(type);
    }
    /**
     * Get all strategies for a domain, or all strategies if domain is not specified
     */
    getAll(domain) {
        if (domain) {
            return this.strategies.get(domain) || new Map();
        }
        // Return all strategies across all domains
        const allStrategies = new Map();
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
    has(domain, type) {
        return this.get(domain, type) !== undefined;
    }
}
exports.VerificationStrategyRegistry = VerificationStrategyRegistry;
// Export singleton instance
exports.verificationStrategyRegistry = new VerificationStrategyRegistry();
