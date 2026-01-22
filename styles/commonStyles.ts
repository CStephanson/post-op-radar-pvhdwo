
import { StyleSheet, ViewStyle, TextStyle } from 'react-native';

// Medical/Hospital-appropriate color scheme
export const colors = {
  // Primary colors - calm, professional
  primary: '#2563EB',        // Medical blue
  secondary: '#1E40AF',      // Darker blue
  accent: '#60A5FA',         // Light blue
  
  // Backgrounds
  background: '#F8FAFC',     // Very light gray-blue
  backgroundAlt: '#FFFFFF',  // Pure white
  card: '#FFFFFF',           // White cards
  
  // Text
  text: '#1E293B',           // Dark slate
  textSecondary: '#64748B',  // Medium slate
  textLight: '#94A3B8',      // Light slate
  
  // Alert status colors
  alertGreen: '#10B981',     // Safe - no concerning trends
  alertYellow: '#F59E0B',    // Monitor closely
  alertRed: '#EF4444',       // Consider reassessment
  
  // Alert backgrounds (lighter versions)
  alertGreenBg: '#D1FAE5',
  alertYellowBg: '#FEF3C7',
  alertRedBg: '#FEE2E2',
  
  // Borders and dividers
  border: '#E2E8F0',
  divider: '#CBD5E1',
  
  // Functional colors
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  info: '#3B82F6',
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
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.textSecondary,
    marginBottom: 4,
  },
  text: {
    fontSize: 14,
    fontWeight: '400',
    color: colors.text,
    lineHeight: 20,
  },
  textSecondary: {
    fontSize: 14,
    fontWeight: '400',
    color: colors.textSecondary,
    lineHeight: 20,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
    marginHorizontal: 16,
    boxShadow: '0px 1px 3px rgba(0, 0, 0, 0.1)',
    elevation: 2,
    borderWidth: 1,
    borderColor: colors.border,
  },
  section: {
    width: '100%',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
});
