// Comment box handler - utility node that doesn't execute
class CommentBoxHandler {
  async execute(node, context) {
    // Comment box is a utility node - it doesn't execute anything
    return;
  }
}

// Export handler by node type for plugin loader
module.exports = {
  'comment-box.comment': CommentBoxHandler,
  default: {
    'comment-box.comment': CommentBoxHandler,
  },
};
