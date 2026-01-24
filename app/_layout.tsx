
import "react-native-reanimated";
import React, { useEffect, useState } from "react";
import { useFonts } from "expo-font";
import * as SplashScreen from "expo-splash-screen";
import { SystemBars } from "react-native-edge-to-edge";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { useColorScheme, View, Text, ActivityIndicator } from "react-native";
import {
  DarkTheme,
  DefaultTheme,
  Theme,
  NavigationContainer,
} from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { StatusBar } from "expo-status-bar";
import { WidgetProvider } from "@/contexts/WidgetContext";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { migrateExistingData } from "@/utils/localStorage";

// Import screens
import HomeScreen from "./(tabs)/(home)/index";
import AddPatientScreen from "./add-patient";
import PatientDetailScreen from "./patient/[id]";
import PatientInfoScreen from "./patient-info/[id]";

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

const Stack = createNativeStackNavigator();

export default function RootLayout() {
  console.log('[App] ===== RootLayout rendering =====');
  const colorScheme = useColorScheme();
  const [loaded] = useFonts({
    SpaceMono: require("../assets/fonts/SpaceMono-Regular.ttf"),
  });
  const [migrationComplete, setMigrationComplete] = useState(false);

  useEffect(() => {
    console.log('[App] Root layout mounted - app is starting');
    
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

    // Run one-time data migration
    migrateExistingData()
      .then(() => {
        console.log('[App] Data migration complete');
        setMigrationComplete(true);
      })
      .catch((error) => {
        console.error('[App] Data migration failed:', error);
        // Don't block app startup on migration failure
        setMigrationComplete(true);
      });
  }, []);

  useEffect(() => {
    if (loaded && migrationComplete) {
      console.log('[App] Fonts loaded and migration complete, hiding splash screen');
      SplashScreen.hideAsync();
    }
  }, [loaded, migrationComplete]);

  if (!loaded || !migrationComplete) {
    console.log('[App] Fonts not loaded or migration in progress, showing loading screen');
    // Show a visible loading screen instead of null to prevent blank screen
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' }}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={{ fontSize: 18, fontWeight: '600', marginTop: 16, color: '#000' }}>
          Loading OpMGMT...
        </Text>
        <Text style={{ fontSize: 14, color: '#666', marginTop: 8 }}>
          Initializing local storage
        </Text>
      </View>
    );
  }

  console.log('[App] Fonts loaded and migration complete, rendering app layout');

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
      <WidgetProvider>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <NavigationContainer theme={colorScheme === "dark" ? CustomDarkTheme : CustomDefaultTheme}>
            <Stack.Navigator
              initialRouteName="Home"
              screenOptions={{
                headerShown: false,
              }}
            >
              <Stack.Screen 
                name="Home" 
                component={HomeScreen}
                options={{ headerShown: false }}
              />
              <Stack.Screen 
                name="AddPatient" 
                component={AddPatientScreen}
                options={{ 
                  headerShown: true, 
                  title: 'Add Patient',
                  headerBackTitle: 'Back',
                }}
              />
              <Stack.Screen 
                name="PatientDetail" 
                component={PatientDetailScreen}
                options={{ 
                  headerShown: true, 
                  title: 'Patient Details',
                  headerBackTitle: 'Back',
                }}
              />
              <Stack.Screen 
                name="PatientInfo" 
                component={PatientInfoScreen}
                options={{ 
                  headerShown: false,
                  title: 'Patient Information',
                  headerBackTitle: 'Back',
                }}
              />
            </Stack.Navigator>
          </NavigationContainer>
          <SystemBars style={"auto"} />
        </GestureHandlerRootView>
      </WidgetProvider>
    </ErrorBoundary>
  );
}
