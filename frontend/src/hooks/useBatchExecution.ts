import { useEffect, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import {
  BatchStatusResponse,
  BatchHistoryResponse,
  WorkflowFileInfo,
  Workflow,
  StartNodeOverrides,
  ScreenshotConfig,
  ReportConfig,
} from '@automflows/shared';
import { getBackendPort, getBackendBaseUrl } from '../utils/getBackendPort';

export interface ExecuteBatchOptions {
  workflows?: Workflow[];
  workflowFileNames?: string[];
  folderPath?: string;
  files?: File[];
  workers?: number;
  outputPath?: string;
  recursive?: boolean;
  pattern?: string;
  traceLogs?: boolean;
  recordSession?: boolean;
  screenshotConfig?: ScreenshotConfig;
  reportConfig?: ReportConfig;
  startNodeOverrides?: StartNodeOverrides;
  batchPriority?: number;
}

export interface ExecuteBatchResponse {
  batchId: string;
  executionMode: 'parallel';
  sourceType: 'folder' | 'files' | 'workflows';
  folderPath?: string;
  totalWorkflows: number;
  validWorkflows: number;
  invalidWorkflows: number;
  validationErrors?: Array<{ fileName: string; errors: string[] }>;
  executions?: Array<{
    executionId: string;
    workflowFileName: string;
    workflowPath?: string;
    status: string;
    workflowErrors?: string[];
  }>;
}

export interface ScanFolderOptions {
  recursive?: boolean;
  pattern?: string;
}

// Module-level socket for batch events (shared across hook instances)
let batchSocket: Socket | null = null;
let batchSocketPort: number | null = null;

async function getPort(): Promise<number> {
  return getBackendPort();
}

export function useBatchExecution() {
  const [port, setPort] = useState<number | null>(null);
  const [runningBatches, setRunningBatches] = useState<BatchStatusResponse[]>([]);
  const [batchHistory, setBatchHistory] = useState<BatchHistoryResponse | null>(null);

  useEffect(() => {
    let mounted = true;
    getPort().then((p) => {
      if (!mounted) return;
      setPort(p);

      if (!batchSocket || !batchSocket.connected || batchSocketPort !== p) {
        if (batchSocket) {
          batchSocket.disconnect();
        }
        batchSocket = io(getBackendBaseUrl(p), { transports: ['websocket'] });
        batchSocketPort = p;

        batchSocket.on('batch-start', (payload: { batchId: string; totalWorkflows: number }) => {
          setRunningBatches((prev) => {
            const exists = prev.some((b) => b.batchId === payload.batchId);
            if (exists) return prev;
            return [
              ...prev,
              {
                batchId: payload.batchId,
                status: 'running' as const,
                sourceType: 'workflows' as const,
                totalWorkflows: payload.totalWorkflows,
                completed: 0,
                running: 0,
                queued: payload.totalWorkflows,
                failed: 0,
                startTime: Date.now(),
                executions: [],
              },
            ];
          });
        });

        batchSocket.on('batch-complete', (payload: { batchId: string; status: string; completed: number; failed: number }) => {
          setRunningBatches((prev) =>
            prev.filter((b) => b.batchId !== payload.batchId)
          );
        });
      }
    });
    return () => {
      mounted = false;
    };
  }, []);

  const api = useCallback(
    async (path: string, options?: RequestInit) => {
      const p = port ?? (await getPort());
      const url = `${getBackendBaseUrl(p)}/api/workflows${path}`;
      const res = await fetch(url, options);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || err.error || `Request failed: ${res.status}`);
      }
      return res.json();
    },
    [port]
  );

  const scanFolder = useCallback(
    async (folderPath: string, options?: ScanFolderOptions): Promise<WorkflowFileInfo[]> => {
      const params = new URLSearchParams({ folderPath });
      if (options?.recursive) params.set('recursive', 'true');
      if (options?.pattern) params.set('pattern', options.pattern);
      return api(`/scan?${params}`);
    },
    [api]
  );

  const getBatchStatus = useCallback(
    async (batchId: string): Promise<BatchStatusResponse> => {
      return api(`/execution/batch/${batchId}`);
    },
    [api]
  );

  const executeBatch = useCallback(
    async (opts: ExecuteBatchOptions): Promise<ExecuteBatchResponse> => {
      const p = port ?? (await getPort());
      const baseUrl = getBackendBaseUrl(p);

      if (opts.files && opts.files.length > 0) {
        const form = new FormData();
        opts.files.forEach((f) => form.append('files', f));
        form.append('workers', String(opts.workers ?? 4));
        form.append('traceLogs', String(opts.traceLogs ?? false));
        form.append('recordSession', String(opts.recordSession ?? false));
        form.append('outputPath', opts.outputPath ?? './output');
        form.append('recursive', String(opts.recursive ?? false));
        form.append('pattern', opts.pattern ?? '*.json');
        if (opts.screenshotConfig) form.append('screenshotConfig', JSON.stringify(opts.screenshotConfig));
        if (opts.reportConfig) form.append('reportConfig', JSON.stringify(opts.reportConfig));
        if (opts.startNodeOverrides) form.append('startNodeOverrides', JSON.stringify(opts.startNodeOverrides));

        const res = await fetch(`${baseUrl}/api/workflows/execute`, {
          method: 'POST',
          body: form,
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.message || err.error || `Request failed: ${res.status}`);
        }
        const result = await res.json();
        if (result.batchId) {
          const status = await getBatchStatus(result.batchId).catch(() => null);
          if (status) {
            setRunningBatches((prev) => {
              const exists = prev.some((b) => b.batchId === result.batchId);
              if (exists) return prev;
              return [...prev, status];
            });
          }
        }
        return result;
      }

      const body: Record<string, unknown> = {
        executionMode: 'parallel',
        workers: opts.workers ?? 4,
        outputPath: opts.outputPath ?? './output',
        recursive: opts.recursive ?? false,
        pattern: opts.pattern ?? '*.json',
        traceLogs: opts.traceLogs ?? false,
        recordSession: opts.recordSession ?? false,
        batchPriority: opts.batchPriority ?? 0,
      };
      if (opts.screenshotConfig) body.screenshotConfig = opts.screenshotConfig;
      if (opts.reportConfig) body.reportConfig = opts.reportConfig;
      if (opts.startNodeOverrides) body.startNodeOverrides = opts.startNodeOverrides;

      if (opts.folderPath) {
        body.folderPath = opts.folderPath;
      } else if (opts.workflows && opts.workflows.length > 0) {
        body.workflows = opts.workflows;
        if (opts.workflowFileNames?.length) body.workflowFileNames = opts.workflowFileNames;
      } else {
        throw new Error('Provide workflows, folderPath, or files');
      }

      const result = await api('/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (result.batchId) {
        const status = await getBatchStatus(result.batchId).catch(() => null);
        if (status) {
          setRunningBatches((prev) => {
            const exists = prev.some((b) => b.batchId === result.batchId);
            if (exists) return prev;
            return [...prev, status];
          });
        }
      }
      return result;
    },
    [api, port, getBatchStatus]
  );

  const getBatchHistory = useCallback(
    async (params?: { limit?: number; offset?: number; status?: string }): Promise<BatchHistoryResponse> => {
      const search = new URLSearchParams();
      if (params?.limit != null) search.set('limit', String(params.limit));
      if (params?.offset != null) search.set('offset', String(params.offset));
      if (params?.status) search.set('status', params.status);
      const q = search.toString();
      return api(`/executions/batches${q ? `?${q}` : ''}`);
    },
    [api]
  );

  const stopBatch = useCallback(
    async (batchId: string) => {
      return api(`/execution/batch/${batchId}/stop`, { method: 'POST' });
    },
    [api]
  );

  const stopAll = useCallback(async () => {
    return api('/execution/stop-all', { method: 'POST' });
  }, [api]);

  const clearBatchHistory = useCallback(async () => {
    return api('/executions/batches/clear', { method: 'DELETE' });
  }, [api]);

  const refreshRunningBatches = useCallback(async () => {
    if (!port) return;
    const history = await getBatchHistory({ limit: 50, offset: 0 });
    const running = history.batches.filter((b) => b.status === 'running');
    if (running.length > 0) {
      const statuses = await Promise.all(running.map((b) => getBatchStatus(b.batchId)));
      setRunningBatches(statuses);
    } else {
      setRunningBatches([]);
    }
  }, [port, getBatchHistory, getBatchStatus]);

  return {
    port,
    runningBatches,
    batchHistory,
    scanFolder,
    executeBatch,
    getBatchStatus,
    getBatchHistory,
    stopBatch,
    stopAll,
    clearBatchHistory,
    refreshRunningBatches,
    setRunningBatches,
    setBatchHistory,
  };
}
