import { useState, useEffect, useRef, useMemo } from 'react';
import { X, ChevronDown, ChevronUp, Plus, Undo2, Redo2, Minimize2, Circle, Search, Filter, SortAsc, SortDesc, CheckSquare, Square, Download, Trash2, ChevronsUpDown, ChevronsDownUp, Trash } from 'lucide-react';
import { RecordedAction, NodeType } from '@automflows/shared';
import { detectNodeType } from '../utils/nodeTypeDetector';
import { getNodeLabel } from '../store/workflowStore';
import SelectorFinderButton from './SelectorFinderButton';

interface ActionListModalProps {
  recordedActions: RecordedAction[];
  insertedActions: RecordedAction[];
  isRecording: boolean;
  isMinimized: boolean;
  onStartRecording: () => void;
  onStopRecording: () => void;
  onInsertAction: (actionId: string) => void;
  onEditAction: (actionId: string, updates: Partial<RecordedAction>) => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onMinimize: () => void;
  onClose: () => void;
  onClearActions: () => void;
}

const ACTION_TYPES: Array<{ value: string; label: string }> = [
  { value: 'click', label: 'Click' },
  { value: 'type', label: 'Type' },
  { value: 'keyboard', label: 'Keyboard' },
  { value: 'form-input', label: 'Form Input' },
  { value: 'navigation', label: 'Navigation' },
  { value: 'scroll', label: 'Scroll' },
  { value: 'hover', label: 'Hover' },
];

const STORAGE_KEY = 'automflows_builder_mode_filters';

