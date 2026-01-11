"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SwitchHandler = void 0;
const conditionEvaluator_1 = require("../../backend/src/utils/conditionEvaluator");
class SwitchHandler {
    async execute(node, context) {
        const data = node.data;
        if (!data.cases || !Array.isArray(data.cases)) {
            throw new Error('Switch node must have at least one case configured');
        }
        if (!data.defaultCase || !data.defaultCase.label) {
            throw new Error('Switch node must have a default case configured');
        }
        // Evaluate each case condition in order
        for (const caseItem of data.cases) {
            if (!caseItem.condition) {
                continue; // Skip cases without conditions
            }
            try {
                const result = await conditionEvaluator_1.ConditionEvaluator.evaluate(caseItem.condition, context);
                if (result.passed) {
                    // Store selected output handle ID in context
                    // Use case ID as the handle ID (e.g., "case-1", "case-2")
                    context.setData('switchOutput', caseItem.id);
                    context.setData('switchOutputLabel', caseItem.label);
                    console.log(`[SWITCH] Case "${caseItem.label}" matched: ${result.message}`);
                    return; // Exit early when a case matches
                }
            }
            catch (error) {
                // Log error but continue to next case
                console.warn(`[SWITCH] Error evaluating case "${caseItem.label}": ${error.message}`);
                continue;
            }
        }
        // No case matched, use default case
        context.setData('switchOutput', 'default');
        context.setData('switchOutputLabel', data.defaultCase.label);
        console.log(`[SWITCH] No case matched, using default case: "${data.defaultCase.label}"`);
    }
}
exports.SwitchHandler = SwitchHandler;
// Export handler by node type for plugin loader
exports.default = {
    'switch.switch': SwitchHandler,
};
