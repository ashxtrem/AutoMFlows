// Shortcut handler - utility node that doesn't execute
class ShortcutHandler {
  async execute(node, context) {
    // Shortcut is a utility node - it doesn't execute anything
    return;
  }
}

// Export handler by node type for plugin loader
module.exports = {
  'shortcut.shortcut': ShortcutHandler,
  default: {
    'shortcut.shortcut': ShortcutHandler,
  },
};
