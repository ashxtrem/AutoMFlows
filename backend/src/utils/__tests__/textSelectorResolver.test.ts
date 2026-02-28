import { TextSelectorResolver } from '../textSelectorResolver';

function createMockLocator(count: number) {
  return { count: jest.fn().mockResolvedValue(count) };
}

interface MockPageConfig {
  roleMatches?: Record<string, number>;
  labelCount?: number;
  placeholderCount?: number;
  textExactCount?: number;
  textSubstringCount?: number;
}

function createTextMockPage(config: MockPageConfig = {}) {
  return {
    getByRole: jest.fn((role: string) => createMockLocator(config.roleMatches?.[role] ?? 0)),
    getByLabel: jest.fn(() => createMockLocator(config.labelCount ?? 0)),
    getByPlaceholder: jest.fn(() => createMockLocator(config.placeholderCount ?? 0)),
    getByText: jest.fn((_text: string, opts?: { exact?: boolean }) =>
      opts?.exact
        ? createMockLocator(config.textExactCount ?? 0)
        : createMockLocator(config.textSubstringCount ?? 0)
    ),
  };
}

describe('TextSelectorResolver', () => {
  describe('input validation', () => {
    it('should throw for empty string', async () => {
      const page = createTextMockPage();
      await expect(TextSelectorResolver.resolve(page as any, '')).rejects.toThrow(
        'Selector text cannot be empty'
      );
    });

    it('should throw for whitespace-only string', async () => {
      const page = createTextMockPage();
      await expect(TextSelectorResolver.resolve(page as any, '   ')).rejects.toThrow(
        'Selector text cannot be empty'
      );
    });

    it('should trim whitespace before searching', async () => {
      const page = createTextMockPage({ roleMatches: { button: 1 } });
      await TextSelectorResolver.resolve(page as any, '  Submit  ');
      expect(page.getByRole).toHaveBeenCalledWith('button', { name: 'Submit' });
    });
  });

  describe('strategy priority - single match', () => {
    it('should find element via getByRole (button) first', async () => {
      const page = createTextMockPage({ roleMatches: { button: 1 }, textExactCount: 1 });
      const result = await TextSelectorResolver.resolve(page as any, 'Submit');

      expect(page.getByRole).toHaveBeenCalledWith('button', { name: 'Submit' });
      expect(result.count).toBeDefined();
    });

    it('should fall through to getByLabel when no role matches', async () => {
      const page = createTextMockPage({ labelCount: 1 });
      await TextSelectorResolver.resolve(page as any, 'Username');

      expect(page.getByRole).toHaveBeenCalled();
      expect(page.getByLabel).toHaveBeenCalledWith('Username');
    });

    it('should fall through to getByPlaceholder when no label matches', async () => {
      const page = createTextMockPage({ placeholderCount: 1 });
      await TextSelectorResolver.resolve(page as any, 'Enter email');

      expect(page.getByLabel).toHaveBeenCalled();
      expect(page.getByPlaceholder).toHaveBeenCalledWith('Enter email');
    });

    it('should fall through to getByText (exact) when no placeholder matches', async () => {
      const page = createTextMockPage({ textExactCount: 1 });
      await TextSelectorResolver.resolve(page as any, 'Click here');

      expect(page.getByPlaceholder).toHaveBeenCalled();
      expect(page.getByText).toHaveBeenCalledWith('Click here', { exact: true });
    });

    it('should fall through to getByText (substring) as last resort', async () => {
      const page = createTextMockPage({ textSubstringCount: 1 });
      await TextSelectorResolver.resolve(page as any, 'Click');

      expect(page.getByText).toHaveBeenCalledWith('Click', { exact: true });
      expect(page.getByText).toHaveBeenCalledWith('Click');
    });
  });

  describe('no match', () => {
    it('should throw descriptive error when all strategies return 0', async () => {
      const page = createTextMockPage();
      await expect(TextSelectorResolver.resolve(page as any, 'NonExistent')).rejects.toThrow(
        'No element found matching text "NonExistent"'
      );
    });

    it('should mention all strategies tried in the error', async () => {
      const page = createTextMockPage();
      await expect(TextSelectorResolver.resolve(page as any, 'Missing')).rejects.toThrow(
        'getByRole (with name), getByLabel, getByPlaceholder, getByText'
      );
    });
  });

  describe('multiple matches without disambiguation', () => {
    it('should throw error when role finds count > 1 with no modifiers', async () => {
      const page = createTextMockPage({ roleMatches: { button: 3 } });
      await expect(TextSelectorResolver.resolve(page as any, 'Submit')).rejects.toThrow(
        'Found 3 elements matching text "Submit"'
      );
    });

    it('should include strategy name in error', async () => {
      const page = createTextMockPage({ roleMatches: { button: 2 } });
      await expect(TextSelectorResolver.resolve(page as any, 'OK')).rejects.toThrow(
        "getByRole('button', { name: 'OK' })"
      );
    });

    it('should include modifier guidance in error', async () => {
      const page = createTextMockPage({ roleMatches: { button: 2 } });
      await expect(TextSelectorResolver.resolve(page as any, 'OK')).rejects.toThrow(
        'nth: 0'
      );
    });
  });

  describe('multiple matches with disambiguation modifiers', () => {
    it('should return locator when nth modifier is set', async () => {
      const page = createTextMockPage({ roleMatches: { button: 3 } });
      const result = await TextSelectorResolver.resolve(page as any, 'Submit', { nth: 0 });
      expect(result).toBeDefined();
      expect(result.count).toBeDefined();
    });

    it('should return locator when filterText modifier is set', async () => {
      const page = createTextMockPage({ roleMatches: { button: 3 } });
      const result = await TextSelectorResolver.resolve(page as any, 'Submit', { filterText: 'primary' });
      expect(result).toBeDefined();
    });

    it('should return locator when filterSelector modifier is set', async () => {
      const page = createTextMockPage({ roleMatches: { button: 3 } });
      const result = await TextSelectorResolver.resolve(page as any, 'Submit', { filterSelector: '.primary' });
      expect(result).toBeDefined();
    });

    it('should still allow single match without modifiers', async () => {
      const page = createTextMockPage({ roleMatches: { button: 1 } });
      const result = await TextSelectorResolver.resolve(page as any, 'Submit');
      expect(result).toBeDefined();
    });
  });

  describe('strategy short-circuit', () => {
    it('should stop trying roles once one matches', async () => {
      const page = createTextMockPage({ roleMatches: { button: 1 } });
      await TextSelectorResolver.resolve(page as any, 'Submit');

      // button matched, so link/menuitem/tab/option should not be tried
      expect(page.getByRole).toHaveBeenCalledTimes(1);
      expect(page.getByRole).toHaveBeenCalledWith('button', { name: 'Submit' });
    });

    it('should try link role if button returns 0', async () => {
      const page = createTextMockPage({ roleMatches: { link: 1 } });
      await TextSelectorResolver.resolve(page as any, 'Read More');

      expect(page.getByRole).toHaveBeenCalledWith('button', { name: 'Read More' });
      expect(page.getByRole).toHaveBeenCalledWith('link', { name: 'Read More' });
    });

    it('should skip lower-priority strategies when getByRole matches', async () => {
      const page = createTextMockPage({ roleMatches: { button: 1 }, labelCount: 1, textExactCount: 1 });
      const result = await TextSelectorResolver.resolve(page as any, 'Submit');

      expect(page.getByRole).toHaveBeenCalled();
      expect(result).toBeDefined();
      expect(page.getByLabel).not.toHaveBeenCalled();
      expect(page.getByPlaceholder).not.toHaveBeenCalled();
      expect(page.getByText).not.toHaveBeenCalled();
    });
  });

  describe('exception handling in strategies', () => {
    it('should skip strategy when getByRole throws', async () => {
      const page = createTextMockPage({ textExactCount: 1 });
      page.getByRole.mockImplementation(() => { throw new Error('role error'); });

      const result = await TextSelectorResolver.resolve(page as any, 'Submit');
      expect(result).toBeDefined();
    });

    it('should skip strategy when getByLabel throws', async () => {
      const page = createTextMockPage({ textExactCount: 1 });
      page.getByLabel.mockImplementation(() => { throw new Error('label error'); });

      const result = await TextSelectorResolver.resolve(page as any, 'Submit');
      expect(result).toBeDefined();
    });

    it('should skip strategy when getByPlaceholder throws', async () => {
      const page = createTextMockPage({ textExactCount: 1 });
      page.getByPlaceholder.mockImplementation(() => { throw new Error('placeholder error'); });

      const result = await TextSelectorResolver.resolve(page as any, 'Submit');
      expect(result).toBeDefined();
    });
  });
});
