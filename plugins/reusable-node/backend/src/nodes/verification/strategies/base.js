"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseVerificationStrategy = void 0;
const variableInterpolator_1 = require("../../../utils/variableInterpolator");
class BaseVerificationStrategy {
    /**
     * Resolve a value from context references or return as-is
     * Supports:
     * - Property input connections (already resolved by executor)
     * - Context data references: ${data.keyName} or {{data.keyName}}
     * - Context variable references: ${variables.varName} or {{variables.varName}}
     * - Nested paths: ${data.key.path.subpath} or ${data.key[0].id}
     * - Static values (as-is)
     */
    resolveValue(value, context, _config, _propertyName) {
        // If value is null or undefined, return as-is
        if (value === null || value === undefined) {
            return value;
        }
        // If value is a string, try to resolve context references
        if (typeof value === 'string') {
            // First, try using VariableInterpolator for nested paths (supports array indexing)
            if (value.includes('${data.') || value.includes('${variables.')) {
                try {
                    const interpolated = variableInterpolator_1.VariableInterpolator.interpolateString(value, context);
                    // If interpolation changed the value, return it
                    if (interpolated !== value) {
                        // Try to parse as JSON if it looks like JSON, otherwise return as string
                        try {
                            const parsed = JSON.parse(interpolated);
                            console.log(`[VERIFY] Resolved nested path: ${value} -> ${JSON.stringify(parsed)}`);
                            return parsed;
                        }
                        catch {
                            // Not JSON, return as string
                            console.log(`[VERIFY] Resolved nested path: ${value} -> ${interpolated}`);
                            return interpolated;
                        }
                    }
                }
                catch (error) {
                    // If VariableInterpolator fails, fall back to simple reference extraction
                    console.warn(`[VERIFY] VariableInterpolator failed for "${value}": ${error.message}, trying simple reference`);
                }
            }
            // Fall back to simple context reference extraction (for backward compatibility)
            const reference = this.extractContextReference(value);
            if (reference) {
                if (reference.type === 'data') {
                    const resolved = context.getData(reference.key);
                    if (resolved === undefined) {
                        throw new Error(`Context data key "${reference.key}" not found. Available keys: ${Object.keys(context.getAllData()).join(', ') || 'none'}`);
                    }
                    // Log resolution for debugging
                    console.log(`[VERIFY] Resolved context reference: ${value} -> ${JSON.stringify(resolved)}`);
                    return resolved;
                }
                else if (reference.type === 'variable') {
                    const resolved = context.getVariable(reference.key);
                    if (resolved === undefined) {
                        throw new Error(`Context variable "${reference.key}" not found. Available variables: ${Object.keys(context.getAllVariables()).join(', ') || 'none'}`);
                    }
                    // Log resolution for debugging
                    console.log(`[VERIFY] Resolved context reference: ${value} -> ${JSON.stringify(resolved)}`);
                    return resolved;
                }
            }
        }
        // Return value as-is (static value or already resolved)
        return value;
    }
    /**
     * Extract context reference from a string value
     * Supports patterns: ${data.key} or {{data.key}} or ${variables.key} or {{variables.key}}
     */
    extractContextReference(value) {
        if (typeof value !== 'string') {
            return null;
        }
        // Match ${data.key} or {{data.key}}
        const dataMatch = value.match(/^\$\{data\.([^}]+)\}$|^\{\{data\.([^}]+)\}\}$/);
        if (dataMatch) {
            return {
                type: 'data',
                key: dataMatch[1] || dataMatch[2],
            };
        }
        // Match ${variables.key} or {{variables.key}}
        const variableMatch = value.match(/^\$\{variables\.([^}]+)\}$|^\{\{variables\.([^}]+)\}\}$/);
        if (variableMatch) {
            return {
                type: 'variable',
                key: variableMatch[1] || variableMatch[2],
            };
        }
        return null;
    }
    /**
     * Match a value against an expected value using match type
     */
    matchValue(actual, expected, matchType, caseSensitive = false) {
        const actualStr = String(actual);
        const expectedStr = String(expected);
        const actualCompare = caseSensitive ? actualStr : actualStr.toLowerCase();
        const expectedCompare = caseSensitive ? expectedStr : expectedStr.toLowerCase();
        switch (matchType) {
            case 'equals':
                return actualCompare === expectedCompare;
            case 'contains':
                return actualCompare.includes(expectedCompare);
            case 'startsWith':
                return actualCompare.startsWith(expectedCompare);
            case 'endsWith':
                return actualCompare.endsWith(expectedCompare);
            case 'regex':
                try {
                    const regex = new RegExp(expectedStr, caseSensitive ? '' : 'i');
                    return regex.test(actualStr);
                }
                catch (error) {
                    throw new Error(`Invalid regex pattern: ${expectedStr}. Error: ${error}`);
                }
            default:
                return actualCompare === expectedCompare;
        }
    }
    /**
     * Compare numeric values using comparison operator
     */
    compareValues(actual, expected, operator) {
        switch (operator) {
            case 'equals':
                return actual === expected;
            case 'greaterThan':
                return actual > expected;
            case 'lessThan':
                return actual < expected;
            case 'greaterThanOrEqual':
                return actual >= expected;
            case 'lessThanOrEqual':
                return actual <= expected;
            default:
                return actual === expected;
        }
    }
}
exports.BaseVerificationStrategy = BaseVerificationStrategy;
