/**
 * Generate webhook listeners script for action recorder
 */
export function getWebhookListenersScript(): string {
  return `
    (function() {
      if (window.__webhookListenersActive) {
        return;
      }
      window.__webhookListenersActive = true;
      
      let actionIdCounter = 0;
      
      function generateSelector(element) {
        if (!window.__finder && !window.finder) {
          return '';
        }
        try {
          const finder = window.__finder || window.finder;
          return finder(element);
        } catch (e) {
          return '';
        }
      }
      
      function getElementInfo(element) {
        return {
          tagName: element.tagName.toLowerCase(),
          id: element.id || undefined,
          className: element.className || undefined,
          text: (element.textContent || '').trim().substring(0, 100) || undefined,
        };
      }
      
      function recordAction(type, element, data) {
        if (!window.__actionRecorderActive) {
          return;
        }
        
        const action = {
          id: 'action-' + Date.now() + '-' + (actionIdCounter++),
          type: type,
          timestamp: Date.now(),
        };
        
        if (element) {
          const selector = generateSelector(element);
          if (selector) {
            action.selector = selector;
            action.selectorType = selector.startsWith('//') ? 'xpath' : 'css';
          }
          action.elementInfo = getElementInfo(element);
        }
        
        if (data) {
          Object.assign(action, data);
        }
        
        // Call exposed function
        if (window.__sendActionToBackend) {
          window.__sendActionToBackend(action);
        }
      }
      
      // Store recordAction globally so it can be called from event listeners
      window.__recordAction = recordAction;
      
      // Click listener
      document.addEventListener('click', function(e) {
        if (e.target instanceof Element) {
          recordAction('click', e.target);
        }
      }, true);
      
      // Input/textarea change listener
      document.addEventListener('input', function(e) {
        if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
          recordAction('type', e.target, { value: e.target.value });
        }
      }, true);
      
      // Keyboard listener
      document.addEventListener('keydown', function(e) {
        if (e.target instanceof Element && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) {
          recordAction('keyboard', e.target, { key: e.key });
        }
      }, true);
      
      // Form input listener (select, checkbox, radio)
      document.addEventListener('change', function(e) {
        if (e.target instanceof HTMLSelectElement) {
          recordAction('form-input', e.target, { value: e.target.value });
        } else if (e.target instanceof HTMLInputElement && (e.target.type === 'checkbox' || e.target.type === 'radio')) {
          recordAction('form-input', e.target, { value: e.target.checked ? 'checked' : 'unchecked' });
        }
      }, true);
      
      // Navigation listener
      let lastUrl = window.location.href;
      const checkNavigation = function() {
        if (window.location.href !== lastUrl) {
          lastUrl = window.location.href;
          recordAction('navigation', undefined, { url: lastUrl });
        }
      };
      window.addEventListener('popstate', checkNavigation);
      setInterval(checkNavigation, 1000);
      
      // Scroll listener
      let scrollTimeout;
      window.addEventListener('scroll', function() {
        clearTimeout(scrollTimeout);
        scrollTimeout = setTimeout(function() {
          recordAction('scroll');
        }, 100);
      }, true);
      
      // Hover listener (with debounce)
      let hoverTimeout;
      document.addEventListener('mouseover', function(e) {
        if (e.target instanceof Element) {
          clearTimeout(hoverTimeout);
          hoverTimeout = setTimeout(function() {
            recordAction('hover', e.target);
          }, 300);
        }
      }, true);
      
      // Update overlay to show recording state
      window.__startActionRecording = function() {
        window.__actionRecorderActive = true;
        const overlay = document.getElementById('automflows-action-recorder-overlay');
        if (overlay) {
          overlay.style.backgroundColor = '#EF4444';
          overlay.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="6" y="6" width="12" height="12" rx="2" fill="white"/></svg>';
        }
      };
      
      window.__stopActionRecording = function() {
        window.__actionRecorderActive = false;
        const overlay = document.getElementById('automflows-action-recorder-overlay');
        if (overlay) {
          overlay.style.backgroundColor = '#3B82F6';
          overlay.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="10" stroke="white" stroke-width="2" fill="none"/><circle cx="12" cy="12" r="3" fill="white"/></svg>';
        }
      };
    })();
  `;
}
