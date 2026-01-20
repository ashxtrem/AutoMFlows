type Theme = 'light' | 'dark' | 'auto';

/**
 * Get the effective theme (resolves 'auto' to actual theme)
 */
export function getEffectiveTheme(theme: Theme): 'light' | 'dark' {
  if (theme === 'auto') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return theme;
}

/**
 * Apply theme to document
 */
export function applyTheme(theme: Theme): void {
  const effectiveTheme = getEffectiveTheme(theme);
  const root = document.documentElement;
  
  // Remove existing theme classes
  root.classList.remove('theme-light', 'theme-dark');
  
  // Add new theme class
  root.classList.add(`theme-${effectiveTheme}`);
  
  // Set data attribute for CSS
  root.setAttribute('data-theme', effectiveTheme);
}

/**
 * Initialize theme system and listen for system theme changes
 */
export function initTheme(theme: Theme, onThemeChange?: (theme: 'light' | 'dark') => void): () => void {
  // Apply initial theme
  applyTheme(theme);
  
  // If auto mode, listen for system theme changes
  if (theme === 'auto') {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      const effectiveTheme = getEffectiveTheme(theme);
      applyTheme(theme);
      onThemeChange?.(effectiveTheme);
    };
    
    // Modern browsers
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    } else {
      // Fallback for older browsers
      mediaQuery.addListener(handleChange);
      return () => mediaQuery.removeListener(handleChange);
    }
  }
  
  return () => {}; // No-op cleanup
}
