/**
 * React 19 Hooks Utilities
 * Wrappers and utilities for React 19 features
 */

import React, { use, useOptimistic as useReactOptimistic, useTransition } from 'react';

/**
 * useOptimistic hook for optimistic UI updates
 * Wrapper around React 19's useOptimistic with better typing
 */
export function useOptimistic<T>(
  initialState: T,
  updateFn?: (currentState: T, optimisticValue: T) => T,
) {
  return useReactOptimistic(initialState, updateFn || ((_state: T, newState: T) => newState));
}

/**
 * useFormStatus replacement for React 19
 * Uses useTransition to track form submission state
 */
export function useFormStatus() {
  const [isPending] = useTransition();

  return {
    pending: isPending,
    data: null as FormData | null,
    method: null as string | null,
    action: null as string | null,
  };
}

/**
 * useActionState for form actions with React 19
 * Manages async action state with transitions
 */
export function useActionState<TState, TPayload>(
  action: (state: TState, payload: TPayload) => Promise<TState>,
  initialState: TState,
): [TState, (payload: TPayload) => void, boolean] {
  const [isPending, startTransition] = useTransition();
  const [state, setState] = React.useState(initialState);

  const dispatch = React.useCallback(
    (payload: TPayload) => {
      startTransition(async () => {
        const newState = await action(state, payload);
        setState(newState);
      });
    },
    [action, state],
  );

  return [state, dispatch, isPending];
}

/**
 * Type-safe wrapper for React 19 use() hook
 */
export { use };

/**
 * Async data fetcher with Suspense support
 */
export function createResource<T>(promise: Promise<T>) {
  let status: 'pending' | 'success' | 'error' = 'pending';
  let result: T;
  let error: Error;

  const suspender = promise.then(
    (data) => {
      status = 'success';
      result = data;
    },
    (err) => {
      status = 'error';
      error = err;
    },
  );

  return {
    read(): T {
      if (status === 'pending') {
        throw suspender;
      } else if (status === 'error') {
        throw error;
      }
      return result;
    },
  };
}

/**
 * Component for lazy data loading with Suspense
 * Note: AsyncBoundary is exported from a separate .tsx file
 * to avoid JSX in .ts files
 */
export { AsyncBoundary } from './AsyncBoundary';
