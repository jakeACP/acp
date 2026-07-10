/**
 * NativeErrorBoundary — React error boundary tuned for the Capacitor mobile app.
 *
 * Catches render/lifecycle errors below it in the tree and shows a
 * mobile-friendly "Something went wrong" screen with a Retry button.
 * On native iOS, errors are also logged to the console for Crashlytics pickup.
 *
 * Usage:
 *   <NativeErrorBoundary>
 *     <MobileApp />
 *   </NativeErrorBoundary>
 *
 * For per-route boundaries wrap individual page components.
 */

import { Component, type ReactNode, type ErrorInfo } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  /** Optional fallback override */
  fallback?: ReactNode;
  /** Called when an error is caught — useful for crash reporting */
  onError?: (error: Error, info: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class NativeErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    this.setState({ errorInfo: info });

    // Log for native crash-reporter (Crashlytics picks up console.error on iOS)
    console.error('[NativeErrorBoundary] Caught error:', error.message, info.componentStack);

    // Call optional external reporter
    this.props.onError?.(error, info);
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  private handleReload = () => {
    window.location.href = '/mobile';
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    if (this.props.fallback) return this.props.fallback;

    return (
      <div
        className="flex flex-col items-center justify-center min-h-screen bg-[#0a0c10] px-8 text-center"
        data-testid="native-error-boundary"
      >
        <div className="w-16 h-16 rounded-full bg-red-500/15 flex items-center justify-center mb-6">
          <AlertTriangle className="w-8 h-8 text-red-400" />
        </div>

        <h1 className="text-white font-bold text-xl mb-2">Something went wrong</h1>
        <p className="text-white/50 text-sm leading-relaxed mb-8 max-w-xs">
          The app hit an unexpected error. Your data is safe — tap Retry to
          reload this screen.
        </p>

        {/* Show abbreviated error message in development */}
        {import.meta.env.DEV && this.state.error && (
          <div className="bg-red-900/30 border border-red-500/30 rounded-xl px-4 py-3 mb-6 w-full text-left">
            <p className="text-red-300 text-xs font-mono break-all">
              {this.state.error.message}
            </p>
          </div>
        )}

        <div className="flex flex-col gap-3 w-full max-w-xs">
          <button
            onClick={this.handleRetry}
            className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-semibold py-3 rounded-2xl transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Retry
          </button>
          <button
            onClick={this.handleReload}
            className="text-white/40 text-sm py-2 hover:text-white/60 transition-colors"
          >
            Go to home screen
          </button>
        </div>
      </div>
    );
  }
}
