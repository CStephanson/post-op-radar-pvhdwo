
import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";
import { useRouter, useSegments } from "expo-router";
import { authClient } from "@/lib/auth";
import Constants from "expo-constants";

const BEARER_TOKEN_KEY = "opmgmt_bearer_token";
const SESSION_FLAG_KEY = "opmgmt_session_active";
const USER_DATA_KEY = "opmgmt_user_data";
const IS_GUEST_KEY = "opmgmt_is_guest";

interface User {
  id: string;
  email: string;
  name?: string;
  image?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isGuest: boolean;
  bearerToken: string | null;
  isAuthenticated: boolean;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string, name?: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signInWithApple: () => Promise<void>;
  signInWithGitHub: () => Promise<void>;
  signInAsGuest: () => Promise<void>;
  signInAsDev: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Helper to normalize email (trim whitespace, convert to lowercase)
function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

// Check if we're in preview/dev mode
function isPreviewMode(): boolean {
  return __DEV__ || Constants.appOwnership === 'expo';
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  console.log('[Auth] ===== AuthProvider initializing =====');
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isGuest, setIsGuest] = useState(false);
  const [bearerToken, setBearerToken] = useState<string | null>(null);
  const [isNavigating, setIsNavigating] = useState(false);
  const router = useRouter();
  const segments = useSegments();

  const getStorageItem = useCallback(async (key: string): Promise<string | null> => {
    try {
      if (Platform.OS === "web") {
        return localStorage.getItem(key);
      } else {
        return await SecureStore.getItemAsync(key);
      }
    } catch (error) {
      console.error(`[Auth] Error getting storage item ${key}:`, error);
      return null;
    }
  }, []);

  const setStorageItem = useCallback(async (key: string, value: string) => {
    try {
      if (Platform.OS === "web") {
        localStorage.setItem(key, value);
      } else {
        await SecureStore.setItemAsync(key, value);
      }
    } catch (error) {
      console.error(`[Auth] Error setting storage item ${key}:`, error);
    }
  }, []);

  const deleteStorageItem = useCallback(async (key: string) => {
    try {
      if (Platform.OS === "web") {
        localStorage.removeItem(key);
      } else {
        await SecureStore.deleteItemAsync(key);
      }
    } catch (error) {
      console.error(`[Auth] Error deleting storage item ${key}:`, error);
    }
  }, []);

  const storeBearerToken = useCallback(async (token: string) => {
    try {
      if (Platform.OS === "web") {
        localStorage.setItem(BEARER_TOKEN_KEY, token);
      } else {
        await SecureStore.setItemAsync(BEARER_TOKEN_KEY, token);
      }
      setBearerToken(token);
      console.log('[Auth] Bearer token stored successfully');
    } catch (error) {
      console.error("[Auth] Error storing bearer token:", error);
    }
  }, []);

  const clearBearerToken = useCallback(async () => {
    try {
      if (Platform.OS === "web") {
        localStorage.removeItem(BEARER_TOKEN_KEY);
      } else {
        await SecureStore.deleteItemAsync(BEARER_TOKEN_KEY);
      }
      setBearerToken(null);
      console.log('[Auth] Bearer token cleared');
    } catch (error) {
      console.error("[Auth] Error clearing bearer token:", error);
    }
  }, []);

