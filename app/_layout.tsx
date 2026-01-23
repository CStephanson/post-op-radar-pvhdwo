
import "react-native-reanimated";
import React, { useEffect } from "react";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { SystemBars } from "react-native-edge-to-edge";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { useColorScheme, Alert, View, Text, ActivityIndicator } from "react-native";
import { useNetworkState } from "expo-network";
import {
  DarkTheme,
  DefaultTheme,
  Theme,
  ThemeProvider,
} from "@react-navigation/native";
import { StatusBar } from "expo-status-bar";
import { WidgetProvider } from "@/contexts/WidgetContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { BACKEND_URL } from "@/utils/api";

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

// Global error handler to catch unhandled errors
if (typeof ErrorUtils !== 'undefined') {
  const originalHandler = ErrorUtils.getGlobalHandler();
  ErrorUtils.setGlobalHandler((error, isFatal) => {
    console.error('[App] Global error caught:', error, 'isFatal:', isFatal);
    if (originalHandler) {
      originalHandler(error, isFatal);
    }
  });
}

export const unstable_settings = {
  initialRouteName: "(tabs)",
};

export default function RootLayout() {
  console.log('[App] ===== RootLayout rendering =====');
  const colorScheme = useColorScheme();
  const networkState = useNetworkState();
  const [loaded] = useFonts({
    SpaceMono: require("../assets/fonts/SpaceMono-Regular.ttf"),
  });

  useEffect(() => {
    console.log('[App] Root layout mounted - app is starting');
    console.log('[App] Backend URL:', BACKEND_URL);
    
    // Initialize error logging after app has started
    try {
      const errorLogger = require('@/utils/errorLogger');
      if (errorLogger && errorLogger.setupErrorLogging) {
        errorLogger.setupErrorLogging();
        console.log('[App] Error logging initialized');
      } else if (errorLogger && errorLogger.default && errorLogger.default.setupErrorLogging) {
        errorLogger.default.setupErrorLogging();
        console.log('[App] Error logging initialized (default export)');
      } else {
        console.warn('[App] Error logging module loaded but setupErrorLogging not found');
      }
    } catch (error) {
      console.error('[App] Failed to initialize error logging:', error);
    }
  }, []);

  useEffect(() => {
    if (loaded) {
      console.log('[App] Fonts loaded, hiding splash screen');
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  React.useEffect(() => {
    if (
      !networkState.isConnected &&
      networkState.isInternetReachable === false
    ) {
      Alert.alert(
        "🔌 You are offline",
        "You can keep using the app! Your changes will be saved locally and synced when you are back online."
      );
    }
  }, [networkState.isConnected, networkState.isInternetReachable]);

  if (!loaded) {
    console.log('[App] Fonts not loaded yet, showing loading screen');
    // Show a visible loading screen instead of null to prevent blank screen
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' }}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={{ fontSize: 18, fontWeight: '600', marginTop: 16, color: '#000' }}>
          Loading OpMGMT...
        </Text>
        <Text style={{ fontSize: 14, color: '#666', marginTop: 8 }}>
          Initializing app
        </Text>
      </View>
    );
  }

  console.log('[App] Fonts loaded, rendering app layout');

  const CustomDefaultTheme: Theme = {
    ...DefaultTheme,
    dark: false,
    colors: {
      primary: "rgb(0, 122, 255)",
      background: "rgb(242, 242, 247)",
      card: "rgb(255, 255, 255)",
      text: "rgb(0, 0, 0)",
      border: "rgb(216, 216, 220)",
      notification: "rgb(255, 59, 48)",
    },
  };

  const CustomDarkTheme: Theme = {
    ...DarkTheme,
    colors: {
      primary: "rgb(10, 132, 255)",
      background: "rgb(1, 1, 1)",
      card: "rgb(28, 28, 30)",
      text: "rgb(255, 255, 255)",
      border: "rgb(44, 44, 46)",
      notification: "rgb(255, 69, 58)",
    },
  };
  
  return (
    <ErrorBoundary>
      <StatusBar style="auto" animated />
      <ThemeProvider
        value={colorScheme === "dark" ? CustomDarkTheme : CustomDefaultTheme}
      >
        <AuthProvider>
          <WidgetProvider>
            <GestureHandlerRootView style={{ flex: 1 }}>
              <Stack>
                <Stack.Screen name="auth" options={{ headerShown: false }} />
                <Stack.Screen name="auth-popup" options={{ headerShown: false }} />
                <Stack.Screen name="auth-callback" options={{ headerShown: false }} />
                <Stack.Screen name="profile-setup" options={{ headerShown: false }} />
                <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                <Stack.Screen name="add-patient" options={{ headerShown: true, title: 'Add Patient' }} />
                <Stack.Screen name="patient/[id]" options={{ headerShown: true, title: 'Patient Details' }} />
                <Stack.Screen name="patient-info/[id]" options={{ headerShown: true, title: 'Patient Information' }} />
              </Stack>
              <SystemBars style={"auto"} />
            </GestureHandlerRootView>
          </WidgetProvider>
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
