'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ error, errorInfo });

    // Log error to console in development
    console.error('ErrorBoundary caught an error:', error, errorInfo);

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // In production, you might want to send this to an error reporting service
    if (process.env.NODE_ENV === 'production') {
      // Example: Send to error reporting service
      // errorReportingService.captureException(error, { extra: errorInfo });
    }
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  private handleReload = () => {
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      // If a custom fallback is provided, use it
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <div className='min-h-[400px] flex items-center justify-center p-6'>
          <div className='max-w-md w-full bg-white rounded-lg shadow-lg border border-red-200 p-6'>
            <div className='flex items-center space-x-3 mb-4'>
              <AlertCircle className='w-8 h-8 text-red-500 flex-shrink-0' />
              <div>
                <h2 className='text-lg font-semibold text-gray-900'>
                  Something went wrong
                </h2>
                <p className='text-sm text-gray-600'>
                  An unexpected error occurred while rendering this component.
                </p>
              </div>
            </div>

            {process.env.NODE_ENV === 'development' && this.state.error && (
              <div className='mb-4 p-3 bg-red-50 rounded-md'>
                <h3 className='text-sm font-medium text-red-800 mb-2'>
                  Error Details:
                </h3>
                <p className='text-xs text-red-700 font-mono break-all'>
                  {this.state.error.message}
                </p>
                {this.state.error.stack && (
                  <details className='mt-2'>
                    <summary className='text-xs text-red-700 cursor-pointer'>
                      Stack Trace
                    </summary>
                    <pre className='text-xs text-red-600 mt-1 whitespace-pre-wrap break-all'>
                      {this.state.error.stack}
                    </pre>
                  </details>
                )}
              </div>
            )}

            <div className='flex space-x-3'>
              <button
                onClick={this.handleRetry}
                className='flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors duration-200 flex items-center justify-center space-x-2'
              >
                <RefreshCw className='w-4 h-4' />
                <span>Try Again</span>
              </button>
              <button
                onClick={this.handleReload}
                className='flex-1 px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors duration-200'
              >
                Reload Page
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Wrapper component for functional components
interface AsyncErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error) => void;
}

export function AsyncErrorBoundary({
  children,
  fallback,
  onError,
}: AsyncErrorBoundaryProps) {
  return (
    <ErrorBoundary
      fallback={fallback}
      onError={(error, errorInfo) => {
        if (onError) {
          onError(error);
        }
      }}
    >
      {children}
    </ErrorBoundary>
  );
}

// Specialized error boundary for story generation
export function StoryErrorBoundary({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary
      fallback={
        <div className='min-h-[300px] flex items-center justify-center p-6'>
          <div className='text-center'>
            <AlertCircle className='w-12 h-12 text-red-500 mx-auto mb-4' />
            <h3 className='text-lg font-semibold text-gray-900 mb-2'>
              Story Generation Error
            </h3>
            <p className='text-gray-600 mb-4'>
              There was an error while generating or displaying the story.
            </p>
            <button
              onClick={() => window.location.reload()}
              className='px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors'
            >
              Start Over
            </button>
          </div>
        </div>
      }
      onError={(error, errorInfo) => {
        // Custom logging for story generation errors
        console.error('Story generation error:', {
          error: error.message,
          stack: error.stack,
          componentStack: errorInfo.componentStack,
          timestamp: new Date().toISOString(),
        });
      }}
    >
      {children}
    </ErrorBoundary>
  );
}

// Hook for handling async errors in functional components
export function useErrorHandler() {
  const [error, setError] = React.useState<Error | null>(null);

  const handleError = React.useCallback((error: Error | string) => {
    const errorObj = typeof error === 'string' ? new Error(error) : error;
    setError(errorObj);
    console.error('Async error caught:', errorObj);
  }, []);

  const clearError = React.useCallback(() => {
    setError(null);
  }, []);

  // If there's an error, throw it to be caught by ErrorBoundary
  if (error) {
    throw error;
  }

  return { handleError, clearError };
}
