import { BaseNode, BreakpointConfig } from '@automflows/shared';

/**
 * Check if breakpoint should trigger for a node
 */
export function shouldTriggerBreakpoint(
  node: BaseNode,
  timing: 'pre' | 'post',
  breakpointConfig?: BreakpointConfig
): boolean {
  if (!breakpointConfig || !breakpointConfig.enabled) {
    return false;
  }

  const breakpointAt = breakpointConfig.breakpointAt;
  
  // Check if timing matches
  if (breakpointAt !== timing && breakpointAt !== 'both') {
    return false;
  }

  const breakpointFor = breakpointConfig.breakpointFor;
  
  // If breakpointFor is 'all', always trigger
  if (breakpointFor === 'all') {
    return true;
  }

  // If breakpointFor is 'marked', check if node has breakpoint property
  if (breakpointFor === 'marked') {
    const nodeData = node.data as any;
    return nodeData?.breakpoint === true;
  }

  return false;
}
