import { useState, useEffect, useCallback, useRef } from 'react';
import { SelectorOption } from '@automflows/shared';
import {
  startSelectorFinder,
  onSelectorsGenerated,
  selectSelector,
  getSelectorFinderStatus,
} from '../services/selectorFinder';
import { useWorkflowStore } from '../store/workflowStore';

export function useSelectorFinder(nodeId: string, fieldName: string) {
  const [selectors, setSelectors] = useState<SelectorOption[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const updateNodeData = useWorkflowStore((state) => state.updateNodeData);
  const cleanupRef = useRef<(() => void) | null>(null);

  // Get backend port
  const getBackendPort = useCallback(async (): Promise<number> => {
    try {
      const response = await fetch('/.automflows-port');
      if (response.ok) {
        const portText = await response.text();
        const port = parseInt(portText.trim(), 10);
        if (!isNaN(port) && port > 0) {
          return port;
        }
      }
    } catch (error) {
      // Ignore errors
    }
    return parseInt(import.meta.env.VITE_BACKEND_PORT || '3001', 10);
  }, []);

  // Register callback for when selectors are generated
  useEffect(() => {
    // Clean up previous callback if it exists
    if (cleanupRef.current) {
      cleanupRef.current();
      cleanupRef.current = null;
    }
    
    const cleanup = onSelectorsGenerated(nodeId, fieldName, (generatedSelectors: SelectorOption[]) => {
      setSelectors(generatedSelectors);
      setShowModal(true);
      setLoading(false);
    });
    
    cleanupRef.current = cleanup;

    return () => {
      if (cleanupRef.current) {
        cleanupRef.current();
        cleanupRef.current = null;
      }
    };
  }, [nodeId, fieldName]);

  const startFinder = useCallback(async () => {
    setLoading(true);
    try {
      const port = await getBackendPort();
      await startSelectorFinder(nodeId, fieldName, port);
    } catch (error: any) {
      console.error('Failed to start selector finder:', error);
      alert(`Failed to start selector finder: ${error.message}`);
      setLoading(false);
    }
  }, [nodeId, fieldName, getBackendPort]);

  const handleAccept = useCallback(
    async (selectedSelector: SelectorOption) => {
      try {
        const port = await getBackendPort();
        const selectedIndex = selectors.findIndex(
          (s) => s.selector === selectedSelector.selector && s.type === selectedSelector.type
        );

        if (selectedIndex >= 0) {
          await selectSelector(selectors, selectedIndex, nodeId, fieldName, port);

          // Update node data
          updateNodeData(nodeId, {
            [fieldName]: selectedSelector.selector,
            selectorType: selectedSelector.type,
          });

          setShowModal(false);
          setSelectors([]);
        }
      } catch (error: any) {
        console.error('Failed to select selector:', error);
        alert(`Failed to select selector: ${error.message}`);
      }
    },
    [selectors, nodeId, fieldName, updateNodeData, getBackendPort]
  );

  const handleCancel = useCallback(() => {
    setShowModal(false);
    setSelectors([]);
  }, []);

  return {
    startFinder,
    selectors,
    showModal,
    loading,
    handleAccept,
    handleCancel,
  };
}
