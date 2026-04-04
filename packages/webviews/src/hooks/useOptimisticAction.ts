/**
 * useOptimisticAction Hook
 *
 * Provides optimistic UI updates with automatic rollback on error/timeout.
 * Manages action lifecycle: idle → pending → success | error | timeout
 *
 * Usage:
 * ```ts
 * const performAction = useOptimisticAction<TState, TRequest, TResponse>(
 *   'messageType',
 *   setState,
 *   { timeout: 30000 }
 * );
 *
 * await performAction(
 *   (current) => ({ ...current, newValue }),
 *   { payload: 'data' },
 *   {
 *     onSuccess: (response) => console.log('Backend confirmed'),
 *     onError: (error) => console.error('Failed', error)
 *   }
 * );
 * ```
 */

import { vscode } from '@lib/vscode';
import { useCallback, useEffect, useRef } from 'react';

// ── Types ──────────────────────────────────────────────────────────────────

/**
 * Action lifecycle state
 */
type ActionStatus = 'pending' | 'success' | 'error' | 'timeout';

/**
 * Internal context for tracking an in-flight action
 */
interface ActionContext<TState, TResponse> {
  actionId: string;
  snapshot: TState;
  timeoutId: NodeJS.Timeout;
  startTime: number;
  cleanup: () => void;
  status: ActionStatus;
  resolve: () => void;
  reject: (error: Error) => void;
  callbacks: ActionCallbacks<TResponse>;
}

/**
 * Options for configuring the hook behavior
 */
export interface UseOptimisticActionOptions {
  /**
   * Timeout in milliseconds (default: 30000)
   */
  timeout?: number;
}

/**
 * Callbacks for action lifecycle events
 */
export interface ActionCallbacks<TResponse> {
  /**
   * Called when backend confirms success
   */
  onSuccess?: (response: TResponse) => void;

  /**
   * Called on backend error or timeout
   */
  onError?: (error: Error) => void;
}

/**
 * Message sent to backend with unique action ID
 */
export type ActionRequest<TRequest> = TRequest & {
  actionId: string;
  type: string;
};

/**
 * Expected backend response format
 */
export interface ActionResponse<TResponse> {
  actionId: string;
  success?: boolean;
  error?: string;
  data?: TResponse;
}

// ── Utilities ──────────────────────────────────────────────────────────────

/**
 * Create deep clone of state using structuredClone with JSON fallback
 */
function cloneState<T>(state: T): T {
  try {
    // Try structuredClone first (faster, handles more types)
    if (typeof structuredClone !== 'undefined') {
      return structuredClone(state);
    }
  } catch {
    // Fallback to JSON clone
  }

  // JSON fallback (less robust but widely supported)
  try {
    return JSON.parse(JSON.stringify(state)) as T;
  } catch (error) {
    console.error('[useOptimisticAction] Failed to clone state:', error);
    throw new Error('State must be serializable for optimistic updates');
  }
}

/**
 * Generate UUID v4 for action tracking
 */
function generateActionId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  // Fallback UUID v4 implementation
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// ── Hook ───────────────────────────────────────────────────────────────────

/**
 * Hook for optimistic UI updates with automatic rollback
 *
 * @template TState - Type of the state being updated
 * @template TRequest - Type of the request payload sent to backend
 * @template TResponse - Type of the response data from backend
 *
 * @param messageType - The message type for postMessage (e.g., 'saveProfile')
 * @param setState - React setState function for the optimistic state
 * @param options - Configuration options (timeout, etc.)
 *
 * @returns Function to perform an optimistic action
 */
export function useOptimisticAction<TState, TRequest extends Record<string, unknown>, TResponse>(
  messageType: string,
  setState: React.Dispatch<React.SetStateAction<TState>>,
  options: UseOptimisticActionOptions = {},
) {
  const { timeout = 30000 } = options;

  // Track all in-flight actions (supports concurrent actions)
  const activeActionsRef = useRef<Map<string, ActionContext<TState, TResponse>>>(new Map());

  // Track if component is mounted to prevent state updates after unmount
  const isMountedRef = useRef(true);

  // ── Message Listener ─────────────────────────────────────────────────────

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const message = event.data as ActionResponse<TResponse>;

      // Validate message structure
      if (!message || typeof message !== 'object' || !message.actionId) {
        return;
      }

      const { actionId, success, error: errorMessage, data } = message;
      const context = activeActionsRef.current.get(actionId);

      // Ignore messages for unknown actions
      if (!context) {
        return;
      }

      // Clean up timeout
      clearTimeout(context.timeoutId);
      context.cleanup();

      if (success) {
        // Success: keep optimistic update and resolve promise
        context.status = 'success';
        context.callbacks.onSuccess?.(data as TResponse);
        context.resolve();
      } else {
        // Error: rollback state and reject promise
        context.status = 'error';

        if (isMountedRef.current) {
          // Rollback to snapshot
          setState(context.snapshot);
        }

        const error = new Error(errorMessage || 'Action failed');
        error.name = 'ActionError';
        context.callbacks.onError?.(error);
        context.reject(error);
      }

      // Remove from active actions
      activeActionsRef.current.delete(actionId);
    };

    window.addEventListener('message', handleMessage);

    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, [setState]);

  // ── Cleanup on Unmount ───────────────────────────────────────────────────

  useEffect(() => {
    return () => {
      isMountedRef.current = false;

      // Clear all active actions without rollback (component is gone)
      for (const context of activeActionsRef.current.values()) {
        clearTimeout(context.timeoutId);
        context.cleanup();
      }
      activeActionsRef.current.clear();
    };
  }, []);

  // ── Perform Action ───────────────────────────────────────────────────────

  const performAction = useCallback(
    async (
      optimisticUpdate: (current: TState) => TState,
      request: TRequest,
      callbacks: ActionCallbacks<TResponse> = {},
    ): Promise<void> => {
      return new Promise<void>((resolve, reject) => {
        const actionId = generateActionId();

        // Create snapshot before optimistic update
        let snapshot: TState | undefined;
        setState((current) => {
          snapshot = cloneState(current);
          return optimisticUpdate(current);
        });

        if (snapshot === undefined) {
          reject(new Error('Failed to create snapshot'));
          return;
        }

        // Create timeout handler
        const timeoutId = setTimeout(() => {
          const context = activeActionsRef.current.get(actionId);
          if (!context || !isMountedRef.current) return;

          // Rollback on timeout
          context.status = 'timeout';
          setState(context.snapshot);
          activeActionsRef.current.delete(actionId);
          context.cleanup();

          const timeoutError = new Error(`Action timed out after ${timeout}ms`);
          timeoutError.name = 'TimeoutError';
          callbacks.onError?.(timeoutError);
          reject(timeoutError);
        }, timeout);

        // Create cleanup function
        const cleanup = () => {
          clearTimeout(timeoutId);
        };

        // Register action
        const context: ActionContext<TState, TResponse> = {
          actionId,
          snapshot,
          timeoutId,
          startTime: Date.now(),
          cleanup,
          status: 'pending',
          resolve,
          reject,
          callbacks,
        };
        activeActionsRef.current.set(actionId, context);

        // Send message to backend
        vscode.postMessage({
          type: messageType,
          actionId,
          ...request,
        } as any);
      });
    },
    [messageType, setState, timeout],
  );

  return performAction;
}
