import Link from 'next/link'
"use client"

import { Component, ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { AlertTriangle, RefreshCw, Home } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ErrorBoundaryProps {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = {
    hasError: false,
    error: null,
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo)
    this.props.onError?.(error, errorInfo)
    
    // Log to error reporting service in production
    if (process.env.NODE_ENV === 'production') {
      // Could integrate with Sentry, LogRocket, etc.
    }
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null })
  }

  handleReload = () => {
    window.location.reload()
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div className="flex min-h-[300px] items-center justify-center p-6">
          <div className="text-center space-y-4 max-w-md">
            <div className={cn(
              "inline-flex items-center justify-center rounded-full bg-destructive/10 text-destructive",
              "h-16 w-16"
            )}>
              <AlertTriangle className="h-8 w-8" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">Something went wrong</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                We encountered an unexpected error. Your data is safe.
              </p>
              {process.env.NODE_ENV === 'development' && this.state.error && (
                <details className="mt-4 text-left text-xs text-muted-foreground">
                  <summary className="cursor-pointer mb-1">Error details</summary>
                  <pre className="p-3 rounded bg-muted overflow-auto max-h-40">
                    {this.state.error.message}
                    {this.state.error.stack}
                  </pre>
                </details>
              )}
            </div>
            <div className="flex gap-3 justify-center">
              <Button onClick={this.handleRetry} variant="default">
                <RefreshCw className="mr-2 h-4 w-4" />
                Try Again
              </Button>
              <Button onClick={this.handleReload} variant="outline" asChild>
                <Link href="/dashboard"><Home className="mr-2 h-4 w-4" />Go to Dashboard</Link>
              </Button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

// Specialized error boundaries for different contexts
export function DashboardErrorBoundary({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary
      fallback={
        <div className="space-y-4">
          <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-6">
            <h3 className="font-semibold text-destructive">Dashboard Error</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Unable to load dashboard data. Please refresh the page.
            </p>
            <Button onClick={() => window.location.reload()} className="mt-4" size="sm">
              Refresh Page
            </Button>
          </div>
        </div>
      }
    >
      {children}
    </ErrorBoundary>
  )
}

export function WidgetErrorBoundary({ 
  title = "Widget", 
  children 
}: { 
  title?: string
  children: ReactNode 
}) {
  return (
    <ErrorBoundary
      fallback={
        <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-4">
          <p className="text-sm text-destructive">{title} failed to load</p>
          <Button 
            onClick={() => window.location.reload()} 
            variant="ghost" 
            size="sm" 
            className="mt-2"
          >
            Retry
          </Button>
        </div>
      }
    >
      {children}
    </ErrorBoundary>
  )
}