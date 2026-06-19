"use client";

import { Component, type ReactNode, type ErrorInfo } from "react";
import { GENERIC_ERROR_MESSAGE } from "@/lib/log-error";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
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

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error(JSON.stringify({
      timestamp: new Date().toISOString(),
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      context: "ErrorBoundary",
    }));
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      return (
        <div className="flex flex-col items-center justify-center py-20 text-center animate-fade-in">
          <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-red-100 dark:bg-red-950 text-xl">
            ⚠
          </div>
          <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50 mb-1">
            Something went wrong
          </h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 max-w-md">
            {GENERIC_ERROR_MESSAGE}
          </p>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="mt-4 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 transition-colors"
          >
            Try again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