  const checkAuth = useCallback(async () => {
    console.log('[Auth] ===== Starting auth check =====');
    try {
      console.log('[Auth] Checking for existing session...');
      
      // Check if user is guest
      const guestFlag = await getStorageItem(IS_GUEST_KEY);
      console.log('[Auth] Guest flag:', guestFlag);
      
      if (guestFlag === "true") {
        console.log('[Auth] Guest session found, loading user data');
        const userData = await getStorageItem(USER_DATA_KEY);
        if (userData) {
          const parsedUser = JSON.parse(userData);
          console.log('[Auth] Guest user loaded:', parsedUser.email);
          setUser(parsedUser);
          setIsGuest(true);
          setBearerToken(null);
          setLoading(false);
          console.log('[Auth] ===== Auth check complete (guest) =====');
          return;
        } else {
          console.warn('[Auth] Guest flag set but no user data found');
        }
      }

      // Check for stored bearer token (authenticated user)
      const storedToken = await getStorageItem(BEARER_TOKEN_KEY);
      const userData = await getStorageItem(USER_DATA_KEY);
      console.log('[Auth] Stored token exists:', !!storedToken, 'User data exists:', !!userData);
      
      if (storedToken && userData) {
        console.log('[Auth] Found stored token and user data, restoring session');
        try {
          const parsedUser = JSON.parse(userData);
          console.log('[Auth] Authenticated user loaded:', parsedUser.email);
          setUser(parsedUser);
          setBearerToken(storedToken);
          setIsGuest(false);
          setLoading(false);
          console.log('[Auth] ===== Auth check complete (authenticated) =====');
          return;
        } catch (parseError) {
          console.error('[Auth] Failed to parse stored user data:', parseError);
        }
      }

      // Try to get session from backend (Better Auth)
      console.log('[Auth] No stored session, checking backend...');
      try {
        const session = await authClient.getSession();
        console.log('[Auth] Backend session response:', !!session, 'Has user:', !!session?.user, 'Has token:', !!session?.session?.token);
        
        if (session?.user && session?.session?.token) {
          console.log('[Auth] Backend session found for user:', session.user.email);
          const userData = {
            id: session.user.id,
            email: session.user.email,
            name: session.user.name,
            image: session.user.image,
          };
          setUser(userData);
          setBearerToken(session.session.token);
          setIsGuest(false);
          
          // Persist session
          await storeBearerToken(session.session.token);
          await setStorageItem(SESSION_FLAG_KEY, "true");
          await setStorageItem(USER_DATA_KEY, JSON.stringify(userData));
          await deleteStorageItem(IS_GUEST_KEY);
          console.log('[Auth] Backend session persisted');
        } else {
          console.log('[Auth] No active backend session found');
        }
      } catch (error) {
        console.log('[Auth] Backend session check failed (backend may be unavailable):', error);
      }
    } catch (error) {
      console.error("[Auth] Error checking auth:", error);
    } finally {
      console.log('[Auth] Setting loading to false');
      setLoading(false);
      console.log('[Auth] ===== Auth check complete (no session) =====');
    }
  }, [getStorageItem, setStorageItem, deleteStorageItem, storeBearerToken]);

  useEffect(() => {
    console.log('[Auth] Initializing auth check...');
    checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    if (loading || isNavigating) {
      console.log('[Auth] Still loading or navigating, skipping navigation check');
      return;
    }

    const inAuthGroup = segments[0] === "auth" || segments[0] === "auth-callback" || segments[0] === "auth-popup" || segments[0] === "profile-setup";

    console.log('[Auth] Navigation check - user:', user?.email, 'isGuest:', isGuest, 'hasToken:', !!bearerToken, 'inAuthGroup:', inAuthGroup, 'segments:', segments);

    // User is authenticated if they have a user object AND (token OR guest mode)
    const isAuthenticated = !!user && (!!bearerToken || isGuest);

    console.log('[Auth] isAuthenticated:', isAuthenticated);

    // Prevent redirect loops - only redirect if we're not already on the target route
    if (!isAuthenticated && !inAuthGroup) {
      console.log('[Auth] No valid session, redirecting to /auth');
      setIsNavigating(true);
      try {
        router.replace("/auth");
      } catch (error) {
        console.error('[Auth] Failed to redirect to /auth:', error);
      } finally {
        setTimeout(() => setIsNavigating(false), 500);
      }
    } else if (isAuthenticated && inAuthGroup) {
      console.log('[Auth] User authenticated, redirecting to dashboard');
      setIsNavigating(true);
      try {
        router.replace("/(tabs)/(home)");
      } catch (error) {
        console.error('[Auth] Failed to redirect to dashboard:', error);
      } finally {
        setTimeout(() => setIsNavigating(false), 500);
      }
    }
  }, [user, loading, segments, bearerToken, isGuest, router, isNavigating]);

