import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { ReactFlowProvider } from 'reactflow';
import { NodeType, PropertyDataType } from '@automflows/shared';
import CustomNode from '../../CustomNode';
import { useWorkflowStore } from '../../../store/workflowStore';

vi.mock('reactflow', async () => {
  const actual = await vi.importActual('reactflow');
  return {
    ...actual,
    Handle: ({ children, ...props }: any) => <div data-testid="handle" {...props}>{children}</div>,
  };
});

vi.mock('../../../store/workflowStore', () => ({
  useWorkflowStore: vi.fn(),
}));

vi.mock('../../../store/settingsStore', () => ({
  useSettingsStore: vi.fn((selector: (s: { appearance: { theme: string } }) => unknown) =>
    selector({ appearance: { theme: 'dark' } })
  ),
}));

function createMockState(overrides: { nodes?: Array<{ id: string; data: Record<string, unknown> }> } = {}) {
  return {
    nodes: overrides.nodes ?? [],
    edges: [],
    pausedNodeId: null,
    updateNodeData: vi.fn(),
    updateNodeDimensions: vi.fn(),
    renameNode: vi.fn(),
    setSelectedNode: vi.fn(),
    failedNodes: new Set<string>(),
    validationErrors: new Set<string>(),
    executingNodeId: null,
    showErrorPopupForNode: vi.fn(),
    copyNode: vi.fn(),
    duplicateNode: vi.fn(),
    deleteNode: vi.fn(),
    toggleBypass: vi.fn(),
    toggleMinimize: vi.fn(),
    togglePin: vi.fn(),
    toggleBreakpoint: vi.fn(),
    selectedNodeIds: new Set<string>(),
  };
}

const NODE_ID = 'reactivity-test-node';

function setupMock(nodeData: Record<string, unknown>) {
  const state = createMockState({
    nodes: [{ id: NODE_ID, data: nodeData }],
  });
  vi.mocked(useWorkflowStore).mockImplementation((selector?: (s: unknown) => unknown) =>
    typeof selector === 'function' ? selector(state) : state
  );
}

function renderNode(nodeData: Record<string, unknown>) {
  setupMock(nodeData);
  return render(
    <ReactFlowProvider>
      <CustomNode id={NODE_ID} data={nodeData} selected={false} />
    </ReactFlowProvider>
  );
}

function findCheckbox(container: HTMLElement, labelText: string): HTMLInputElement | null {
  const spans = container.querySelectorAll('span');
  for (const span of spans) {
    if (span.textContent?.trim() === labelText) {
      const wrapper = span.parentElement;
      const checkbox = wrapper?.querySelector('input[type="checkbox"]');
      if (checkbox) return checkbox as HTMLInputElement;
    }
  }
  return null;
}

