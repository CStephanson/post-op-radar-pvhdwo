
import { StyleSheet, ViewStyle, TextStyle } from 'react-native';

// Refined color scheme - distinctive yet calm, professional, and clinically credible
export const colors = {
  // Primary colors - sophisticated teal with depth
  primary: '#0D9488',        // Teal-600 - distinctive yet professional
  primaryDark: '#0F766E',    // Teal-700 - deeper accent
  primaryLight: '#14B8A6',   // Teal-500 - lighter accent
  
  // Secondary colors - warm slate for contrast
  secondary: '#475569',      // Slate-600
  secondaryDark: '#334155',  // Slate-700
  
  // Accent colors - controlled pops of color
  accent: '#06B6D4',         // Cyan-500 - fresh, clinical
  accentWarm: '#F59E0B',     // Amber-500 - warm highlight
  
  // Backgrounds - calm, breathable
  background: '#F8FAFC',     // Slate-50 - very light, airy
  backgroundAlt: '#FFFFFF',  // Pure white
  card: '#FFFFFF',           // White cards
  cardHover: '#F1F5F9',      // Slate-100 - subtle hover
  
  // Text - clear hierarchy with warmth
  text: '#0F172A',           // Slate-900 - deep, readable
  textSecondary: '#475569',  // Slate-600 - medium gray
  textLight: '#94A3B8',      // Slate-400 - light gray
  textMuted: '#CBD5E1',      // Slate-300 - very light
  
  // Alert status colors - integrated into the color system
  alertGreen: '#059669',     // Emerald-600 - calm, reassuring
  alertYellow: '#F59E0B',    // Amber-500 - warm, attentive
  alertRed: '#DC2626',       // Red-600 - clear, not alarming
  
  // Alert backgrounds - soft, integrated
  alertGreenBg: '#ECFDF5',   // Emerald-50
  alertYellowBg: '#FFFBEB',  // Amber-50
  alertRedBg: '#FEF2F2',     // Red-50
  
  // Alert borders - subtle definition
  alertGreenBorder: '#A7F3D0',  // Emerald-200
  alertYellowBorder: '#FDE68A', // Amber-200
  alertRedBorder: '#FECACA',    // Red-200
  
  // Borders and dividers - refined, minimal
  border: '#E2E8F0',         // Slate-200
  borderLight: '#F1F5F9',    // Slate-100
  divider: '#CBD5E1',        // Slate-300
  
  // Functional colors
  success: '#059669',        // Emerald-600
  warning: '#F59E0B',        // Amber-500
  error: '#DC2626',          // Red-600
  info: '#0891B2',           // Cyan-600
  
  // Icon colors - integrated palette
  iconPrimary: '#0D9488',    // Teal-600
  iconSecondary: '#64748B',  // Slate-500
  iconLight: '#94A3B8',      // Slate-400
  
  // Special highlights
  highlight: '#FEF3C7',      // Amber-100 - for "last viewed" badge
  highlightBorder: '#FCD34D', // Amber-300
};

export const typography = {
  // Font sizes - refined hierarchy
  h1: 28,
  h2: 22,
  h3: 19,
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
  xs: 4,
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