  const signInWithEmail = async (email: string, password: string) => {
    const normalizedEmail = normalizeEmail(email);
    console.log('[Auth] Sign in with email:', normalizedEmail);
    
    try {
      const result = await authClient.signIn.email({
        email: normalizedEmail,
        password,
      });

      if (result.error) {
        console.error('[Auth] Backend sign in error:', result.error);
        
        // Provide specific error messages
        const errorMessage = result.error.message || "Sign in failed";
        if (errorMessage.toLowerCase().includes('user not found') || errorMessage.toLowerCase().includes('no user')) {
          throw new Error("No account found with this email. Please sign up first.");
        } else if (errorMessage.toLowerCase().includes('password') || errorMessage.toLowerCase().includes('credentials')) {
          throw new Error("Incorrect password. Please try again.");
        } else if (errorMessage.toLowerCase().includes('network') || errorMessage.toLowerCase().includes('unavailable')) {
          throw new Error("Authentication service unavailable. Please try guest mode or dev login.");
        } else {
          throw new Error(errorMessage);
        }
      }

      if (result.data?.user && result.data?.session?.token) {
        console.log('[Auth] Backend authentication successful for:', result.data.user.email);
        const userData = {
          id: result.data.user.id,
          email: result.data.user.email,
          name: result.data.user.name,
          image: result.data.user.image,
        };
        
        setUser(userData);
        setBearerToken(result.data.session.token);
        setIsGuest(false);

        // Persist session with token
        await storeBearerToken(result.data.session.token);
        await setStorageItem(SESSION_FLAG_KEY, "true");
        await setStorageItem(USER_DATA_KEY, JSON.stringify(userData));
        await deleteStorageItem(IS_GUEST_KEY);
        
        console.log('[Auth] Navigation to dashboard executing...');
        router.replace("/(tabs)/(home)");
      } else {
        throw new Error("Invalid response from authentication server");
      }
    } catch (error: any) {
      console.error('[Auth] Sign in exception:', error);
      throw error;
    }
  };

  const signUpWithEmail = async (email: string, password: string, name?: string) => {
    const normalizedEmail = normalizeEmail(email);
    console.log('[Auth] Sign up with email:', normalizedEmail);
    
    try {
      const result = await authClient.signUp.email({
        email: normalizedEmail,
        password,
        name: name || normalizedEmail.split('@')[0],
      });

      if (result.error) {
        console.error('[Auth] Backend sign up error:', result.error);
        
        // Provide specific error messages
        const errorMessage = result.error.message || "Sign up failed";
        if (errorMessage.toLowerCase().includes('already exists') || errorMessage.toLowerCase().includes('duplicate')) {
          throw new Error("An account with this email already exists. Please sign in instead.");
        } else if (errorMessage.toLowerCase().includes('password')) {
          throw new Error("Password must be at least 8 characters long.");
        } else if (errorMessage.toLowerCase().includes('email')) {
          throw new Error("Please enter a valid email address.");
        } else if (errorMessage.toLowerCase().includes('network') || errorMessage.toLowerCase().includes('unavailable')) {
          throw new Error("Authentication service unavailable. Please try guest mode or dev login.");
        } else {
          throw new Error(errorMessage);
        }
      }

      if (result.data?.user && result.data?.session?.token) {
        console.log('[Auth] Backend sign up successful for:', result.data.user.email);
        const userData = {
          id: result.data.user.id,
          email: result.data.user.email,
          name: result.data.user.name,
          image: result.data.user.image,
        };
        
        setUser(userData);
        setBearerToken(result.data.session.token);
        setIsGuest(false);

        // Persist session with token
        await storeBearerToken(result.data.session.token);
        await setStorageItem(SESSION_FLAG_KEY, "true");
        await setStorageItem(USER_DATA_KEY, JSON.stringify(userData));
        await deleteStorageItem(IS_GUEST_KEY);
        
        console.log('[Auth] Navigation to dashboard executing...');
        router.replace("/(tabs)/(home)");
      } else {
        throw new Error("Invalid response from authentication server");
      }
    } catch (error: any) {
      console.error('[Auth] Sign up exception:', error);
      throw error;
    }
  };

