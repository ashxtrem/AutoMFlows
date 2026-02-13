import { useState, useEffect, useRef, useMemo } from 'react';
import { 
  X, 
  ChevronDown, 
  ChevronRight,
  Plus, 
  Undo2, 
  Redo2, 
  Minimize2, 
  Square, 
  Play,
  MousePointer,
  Type,
  ScrollText,
  Move,
  Check,
  MoreHorizontal
} from 'lucide-react';
import { RecordedAction, NodeType } from '@automflows/shared';
import { detectNodeType } from '../utils/nodeTypeDetector';
import { getNodeLabel } from '../store/workflowStore';
import SelectorFinderButton from './SelectorFinderButton';
import { SELECTOR_TYPE_OPTIONS } from '../utils/selectorHelpers';

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
  showOverlayVisibilityMessage?: boolean;
  onDismissOverlayMessage?: () => void;
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

// ActionIcon component using lucide-react icons
const ActionIcon = ({ type }: { type: string }) => {
  switch (type) {
    case 'click': return <MousePointer size={16} className="text-blue-400" />;
    case 'type': return <Type size={16} className="text-green-400" />;
    case 'keyboard': return <Type size={16} className="text-green-400" />;
    case 'form-input': return <Type size={16} className="text-green-400" />;
    case 'navigation': return <Move size={16} className="text-purple-400" />;
    case 'scroll': return <ScrollText size={16} className="text-orange-400" />;
    case 'hover': return <Move size={16} className="text-purple-400" />;
    default: return <Square size={16} className="text-gray-400" />;
  }
};

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
  onClearActions: _onClearActions, // TODO: Implement clear actions button in UI
  showOverlayVisibilityMessage = false,
  onDismissOverlayMessage,
}: ActionListModalProps) {
  const [expandedActions, setExpandedActions] = useState<Set<string>>(new Set());
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
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

  // Auto-dismiss overlay visibility message after 8 seconds
  useEffect(() => {
    if (showOverlayVisibilityMessage && onDismissOverlayMessage) {
      const timer = setTimeout(() => {
        onDismissOverlayMessage();
      }, 8000);
      return () => clearTimeout(timer);
    }
  }, [showOverlayVisibilityMessage, onDismissOverlayMessage]);

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

  const highlightText = (text: string, query: string) => {
    if (!query) return text;
    const parts = text.split(new RegExp(`(${query})`, 'gi'));
    return parts.map((part, i) => 
      part.toLowerCase() === query.toLowerCase() ? (
        <mark key={i} className="bg-yellow-500/30 text-yellow-200">{part}</mark>
      ) : part
    );
  };


  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp);
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const seconds = date.getSeconds().toString().padStart(2, '0');
    return `${hours}:${minutes}:${seconds}`;
  };

  // Smart grouping logic for sequential identical actions
  const groupedActions = useMemo(() => {
    const grouped: Array<RecordedAction | { isGroup: true; type: string; id: string; items: RecordedAction[]; timestamp: number }> = [];
    let currentGroup: { isGroup: true; type: string; id: string; items: RecordedAction[]; timestamp: number } | null = null;
    
    // Deduplicate actions by ID to prevent duplicate keys
    const seenIds = new Set<string>();
    const uniqueActions = filteredAndSortedActions.filter(action => {
      if (seenIds.has(action.id)) {
        return false;
      }
      seenIds.add(action.id);
      return true;
    });

    uniqueActions.forEach((action) => {
      const isGroupable = ['scroll', 'hover'].includes(action.type);

      if (currentGroup && isGroupable && currentGroup.type === action.type) {
        // Add to existing group
        currentGroup.items.push(action);
      } else {
        // Push previous group if it exists
        if (currentGroup) {
          grouped.push(currentGroup);
        }

        // Start new item or group
        if (isGroupable) {
          currentGroup = {
            isGroup: true,
            type: action.type,
            id: `group-${action.id}`,
            items: [action],
            timestamp: action.timestamp,
          };
        } else {
          grouped.push(action);
          currentGroup = null;
        }
      }
    });

    // Push final group
    if (currentGroup) {
      grouped.push(currentGroup);
    }

    return grouped;
  }, [filteredAndSortedActions]);

  const toggleGroup = (groupId: string) => {
    setExpandedGroups(prev => ({ ...prev, [groupId]: !prev[groupId] }));
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
      <div className="bg-[#1e1e1e] border border-[#333] rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[#333]">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-semibold text-white">Recorded Actions</h1>
            {isRecording && (
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={isRecording ? onStopRecording : onStartRecording}
              className={`flex items-center gap-2 px-4 py-2 rounded-md font-medium transition-colors ${
                isRecording
                  ? 'bg-red-500/10 text-red-500 hover:bg-red-500/20 border border-red-500/50'
                  : 'bg-green-600 text-white hover:bg-green-700'
              }`}
            >
              {isRecording ? <Square size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" />}
              {isRecording ? 'Stop Recording' : 'Start Recording'}
            </button>
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

        {/* Overlay Visibility Message */}
        {showOverlayVisibilityMessage && (
          <div className="mx-4 mt-4 p-3 bg-blue-900/30 border border-blue-600/50 rounded-lg flex items-start gap-2">
            <div className="flex-1">
              <div className="text-blue-300 text-sm">
                If the overlay button is not visible, click the device toggle to re-render the viewport and the overlay will appear.
              </div>
            </div>
            {onDismissOverlayMessage && (
              <button
                onClick={onDismissOverlayMessage}
                className="text-blue-400 hover:text-blue-300 p-1"
                aria-label="Dismiss"
              >
                <X size={16} />
              </button>
            )}
          </div>
        )}

        {/* Filter Bar */}
        <div className="flex flex-wrap items-center gap-2 mb-4 p-1 px-4">
          <div className="relative flex-1">
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search selectors..."
              className="w-full bg-[#2a2a2a] border border-[#333] rounded-md py-1.5 px-3 text-sm focus:outline-none focus:border-blue-500 transition-colors text-gray-300 placeholder-gray-500"
            />
          </div>

          {/* Filter chips - outline style */}
          {ACTION_TYPES.map(type => {
            const count = actionCounts[type.value] || 0;
            const isActive = typeFilters.has(type.value);
            return (
              <button
                key={type.value}
                onClick={() => toggleTypeFilter(type.value)}
                className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-all ${
                  isActive
                    ? 'border-blue-500 bg-blue-500/20 text-blue-400 hover:border-blue-400'
                    : 'border-[#333] bg-[#252525] text-gray-400 hover:border-gray-500 hover:bg-[#2a2a2a]'
                }`}
              >
                {type.label} ({count})
              </button>
            );
          })}

          <div className="w-px h-6 bg-[#333] mx-2"></div>

          <button
            onClick={clearFilters}
            className="text-xs text-gray-400 hover:text-white underline"
          >
            Clear All
          </button>
        </div>

        {/* Main List */}
        <div className="flex-1 overflow-hidden border border-[#333] rounded-lg bg-[#111] flex flex-col mx-4 mb-4">
          {/* List Header */}
          <div className="flex items-center justify-between px-4 py-2 bg-[#1a1a1a] border-b border-[#333] text-xs font-medium text-gray-500 uppercase tracking-wider">
            <div className="flex items-center gap-4">
              <div 
                className="w-4 h-4 border border-gray-600 rounded flex items-center justify-center cursor-pointer hover:border-gray-400"
                onClick={selectAllFiltered}
              >
                {selectedActions.size > 0 && <Check size={10} className="text-gray-400" />}
              </div>
              <span>Type</span>
            </div>
            <div className="flex-1 ml-12">Selector / Details</div>
            <div className="mr-12">Time</div>
            <div className="w-8"></div>
          </div>

          {/* List Content */}
          <div className="overflow-y-auto flex-1">
            {recordedActions.length === 0 ? (
              <div className="text-gray-400 text-center py-8 bg-[#161616]">
                No actions recorded yet. Click the capture icon in the browser to start recording.
              </div>
            ) : groupedActions.length === 0 ? (
              <div className="text-gray-400 text-center py-8 bg-[#161616]">
                No actions match the current filters. Try adjusting your search or type filters.
              </div>
            ) : (
              <>
                {groupedActions.map((item, itemIndex) => {
                  if ('isGroup' in item && item.isGroup) {
                    // Grouped row
                    const isExpanded = expandedGroups[item.id];
                    return (
                      <div key={`group-${item.id}-${itemIndex}`} className="border-b border-[#222]">
                        <div
                          onClick={() => toggleGroup(item.id)}
                          className="flex items-center px-4 py-2 hover:bg-[#1f1f1f] cursor-pointer group transition-colors"
                        >
                          <div className="w-4 mr-4 flex justify-center">
                            {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                          </div>

                          <div className="flex items-center gap-3 w-32">
                            <div className="bg-[#222] p-1 rounded border border-[#333]">
                              <ActionIcon type={item.type} />
                            </div>
                            <span className="text-sm font-medium text-gray-300 capitalize">{item.type}</span>
                            <span className="px-1.5 py-0.5 text-[10px] bg-gray-800 text-gray-400 rounded-full font-mono">
                              x{item.items.length}
                            </span>
                          </div>

                          <div className="flex-1 text-sm text-gray-500 italic">
                            {item.items.length} sequential actions collapsed
                          </div>

                          <span className="text-xs text-gray-600 font-mono mr-4">{formatTimestamp(item.timestamp)}</span>

                          <button className="opacity-0 group-hover:opacity-100 p-1 hover:bg-[#333] rounded text-gray-400">
                            <MoreHorizontal size={14} />
                          </button>
                        </div>

                        {/* Expanded Items */}
                        {isExpanded && (
                          <div className="bg-[#161616]">
                            {item.items.map((subItem, idx) => (
                              <ActionRow
                                key={`${item.id}-${subItem.id}-${idx}`}
                                action={subItem}
                                isSubItem={true}
                                isSelected={selectedActions.has(subItem.id)}
                                onToggleSelect={() => toggleSelectAction(subItem.id)}
                                onInsert={() => onInsertAction(subItem.id)}
                                formatTimestamp={formatTimestamp}
                                searchQuery={searchQuery}
                                highlightText={highlightText}
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  } else {
                    // Single row
                    const action = item as RecordedAction;
                    return (
                      <div key={`action-${action.id}-${itemIndex}`}>
                        <ActionRow
                          action={action}
                          isSubItem={false}
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
                          formatTimestamp={formatTimestamp}
                          getNodeTypeLabel={getNodeTypeLabel}
                          searchQuery={searchQuery}
                          highlightText={highlightText}
                        />
                      </div>
                    );
                  }
                })}
              </>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}

interface ActionRowProps {
  action: RecordedAction;
  isSubItem?: boolean;
  isExpanded?: boolean;
  isEditing?: boolean;
  isSelected?: boolean;
  onToggleExpand?: () => void;
  onToggleSelect?: () => void;
  onEdit?: (updates: Partial<RecordedAction>) => void;
  onStartEdit?: () => void;
  onCancelEdit?: () => void;
  onInsert: () => void;
  formatTimestamp: (timestamp: number) => string;
  getNodeTypeLabel?: (nodeType?: NodeType) => string;
  searchQuery?: string;
  highlightText?: (text: string, query: string) => string | (string | React.ReactElement)[];
}

function ActionRow({
  action,
  isSubItem = false,
  isExpanded = false,
  isEditing = false,
  isSelected = false,
  onToggleExpand,
  onToggleSelect,
  onEdit,
  onStartEdit,
  onCancelEdit,
  onInsert,
  formatTimestamp,
  getNodeTypeLabel,
  searchQuery = '',
  highlightText,
}: ActionRowProps) {
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
    if (!onEdit) return;
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

  const displaySelector = action.selector || '';
  const displayValue = action.value || action.key || action.url || '';

  return (
    <>
      <div className={`flex items-center px-4 py-2.5 border-b border-[#222] group hover:bg-[#1f1f1f] transition-colors ${isSubItem ? 'pl-12 bg-[#141414]' : ''}`}>
        {/* Expand/Collapse Chevron (for non-sub-items) */}
        {!isSubItem && onToggleExpand && (
          <div className="w-4 mr-4 flex justify-center">
            <button
              onClick={onToggleExpand}
              className="text-gray-400 hover:text-white"
            >
              {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </button>
          </div>
        )}
        {isSubItem && <div className="w-4 mr-4"></div>}

        {/* Checkbox */}
        {onToggleSelect && (
          <div
            onClick={onToggleSelect}
            className={`w-4 h-4 mr-4 border rounded flex items-center justify-center cursor-pointer transition-colors ${
              isSelected ? 'bg-blue-600 border-blue-600' : 'border-gray-600 hover:border-gray-400'
            }`}
          >
            {isSelected && <Check size={10} className="text-white" />}
          </div>
        )}

        {/* Icon & Type */}
        <div className="flex items-center gap-3 w-32">
          {!isSubItem && (
            <div className="bg-[#222] p-1 rounded border border-[#333] shadow-sm">
              <ActionIcon type={action.type} />
            </div>
          )}
          <span className={`text-sm font-medium capitalize ${isSubItem ? 'text-gray-500 ml-9' : 'text-gray-200'}`}>
            {isSubItem ? '' : action.type}
          </span>
        </div>

        {/* Selector / Value */}
        <div className="flex-1 pr-4 min-w-0">
          {isEditing ? (
            <div className="space-y-2">
              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">Action Type</label>
                <select
                  value={editType}
                  onChange={(e) => setEditType(e.target.value as any)}
                  className="w-full px-2 py-1 bg-[#2a2a2a] border border-[#333] rounded text-sm text-white"
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
                    className="flex-1 px-2 py-1 bg-[#2a2a2a] border border-[#333] rounded text-sm text-white"
                  />
                  <SelectorFinderButton nodeId={action.id} fieldName="selector" />
                </div>
                <select
                  value={editSelectorType}
                  onChange={(e) => setEditSelectorType(e.target.value as typeof editSelectorType)}
                  className="mt-1 w-full px-2 py-1 bg-[#2a2a2a] border border-[#333] rounded text-sm text-white"
                >
                  {SELECTOR_TYPE_OPTIONS.map(option => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </div>
              {(editType === 'type' || editType === 'form-input') && (
                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1">Value</label>
                  <input
                    type="text"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    className="w-full px-2 py-1 bg-[#2a2a2a] border border-[#333] rounded text-sm text-white"
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
                    className="w-full px-2 py-1 bg-[#2a2a2a] border border-[#333] rounded text-sm text-white"
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
                    className="w-full px-2 py-1 bg-[#2a2a2a] border border-[#333] rounded text-sm text-white"
                  />
                </div>
              )}
              {getNodeTypeLabel && (
                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1">Node Type</label>
                  <select
                    value={editNodeType || detectedNodeType}
                    onChange={(e) => setEditNodeType(e.target.value as NodeType)}
                    className="w-full px-2 py-1 bg-[#2a2a2a] border border-[#333] rounded text-sm text-white"
                  >
                    {nodeTypeOptions.map((type) => (
                      <option key={type} value={type}>
                        {getNodeTypeLabel(type)}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <div className="flex items-center gap-2">
                <button
                  onClick={handleSave}
                  className="px-3 py-1 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded"
                >
                  Save
                </button>
                {onCancelEdit && (
                  <button
                    onClick={onCancelEdit}
                    className="px-3 py-1 text-sm bg-gray-600 hover:bg-gray-700 text-white rounded"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              {/* Selector formatted as code */}
              {displaySelector && (
                <code className="text-xs bg-[#252525] text-blue-300 px-1.5 py-0.5 rounded border border-[#333] truncate max-w-[250px] font-mono">
                  {highlightText && searchQuery ? highlightText(displaySelector, searchQuery) : displaySelector}
                </code>
              )}
              {displayValue && (
                <>
                  <span className="text-gray-500 text-xs">Is</span>
                  <span className="text-xs text-green-400 px-1.5 py-0.5 bg-green-900/20 border border-green-900/30 rounded font-mono">
                    "{displayValue}"
                  </span>
                </>
              )}
            </div>
          )}
        </div>

        {/* Timestamp */}
        <span className="text-xs text-gray-500 font-mono mr-4">{formatTimestamp(action.timestamp)}</span>

        {/* Actions Menu */}
        {!isEditing && (
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={onInsert}
              className="p-1.5 hover:bg-[#333] hover:text-blue-400 rounded text-gray-400 transition-colors"
              title="Insert Step"
            >
              <Plus size={14} />
            </button>
            {onStartEdit && (
              <button
                onClick={onStartEdit}
                className="p-1.5 hover:bg-[#333] hover:text-yellow-400 rounded text-gray-400 transition-colors"
                title="Edit"
              >
                <MoreHorizontal size={14} />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Expanded details view (for non-sub-items) */}
      {isExpanded && !isSubItem && !isEditing && (
        <div className="px-4 py-2 bg-[#161616] border-b border-[#222] text-sm space-y-1">
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
          {getNodeTypeLabel && (
            <div>
              <span className="text-gray-400">Detected Node Type:</span>{' '}
              <span className="text-gray-200">{getNodeTypeLabel(detectedNodeType)}</span>
            </div>
          )}
        </div>
      )}
    </>
  );
}
