import { useMemo } from 'react';
import { Node } from 'reactflow';
import { isPropertyInputConnection, getPropertyOldValue } from '../utils/nodeProperties';

/**
 * Hook to help with property input conversion in config components
 * Returns helpers to check if property is converted to input and get display value
 */
export function usePropertyInput(node: Node) {
  const data = node.data;
  
  const getPropertyValue = useMemo(() => {
    return (propertyName: string, defaultValue: any = '') => {
      if (isPropertyInputConnection(data, propertyName)) {
        return getPropertyOldValue(data, propertyName) ?? defaultValue;
      }
      return data[propertyName] ?? defaultValue;
    };
  }, [data]);
  
  const isPropertyDisabled = useMemo(() => {
    return (propertyName: string) => {
      return isPropertyInputConnection(data, propertyName);
    };
  }, [data]);
  
  const getInputClassName = useMemo(() => {
    return (propertyName: string, baseClassName: string = '') => {
      const disabled = isPropertyInputConnection(data, propertyName);
      const disabledClass = disabled ? 'text-gray-500 cursor-not-allowed' : 'text-white';
      return `${baseClassName} ${disabledClass}`.trim();
    };
  }, [data]);
  
  return {
    getPropertyValue,
    isPropertyDisabled,
    getInputClassName,
  };
}
