
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
import { colors, typography, spacing, borderRadius, shadows } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import DateTimePicker from '@react-native-community/datetimepicker';
import { createPatient, getAllPatients } from '@/utils/localStorage';

export default function AddPatientScreen({ navigation }: any) {
  console.log('[AddPatient] AddPatientScreen rendered - Add Patient clicked');
  
  const [saving, setSaving] = useState(false);
  
  // Patient identification
  const [name, setName] = useState('');
  const [idStatement, setIdStatement] = useState('');
  
  // Operation details
  const [procedureType, setProcedureType] = useState('');
  const [preOpDiagnosis, setPreOpDiagnosis] = useState('');
  const [postOpDiagnosis, setPostOpDiagnosis] = useState('');
  const [specimensTaken, setSpecimensTaken] = useState('');
  const [estimatedBloodLoss, setEstimatedBloodLoss] = useState('');
  const [intraOpComplications, setIntraOpComplications] = useState('');
  const [postOpComplications, setPostOpComplications] = useState('');
  const [operationDateTime, setOperationDateTime] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [surgeon, setSurgeon] = useState('');
  const [anesthesiologist, setAnesthesiologist] = useState('');
  const [anesthesiaType, setAnesthesiaType] = useState('');
  
  // Current status
  const [clinicalStatus, setClinicalStatus] = useState('');
  const [hospitalLocation, setHospitalLocation] = useState('');
  const [postOpDay, setPostOpDay] = useState('1');
  
  // Initial alert status
  const [alertStatus, setAlertStatus] = useState<'green' | 'yellow' | 'red'>('green');
  
  const [nameError, setNameError] = useState('');

  const handleCancel = () => {
    console.log('[AddPatient] User tapped Cancel button');
    navigation.goBack();
  };

  const handleAddPatient = async () => {
    console.log('[AddPatient] ========== ADD PATIENT BUTTON TAPPED ==========');
    console.log('[AddPatient] User tapped Add Patient button');
    
    // Validate name is not empty
    const trimmedName = name.trim();
    if (!trimmedName) {
      console.log('[AddPatient] Validation failed: Name is empty');
      setNameError('Patient name is required');
      Alert.alert('Validation Error', 'Please enter a patient name');
      return;
    }
    
    setNameError('');
    setSaving(true);
    
    try {
      // Get current patient count BEFORE adding
      const patientsBefore = await getAllPatients();
      const countBefore = patientsBefore.length;
      console.log('[AddPatient] DEBUG: Patient count BEFORE adding:', countBefore);
      console.log('[AddPatient] DEBUG: Existing patient names:', patientsBefore.map(p => p.name).join(', '));
      
      // Combine intra-op and post-op complications into single field
      const combinedComplications = [
        intraOpComplications.trim() && `Intra-op: ${intraOpComplications.trim()}`,
        postOpComplications.trim() && `Post-op: ${postOpComplications.trim()}`
      ].filter(Boolean).join('\n') || '';
      
      const newPatientData = {
        name: trimmedName,
        idStatement: idStatement.trim() || '',
        procedureType: procedureType.trim() || 'Procedure Type',
        preOpDiagnosis: preOpDiagnosis.trim() || '',
        postOpDiagnosis: postOpDiagnosis.trim() || '',
        specimensTaken: specimensTaken.trim() || '',
        estimatedBloodLoss: estimatedBloodLoss.trim() || '',
        complications: combinedComplications,
        operationDateTime: operationDateTime,
        surgeon: surgeon.trim() || '',
        anesthesiologist: anesthesiologist.trim() || '',
        anesthesiaType: anesthesiaType.trim() || '',
        clinicalStatus: clinicalStatus.trim() || '',
        hospitalLocation: hospitalLocation.trim() || '',
        postOpDay: parseInt(postOpDay) || 1,
        alertStatus: alertStatus,
        statusMode: 'auto' as 'auto' | 'manual',
        manualStatus: alertStatus,
        vitals: [],
        labs: [],
        notes: '',
      };
      
      console.log('[AddPatient] Creating new patient in local storage:', newPatientData.name);
      const newPatient = await createPatient(newPatientData);
      
      console.log('[AddPatient] Patient created successfully in local storage:', newPatient.id);
      
      // Verify patient was saved by re-reading from storage
      const patientsAfter = await getAllPatients();
      const countAfter = patientsAfter.length;
      console.log('[AddPatient] DEBUG: Patient count AFTER adding:', countAfter);
      console.log('[AddPatient] DEBUG: All patient names now:', patientsAfter.map(p => p.name).join(', '));
      console.log('[AddPatient] DEBUG: Saving patients: previous=' + countBefore + ', new=' + countAfter);
      
      const verifiedPatient = patientsAfter.find(p => p.id === newPatient.id);
      
      if (!verifiedPatient) {
        throw new Error('Failed to verify patient was saved to local storage');
      }
      
      if (countAfter !== countBefore + 1) {
        console.error('[AddPatient] ERROR: Patient count did not increase correctly!');
        console.error('[AddPatient] Expected:', countBefore + 1, 'Got:', countAfter);
      }
      
      console.log('[AddPatient] Patient verified in local storage');
      console.log('[AddPatient] ========== ADD PATIENT SUCCESS ==========');
      
      Alert.alert('Success', `Patient "${trimmedName}" added successfully!`);
      
      // Navigate back to dashboard - it will auto-refresh via useFocusEffect
      console.log('[AddPatient] Navigating back to Home screen');
      navigation.navigate('Home');
    } catch (error: any) {
      console.error('[AddPatient] ========== ADD PATIENT ERROR ==========');
      console.error('[AddPatient] Error creating patient:', error);
      const errorMsg = error.message || 'Failed to add patient to local storage. Please try again.';
      Alert.alert('Storage Error', errorMsg, [
        { text: 'Retry', onPress: handleAddPatient },
        { text: 'Cancel', style: 'cancel' }
      ]);
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

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
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

  const dateText = formatDate(operationDateTime);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
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
              Enter complete patient details for post-operative monitoring
            </Text>
          </View>

          {/* Patient Identification */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Patient Identification</Text>
            
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

            <View style={styles.inputGroup}>
              <Text style={styles.label}>ID Statement / Medical History</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={idStatement}
                onChangeText={setIdStatement}
                placeholder="Brief 1-2 line ID statement (e.g., 65 y/o M with h/o HTN, DM2)"
                placeholderTextColor={colors.textLight}
                multiline
                numberOfLines={2}
              />
            </View>
          </View>

          {/* Operation Details */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Operation Details</Text>
            
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Procedure / Surgery Performed</Text>
              <TextInput
                style={styles.input}
                value={procedureType}
                onChangeText={setProcedureType}
                placeholder="e.g., Laparoscopic Cholecystectomy"
                placeholderTextColor={colors.textLight}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Pre-Operative Diagnosis</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={preOpDiagnosis}
                onChangeText={setPreOpDiagnosis}
                placeholder="Enter pre-operative diagnosis"
                placeholderTextColor={colors.textLight}
                multiline
                numberOfLines={2}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Post-Operative Diagnosis</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={postOpDiagnosis}
                onChangeText={setPostOpDiagnosis}
                placeholder="Enter post-operative diagnosis"
                placeholderTextColor={colors.textLight}
                multiline
                numberOfLines={2}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Specimens</Text>
              <TextInput
                style={styles.input}
                value={specimensTaken}
                onChangeText={setSpecimensTaken}
                placeholder="e.g., Gallbladder, Appendix"
                placeholderTextColor={colors.textLight}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Estimated Blood Loss (EBL)</Text>
              <TextInput
                style={styles.input}
                value={estimatedBloodLoss}
                onChangeText={setEstimatedBloodLoss}
                placeholder="e.g., 50 mL"
                placeholderTextColor={colors.textLight}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Intra-Operative Complications</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={intraOpComplications}
                onChangeText={setIntraOpComplications}
                placeholder="Any complications during surgery"
                placeholderTextColor={colors.textLight}
                multiline
                numberOfLines={2}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Post-Operative Complications</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={postOpComplications}
                onChangeText={setPostOpComplications}
                placeholder="Any complications after surgery"
                placeholderTextColor={colors.textLight}
                multiline
                numberOfLines={2}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Date and Time of Operation</Text>
              <TouchableOpacity
                style={styles.dateButton}
                onPress={() => {
                  console.log('[AddPatient] User tapped date picker');
                  setShowDatePicker(true);
                }}
              >
                <Text style={styles.dateButtonText}>{dateText}</Text>
                <IconSymbol
                  ios_icon_name="calendar"
                  android_material_icon_name="calendar-today"
                  size={20}
                  color={colors.iconSecondary}
                />
              </TouchableOpacity>
            </View>

            {showDatePicker && (
              <DateTimePicker
                value={operationDateTime}
                mode="datetime"
                display="default"
                onChange={(event, selectedDate) => {
                  setShowDatePicker(false);
                  if (selectedDate) {
                    console.log('[AddPatient] User selected date:', selectedDate);
                    setOperationDateTime(selectedDate);
                  }
                }}
              />
            )}

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Surgeon</Text>
              <TextInput
                style={styles.input}
                value={surgeon}
                onChangeText={setSurgeon}
                placeholder="e.g., Dr. Smith"
                placeholderTextColor={colors.textLight}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Anesthesiologist</Text>
              <TextInput
                style={styles.input}
                value={anesthesiologist}
                onChangeText={setAnesthesiologist}
                placeholder="e.g., Dr. Johnson"
                placeholderTextColor={colors.textLight}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Type of Anesthesia</Text>
              <TextInput
                style={styles.input}
                value={anesthesiaType}
                onChangeText={setAnesthesiaType}
                placeholder="e.g., General anesthesia, Spinal"
                placeholderTextColor={colors.textLight}
              />
            </View>
          </View>

          {/* Current Status */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Current Status</Text>
            
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Current Status of Patient</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={clinicalStatus}
                onChangeText={setClinicalStatus}
                placeholder="e.g., Stable, tolerating diet, ambulating"
                placeholderTextColor={colors.textLight}
                multiline
                numberOfLines={2}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Current Hospital Location</Text>
              <TextInput
                style={styles.input}
                value={hospitalLocation}
                onChangeText={setHospitalLocation}
                placeholder="e.g., Ward/ICU, Floor 4, Room 412"
                placeholderTextColor={colors.textLight}
              />
            </View>

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

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Initial Alert Status</Text>
              <View style={styles.statusGrid}>
                <TouchableOpacity
                  style={[
                    styles.statusCard,
                    { borderColor: greenBorderColor },
                    alertStatus === 'green' && { backgroundColor: greenBgColor, borderWidth: 3 }
                  ]}
                  onPress={() => {
                    console.log('[AddPatient] User selected green status');
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
                    console.log('[AddPatient] User selected yellow status');
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
                    console.log('[AddPatient] User selected red status');
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
                <React.Fragment>
                  <IconSymbol
                    ios_icon_name="plus.circle.fill"
                    android_material_icon_name="add-circle"
                    size={20}
                    color="#FFFFFF"
                  />
                  <Text style={styles.addButtonText}>Create Patient</Text>
                </React.Fragment>
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
  sectionTitle: {
    fontSize: typography.h4,
    fontWeight: typography.bold,
    color: colors.text,
    marginBottom: spacing.lg,
    letterSpacing: -0.2,
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
    marginBottom: spacing.sm,
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
  textArea: {
    minHeight: 80,
    paddingTop: spacing.md,
    textAlignVertical: 'top',
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
  dateButton: {
    backgroundColor: colors.backgroundAlt,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dateButtonText: {
    fontSize: typography.body,
    color: colors.text,
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
