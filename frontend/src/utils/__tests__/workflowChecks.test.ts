import { describe, it, expect } from 'vitest';
import { hasHeadlessBrowser } from '../workflowChecks';
import { Node } from 'reactflow';

describe('workflowChecks', () => {
  describe('hasHeadlessBrowser', () => {
    it('should return true when headless browser node exists', () => {
      const nodes: Node[] = [
        {
          id: 'n1',
          data: { type: 'openBrowser', headless: true },
          position: { x: 0, y: 0 },
        },
      ];
      expect(hasHeadlessBrowser(nodes)).toBe(true);
    });

    it('should return false when no headless browser nodes', () => {
      const nodes: Node[] = [
        {
          id: 'n1',
          data: { type: 'action' },
          position: { x: 0, y: 0 },
        },
      ];
      expect(hasHeadlessBrowser(nodes)).toBe(false);
    });

    it('should return true when headless is not explicitly false', () => {
      const nodes: Node[] = [
        {
          id: 'n1',
          data: { type: 'openBrowser' },
          position: { x: 0, y: 0 },
        },
      ];
      expect(hasHeadlessBrowser(nodes)).toBe(true);
    });
  });
});
