
import React, { createContext, useContext, useState, useEffect } from "react";
import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";
import { useRouter, useSegments } from "expo-router";
import { authClient } from "@/lib/auth";

const BEARER_TOKEN_KEY = "auth_bearer_token";

interface User {
  id: string;
  email: string;
  name?: string;
  image?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string, name?: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signInWithApple: () => Promise<void>;
  signInWithGitHub: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (loading) return;

    const inAuthGroup = segments[0] === "auth" || segments[0] === "auth-callback" || segments[0] === "auth-popup";

    if (!user && !inAuthGroup) {
      router.replace("/auth");
    } else if (user && inAuthGroup) {
      router.replace("/(tabs)/(home)");
    }
  }, [user, loading, segments]);

  const checkAuth = async () => {
    try {
      const session = await authClient.getSession();
      if (session?.user) {
        setUser({
          id: session.user.id,
          email: session.user.email,
          name: session.user.name,
          image: session.user.image,
        });
        
        if (session.session?.token) {
          await storeBearerToken(session.session.token);
        }
      }
    } catch (error) {
      console.error("[Auth] Error checking auth:", error);
    } finally {
      setLoading(false);
    }
  };

  const storeBearerToken = async (token: string) => {
    try {
      if (Platform.OS === "web") {
        localStorage.setItem(BEARER_TOKEN_KEY, token);
      } else {
        await SecureStore.setItemAsync(BEARER_TOKEN_KEY, token);
      }
    } catch (error) {
      console.error("[Auth] Error storing bearer token:", error);
    }
  };

  const clearBearerToken = async () => {
    try {
      if (Platform.OS === "web") {
        localStorage.removeItem(BEARER_TOKEN_KEY);
      } else {
        await SecureStore.deleteItemAsync(BEARER_TOKEN_KEY);
      }
    } catch (error) {
      console.error("[Auth] Error clearing bearer token:", error);
    }
  };

  const signInWithEmail = async (email: string, password: string) => {
    const result = await authClient.signIn.email({
      email,
      password,
    });

    if (result.error) {
      throw new Error(result.error.message || "Sign in failed");
    }

    if (result.data?.user) {
      setUser({
        id: result.data.user.id,
        email: result.data.user.email,
        name: result.data.user.name,
        image: result.data.user.image,
      });

      if (result.data.session?.token) {
        await storeBearerToken(result.data.session.token);
      }
      
      router.replace("/(tabs)/(home)");
    }
  };

  const signUpWithEmail = async (email: string, password: string, name?: string) => {
    const result = await authClient.signUp.email({
      email,
      password,
      name,
    });

    if (result.error) {
      throw new Error(result.error.message || "Sign up failed");
    }

    if (result.data?.user) {
      setUser({
        id: result.data.user.id,
        email: result.data.user.email,
        name: result.data.user.name,
        image: result.data.user.image,
      });

      if (result.data.session?.token) {
        await storeBearerToken(result.data.session.token);
      }
      
      router.replace("/(tabs)/(home)");
    }
  };

  const signInWithGoogle = async () => {
    const result = await authClient.signIn.social({
      provider: "google",
    });

    if (result.error) {
      throw new Error(result.error.message || "Google sign in failed");
    }
    
    router.replace("/(tabs)/(home)");
  };

  const signInWithApple = async () => {
    const result = await authClient.signIn.social({
      provider: "apple",
    });

    if (result.error) {
      throw new Error(result.error.message || "Apple sign in failed");
    }
    
    router.replace("/(tabs)/(home)");
  };

  const signInWithGitHub = async () => {
    const result = await authClient.signIn.social({
      provider: "github",
    });

    if (result.error) {
      throw new Error(result.error.message || "GitHub sign in failed");
    }
    
    router.replace("/(tabs)/(home)");
  };

  const signOut = async () => {
    await authClient.signOut();
    await clearBearerToken();
    setUser(null);
    router.replace("/auth");
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        signInWithEmail,
        signUpWithEmail,
        signInWithGoogle,
        signInWithApple,
        signInWithGitHub,
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
