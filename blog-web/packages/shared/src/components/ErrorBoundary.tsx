import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { Home, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(): Partial<State> {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({
      error,
      errorInfo,
    });
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-[calc(100vh-100px)] items-center justify-center px-4 py-12">
          <div className="w-full max-w-md rounded-3xl border border-slate-300 bg-white px-6 py-10 text-center shadow-sm dark:border-slate-700 dark:bg-slate-900 sm:px-10">
            <div className="mb-5 flex justify-center">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400" aria-hidden>
                <span className="text-xl">!</span>
              </div>
            </div>

            <h1 className="mb-6 text-2xl font-bold tracking-tight text-slate-950 dark:text-white">页面暂时无法显示</h1>

            {this.state.error && (
              <details className="mb-6 text-left">
                <summary className="inline-flex min-h-11 cursor-pointer items-center rounded-xl text-sm font-medium text-slate-600 hover:text-brand-blue focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue dark:text-slate-300">
                  查看错误详情
                </summary>
                <div className="mt-3 max-h-40 overflow-auto rounded-2xl border border-slate-200 bg-slate-50 p-3 text-xs text-red-600 dark:border-slate-700 dark:bg-slate-950 dark:text-red-400">
                  <pre>{this.state.error.toString()}</pre>
                  {this.state.errorInfo && (
                    <pre className="mt-2">{this.state.errorInfo.componentStack}</pre>
                  )}
                </div>
              </details>
            )}

            <div className="flex justify-center gap-3">
              <button
                onClick={this.handleReset}
                className="flex min-h-11 items-center gap-2 rounded-xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-blue focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue dark:bg-white dark:text-slate-950 dark:hover:bg-blue-300"
              >
                <Home className="h-4 w-4" aria-hidden />
                返回首页
              </button>
              <button
                onClick={() => window.location.reload()}
                className="flex min-h-11 items-center gap-2 rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:border-brand-blue hover:text-brand-blue focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue dark:border-slate-700 dark:text-slate-200"
              >
                <RefreshCw className="h-4 w-4" aria-hidden />
                刷新页面
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
