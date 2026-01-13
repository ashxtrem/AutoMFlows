# Shortcut Plugin

Assign keyboard shortcuts to quickly navigate to specific nodes in your workflow.

## Features

- **Quick Navigation**: Press a single key to jump to any node
- **Visual Bookmarks**: Mark important nodes for easy access
- **Global Shortcuts**: Shortcuts work anywhere in the application
- **No Execution**: Shortcut nodes don't execute during workflow runs

## Usage

1. Drag the "Shortcut" node from the Utility category in the sidebar
2. Place it near the node you want to navigate to
3. Enter a single character or number as the shortcut key
4. Optionally select a target node from the dropdown
5. Press the shortcut key to navigate to the target node

## Shortcut Rules

- Must be a single character: `a-z`, `A-Z`, or `0-9`
- Cannot use system shortcuts (Ctrl/Cmd combinations)
- Cannot use browser shortcuts (F1-F12, Tab, Escape, etc.)
- Each shortcut must be unique within a workflow

## Example

- Assign `a` to navigate to the "Authenticate" node
- Assign `1` to navigate to the "Start" node
- Press `a` to quickly jump to the authentication step
