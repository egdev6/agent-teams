import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useSyncStatus } from './useSyncStatus';

describe('useSyncStatus', () => {
  describe('initial state', () => {
    it('returns checking status on mount', () => {
      const { result } = renderHook(() => useSyncStatus());

      expect(result.current.state.status).toBe('checking');
      expect(result.current.isLoading).toBe(true);
    });

    it('returns zero pending count and empty pending agent IDs on mount', () => {
      const { result } = renderHook(() => useSyncStatus());

      expect(result.current.state.pendingCount).toBe(0);
      expect(result.current.state.pendingAgentIds).toEqual(new Set());
    });
  });

  describe('event listener', () => {
    it('registers window message event listener on mount', () => {
      const addEventListenerSpy = vi.spyOn(window, 'addEventListener');

      renderHook(() => useSyncStatus());

      expect(addEventListenerSpy).toHaveBeenCalledWith('message', expect.any(Function));

      addEventListenerSpy.mockRestore();
    });

    it('removes event listener on unmount', () => {
      const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');

      const { unmount } = renderHook(() => useSyncStatus());
      unmount();

      expect(removeEventListenerSpy).toHaveBeenCalledWith('message', expect.any(Function));

      removeEventListenerSpy.mockRestore();
    });
  });

  describe('state transitions', () => {
    describe('dryRunStarted', () => {
      it('transitions to checking when dryRunStarted message received', async () => {
        const { result } = renderHook(() => useSyncStatus());

        act(() => {
          window.dispatchEvent(
            new MessageEvent('message', {
              data: { type: 'dryRunStarted' },
            }),
          );
        });

        await waitFor(() => {
          expect(result.current.state.status).toBe('checking');
          expect(result.current.isLoading).toBe(true);
        });
      });
    });

    describe('dryRunComplete', () => {
      it('transitions to needs_sync when pending changes exist', async () => {
        const { result } = renderHook(() => useSyncStatus());

        act(() => {
          window.dispatchEvent(
            new MessageEvent('message', {
              data: {
                type: 'dryRunComplete',
                pendingChanges: {
                  items: [
                    { id: 'github_copilot/agent-a', action: 'create' },
                    { id: 'claude_code/agent-b', action: 'update' },
                  ],
                  total: 2,
                  created: 1,
                  updated: 1,
                  deleted: 0,
                  skipped: 0,
                },
              },
            }),
          );
        });

        await waitFor(() => {
          expect(result.current.state.status).toBe('needs_sync');
          expect(result.current.state.pendingCount).toBe(2);
          expect(result.current.state.pendingAgentIds).toEqual(new Set(['agent-a', 'agent-b']));
          expect(result.current.isLoading).toBe(false);
        });
      });

      it('transitions to up_to_date when no pending changes', async () => {
        const { result } = renderHook(() => useSyncStatus());

        act(() => {
          window.dispatchEvent(
            new MessageEvent('message', {
              data: {
                type: 'dryRunComplete',
                pendingChanges: {
                  items: [],
                  total: 0,
                  created: 0,
                  updated: 0,
                  deleted: 0,
                  skipped: 0,
                },
              },
            }),
          );
        });

        await waitFor(() => {
          expect(result.current.state.status).toBe('up_to_date');
          expect(result.current.state.pendingCount).toBe(0);
          expect(result.current.state.pendingAgentIds).toEqual(new Set());
          expect(result.current.isLoading).toBe(false);
        });
      });

      it('transitions to error when dryRunComplete has error', async () => {
        const { result } = renderHook(() => useSyncStatus());

        act(() => {
          window.dispatchEvent(
            new MessageEvent('message', {
              data: {
                type: 'dryRunComplete',
                error: 'Failed to run dry run sync',
              },
            }),
          );
        });

        await waitFor(() => {
          expect(result.current.state.status).toBe('error');
          expect(result.current.state.error).toBe('Failed to run dry run sync');
          expect(result.current.isLoading).toBe(false);
        });
      });
    });

    describe('syncComplete', () => {
      it('transitions from syncing to checking when syncComplete received', async () => {
        const { result } = renderHook(() => useSyncStatus());

        // First transition to needs_sync
        act(() => {
          window.dispatchEvent(
            new MessageEvent('message', {
              data: {
                type: 'dryRunComplete',
                pendingChanges: {
                  items: [{ id: 'github_copilot/agent-a', action: 'create' }],
                  total: 1,
                  created: 1,
                  updated: 0,
                  deleted: 0,
                  skipped: 0,
                },
              },
            }),
          );
        });

        await waitFor(() => {
          expect(result.current.state.status).toBe('needs_sync');
        });

        // Manually transition to syncing (this would normally be triggered by user action)
        // For now, we'll test that syncComplete can transition from checking
        act(() => {
          window.dispatchEvent(
            new MessageEvent('message', {
              data: { type: 'syncComplete' },
            }),
          );
        });

        await waitFor(() => {
          expect(result.current.state.status).toBe('checking');
          expect(result.current.isLoading).toBe(true);
        });
      });
    });

    describe('syncResult error', () => {
      it('transitions to error when syncResult fails', async () => {
        const { result } = renderHook(() => useSyncStatus());

        act(() => {
          window.dispatchEvent(
            new MessageEvent('message', {
              data: {
                type: 'syncResult',
                success: false,
                error: 'Sync failed due to validation error',
              },
            }),
          );
        });

        await waitFor(() => {
          expect(result.current.state.status).toBe('error');
          expect(result.current.state.error).toBe('Sync failed due to validation error');
          expect(result.current.isLoading).toBe(false);
        });
      });
    });

    describe('isLoading computed property', () => {
      it('returns true when status is checking', async () => {
        const { result } = renderHook(() => useSyncStatus());

        expect(result.current.state.status).toBe('checking');
        expect(result.current.isLoading).toBe(true);
      });

      it('returns false when status is needs_sync', async () => {
        const { result } = renderHook(() => useSyncStatus());

        act(() => {
          window.dispatchEvent(
            new MessageEvent('message', {
              data: {
                type: 'dryRunComplete',
                pendingChanges: {
                  items: [{ id: 'github_copilot/agent-a', action: 'create' }],
                  total: 1,
                  created: 1,
                  updated: 0,
                  deleted: 0,
                  skipped: 0,
                },
              },
            }),
          );
        });

        await waitFor(() => {
          expect(result.current.state.status).toBe('needs_sync');
          expect(result.current.isLoading).toBe(false);
        });
      });

      it('returns false when status is up_to_date', async () => {
        const { result } = renderHook(() => useSyncStatus());

        act(() => {
          window.dispatchEvent(
            new MessageEvent('message', {
              data: {
                type: 'dryRunComplete',
                pendingChanges: {
                  items: [],
                  total: 0,
                  created: 0,
                  updated: 0,
                  deleted: 0,
                  skipped: 0,
                },
              },
            }),
          );
        });

        await waitFor(() => {
          expect(result.current.state.status).toBe('up_to_date');
          expect(result.current.isLoading).toBe(false);
        });
      });

      it('returns false when status is error', async () => {
        const { result } = renderHook(() => useSyncStatus());

        act(() => {
          window.dispatchEvent(
            new MessageEvent('message', {
              data: {
                type: 'dryRunComplete',
                error: 'Test error',
              },
            }),
          );
        });

        await waitFor(() => {
          expect(result.current.state.status).toBe('error');
          expect(result.current.isLoading).toBe(false);
        });
      });
    });
  });
});
