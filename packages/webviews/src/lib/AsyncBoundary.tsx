/**
 * AsyncBoundary Component
 * Error boundary with Suspense support for async data loading
 */

import React from 'react';

interface AsyncBoundaryProps {
  children: React.ReactNode;
  fallback: React.ReactNode;
  errorFallback?: (error: Error) => React.ReactNode;
}

interface AsyncBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class AsyncBoundary extends React.Component<AsyncBoundaryProps, AsyncBoundaryState> {
  constructor(props: AsyncBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): AsyncBoundaryState {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      if (this.props.errorFallback && this.state.error) {
        return this.props.errorFallback(this.state.error);
      }
      return (
        <div className="p-4 text-center text-red-500">
          Something went wrong: {this.state.error?.message}
        </div>
      );
    }

    return <React.Suspense fallback={this.props.fallback}>{this.props.children}</React.Suspense>;
  }
}
