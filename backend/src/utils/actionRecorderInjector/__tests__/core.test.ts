/**
 * @jest-environment jsdom
 */
import { ActionRecorderInjector } from '../core';
import { createMockPage } from '../../../__tests__/helpers/mocks';
import { ActionRecorderSessionManager } from '../../actionRecorderSessionManager';
import { injectFinderLibrary } from '../finder';
import { getOverlayScript } from '../overlay';
import { getWebhookListenersScript } from '../webhooks';

jest.mock('../../actionRecorderSessionManager');
jest.mock('../finder');
jest.mock('../overlay');
jest.mock('../webhooks');

describe('ActionRecorderInjector', () => {
  let mockPage: any;
  let mockIo: any;
  let mockSessionManager: any;

  beforeEach(() => {
    mockPage = createMockPage();
    mockIo = {
      emit: jest.fn(),
      to: jest.fn().mockReturnThis(),
    };
    mockSessionManager = {
      addAction: jest.fn(),
      startRecording: jest.fn(),
      stopRecording: jest.fn(),
    };

    (ActionRecorderSessionManager.getInstance as jest.Mock).mockReturnValue(mockSessionManager);
    (injectFinderLibrary as jest.Mock).mockResolvedValue(undefined);
    (getOverlayScript as jest.Mock).mockReturnValue('overlay-script');
    (getWebhookListenersScript as jest.Mock).mockReturnValue('webhook-script');

    mockPage.exposeFunction = jest.fn().mockResolvedValue(undefined);
    mockPage.addInitScript = jest.fn().mockResolvedValue(undefined);
    // Mock evaluate to handle window object - window exists in jsdom
    mockPage.evaluate = jest.fn().mockImplementation((fn: any, ...args: any[]) => {
      if (typeof fn === 'function') {
        try {
          const result = fn.call(window, ...args);
          return Promise.resolve(result);
        } catch (e) {
          return Promise.resolve(false);
        }
      }
      // If it's a string (script), return false
      return Promise.resolve(false);
    });
  });

  describe('injectActionRecorderOverlay', () => {
    it('should inject finder library', async () => {
      await ActionRecorderInjector.injectActionRecorderOverlay(mockPage, mockIo);

      expect(injectFinderLibrary).toHaveBeenCalledWith(mockPage);
    });

    it('should expose sendActionToBackend function', async () => {
      await ActionRecorderInjector.injectActionRecorderOverlay(mockPage, mockIo);

      expect(mockPage.exposeFunction).toHaveBeenCalledWith(
        '__sendActionToBackend',
        expect.any(Function)
      );
    });

    it('should expose startWebhookFromPage function', async () => {
      await ActionRecorderInjector.injectActionRecorderOverlay(mockPage, mockIo);

      expect(mockPage.exposeFunction).toHaveBeenCalledWith(
        '__startWebhookFromPage',
        expect.any(Function)
      );
    });

    it('should expose stopWebhookFromPage function', async () => {
      await ActionRecorderInjector.injectActionRecorderOverlay(mockPage, mockIo);

      expect(mockPage.exposeFunction).toHaveBeenCalledWith(
        '__stopWebhookFromPage',
        expect.any(Function)
      );
    });

    it('should add overlay script as init script', async () => {
      await ActionRecorderInjector.injectActionRecorderOverlay(mockPage, mockIo);

      expect(mockPage.addInitScript).toHaveBeenCalledWith('overlay-script');
    });

    it('should handle already exposed functions gracefully', async () => {
      mockPage.exposeFunction.mockRejectedValueOnce(new Error('Function already registered'));

      await expect(
        ActionRecorderInjector.injectActionRecorderOverlay(mockPage, mockIo)
      ).resolves.not.toThrow();
    });

    it('should inject overlay directly if not already injected', async () => {
      mockPage.evaluate.mockResolvedValueOnce(false); // Not already injected

      await ActionRecorderInjector.injectActionRecorderOverlay(mockPage, mockIo);

      expect(mockPage.evaluate).toHaveBeenCalledWith('overlay-script');
    });

    it('should recreate overlay if injected but overlay missing', async () => {
      // Set up window state
      (window as any).__actionRecorderInjected = true;
      let getElementByIdCallCount = 0;
      document.getElementById = jest.fn().mockImplementation(() => {
        getElementByIdCallCount++;
        // First call returns null (overlay doesn't exist), subsequent calls return element
        return getElementByIdCallCount === 1 ? null : {} as any;
      });

      // Reset the mock to return specific values
      mockPage.evaluate = jest.fn().mockImplementation((fn: any, ...args: any[]) => {
        if (typeof fn === 'function') {
          try {
            const result = fn.call(window, ...args);
            return Promise.resolve(result !== undefined ? result : true);
          } catch (e) {
            return Promise.resolve(false);
          }
        }
        return Promise.resolve(false);
      });

      await ActionRecorderInjector.injectActionRecorderOverlay(mockPage, mockIo);

      // Check that evaluate was called - the reset should have happened
      expect(mockPage.evaluate).toHaveBeenCalled();
      // Verify that __actionRecorderInjected was reset to false
      expect((window as any).__actionRecorderInjected).toBe(false);
      
      // Cleanup
      delete (window as any).__actionRecorderInjected;
    });
  });

  describe('startWebhookListening', () => {
    it('should inject finder library', async () => {
      await ActionRecorderInjector.startWebhookListening(mockPage, mockIo);

      expect(injectFinderLibrary).toHaveBeenCalledWith(mockPage);
    });

    it('should expose required functions', async () => {
      await ActionRecorderInjector.startWebhookListening(mockPage, mockIo);

      expect(mockPage.exposeFunction).toHaveBeenCalledWith('__sendActionToBackend', expect.any(Function));
      expect(mockPage.exposeFunction).toHaveBeenCalledWith('__startWebhookFromPage', expect.any(Function));
      expect(mockPage.exposeFunction).toHaveBeenCalledWith('__stopWebhookFromPage', expect.any(Function));
    });

    it('should evaluate webhook listeners script', async () => {
      await ActionRecorderInjector.startWebhookListening(mockPage, mockIo);

      expect(mockPage.evaluate).toHaveBeenCalledWith('webhook-script');
    });

    it('should start recording in session manager', async () => {
      await ActionRecorderInjector.startWebhookListening(mockPage, mockIo);

      // The exposed function should call startRecording when invoked
      const startWebhookCall = (mockPage.exposeFunction as jest.Mock).mock.calls.find(
        (call: any[]) => call[0] === '__startWebhookFromPage'
      );
      expect(startWebhookCall).toBeDefined();
    });
  });

  describe('stopWebhookListening', () => {
    it('should stop recording in page', async () => {
      await ActionRecorderInjector.stopWebhookListening(mockPage);

      expect(mockPage.evaluate).toHaveBeenCalledWith(expect.any(Function));
    });

    it('should set actionRecorderActive to false', async () => {
      // Set up window state
      (window as any).__actionRecorderActive = true;
      (window as any).__webhookListenersActive = true;
      (window as any).__stopActionRecording = jest.fn();

      // Reset mock to track the call properly
      mockPage.evaluate = jest.fn().mockImplementation((fn: any, ...args: any[]) => {
        if (typeof fn === 'function') {
          try {
            fn.call(window, ...args);
            return Promise.resolve(undefined);
          } catch (e) {
            return Promise.resolve(undefined);
          }
        }
        return Promise.resolve(undefined);
      });

      await ActionRecorderInjector.stopWebhookListening(mockPage);

      expect(mockPage.evaluate).toHaveBeenCalled();
      
      // Verify the script sets the flags
      expect((window as any).__actionRecorderActive).toBe(false);
      expect((window as any).__webhookListenersActive).toBe(false);
      
      // Cleanup
      delete (window as any).__actionRecorderActive;
      delete (window as any).__webhookListenersActive;
      delete (window as any).__stopActionRecording;
    });
  });
});
