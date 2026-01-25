
import "react-native-reanimated";
import { useEffect, useState } from "react";
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

import HomeScreen from "./home";
import AddPatientScreen from "./add-patient";
import PatientDetailScreen from "./patient/[id]";
import PatientInfoScreen from "./patient-info/[id]";

SplashScreen.preventAutoHideAsync();

if (typeof ErrorUtils !== 'undefined') {
  const originalHandler = ErrorUtils.getGlobalHandler();
  ErrorUtils.setGlobalHandler((error, isFatal) => {
    if (originalHandler) {
      originalHandler(error, isFatal);
    }
  });
}

const Stack = createNativeStackNavigator();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [loaded] = useFonts({
    SpaceMono: require("../assets/fonts/SpaceMono-Regular.ttf"),
  });
  const [migrationComplete, setMigrationComplete] = useState(false);

  useEffect(() => {
    try {
      const errorLogger = require('@/utils/errorLogger');
      if (errorLogger && errorLogger.setupErrorLogging) {
        errorLogger.setupErrorLogging();
      } else if (errorLogger && errorLogger.default && errorLogger.default.setupErrorLogging) {
        errorLogger.default.setupErrorLogging();
      }
    } catch (error) {
      // Error logging setup failed, continue without it
    }

    migrateExistingData()
      .then(() => {
        setMigrationComplete(true);
      })
      .catch(() => {
        setMigrationComplete(true);
      });
  }, []);

  useEffect(() => {
    if (loaded && migrationComplete) {
      SplashScreen.hideAsync();
    }
  }, [loaded, migrationComplete]);

  if (!loaded || !migrationComplete) {
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
              initialRouteName="Dashboard"
              screenOptions={{
                headerShown: false,
              }}
            >
              <Stack.Screen 
                name="Dashboard" 
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
