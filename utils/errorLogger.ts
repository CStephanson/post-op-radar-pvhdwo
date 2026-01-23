
// Global error logging for runtime errors
// Captures console.log/warn/error and sends to Natively server for AI debugging

// Declare __DEV__ global (React Native global for development mode detection)
declare const __DEV__: boolean;

import { Platform } from "react-native";

// Simple debouncing to prevent duplicate logs
const recentLogs: { [key: string]: boolean } = {};
const clearLogAfterDelay = (logKey: string) => {
  setTimeout(() => delete recentLogs[logKey], 100);
};

// Messages to mute (noisy warnings that don't help debugging)
const MUTED_MESSAGES = [
  'each child in a list should have a unique "key" prop',
  'Each child in a list should have a unique "key" prop',
];

// Check if a message should be muted
const shouldMuteMessage = (message: string): boolean => {
  return MUTED_MESSAGES.some(muted => message.includes(muted));
};

// Helper to safely stringify arguments
const stringifyArgs = (args: any[]): string => {
  return args.map(arg => {
    if (typeof arg === 'string') return arg;
    if (arg === null) return 'null';
    if (arg === undefined) return 'undefined';
    try {
      return JSON.stringify(arg);
    } catch {
      return String(arg);
    }
  }).join(' ');
};

export const setupErrorLogging = () => {
  // Don't initialize in production builds - no need for log forwarding
  if (!__DEV__) {
    return;
  }

  try {
    // Store original console methods BEFORE any modifications
    const originalConsoleLog = console.log;
    const originalConsoleWarn = console.warn;
    const originalConsoleError = console.error;

    // Log initialization info using original console (not intercepted)
    originalConsoleLog('[Natively] Setting up error logging...');
    originalConsoleLog('[Natively] Platform:', Platform.OS);

    // Override console.log to capture logs
    console.log = (...args: any[]) => {
      // Always call original first
      originalConsoleLog.apply(console, args);
    };

    // Override console.warn to capture warnings
    console.warn = (...args: any[]) => {
      // Always call original first
      originalConsoleWarn.apply(console, args);

      // Skip muted messages
      const message = stringifyArgs(args);
      if (shouldMuteMessage(message)) return;
    };

    // Override console.error to capture errors
    console.error = (...args: any[]) => {
      // Skip muted messages
      const message = stringifyArgs(args);
      if (shouldMuteMessage(message)) return;

      // Always call original first
      originalConsoleError.apply(console, args);
    };

    // Capture unhandled errors in web environment
    if (typeof window !== 'undefined') {
      // Override window.onerror to catch JavaScript errors
      window.onerror = (message, source, lineno, colno, error) => {
        const sourceFile = source ? source.split('/').pop() : 'unknown';
        const errorMessage = `RUNTIME ERROR: ${message} at ${sourceFile}:${lineno}:${colno}`;
        originalConsoleError('[ErrorLogger]', errorMessage);
        return false; // Don't prevent default error handling
      };

      // Capture unhandled promise rejections (web only)
      if (Platform.OS === 'web') {
        window.addEventListener('unhandledrejection', (event) => {
          const message = `UNHANDLED PROMISE REJECTION: ${event.reason}`;
          originalConsoleError('[ErrorLogger]', message);
        });
      }
    }
  } catch (error) {
    console.error('[ErrorLogger] Failed to setup error logging:', error);
  }
};
