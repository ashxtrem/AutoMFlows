import { useState, useEffect, useRef } from 'react';
import { Node } from 'reactflow';
import Editor from '@monaco-editor/react';
import { usePropertyInput } from '../../hooks/usePropertyInput';

interface JavaScriptCodeConfigProps {
  node: Node;
  onChange: (field: string, value: any) => void;
}

export default function JavaScriptCodeConfig({ node, onChange }: JavaScriptCodeConfigProps) {
  const data = node.data;
  const { getPropertyValue, isPropertyDisabled } = usePropertyInput(node);
  const [code, setCode] = useState(data.code || '// Your code here\nreturn context.data;');
  const prevCodeRef = useRef<string>(code);
  const isInitialMountRef = useRef(true);
  const isCodeDisabled = isPropertyDisabled('code');

  // Sync state when node.data.code changes externally (but not on initial mount)
  useEffect(() => {
    if (!isInitialMountRef.current && data.code !== code && data.code !== prevCodeRef.current) {
      const newCode = isCodeDisabled ? getPropertyValue('code', '// Your code here\nreturn context.data;') : (data.code || '// Your code here\nreturn context.data;');
      setCode(newCode);
    }
    isInitialMountRef.current = false;
  }, [data.code, code, isCodeDisabled, getPropertyValue]);

  useEffect(() => {
    const codeChanged = prevCodeRef.current !== code;
    
    // Only call onChange if code actually changed (not just onChange reference)
    // Skip on initial mount to prevent unnecessary update
    if (codeChanged && !isInitialMountRef.current) {
      onChange('code', code);
    }
    
    prevCodeRef.current = code;
  }, [code, onChange]);

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">JavaScript Code</label>
        <div className={`bg-gray-900 border border-gray-700 rounded overflow-hidden ${isCodeDisabled ? 'opacity-60' : ''}`}>
          <Editor
            height="300px"
            defaultLanguage="javascript"
            value={isCodeDisabled ? getPropertyValue('code', '// Your code here\nreturn context.data;') : code}
            onChange={(value) => {
              if (!isCodeDisabled) {
                setCode(value || '');
              }
            }}
            theme="vs-dark"
            options={{
              minimap: { enabled: false },
              fontSize: 12,
              lineNumbers: 'on',
              scrollBeyondLastLine: false,
              automaticLayout: true,
              readOnly: isCodeDisabled,
            }}
          />
        </div>
        {isCodeDisabled && (
          <div className="mt-1 text-xs text-gray-500 italic">
            This property is converted to input. Connect a node to provide the value.
          </div>
        )}
        <div className="mt-2 p-2 bg-yellow-900 border border-yellow-700 rounded text-xs text-yellow-200">
          <strong>Warning:</strong> This code executes on the server. You have access to:
          <ul className="list-disc list-inside mt-1 ml-2">
            <li>context.page - Playwright Page object</li>
            <li>context.data - Data from previous nodes</li>
            <li>context.variables - Global variables</li>
            <li>context.setData(key, value) - Store data for next nodes</li>
            <li>context.setVariable(key, value) - Store global variable</li>
          </ul>
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">Fail Silently</label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={data.failSilently || false}
            onChange={(e) => onChange('failSilently', e.target.checked)}
            className="rounded"
          />
          <span className="text-sm text-gray-400">
            Continue execution even if this node fails
          </span>
        </label>
      </div>
    </div>
  );
}

