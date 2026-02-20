import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
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
import type { WorkflowFileInfo, Workflow, ReportType, BatchStatusResponse } from '@automflows/shared';

type TabId = 'library' | 'dashboard' | 'history';

const STORAGE_KEY = 'workflowLibraryState';

function loadPersistedState(): Partial<{
  folderPath: string;
  recursive: boolean;
  pattern: string;
  outputPath: string;
  workers: number;
  showOverrides: boolean;
  startNodeOverrides: Record<string, unknown>;
  scanResults: WorkflowFileInfo[];
  selectedFiles: string[];
  discoveredSearch: string;
  discoveredExpanded: boolean;
  traceLogs: boolean;
  reportConfig: { enabled: boolean; reportTypes: string[]; reportRetention: number };
  batchPriority: number;
}> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as ReturnType<typeof loadPersistedState>;
  } catch {
    return {};
  }
}

function savePersistedState(state: Record<string, unknown>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore quota or parse errors
  }
}

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

  const persisted = useMemo(() => loadPersistedState(), []);

  const [activeTab, setActiveTab] = useState<TabId>('library');
  const [folderPath, setFolderPath] = useState(() => persisted.folderPath ?? './tests/workflows');
  const [recursive, setRecursive] = useState(() => persisted.recursive ?? true);
  const [pattern, setPattern] = useState(() => persisted.pattern ?? '*.json');
  const [scanResults, setScanResults] = useState<WorkflowFileInfo[]>(() => persisted.scanResults ?? []);
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(
    () => new Set(persisted.selectedFiles ?? [])
  );
  const [droppedFiles, setDroppedFiles] = useState<File[]>([]);
  const [selectedDroppedFiles, setSelectedDroppedFiles] = useState<Set<number>>(new Set());
  const [workers, setWorkers] = useState(() => persisted.workers ?? 4);
  const [outputPath, setOutputPath] = useState(() => persisted.outputPath ?? './output');
  const [showOverrides, setShowOverrides] = useState(() => persisted.showOverrides ?? false);
  const [startNodeOverrides, setStartNodeOverrides] = useState(() => ({
    recordSession: false,
    screenshotAllNodes: false,
    screenshotTiming: 'post' as 'pre' | 'post' | 'both',
    snapshotAllNodes: false,
    snapshotTiming: 'post' as 'pre' | 'post' | 'both',
    slowMo: 0,
    scrollThenAction: false,
    ...(persisted.startNodeOverrides as Record<string, unknown>),
  }));
  const [scanning, setScanning] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [historyOffset] = useState(0);
  const [historyStatusFilter, setHistoryStatusFilter] = useState<string>('');
  const [expandedBatchId, setExpandedBatchId] = useState<string | null>(null);
  const [pollingBatchIds, setPollingBatchIds] = useState<Set<string>>(new Set());
  const [discoveredExpanded, setDiscoveredExpanded] = useState(() => persisted.discoveredExpanded ?? false);
  const [discoveredSearch, setDiscoveredSearch] = useState(() => persisted.discoveredSearch ?? '');
  const [executeFolderConfirm, setExecuteFolderConfirm] = useState(false);
  const [batchDetailPopup, setBatchDetailPopup] = useState<BatchStatusResponse | null>(null);
  const [batchDetailLoading, setBatchDetailLoading] = useState(false);
  const [traceLogs, setTraceLogs] = useState(() => persisted.traceLogs ?? false);
  const [reportConfig, setReportConfig] = useState(() => ({
    enabled: false,
    reportTypes: ['html'] as ReportType[],
    reportRetention: 10,
    ...(persisted.reportConfig as { enabled?: boolean; reportTypes?: ReportType[]; reportRetention?: number }),
  }));
  const [batchPriority, setBatchPriority] = useState(() => persisted.batchPriority ?? 0);

  useEffect(() => {
    savePersistedState({
      folderPath,
      recursive,
      pattern,
      outputPath,
      workers,
      showOverrides,
      startNodeOverrides,
      scanResults,
      selectedFiles: Array.from(selectedFiles),
      discoveredSearch,
      discoveredExpanded,
      traceLogs,
      reportConfig,
      batchPriority,
    });
  }, [
    folderPath,
    recursive,
    pattern,
    outputPath,
    workers,
    showOverrides,
    startNodeOverrides,
    scanResults,
    selectedFiles,
    discoveredSearch,
    discoveredExpanded,
    traceLogs,
    reportConfig,
    batchPriority,
  ]);

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
    setSelectedDroppedFiles((prev) => {
      const next = new Set<number>();
      prev.forEach((i) => {
        if (i < index) next.add(i);
        else if (i > index) next.add(i - 1);
      });
      return next;
    });
  };

  const toggleDroppedFile = (index: number) => {
    setSelectedDroppedFiles((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const selectAllDropped = () => {
    setSelectedDroppedFiles(new Set(droppedFiles.map((_, i) => i)));
  };

  const selectNoneDropped = () => setSelectedDroppedFiles(new Set());

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
        traceLogs,
        recordSession: showOverrides ? startNodeOverrides.recordSession : undefined,
        screenshotConfig:
          showOverrides && startNodeOverrides.screenshotAllNodes
            ? { enabled: true, timing: startNodeOverrides.screenshotTiming ?? 'post' }
            : undefined,
        reportConfig: reportConfig.enabled ? reportConfig : undefined,
        batchPriority,
        startNodeOverrides: showOverrides ? startNodeOverrides : undefined,
      });
      setActiveTab('dashboard');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Execution failed');
    } finally {
      setExecuting(false);
    }
  }, [folderPath, recursive, pattern, workers, outputPath, traceLogs, reportConfig, batchPriority, showOverrides, startNodeOverrides, executeBatch]);

  const handleLaunchFromSelection = useCallback(async () => {
    const workflows: Workflow[] = [];
    const fileNames: string[] = [];

    const validSelected = scanResults.filter((r) => r.isValid && selectedFiles.has(r.filePath));
    for (const r of validSelected) {
      if (r.workflow) {
        workflows.push(r.workflow);
        fileNames.push(r.fileName);
      }
    }

    const selectedDropped = droppedFiles
      .map((f, i) => ({ f, i }))
      .filter(({ i }) => selectedDroppedFiles.has(i));
    for (const { f } of selectedDropped) {
      try {
        const text = await f.text();
        const parsed = JSON.parse(text) as Workflow;
        if (parsed?.nodes && Array.isArray(parsed.nodes) && parsed?.edges && Array.isArray(parsed.edges)) {
          workflows.push(parsed);
          fileNames.push(f.name);
        } else {
          setError(`Invalid workflow in ${f.name}: missing nodes or edges`);
          return;
        }
      } catch (err) {
        setError(`Failed to parse ${f.name}: ${err instanceof Error ? err.message : 'Invalid JSON'}`);
        return;
      }
    }

    if (workflows.length === 0) {
      setError('Select workflows from scan results or add and select files via drag-drop');
      return;
    }
    setExecuting(true);
    setError(null);
    try {
      await executeBatch({
        workflows,
        workflowFileNames: fileNames.length > 0 ? fileNames : undefined,
        workers,
        outputPath,
        traceLogs,
        recordSession: showOverrides ? startNodeOverrides.recordSession : undefined,
        screenshotConfig:
          showOverrides && startNodeOverrides.screenshotAllNodes
            ? { enabled: true, timing: startNodeOverrides.screenshotTiming ?? 'post' }
            : undefined,
        reportConfig: reportConfig.enabled ? reportConfig : undefined,
        batchPriority,
        startNodeOverrides: showOverrides ? startNodeOverrides : undefined,
      });
      setActiveTab('dashboard');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Execution failed');
    } finally {
      setExecuting(false);
    }
  }, [scanResults, selectedFiles, droppedFiles, selectedDroppedFiles, workers, outputPath, traceLogs, reportConfig, batchPriority, showOverrides, startNodeOverrides, executeBatch]);

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

  const batchDetailCancelledRef = useRef(false);
  const handleBatchIdClick = useCallback(
    async (batchId: string) => {
      batchDetailCancelledRef.current = false;
      setBatchDetailLoading(true);
      setBatchDetailPopup(null);
      try {
        const status = await getBatchStatus(batchId);
        if (!batchDetailCancelledRef.current) setBatchDetailPopup(status);
      } catch (err) {
        if (!batchDetailCancelledRef.current) console.error('Load batch detail failed:', err);
      } finally {
        setBatchDetailLoading(false);
      }
    },
    [getBatchStatus]
  );
  const handleBatchDetailClose = useCallback(() => {
    batchDetailCancelledRef.current = true;
    setBatchDetailLoading(false);
    setBatchDetailPopup(null);
  }, []);

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

        {/* Batch detail popup */}
        {(batchDetailPopup || batchDetailLoading) && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-surface border border-border rounded-lg shadow-xl p-6 max-w-2xl max-h-[90vh] overflow-auto">
              {batchDetailLoading ? (
                <div className="flex flex-col items-center gap-4 py-8">
                  <div className="text-secondary">Loading batch details...</div>
                  <button
                    onClick={handleBatchDetailClose}
                    className="px-4 py-2 bg-surfaceHighlight hover:bg-border rounded text-sm"
                  >
                    Cancel
                  </button>
                </div>
              ) : batchDetailPopup ? (
                <>
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="text-lg font-semibold text-primary">Batch Details</h3>
                    <button
                      onClick={handleBatchDetailClose}
                      className="text-secondary hover:text-primary"
                    >
                      <X size={20} />
                    </button>
                  </div>
                  <div className="space-y-2 text-sm mb-4">
                    <div>
                      <span className="text-secondary">Batch ID:</span>{' '}
                      <span className="font-mono">{batchDetailPopup.batchId}</span>
                    </div>
                    <div>
                      <span className="text-secondary">Status:</span>{' '}
                      <span
                        className={`px-2 py-0.5 rounded text-xs ${
                          batchDetailPopup.status === 'completed'
                            ? 'bg-green-600/30'
                            : batchDetailPopup.status === 'error' || batchDetailPopup.status === 'stopped'
                              ? 'bg-red-600/30'
                              : batchDetailPopup.status === 'running'
                                ? 'bg-blue-600/30'
                                : 'bg-surfaceHighlight'
                        }`}
                      >
                        {batchDetailPopup.status}
                      </span>
                    </div>
                    <div>
                      <span className="text-secondary">Source:</span> {batchDetailPopup.sourceType}
                    </div>
                    {batchDetailPopup.folderPath && (
                      <div>
                        <span className="text-secondary">Folder:</span> {batchDetailPopup.folderPath}
                      </div>
                    )}
                    <div>
                      <span className="text-secondary">Completed:</span> {batchDetailPopup.completed} /{' '}
                      {batchDetailPopup.totalWorkflows} |{' '}
                      <span className="text-secondary">Failed:</span> {batchDetailPopup.failed}
                    </div>
                    <div>
                      <span className="text-secondary">Started:</span>{' '}
                      {formatDate(batchDetailPopup.startTime)}
                    </div>
                    {batchDetailPopup.endTime != null && (
                      <div>
                        <span className="text-secondary">Duration:</span>{' '}
                        {formatDuration(
                          batchDetailPopup.endTime - batchDetailPopup.startTime
                        )}
                      </div>
                    )}
                  </div>
                  {batchDetailPopup.executions && batchDetailPopup.executions.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold mb-2">Per-workflow status</h4>
                      <ul className="space-y-1 text-sm max-h-48 overflow-y-auto">
                        {batchDetailPopup.executions.map((e) => (
                          <li key={e.executionId} className="flex items-center gap-2">
                            <span className="text-secondary truncate flex-1">
                              {e.workflowFileName}
                            </span>
                            <span
                              className={`px-1.5 rounded text-xs flex-shrink-0 ${
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
                    </div>
                  )}
                </>
              ) : null}
            </div>
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
                      disabled={executing || (selectedFiles.size === 0 && selectedDroppedFiles.size === 0)}
                      className="mt-4 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded flex items-center gap-2"
                    >
                      <Play size={16} />
                      Execute Selected ({selectedFiles.size + selectedDroppedFiles.size})
                    </button>
                  </>
                )}
              </div>
            )}

            {droppedFiles.length > 0 && (
              <div className="bg-surface border border-border rounded-lg p-4">
                <h2 className="text-sm font-semibold mb-2 text-secondary">Added workflow files</h2>
                <div className="flex gap-2 mb-3">
                  <button
                    onClick={selectAllDropped}
                    className="text-sm text-blue-400 hover:text-blue-300"
                  >
                    Select all
                  </button>
                  <button
                    onClick={selectNoneDropped}
                    className="text-sm text-blue-400 hover:text-blue-300"
                  >
                    Clear selection
                  </button>
                </div>
                <ul className="space-y-1">
                  {droppedFiles.map((f, i) => (
                    <li key={`${f.name}-${i}`} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={selectedDroppedFiles.has(i)}
                        onChange={() => toggleDroppedFile(i)}
                      />
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
                {(scanResults.length === 0 || !discoveredExpanded) && (
                  <button
                    onClick={handleLaunchFromSelection}
                    disabled={executing || (selectedFiles.size === 0 && selectedDroppedFiles.size === 0)}
                    className="mt-4 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded flex items-center gap-2"
                  >
                    <Play size={16} />
                    Execute Selected ({selectedFiles.size + selectedDroppedFiles.size})
                  </button>
                )}
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
                <div>
                  <label className="block text-sm text-secondary mb-1">Batch priority</label>
                  <input
                    type="number"
                    min={0}
                    value={batchPriority}
                    onChange={(e) => setBatchPriority(parseInt(e.target.value, 10) || 0)}
                    className="w-24 px-3 py-2 bg-canvas border border-border rounded text-primary"
                  />
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-6">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={traceLogs}
                    onChange={(e) => setTraceLogs(e.target.checked)}
                  />
                  <span className="text-sm">Trace logs</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={reportConfig.enabled}
                    onChange={(e) =>
                      setReportConfig((c) => ({ ...c, enabled: e.target.checked }))
                    }
                  />
                  <span className="text-sm">Reports</span>
                </label>
                {reportConfig.enabled && (
                  <>
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="text-sm text-secondary">Report types:</span>
                      {(['html', 'allure', 'json', 'junit', 'csv', 'markdown'] as ReportType[]).map(
                        (t) => (
                          <label key={t} className="flex items-center gap-1 text-sm">
                            <input
                              type="checkbox"
                              checked={reportConfig.reportTypes.includes(t)}
                              onChange={(e) => {
                                setReportConfig((c) => {
                                  const next = e.target.checked
                                    ? [...c.reportTypes, t]
                                    : c.reportTypes.filter((x) => x !== t);
                                  return {
                                    ...c,
                                    reportTypes: next.length > 0 ? next : ['html'],
                                  };
                                });
                              }}
                            />
                            {t}
                          </label>
                        )
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-sm text-secondary">Retention:</span>
                      <input
                        type="number"
                        min={1}
                        value={reportConfig.reportRetention}
                        onChange={(e) =>
                          setReportConfig((c) => ({
                            ...c,
                            reportRetention: parseInt(e.target.value, 10) || 10,
                          }))
                        }
                        className="w-16 px-2 py-1 bg-canvas border border-border rounded text-primary text-sm"
                      />
                    </div>
                  </>
                )}
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
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={startNodeOverrides.snapshotAllNodes}
                        onChange={(e) =>
                          setStartNodeOverrides((o) => ({ ...o, snapshotAllNodes: e.target.checked }))
                        }
                      />
                      <span className="text-sm">Accessibility snapshot all nodes</span>
                    </label>
                    <div>
                      <label className="block text-sm text-secondary mb-1">Snapshot timing</label>
                      <select
                        value={startNodeOverrides.snapshotTiming}
                        onChange={(e) =>
                          setStartNodeOverrides((o) => ({
                            ...o,
                            snapshotTiming: e.target.value as 'pre' | 'post' | 'both',
                          }))
                        }
                        className="px-2 py-1 bg-canvas border border-border rounded text-primary"
                      >
                        <option value="pre">Pre</option>
                        <option value="post">Post</option>
                        <option value="both">Both</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm text-secondary mb-1">Slow motion (ms)</label>
                      <input
                        type="number"
                        min={0}
                        value={startNodeOverrides.slowMo ?? 0}
                        onChange={(e) =>
                          setStartNodeOverrides((o) => ({
                            ...o,
                            slowMo: parseInt(e.target.value, 10) || 0,
                          }))
                        }
                        className="w-24 px-2 py-1 bg-canvas border border-border rounded text-primary"
                      />
                    </div>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={startNodeOverrides.scrollThenAction}
                        onChange={(e) =>
                          setStartNodeOverrides((o) => ({ ...o, scrollThenAction: e.target.checked }))
                        }
                      />
                      <span className="text-sm">Scroll then action</span>
                    </label>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'dashboard' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center flex-wrap gap-4">
              <h2 className="text-lg font-semibold">Running Batches</h2>
              <div className="flex items-center gap-4">
                <a
                  href="/reports/history"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:text-blue-300 text-sm flex items-center gap-1"
                >
                  View Report History
                </a>
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
                <a
                  href="/reports/history"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:text-blue-300 text-sm flex items-center gap-1"
                >
                  View Report History
                </a>
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
                        <td className="px-4 py-3">
                          <button
                            onClick={() => handleBatchIdClick(b.batchId)}
                            disabled={batchDetailLoading}
                            className="font-mono text-sm text-blue-400 hover:text-blue-300 hover:underline text-left"
                          >
                            {b.batchId.slice(0, 12)}...
                          </button>
                        </td>
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
