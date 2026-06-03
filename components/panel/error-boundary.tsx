'use client';

import { Component } from 'react';

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-[#0d1117] text-gray-300 p-8">
          <div className="max-w-lg text-center space-y-4">
            <div className="text-5xl mb-2">⚠️</div>
            <h2 className="text-xl font-semibold text-red-400">Something went wrong</h2>
            <p className="text-sm text-gray-500 font-mono bg-[#161b22] p-3 rounded border border-[#30363d] break-all">
              {this.state.error?.message}
            </p>
            <button
              onClick={() => { this.setState({ hasError: false, error: null }); window.location.reload(); }}
              className="px-4 py-2 bg-[#238636] hover:bg-[#2ea043] text-white rounded-lg text-sm transition-colors"
            >
              Reload page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
