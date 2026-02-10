// Type definitions for FinderInjector

import { SelectorOption } from '@automflows/shared';

// Extend Window interface to include custom properties
declare global {
  interface Window {
    __finderInjected?: boolean;
    __finder?: (element: Element) => string;
    finder?: (element: Element) => string;
    generateSelectors?: (elementHandle: any) => Promise<SelectorOption[]>;
    sendSelectorsToBackend?: (selectors: SelectorOption[], targetNodeId?: string, targetFieldName?: string) => Promise<SelectorOption[]>;
    __finderOverlayInjected?: boolean;
    __finderOverlayInjectedDirect?: boolean;
    __automflowsNodeId?: string;
    __automflowsFieldName?: string;
    toggleFinderMode?: () => void;
  }
}

export {};
