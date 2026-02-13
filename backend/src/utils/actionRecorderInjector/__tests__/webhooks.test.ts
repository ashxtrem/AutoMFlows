import { getWebhookListenersScript } from '../webhooks';

describe('getWebhookListenersScript', () => {
  it('should return a string script', () => {
    const script = getWebhookListenersScript();
    
    expect(typeof script).toBe('string');
    expect(script.length).toBeGreaterThan(0);
  });

  it('should contain action recording logic', () => {
    const script = getWebhookListenersScript();
    
    expect(script).toContain('recordAction');
    expect(script).toContain('__sendActionToBackend');
  });

  it('should contain event listeners for all action types', () => {
    const script = getWebhookListenersScript();
    
    expect(script).toContain('click');
    expect(script).toContain('input');
    expect(script).toContain('keydown');
    expect(script).toContain('change');
    expect(script).toContain('scroll');
    expect(script).toContain('mouseover');
  });

  it('should contain selector generation logic', () => {
    const script = getWebhookListenersScript();
    
    expect(script).toContain('generateSelector');
    expect(script).toContain('__finder');
  });

  it('should contain element info extraction', () => {
    const script = getWebhookListenersScript();
    
    expect(script).toContain('getElementInfo');
    expect(script).toContain('tagName');
  });

  it('should contain navigation tracking', () => {
    const script = getWebhookListenersScript();
    
    expect(script).toContain('checkNavigation');
    expect(script).toContain('location.href');
  });
});
