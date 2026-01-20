/**
 * Calculate localStorage usage in bytes
 */
export function getStorageUsage(): { used: number; total: number; percentage: number } {
  let used = 0;
  
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        const value = localStorage.getItem(key);
        if (value) {
          // Each character is approximately 2 bytes (UTF-16)
          used += key.length * 2 + value.length * 2;
        }
      }
    }
  } catch (error) {
    console.warn('Failed to calculate storage usage:', error);
  }
  
  // Most browsers have a 5-10MB limit, we'll use 5MB as default
  const total = 5 * 1024 * 1024; // 5MB in bytes
  const percentage = (used / total) * 100;
  
  return { used, total, percentage };
}

/**
 * Format bytes to human-readable string
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

/**
 * Clear workflow-related cache from localStorage
 */
export function clearWorkflowCache(): void {
  const keysToRemove: string[] = [];
  
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (
        key.startsWith('reactflow-') ||
        key.startsWith('automflows_workflow') ||
        key.startsWith('automflows_viewport')
      )) {
        keysToRemove.push(key);
      }
    }
    
    keysToRemove.forEach((key) => {
      localStorage.removeItem(key);
    });
  } catch (error) {
    console.warn('Failed to clear workflow cache:', error);
    throw error;
  }
}

/**
 * Get all localStorage keys
 */
export function getAllStorageKeys(): string[] {
  const keys: string[] = [];
  
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        keys.push(key);
      }
    }
  } catch (error) {
    console.warn('Failed to get storage keys:', error);
  }
  
  return keys;
}
