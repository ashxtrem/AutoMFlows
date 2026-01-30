/**
 * Helper functions for selector type UI
 */

export function getSelectorPlaceholder(selectorType: string): string {
  switch (selectorType) {
    case 'css':
      return "#button or .class-name";
    case 'xpath':
      return "//button[@id='button']";
    case 'getByRole':
      return "role:button,name:Submit";
    case 'getByText':
      return "text:Click here";
    case 'getByLabel':
      return "label:Username";
    case 'getByPlaceholder':
      return "placeholder:Enter email";
    case 'getByTestId':
      return "testid:submit-button";
    case 'getByTitle':
      return "title:Tooltip text";
    case 'getByAltText':
      return "alt:Logo image";
    default:
      return "#button or //button[@id='button']";
  }
}

export function getSelectorHelpText(selectorType: string): string {
  switch (selectorType) {
    case 'getByRole':
      return "Format: role:button,name:Submit (name is optional). Supports variables: role:${roleVar},name:${nameVar}";
    case 'getByText':
      return "Format: text:Click here or text:/regex/ for regex. Supports variables: text:${dynamicText}";
    case 'getByLabel':
      return "Format: label:Username. Supports variables: label:${fieldLabel}";
    case 'getByPlaceholder':
      return "Format: placeholder:Enter email. Supports variables: placeholder:${placeholderText}";
    case 'getByTestId':
      return "Format: testid:submit-button. Supports variables: testid:${testId}";
    case 'getByTitle':
      return "Format: title:Tooltip text. Supports variables: title:${tooltipText}";
    case 'getByAltText':
      return "Format: alt:Logo image or alt:/regex/ for regex. Supports variables: alt:${imageAlt}";
    default:
      return "";
  }
}

export const SELECTOR_TYPE_OPTIONS = [
  { value: 'css', label: 'CSS Selector' },
  { value: 'xpath', label: 'XPath' },
  { value: 'getByRole', label: 'getByRole' },
  { value: 'getByText', label: 'getByText' },
  { value: 'getByLabel', label: 'getByLabel' },
  { value: 'getByPlaceholder', label: 'getByPlaceholder' },
  { value: 'getByTestId', label: 'getByTestId' },
  { value: 'getByTitle', label: 'getByTitle' },
  { value: 'getByAltText', label: 'getByAltText' },
];
