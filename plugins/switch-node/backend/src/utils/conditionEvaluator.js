"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConditionEvaluator = void 0;
const browser_1 = require("../nodes/verification/strategies/browser");
const api_1 = require("../nodes/verification/strategies/api");
class ConditionEvaluator {
    /**
     * Evaluate a condition and return the result
     */
    static async evaluate(condition, context) {
        try {
            switch (condition.type) {
                case 'ui-element':
                    return await this.evaluateUIElement(condition, context);
                case 'api-status':
                    return await this.evaluateAPIStatus(condition, context);
                case 'api-json-path':
                    return await this.evaluateAPIJsonPath(condition, context);
                case 'javascript':
                    return await this.evaluateJavaScript(condition, context);
                case 'variable':
                    return await this.evaluateVariable(condition, context);
                default:
                    return {
                        passed: false,
                        message: `Unknown condition type: ${condition.type}`,
                    };
            }
        }
        catch (error) {
            return {
                passed: false,
                message: `Condition evaluation failed: ${error.message}`,
                details: { error: error.message },
            };
        }
    }
    /**
     * Evaluate UI element condition using browser verification strategy
     */
    static async evaluateUIElement(condition, context) {
        if (!condition.selector) {
            return {
                passed: false,
                message: 'Selector is required for UI element condition',
            };
        }
        const verifyConfig = {
            domain: 'browser',
            verificationType: 'element',
            selector: condition.selector,
            selectorType: condition.selectorType || 'css',
            elementCheck: condition.elementCheck || 'visible',
            timeout: condition.timeout || 30000,
        };
        const strategy = new browser_1.BrowserElementStrategy();
        const result = await strategy.execute(context, verifyConfig);
        return {
            passed: result.passed,
            message: result.message,
            details: result.details,
        };
    }
    /**
     * Evaluate API status condition using API verification strategy
     */
    static async evaluateAPIStatus(condition, context) {
        if (condition.statusCode === undefined || condition.statusCode === null) {
            return {
                passed: false,
                message: 'Status code is required for API status condition',
            };
        }
        const verifyConfig = {
            domain: 'api',
            verificationType: 'status',
            apiContextKey: condition.apiContextKey || 'apiResponse',
            statusCode: condition.statusCode,
        };
        const strategy = new api_1.ApiStatusStrategy();
        const result = await strategy.execute(context, verifyConfig);
        return {
            passed: result.passed,
            message: result.message,
            details: result.details,
        };
    }
    /**
     * Evaluate API JSON path condition using API verification strategy
     */
    static async evaluateAPIJsonPath(condition, context) {
        if (!condition.jsonPath) {
            return {
                passed: false,
                message: 'JSON path is required for API JSON path condition',
            };
        }
        if (condition.expectedValue === undefined || condition.expectedValue === null) {
            return {
                passed: false,
                message: 'Expected value is required for API JSON path condition',
            };
        }
        // Filter matchType to only valid MatchType values (exclude comparison operators)
        // Comparison operators are only for variable conditions, not API JSON path
        const validMatchTypes = ['equals', 'contains', 'startsWith', 'endsWith', 'regex'];
        const matchType = condition.matchType && validMatchTypes.includes(condition.matchType)
            ? condition.matchType
            : 'equals';
        const verifyConfig = {
            domain: 'api',
            verificationType: 'bodyPath',
            apiContextKey: condition.apiContextKey || 'apiResponse',
            jsonPath: condition.jsonPath,
            expectedValue: condition.expectedValue,
            matchType: matchType,
        };
        const strategy = new api_1.ApiBodyPathStrategy();
        const result = await strategy.execute(context, verifyConfig);
        return {
            passed: result.passed,
            message: result.message,
            details: result.details,
        };
    }
    /**
     * Evaluate JavaScript expression condition
     */
    static async evaluateJavaScript(condition, context) {
        if (!condition.javascriptExpression) {
            return {
                passed: false,
                message: 'JavaScript expression is required for JavaScript condition',
            };
        }
        const page = context.getPage();
        if (!page) {
            return {
                passed: false,
                message: 'No page available. Ensure Open Browser node is executed first.',
            };
        }
        try {
            // Evaluate JavaScript expression in page context
            const result = await page.evaluate((expr) => {
                try {
                    // Wrap in function to allow return statement
                    const func = new Function('return ' + expr);
                    return func();
                }
                catch (error) {
                    throw new Error(`JavaScript evaluation failed: ${error.message}`);
                }
            }, condition.javascriptExpression);
            const passed = Boolean(result);
            return {
                passed,
                message: passed
                    ? `JavaScript condition passed: Expression evaluated to true`
                    : `JavaScript condition failed: Expression evaluated to ${result}`,
                details: {
                    expression: condition.javascriptExpression,
                    result,
                },
            };
        }
        catch (error) {
            return {
                passed: false,
                message: `JavaScript evaluation failed: ${error.message}`,
                details: {
                    expression: condition.javascriptExpression,
                    error: error.message,
                },
            };
        }
    }
    /**
     * Evaluate variable condition
     */
    static async evaluateVariable(condition, context) {
        if (!condition.variableName) {
            return {
                passed: false,
                message: 'Variable name is required for variable condition',
            };
        }
        const variableValue = context.getVariable(condition.variableName);
        if (variableValue === undefined) {
            return {
                passed: false,
                message: `Variable "${condition.variableName}" not found in context`,
            };
        }
        if (condition.comparisonValue === undefined || condition.comparisonValue === null) {
            return {
                passed: false,
                message: 'Comparison value is required for variable condition',
            };
        }
        const operator = condition.comparisonOperator || 'equals';
        let passed = false;
        // Convert values to numbers if both are numeric
        const varNum = typeof variableValue === 'number' ? variableValue : parseFloat(String(variableValue));
        const compNum = typeof condition.comparisonValue === 'number'
            ? condition.comparisonValue
            : parseFloat(String(condition.comparisonValue));
        const isNumeric = !isNaN(varNum) && !isNaN(compNum) && isFinite(varNum) && isFinite(compNum);
        if (isNumeric && operator !== 'equals') {
            // Numeric comparison
            switch (operator) {
                case 'greaterThan':
                    passed = varNum > compNum;
                    break;
                case 'lessThan':
                    passed = varNum < compNum;
                    break;
                case 'greaterThanOrEqual':
                    passed = varNum >= compNum;
                    break;
                case 'lessThanOrEqual':
                    passed = varNum <= compNum;
                    break;
                default:
                    passed = varNum === compNum;
            }
        }
        else {
            // String or equality comparison
            if (operator === 'equals') {
                passed = String(variableValue) === String(condition.comparisonValue);
            }
            else {
                // For non-numeric values, only equals is supported
                passed = false;
            }
        }
        return {
            passed,
            message: passed
                ? `Variable condition passed: "${condition.variableName}" (${variableValue}) ${operator} ${condition.comparisonValue}`
                : `Variable condition failed: "${condition.variableName}" (${variableValue}) ${operator} ${condition.comparisonValue}`,
            details: {
                variableName: condition.variableName,
                variableValue,
                operator,
                comparisonValue: condition.comparisonValue,
            },
        };
    }
}
exports.ConditionEvaluator = ConditionEvaluator;
