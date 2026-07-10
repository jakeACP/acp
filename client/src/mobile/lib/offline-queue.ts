/**
 * offline-queue.ts — Lightweight localStorage-backed offline retry queue.
 *
 * When a "create" mutation fails because the device is offline, callers can
 * enqueue the operation here.  The queue is flushed automatically whenever
 * the device comes back online (via the 'online' DOM event or Capacitor
 * Network plugin).
 *
 * Usage:
 *   import { OfflineQueue } from '@/mobile/lib/offline-queue';
 *
 *   // Enqueue a failed operation
 *   OfflineQueue.enqueue({ url: '/api/posts', method: 'POST', body: {...} });
 *
 *   // Or use the hook, which handles flushing automatically
 *   const { pending, flush, enqueue } = useOfflineQueue();
 */

import { apiRequest } from '@/lib/queryClient';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface QueuedOperation {
  id: string;
  url: string;
  method: 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: Record<string, unknown>;
  createdAt: number;
  /** Human-readable label for UI display */
  label?: string;
  /** Number of retry attempts so far */
  attempts: number;
}

// ── Storage key ───────────────────────────────────────────────────────────────

const STORAGE_KEY = 'acp_offline_queue';
const MAX_ATTEMPTS = 5;

// ── Core queue functions ──────────────────────────────────────────────────────

function _readQueue(): QueuedOperation[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function _writeQueue(ops: QueuedOperation[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ops));
  } catch {}
}

function _generateId(): string {
  return `oq_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export const OfflineQueue = {
  /**
   * Add an operation to the queue.
   * Returns the operation id.
   */
  enqueue(op: Omit<QueuedOperation, 'id' | 'createdAt' | 'attempts'>): string {
    const queue = _readQueue();
    const id = _generateId();
    queue.push({ ...op, id, createdAt: Date.now(), attempts: 0 });
    _writeQueue(queue);
    _notifyListeners();
    return id;
  },

  /**
   * Remove a specific operation by id.
   */
  dequeue(id: string) {
    const queue = _readQueue().filter(op => op.id !== id);
    _writeQueue(queue);
    _notifyListeners();
  },

  /**
   * Return all pending operations.
   */
  getAll(): QueuedOperation[] {
    return _readQueue();
  },

  /**
   * Attempt to execute all queued operations in order.
   * Removes each operation if it succeeds; increments attempts on failure.
   * Drops operations that have exceeded MAX_ATTEMPTS.
   */
  async flush(): Promise<{ succeeded: number; failed: number }> {
    const queue = _readQueue();
    if (queue.length === 0) return { succeeded: 0, failed: 0 };

    let succeeded = 0;
    let failed = 0;
    const remaining: QueuedOperation[] = [];

    for (const op of queue) {
      if (op.attempts >= MAX_ATTEMPTS) continue; // drop
      try {
        await apiRequest(op.url, op.method, op.body);
        succeeded++;
      } catch {
        failed++;
        remaining.push({ ...op, attempts: op.attempts + 1 });
      }
    }

    _writeQueue(remaining);
    _notifyListeners();
    return { succeeded, failed };
  },

  /**
   * Clear all queued operations (e.g. on sign-out).
   */
  clear() {
    _writeQueue([]);
    _notifyListeners();
  },

  count(): number {
    return _readQueue().length;
  },
};

// ── Change listeners (for the hook) ──────────────────────────────────────────

type ChangeListener = () => void;
const _listeners: ChangeListener[] = [];

function _notifyListeners() {
  _listeners.forEach(l => l());
}

export function _subscribeToQueueChanges(listener: ChangeListener): () => void {
  _listeners.push(listener);
  return () => {
    const i = _listeners.indexOf(listener);
    if (i !== -1) _listeners.splice(i, 1);
  };
}

// ── Automatic online flush ────────────────────────────────────────────────────

let _onlineListenerAdded = false;

/**
 * Start watching the network.  When the device comes back online, flush the
 * queue automatically.  Safe to call multiple times (sets up listener once).
 */
export function startOfflineWatcher() {
  if (_onlineListenerAdded) return;
  _onlineListenerAdded = true;

  const doFlush = () => {
    if (OfflineQueue.count() > 0) {
      OfflineQueue.flush().catch(() => {});
    }
  };

  // Web 'online' event
  window.addEventListener('online', doFlush);

  // Capacitor Network plugin (if available)
  import('@capacitor/network').then(({ Network }) => {
    Network.addListener('networkStatusChange', (status) => {
      if (status.connected) doFlush();
    });
  }).catch(() => {});
}
