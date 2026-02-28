import { LocatorHelper } from '../locatorHelper';
import { TextSelectorResolver } from '../textSelectorResolver';

jest.mock('../textSelectorResolver');

function createChainableLocator() {
  const locator: any = {
    filter: jest.fn().mockReturnThis(),
    locator: jest.fn().mockReturnThis(),
    nth: jest.fn().mockReturnThis(),
  };
  return locator;
}

function createLocatorMockPage() {
  const chainable = createChainableLocator();
  return {
    page: {
      locator: jest.fn().mockReturnValue(chainable),
      getByRole: jest.fn().mockReturnValue(chainable),
      getByText: jest.fn().mockReturnValue(chainable),
      getByLabel: jest.fn().mockReturnValue(chainable),
      getByPlaceholder: jest.fn().mockReturnValue(chainable),
      getByTestId: jest.fn().mockReturnValue(chainable),
      getByTitle: jest.fn().mockReturnValue(chainable),
      getByAltText: jest.fn().mockReturnValue(chainable),
    },
    chainable,
  };
}

describe('LocatorHelper', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createLocator', () => {
    it('should throw for empty selector', () => {
      const { page } = createLocatorMockPage();
      expect(() => LocatorHelper.createLocator(page as any, '')).toThrow('Selector cannot be empty');
    });

    it('should throw for whitespace-only selector', () => {
      const { page } = createLocatorMockPage();
      expect(() => LocatorHelper.createLocator(page as any, '   ')).toThrow('Selector cannot be empty');
    });

    describe('CSS selector', () => {
      it('should call page.locator for css type', () => {
        const { page } = createLocatorMockPage();
        LocatorHelper.createLocator(page as any, '#button', 'css');
        expect(page.locator).toHaveBeenCalledWith('#button');
      });

      it('should default to css when no type specified', () => {
        const { page } = createLocatorMockPage();
        LocatorHelper.createLocator(page as any, '.my-class');
        expect(page.locator).toHaveBeenCalledWith('.my-class');
      });

      it('should use css:light= when pierceShadow is false', () => {
        const { page } = createLocatorMockPage();
        LocatorHelper.createLocator(page as any, '#button', 'css', { pierceShadow: false });
        expect(page.locator).toHaveBeenCalledWith('css:light=#button');
      });
    });

    describe('XPath selector', () => {
      it('should prefix with xpath=', () => {
        const { page } = createLocatorMockPage();
        LocatorHelper.createLocator(page as any, "//button[@id='btn']", 'xpath');
        expect(page.locator).toHaveBeenCalledWith("xpath=//button[@id='btn']");
      });
    });

    describe('getByRole', () => {
      it('should parse role:button,name:Submit', () => {
        const { page } = createLocatorMockPage();
        LocatorHelper.createLocator(page as any, 'role:button,name:Submit', 'getByRole');
        expect(page.getByRole).toHaveBeenCalledWith('button', { name: 'Submit' });
      });

      it('should parse role-only format', () => {
        const { page } = createLocatorMockPage();
        LocatorHelper.createLocator(page as any, 'role:button', 'getByRole');
        expect(page.getByRole).toHaveBeenCalledWith('button', {});
      });

      it('should throw when role is missing', () => {
        const { page } = createLocatorMockPage();
        expect(() =>
          LocatorHelper.createLocator(page as any, 'name:Submit', 'getByRole')
        ).toThrow('Role is required for getByRole');
      });

      it('should throw on invalid format without colon', () => {
        const { page } = createLocatorMockPage();
        expect(() =>
          LocatorHelper.createLocator(page as any, 'button', 'getByRole')
        ).toThrow('Invalid getByRole format');
      });

      it('should parse boolean and number options', () => {
        const { page } = createLocatorMockPage();
        LocatorHelper.createLocator(page as any, 'role:button,exact:true,hidden:false', 'getByRole');
        expect(page.getByRole).toHaveBeenCalledWith('button', { exact: true, hidden: false });
      });
    });

    describe('getByText', () => {
      it('should parse text:value format', () => {
        const { page } = createLocatorMockPage();
        LocatorHelper.createLocator(page as any, 'text:Click here', 'getByText');
        expect(page.getByText).toHaveBeenCalledWith('Click here');
      });

      it('should handle regex format text:/pattern/', () => {
        const { page } = createLocatorMockPage();
        LocatorHelper.createLocator(page as any, 'text:/Submit|Cancel/', 'getByText');
        expect(page.getByText).toHaveBeenCalledWith(expect.any(RegExp));
      });

      it('should throw on invalid format missing text: prefix', () => {
        const { page } = createLocatorMockPage();
        expect(() =>
          LocatorHelper.createLocator(page as any, 'Click here', 'getByText')
        ).toThrow('Invalid getByText format');
      });
    });

    describe('getByLabel', () => {
      it('should parse label:value format', () => {
        const { page } = createLocatorMockPage();
        LocatorHelper.createLocator(page as any, 'label:Username', 'getByLabel');
        expect(page.getByLabel).toHaveBeenCalledWith('Username');
      });

      it('should throw on invalid format missing label: prefix', () => {
        const { page } = createLocatorMockPage();
        expect(() =>
          LocatorHelper.createLocator(page as any, 'Username', 'getByLabel')
        ).toThrow('Invalid getByLabel format');
      });
    });

    describe('getByPlaceholder', () => {
      it('should parse placeholder:value format', () => {
        const { page } = createLocatorMockPage();
        LocatorHelper.createLocator(page as any, 'placeholder:Enter email', 'getByPlaceholder');
        expect(page.getByPlaceholder).toHaveBeenCalledWith('Enter email');
      });

      it('should throw on invalid format', () => {
        const { page } = createLocatorMockPage();
        expect(() =>
          LocatorHelper.createLocator(page as any, 'Enter email', 'getByPlaceholder')
        ).toThrow('Invalid getByPlaceholder format');
      });
    });

    describe('getByTestId', () => {
      it('should parse testid:value format', () => {
        const { page } = createLocatorMockPage();
        LocatorHelper.createLocator(page as any, 'testid:submit-btn', 'getByTestId');
        expect(page.getByTestId).toHaveBeenCalledWith('submit-btn');
      });

      it('should throw on invalid format', () => {
        const { page } = createLocatorMockPage();
        expect(() =>
          LocatorHelper.createLocator(page as any, 'submit-btn', 'getByTestId')
        ).toThrow('Invalid getByTestId format');
      });
    });

    describe('getByTitle', () => {
      it('should parse title:value format', () => {
        const { page } = createLocatorMockPage();
        LocatorHelper.createLocator(page as any, 'title:Tooltip text', 'getByTitle');
        expect(page.getByTitle).toHaveBeenCalledWith('Tooltip text');
      });

      it('should throw on invalid format', () => {
        const { page } = createLocatorMockPage();
        expect(() =>
          LocatorHelper.createLocator(page as any, 'Tooltip', 'getByTitle')
        ).toThrow('Invalid getByTitle format');
      });
    });

    describe('getByAltText', () => {
      it('should parse alt:value format', () => {
        const { page } = createLocatorMockPage();
        LocatorHelper.createLocator(page as any, 'alt:Logo image', 'getByAltText');
        expect(page.getByAltText).toHaveBeenCalledWith('Logo image');
      });

      it('should handle regex format alt:/pattern/', () => {
        const { page } = createLocatorMockPage();
        LocatorHelper.createLocator(page as any, 'alt:/logo/', 'getByAltText');
        expect(page.getByAltText).toHaveBeenCalledWith(expect.any(RegExp));
      });

      it('should throw on invalid format', () => {
        const { page } = createLocatorMockPage();
        expect(() =>
          LocatorHelper.createLocator(page as any, 'Logo', 'getByAltText')
        ).toThrow('Invalid getByAltText format');
      });
    });

    describe('text type', () => {
      it('should throw directing caller to use createLocatorAsync', () => {
        const { page } = createLocatorMockPage();
        expect(() =>
          LocatorHelper.createLocator(page as any, 'Submit', 'text')
        ).toThrow('Text selector type requires async resolution');
      });
    });

    describe('unknown type', () => {
      it('should fall back to CSS with console warning', () => {
        const { page } = createLocatorMockPage();
        const warnSpy = jest.spyOn(console, 'warn').mockImplementation();
        LocatorHelper.createLocator(page as any, '#btn', 'unknownType');
        expect(page.locator).toHaveBeenCalledWith('#btn');
        expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('unknownType'));
        warnSpy.mockRestore();
      });
    });
  });

  describe('createLocatorAsync', () => {
    it('should delegate to TextSelectorResolver for text type', async () => {
      const { page, chainable } = createLocatorMockPage();
      (TextSelectorResolver.resolve as jest.Mock).mockResolvedValue(chainable);

      await LocatorHelper.createLocatorAsync(page as any, 'Submit', 'text');

      expect(TextSelectorResolver.resolve).toHaveBeenCalledWith(page, 'Submit', undefined);
    });

    it('should pass modifiers to TextSelectorResolver', async () => {
      const { page, chainable } = createLocatorMockPage();
      const modifiers = { nth: 0 };
      (TextSelectorResolver.resolve as jest.Mock).mockResolvedValue(chainable);

      await LocatorHelper.createLocatorAsync(page as any, 'Submit', 'text', modifiers);

      expect(TextSelectorResolver.resolve).toHaveBeenCalledWith(page, 'Submit', modifiers);
    });

    it('should delegate to sync createLocator for non-text types', async () => {
      const { page } = createLocatorMockPage();
      await LocatorHelper.createLocatorAsync(page as any, '#btn', 'css');

      expect(TextSelectorResolver.resolve).not.toHaveBeenCalled();
      expect(page.locator).toHaveBeenCalledWith('#btn');
    });

    it('should apply modifiers after text resolution', async () => {
      const { page, chainable } = createLocatorMockPage();
      (TextSelectorResolver.resolve as jest.Mock).mockResolvedValue(chainable);

      await LocatorHelper.createLocatorAsync(page as any, 'Submit', 'text', { nth: 2 });

      expect(chainable.nth).toHaveBeenCalledWith(2);
    });
  });

  describe('modifier application', () => {
    it('should apply nth modifier', () => {
      const { page, chainable } = createLocatorMockPage();
      LocatorHelper.createLocator(page as any, '#items', 'css', { nth: 2 });
      expect(chainable.nth).toHaveBeenCalledWith(2);
    });

    it('should apply filterText modifier', () => {
      const { page, chainable } = createLocatorMockPage();
      LocatorHelper.createLocator(page as any, '#items', 'css', { filterText: 'hello' });
      expect(chainable.filter).toHaveBeenCalledWith({ hasText: 'hello' });
    });

    it('should apply filterText as regex when filterTextRegex is true', () => {
      const { page, chainable } = createLocatorMockPage();
      LocatorHelper.createLocator(page as any, '#items', 'css', {
        filterText: 'hello.*world',
        filterTextRegex: true,
      });
      expect(chainable.filter).toHaveBeenCalledWith({ hasText: expect.any(RegExp) });
    });

    it('should apply filterSelector modifier', () => {
      const { page, chainable } = createLocatorMockPage();
      LocatorHelper.createLocator(page as any, '#items', 'css', {
        filterSelector: '.child',
        filterSelectorType: 'css',
      });
      expect(chainable.filter).toHaveBeenCalledWith({ has: expect.anything() });
    });

    it('should apply chainSelector modifier', () => {
      const { page, chainable } = createLocatorMockPage();
      LocatorHelper.createLocator(page as any, '#parent', 'css', { chainSelector: '.child' });
      expect(chainable.locator).toHaveBeenCalledWith('.child');
    });

    it('should prefix xpath for chainSelector when chainSelectorType is xpath', () => {
      const { page, chainable } = createLocatorMockPage();
      LocatorHelper.createLocator(page as any, '#parent', 'css', {
        chainSelector: '//span',
        chainSelectorType: 'xpath',
      });
      expect(chainable.locator).toHaveBeenCalledWith('xpath=//span');
    });

    it('should apply multiple modifiers in order', () => {
      const { page, chainable } = createLocatorMockPage();
      const callOrder: string[] = [];
      chainable.filter.mockImplementation((...args: any[]) => {
        callOrder.push('filter');
        return chainable;
      });
      chainable.locator.mockImplementation((...args: any[]) => {
        callOrder.push('locator');
        return chainable;
      });
      chainable.nth.mockImplementation((...args: any[]) => {
        callOrder.push('nth');
        return chainable;
      });

      LocatorHelper.createLocator(page as any, '#items', 'css', {
        filterText: 'hello',
        chainSelector: '.child',
        nth: 0,
      });

      expect(callOrder).toEqual(['filter', 'locator', 'nth']);
    });

    it('should return locator unchanged when no modifiers provided', () => {
      const { page, chainable } = createLocatorMockPage();
      const result = LocatorHelper.createLocator(page as any, '#btn', 'css');

      expect(chainable.filter).not.toHaveBeenCalled();
      expect(chainable.locator).not.toHaveBeenCalled();
      expect(chainable.nth).not.toHaveBeenCalled();
      expect(result).toBe(chainable);
    });
  });

  describe('pierceShadow warning', () => {
    it('should warn when pierceShadow false with non-css type', () => {
      const { page } = createLocatorMockPage();
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation();

      LocatorHelper.createLocator(page as any, "//button", 'xpath', { pierceShadow: false });

      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('pierceShadow'));
      warnSpy.mockRestore();
    });

    it('should not warn when pierceShadow false with css type', () => {
      const { page } = createLocatorMockPage();
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation();

      LocatorHelper.createLocator(page as any, '#btn', 'css', { pierceShadow: false });

      expect(warnSpy).not.toHaveBeenCalled();
      warnSpy.mockRestore();
    });
  });
});
