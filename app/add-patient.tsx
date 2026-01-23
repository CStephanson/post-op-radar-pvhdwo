
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Platform,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, Stack } from 'expo-router';
import { colors, typography, spacing, borderRadius, shadows } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';

export default function AddPatientScreen() {
  console.log('AddPatientScreen rendered');
  const router = useRouter();
  
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState('');
  const [procedureType, setProcedureType] = useState('');
  const [postOpDay, setPostOpDay] = useState('1');
  const [hospitalLocation, setHospitalLocation] = useState('');
  const [alertStatus, setAlertStatus] = useState<'green' | 'yellow' | 'red'>('green');
  const [nameError, setNameError] = useState('');

  const handleCancel = () => {
    console.log('User tapped Cancel button');
    router.back();
  };

  const handleAddPatient = async () => {
    console.log('User tapped Add Patient button');
    
    // Validate name is not empty
    const trimmedName = name.trim();
    if (!trimmedName) {
      console.log('Validation failed: Name is empty');
      setNameError('Patient name is required');
      Alert.alert('Validation Error', 'Please enter a patient name');
      return;
    }
    
    setNameError('');
    setSaving(true);
    
    try {
      const { authenticatedPost } = await import('@/utils/api');
      
      const newPatientData = {
        name: trimmedName,
        procedureType: procedureType.trim() || 'Procedure Type',
        postOpDay: parseInt(postOpDay) || 1,
        alertStatus: alertStatus,
        hospitalLocation: hospitalLocation.trim() || '',
      };
      
      console.log('Creating new patient with data:', newPatientData);
      const newPatient = await authenticatedPost<any>('/api/patients', newPatientData);
      
      console.log('Patient created successfully:', newPatient);
      Alert.alert('Success', `Patient "${trimmedName}" added successfully!`);
      
      // Navigate back to dashboard
      router.replace('/(tabs)/(home)/');
    } catch (error: any) {
      console.error('Error creating patient:', error);
      Alert.alert('Error', error.message || 'Failed to add patient. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const getAlertColor = (status: 'green' | 'yellow' | 'red') => {
    if (status === 'green') return colors.alertGreen;
    if (status === 'yellow') return colors.alertYellow;
    return colors.alertRed;
  };

  const getAlertBgColor = (status: 'green' | 'yellow' | 'red') => {
    if (status === 'green') return colors.alertGreenBg;
    if (status === 'yellow') return colors.alertYellowBg;
    return colors.alertRedBg;
  };

  const getAlertBorderColor = (status: 'green' | 'yellow' | 'red') => {
    if (status === 'green') return colors.alertGreenBorder;
    if (status === 'yellow') return colors.alertYellowBorder;
    return colors.alertRedBorder;
  };

  const getAlertLabel = (status: 'green' | 'yellow' | 'red') => {
    if (status === 'green') return 'Stable';
    if (status === 'yellow') return 'Monitor';
    return 'Reassess';
  };

  const getAlertIcon = (status: 'green' | 'yellow' | 'red') => {
    if (status === 'green') return 'check-circle';
    if (status === 'yellow') return 'warning';
    return 'error';
  };

  const greenColor = getAlertColor('green');
  const greenBgColor = getAlertBgColor('green');
  const greenBorderColor = getAlertBorderColor('green');
  const greenLabel = getAlertLabel('green');
  const greenIcon = getAlertIcon('green');

  const yellowColor = getAlertColor('yellow');
  const yellowBgColor = getAlertBgColor('yellow');
  const yellowBorderColor = getAlertBorderColor('yellow');
  const yellowLabel = getAlertLabel('yellow');
  const yellowIcon = getAlertIcon('yellow');

  const redColor = getAlertColor('red');
  const redBgColor = getAlertBgColor('red');
  const redBorderColor = getAlertBorderColor('red');
  const redLabel = getAlertLabel('red');
  const redIcon = getAlertIcon('red');

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Add Patient',
          headerBackTitle: 'Back',
          headerStyle: {
            backgroundColor: colors.backgroundAlt,
          },
          headerTintColor: colors.primary,
        }}
      />
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <Text style={styles.headerTitle}>New Patient Information</Text>
            <Text style={styles.headerSubtitle}>
              Enter patient details to begin monitoring post-operative recovery
            </Text>
          </View>

          {/* Patient Name (Required) */}
          <View style={styles.section}>
            <View style={styles.inputGroup}>
              <View style={styles.labelRow}>
                <Text style={styles.label}>Patient Name</Text>
                <View style={styles.requiredBadge}>
                  <Text style={styles.requiredText}>REQUIRED</Text>
                </View>
              </View>
              <TextInput
                style={[styles.input, nameError ? styles.inputError : null]}
                value={name}
                onChangeText={(text) => {
                  setName(text);
                  if (nameError) setNameError('');
                }}
                placeholder="Enter patient name"
                placeholderTextColor={colors.textLight}
                autoFocus
              />
              {nameError ? (
                <View style={styles.errorContainer}>
                  <IconSymbol
                    ios_icon_name="exclamationmark.circle.fill"
                    android_material_icon_name="error"
                    size={14}
                    color={colors.error}
                  />
                  <Text style={styles.errorText}>{nameError}</Text>
                </View>
              ) : null}
            </View>

            {/* Procedure Type (Optional) */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Procedure Type</Text>
              <TextInput
                style={styles.input}
                value={procedureType}
                onChangeText={setProcedureType}
                placeholder="e.g., Laparoscopic Cholecystectomy (optional)"
                placeholderTextColor={colors.textLight}
              />
            </View>

            {/* Post-Op Day (Optional) */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Post-Operative Day (POD)</Text>
              <TextInput
                style={styles.input}
                value={postOpDay}
                onChangeText={setPostOpDay}
                placeholder="1"
                placeholderTextColor={colors.textLight}
                keyboardType="number-pad"
              />
            </View>

            {/* Hospital Location (Optional) */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Hospital Location</Text>
              <TextInput
                style={styles.input}
                value={hospitalLocation}
                onChangeText={setHospitalLocation}
                placeholder="e.g., Floor 4, Room 412 (optional)"
                placeholderTextColor={colors.textLight}
              />
            </View>

            {/* Initial Status (Optional) */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Initial Status</Text>
              <View style={styles.statusGrid}>
                <TouchableOpacity
                  style={[
                    styles.statusCard,
                    { borderColor: greenBorderColor },
                    alertStatus === 'green' && { backgroundColor: greenBgColor, borderWidth: 3 }
                  ]}
                  onPress={() => {
                    console.log('User selected green status');
                    setAlertStatus('green');
                  }}
                >
                  <IconSymbol
                    ios_icon_name="checkmark.circle.fill"
                    android_material_icon_name={greenIcon}
                    size={28}
                    color={greenColor}
                  />
                  <Text style={[styles.statusCardTitle, { color: greenColor }]}>
                    {greenLabel}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.statusCard,
                    { borderColor: yellowBorderColor },
                    alertStatus === 'yellow' && { backgroundColor: yellowBgColor, borderWidth: 3 }
                  ]}
                  onPress={() => {
                    console.log('User selected yellow status');
                    setAlertStatus('yellow');
                  }}
                >
                  <IconSymbol
                    ios_icon_name="exclamationmark.triangle.fill"
                    android_material_icon_name={yellowIcon}
                    size={28}
                    color={yellowColor}
                  />
                  <Text style={[styles.statusCardTitle, { color: yellowColor }]}>
                    {yellowLabel}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.statusCard,
                    { borderColor: redBorderColor },
                    alertStatus === 'red' && { backgroundColor: redBgColor, borderWidth: 3 }
                  ]}
                  onPress={() => {
                    console.log('User selected red status');
                    setAlertStatus('red');
                  }}
                >
                  <IconSymbol
                    ios_icon_name="exclamationmark.octagon.fill"
                    android_material_icon_name={redIcon}
                    size={28}
                    color={redColor}
                  />
                  <Text style={[styles.statusCardTitle, { color: redColor }]}>
                    {redLabel}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.addButton, saving && styles.addButtonDisabled]}
              onPress={handleAddPatient}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <IconSymbol
                    ios_icon_name="plus.circle.fill"
                    android_material_icon_name="add-circle"
                    size={20}
                    color="#FFFFFF"
                  />
                  <Text style={styles.addButtonText}>Add Patient</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.cancelButton}
              onPress={handleCancel}
              disabled={saving}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.bottomSpacer} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
    paddingTop: Platform.OS === 'android' ? 48 : 0,
  },
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: spacing.xxxxl,
  },
  header: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xxl,
    paddingBottom: spacing.lg,
  },
  headerTitle: {
    fontSize: typography.h2,
    fontWeight: typography.bold,
    color: colors.text,
    marginBottom: spacing.sm,
    letterSpacing: -0.4,
  },
  headerSubtitle: {
    fontSize: typography.body,
    fontWeight: typography.regular,
    color: colors.textSecondary,
    lineHeight: 22,
  },
  section: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
  },
  inputGroup: {
    marginBottom: spacing.lg + spacing.sm,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  label: {
    fontSize: typography.bodySmall,
    fontWeight: typography.semibold,
    color: colors.text,
  },
  requiredBadge: {
    backgroundColor: colors.error,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.xs,
  },
  requiredText: {
    fontSize: 9,
    fontWeight: typography.bold,
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: colors.backgroundAlt,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    fontSize: typography.body,
    color: colors.text,
  },
  inputError: {
    borderColor: colors.error,
    borderWidth: 2,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  errorText: {
    fontSize: typography.caption,
    fontWeight: typography.medium,
    color: colors.error,
  },
  statusGrid: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  statusCard: {
    flex: 1,
    backgroundColor: colors.backgroundAlt,
    borderWidth: 2,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    alignItems: 'center',
    gap: spacing.sm,
  },
  statusCardTitle: {
    fontSize: typography.bodySmall,
    fontWeight: typography.bold,
    textAlign: 'center',
  },
  actions: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xxl,
    gap: spacing.md,
  },
  addButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.lg,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.sm,
    ...shadows.md,
  },
  addButtonDisabled: {
    opacity: 0.6,
  },
  addButtonText: {
    fontSize: typography.body,
    fontWeight: typography.bold,
    color: '#FFFFFF',
  },
  cancelButton: {
    backgroundColor: colors.backgroundAlt,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: typography.body,
    fontWeight: typography.bold,
    color: colors.textSecondary,
  },
  bottomSpacer: {
    height: spacing.xxxxl,
  },
});
