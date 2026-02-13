// Set Config node handler (JavaScript version)

/**
 * Helper function to merge an object into context.data
 * If contextKey is provided, stores under that key, otherwise merges into root
 */
function mergeIntoContext(context, data, contextKey) {
  if (contextKey) {
    // Store under a specific key
    context.setData(contextKey, data);
  } else {
    // Merge into root of context.data
    // Set each top-level key individually to preserve nested structure
    for (const [key, value] of Object.entries(data)) {
      context.setData(key, value);
    }
  }
}

class SetConfigHandler {
  async execute(node, context) {
    const data = node.data;

    if (!data.config || Object.keys(data.config).length === 0) {
      // Empty config - no error, just skip
      return;
    }

    try {
      // Validate that config is an object
      if (typeof data.config !== 'object' || data.config === null || Array.isArray(data.config)) {
        throw new Error('Config must be a JSON object');
      }

      // Merge into context using same helper as LoadConfigFileHandler
      // This will overwrite existing keys if they exist
      mergeIntoContext(context, data.config, data.contextKey);
    } catch (error) {
      throw new Error(`Failed to set config: ${error.message}`);
    }
  }
}

// Export handler by node type for plugin loader
module.exports = {
  'setConfig.setConfig': SetConfigHandler,
  default: {
    'setConfig.setConfig': SetConfigHandler,
  },
};
