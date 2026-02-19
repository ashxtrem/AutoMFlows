import { useState, useEffect, useCallback } from 'react';
import {
  FolderOpen,
  Play,
  Square,
  Trash2,
  Search,
  ChevronDown,
  ChevronRight,
  FileJson,
  Upload,
  X,
  RefreshCw,
  AlertTriangle,
} from 'lucide-react';
import { useBatchExecution } from '../hooks/useBatchExecution';
import type { WorkflowFileInfo, Workflow } from '@automflows/shared';

type TabId = 'library' | 'dashboard' | 'history';

export default function WorkflowLibraryPage() {
  const {
    runningBatches,
    batchHistory,
    scanFolder,
    executeBatch,
    getBatchStatus,
    getBatchHistory,
    stopBatch,
    stopAll,
    clearBatchHistory,
    setRunningBatches,
    setBatchHistory,
  } = useBatchExecution();

  const [activeTab, setActiveTab] = useState<TabId>('library');
  const [folderPath, setFolderPath] = useState('./tests/workflows');
  const [recursive, setRecursive] = useState(false);
  const [pattern, setPattern] = useState('*.json');
  const [scanResults, setScanResults] = useState<WorkflowFileInfo[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [droppedFiles, setDroppedFiles] = useState<File[]>([]);
  const [workers, setWorkers] = useState(4);
  const [outputPath, setOutputPath] = useState('./output');
  const [showOverrides, setShowOverrides] = useState(false);
  const [startNodeOverrides, setStartNodeOverrides] = useState({
    recordSession: false,
    screenshotAllNodes: false,
    screenshotTiming: 'post' as 'pre' | 'post' | 'both',
  });
  const [scanning, setScanning] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [historyOffset] = useState(0);
  const [historyStatusFilter, setHistoryStatusFilter] = useState<string>('');
  const [expandedBatchId, setExpandedBatchId] = useState<string | null>(null);
  const [pollingBatchIds, setPollingBatchIds] = useState<Set<string>>(new Set());
  const [discoveredExpanded, setDiscoveredExpanded] = useState(false);
  const [discoveredSearch, setDiscoveredSearch] = useState('');
  const [executeFolderConfirm, setExecuteFolderConfirm] = useState(false);

  const handleScan = useCallback(async () => {
    if (!folderPath.trim()) {
      setError('Folder path is required');
      return;
    }
    setScanning(true);
    setError(null);
    try {
      const results = await scanFolder(folderPath, { recursive, pattern });
      setScanResults(results);
      setSelectedFiles(new Set());
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Scan failed');
    } finally {
      setScanning(false);
    }
  }, [folderPath, recursive, pattern, scanFolder]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const jsonFiles = files.filter((f) => f.name.toLowerCase().endsWith('.json'));
    setDroppedFiles((prev) => [...prev, ...jsonFiles]);
    e.target.value = '';
  };

  const removeDroppedFile = (index: number) => {
    setDroppedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const toggleSelect = (filePath: string) => {
    setSelectedFiles((prev) => {
      const next = new Set(prev);
      if (next.has(filePath)) next.delete(filePath);
      else next.add(filePath);
      return next;
    });
  };

  const selectAllValid = () => {
    setSelectedFiles(new Set(scanResults.filter((r) => r.isValid).map((r) => r.filePath)));
  };

  const selectNone = () => setSelectedFiles(new Set());

  const handleLaunchFromFolder = useCallback(async () => {
    if (!folderPath.trim()) {
      setError('Folder path is required');
      return;
    }
    setExecuteFolderConfirm(false);
    setExecuting(true);
    setError(null);
    try {
      await executeBatch({
        folderPath,
        recursive,
        pattern,
        workers,
        outputPath,
        startNodeOverrides: showOverrides ? startNodeOverrides : undefined,
      });
      setActiveTab('dashboard');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Execution failed');
    } finally {
      setExecuting(false);
    }
  }, [folderPath, recursive, pattern, workers, outputPath, showOverrides, startNodeOverrides, executeBatch]);

  const handleLaunchFromSelection = useCallback(async () => {
    const workflows: Workflow[] = [];
    const validSelected = scanResults.filter((r) => r.isValid && selectedFiles.has(r.filePath));
    for (const r of validSelected) {
      if (r.workflow) workflows.push(r.workflow);
    }
    if (workflows.length === 0 && droppedFiles.length === 0) {
      setError('Select workflows from scan results or add files via drag-drop');
      return;
    }
    setExecuting(true);
    setError(null);
    try {
      if (droppedFiles.length > 0) {
        await executeBatch({
          files: droppedFiles,
          workers,
          outputPath,
          startNodeOverrides: showOverrides ? startNodeOverrides : undefined,
        });
      } else {
        await executeBatch({
          workflows,
          workers,
          outputPath,
          startNodeOverrides: showOverrides ? startNodeOverrides : undefined,
        });
      }
      setActiveTab('dashboard');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Execution failed');
    } finally {
      setExecuting(false);
    }
  }, [scanResults, selectedFiles, droppedFiles, workers, outputPath, showOverrides, startNodeOverrides, executeBatch]);

  const handleStopBatch = useCallback(
    async (batchId: string) => {
      try {
        await stopBatch(batchId);
        setRunningBatches((prev) => prev.filter((b) => b.batchId !== batchId));
      } catch (err) {
        console.error('Stop batch failed:', err);
      }
    },
    [stopBatch, setRunningBatches]
  );

  const handleStopAll = useCallback(async () => {
    try {
      await stopAll();
      setRunningBatches([]);
    } catch (err) {
      console.error('Stop all failed:', err);
    }
  }, [stopAll, setRunningBatches]);

  const loadHistory = useCallback(async () => {
    try {
      const res = await getBatchHistory({
        limit: 20,
        offset: historyOffset,
        status: historyStatusFilter || undefined,
      });
      setBatchHistory(res);
    } catch (err) {
      console.error('Load history failed:', err);
    }
  }, [getBatchHistory, historyOffset, historyStatusFilter, setBatchHistory]);

  useEffect(() => {
    if (activeTab === 'history') loadHistory();
  }, [activeTab, loadHistory]);

  useEffect(() => {
    if (runningBatches.length === 0) return;
    const ids = runningBatches.map((b) => b.batchId);
    setPollingBatchIds((prev) => {
      const next = new Set(prev);
      ids.forEach((id) => next.add(id));
      return next;
    });
  }, [runningBatches]);

  useEffect(() => {
    if (pollingBatchIds.size === 0) return;
    const interval = setInterval(async () => {
      for (const batchId of pollingBatchIds) {
        try {
          const status = await getBatchStatus(batchId);
          if (status.status !== 'running') {
            setPollingBatchIds((prev) => {
              const next = new Set(prev);
              next.delete(batchId);
              return next;
            });
            setRunningBatches((prev) =>
              prev.filter((b) => b.batchId !== batchId)
            );
          } else {
            setRunningBatches((prev) =>
              prev.map((b) => (b.batchId === batchId ? status : b))
            );
          }
        } catch {
          // ignore
        }
      }
    }, 2000);
    return () => clearInterval(interval);
  }, [pollingBatchIds, getBatchStatus, setRunningBatches]);

  const formatDate = (ts: number) => new Date(ts).toLocaleString();
  const formatDuration = (ms?: number) =>
    ms != null ? `${(ms / 1000).toFixed(1)}s` : '-';

  const tabs: { id: TabId; label: string }[] = [
    { id: 'library', label: 'Workflow Library' },
    { id: 'dashboard', label: 'Batch Dashboard' },
    { id: 'history', label: 'Batch History' },
  ];

  return (
    <div className="min-h-screen bg-canvas text-primary p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">Workflow Library & Batch Execution</h1>

        <div className="flex gap-2 mb-6 border-b border-border pb-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-t transition-colors ${
                activeTab === tab.id
                  ? 'bg-surface border border-border border-b-0 -mb-[2px]'
                  : 'bg-surfaceHighlight hover:bg-surfaceHighlight text-secondary'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-900/30 border border-red-700 rounded text-red-200 flex items-center justify-between">
            <span>{error}</span>
            <button onClick={() => setError(null)}>
              <X size={18} />
            </button>
          </div>
        )}

        {/* Execute Folder confirmation */}
        {executeFolderConfirm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-surface border border-border rounded-lg shadow-xl p-6 max-w-md">
              <div className="flex items-start gap-3 mb-4">
                <AlertTriangle size={24} className="text-amber-500 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-lg font-semibold text-primary">Execute Folder?</h3>
                  <p className="text-sm text-secondary mt-2">
                    This will run all workflows matching the pattern <code className="bg-canvas px-1 rounded">{pattern}</code> in{' '}
                    <code className="bg-canvas px-1 rounded">{folderPath}</code>
                    {recursive && ' (including subdirectories)'}. Proceed?
                  </p>
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => setExecuteFolderConfirm(false)}
                  className="px-4 py-2 bg-surfaceHighlight hover:bg-surfaceHighlight text-primary rounded transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleLaunchFromFolder()}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded transition-colors"
                >
                  Proceed
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'library' && (
          <div className="space-y-6">
            {/* Folder Scanner */}
            <div className="bg-surface border border-border rounded-lg p-4">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <FolderOpen size={20} />
                Folder Scanner
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm text-secondary mb-1">Folder path</label>
                  <input
                    type="text"
                    value={folderPath}
                    onChange={(e) => setFolderPath(e.target.value)}
                    placeholder="./tests/workflows"
                    className="w-full px-3 py-2 bg-canvas border border-border rounded text-primary"
                  />
                </div>
                <div className="flex gap-4 items-end flex-wrap">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={recursive}
                      onChange={(e) => setRecursive(e.target.checked)}
                    />
                    <span className="text-sm">Recursive</span>
                  </label>
                  <div>
                    <label className="block text-sm text-secondary mb-1">Pattern</label>
                    <input
                      type="text"
                      value={pattern}
                      onChange={(e) => setPattern(e.target.value)}
                      className="w-24 px-2 py-2 bg-canvas border border-border rounded text-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-secondary mb-1">Add workflow JSON</label>
                    <label
                      htmlFor="workflow-json-dropzone"
                      onDrop={(e) => {
                        e.preventDefault();
                        const files = Array.from(e.dataTransfer.files).filter((f) =>
                          f.name.toLowerCase().endsWith('.json')
                        );
                        setDroppedFiles((prev) => [...prev, ...files]);
                      }}
                      onDragOver={(e) => e.preventDefault()}
                      className="w-32 h-10 border-2 border-dashed border-border rounded flex items-center justify-center text-secondary text-xs hover:border-blue-500 transition-colors cursor-pointer block"
                    >
                      <Upload size={14} className="mr-1" />
                      Drop .json
                    </label>
                    <input
                      id="workflow-json-dropzone"
                      type="file"
                      accept=".json"
                      multiple
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleScan}
                  disabled={scanning}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded flex items-center gap-2"
                >
                  {scanning ? (
                    <RefreshCw size={16} className="animate-spin" />
                  ) : (
                    <RefreshCw size={16} />
                  )}
                  Sync
                </button>
                <button
                  onClick={() => setExecuteFolderConfirm(true)}
                  disabled={executing}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded flex items-center gap-2"
                >
                  <Play size={16} />
                  Execute Folder
                </button>
              </div>
            </div>

            {/* Workflow list from scan - collapsible and searchable */}
            {scanResults.length > 0 && (
              <div className="bg-surface border border-border rounded-lg p-4">
                <button
                  onClick={() => setDiscoveredExpanded((e) => !e)}
                  className="w-full flex items-center justify-between text-left"
                >
                  <h2 className="text-lg font-semibold flex items-center gap-2">
                    Discovered Workflows ({scanResults.length})
                    {discoveredExpanded ? (
                      <ChevronDown size={18} />
                    ) : (
                      <ChevronRight size={18} />
                    )}
                  </h2>
                  <div
                    className="flex items-center gap-1 px-2 py-1 rounded bg-canvas border border-border"
                    onClick={(e) => {
                      e.stopPropagation();
                      setDiscoveredExpanded(true);
                    }}
                  >
                    <Search size={14} className="text-secondary" />
                    <input
                      type="text"
                      value={discoveredSearch}
                      onChange={(e) => setDiscoveredSearch(e.target.value)}
                      placeholder="Search..."
                      className="w-24 bg-transparent text-sm text-primary placeholder-secondary focus:outline-none"
                    />
                  </div>
                </button>
                {discoveredExpanded && (
                  <>
                    <div className="flex gap-2 mt-3 mb-3">
                      <button
                        onClick={selectAllValid}
                        className="text-sm text-blue-400 hover:text-blue-300"
                      >
                        Select all valid
                      </button>
                      <button
                        onClick={selectNone}
                        className="text-sm text-blue-400 hover:text-blue-300"
                      >
                        Clear selection
                      </button>
                    </div>
                    <div className="max-h-48 overflow-y-auto space-y-1">
                      {scanResults
                        .filter(
                          (r) =>
                            !discoveredSearch.trim() ||
                            r.fileName.toLowerCase().includes(discoveredSearch.toLowerCase()) ||
                            r.filePath.toLowerCase().includes(discoveredSearch.toLowerCase())
                        )
                        .map((r) => (
                          <label
                            key={r.filePath}
                            className={`flex items-center gap-2 py-1.5 px-2 rounded cursor-pointer ${
                              r.isValid ? 'hover:bg-surfaceHighlight' : 'opacity-60'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={selectedFiles.has(r.filePath)}
                              onChange={() => r.isValid && toggleSelect(r.filePath)}
                              disabled={!r.isValid}
                            />
                            <FileJson size={14} className="text-secondary" />
                            <span className="text-sm truncate flex-1">{r.fileName}</span>
                            {r.isValid ? (
                              <span className="text-xs text-green-500">Valid</span>
                            ) : (
                              <span className="text-xs text-red-500" title={r.validationErrors?.join(', ')}>
                                Invalid
                              </span>
                            )}
                          </label>
                        ))}
                    </div>
                    <button
                      onClick={handleLaunchFromSelection}
                      disabled={executing || (selectedFiles.size === 0 && droppedFiles.length === 0)}
                      className="mt-4 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded flex items-center gap-2"
                    >
                      <Play size={16} />
                      Execute Selected ({selectedFiles.size + droppedFiles.length})
                    </button>
                  </>
                )}
              </div>
            )}

            {droppedFiles.length > 0 && (
              <div className="bg-surface border border-border rounded-lg p-4">
                <h2 className="text-sm font-semibold mb-2 text-secondary">Added workflow files</h2>
                <ul className="space-y-1">
                  {droppedFiles.map((f, i) => (
                    <li key={`${f.name}-${i}`} className="flex items-center gap-2 text-sm">
                      <FileJson size={14} />
                      {f.name}
                      <button
                        onClick={() => removeDroppedFile(i)}
                        className="text-red-500 hover:text-red-400 ml-auto"
                      >
                        <X size={14} />
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Batch Runner config */}
            <div className="bg-surface border border-border rounded-lg p-4">
              <h2 className="text-lg font-semibold mb-4">Batch Configuration</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-secondary mb-1">Workers</label>
                  <input
                    type="number"
                    min={1}
                    max={16}
                    value={workers}
                    onChange={(e) => setWorkers(parseInt(e.target.value, 10) || 4)}
                    className="w-24 px-3 py-2 bg-canvas border border-border rounded text-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm text-secondary mb-1">Output path</label>
                  <input
                    type="text"
                    value={outputPath}
                    onChange={(e) => setOutputPath(e.target.value)}
                    className="w-full px-3 py-2 bg-canvas border border-border rounded text-primary"
                  />
                </div>
              </div>
              <div className="mt-4">
                <button
                  onClick={() => setShowOverrides((o) => !o)}
                  className="flex items-center gap-2 text-sm text-secondary hover:text-primary"
                >
                  {showOverrides ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                  Start node overrides
                </button>
                {showOverrides && (
                  <div className="mt-2 pl-4 space-y-2">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={startNodeOverrides.recordSession}
                        onChange={(e) =>
                          setStartNodeOverrides((o) => ({ ...o, recordSession: e.target.checked }))
                        }
                      />
                      <span className="text-sm">Record session</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={startNodeOverrides.screenshotAllNodes}
                        onChange={(e) =>
                          setStartNodeOverrides((o) => ({ ...o, screenshotAllNodes: e.target.checked }))
                        }
                      />
                      <span className="text-sm">Screenshot all nodes</span>
                    </label>
                    <div>
                      <label className="block text-sm text-secondary mb-1">Screenshot timing</label>
                      <select
                        value={startNodeOverrides.screenshotTiming}
                        onChange={(e) =>
                          setStartNodeOverrides((o) => ({
                            ...o,
                            screenshotTiming: e.target.value as 'pre' | 'post' | 'both',
                          }))
                        }
                        className="px-2 py-1 bg-canvas border border-border rounded text-primary"
                      >
                        <option value="pre">Pre</option>
                        <option value="post">Post</option>
                        <option value="both">Both</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'dashboard' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold">Running Batches</h2>
              {runningBatches.length > 0 && (
                <button
                  onClick={handleStopAll}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded flex items-center gap-2"
                >
                  <Square size={16} />
                  Stop All
                </button>
              )}
            </div>
            {runningBatches.length === 0 ? (
              <div className="text-center py-12 text-secondary">
                No batches running. Launch from the Workflow Library tab.
              </div>
            ) : (
              <div className="space-y-4">
                {runningBatches.map((batch) => (
                  <div
                    key={batch.batchId}
                    className="bg-surface border border-border rounded-lg p-4"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <span className="font-mono text-sm text-secondary">{batch.batchId}</span>
                        <span className="ml-2 px-2 py-0.5 bg-blue-600/30 rounded text-sm">
                          {batch.status}
                        </span>
                      </div>
                      <button
                        onClick={() => handleStopBatch(batch.batchId)}
                        className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-sm rounded flex items-center gap-1"
                      >
                        <Square size={12} />
                        Stop
                      </button>
                    </div>
                    <div className="flex gap-4 text-sm text-secondary mb-2">
                      <span>Completed: {batch.completed}/{batch.totalWorkflows}</span>
                      <span>Running: {batch.running}</span>
                      <span>Queued: {batch.queued}</span>
                      <span>Failed: {batch.failed}</span>
                    </div>
                    <div className="w-full bg-canvas rounded h-2 overflow-hidden">
                      <div
                        className="h-full bg-green-600 transition-all"
                        style={{
                          width: `${(batch.completed / batch.totalWorkflows) * 100}%`,
                        }}
                      />
                    </div>
                    {batch.executions && batch.executions.length > 0 && (
                      <div className="mt-3">
                        <button
                          onClick={() =>
                            setExpandedBatchId((id) => (id === batch.batchId ? null : batch.batchId))
                          }
                          className="text-sm text-blue-400 hover:text-blue-300"
                        >
                          {expandedBatchId === batch.batchId ? 'Hide' : 'Show'} per-workflow status
                        </button>
                        {expandedBatchId === batch.batchId && (
                          <ul className="mt-2 space-y-1 text-sm">
                            {batch.executions.map((e) => (
                              <li key={e.executionId} className="flex items-center gap-2">
                                <span className="text-secondary">{e.workflowFileName}</span>
                                <span
                                  className={`px-1.5 rounded text-xs ${
                                    e.status === 'completed'
                                      ? 'bg-green-600/30'
                                      : e.status === 'error' || e.status === 'stopped'
                                        ? 'bg-red-600/30'
                                        : e.status === 'running'
                                          ? 'bg-blue-600/30'
                                          : 'bg-surfaceHighlight'
                                  }`}
                                >
                                  {e.status}
                                </span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'history' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center flex-wrap gap-4">
              <div className="flex gap-2 items-center">
                <select
                  value={historyStatusFilter}
                  onChange={(e) => setHistoryStatusFilter(e.target.value)}
                  className="px-3 py-2 bg-surface border border-border rounded text-primary"
                >
                  <option value="">All statuses</option>
                  <option value="running">Running</option>
                  <option value="completed">Completed</option>
                  <option value="error">Error</option>
                  <option value="stopped">Stopped</option>
                </select>
                <button
                  onClick={loadHistory}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded flex items-center gap-2"
                >
                  <RefreshCw size={16} />
                  Refresh
                </button>
              </div>
              <button
                onClick={async () => {
                  try {
                    await clearBatchHistory();
                    await loadHistory();
                  } catch (err) {
                    console.error('Clear history failed:', err);
                  }
                }}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded flex items-center gap-2"
              >
                <Trash2 size={16} />
                Clear History
              </button>
            </div>
            {!batchHistory ? (
              <div className="text-center py-12 text-secondary">Loading history...</div>
            ) : batchHistory.batches.length === 0 ? (
              <div className="text-center py-12 text-secondary">No batch history.</div>
            ) : (
              <div className="bg-surface border border-border rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="bg-surfaceHighlight border-b border-border">
                      <th className="px-4 py-3 text-left text-sm font-semibold">Batch ID</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">Status</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">Source</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">Workflows</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">Completed</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">Failed</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">Started</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">Duration</th>
                    </tr>
                  </thead>
                  <tbody>
                    {batchHistory.batches.map((b) => (
                      <tr key={b.batchId} className="border-b border-border hover:bg-surfaceHighlight">
                        <td className="px-4 py-3 font-mono text-sm">{b.batchId.slice(0, 12)}...</td>
                        <td className="px-4 py-3">
                          <span
                            className={`px-2 py-0.5 rounded text-xs ${
                              b.status === 'completed'
                                ? 'bg-green-600/30'
                                : b.status === 'error' || b.status === 'stopped'
                                  ? 'bg-red-600/30'
                                  : b.status === 'running'
                                    ? 'bg-blue-600/30'
                                    : 'bg-surfaceHighlight'
                            }`}
                          >
                            {b.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm">{b.sourceType}</td>
                        <td className="px-4 py-3 text-sm">{b.totalWorkflows}</td>
                        <td className="px-4 py-3 text-sm">{b.completed}</td>
                        <td className="px-4 py-3 text-sm">{b.failed}</td>
                        <td className="px-4 py-3 text-sm">{formatDate(b.startTime)}</td>
                        <td className="px-4 py-3 text-sm">{formatDuration(b.duration)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="px-4 py-2 text-sm text-secondary border-t border-border">
                  Total: {batchHistory.total} | Showing {batchHistory.batches.length}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
