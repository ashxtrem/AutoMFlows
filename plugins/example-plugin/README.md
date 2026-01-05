# Example Plugin

This is an example plugin for AutoMFlows that demonstrates how to create custom nodes.

## Nodes

### Fill Form
Fills multiple form fields at once. Configure by providing an array of field objects, each with:
- `selector`: CSS or XPath selector for the field
- `selectorType`: 'css' or 'xpath' (default: 'css')
- `value`: Text to fill in the field
- `timeout`: Optional timeout in milliseconds (default: 30000)

### Scroll To
Scrolls to an element on the page. Configure with:
- `selector`: CSS or XPath selector for the element
- `selectorType`: 'css' or 'xpath' (default: 'css')
- `behavior`: 'auto' or 'smooth' (default: 'smooth')
- `timeout`: Optional timeout in milliseconds (default: 30000)

## Plugin Structure

```
example-plugin/
  plugin.json    # Plugin manifest
  handler.js     # Node handlers (JavaScript)
  handler.ts     # Node handlers (TypeScript source)
  README.md      # This file
```

## Development

To create your own plugin:

1. Create a new directory in `plugins/`
2. Create a `plugin.json` manifest file
3. Create handler files that export classes implementing the `NodeHandler` interface
4. Restart the backend server to load your plugin

See `docs/PLUGIN_DEVELOPMENT.md` for detailed documentation.

