
import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";
import { useRouter, useSegments } from "expo-router";
import { authClient } from "@/lib/auth";

const BEARER_TOKEN_KEY = "postopradar_bearer_token";
const SESSION_FLAG_KEY = "postopradar_session_active";
const USER_DATA_KEY = "postopradar_user_data";
const IS_GUEST_KEY = "postopradar_is_guest";

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
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isGuest, setIsGuest] = useState(false);
  const [bearerToken, setBearerToken] = useState<string | null>(null);
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
    try {
      console.log('[Auth] Checking for existing session...');
      
      // Check if user is guest
      const guestFlag = await getStorageItem(IS_GUEST_KEY);
      if (guestFlag === "true") {
        console.log('[Auth] Guest session found');
        const userData = await getStorageItem(USER_DATA_KEY);
        if (userData) {
          const parsedUser = JSON.parse(userData);
          setUser(parsedUser);
          setIsGuest(true);
          setBearerToken(null); // Guests don't have tokens
          setLoading(false);
          return;
        }
      }

      // Check for stored bearer token (authenticated user)
      const storedToken = await getStorageItem(BEARER_TOKEN_KEY);
      const userData = await getStorageItem(USER_DATA_KEY);
      
      if (storedToken && userData) {
        console.log('[Auth] Found stored token and user data, restoring session');
        const parsedUser = JSON.parse(userData);
        setUser(parsedUser);
        setBearerToken(storedToken);
        setIsGuest(false);
        setLoading(false);
        return;
      }

      // Try to get session from backend (Better Auth)
      try {
        const session = await authClient.getSession();
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
        } else {
          console.log('[Auth] No active backend session found');
        }
      } catch (error) {
        console.log('[Auth] Backend session check failed (backend may be unavailable):', error);
      }
    } catch (error) {
      console.error("[Auth] Error checking auth:", error);
    } finally {
      setLoading(false);
    }
  }, [getStorageItem, setStorageItem, deleteStorageItem, storeBearerToken]);

  useEffect(() => {
    console.log('[Auth] Initializing auth check...');
    checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    if (loading) return;

    const inAuthGroup = segments[0] === "auth" || segments[0] === "auth-callback" || segments[0] === "auth-popup" || segments[0] === "profile-setup";

    console.log('[Auth] Navigation check - user:', user?.email, 'isGuest:', isGuest, 'hasToken:', !!bearerToken, 'inAuthGroup:', inAuthGroup, 'segments:', segments);

    // CRITICAL: User is considered authenticated ONLY if:
    // 1. They have a user object AND
    // 2. Either they have a valid bearerToken (logged in) OR they are in guest mode
    const isAuthenticated = !!user && (!!bearerToken || isGuest);

    console.log('[Auth] isAuthenticated:', isAuthenticated, 'user:', !!user, 'bearerToken:', !!bearerToken, 'isGuest:', isGuest);

    if (!isAuthenticated && !inAuthGroup) {
      console.log('[Auth] No valid session, redirecting to /auth');
      router.replace("/auth");
    } else if (isAuthenticated && inAuthGroup) {
      console.log('[Auth] User authenticated, redirecting to dashboard');
      router.replace("/(tabs)/(home)");
    }
  }, [user, loading, segments, bearerToken, isGuest, router]);

  const signInWithEmail = async (email: string, password: string) => {
    console.log('[Auth] Sign in button clicked for email:', email);
    
    try {
      const result = await authClient.signIn.email({
        email,
        password,
      });

      if (result.error) {
        console.error('[Auth] Backend sign in error:', result.error);
        throw new Error(result.error.message || "Sign in failed");
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
      throw error; // Re-throw so UI can show error
    }
  };

  const signUpWithEmail = async (email: string, password: string, name?: string) => {
    console.log('[Auth] Sign up button clicked for email:', email);
    
    try {
      const result = await authClient.signUp.email({
        email,
        password,
        name,
      });

      if (result.error) {
        console.error('[Auth] Backend sign up error:', result.error);
        throw new Error(result.error.message || "Sign up failed");
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
      throw error; // Re-throw so UI can show error
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
      email: 'guest@postopradar.local',
      name: 'Guest User',
    };
    
    setUser(guestUser);
    setIsGuest(true);
    setBearerToken(null); // Guests don't have tokens
    
    // Persist guest session (no token)
    await setStorageItem(SESSION_FLAG_KEY, "true");
    await setStorageItem(USER_DATA_KEY, JSON.stringify(guestUser));
    await setStorageItem(IS_GUEST_KEY, "true");
    await clearBearerToken(); // Ensure no token exists
    
    console.log('[Auth] Guest authentication successful, navigating to dashboard');
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

  // CRITICAL: Compute isAuthenticated - single source of truth
  // User is authenticated ONLY if they have a user AND (token OR guest mode)
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
