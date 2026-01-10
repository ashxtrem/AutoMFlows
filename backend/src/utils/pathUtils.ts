import * as path from 'path';

/**
 * Get the project root directory path
 * Works from both src/ and dist/ directories
 */
export function getProjectRoot(): string {
  // __dirname in compiled code: backend/dist/utils -> go up 3 levels to project root
  // __dirname in source code: backend/src/utils -> go up 2 levels to project root
  // We use 3 levels to ensure it works from compiled code (dist/)
  // From backend/dist/utils: ../../../ = project root
  // From backend/src/utils: ../../../ = project root (also works, just goes one extra level)
  return path.resolve(__dirname, '../../../');
}

/**
 * Resolve a path relative to project root
 * @param relativePath - Path relative to project root (e.g., './output', 'output', 'plugins')
 */
export function resolveFromProjectRoot(relativePath: string): string {
  const projectRoot = getProjectRoot();
  // Remove leading './' if present
  const cleanPath = relativePath.startsWith('./') ? relativePath.slice(2) : relativePath;
  return path.resolve(projectRoot, cleanPath);
}
