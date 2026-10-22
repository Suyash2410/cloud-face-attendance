import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an unhandled error:', error, errorInfo);
    this.setState({ error, errorInfo });
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.href = '/';
  };

  private handleReload = () => {
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen bg-paper flex items-center justify-center p-6 text-ink">
          <div className="max-w-lg w-full bg-surface border border-hairline rounded-lg p-6 sm:p-8 editorial-shadow space-y-5">
            <div className="flex items-center gap-3 pb-3 border-b border-hairline">
              <div className="w-10 h-10 rounded-full bg-brick/15 flex items-center justify-center text-brick">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h2 className="font-serif font-bold text-xl text-ink">View Rendering Error</h2>
                <p className="text-xs text-muted font-mono">Haazri Safe-Mode Recovery</p>
              </div>
            </div>

            <p className="text-sm text-ink/80">
              An unexpected render issue occurred while rendering this screen. Your AWS data and session state remain safe.
            </p>

            {this.state.error && (
              <div className="p-3 bg-paper rounded border border-hairline text-xs font-mono text-brick break-all">
                {this.state.error.message || String(this.state.error)}
              </div>
            )}

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                type="button"
                onClick={this.handleReload}
                className="inline-flex items-center gap-2 px-4 py-2 bg-marigold text-ink rounded font-serif font-bold text-xs hover:brightness-105 editorial-shadow transition-all"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Reload Screen
              </button>
              <button
                type="button"
                onClick={this.handleReset}
                className="inline-flex items-center gap-2 px-4 py-2 border border-hairline rounded text-xs font-medium text-ink hover:bg-surface-hover transition-all"
              >
                <Home className="w-3.5 h-3.5" /> Return to Dashboard
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
