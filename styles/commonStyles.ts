
import { StyleSheet, ViewStyle, TextStyle } from 'react-native';

// Medical/Hospital-appropriate color scheme - calm, professional, credible
export const colors = {
  // Primary colors - calm, professional medical blue
  primary: '#0369A1',        // Deep medical blue
  secondary: '#0C4A6E',      // Darker blue
  accent: '#0EA5E9',         // Bright accent blue
  
  // Backgrounds - soft, clean, breathable
  background: '#F8FAFC',     // Very light gray-blue (almost white)
  backgroundAlt: '#FFFFFF',  // Pure white
  card: '#FFFFFF',           // White cards
  cardHover: '#F1F5F9',      // Subtle hover state
  
  // Text - clear hierarchy
  text: '#0F172A',           // Almost black (high contrast)
  textSecondary: '#475569',  // Medium gray
  textLight: '#94A3B8',      // Light gray
  textMuted: '#CBD5E1',      // Very light gray
  
  // Alert status colors - clear but not alarming
  alertGreen: '#059669',     // Calm green - safe
  alertYellow: '#D97706',    // Warm amber - caution
  alertRed: '#DC2626',       // Clear red - attention needed
  
  // Alert backgrounds - very subtle, calming
  alertGreenBg: '#ECFDF5',   // Very light green
  alertYellowBg: '#FFFBEB',  // Very light amber
  alertRedBg: '#FEF2F2',     // Very light red
  
  // Alert borders - subtle accent
  alertGreenBorder: '#A7F3D0',
  alertYellowBorder: '#FDE68A',
  alertRedBorder: '#FECACA',
  
  // Borders and dividers - minimal, clean
  border: '#E2E8F0',
  borderLight: '#F1F5F9',
  divider: '#CBD5E1',
  
  // Functional colors
  success: '#059669',
  warning: '#D97706',
  error: '#DC2626',
  info: '#0284C7',
  
  // Icon colors
  iconPrimary: '#0369A1',
  iconSecondary: '#64748B',
  iconLight: '#94A3B8',
};

export const typography = {
  // Font sizes - clear hierarchy, refined for clinical use
  h1: 26,
  h2: 20,
  h3: 18,
  h4: 17,
  h5: 16,
  body: 15,
  bodySmall: 14,
  caption: 13,
  tiny: 11,
  
  // Font weights
  light: '300' as const,
  regular: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  xxxxl: 48,
};

export const borderRadius = {
  sm: 6,
  md: 10,
  lg: 14,
  xl: 18,
  full: 9999,
};

export const shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
};

export const commonStyles = StyleSheet.create({
  wrapper: {
    backgroundColor: colors.background,
    width: '100%',
    height: '100%',
  },
  container: {
    flex: 1,
    backgroundColor: colors.background,
    width: '100%',
    height: '100%',
  },
  content: {
    flex: 1,
    width: '100%',
    maxWidth: 800,
    alignSelf: 'center',
  },
  title: {
    fontSize: typography.h1,
    fontWeight: typography.bold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: typography.h4,
    fontWeight: typography.medium,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  text: {
    fontSize: typography.body,
    fontWeight: typography.regular,
    color: colors.text,
    lineHeight: 22,
  },
  textSecondary: {
    fontSize: typography.body,
    fontWeight: typography.regular,
    color: colors.textSecondary,
    lineHeight: 22,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginVertical: spacing.sm,
    marginHorizontal: spacing.lg,
    ...shadows.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  section: {
    width: '100%',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
});