  const signInWithGoogle = async () => {
    console.log('[Auth] Google sign in initiated');
    
    try {
      const result = await authClient.signIn.social({
        provider: "google",
      });

      if (result.error) {
        console.error('[Auth] Google sign in error:', result.error);
        throw new Error(result.error.message || "Google sign in failed");
      }
      
      console.log('[Auth] Google sign in successful, navigating to dashboard');
      router.replace("/(tabs)/(home)");
    } catch (error) {
      console.error('[Auth] Google sign in exception:', error);
      throw error;
    }
  };

  const signInWithApple = async () => {
    console.log('[Auth] Apple sign in initiated');
    
    try {
      const result = await authClient.signIn.social({
        provider: "apple",
      });

      if (result.error) {
        console.error('[Auth] Apple sign in error:', result.error);
        throw new Error(result.error.message || "Apple sign in failed");
      }
      
      console.log('[Auth] Apple sign in successful, navigating to dashboard');
      router.replace("/(tabs)/(home)");
    } catch (error) {
      console.error('[Auth] Apple sign in exception:', error);
      throw error;
    }
  };

  const signInWithGitHub = async () => {
    console.log('[Auth] GitHub sign in initiated');
    
    try {
      const result = await authClient.signIn.social({
        provider: "github",
      });

      if (result.error) {
        console.error('[Auth] GitHub sign in error:', result.error);
        throw new Error(result.error.message || "GitHub sign in failed");
      }
      
      console.log('[Auth] GitHub sign in successful, navigating to dashboard');
      router.replace("/(tabs)/(home)");
    } catch (error) {
      console.error('[Auth] GitHub sign in exception:', error);
      throw error;
    }
  };

  const signInAsGuest = async () => {
    console.log('[Auth] Guest sign in initiated');
    
    const guestUser = {
      id: 'guest-' + Date.now(),
      email: 'guest@opmgmt.local',
      name: 'Guest User',
    };
    
    setUser(guestUser);
    setIsGuest(true);
    setBearerToken(null);
    
    // Persist guest session (no token)
    await setStorageItem(SESSION_FLAG_KEY, "true");
    await setStorageItem(USER_DATA_KEY, JSON.stringify(guestUser));
    await setStorageItem(IS_GUEST_KEY, "true");
    await clearBearerToken();
    
    console.log('[Auth] Guest authentication successful, navigating to dashboard');
    router.replace("/(tabs)/(home)");
  };

  const signInAsDev = async () => {
    console.log('[Auth] Dev login initiated');
    
    if (!isPreviewMode()) {
      throw new Error("Dev login is only available in preview/development mode");
    }
    
    const devUser = {
      id: 'dev-' + Date.now(),
      email: 'dev@opmgmt.local',
      name: 'Dev User',
    };
    
    // Create a mock token for dev mode
    const mockToken = 'dev-token-' + Date.now();
    
    setUser(devUser);
    setIsGuest(false);
    setBearerToken(mockToken);
    
    // Persist dev session with mock token
    await storeBearerToken(mockToken);
    await setStorageItem(SESSION_FLAG_KEY, "true");
    await setStorageItem(USER_DATA_KEY, JSON.stringify(devUser));
    await deleteStorageItem(IS_GUEST_KEY);
    
    console.log('[Auth] Dev authentication successful, navigating to dashboard');
    router.replace("/(tabs)/(home)");
  };

  const signOut = async () => {
    console.log('[Auth] Sign out initiated');
    
    try {
      if (!isGuest) {
        await authClient.signOut();
      }
    } catch (error) {
      console.error('[Auth] Error signing out from backend:', error);
    }
    
    await clearBearerToken();
    await deleteStorageItem(SESSION_FLAG_KEY);
    await deleteStorageItem(USER_DATA_KEY);
    await deleteStorageItem(IS_GUEST_KEY);
    setUser(null);
    setIsGuest(false);
    setBearerToken(null);
    
    console.log('[Auth] Sign out complete, redirecting to login');
    router.replace("/auth");
  };

  // Compute isAuthenticated - single source of truth
  const isAuthenticated = !!user && (!!bearerToken || isGuest);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isGuest,
        bearerToken,
        isAuthenticated,
        signInWithEmail,
        signUpWithEmail,
        signInWithGoogle,
        signInWithApple,
        signInWithGitHub,
        signInAsGuest,
        signInAsDev,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
