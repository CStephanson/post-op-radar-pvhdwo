
/**
 * Error Boundary Component
 *
 * Catches JavaScript errors anywhere in the child component tree,
 * logs those errors, and displays a fallback UI.
 * Handles authentication errors gracefully without crashing.
 */

import React, { Component, ReactNode } from "react";
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from "react-native";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
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

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Error caught by boundary:", error, errorInfo);

    const errorMessage = error.message || '';
    if (errorMessage.includes('Authentication token not found') || 
        errorMessage.includes('Session expired') ||
        errorMessage.includes('sign in')) {
      console.log('[ErrorBoundary] Authentication error detected - showing user-friendly message');
    }

    this.setState({
      error,
      errorInfo,
    });

    this.props.onError?.(error, errorInfo);
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const errorMessage = this.state.error?.message || '';
      const isAuthError = errorMessage.includes('Authentication token not found') || 
                          errorMessage.includes('Session expired') ||
                          errorMessage.includes('sign in') ||
                          errorMessage.includes('Guest mode');

      const titleText = isAuthError ? 'Session Issue' : 'Oops! Something went wrong';
      const messageText = isAuthError 
        ? errorMessage
        : 'We're sorry for the inconvenience. The app encountered an error.';
      const buttonText = isAuthError ? 'Continue' : 'Try Again';

      const showErrorDetails = __DEV__ && this.state.error && !isAuthError;
      const errorString = this.state.error ? this.state.error.toString() : '';
      const componentStack = this.state.errorInfo ? this.state.errorInfo.componentStack : '';
      const hasComponentStack = this.state.errorInfo !== null;

      return (
        <View style={styles.container}>
          <Text style={styles.title}>{titleText}</Text>
          <Text style={styles.message}>{messageText}</Text>

          {showErrorDetails ? (
            <ScrollView style={styles.errorDetails}>
              <Text style={styles.errorTitle}>Error Details (Dev Only):</Text>
              <Text style={styles.errorText}>{errorString}</Text>
              {hasComponentStack ? (
                <Text style={styles.errorStack}>{componentStack}</Text>
              ) : null}
            </ScrollView>
          ) : null}

          <TouchableOpacity style={styles.button} onPress={this.handleReset}>
            <Text style={styles.buttonText}>{buttonText}</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
    backgroundColor: "#fff",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 16,
    color: "#000",
  },
  message: {
    fontSize: 16,
    textAlign: "center",
    color: "#666",
    marginBottom: 24,
    lineHeight: 24,
  },
  errorDetails: {
    maxHeight: 200,
    width: "100%",
    padding: 16,
    backgroundColor: "#f5f5f5",
    borderRadius: 8,
    marginBottom: 24,
  },
  errorTitle: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
    color: "#FF3B30",
  },
  errorText: {
    fontSize: 12,
    color: "#333",
    fontFamily: "monospace",
    marginBottom: 8,
  },
  errorStack: {
    fontSize: 10,
    color: "#666",
    fontFamily: "monospace",
  },
  button: {
    backgroundColor: "#007AFF",
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 8,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});
