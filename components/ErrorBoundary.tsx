
/**
 * Error Boundary Component
 * Catches JavaScript errors and displays a fallback UI
 * Prevents blank screens by always showing something to the user
 */

import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Platform } from "react-native";
import { useRouter } from "expo-router";

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    console.error("[ErrorBoundary] Error caught:", error);
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    console.error("[ErrorBoundary] Caught error:", error);
    console.error("[ErrorBoundary] Error info:", errorInfo.componentStack);
    
    this.setState({ error, errorInfo });
    
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  resetError = (): void => {
    console.log("[ErrorBoundary] Resetting error state");
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render(): React.ReactNode {
    if (!this.state.hasError) {
      return this.props.children;
    }

    if (this.props.fallback) {
      return this.props.fallback;
    }

    const error = this.state.error;
    const errorMessage = error?.message || 'Unknown error occurred';
    const errorStack = error?.stack || '';
    
    // Check if this is an auth-related error
    const isAuthError = errorMessage.toLowerCase().includes('auth') || 
                        errorMessage.toLowerCase().includes('session') ||
                        errorMessage.toLowerCase().includes('guest') ||
                        errorMessage.toLowerCase().includes('token');

    const titleText = isAuthError ? 'Session Issue' : 'Something went wrong';
    const messageText = isAuthError 
      ? 'There was an issue with your session. Please try signing in again.'
      : 'The app encountered an unexpected error. Please try again.';
    const buttonText = isAuthError ? 'Go to Sign In' : 'Try Again';

    return (
      <View style={styles.container}>
        <View style={styles.content}>
          <Text style={styles.emoji}>⚠️</Text>
          <Text style={styles.title}>{titleText}</Text>
          <Text style={styles.message}>{messageText}</Text>

          {__DEV__ && error && (
            <ScrollView style={styles.errorDetails}>
              <Text style={styles.errorTitle}>Error Details (Dev Only):</Text>
              <Text style={styles.errorText}>{errorMessage}</Text>
              {errorStack && (
                <Text style={styles.errorStack}>{errorStack}</Text>
              )}
              {this.state.errorInfo && (
                <Text style={styles.errorStack}>
                  {this.state.errorInfo.componentStack}
                </Text>
              )}
            </ScrollView>
          )}

          <TouchableOpacity style={styles.button} onPress={this.resetError}>
            <Text style={styles.buttonText}>{buttonText}</Text>
          </TouchableOpacity>

          {Platform.OS !== 'web' && (
            <TouchableOpacity 
              style={[styles.button, styles.secondaryButton]} 
              onPress={() => {
                // Force reload the app
                if (typeof global !== 'undefined' && (global as any).HermesInternal) {
                  console.log('[ErrorBoundary] Reloading app...');
                  this.resetError();
                }
              }}
            >
              <Text style={[styles.buttonText, styles.secondaryButtonText]}>Reload App</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
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
  content: {
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
  },
  emoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 16,
    color: "#000",
    textAlign: 'center',
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
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    marginBottom: 8,
  },
  errorStack: {
    fontSize: 10,
    color: "#666",
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  button: {
    backgroundColor: "#007AFF",
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 12,
    minWidth: 200,
    alignItems: 'center',
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  secondaryButtonText: {
    color: '#007AFF',
  },
});
