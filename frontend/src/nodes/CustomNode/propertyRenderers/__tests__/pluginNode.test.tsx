import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { ReactFlowProvider } from 'reactflow';

// Mock must be hoisted before imports
vi.mock('../../../../plugins/registry', () => ({
  frontendPluginRegistry: {
    getPluginNode: vi.fn(),
  },
}));

import { renderPluginNodeProperties } from '../pluginNode';
import { frontendPluginRegistry } from '../../../../plugins/registry';

describe('renderPluginNodeProperties', () => {
  const mockHandlePropertyChange = vi.fn();
  const mockHandleOpenPopup = vi.fn();

  const defaultProps = {
    renderData: { type: 'plugin.test' },
    handlePropertyChange: mockHandlePropertyChange,
    handleOpenPopup: mockHandleOpenPopup,
    renderPropertyRow: vi.fn((name, element, index) => element),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return null when plugin node not found', () => {
    vi.mocked(frontendPluginRegistry.getPluginNode).mockReturnValue(null);
    const result = renderPluginNodeProperties(defaultProps);
    expect(result).toBeNull();
  });

  it('should return null when plugin has no defaultData', () => {
    vi.mocked(frontendPluginRegistry.getPluginNode).mockReturnValue({
      definition: {},
    } as any);
    const result = renderPluginNodeProperties(defaultProps);
    expect(result).toBeNull();
  });

  it('should render properties when plugin has defaultData', () => {
    vi.mocked(frontendPluginRegistry.getPluginNode).mockReturnValue({
      definition: {
        defaultData: {
          stringProp: 'test',
          numberProp: 42,
          boolProp: true,
        },
      },
    } as any);
    const result = renderPluginNodeProperties(defaultProps);
    const { container } = render(
      <ReactFlowProvider>
        {result}
      </ReactFlowProvider>
    );
    expect(container).toBeTruthy();
  });
});
