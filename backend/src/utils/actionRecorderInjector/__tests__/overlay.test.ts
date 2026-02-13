import { getOverlayScript } from '../overlay';

describe('getOverlayScript', () => {
  it('should return a string script', () => {
    const script = getOverlayScript();
    
    expect(typeof script).toBe('string');
    expect(script.length).toBeGreaterThan(0);
  });

  it('should contain overlay creation logic', () => {
    const script = getOverlayScript();
    
    expect(script).toContain('createOverlay');
    expect(script).toContain('automflows-action-recorder-overlay');
  });

  it('should contain recording toggle logic', () => {
    const script = getOverlayScript();
    
    expect(script).toContain('toggleRecording');
    expect(script).toContain('startRecording');
    expect(script).toContain('stopRecording');
  });

  it('should contain webhook listeners setup', () => {
    const script = getOverlayScript();
    
    expect(script).toContain('setupWebhookListeners');
    expect(script).toContain('recordAction');
  });

  it('should contain event listeners', () => {
    const script = getOverlayScript();
    
    expect(script).toContain('addEventListener');
    expect(script).toContain('click');
    expect(script).toContain('input');
    expect(script).toContain('scroll');
  });
});
