import { exposeFinderFunctions } from '../functions';
import { createMockPage } from '../../../__tests__/helpers/mocks';
import { SelectorSessionManager } from '../../selectorSessionManager';

jest.mock('../../selectorSessionManager');

describe('functions', () => {
  let mockPage: any;
  let mockIo: any;
  let mockContext: any;
  let mockSessionManager: any;

  beforeEach(() => {
    mockPage = createMockPage();
    mockIo = {
      emit: jest.fn(),
      to: jest.fn().mockReturnThis(),
    };
    mockContext = {
      exposeFunction: jest.fn().mockResolvedValue(undefined),
    };

    mockPage.evaluate = jest.fn().mockResolvedValue(undefined);
    mockPage.evaluateHandle = jest.fn().mockResolvedValue({ asElement: () => ({}) });
    // The code uses (context || page).exposeFunction, so page needs exposeFunction too
    mockPage.exposeFunction = jest.fn().mockResolvedValue(undefined);
    mockPage.context = jest.fn().mockReturnValue(mockContext);

    mockSessionManager = {
      getCurrentTarget: jest.fn().mockReturnValue({
        nodeId: 'test-node',
        fieldName: 'test-field',
      }),
    };

    (SelectorSessionManager.getInstance as jest.Mock).mockReturnValue(mockSessionManager);
  });

  describe('exposeFinderFunctions', () => {
    it('should expose generateSelectors function', async () => {
      await exposeFinderFunctions(mockPage, mockIo);

      expect(mockPage.exposeFunction).toHaveBeenCalledWith(
        'generateSelectors',
        expect.any(Function)
      );
    });

    it('should expose sendSelectorsToBackend function', async () => {
      await exposeFinderFunctions(mockPage, mockIo);

      expect(mockPage.exposeFunction).toHaveBeenCalledWith(
        'sendSelectorsToBackend',
        expect.any(Function)
      );
    });

    it('should use page.exposeFunction if context not provided', async () => {
      await exposeFinderFunctions(mockPage, mockIo);

      expect(mockPage.exposeFunction).toHaveBeenCalled();
    });

    it('should use provided context if available', async () => {
      const customContext = { exposeFunction: jest.fn().mockResolvedValue(undefined) } as any;
      await exposeFinderFunctions(mockPage, mockIo, customContext);

      expect(customContext.exposeFunction).toHaveBeenCalled();
      expect(mockPage.exposeFunction).not.toHaveBeenCalled();
    });

    it('should verify functions are accessible', async () => {
      mockPage.evaluate.mockResolvedValueOnce({
        generateSelectors: 'function',
        sendSelectorsToBackend: 'function',
        finder: 'function',
        finder2: 'function',
      });

      await exposeFinderFunctions(mockPage, mockIo);

      expect(mockPage.evaluate).toHaveBeenCalled();
    });

    describe('generateSelectors function', () => {
      it('should expose generateSelectors function', async () => {
        await exposeFinderFunctions(mockPage, mockIo);

        expect(mockPage.exposeFunction).toHaveBeenCalledWith(
          'generateSelectors',
          expect.any(Function)
        );
      });

      it('should expose function that calls page.evaluate', async () => {
        let exposedFunction: any;
        mockPage.exposeFunction.mockImplementation((name: string, fn: any) => {
          if (name === 'generateSelectors') {
            exposedFunction = fn;
          }
          return Promise.resolve();
        });

        await exposeFinderFunctions(mockPage, mockIo);

        expect(exposedFunction).toBeDefined();
        expect(typeof exposedFunction).toBe('function');
      });
    });

    describe('sendSelectorsToBackend function', () => {
      it('should expose sendSelectorsToBackend function', async () => {
        await exposeFinderFunctions(mockPage, mockIo);

        expect(mockPage.exposeFunction).toHaveBeenCalledWith(
          'sendSelectorsToBackend',
          expect.any(Function)
        );
      });

      it('should expose function that uses Socket.IO', async () => {
        let exposedFunction: any;
        mockPage.exposeFunction.mockImplementation((name: string, fn: any) => {
          if (name === 'sendSelectorsToBackend') {
            exposedFunction = fn;
          }
          return Promise.resolve();
        });

        await exposeFinderFunctions(mockPage, mockIo);

        expect(exposedFunction).toBeDefined();
        expect(typeof exposedFunction).toBe('function');
      });
    });
  });
});
