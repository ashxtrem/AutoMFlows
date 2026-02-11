import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { usePropertyInput } from '../usePropertyInput';
import { Node } from 'reactflow';

describe('usePropertyInput', () => {
  it('should return property value helpers', () => {
    const node: Node = {
      id: 'n1',
      data: { timeout: 5000 },
      position: { x: 0, y: 0 },
    };

    const { result } = renderHook(() => usePropertyInput(node));

    expect(result.current.getPropertyValue('timeout')).toBe(5000);
    expect(typeof result.current.isPropertyDisabled).toBe('function');
    expect(typeof result.current.getInputClassName).toBe('function');
  });

  it('should handle property input connections', () => {
    const node: Node = {
      id: 'n1',
      data: {
        timeout: null,
        _inputConnections: { timeout: { isInput: true, handleId: 'timeout-input' } },
      },
      position: { x: 0, y: 0 },
    };

    const { result } = renderHook(() => usePropertyInput(node));

    expect(result.current.isPropertyDisabled('timeout')).toBe(true);
  });
});