export default function ActionListModal({
  recordedActions,
  insertedActions,
  isRecording,
  isMinimized,
  onStartRecording,
  onStopRecording,
  onInsertAction,
  onEditAction,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  onMinimize,
  onClose,
  onClearActions,
}: ActionListModalProps) {
  const [expandedActions, setExpandedActions] = useState<Set<string>>(new Set());
  const [editingAction, setEditingAction] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [typeFilters, setTypeFilters] = useState<Set<string>>(new Set(ACTION_TYPES.map(t => t.value)));
  const [sortBy, setSortBy] = useState<'timestamp' | 'type' | 'selector'>('timestamp');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [selectedActions, setSelectedActions] = useState<Set<string>>(new Set());
  const [showInsertedActions, setShowInsertedActions] = useState<boolean>(true);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Load filter preferences from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const prefs = JSON.parse(saved);
        if (prefs.typeFilters && Array.isArray(prefs.typeFilters) && prefs.typeFilters.length > 0) {
          setTypeFilters(new Set(prefs.typeFilters));
        } else {
          // Default to all types if saved filters are invalid
          setTypeFilters(new Set(ACTION_TYPES.map(t => t.value)));
        }
        if (prefs.sortBy) setSortBy(prefs.sortBy);
        if (prefs.sortOrder) setSortOrder(prefs.sortOrder);
        if (prefs.showInsertedActions !== undefined) setShowInsertedActions(prefs.showInsertedActions);
      }
    } catch (e) {
      // Ignore errors - use default filters
      setTypeFilters(new Set(ACTION_TYPES.map(t => t.value)));
    }
  }, []);

  // Save filter preferences to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        typeFilters: Array.from(typeFilters),
        sortBy,
        sortOrder,
        showInsertedActions,
      }));
    } catch (e) {
      // Ignore errors
    }
  }, [typeFilters, sortBy, sortOrder, showInsertedActions]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isMinimized) return;
      
      // Ctrl+F / Cmd+F: Focus search
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
      
      // Escape: Clear search/filters
      if (e.key === 'Escape' && document.activeElement === searchInputRef.current) {
        setSearchQuery('');
      }
      
      // Ctrl+A: Select all (when not in input)
      if ((e.ctrlKey || e.metaKey) && e.key === 'a' && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
        e.preventDefault();
        const allIds = new Set([...recordedActions.map(a => a.id), ...insertedActions.map(a => a.id)]);
        setSelectedActions(allIds);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isMinimized, recordedActions, insertedActions]);

  // Filter and sort logic
  const filteredAndSortedActions = useMemo(() => {
    // Ensure typeFilters is not empty (if empty, show nothing)
    if (typeFilters.size === 0) {
      return [];
    }
    
    let filtered = recordedActions.filter(action => {
      // Type filter
      if (!typeFilters.has(action.type)) return false;
      
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          action.selector?.toLowerCase().includes(query) ||
          action.value?.toLowerCase().includes(query) ||
          action.url?.toLowerCase().includes(query) ||
          action.elementInfo?.tagName?.toLowerCase().includes(query) ||
          action.elementInfo?.id?.toLowerCase().includes(query) ||
          (typeof action.elementInfo?.className === 'string' && action.elementInfo.className.toLowerCase().includes(query))
        );
      }
      
      return true;
    });

    // Sort
    filtered.sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case 'timestamp':
          comparison = a.timestamp - b.timestamp;
          break;
        case 'type':
          comparison = a.type.localeCompare(b.type);
          break;
        case 'selector':
          comparison = (a.selector || '').localeCompare(b.selector || '');
          break;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return filtered;
  }, [recordedActions, Array.from(typeFilters).sort().join(','), searchQuery, sortBy, sortOrder]);

  const filteredInsertedActions = useMemo(() => {
    if (!showInsertedActions) return [];
    
    // Ensure typeFilters is not empty (if empty, show nothing)
    if (typeFilters.size === 0) {
      return [];
    }
    
    let filtered = insertedActions.filter(action => {
      if (!typeFilters.has(action.type)) return false;
      
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          action.selector?.toLowerCase().includes(query) ||
          action.value?.toLowerCase().includes(query) ||
          action.url?.toLowerCase().includes(query) ||
          action.elementInfo?.tagName?.toLowerCase().includes(query) ||
          action.elementInfo?.id?.toLowerCase().includes(query) ||
          (typeof action.elementInfo?.className === 'string' && action.elementInfo.className.toLowerCase().includes(query))
        );
      }
      
      return true;
    });

    filtered.sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case 'timestamp':
          comparison = a.timestamp - b.timestamp;
          break;
        case 'type':
          comparison = a.type.localeCompare(b.type);
          break;
        case 'selector':
          comparison = (a.selector || '').localeCompare(b.selector || '');
          break;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return filtered;
  }, [insertedActions, Array.from(typeFilters).sort().join(','), searchQuery, sortBy, sortOrder, showInsertedActions]);

  // Count actions by type
  const actionCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    [...recordedActions, ...insertedActions].forEach(action => {
      counts[action.type] = (counts[action.type] || 0) + 1;
    });
    return counts;
  }, [recordedActions, insertedActions]);

  const toggleExpand = (actionId: string) => {
    const newExpanded = new Set(expandedActions);
    if (newExpanded.has(actionId)) {
      newExpanded.delete(actionId);
    } else {
      newExpanded.add(actionId);
    }
    setExpandedActions(newExpanded);
  };

  const toggleTypeFilter = (type: string) => {
    setTypeFilters(prevFilters => {
      const newFilters = new Set(prevFilters);
      if (newFilters.has(type)) {
        newFilters.delete(type);
      } else {
        newFilters.add(type);
      }
      return newFilters;
    });
  };

  const selectAllTypes = () => {
    setTypeFilters(new Set(ACTION_TYPES.map(t => t.value)));
  };

  const deselectAllTypes = () => {
    setTypeFilters(new Set());
  };

  const expandAll = () => {
    const allIds = new Set([...filteredAndSortedActions.map(a => a.id), ...filteredInsertedActions.map(a => a.id)]);
    setExpandedActions(allIds);
  };

  const collapseAll = () => {
    setExpandedActions(new Set());
  };

  const clearFilters = () => {
    setSearchQuery('');
    setTypeFilters(new Set(ACTION_TYPES.map(t => t.value)));
  };

  const toggleSelectAction = (actionId: string) => {
    const newSelected = new Set(selectedActions);
    if (newSelected.has(actionId)) {
      newSelected.delete(actionId);
    } else {
      newSelected.add(actionId);
    }
    setSelectedActions(newSelected);
  };

  const selectAllFiltered = () => {
    const allIds = new Set([...filteredAndSortedActions.map(a => a.id), ...filteredInsertedActions.map(a => a.id)]);
    setSelectedActions(allIds);
  };

  const deselectAll = () => {
    setSelectedActions(new Set());
  };

  const bulkInsert = () => {
    selectedActions.forEach(actionId => {
      if (!insertedActions.find(a => a.id === actionId)) {
        onInsertAction(actionId);
      }
    });
    setSelectedActions(new Set());
  };

  const bulkDelete = () => {
    if (window.confirm(`Delete ${selectedActions.size} selected action(s)?`)) {
      // Note: This would require a delete action callback prop
      // For now, we'll just clear selection
      setSelectedActions(new Set());
    }
  };

  const exportActions = () => {
    const data = {
      recorded: filteredAndSortedActions,
      inserted: filteredInsertedActions,
      exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `actions-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const highlightText = (text: string, query: string) => {
    if (!query) return text;
    const parts = text.split(new RegExp(`(${query})`, 'gi'));
    return parts.map((part, i) => 
      part.toLowerCase() === query.toLowerCase() ? (
        <mark key={i} className="bg-yellow-500/30 text-yellow-200">{part}</mark>
      ) : part
    );
  };

  const getActionIcon = (type: string) => {
    switch (type) {
      case 'click':
        return '🖱️';
      case 'type':
        return '⌨️';
      case 'keyboard':
        return '⌨️';
      case 'form-input':
        return '📝';
      case 'navigation':
        return '🧭';
      case 'scroll':
        return '📜';
      case 'hover':
        return '👆';
      default:
        return '⚡';
    }
  };

  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString();
  };

  const getNodeTypeLabel = (nodeType?: NodeType) => {
    if (!nodeType) return 'Unknown';
    return getNodeLabel(nodeType);
  };

  if (isMinimized) {
    return null; // Minimized icon will be handled by BuilderModeMinimizedIcon
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-gray-800 border border-gray-700 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold text-white">Builder Mode - Recorded Actions</h2>
            {isRecording && (
              <div className="flex items-center gap-2 text-red-400">
                <Circle size={8} fill="currentColor" className="animate-pulse" />
                <span className="text-sm">Recording...</span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onMinimize}
              className="text-gray-400 hover:text-white p-1"
              title="Minimize"
            >
              <Minimize2 size={20} />
            </button>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white p-1"
              aria-label="Close"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Recording Controls */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700 bg-gray-750">
          <div className="flex items-center gap-2">
            {!isRecording ? (
              <button
                onClick={onStartRecording}
                className="px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded transition-colors flex items-center gap-2"
              >
                <Circle size={12} fill="currentColor" />
                Start Recording
              </button>
            ) : (
              <button
                onClick={onStopRecording}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded transition-colors flex items-center gap-2"
              >
                <Circle size={12} fill="currentColor" />
                Stop Recording
              </button>
            )}
            <span className="text-sm text-gray-400">
              {isRecording ? 'Recording active' : 'Recording stopped'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onUndo}
              disabled={!canUndo}
              className="p-2 text-gray-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
              title="Undo"
            >
              <Undo2 size={18} />
            </button>
            <button
              onClick={onRedo}
              disabled={!canRedo}
              className="p-2 text-gray-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
              title="Redo"
            >
              <Redo2 size={18} />
            </button>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="p-4 border-b border-gray-700 bg-gray-750 space-y-3">
          {/* Search Input */}
          <div className="relative">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
              <Search size={16} />
            </div>
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by selector, value, URL, element..."
              className="w-full pl-10 pr-8 py-2 bg-gray-700 text-gray-200 placeholder-gray-400 rounded-md border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200 transition-colors"
                aria-label="Clear search"
              >
                <X size={16} />
              </button>
            )}
          </div>

          {/* Type Filters */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-gray-400 flex items-center gap-1">
              <Filter size={14} />
              Filter:
            </span>
            {ACTION_TYPES.map(type => {
              const count = actionCounts[type.value] || 0;
              const isActive = typeFilters.has(type.value);
              return (
                <button
                  key={type.value}
                  onClick={() => toggleTypeFilter(type.value)}
                  className={`px-2 py-1 text-xs rounded transition-colors flex items-center gap-1 ${
                    isActive
                      ? 'bg-blue-600 text-white hover:bg-blue-700'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  {getActionIcon(type.value)} {type.label}
                  <span className="text-xs opacity-75">({count})</span>
                </button>
              );
            })}
            <div className="flex items-center gap-1 ml-2 pl-2 border-l border-gray-600">
              <button
                onClick={selectAllTypes}
                className="px-2 py-1 text-xs bg-gray-700 text-gray-300 hover:bg-gray-600 rounded"
                title="Select all types"
              >
                All
              </button>
              <button
                onClick={deselectAllTypes}
                className="px-2 py-1 text-xs bg-gray-700 text-gray-300 hover:bg-gray-600 rounded"
                title="Deselect all types"
              >
                None
              </button>
            </div>
          </div>

          {/* Sort and Quick Actions */}
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400">Sort:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'timestamp' | 'type' | 'selector')}
                className="px-2 py-1 text-xs bg-gray-700 text-gray-200 border border-gray-600 rounded"
              >
                <option value="timestamp">Timestamp</option>
                <option value="type">Type</option>
                <option value="selector">Selector</option>
              </select>
              <button
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                className="p-1 text-gray-400 hover:text-white"
                title={`Sort ${sortOrder === 'asc' ? 'descending' : 'ascending'}`}
              >
                {sortOrder === 'asc' ? <SortAsc size={16} /> : <SortDesc size={16} />}
              </button>
            </div>
            <div className="flex items-center gap-2">
              {selectedActions.size > 0 && (
                <>
                  <span className="text-xs text-gray-400">{selectedActions.size} selected</span>
                  <button
                    onClick={bulkInsert}
                    className="px-2 py-1 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded flex items-center gap-1"
                    title="Insert selected"
                  >
                    <Plus size={14} /> Insert
                  </button>
                  <button
                    onClick={bulkDelete}
                    className="px-2 py-1 text-xs bg-red-600 hover:bg-red-700 text-white rounded flex items-center gap-1"
                    title="Delete selected"
                  >
                    <Trash2 size={14} /> Delete
                  </button>
                </>
              )}
              <button
                onClick={expandAll}
                className="p-1 text-gray-400 hover:text-white"
                title="Expand all"
              >
                <ChevronsDownUp size={16} />
              </button>
              <button
                onClick={collapseAll}
                className="p-1 text-gray-400 hover:text-white"
                title="Collapse all"
              >
                <ChevronsUpDown size={16} />
              </button>
              {(searchQuery || typeFilters.size !== ACTION_TYPES.length) && (
                <button
                  onClick={clearFilters}
                  className="px-2 py-1 text-xs bg-gray-700 hover:bg-gray-600 text-gray-300 rounded"
                  title="Clear filters"
                >
                  Clear Filters
                </button>
              )}
              <button
                onClick={exportActions}
                className="px-2 py-1 text-xs bg-gray-700 hover:bg-gray-600 text-gray-300 rounded flex items-center gap-1"
                title="Export actions as JSON"
              >
                <Download size={14} /> Export
              </button>
              {(recordedActions.length > 0 || insertedActions.length > 0) && (
                <button
                  onClick={onClearActions}
                  className="px-2 py-1 text-xs bg-red-700 hover:bg-red-800 text-white rounded flex items-center gap-1"
                  title="Clear all actions"
                >
                  <Trash size={14} /> Clear All
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Recorded Actions Section */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-gray-300">
                Recorded Actions ({filteredAndSortedActions.length} of {recordedActions.length})
              </h3>
              {filteredAndSortedActions.length > 0 && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={selectAllFiltered}
                    className="text-xs text-gray-400 hover:text-gray-200"
                    title="Select all filtered"
                  >
                    Select All
                  </button>
                  {selectedActions.size > 0 && (
                    <button
                      onClick={deselectAll}
                      className="text-xs text-gray-400 hover:text-gray-200"
                      title="Deselect all"
                    >
                      Deselect
                    </button>
                  )}
                </div>
              )}
            </div>
            {recordedActions.length === 0 ? (
              <div className="text-gray-400 text-center py-8 bg-gray-700/30 rounded">
                No actions recorded yet. Click the capture icon in the browser to start recording.
              </div>
            ) : filteredAndSortedActions.length === 0 ? (
              <div className="text-gray-400 text-center py-8 bg-gray-700/30 rounded">
                No actions match the current filters. Try adjusting your search or type filters.
              </div>
            ) : (
              <div className="space-y-2">
                {filteredAndSortedActions.map((action) => (
                  <ActionItem
                    key={`recorded-${action.id}`}
                    action={action}
                    isExpanded={expandedActions.has(action.id)}
                    isEditing={editingAction === action.id}
                    isSelected={selectedActions.has(action.id)}
                    onToggleExpand={() => toggleExpand(action.id)}
                    onToggleSelect={() => toggleSelectAction(action.id)}
                    onEdit={(updates) => {
                      onEditAction(action.id, updates);
                      setEditingAction(null);
                    }}
                    onStartEdit={() => setEditingAction(action.id)}
                    onCancelEdit={() => setEditingAction(null)}
                    onInsert={() => onInsertAction(action.id)}
                    getActionIcon={getActionIcon}
                    formatTimestamp={formatTimestamp}
                    getNodeTypeLabel={getNodeTypeLabel}
                    searchQuery={searchQuery}
                    highlightText={highlightText}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Inserted Actions Section */}
          {showInsertedActions && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-gray-300">
                  Inserted Actions ({filteredInsertedActions.length} of {insertedActions.length})
                </h3>
                <button
                  onClick={() => setShowInsertedActions(false)}
                  className="text-xs text-gray-400 hover:text-gray-200"
                  title="Hide inserted actions"
                >
                  Hide
                </button>
              </div>
              {insertedActions.length > 0 && filteredInsertedActions.length === 0 ? (
                <div className="text-gray-400 text-center py-4 bg-gray-700/30 rounded text-xs">
                  No inserted actions match the current filters.
                </div>
              ) : filteredInsertedActions.length > 0 && (
                <div className="space-y-2">
                  {filteredInsertedActions.map((action) => (
                    <ActionItem
                      key={`inserted-${action.id}`}
                      action={action}
                      isExpanded={expandedActions.has(action.id)}
                      isEditing={false}
                      isInserted={true}
                      isSelected={selectedActions.has(action.id)}
                      onToggleExpand={() => toggleExpand(action.id)}
                      onToggleSelect={() => toggleSelectAction(action.id)}
                      onEdit={() => {}}
                      onStartEdit={() => {}}
                      onCancelEdit={() => {}}
                      onInsert={() => onInsertAction(action.id)} // Allow re-insert
                      getActionIcon={getActionIcon}
                      formatTimestamp={formatTimestamp}
                      getNodeTypeLabel={getNodeTypeLabel}
                      searchQuery={searchQuery}
                      highlightText={highlightText}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
          {!showInsertedActions && insertedActions.length > 0 && (
            <div className="text-center">
              <button
                onClick={() => setShowInsertedActions(true)}
                className="text-xs text-gray-400 hover:text-gray-200"
              >
                Show {insertedActions.length} inserted action(s)
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface ActionItemProps {
  action: RecordedAction;
  isExpanded: boolean;
  isEditing: boolean;
  isInserted?: boolean;
  isSelected?: boolean;
  onToggleExpand: () => void;
  onToggleSelect?: () => void;
  onEdit: (updates: Partial<RecordedAction>) => void;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onInsert: () => void;
  getActionIcon: (type: string) => string;
  formatTimestamp: (timestamp: number) => string;
  getNodeTypeLabel: (nodeType?: NodeType) => string;
  searchQuery?: string;
  highlightText?: (text: string, query: string) => string | (string | React.ReactElement)[];
}

function ActionItem({
  action,
  isExpanded,
  isEditing,
  isInserted = false,
  isSelected = false,
  onToggleExpand,
  onToggleSelect,
  onEdit,
  onStartEdit,
  onCancelEdit,
  onInsert,
  getActionIcon,
  formatTimestamp,
  getNodeTypeLabel,
  searchQuery = '',
  highlightText,
}: ActionItemProps) {
  const [editType, setEditType] = useState(action.type);
  const [editSelector, setEditSelector] = useState(action.selector || '');
  const [editSelectorType, setEditSelectorType] = useState(action.selectorType || 'css');
  const [editValue, setEditValue] = useState(action.value || '');
  const [editKey, setEditKey] = useState(action.key || '');
  const [editUrl, setEditUrl] = useState(action.url || '');
  const [editNodeType, setEditNodeType] = useState(action.customNodeType || action.detectedNodeType);

  const detectedNodeType = action.detectedNodeType || detectNodeType(action);
  const nodeTypeOptions: NodeType[] = [
    NodeType.ACTION,
    NodeType.TYPE,
    NodeType.KEYBOARD,
    NodeType.FORM_INPUT,
    NodeType.NAVIGATION,
    NodeType.SCROLL,
  ];

  const handleSave = () => {
    const updates: Partial<RecordedAction> = {
      type: editType,
      selector: editSelector,
      selectorType: editSelectorType,
      customNodeType: editNodeType,
    };
    if (editValue) updates.value = editValue;
    if (editKey) updates.key = editKey;
    if (editUrl) updates.url = editUrl;
    onEdit(updates);
  };

  const displaySelector = action.selector ? (action.selector.length > 30 ? action.selector.substring(0, 30) + '...' : action.selector) : '';
  
  return (
    <div className={`border rounded bg-gray-700/50 ${isSelected ? 'border-blue-500 bg-blue-900/20' : 'border-gray-600'}`}>
      <div className="flex items-center gap-2 p-3">
        {onToggleSelect && (
          <button
            onClick={onToggleSelect}
            className="text-gray-400 hover:text-white p-1"
            title="Select action"
          >
            {isSelected ? <CheckSquare size={16} /> : <Square size={16} />}
          </button>
        )}
        <button
          onClick={onToggleExpand}
          className="text-gray-400 hover:text-white p-1"
        >
          {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
        <span className="text-lg">{getActionIcon(action.type)}</span>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-white truncate">
            {action.type.charAt(0).toUpperCase() + action.type.slice(1)}
            {displaySelector && (
              <span className="text-gray-400">
                {' on '}
                {highlightText && searchQuery ? highlightText(displaySelector, searchQuery) : displaySelector}
              </span>
            )}
          </div>
          <div className="text-xs text-gray-400">{formatTimestamp(action.timestamp)}</div>
        </div>
        {!isInserted && (
          <button
            onClick={onInsert}
            className="p-2 text-blue-400 hover:text-blue-300 hover:bg-blue-900/30 rounded transition-colors"
            title="Insert into canvas"
          >
            <Plus size={18} />
          </button>
        )}
        {isInserted && action.nodeId && (
          <span className="text-xs text-gray-500">Node: {action.nodeId.substring(0, 8)}...</span>
        )}
      </div>

      {isExpanded && (
        <div className="p-3 pt-0 border-t border-gray-600 space-y-3">
          {isEditing ? (
            <div className="space-y-2">
              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">Action Type</label>
                <select
                  value={editType}
                  onChange={(e) => setEditType(e.target.value as any)}
                  className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-sm text-white"
                >
                  <option value="click">Click</option>
                  <option value="type">Type</option>
                  <option value="keyboard">Keyboard</option>
                  <option value="form-input">Form Input</option>
                  <option value="navigation">Navigation</option>
                  <option value="scroll">Scroll</option>
                  <option value="hover">Hover</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">Selector</label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={editSelector}
                    onChange={(e) => setEditSelector(e.target.value)}
                    className="flex-1 px-2 py-1 bg-gray-700 border border-gray-600 rounded text-sm text-white"
                  />
                  <SelectorFinderButton nodeId={action.id} fieldName="selector" />
                </div>
                <select
                  value={editSelectorType}
                  onChange={(e) => setEditSelectorType(e.target.value as 'css' | 'xpath')}
                  className="mt-1 w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-sm text-white"
                >
                  <option value="css">CSS</option>
                  <option value="xpath">XPath</option>
                </select>
              </div>
              {(editType === 'type' || editType === 'form-input') && (
                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1">Value</label>
                  <input
                    type="text"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-sm text-white"
                  />
                </div>
              )}
              {editType === 'keyboard' && (
                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1">Key</label>
                  <input
                    type="text"
                    value={editKey}
                    onChange={(e) => setEditKey(e.target.value)}
                    className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-sm text-white"
                  />
                </div>
              )}
              {editType === 'navigation' && (
                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1">URL</label>
                  <input
                    type="text"
                    value={editUrl}
                    onChange={(e) => setEditUrl(e.target.value)}
                    className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-sm text-white"
                  />
                </div>
              )}
              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">Node Type</label>
                <select
                  value={editNodeType || detectedNodeType}
                  onChange={(e) => setEditNodeType(e.target.value as NodeType)}
                  className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-sm text-white"
                >
                  {nodeTypeOptions.map((type) => (
                    <option key={type} value={type}>
                      {getNodeTypeLabel(type)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleSave}
                  className="px-3 py-1 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded"
                >
                  Save
                </button>
                <button
                  onClick={onCancelEdit}
                  className="px-3 py-1 text-sm bg-gray-600 hover:bg-gray-700 text-white rounded"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-2 text-sm">
              {action.selector && (
                <div>
                  <span className="text-gray-400">Selector:</span>{' '}
                  <span className="font-mono text-gray-200">
                    {highlightText && searchQuery ? highlightText(action.selector, searchQuery) : action.selector}
                  </span>
                  <span className="ml-2 text-xs text-gray-500">({action.selectorType || 'css'})</span>
                </div>
              )}
              {action.value && (
                <div>
                  <span className="text-gray-400">Value:</span>{' '}
                  <span className="text-gray-200">
                    {highlightText && searchQuery ? highlightText(action.value, searchQuery) : action.value}
                  </span>
                </div>
              )}
              {action.key && (
                <div>
                  <span className="text-gray-400">Key:</span>{' '}
                  <span className="text-gray-200">
                    {highlightText && searchQuery ? highlightText(action.key, searchQuery) : action.key}
                  </span>
                </div>
              )}
              {action.url && (
                <div>
                  <span className="text-gray-400">URL:</span>{' '}
                  <span className="text-gray-200">
                    {highlightText && searchQuery ? highlightText(action.url, searchQuery) : action.url}
                  </span>
                </div>
              )}
              {action.elementInfo && (
                <div className="text-xs text-gray-400">
                  {action.elementInfo.tagName}
                  {action.elementInfo.id && `#${highlightText && searchQuery ? highlightText(action.elementInfo.id, searchQuery) : action.elementInfo.id}`}
                  {action.elementInfo.className && typeof action.elementInfo.className === 'string' && `.${highlightText && searchQuery ? highlightText(action.elementInfo.className.split(' ')[0], searchQuery) : action.elementInfo.className.split(' ')[0]}`}
                </div>
              )}
              <div>
                <span className="text-gray-400">Detected Node Type:</span>{' '}
                <span className="text-gray-200">{getNodeTypeLabel(detectedNodeType)}</span>
              </div>
              {!isInserted && (
                <button
                  onClick={onStartEdit}
                  className="mt-2 px-3 py-1 text-xs bg-gray-600 hover:bg-gray-700 text-white rounded"
                >
                  Edit
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
