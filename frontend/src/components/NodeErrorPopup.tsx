import { useState, useEffect } from 'react';
import { X, AlertCircle, FileText, ChevronDown, ChevronUp, Copy, Code, Globe, Search, Camera } from 'lucide-react';
import { useWorkflowStore } from '../store/workflowStore';
import { PageDebugInfo, SelectorSuggestion } from '@automflows/shared';
import { getBackendPort, getBackendBaseUrl } from '../utils/getBackendPort';

interface NodeErrorPopupProps {
  nodeId: string;
  error: {
    message: string;
    traceLogs: string[];
    debugInfo?: PageDebugInfo;
  };
  onClose: () => void;
}

export default function NodeErrorPopup({ nodeId, error, onClose }: NodeErrorPopupProps) {
  const { nodes } = useWorkflowStore();
  const [expandedSections, setExpandedSections] = useState<{
    pageSource: boolean;
    similarSelectors: boolean;
    screenshots: boolean;
  }>({
    pageSource: false,
    similarSelectors: false,
    screenshots: false,
  });
  const [pageSourceSearch, setPageSourceSearch] = useState('');
  const [backendPort, setBackendPort] = useState<number | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  useEffect(() => {
    const loadPort = async () => {
      const p = await getBackendPort();
      setBackendPort(p);
    };
    loadPort();
  }, []);

  const node = nodes.find(n => n.id === nodeId);
  const nodeLabel = node?.data?.label || node?.data?.type || nodeId;

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleCloseClick = (e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation(); // Prevent event from bubbling to backdrop
    }
    onClose();
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      // Could add a toast notification here
    }).catch(err => {
      console.error('Failed to copy:', err);
    });
  };

  const toggleSection = (section: 'pageSource' | 'similarSelectors' | 'screenshots') => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const getScreenshotUrl = (screenshotPath: string): string | null => {
    if (!backendPort || !error.debugInfo?.executionFolderName || !screenshotPath) {
      return null;
    }
    // Extract filename from full path
    const filename = screenshotPath.split(/[/\\]/).pop() || screenshotPath;
    return `${getBackendBaseUrl(backendPort)}/api/reports/${error.debugInfo.executionFolderName}/screenshots/${filename}`;
  };

  const highlightSearchText = (text: string, search: string): React.ReactNode => {
    if (!search) return text;
    const parts = text.split(new RegExp(`(${search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'));
    return parts.map((part, i) => 
      part.toLowerCase() === search.toLowerCase() ? (
        <mark key={i} className="bg-yellow-500 text-black">{part}</mark>
      ) : part
    );
  };

  const filteredPageSource = error.debugInfo?.pageSource 
    ? (pageSourceSearch 
        ? error.debugInfo.pageSource.split('\n').filter(line => 
            line.toLowerCase().includes(pageSourceSearch.toLowerCase())
          ).join('\n')
        : error.debugInfo.pageSource || '')
    : '';

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      onClick={handleBackdropClick}
    >
      <div className="bg-surface border border-red-500 rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[80vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <AlertCircle className="text-red-500" size={20} />
            <h2 className="text-lg font-semibold text-white">Node Execution Error</h2>
          </div>
          <button
            onClick={(e) => handleCloseClick(e)}
            className="text-secondary hover:text-primary transition-colors"
          >
            <X size={20} />
          </button>
        </div>
        
        <div className="overflow-y-auto p-4 flex-1 space-y-4">
          {/* Node Info */}
          <div className="bg-surfaceHighlight rounded p-3 border border-border">
            <div className="text-sm font-medium text-white mb-2">
              Failed Node: <span className="text-red-400">{nodeLabel}</span>
            </div>
            <div className="text-xs text-secondary">
              Node ID: <span className="font-mono">{nodeId}</span>
            </div>
          </div>

          {/* Error Message */}
          <div className="bg-red-900/30 border border-red-500/50 rounded p-3">
            <div className="text-sm font-medium text-red-400 mb-1">Error Message</div>
            <div className="text-sm text-primary whitespace-pre-wrap">{error.message}</div>
          </div>

          {/* Trace Logs */}
          {error.traceLogs && error.traceLogs.length > 0 && (
            <div className="bg-surfaceHighlight rounded p-3 border border-border">
              <div className="flex items-center gap-2 mb-2">
                <FileText className="text-secondary" size={16} />
                <div className="text-sm font-medium text-white">
                  Trace Logs ({error.traceLogs.length} entries)
                </div>
              </div>
              <div className="bg-canvas rounded p-3 max-h-96 overflow-y-auto">
                <pre className="text-xs text-primary font-mono whitespace-pre-wrap">
                  {error.traceLogs.join('\n')}
                </pre>
              </div>
            </div>
          )}

          {/* Debug Info Section */}
          {error.debugInfo && (
            <div className="space-y-4">
              {/* Page URL */}
              {error.debugInfo.pageUrl && (
                <div className="bg-surfaceHighlight rounded p-3 border border-border">
                  <div className="flex items-center gap-2 mb-2">
                    <Globe className="text-blue-400" size={16} />
                    <div className="text-sm font-medium text-white">Current Page URL</div>
                  </div>
                  <div className="text-sm text-primary break-all font-mono bg-canvas rounded p-2">
                    {error.debugInfo.pageUrl}
                  </div>
                </div>
              )}

              {/* Screenshots */}
              {error.debugInfo.screenshotPaths && 
               (error.debugInfo.screenshotPaths.pre || error.debugInfo.screenshotPaths.post) && (
                <div className="bg-surfaceHighlight rounded p-3 border border-border">
                  <button
                    onClick={() => toggleSection('screenshots')}
                    className="flex items-center justify-between w-full mb-2 text-left"
                  >
                    <div className="flex items-center gap-2">
                      <Camera className="text-yellow-400" size={16} />
                      <div className="text-sm font-medium text-white">
                        Screenshots
                        {error.debugInfo.screenshotPaths.pre && error.debugInfo.screenshotPaths.post 
                          ? ' (Pre & Post)' 
                          : error.debugInfo.screenshotPaths.pre 
                          ? ' (Pre)' 
                          : ' (Post)'}
                      </div>
                    </div>
                    {expandedSections.screenshots ? (
                      <ChevronUp className="text-secondary" size={16} />
                    ) : (
                      <ChevronDown className="text-secondary" size={16} />
                    )}
                  </button>
                  {expandedSections.screenshots && (
                    <div className="space-y-3 mt-2">
                      {error.debugInfo.screenshotPaths.pre && (
                        <div className="bg-canvas rounded p-3 border border-border">
                          <div className="text-xs font-medium text-secondary mb-2 uppercase">Pre-execution Screenshot</div>
                          {getScreenshotUrl(error.debugInfo.screenshotPaths.pre) ? (
                            <div className="space-y-2">
                              <img 
                                src={getScreenshotUrl(error.debugInfo.screenshotPaths.pre)!} 
                                alt="Pre-execution screenshot"
                                className="max-w-full h-auto rounded border border-border"
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement;
                                  target.style.display = 'none';
                                  const parent = target.parentElement;
                                  if (parent) {
                                    parent.innerHTML = '<div class="text-xs text-red-400">Failed to load screenshot</div>';
                                  }
                                }}
                              />
                              <a
                                href={getScreenshotUrl(error.debugInfo.screenshotPaths.pre)!}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-blue-400 hover:text-blue-300 underline"
                              >
                                Open in new tab
                              </a>
                            </div>
                          ) : (
                            <div className="text-xs text-secondary">Screenshot path: {error.debugInfo.screenshotPaths.pre}</div>
                          )}
                        </div>
                      )}
                      {error.debugInfo.screenshotPaths.post && (
                        <div className="bg-canvas rounded p-3 border border-border">
                          <div className="text-xs font-medium text-secondary mb-2 uppercase">Post-execution Screenshot</div>
                          {getScreenshotUrl(error.debugInfo.screenshotPaths.post) ? (
                            <div className="space-y-2">
                              <img 
                                src={getScreenshotUrl(error.debugInfo.screenshotPaths.post)!} 
                                alt="Post-execution screenshot"
                                className="max-w-full h-auto rounded border border-border"
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement;
                                  target.style.display = 'none';
                                  const parent = target.parentElement;
                                  if (parent) {
                                    parent.innerHTML = '<div class="text-xs text-red-400">Failed to load screenshot</div>';
                                  }
                                }}
                              />
                              <a
                                href={getScreenshotUrl(error.debugInfo.screenshotPaths.post)!}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-blue-400 hover:text-blue-300 underline"
                              >
                                Open in new tab
                              </a>
                            </div>
                          ) : (
                            <div className="text-xs text-secondary">Screenshot path: {error.debugInfo.screenshotPaths.post}</div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Similar Selectors */}
              {error.debugInfo.similarSelectors && error.debugInfo.similarSelectors.length > 0 && (
                <div className="bg-surfaceHighlight rounded p-3 border border-border">
                  <button
                    onClick={() => toggleSection('similarSelectors')}
                    className="flex items-center justify-between w-full mb-2 text-left"
                  >
                    <div className="flex items-center gap-2">
                      <Search className="text-green-400" size={16} />
                      <div className="text-sm font-medium text-white">
                        Similar Selectors ({error.debugInfo.similarSelectors.length} suggestions)
                      </div>
                    </div>
                    {expandedSections.similarSelectors ? (
                      <ChevronUp className="text-secondary" size={16} />
                    ) : (
                      <ChevronDown className="text-secondary" size={16} />
                    )}
                  </button>
                  {expandedSections.similarSelectors && (
                    <div className="space-y-2 mt-2">
                      {error.debugInfo.similarSelectors.map((suggestion: SelectorSuggestion, index: number) => (
                        <div
                          key={index}
                          className="bg-canvas rounded p-3 border border-border"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <code className="text-xs font-mono text-green-400 bg-surface px-2 py-1 rounded">
                                  {suggestion.selector}
                                </code>
                                <span className="text-xs text-secondary">
                                  ({suggestion.selectorType})
                                </span>
                              </div>
                              <div className="text-xs text-secondary mb-1">
                                {suggestion.reason}
                              </div>
                              {suggestion.elementInfo && (
                                <div className="text-xs text-secondary font-mono">
                                  Element: {suggestion.elementInfo}
                                </div>
                              )}
                            </div>
                            <button
                              onClick={() => copyToClipboard(suggestion.selector)}
                              className="flex-shrink-0 p-1.5 text-secondary hover:text-primary hover:bg-gray-800 rounded transition-colors"
                              title="Copy selector"
                            >
                              <Copy size={14} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Page Source */}
              {error.debugInfo.pageSource && (
                <div className="bg-surfaceHighlight rounded p-3 border border-border">
                  <div className="flex items-center justify-between mb-2">
                    <button
                      onClick={() => toggleSection('pageSource')}
                      className="flex items-center gap-2 text-left"
                    >
                      <Code className="text-purple-400" size={16} />
                      <div className="text-sm font-medium text-white">
                        Page Source
                      </div>
                      {expandedSections.pageSource ? (
                        <ChevronUp className="text-secondary" size={16} />
                      ) : (
                        <ChevronDown className="text-secondary" size={16} />
                      )}
                    </button>
                    <div className="flex items-center gap-2">
                      {expandedSections.pageSource && (
                        <>
                          <input
                            type="text"
                            placeholder="Search..."
                            value={pageSourceSearch}
                            onChange={(e) => setPageSourceSearch(e.target.value)}
                            className="text-xs bg-gray-900 text-white px-2 py-1 rounded border border-border focus:outline-none focus:border-blue-500"
                            style={{ width: '150px' }}
                          />
                          <button
                            onClick={() => copyToClipboard(error.debugInfo!.pageSource || '')}
                            className="p-1.5 text-secondary hover:text-primary hover:bg-gray-800 rounded transition-colors"
                            title="Copy page source"
                          >
                            <Copy size={14} />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                  {expandedSections.pageSource && (
                    <div className="bg-canvas rounded p-3 max-h-96 overflow-y-auto mt-2">
                      {pageSourceSearch ? (
                        <div className="text-xs text-primary font-mono whitespace-pre-wrap">
                          {filteredPageSource.split('\n').map((line, i) => (
                            <div key={i} className="whitespace-pre">{highlightSearchText(line, pageSourceSearch)}</div>
                          ))}
                        </div>
                      ) : (
                        <pre className="text-xs text-primary font-mono whitespace-pre-wrap">
                          {error.debugInfo.pageSource}
                        </pre>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="p-4 border-t border-gray-700 flex justify-end">
          <button
            onClick={(e) => handleCloseClick(e)}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

