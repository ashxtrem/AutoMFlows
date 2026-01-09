/**
 * Utility functions for calculating color contrast and determining optimal text colors
 * Based on WCAG 2.1 contrast ratio guidelines
 */

/**
 * Converts a hex color string to RGB values
 * @param hex - Hex color string (e.g., "#ff0000" or "ff0000")
 * @returns RGB values as [r, g, b] array, each 0-255
 */
function hexToRgb(hex: string): [number, number, number] {
  // Remove # if present
  const cleanHex = hex.replace('#', '');
  
  // Handle 3-digit hex codes
  if (cleanHex.length === 3) {
    const r = parseInt(cleanHex[0] + cleanHex[0], 16);
    const g = parseInt(cleanHex[1] + cleanHex[1], 16);
    const b = parseInt(cleanHex[2] + cleanHex[2], 16);
    return [r, g, b];
  }
  
  // Handle 6-digit hex codes
  const r = parseInt(cleanHex.substring(0, 2), 16);
  const g = parseInt(cleanHex.substring(2, 4), 16);
  const b = parseInt(cleanHex.substring(4, 6), 16);
  return [r, g, b];
}

/**
 * Calculates the relative luminance of a color according to WCAG 2.1
 * @param r - Red component (0-255)
 * @param g - Green component (0-255)
 * @param b - Blue component (0-255)
 * @returns Relative luminance value (0-1)
 */
function getRelativeLuminance(r: number, g: number, b: number): number {
  // Normalize RGB values to 0-1 range
  const [rs, gs, bs] = [r, g, b].map(val => {
    val = val / 255;
    // Apply gamma correction
    return val <= 0.03928 ? val / 12.92 : Math.pow((val + 0.055) / 1.055, 2.4);
  });
  
  // Calculate relative luminance using WCAG formula
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

/**
 * Calculates the contrast ratio between two colors
 * @param color1 - First color (hex string)
 * @param color2 - Second color (hex string)
 * @returns Contrast ratio (1-21, where 21 is maximum contrast)
 */
export function getContrastRatio(color1: string, color2: string): number {
  const [r1, g1, b1] = hexToRgb(color1);
  const [r2, g2, b2] = hexToRgb(color2);
  
  const l1 = getRelativeLuminance(r1, g1, b1);
  const l2 = getRelativeLuminance(r2, g2, b2);
  
  // Ensure lighter color is L1
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  
  // Calculate contrast ratio
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Determines the optimal text color (black or white) for a given background color
 * Uses WCAG AA standard (4.5:1 contrast ratio) as minimum requirement
 * @param backgroundColor - Background color (hex string)
 * @returns Optimal text color as hex string ("#000000" for black or "#ffffff" for white)
 */
export function getContrastTextColor(backgroundColor: string): string {
  // Default to white if invalid color
  if (!backgroundColor || !backgroundColor.match(/^#?[0-9A-Fa-f]{3,6}$/)) {
    return '#ffffff';
  }
  
  // Normalize hex color (ensure it starts with #)
  const normalizedBg = backgroundColor.startsWith('#') ? backgroundColor : `#${backgroundColor}`;
  
  // Calculate contrast ratios for both black and white text
  const blackContrast = getContrastRatio(normalizedBg, '#000000');
  const whiteContrast = getContrastRatio(normalizedBg, '#ffffff');
  
  // Choose the color with better contrast
  // If both meet WCAG AA (4.5:1), prefer the one with higher contrast
  // If neither meets AA, still choose the better one for readability
  if (whiteContrast >= blackContrast) {
    return '#ffffff';
  } else {
    return '#000000';
  }
}

/**
 * Checks if a color combination meets WCAG AA contrast requirements
 * @param backgroundColor - Background color (hex string)
 * @param textColor - Text color (hex string)
 * @returns true if contrast ratio is at least 4.5:1 (WCAG AA)
 */
export function meetsWCAGAA(backgroundColor: string, textColor: string): boolean {
  const contrast = getContrastRatio(backgroundColor, textColor);
  return contrast >= 4.5;
}

