// Switch node handler (JavaScript version)
// Resolve path relative to plugin directory
const path = require('path');
// From plugins/switch-node/handler.js, go up to project root, then to backend/dist/utils
const conditionEvaluatorPath = path.resolve(__dirname, '../../backend/dist/utils/conditionEvaluator');
const { ConditionEvaluator } = require(conditionEvaluatorPath);

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
        const result = await ConditionEvaluator.evaluate(caseItem.condition, context);
        
        if (result.passed) {
          // Store selected output handle ID in context
          // Use case ID as the handle ID (e.g., "case-1", "case-2")
          context.setData('switchOutput', caseItem.id);
          context.setData('switchOutputLabel', caseItem.label);
          console.log(`[SWITCH] Case "${caseItem.label}" matched: ${result.message}`);
          return; // Exit early when a case matches
        }
      } catch (error) {
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

// Export handler by node type for plugin loader
module.exports = {
  'switch.switch': SwitchHandler,
  default: {
    'switch.switch': SwitchHandler,
  },
};
