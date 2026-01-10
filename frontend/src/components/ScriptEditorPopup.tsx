import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { Node } from 'reactflow';
import Editor from '@monaco-editor/react';
import { OpenBrowserNodeData } from '@automflows/shared';

interface ScriptEditorPopupProps {
  node: Node;
  onSave: (script: string) => void;
  onClose: () => void;
}

export default function ScriptEditorPopup({ node, onSave, onClose }: ScriptEditorPopupProps) {
  const data = node.data as OpenBrowserNodeData;
  const [script, setScript] = useState<string>(data.jsScript || '');

  useEffect(() => {
    setScript(data.jsScript || '');
  }, [data.jsScript]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleCancel();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      handleCancel();
    }
  };

  const handleSave = () => {
    onSave(script);
    onClose();
  };

  const handleCancel = () => {
    setScript(data.jsScript || '');
    onClose();
  };

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      onClick={handleBackdropClick}
    >
      <div className="bg-gray-800 border border-gray-700 rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[85vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <h2 className="text-lg font-semibold text-white">
            JavaScript Script Editor
          </h2>
          <button
            onClick={handleCancel}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>
        
        <div className="overflow-y-auto p-4 flex-1">
          <div className="mb-4">
            <div className="bg-gray-900 border border-gray-700 rounded overflow-hidden">
              <Editor
                height="400px"
                defaultLanguage="javascript"
                value={script}
                onChange={(value) => setScript(value || '')}
                theme="vs-dark"
                options={{
                  minimap: { enabled: false },
                  fontSize: 12,
                  lineNumbers: 'on',
                  scrollBeyondLastLine: false,
                  automaticLayout: true,
                }}
              />
            </div>
          </div>

          <div className="mt-4 p-3 bg-blue-900 border border-blue-700 rounded text-xs text-blue-200">
            <strong>Info:</strong> This script will be injected into all pages before they load. It runs automatically on every page navigation.
          </div>

          <div className="mt-3 p-3 bg-gray-900 border border-gray-700 rounded text-xs text-gray-300">
            <strong>Example usage:</strong>
            <pre className="mt-2 text-xs bg-gray-800 p-2 rounded overflow-x-auto">
{`// Set mobile user agent (iPhone example)
Object.defineProperty(navigator, 'userAgent', {
  get: () => 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1'
});

// Set custom properties
window.sso = 'your-sso-token';
window.token = 'your-token';

// Set cookies
document.cookie = 'sessionId=abc123; path=/';

// Modify DOM before page loads
// (runs before page content is loaded)`}
            </pre>
          </div>
        </div>

        <div className="p-4 border-t border-gray-700 flex justify-end gap-2">
          <button
            onClick={handleCancel}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
