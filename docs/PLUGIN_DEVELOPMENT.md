# Plugin Development Guide

This guide explains how to create plugins for AutoMFlows to extend its functionality with custom nodes.

## Overview

Plugins allow you to:
- Create custom node types with your own functionality
- Extend AutoMFlows's capabilities without modifying the core codebase
- Share your custom nodes with others

## Plugin Structure

A plugin is a directory in the `plugins/` folder with the following structure:

```
your-plugin/
  plugin.json          # Plugin manifest (required)
  handler.js           # Node handlers (required)
  handler.ts           # TypeScript source (optional)
  config.tsx           # Frontend config component (optional)
  icon.svg             # Custom icon (optional)
  README.md            # Plugin documentation (optional)
```

## Plugin Manifest

The `plugin.json` file defines your plugin's metadata and nodes:

```json
{
  "name": "your-plugin-name",
  "version": "1.0.0",
  "description": "Description of your plugin",
  "author": "Your Name",
  "nodes": [
    {
      "type": "yourplugin.nodeType",
      "label": "Display Name",
      "category": "Category Name",
      "icon": "🎯",
      "description": "What this node does",
      "handlerPath": "handler.js",
      "configComponentPath": "config.tsx",
      "defaultData": {
        "field1": "default value"
      }
    }
  ]
}
```

### Manifest Fields

- `name`: Unique plugin identifier (lowercase, no spaces)
- `version`: Semantic version (e.g., "1.0.0")
- `description`: Brief description of the plugin
- `author`: Plugin author name (optional)
- `nodes`: Array of node definitions

### Node Definition Fields

- `type`: Unique node type identifier (use plugin name prefix, e.g., "yourplugin.nodeType")
- `label`: Display name shown in the UI
- `category`: Category name for grouping in the sidebar
- `icon`: Emoji or icon identifier
- `description`: Node description (optional)
- `handlerPath`: Path to handler file relative to plugin root
- `configComponentPath`: Path to React config component (optional)
- `defaultData`: Default values for node data fields

## Creating Node Handlers

Node handlers implement the `NodeHandler` interface:

```typescript
interface NodeHandler {
  execute(node: BaseNode, context: ContextManager): Promise<void>;
}
```

### Handler Example (JavaScript)

```javascript
class MyCustomHandler {
  async execute(node, context) {
    const data = node.data;
    const page = context.getPage();

    if (!page) {
      throw new Error('No page available');
    }

    // Your custom logic here
    await page.click(data.selector);
  }
}

// Export handlers by node type
module.exports = {
  'yourplugin.nodeType': MyCustomHandler,
  default: {
    'yourplugin.nodeType': MyCustomHandler,
  },
};
```

### Handler Example (TypeScript)

```typescript
import { BaseNode } from '@automflows/shared';
import { NodeHandler } from '../../backend/src/nodes/base';
import { ContextManager } from '../../backend/src/engine/context';

interface MyNodeData {
  selector: string;
  value: string;
}

export class MyCustomHandler implements NodeHandler {
  async execute(node: BaseNode, context: ContextManager): Promise<void> {
    const data = node.data as MyNodeData;
    const page = context.getPage();

    if (!page) {
      throw new Error('No page available');
    }

    // Your custom logic here
    await page.click(data.selector);
  }
}

export default {
  'yourplugin.nodeType': MyCustomHandler,
};
```

### Context Manager API

The `ContextManager` provides access to:

- `getPage()`: Get the current Playwright Page object
- `getBrowser()`: Get the current Playwright Browser object
- `setPage(page)`: Set the current page
- `setBrowser(browser)`: Set the current browser
- `getVariable(name)`: Get a workflow variable
- `setVariable(name, value)`: Set a workflow variable
- `getData(key)`: Get data from previous nodes
- `setData(key, value)`: Set data for next nodes

## Frontend Config Components

You can create custom React components for node configuration:

```tsx
import { PluginConfigComponentProps } from '../../frontend/src/plugins/types';

export default function MyNodeConfig({ node, onChange }: PluginConfigComponentProps) {
  return (
    <div>
      <label>Selector</label>
      <input
        value={node.data.selector || ''}
        onChange={(e) => onChange('selector', e.target.value)}
      />
    </div>
  );
}
```

## Node Type Naming

Use a namespace prefix for your node types to avoid conflicts:
- Good: `myplugin.fillForm`, `myplugin.scrollTo`
- Bad: `fillForm`, `scrollTo`

## Testing Your Plugin

1. Place your plugin in the `plugins/` directory
2. Ensure `plugin.json` is valid JSON
3. Ensure handler file exists and exports handlers correctly
4. Restart the backend server
5. Check server logs for plugin loading messages
6. Verify your nodes appear in the frontend sidebar

## Best Practices

1. **Error Handling**: Always validate inputs and provide clear error messages
2. **Type Safety**: Use TypeScript for better type safety and IDE support
3. **Documentation**: Include a README.md explaining your plugin's nodes
4. **Versioning**: Follow semantic versioning for plugin versions
5. **Naming**: Use descriptive, unique node type identifiers
6. **Testing**: Test your plugin with various scenarios before sharing

## Example Plugin

See `plugins/example-plugin/` for a complete example plugin with:
- Fill Form node (fills multiple form fields)
- Scroll To node (scrolls to an element)

## Troubleshooting

### Plugin not loading
- Check that `plugin.json` is valid JSON
- Verify handler file path is correct
- Check server logs for error messages
- Ensure handler exports match node types in manifest

### Handler not found
- Verify handler class is exported correctly
- Check that node type matches between manifest and handler exports
- Ensure handler implements `execute` method

### Node not appearing in UI
- Check that plugin loaded successfully (check server logs)
- Verify node category is set correctly
- Refresh the frontend after plugin loads

## Advanced Topics

### Extending Existing Nodes

Plugins can extend existing functionality by wrapping handlers, though this requires modifying the core system. For now, focus on creating new node types.

### Sharing Plugins

To share your plugin:
1. Create a repository with your plugin code
2. Document installation instructions
3. Users can clone/copy your plugin to their `plugins/` directory

## Support

For questions or issues:
- Check the example plugin for reference
- Review server logs for detailed error messages
- Ensure your plugin follows the structure outlined in this guide