describe('Inline property reactivity — store data changes reflect on canvas', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ─── START ──────────────────────────────────────────────────────
  describe('START node', () => {
    const baseData = { type: NodeType.START, label: 'Start' };

    it('updates recordSession checkbox', () => {
      const { container, rerender } = renderNode({ ...baseData, recordSession: false });
      expect(findCheckbox(container, 'Record Session')?.checked).toBe(false);

      setupMock({ ...baseData, recordSession: true });
      rerender(<ReactFlowProvider><CustomNode id={NODE_ID} data={baseData} selected={false} /></ReactFlowProvider>);
      expect(findCheckbox(container, 'Record Session')?.checked).toBe(true);
    });

    it('updates screenshotAllNodes checkbox', () => {
      const { container, rerender } = renderNode({ ...baseData, screenshotAllNodes: false });
      expect(findCheckbox(container, 'Screenshot All Nodes')?.checked).toBe(false);

      setupMock({ ...baseData, screenshotAllNodes: true });
      rerender(<ReactFlowProvider><CustomNode id={NODE_ID} data={baseData} selected={false} /></ReactFlowProvider>);
      expect(findCheckbox(container, 'Screenshot All Nodes')?.checked).toBe(true);
    });

    it('updates screenshotTiming select', () => {
      const { container, rerender } = renderNode({ ...baseData, screenshotAllNodes: true, screenshotTiming: 'post' });
      expect(container.textContent).toContain('Post');

      setupMock({ ...baseData, screenshotAllNodes: true, screenshotTiming: 'pre' });
      rerender(<ReactFlowProvider><CustomNode id={NODE_ID} data={baseData} selected={false} /></ReactFlowProvider>);
      expect(container.textContent).toContain('Pre');
    });

    it('updates slowMo number', () => {
      const { container, rerender } = renderNode({ ...baseData, slowMo: 0 });
      expect(container.textContent).toContain('Slowmo');

      setupMock({ ...baseData, slowMo: 500 });
      rerender(<ReactFlowProvider><CustomNode id={NODE_ID} data={baseData} selected={false} /></ReactFlowProvider>);
      expect(container.textContent).toContain('500');
    });

    it('updates scrollThenAction checkbox', () => {
      const { container, rerender } = renderNode({ ...baseData, scrollThenAction: false });
      expect(findCheckbox(container, 'Scroll Then Action')?.checked).toBe(false);

      setupMock({ ...baseData, scrollThenAction: true });
      rerender(<ReactFlowProvider><CustomNode id={NODE_ID} data={baseData} selected={false} /></ReactFlowProvider>);
      expect(findCheckbox(container, 'Scroll Then Action')?.checked).toBe(true);
    });

    it('updates snapshotAllNodes checkbox', () => {
      const { container, rerender } = renderNode({ ...baseData, snapshotAllNodes: false });
      expect(findCheckbox(container, 'Accessibility Snapshot All Nodes')?.checked).toBe(false);

      setupMock({ ...baseData, snapshotAllNodes: true });
      rerender(<ReactFlowProvider><CustomNode id={NODE_ID} data={baseData} selected={false} /></ReactFlowProvider>);
      expect(findCheckbox(container, 'Accessibility Snapshot All Nodes')?.checked).toBe(true);
    });
  });

  // ─── ACTION ─────────────────────────────────────────────────────
  describe('ACTION node', () => {
    const baseData = { type: NodeType.ACTION, label: 'Action' };

    it('updates action select', () => {
      const { container, rerender } = renderNode({ ...baseData, action: 'click' });
      expect(container.textContent).toContain('Click');

      setupMock({ ...baseData, action: 'hover' });
      rerender(<ReactFlowProvider><CustomNode id={NODE_ID} data={baseData} selected={false} /></ReactFlowProvider>);
      expect(container.textContent).toContain('Hover');
    });

    it('updates selectorType select', () => {
      const { container, rerender } = renderNode({ ...baseData, selectorType: 'css' });
      expect(container.textContent).toContain('CSS Selector');

      setupMock({ ...baseData, selectorType: 'xpath' });
      rerender(<ReactFlowProvider><CustomNode id={NODE_ID} data={baseData} selected={false} /></ReactFlowProvider>);
      expect(container.textContent).toContain('XPath');
    });

    it('updates selector text', () => {
      const { container, rerender } = renderNode({ ...baseData, selector: '#btn-old' });
      expect(container.textContent).toContain('#btn-old');

      setupMock({ ...baseData, selector: '#btn-new' });
      rerender(<ReactFlowProvider><CustomNode id={NODE_ID} data={baseData} selected={false} /></ReactFlowProvider>);
      expect(container.textContent).toContain('#btn-new');
    });
  });

  // ─── OPEN_BROWSER ──────────────────────────────────────────────
  describe('OPEN_BROWSER node', () => {
    const baseData = { type: NodeType.OPEN_BROWSER, label: 'Open Browser' };

    it('updates maxWindow checkbox', () => {
      const { container, rerender } = renderNode({ ...baseData, maxWindow: true });
      expect(findCheckbox(container, 'Max Window')?.checked).toBe(true);

      setupMock({ ...baseData, maxWindow: false });
      rerender(<ReactFlowProvider><CustomNode id={NODE_ID} data={baseData} selected={false} /></ReactFlowProvider>);
      expect(findCheckbox(container, 'Max Window')?.checked).toBe(false);
    });

    it('updates headless checkbox', () => {
      const { container, rerender } = renderNode({ ...baseData, headless: true });
      expect(findCheckbox(container, 'Headless')?.checked).toBe(true);

      setupMock({ ...baseData, headless: false });
      rerender(<ReactFlowProvider><CustomNode id={NODE_ID} data={baseData} selected={false} /></ReactFlowProvider>);
      expect(findCheckbox(container, 'Headless')?.checked).toBe(false);
    });

    it('updates stealthMode checkbox', () => {
      const { container, rerender } = renderNode({ ...baseData, stealthMode: false });
      expect(findCheckbox(container, 'Stealth Mode')?.checked).toBe(false);

      setupMock({ ...baseData, stealthMode: true });
      rerender(<ReactFlowProvider><CustomNode id={NODE_ID} data={baseData} selected={false} /></ReactFlowProvider>);
      expect(findCheckbox(container, 'Stealth Mode')?.checked).toBe(true);
    });

    it('updates browser select', () => {
      const { container, rerender } = renderNode({ ...baseData, browser: 'chromium' });
      expect(container.textContent).toContain('Chromium');

      setupMock({ ...baseData, browser: 'firefox' });
      rerender(<ReactFlowProvider><CustomNode id={NODE_ID} data={baseData} selected={false} /></ReactFlowProvider>);
      expect(container.textContent).toContain('Firefox');
    });
  });

  // ─── TYPE ───────────────────────────────────────────────────────
  describe('TYPE node', () => {
    const baseData = { type: NodeType.TYPE, label: 'Type' };

    it('updates selectorType select', () => {
      const { container, rerender } = renderNode({ ...baseData, selectorType: 'css' });
      expect(container.textContent).toContain('CSS Selector');

      setupMock({ ...baseData, selectorType: 'getByRole' });
      rerender(<ReactFlowProvider><CustomNode id={NODE_ID} data={baseData} selected={false} /></ReactFlowProvider>);
      expect(container.textContent).toContain('getByRole');
    });

    it('updates inputMethod select', () => {
      const { container, rerender } = renderNode({ ...baseData, inputMethod: 'fill' });
      expect(container.textContent).toContain('Fill');

      setupMock({ ...baseData, inputMethod: 'type' });
      rerender(<ReactFlowProvider><CustomNode id={NODE_ID} data={baseData} selected={false} /></ReactFlowProvider>);
      expect(container.textContent).toContain('Type');
    });

    it('updates selector text', () => {
      const { container, rerender } = renderNode({ ...baseData, selector: 'input.old' });
      expect(container.textContent).toContain('input.old');

      setupMock({ ...baseData, selector: 'input.new' });
      rerender(<ReactFlowProvider><CustomNode id={NODE_ID} data={baseData} selected={false} /></ReactFlowProvider>);
      expect(container.textContent).toContain('input.new');
    });
  });

  // ─── SCREENSHOT ─────────────────────────────────────────────────
  describe('SCREENSHOT node', () => {
    const baseData = { type: NodeType.SCREENSHOT, label: 'Screenshot' };

    it('updates action select', () => {
      const { container, rerender } = renderNode({ ...baseData, action: 'viewport' });
      expect(container.textContent).toContain('Viewport');

      setupMock({ ...baseData, action: 'fullPage' });
      rerender(<ReactFlowProvider><CustomNode id={NODE_ID} data={baseData} selected={false} /></ReactFlowProvider>);
      expect(container.textContent).toContain('Full Page');
    });

    it('updates fullPage checkbox (legacy mode)', () => {
      const { container, rerender } = renderNode({ ...baseData, fullPage: false });
      expect(findCheckbox(container, 'Full Page')?.checked).toBe(false);

      setupMock({ ...baseData, fullPage: true });
      rerender(<ReactFlowProvider><CustomNode id={NODE_ID} data={baseData} selected={false} /></ReactFlowProvider>);
      expect(findCheckbox(container, 'Full Page')?.checked).toBe(true);
    });
  });

  // ─── NAVIGATION ─────────────────────────────────────────────────
  describe('NAVIGATION node', () => {
    const baseData = { type: NodeType.NAVIGATION, label: 'Navigation' };

    it('updates action select', () => {
      const { container, rerender } = renderNode({ ...baseData, action: 'navigate' });
      expect(container.textContent).toContain('Navigate');

      setupMock({ ...baseData, action: 'goBack' });
      rerender(<ReactFlowProvider><CustomNode id={NODE_ID} data={baseData} selected={false} /></ReactFlowProvider>);
      expect(container.textContent).toContain('Go Back');
    });

    it('updates waitUntil select', () => {
      const { container, rerender } = renderNode({ ...baseData, action: 'navigate', waitUntil: 'networkidle' });
      expect(container.textContent).toContain('Network Idle');

      setupMock({ ...baseData, action: 'navigate', waitUntil: 'load' });
      rerender(<ReactFlowProvider><CustomNode id={NODE_ID} data={baseData} selected={false} /></ReactFlowProvider>);
      expect(container.textContent).toContain('Load');
    });

    it('updates url text', () => {
      const { container, rerender } = renderNode({ ...baseData, action: 'navigate', url: 'https://old.com' });
      expect(container.textContent).toContain('https://old.com');

      setupMock({ ...baseData, action: 'navigate', url: 'https://new.com' });
      rerender(<ReactFlowProvider><CustomNode id={NODE_ID} data={baseData} selected={false} /></ReactFlowProvider>);
      expect(container.textContent).toContain('https://new.com');
    });
  });

  // ─── KEYBOARD ───────────────────────────────────────────────────
  describe('KEYBOARD node', () => {
    const baseData = { type: NodeType.KEYBOARD, label: 'Keyboard' };

    it('updates action select', () => {
      const { container, rerender } = renderNode({ ...baseData, action: 'press' });
      expect(container.textContent).toContain('Press');

      setupMock({ ...baseData, action: 'type' });
      rerender(<ReactFlowProvider><CustomNode id={NODE_ID} data={baseData} selected={false} /></ReactFlowProvider>);
      expect(container.textContent).toContain('Type');
    });

    it('updates key text', () => {
      const { container, rerender } = renderNode({ ...baseData, action: 'press', key: 'Enter' });
      expect(container.textContent).toContain('Enter');

      setupMock({ ...baseData, action: 'press', key: 'Escape' });
      rerender(<ReactFlowProvider><CustomNode id={NODE_ID} data={baseData} selected={false} /></ReactFlowProvider>);
      expect(container.textContent).toContain('Escape');
    });
  });

  // ─── SCROLL ─────────────────────────────────────────────────────
  describe('SCROLL node', () => {
    const baseData = { type: NodeType.SCROLL, label: 'Scroll' };

    it('updates action select', () => {
      const { container, rerender } = renderNode({ ...baseData, action: 'scrollToElement' });
      expect(container.textContent).toContain('To Element');

      setupMock({ ...baseData, action: 'scrollToBottom' });
      rerender(<ReactFlowProvider><CustomNode id={NODE_ID} data={baseData} selected={false} /></ReactFlowProvider>);
      expect(container.textContent).toContain('To Bottom');
    });
  });

  // ─── WAIT ───────────────────────────────────────────────────────
  describe('WAIT node', () => {
    const baseData = { type: NodeType.WAIT, label: 'Wait' };

    it('updates waitType select', () => {
      const { container, rerender } = renderNode({ ...baseData, waitType: 'timeout' });
      expect(container.textContent).toContain('Timeout');

      setupMock({ ...baseData, waitType: 'selector' });
      rerender(<ReactFlowProvider><CustomNode id={NODE_ID} data={baseData} selected={false} /></ReactFlowProvider>);
      expect(container.textContent).toContain('Selector');
    });
  });

  // ─── API_REQUEST ────────────────────────────────────────────────
  describe('API_REQUEST node', () => {
    const baseData = { type: NodeType.API_REQUEST, label: 'API Request' };

    it('updates method select', () => {
      const { container, rerender } = renderNode({ ...baseData, method: 'GET' });
      expect(container.textContent).toContain('GET');

      setupMock({ ...baseData, method: 'POST' });
      rerender(<ReactFlowProvider><CustomNode id={NODE_ID} data={baseData} selected={false} /></ReactFlowProvider>);
      expect(container.textContent).toContain('POST');
    });

    it('updates url text', () => {
      const { container, rerender } = renderNode({ ...baseData, url: 'https://api.old.com' });
      expect(container.textContent).toContain('https://api.old.com');

      setupMock({ ...baseData, url: 'https://api.new.com' });
      rerender(<ReactFlowProvider><CustomNode id={NODE_ID} data={baseData} selected={false} /></ReactFlowProvider>);
      expect(container.textContent).toContain('https://api.new.com');
    });
  });

  // ─── API_CURL ───────────────────────────────────────────────────
  describe('API_CURL node', () => {
    const baseData = { type: NodeType.API_CURL, label: 'API cURL' };

    it('updates curlCommand textarea text', () => {
      const { container, rerender } = renderNode({ ...baseData, curlCommand: 'curl https://old.com' });
      expect(container.textContent).toContain('curl https://old.com');

      setupMock({ ...baseData, curlCommand: 'curl https://new.com' });
      rerender(<ReactFlowProvider><CustomNode id={NODE_ID} data={baseData} selected={false} /></ReactFlowProvider>);
      expect(container.textContent).toContain('curl https://new.com');
    });

    it('updates contextKey text', () => {
      const { container, rerender } = renderNode({ ...baseData, contextKey: 'oldKey' });
      expect(container.textContent).toContain('oldKey');

      setupMock({ ...baseData, contextKey: 'newKey' });
      rerender(<ReactFlowProvider><CustomNode id={NODE_ID} data={baseData} selected={false} /></ReactFlowProvider>);
      expect(container.textContent).toContain('newKey');
    });
  });

  // ─── DB_CONNECT ─────────────────────────────────────────────────
  describe('DB_CONNECT node', () => {
    const baseData = { type: NodeType.DB_CONNECT, label: 'DB Connect' };

    it('updates dbType select', () => {
      const { container, rerender } = renderNode({ ...baseData, dbType: 'postgres' });
      expect(container.textContent).toContain('PostgreSQL');

      setupMock({ ...baseData, dbType: 'mysql' });
      rerender(<ReactFlowProvider><CustomNode id={NODE_ID} data={baseData} selected={false} /></ReactFlowProvider>);
      expect(container.textContent).toContain('MySQL');
    });

    it('updates connectionKey text', () => {
      const { container, rerender } = renderNode({ ...baseData, connectionKey: 'conn1' });
      expect(container.textContent).toContain('conn1');

      setupMock({ ...baseData, connectionKey: 'conn2' });
      rerender(<ReactFlowProvider><CustomNode id={NODE_ID} data={baseData} selected={false} /></ReactFlowProvider>);
      expect(container.textContent).toContain('conn2');
    });
  });

  // ─── DB_QUERY ───────────────────────────────────────────────────
  describe('DB_QUERY node', () => {
    const baseData = { type: NodeType.DB_QUERY, label: 'DB Query' };

    it('updates queryType select', () => {
      const { container, rerender } = renderNode({ ...baseData, queryType: 'sql' });
      expect(container.textContent).toContain('SQL');

      setupMock({ ...baseData, queryType: 'mongodb' });
      rerender(<ReactFlowProvider><CustomNode id={NODE_ID} data={baseData} selected={false} /></ReactFlowProvider>);
      expect(container.textContent).toContain('MongoDB');
    });

    it('updates connectionKey text', () => {
      const { container, rerender } = renderNode({ ...baseData, connectionKey: 'dbOld' });
      expect(container.textContent).toContain('dbOld');

      setupMock({ ...baseData, connectionKey: 'dbNew' });
      rerender(<ReactFlowProvider><CustomNode id={NODE_ID} data={baseData} selected={false} /></ReactFlowProvider>);
      expect(container.textContent).toContain('dbNew');
    });
  });

  // ─── DB_DISCONNECT ──────────────────────────────────────────────
  describe('DB_DISCONNECT node', () => {
    const baseData = { type: NodeType.DB_DISCONNECT, label: 'DB Disconnect' };

    it('updates connectionKey text', () => {
      const { container, rerender } = renderNode({ ...baseData, connectionKey: 'connA' });
      expect(container.textContent).toContain('connA');

      setupMock({ ...baseData, connectionKey: 'connB' });
      rerender(<ReactFlowProvider><CustomNode id={NODE_ID} data={baseData} selected={false} /></ReactFlowProvider>);
      expect(container.textContent).toContain('connB');
    });
  });

  // ─── LOOP ───────────────────────────────────────────────────────
  describe('LOOP node', () => {
    const baseData = { type: NodeType.LOOP, label: 'Loop' };

    it('updates mode select', () => {
      const { container, rerender } = renderNode({ ...baseData, mode: 'forEach' });
      expect(container.textContent).toContain('For Each');

      setupMock({ ...baseData, mode: 'doWhile' });
      rerender(<ReactFlowProvider><CustomNode id={NODE_ID} data={baseData} selected={false} /></ReactFlowProvider>);
      expect(container.textContent).toContain('Do While');
    });

    it('updates arrayVariable text', () => {
      const { container, rerender } = renderNode({ ...baseData, mode: 'forEach', arrayVariable: 'items' });
      expect(container.textContent).toContain('items');

      setupMock({ ...baseData, mode: 'forEach', arrayVariable: 'results' });
      rerender(<ReactFlowProvider><CustomNode id={NODE_ID} data={baseData} selected={false} /></ReactFlowProvider>);
      expect(container.textContent).toContain('results');
    });
  });

  // ─── CSV_HANDLE ─────────────────────────────────────────────────
  describe('CSV_HANDLE node', () => {
    const baseData = { type: NodeType.CSV_HANDLE, label: 'CSV Handle' };

    it('updates action select', () => {
      const { container, rerender } = renderNode({ ...baseData, action: 'write' });
      expect(container.textContent).toContain('Write');

      setupMock({ ...baseData, action: 'read' });
      rerender(<ReactFlowProvider><CustomNode id={NODE_ID} data={baseData} selected={false} /></ReactFlowProvider>);
      expect(container.textContent).toContain('Read');
    });

    it('updates filePath text', () => {
      const { container, rerender } = renderNode({ ...baseData, filePath: '/old/path.csv' });
      expect(container.textContent).toContain('/old/path.csv');

      setupMock({ ...baseData, filePath: '/new/path.csv' });
      rerender(<ReactFlowProvider><CustomNode id={NODE_ID} data={baseData} selected={false} /></ReactFlowProvider>);
      expect(container.textContent).toContain('/new/path.csv');
    });
  });

  // ─── CONTEXT_MANIPULATE ─────────────────────────────────────────
  describe('CONTEXT_MANIPULATE node', () => {
    const baseData = { type: NodeType.CONTEXT_MANIPULATE, label: 'Context' };

    it('updates action select', () => {
      const { container, rerender } = renderNode({ ...baseData, action: 'setGeolocation' });
      expect(container.textContent).toContain('Set Geolocation');

      setupMock({ ...baseData, action: 'setViewportSize' });
      rerender(<ReactFlowProvider><CustomNode id={NODE_ID} data={baseData} selected={false} /></ReactFlowProvider>);
      expect(container.textContent).toContain('Set Viewport Size');
    });

    it('updates contextKey text', () => {
      const { container, rerender } = renderNode({ ...baseData, action: 'createContext', contextKey: 'ctx1' });
      expect(container.textContent).toContain('ctx1');

      setupMock({ ...baseData, action: 'createContext', contextKey: 'ctx2' });
      rerender(<ReactFlowProvider><CustomNode id={NODE_ID} data={baseData} selected={false} /></ReactFlowProvider>);
      expect(container.textContent).toContain('ctx2');
    });
  });

  // ─── ELEMENT_QUERY ──────────────────────────────────────────────
  describe('ELEMENT_QUERY node', () => {
    const baseData = { type: NodeType.ELEMENT_QUERY, label: 'Element Query' };

    it('updates action select', () => {
      const { container, rerender } = renderNode({ ...baseData, action: 'getText' });
      expect(container.textContent).toContain('Get Text');

      setupMock({ ...baseData, action: 'getCount' });
      rerender(<ReactFlowProvider><CustomNode id={NODE_ID} data={baseData} selected={false} /></ReactFlowProvider>);
      expect(container.textContent).toContain('Get Count');
    });

    it('updates selectorType select', () => {
      const { container, rerender } = renderNode({ ...baseData, selectorType: 'css' });
      expect(container.textContent).toContain('CSS Selector');

      setupMock({ ...baseData, selectorType: 'getByText' });
      rerender(<ReactFlowProvider><CustomNode id={NODE_ID} data={baseData} selected={false} /></ReactFlowProvider>);
      expect(container.textContent).toContain('getByText');
    });
  });

  // ─── FORM_INPUT ─────────────────────────────────────────────────
  describe('FORM_INPUT node', () => {
    const baseData = { type: NodeType.FORM_INPUT, label: 'Form Input' };

    it('updates action select', () => {
      const { container, rerender } = renderNode({ ...baseData, action: 'select' });
      expect(container.textContent).toContain('Select');

      setupMock({ ...baseData, action: 'check' });
      rerender(<ReactFlowProvider><CustomNode id={NODE_ID} data={baseData} selected={false} /></ReactFlowProvider>);
      expect(container.textContent).toContain('Check');
    });

    it('updates selectorType select', () => {
      const { container, rerender } = renderNode({ ...baseData, selectorType: 'css' });
      expect(container.textContent).toContain('CSS Selector');

      setupMock({ ...baseData, selectorType: 'xpath' });
      rerender(<ReactFlowProvider><CustomNode id={NODE_ID} data={baseData} selected={false} /></ReactFlowProvider>);
      expect(container.textContent).toContain('XPath');
    });
  });

  // ─── STORAGE ────────────────────────────────────────────────────
  describe('STORAGE node', () => {
    const baseData = { type: NodeType.STORAGE, label: 'Storage' };

    it('updates action select', () => {
      const { container, rerender } = renderNode({ ...baseData, action: 'getCookie' });
      expect(container.textContent).toContain('Get Cookie');

      setupMock({ ...baseData, action: 'setCookie' });
      rerender(<ReactFlowProvider><CustomNode id={NODE_ID} data={baseData} selected={false} /></ReactFlowProvider>);
      expect(container.textContent).toContain('Set Cookie');
    });

    it('updates contextKey text', () => {
      const { container, rerender } = renderNode({ ...baseData, contextKey: 'storOld' });
      expect(container.textContent).toContain('storOld');

      setupMock({ ...baseData, contextKey: 'storNew' });
      rerender(<ReactFlowProvider><CustomNode id={NODE_ID} data={baseData} selected={false} /></ReactFlowProvider>);
      expect(container.textContent).toContain('storNew');
    });
  });

  // ─── DIALOG ─────────────────────────────────────────────────────
  describe('DIALOG node', () => {
    const baseData = { type: NodeType.DIALOG, label: 'Dialog' };

    it('updates action select', () => {
      const { container, rerender } = renderNode({ ...baseData, action: 'accept' });
      expect(container.textContent).toContain('Accept');

      setupMock({ ...baseData, action: 'dismiss' });
      rerender(<ReactFlowProvider><CustomNode id={NODE_ID} data={baseData} selected={false} /></ReactFlowProvider>);
      expect(container.textContent).toContain('Dismiss');
    });
  });

  // ─── DOWNLOAD ───────────────────────────────────────────────────
  describe('DOWNLOAD node', () => {
    const baseData = { type: NodeType.DOWNLOAD, label: 'Download' };

    it('updates action select', () => {
      const { container, rerender } = renderNode({ ...baseData, action: 'waitForDownload' });
      expect(container.textContent).toContain('Wait');

      setupMock({ ...baseData, action: 'saveDownload' });
      rerender(<ReactFlowProvider><CustomNode id={NODE_ID} data={baseData} selected={false} /></ReactFlowProvider>);
      expect(container.textContent).toContain('Save');
    });
  });

  // ─── IFRAME ─────────────────────────────────────────────────────
  describe('IFRAME node', () => {
    const baseData = { type: NodeType.IFRAME, label: 'iFrame' };

    it('updates action select', () => {
      const { container, rerender } = renderNode({ ...baseData, action: 'switchToIframe' });
      expect(container.textContent).toContain('Switch To');

      setupMock({ ...baseData, action: 'switchToMainFrame' });
      rerender(<ReactFlowProvider><CustomNode id={NODE_ID} data={baseData} selected={false} /></ReactFlowProvider>);
      expect(container.textContent).toContain('Switch Back');
    });
  });

  // ─── INT_VALUE ──────────────────────────────────────────────────
  describe('INT_VALUE node', () => {
    const baseData = { type: NodeType.INT_VALUE, label: 'Int Value' };

    it('updates value number', () => {
      const { container, rerender } = renderNode({ ...baseData, value: 42 });
      expect(container.textContent).toContain('42');

      setupMock({ ...baseData, value: 99 });
      rerender(<ReactFlowProvider><CustomNode id={NODE_ID} data={baseData} selected={false} /></ReactFlowProvider>);
      expect(container.textContent).toContain('99');
    });
  });

  // ─── STRING_VALUE ───────────────────────────────────────────────
  describe('STRING_VALUE node', () => {
    const baseData = { type: NodeType.STRING_VALUE, label: 'String Value' };

    it('updates value text', () => {
      const { container, rerender } = renderNode({ ...baseData, value: 'hello' });
      expect(container.textContent).toContain('hello');

      setupMock({ ...baseData, value: 'world' });
      rerender(<ReactFlowProvider><CustomNode id={NODE_ID} data={baseData} selected={false} /></ReactFlowProvider>);
      expect(container.textContent).toContain('world');
    });
  });

  // ─── BOOLEAN_VALUE ──────────────────────────────────────────────
  describe('BOOLEAN_VALUE node', () => {
    const baseData = { type: NodeType.BOOLEAN_VALUE, label: 'Boolean Value' };

    it('updates value select', () => {
      const { container, rerender } = renderNode({ ...baseData, value: false });
      expect(container.textContent).toContain('False');

      setupMock({ ...baseData, value: true });
      rerender(<ReactFlowProvider><CustomNode id={NODE_ID} data={baseData} selected={false} /></ReactFlowProvider>);
      expect(container.textContent).toContain('True');
    });
  });

  // ─── INPUT_VALUE ────────────────────────────────────────────────
  describe('INPUT_VALUE node', () => {
    const baseData = { type: NodeType.INPUT_VALUE, label: 'Input Value' };

    it('updates dataType select', () => {
      const { container, rerender } = renderNode({ ...baseData, dataType: PropertyDataType.STRING });
      expect(container.textContent).toContain('String');

      setupMock({ ...baseData, dataType: PropertyDataType.INT });
      rerender(<ReactFlowProvider><CustomNode id={NODE_ID} data={baseData} selected={false} /></ReactFlowProvider>);
      expect(container.textContent).toContain('Int');
    });
  });
});
