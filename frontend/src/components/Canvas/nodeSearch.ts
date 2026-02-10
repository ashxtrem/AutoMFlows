import { useState, useCallback, useRef, useEffect } from 'react';
import { searchNodes } from '../../utils/nodeSearch';

export interface UseNodeSearchProps {
  fitView: (options: { nodes: { id: string }[]; padding: number; duration: number }) => void;
  nodes: any[];
}

export interface UseNodeSearchReturn {
  nodeSearchOverlayOpen: boolean;
  setNodeSearchOverlayOpen: React.Dispatch<React.SetStateAction<boolean>>;
  nodeSearchQuery: string;
  setNodeSearchQuery: React.Dispatch<React.SetStateAction<string>>;
  matchingNodeIds: string[];
  currentMatchIndex: number;
  searchExecuted: boolean;
  handleNodeSearch: () => void;
  handleNodeSearchNavigate: () => void;
  handleNodeSearchClose: () => void;
}

export function useNodeSearch({ fitView, nodes }: UseNodeSearchProps): UseNodeSearchReturn {
  const [nodeSearchOverlayOpen, setNodeSearchOverlayOpen] = useState<boolean>(false);
  const [nodeSearchQuery, setNodeSearchQuery] = useState<string>('');
  const [matchingNodeIds, setMatchingNodeIds] = useState<string[]>([]);
  const [currentMatchIndex, setCurrentMatchIndex] = useState<number>(0);
  const [searchExecuted, setSearchExecuted] = useState<boolean>(false);
  
  // Track last searched query to detect when query changes
  const lastSearchedQueryRef = useRef<string>('');
  
  // Node search handlers
  const handleNodeSearch = useCallback(() => {
    if (nodeSearchQuery.trim().length < 3) {
      setMatchingNodeIds([]);
      setSearchExecuted(false);
      return;
    }
    const matches = searchNodes(nodeSearchQuery, nodes);
    setMatchingNodeIds(matches);
    setCurrentMatchIndex(0);
    setSearchExecuted(true);
    lastSearchedQueryRef.current = nodeSearchQuery.trim();
  }, [nodeSearchQuery, nodes]);

  const handleNodeSearchNavigate = useCallback(() => {
    if (matchingNodeIds.length === 0) {
      return;
    }
    
    const nodeId = matchingNodeIds[currentMatchIndex];
    const node = nodes.find(n => n.id === nodeId);
    
    if (node) {
      fitView({
        nodes: [{ id: nodeId }],
        padding: 0.2,
        duration: 300,
      });
      
      // Cycle to next match
      const nextIndex = (currentMatchIndex + 1) % matchingNodeIds.length;
      setCurrentMatchIndex(nextIndex);
    }
  }, [matchingNodeIds, currentMatchIndex, nodes, fitView]);

  const handleNodeSearchClose = useCallback(() => {
    setNodeSearchOverlayOpen(false);
    setNodeSearchQuery('');
    setMatchingNodeIds([]);
    setCurrentMatchIndex(0);
    setSearchExecuted(false);
    lastSearchedQueryRef.current = '';
  }, []);

  // Auto-search when query changes (debounced)
  useEffect(() => {
    if (nodeSearchQuery.trim().length >= 3 && nodeSearchQuery.trim() !== lastSearchedQueryRef.current) {
      const timeoutId = setTimeout(() => {
        handleNodeSearch();
      }, 300); // Debounce search by 300ms
      
      return () => clearTimeout(timeoutId);
    } else if (nodeSearchQuery.trim().length < 3) {
      setMatchingNodeIds([]);
      setSearchExecuted(false);
    }
  }, [nodeSearchQuery, handleNodeSearch]);

  return {
    nodeSearchOverlayOpen,
    setNodeSearchOverlayOpen,
    nodeSearchQuery,
    setNodeSearchQuery,
    matchingNodeIds,
    currentMatchIndex,
    searchExecuted,
    handleNodeSearch,
    handleNodeSearchNavigate,
    handleNodeSearchClose,
  };
}
