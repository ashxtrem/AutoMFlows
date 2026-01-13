export interface ShortcutValidationResult {
  isValid: boolean;
  error?: string;
}

/**
 * Validates a keyboard shortcut key
 * @param shortcut The shortcut key to validate (should be a single character)
 * @param existingShortcuts Optional array of existing shortcuts to check for conflicts
 * @returns Validation result with isValid flag and optional error message
 */
export function validateShortcut(
  shortcut: string,
  existingShortcuts: string[] = []
): ShortcutValidationResult {
  // Must be exactly one character
  if (!shortcut || shortcut.length !== 1) {
    return {
      isValid: false,
      error: 'Shortcut must be exactly one character',
    };
  }

  const char = shortcut.toLowerCase();

  // Must be alphanumeric (a-z, A-Z, 0-9)
  if (!/^[a-z0-9]$/.test(char)) {
    return {
      isValid: false,
      error: 'Shortcut must be a letter (a-z) or number (0-9)',
    };
  }

  // Check for conflicts with existing shortcuts
  if (existingShortcuts.includes(char)) {
    return {
      isValid: false,
      error: `Shortcut "${char}" is already in use`,
    };
  }

  return { isValid: true };
}

/**
 * Checks if a keyboard event represents a valid shortcut key press
 * (i.e., no modifier keys pressed)
 */
export function isShortcutKeyPress(event: KeyboardEvent): boolean {
  // Must not have modifier keys pressed
  if (event.ctrlKey || event.metaKey || event.altKey || event.shiftKey) {
    return false;
  }

  // Must be a single alphanumeric character
  const key = event.key.toLowerCase();
  return /^[a-z0-9]$/.test(key);
}

/**
 * Gets a list of reserved/invalid shortcut keys
 */
export function getReservedShortcuts(): string[] {
  return [
    // Function keys
    'f1', 'f2', 'f3', 'f4', 'f5', 'f6', 'f7', 'f8', 'f9', 'f10', 'f11', 'f12',
    // Special keys
    'tab', 'escape', 'enter', 'space',
    // Arrow keys
    'arrowup', 'arrowdown', 'arrowleft', 'arrowright',
    // Other special keys
    'backspace', 'delete', 'insert', 'home', 'end', 'pageup', 'pagedown',
  ];
}
