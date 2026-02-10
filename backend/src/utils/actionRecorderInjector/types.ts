// Type definitions for ActionRecorderInjector

// Extend Window interface
declare global {
  interface Window {
    __actionRecorderInjected?: boolean;
    __actionRecorderActive?: boolean;
    __webhookListenersActive?: boolean;
    __finder?: (element: Element) => string;
    finder?: (element: Element) => string;
    __startActionRecording?: () => void;
    __stopActionRecording?: () => void;
  }
}

export {};
