import { useState, useEffect, useRef } from 'react';
import { Search, X } from 'lucide-react';

interface NodeSearchOverlayProps {
  searchQuery: string;
  matchingNodeIds: string[];
  currentMatchIndex: number;
  searchExecuted: boolean;
  onSearchQueryChange: (query: string) => void;
  onSearch: () => void;
  onNavigate: () => void;
  onClose: () => void;
}

export default function NodeSearchOverlay({
  searchQuery,
  matchingNodeIds,
  currentMatchIndex,
  searchExecuted,
  onSearchQueryChange,
  onSearch,
  onNavigate,
  onClose,
}: NodeSearchOverlayProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  // Auto-focus input when overlay opens
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Handle Escape key to close
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  // Handle Enter key - navigate if search executed and has matches, otherwise trigger search
  useEffect(() => {
    const handleEnter = (e: KeyboardEvent) => {
      // Only handle if input is focused
      if (document.activeElement === inputRef.current) {
        if (e.key === 'Enter') {
          e.preventDefault();
          // If search has been executed and we have matches, navigate
          // Otherwise, if query is valid, trigger search
          if (searchExecuted && matchingNodeIds.length > 0) {
            onNavigate();
          } else if (searchQuery.trim().length >= 3) {
            onSearch();
          }
        }
      }
    };
    window.addEventListener('keydown', handleEnter);
    return () => window.removeEventListener('keydown', handleEnter);
  }, [searchQuery, searchExecuted, matchingNodeIds.length, onNavigate, onSearch]);

  const canSearch = searchQuery.trim().length >= 3;
  const matchCount = matchingNodeIds.length;
  const matchText = searchExecuted
    ? matchCount === 0
      ? 'No matches'
      : matchCount === 1
      ? '1 match'
      : `Match ${currentMatchIndex + 1} of ${matchCount}`
    : canSearch
    ? 'Press Enter or click Search'
    : 'Enter at least 3 characters';

  return (
    <div
      ref={overlayRef}
      data-search-overlay
      className="absolute z-[60] bg-gray-800 border border-gray-700 rounded-lg shadow-xl"
      style={{
        top: '10px',
        right: '10px',
        minWidth: '320px',
        maxWidth: '400px',
      }}
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div className="p-3 border-b border-gray-700 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-200">Search Nodes</h3>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-200 transition-colors p-1"
          aria-label="Close search"
        >
          <X size={16} />
        </button>
      </div>

      {/* Search Input */}
      <div className="p-3 border-b border-gray-700">
        <div className="relative flex gap-2">
          <div className="relative flex-1">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
              <Search size={16} />
            </div>
            <input
              ref={inputRef}
              data-search-input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchQueryChange(e.target.value)}
              placeholder="Search nodes..."
              className="w-full pl-10 pr-8 py-2 bg-gray-700 text-gray-200 placeholder-gray-400 rounded-md border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            />
            {searchQuery && (
              <button
                onClick={() => onSearchQueryChange('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200 transition-colors"
                aria-label="Clear search"
              >
                <X size={16} />
              </button>
            )}
          </div>
          <button
            onClick={onSearch}
            disabled={!canSearch}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:text-gray-500 disabled:cursor-not-allowed text-white rounded-md text-sm font-medium transition-colors"
          >
            Search
          </button>
        </div>
      </div>

      {/* Match Count */}
      <div className="p-3">
        <div className="text-xs text-gray-400">{matchText}</div>
        {searchExecuted && matchCount > 0 && (
          <div className="mt-2 text-xs text-gray-500">
            Press Enter to navigate to matches
          </div>
        )}
      </div>
    </div>
  );
}
