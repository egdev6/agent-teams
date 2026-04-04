/**
 * Unit tests for useOptimisticAction hook
 *
 * Tests coverage:
 * - Success flow: optimistic update + backend confirmation
 * - Error flow: optimistic update + rollback on error
 * - Timeout flow: optimistic update + rollback on timeout
 * - Concurrent actions: multiple in-flight actions
 * - Unmount cleanup: no rollback when component unmounts
 */

import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ActionResponse } from './useOptimisticAction';
import { useOptimisticAction } from './useOptimisticAction';

// Mock vscode API - must be at top level for hoisting
vi.mock('@lib/vscode', () => ({
  vscode: {
    postMessage: vi.fn(),
  },
}));

import { vscode } from '@lib/vscode';

const mockPostMessage = vscode.postMessage as ReturnType<typeof vi.fn>;

// Test state type
interface TestState {
  count: number;
  name: string;
}

// Test request type with index signature
type TestRequest = Record<string, unknown> & {
  newCount: number;
  newName: string;
};

// Test response type
interface TestResponse {
  success: boolean;
  timestamp: number;
}

describe('useOptimisticAction', () => {
  let setState: ReturnType<typeof vi.fn>;
  const initialState: TestState = { count: 0, name: 'initial' };

  beforeEach(() => {
    setState = vi.fn((updater) => {
      // Simulate React setState behavior
      if (typeof updater === 'function') {
        return updater(initialState);
      }
      return updater;
    });
    mockPostMessage.mockClear();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('success flow', () => {
    it('applies optimistic update immediately', async () => {
      const { result } = renderHook(() =>
        useOptimisticAction<TestState, TestRequest, TestResponse>('testAction', setState),
      );

      act(() => {
        result.current((current) => ({ ...current, count: current.count + 1 }), {
          newCount: 1,
          newName: 'updated',
        });
      });

      // Check that setState was called with optimistic update
      expect(setState).toHaveBeenCalledWith(expect.any(Function));
      const updater = setState.mock.calls[0][0];
      const newState = updater(initialState);
      expect(newState.count).toBe(1);
    });

    it('sends message to backend with actionId', async () => {
      const { result } = renderHook(() =>
        useOptimisticAction<TestState, TestRequest, TestResponse>('testAction', setState),
      );

      act(() => {
        result.current((current) => ({ ...current, count: 1 }), {
          newCount: 1,
          newName: 'updated',
        });
      });

      expect(mockPostMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'testAction',
          actionId: expect.any(String),
          newCount: 1,
          newName: 'updated',
        }),
      );
    });

    it('resolves promise and calls onSuccess when backend responds with success', async () => {
      const onSuccess = vi.fn();
      const onError = vi.fn();

      const { result } = renderHook(() =>
        useOptimisticAction<TestState, TestRequest, TestResponse>('testAction', setState),
      );

      // Start action
      const promise = act(() =>
        result.current(
          (current) => ({ ...current, count: 1 }),
          { newCount: 1, newName: 'updated' },
          { onSuccess, onError },
        ),
      );

      // Extract actionId from postMessage call
      const actionId = mockPostMessage.mock.calls[0][0].actionId;

      // Simulate backend success response
      act(() => {
        const successMessage: ActionResponse<TestResponse> = {
          actionId,
          success: true,
          data: { success: true, timestamp: Date.now() },
        };
        window.dispatchEvent(new MessageEvent('message', { data: successMessage }));
      });

      // Wait for promise to resolve
      await act(async () => {
        await promise;
      });

      expect(onSuccess).toHaveBeenCalledWith({
        success: true,
        timestamp: expect.any(Number),
      });
      expect(onError).not.toHaveBeenCalled();
    });
  });

  describe('error flow', () => {
    it('rolls back optimistic update on backend error', async () => {
      const { result } = renderHook(() =>
        useOptimisticAction<TestState, TestRequest, TestResponse>('testAction', setState),
      );

      const promise = act(() =>
        result.current((current) => ({ ...current, count: 1 }), {
          newCount: 1,
          newName: 'updated',
        }),
      );

      const actionId = mockPostMessage.mock.calls[0][0].actionId;

      // Clear setState calls from optimistic update
      setState.mockClear();

      act(() => {
        const errorMessage: ActionResponse<TestResponse> = {
          actionId,
          success: false,
          error: 'Backend validation failed',
        };
        window.dispatchEvent(new MessageEvent('message', { data: errorMessage }));
      });

      // Wait for promise to reject
      await act(async () => {
        await expect(promise).rejects.toThrow('Backend validation failed');
      });

      // Should rollback by calling setState with snapshot
      expect(setState).toHaveBeenCalledWith(initialState);
    });

    it('calls onError callback on backend error', async () => {
      const onSuccess = vi.fn();
      const onError = vi.fn();

      const { result } = renderHook(() =>
        useOptimisticAction<TestState, TestRequest, TestResponse>('testAction', setState),
      );

      const promise = act(() =>
        result.current(
          (current) => ({ ...current, count: 1 }),
          { newCount: 1, newName: 'updated' },
          { onSuccess, onError },
        ),
      );

      const actionId = mockPostMessage.mock.calls[0][0].actionId;

      act(() => {
        const errorMessage: ActionResponse<TestResponse> = {
          actionId,
          success: false,
          error: 'Something went wrong',
        };
        window.dispatchEvent(new MessageEvent('message', { data: errorMessage }));
      });

      await act(async () => {
        await expect(promise).rejects.toThrow();
      });

      expect(onError).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Something went wrong',
          name: 'ActionError',
        }),
      );
      expect(onSuccess).not.toHaveBeenCalled();
    });
  });

  describe('timeout flow', () => {
    it('rolls back optimistic update on timeout', async () => {
      const { result } = renderHook(() =>
        useOptimisticAction<TestState, TestRequest, TestResponse>('testAction', setState, {
          timeout: 5000,
        }),
      );

      const promise = act(() =>
        result.current((current) => ({ ...current, count: 1 }), {
          newCount: 1,
          newName: 'updated',
        }),
      );

      // Clear setState calls from optimistic update
      setState.mockClear();

      // Fast-forward time to trigger timeout
      act(() => {
        vi.advanceTimersByTime(5000);
      });

      // Wait for promise to reject
      await act(async () => {
        await expect(promise).rejects.toThrow('Action timed out');
      });

      // Should rollback
      expect(setState).toHaveBeenCalledWith(initialState);
    });

    it('does not timeout if backend responds in time', async () => {
      const onError = vi.fn();

      const { result } = renderHook(() =>
        useOptimisticAction<TestState, TestRequest, TestResponse>('testAction', setState, {
          timeout: 5000,
        }),
      );

      const promise = act(() =>
        result.current(
          (current) => ({ ...current, count: 1 }),
          { newCount: 1, newName: 'updated' },
          { onError },
        ),
      );

      const actionId = mockPostMessage.mock.calls[0][0].actionId;

      // Advance time but not to timeout
      act(() => {
        vi.advanceTimersByTime(3000);
      });

      // Backend responds before timeout
      act(() => {
        const successMessage: ActionResponse<TestResponse> = {
          actionId,
          success: true,
          data: { success: true, timestamp: Date.now() },
        };
        window.dispatchEvent(new MessageEvent('message', { data: successMessage }));
      });

      await act(async () => {
        await promise;
      });

      // Should not call error callback
      expect(onError).not.toHaveBeenCalled();

      // Advance past timeout to ensure timeout was cleared
      act(() => {
        vi.advanceTimersByTime(3000);
      });

      expect(onError).not.toHaveBeenCalled();
    });
  });

  describe('concurrent actions', () => {
    it('handles multiple in-flight actions independently', async () => {
      const { result } = renderHook(() =>
        useOptimisticAction<TestState, TestRequest, TestResponse>('testAction', setState),
      );

      // Start two actions
      const promise1 = act(() =>
        result.current((current) => ({ ...current, count: 1 }), { newCount: 1, newName: 'first' }),
      );

      const promise2 = act(() =>
        result.current((current) => ({ ...current, count: 2 }), { newCount: 2, newName: 'second' }),
      );

      const actionId1 = mockPostMessage.mock.calls[0][0].actionId;
      const actionId2 = mockPostMessage.mock.calls[1][0].actionId;

      expect(actionId1).not.toBe(actionId2);

      // Resolve first action
      act(() => {
        window.dispatchEvent(
          new MessageEvent('message', {
            data: { actionId: actionId1, success: true, data: { success: true, timestamp: 1 } },
          }),
        );
      });

      await act(async () => {
        await promise1;
      });

      // Resolve second action
      act(() => {
        window.dispatchEvent(
          new MessageEvent('message', {
            data: { actionId: actionId2, success: true, data: { success: true, timestamp: 2 } },
          }),
        );
      });

      await act(async () => {
        await promise2;
      });

      // Both should complete successfully
      expect(true).toBe(true); // Promises resolved without error
    });

    it('handles out-of-order responses correctly', async () => {
      const { result } = renderHook(() =>
        useOptimisticAction<TestState, TestRequest, TestResponse>('testAction', setState),
      );

      const promise1 = act(() =>
        result.current((current) => ({ ...current, count: 1 }), { newCount: 1, newName: 'first' }),
      );

      const promise2 = act(() =>
        result.current((current) => ({ ...current, count: 2 }), { newCount: 2, newName: 'second' }),
      );

      const actionId1 = mockPostMessage.mock.calls[0][0].actionId;
      const actionId2 = mockPostMessage.mock.calls[1][0].actionId;

      // Resolve second action first
      act(() => {
        window.dispatchEvent(
          new MessageEvent('message', {
            data: { actionId: actionId2, success: true, data: { success: true, timestamp: 2 } },
          }),
        );
      });

      await act(async () => {
        await promise2;
      });

      // Then resolve first action
      act(() => {
        window.dispatchEvent(
          new MessageEvent('message', {
            data: { actionId: actionId1, success: true, data: { success: true, timestamp: 1 } },
          }),
        );
      });

      await act(async () => {
        await promise1;
      });

      // Both should complete successfully
      expect(true).toBe(true);
    });
  });

  describe('unmount cleanup', () => {
    it('clears all active actions on unmount', () => {
      const { result, unmount } = renderHook(() =>
        useOptimisticAction<TestState, TestRequest, TestResponse>('testAction', setState),
      );

      act(() => {
        result.current((current) => ({ ...current, count: 1 }), {
          newCount: 1,
          newName: 'updated',
        });
      });

      setState.mockClear();

      // Unmount component
      unmount();

      // Advance time to trigger timeout
      act(() => {
        vi.advanceTimersByTime(35000);
      });

      // Should not call setState after unmount (no rollback)
      expect(setState).not.toHaveBeenCalled();
    });
  });

  describe('edge cases', () => {
    it('ignores messages without actionId', async () => {
      const { result } = renderHook(() =>
        useOptimisticAction<TestState, TestRequest, TestResponse>('testAction', setState),
      );

      const promise = act(() =>
        result.current((current) => ({ ...current, count: 1 }), {
          newCount: 1,
          newName: 'updated',
        }),
      );

      setState.mockClear();

      // Send invalid message
      act(() => {
        window.dispatchEvent(
          new MessageEvent('message', {
            data: { success: true }, // Missing actionId
          }),
        );
      });

      // Should not rollback or resolve
      expect(setState).not.toHaveBeenCalled();

      // Send valid success
      const actionId = mockPostMessage.mock.calls[0][0].actionId;
      act(() => {
        window.dispatchEvent(
          new MessageEvent('message', {
            data: { actionId, success: true, data: { success: true, timestamp: 1 } },
          }),
        );
      });

      await act(async () => {
        await promise;
      });
    });

    it('ignores messages for unknown actionIds', async () => {
      const { result } = renderHook(() =>
        useOptimisticAction<TestState, TestRequest, TestResponse>('testAction', setState),
      );

      const promise = act(() =>
        result.current((current) => ({ ...current, count: 1 }), {
          newCount: 1,
          newName: 'updated',
        }),
      );

      setState.mockClear();

      // Send message with different actionId
      act(() => {
        window.dispatchEvent(
          new MessageEvent('message', {
            data: {
              actionId: 'unknown-action-id',
              success: true,
              data: { success: true, timestamp: 1 },
            },
          }),
        );
      });

      // Should not affect our action
      expect(setState).not.toHaveBeenCalled();

      // Send correct response
      const actionId = mockPostMessage.mock.calls[0][0].actionId;
      act(() => {
        window.dispatchEvent(
          new MessageEvent('message', {
            data: { actionId, success: true, data: { success: true, timestamp: 1 } },
          }),
        );
      });

      await act(async () => {
        await promise;
      });
    });
  });
});
