export type { PropertySchema } from '@automflows/shared';
export { getNodeProperties } from '@automflows/shared';

/**
 * Check if a property is converted to an input connection
 */
export function isPropertyInputConnection(nodeData: any, propertyName: string): boolean {
  return nodeData._inputConnections?.[propertyName]?.isInput === true;
}

/**
 * Get the old value for a property that was converted to input
 * Returns undefined if property is not converted to input or has no old value stored
 */
export function getPropertyOldValue(nodeData: any, propertyName: string): any {
  return nodeData._inputConnections?.[propertyName]?.oldValue;
}

/**
 * Get the input handle ID for a property
 */
export function getPropertyInputHandleId(propertyName: string): string {
  return `${propertyName}-input`;
}
