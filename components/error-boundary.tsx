"use client";

import React, { Component, ReactNode } from "react";
import { AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

/**
 * ErrorBoundary Component
 * Requirements: 13.4, 13.5, 13.6
 *
 * Global error boundary that catches React errors and prevents app crashes.
 * Features:
 * - Catches errors in child components
 * - Displays user-friendly error messages
 * - Provides reset functionality to recover from errors
 * - Logs errors for debugging
 * - Handles both network and service errors gracefully
 */
export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log error for debugging - Requirement 13.6
    console.error("Error caught by ErrorBoundary:", error, errorInfo);

    // You can also log to an error reporting service here
    // Example: logErrorToService(error, errorInfo);

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
  };

  getErrorMessage(error: Error): { title: string; description: string } {
    const errorMessage = error.message.toLowerCase();

    // Network errors - Requirement 13.4
    if (
      errorMessage.includes("network") ||
      errorMessage.includes("fetch") ||
      errorMessage.includes("connection")
    ) {
      return {
        title: "Network Error",
        description:
          "Unable to connect to the server. Please check your internet connection and try again.",
      };
    }

    // Service errors - Requirement 13.5
    if (
      errorMessage.includes("unauthorized") ||
      errorMessage.includes("forbidden")
    ) {
      return {
        title: "Authentication Error",
        description:
          "Your session may have expired. Please refresh the page and sign in again.",
      };
    }

    if (errorMessage.includes("not found") || errorMessage.includes("404")) {
      return {
        title: "Resource Not Found",
        description:
          "The requested resource could not be found. It may have been deleted or moved.",
      };
    }

    if (
      errorMessage.includes("server") ||
      errorMessage.includes("500") ||
      errorMessage.includes("503")
    ) {
      return {
        title: "Server Error",
        description:
          "The server encountered an error. Please try again in a few moments.",
      };
    }

    // Generic error fallback
    return {
      title: "Something Went Wrong",
      description:
        "An unexpected error occurred. Please try refreshing the page or contact support if the problem persists.",
    };
  }

  render() {
    if (this.state.hasError) {
      // Custom fallback UI if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const { title, description } = this.getErrorMessage(
        this.state.error || new Error("Unknown error"),
      );

      // Default error UI - Requirements 13.4, 13.5
      return (
        <div className="flex min-h-screen items-center justify-center p-4 bg-background">
          <div className="max-w-md w-full space-y-6 text-center">
            <div className="flex justify-center">
              <div className="rounded-full bg-destructive/10 p-4">
                <AlertCircle className="h-12 w-12 text-destructive" />
              </div>
            </div>

            <div className="space-y-2">
              <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
              <p className="text-muted-foreground">{description}</p>
            </div>

            {/* Show error details in development */}
            {process.env.NODE_ENV === "development" && this.state.error && (
              <details className="text-left">
                <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground">
                  Error Details (Development Only)
                </summary>
                <pre className="mt-2 text-xs bg-muted p-4 rounded-lg overflow-auto max-h-40">
                  {this.state.error.toString()}
                  {this.state.errorInfo?.componentStack}
                </pre>
              </details>
            )}

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button onClick={this.handleReset} variant="default">
                <RefreshCw className="h-4 w-4 mr-2" />
                Try Again
              </Button>
              <Button
                onClick={() => window.location.reload()}
                variant="outline"
              >
                Refresh Page
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
