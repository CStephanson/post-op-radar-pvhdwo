
import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Platform,
  KeyboardAvoidingView,
  ScrollView,
} from "react-native";
import { useAuth } from "@/contexts/AuthContext";
import { colors, typography, spacing } from "@/styles/commonStyles";

type Mode = "signin" | "signup";

export default function AuthScreen() {
  const { signInWithEmail, signUpWithEmail, signInWithGoogle, signInWithApple, signInAsGuest, loading: authLoading } =
    useAuth();

  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [debugStatus, setDebugStatus] = useState("");

  if (authLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.debugText}>Checking authentication...</Text>
      </View>
    );
  }

  const handleEmailAuth = async () => {
    console.log('[AuthScreen] Email auth button pressed');
    
    if (!email || !password) {
      Alert.alert("Error", "Please enter email and password");
      return;
    }

    setLoading(true);
    setDebugStatus("Authenticating...");
    
    try {
      console.log('[AuthScreen] Calling auth function for mode:', mode);
      
      if (mode === "signin") {
        await signInWithEmail(email, password);
        setDebugStatus("Login successful! Navigating...");
      } else {
        await signUpWithEmail(email, password, name);
        setDebugStatus("Sign up successful! Navigating...");
      }
      
      console.log('[AuthScreen] Auth function completed');
    } catch (error: any) {
      console.error('[AuthScreen] Auth error:', error);
      setDebugStatus("Error: " + (error.message || "Authentication failed"));
      Alert.alert("Error", error.message || "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  const handleSocialAuth = async (provider: "google" | "apple") => {
    console.log('[AuthScreen] Social auth button pressed:', provider);
    setLoading(true);
    setDebugStatus(`Signing in with ${provider}...`);
    
    try {
      if (provider === "google") {
        await signInWithGoogle();
      } else if (provider === "apple") {
        await signInWithApple();
      }
      setDebugStatus("Social login successful! Navigating...");
    } catch (error: any) {
      console.error('[AuthScreen] Social auth error:', error);
      setDebugStatus("Error: " + (error.message || "Authentication failed"));
      Alert.alert("Error", error.message || "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  const handleGuestSignIn = async () => {
    console.log('[AuthScreen] Guest sign in button pressed');
    setLoading(true);
    setDebugStatus("Signing in as guest...");
    
    try {
      await signInAsGuest();
      setDebugStatus("Guest login successful! Navigating...");
    } catch (error: any) {
      console.error('[AuthScreen] Guest sign in error:', error);
      setDebugStatus("Error: " + (error.message || "Guest sign in failed"));
      Alert.alert("Error", error.message || "Guest sign in failed");
    } finally {
      setLoading(false);
    }
  };

  const modeLabel = mode === "signin" ? "Sign In" : "Sign Up";
  const switchModeText = mode === "signin"
    ? "Don't have an account? Sign Up"
    : "Already have an account? Sign In";

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.content}>
          <Text style={styles.title}>Post-Op Radar</Text>
          <Text style={styles.subtitle}>{modeLabel}</Text>

          {mode === "signup" && (
            <TextInput
              style={styles.input}
              placeholder="Name (optional)"
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
              editable={!loading}
            />
          )}

          <TextInput
            style={styles.input}
            placeholder="Email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            editable={!loading}
          />

          <TextInput
            style={styles.input}
            placeholder="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoCapitalize="none"
            editable={!loading}
          />

          <TouchableOpacity
            style={[styles.primaryButton, loading && styles.buttonDisabled]}
            onPress={handleEmailAuth}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.primaryButtonText}>{modeLabel}</Text>
            )}
          </TouchableOpacity>

          {debugStatus ? (
            <Text style={styles.debugText}>{debugStatus}</Text>
          ) : null}

          <TouchableOpacity
            style={styles.switchModeButton}
            onPress={() => setMode(mode === "signin" ? "signup" : "signin")}
            disabled={loading}
          >
            <Text style={styles.switchModeText}>{switchModeText}</Text>
          </TouchableOpacity>

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or continue with</Text>
            <View style={styles.dividerLine} />
          </View>

          <TouchableOpacity
            style={styles.socialButton}
            onPress={() => handleSocialAuth("google")}
            disabled={loading}
          >
            <Text style={styles.socialButtonText}>Continue with Google</Text>
          </TouchableOpacity>

          {Platform.OS === "ios" && (
            <TouchableOpacity
              style={[styles.socialButton, styles.appleButton]}
              onPress={() => handleSocialAuth("apple")}
              disabled={loading}
            >
              <Text style={[styles.socialButtonText, styles.appleButtonText]}>
                Continue with Apple
              </Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.guestButton}
            onPress={handleGuestSignIn}
            disabled={loading}
          >
            <Text style={styles.guestButtonText}>Continue as Guest</Text>
          </TouchableOpacity>

          <Text style={styles.disclaimer}>
            For educational and demonstration purposes only.
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.background,
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    padding: spacing.xl,
    justifyContent: "center",
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    marginBottom: spacing.xs,
    textAlign: "center",
    color: colors.text,
  },
  subtitle: {
    fontSize: 24,
    fontWeight: "600",
    marginBottom: spacing.xl,
    textAlign: "center",
    color: colors.text,
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
    fontSize: 16,
    backgroundColor: colors.card,
    color: colors.text,
  },
  primaryButton: {
    height: 50,
    backgroundColor: colors.primary,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    marginTop: spacing.sm,
  },
  primaryButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  debugText: {
    marginTop: spacing.md,
    textAlign: "center",
    color: colors.primary,
    fontSize: 14,
    fontWeight: "500",
  },
  switchModeButton: {
    marginTop: spacing.md,
    alignItems: "center",
  },
  switchModeText: {
    color: colors.primary,
    fontSize: 14,
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: spacing.lg,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  dividerText: {
    marginHorizontal: spacing.md,
    color: colors.textSecondary,
    fontSize: 14,
  },
  socialButton: {
    height: 50,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: spacing.md,
    backgroundColor: colors.card,
  },
  socialButtonText: {
    fontSize: 16,
    color: colors.text,
    fontWeight: "500",
  },
  appleButton: {
    backgroundColor: "#000",
    borderColor: "#000",
  },
  appleButtonText: {
    color: "#fff",
  },
  guestButton: {
    height: 50,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    marginTop: spacing.sm,
    backgroundColor: "transparent",
  },
  guestButtonText: {
    fontSize: 16,
    color: colors.textSecondary,
    fontWeight: "500",
  },
  disclaimer: {
    marginTop: spacing.xl,
    textAlign: "center",
    color: colors.textSecondary,
    fontSize: 12,
    fontStyle: "italic",
  },
});
