
import React, { useState, useEffect, useCallback } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, useNavigation } from '@react-navigation/native';
import { colors, typography, spacing, borderRadius, shadows } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import { useUnsavedChanges } from '@/hooks/useUnsavedChanges';
import DateTimePicker from '@react-native-community/datetimepicker';

export default function PatientInfoScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { patientId } = route.params as { patientId: string };
  
  console.log('[PatientInfo] Screen mounted with patientId:', patientId);
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Patient information fields
  const [name, setName] = useState('');
  const [idStatement, setIdStatement] = useState('');
  const [procedureType, setProcedureType] = useState('');
  const [preOpDiagnosis, setPreOpDiagnosis] = useState('');
  const [postOpDiagnosis, setPostOpDiagnosis] = useState('');
  const [specimensTaken, setSpecimensTaken] = useState('');
  const [estimatedBloodLoss, setEstimatedBloodLoss] = useState('');
  const [complications, setComplications] = useState('');
  const [operationDateTime, setOperationDateTime] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [surgeon, setSurgeon] = useState('');
  const [anesthesiologist, setAnesthesiologist] = useState('');
  const [anesthesiaType, setAnesthesiaType] = useState('');
  const [clinicalStatus, setClinicalStatus] = useState('');
  const [hospitalLocation, setHospitalLocation] = useState('');
  
  // Manual status override fields
  const [statusMode, setStatusMode] = useState<'auto' | 'manual'>('auto');
  const [manualStatus, setManualStatus] = useState<'green' | 'orange' | 'red'>('green');
  
  // Track original values for dirty checking
  const [originalValues, setOriginalValues] = useState({
    name: '',
    idStatement: '',
    procedureType: '',
    preOpDiagnosis: '',
    postOpDiagnosis: '',
    specimensTaken: '',
    estimatedBloodLoss: '',
    complications: '',
    operationDateTime: new Date(),
    surgeon: '',
    anesthesiologist: '',
    anesthesiaType: '',
    clinicalStatus: '',
    hospitalLocation: '',
    statusMode: 'auto' as 'auto' | 'manual',
    manualStatus: 'green' as 'green' | 'orange' | 'red',
  });

  // Check if form has unsaved changes
  const hasUnsavedChanges =
    name !== originalValues.name ||
    idStatement !== originalValues.idStatement ||
    procedureType !== originalValues.procedureType ||
    preOpDiagnosis !== originalValues.preOpDiagnosis ||
    postOpDiagnosis !== originalValues.postOpDiagnosis ||
    specimensTaken !== originalValues.specimensTaken ||
    estimatedBloodLoss !== originalValues.estimatedBloodLoss ||
    complications !== originalValues.complications ||
    operationDateTime.getTime() !== originalValues.operationDateTime.getTime() ||
    surgeon !== originalValues.surgeon ||
    anesthesiologist !== originalValues.anesthesiologist ||
    anesthesiaType !== originalValues.anesthesiaType ||
    clinicalStatus !== originalValues.clinicalStatus ||
    hospitalLocation !== originalValues.hospitalLocation ||
    statusMode !== originalValues.statusMode ||
    manualStatus !== originalValues.manualStatus;

  const handleSave = useCallback(async (shouldNavigate: boolean = true) => {
    setSaving(true);
    try {
      const { updatePatient, getPatientById } = await import('@/utils/localStorage');
      
      const patientData = {
        name: name.trim() || 'Unnamed Patient',
        idStatement: idStatement.trim() || '',
        procedureType: procedureType.trim() || '',
        preOpDiagnosis: preOpDiagnosis.trim() || '',
        postOpDiagnosis: postOpDiagnosis.trim() || '',
        specimensTaken: specimensTaken.trim() || '',
        estimatedBloodLoss: estimatedBloodLoss.trim() || '',
        complications: complications.trim() || '',
        operationDateTime: operationDateTime,
        surgeon: surgeon.trim() || '',
        anesthesiologist: anesthesiologist.trim() || '',
        anesthesiaType: anesthesiaType.trim() || '',
        clinicalStatus: clinicalStatus.trim() || '',
        hospitalLocation: hospitalLocation.trim() || '',
        statusMode,
        manualStatus,
      };
      
      await updatePatient(patientId as string, patientData);
      
      const savedPatient = await getPatientById(patientId as string);
      
      if (!savedPatient) {
        throw new Error('Failed to verify patient was saved');
      }
      
      const savedValues = {
        name: savedPatient.name || '',
        idStatement: savedPatient.idStatement || '',
        procedureType: savedPatient.procedureType || '',
        preOpDiagnosis: savedPatient.preOpDiagnosis || '',
        postOpDiagnosis: savedPatient.postOpDiagnosis || '',
        specimensTaken: savedPatient.specimensTaken || '',
        estimatedBloodLoss: savedPatient.estimatedBloodLoss || '',
        complications: savedPatient.complications || '',
        operationDateTime: savedPatient.operationDateTime || new Date(),
        surgeon: savedPatient.surgeon || '',
        anesthesiologist: savedPatient.anesthesiologist || '',
        anesthesiaType: savedPatient.anesthesiaType || '',
        clinicalStatus: savedPatient.clinicalStatus || '',
        hospitalLocation: savedPatient.hospitalLocation || '',
        statusMode: savedPatient.statusMode || 'auto',
        manualStatus: savedPatient.manualStatus || 'green',
      };
      
      setName(savedValues.name);
      setIdStatement(savedValues.idStatement);
      setProcedureType(savedValues.procedureType);
      setPreOpDiagnosis(savedValues.preOpDiagnosis);
      setPostOpDiagnosis(savedValues.postOpDiagnosis);
      setSpecimensTaken(savedValues.specimensTaken);
      setEstimatedBloodLoss(savedValues.estimatedBloodLoss);
      setComplications(savedValues.complications);
      setOperationDateTime(savedValues.operationDateTime);
      setSurgeon(savedValues.surgeon);
      setAnesthesiologist(savedValues.anesthesiologist);
      setAnesthesiaType(savedValues.anesthesiaType);
      setClinicalStatus(savedValues.clinicalStatus);
      setHospitalLocation(savedValues.hospitalLocation);
      setStatusMode(savedValues.statusMode);
      setManualStatus(savedValues.manualStatus);
      setOriginalValues(savedValues);
      
      Alert.alert('Success', 'Patient information saved successfully!');
      
      if (shouldNavigate) {
        navigation.goBack();
      }
    } catch (error: any) {
      console.error('[PatientInfo] Error saving patient info:', error);
      Alert.alert('Storage Error', 'Failed to save patient information to local storage. Please try again.', [
        { text: 'Retry', onPress: () => handleSave(shouldNavigate) },
        { text: 'Cancel', style: 'cancel' }
      ]);
      throw error;
    } finally {
      setSaving(false);
    }
  }, [patientId, name, idStatement, procedureType, preOpDiagnosis, postOpDiagnosis, specimensTaken, estimatedBloodLoss, complications, operationDateTime, surgeon, anesthesiologist, anesthesiaType, clinicalStatus, hospitalLocation, statusMode, manualStatus, navigation]);

  const loadPatientInfo = useCallback(async () => {
    console.log('[PatientInfo] Loading patient info for patientId:', patientId);
    setLoading(true);
    try {
      const { getPatientById } = await import('@/utils/localStorage');
      const patient = await getPatientById(patientId as string);
      
      if (!patient) {
        Alert.alert('Error', 'Patient not found', [
          { text: 'OK', onPress: () => navigation.goBack() }
        ]);
        return;
      }
      
      const values = {
        name: patient.name || '',
        idStatement: patient.idStatement || '',
        procedureType: patient.procedureType || '',
        preOpDiagnosis: patient.preOpDiagnosis || '',
        postOpDiagnosis: patient.postOpDiagnosis || '',
        specimensTaken: patient.specimensTaken || '',
        estimatedBloodLoss: patient.estimatedBloodLoss || '',
        complications: patient.complications || '',
        operationDateTime: patient.operationDateTime || new Date(),
        surgeon: patient.surgeon || '',
        anesthesiologist: patient.anesthesiologist || '',
        anesthesiaType: patient.anesthesiaType || '',
        clinicalStatus: patient.clinicalStatus || '',
        hospitalLocation: patient.hospitalLocation || '',
        statusMode: patient.statusMode || 'auto',
        manualStatus: patient.manualStatus || 'green',
      };
      
      setName(values.name);
      setIdStatement(values.idStatement);
      setProcedureType(values.procedureType);
      setPreOpDiagnosis(values.preOpDiagnosis);
      setPostOpDiagnosis(values.postOpDiagnosis);
      setSpecimensTaken(values.specimensTaken);
      setEstimatedBloodLoss(values.estimatedBloodLoss);
      setComplications(values.complications);
      setOperationDateTime(values.operationDateTime);
      setSurgeon(values.surgeon);
      setAnesthesiologist(values.anesthesiologist);
      setAnesthesiaType(values.anesthesiaType);
      setClinicalStatus(values.clinicalStatus);
      setHospitalLocation(values.hospitalLocation);
      setStatusMode(values.statusMode);
      setManualStatus(values.manualStatus);
      setOriginalValues(values);
    } catch (error: any) {
      console.error('[PatientInfo] Error loading patient info:', error);
      Alert.alert('Storage Error', 'Failed to load patient information from local storage', [
        { text: 'Retry', onPress: loadPatientInfo },
        { text: 'Cancel', onPress: () => navigation.goBack() }
      ]);
    } finally {
      setLoading(false);
    }
  }, [patientId, navigation]);

  // Unsaved changes protection
  const { handleBackPress, isNavigating } = useUnsavedChanges({
    hasUnsavedChanges,
    onSave: async () => {
      await handleSave(false); // Save without navigating
    },
    onDiscard: () => {
      // Revert to original values
      setName(originalValues.name);
      setIdStatement(originalValues.idStatement);
      setProcedureType(originalValues.procedureType);
      setPreOpDiagnosis(originalValues.preOpDiagnosis);
      setPostOpDiagnosis(originalValues.postOpDiagnosis);
      setSpecimensTaken(originalValues.specimensTaken);
      setEstimatedBloodLoss(originalValues.estimatedBloodLoss);
      setComplications(originalValues.complications);
      setOperationDateTime(originalValues.operationDateTime);
      setSurgeon(originalValues.surgeon);
      setAnesthesiologist(originalValues.anesthesiologist);
      setAnesthesiaType(originalValues.anesthesiaType);
      setClinicalStatus(originalValues.clinicalStatus);
      setHospitalLocation(originalValues.hospitalLocation);
      setStatusMode(originalValues.statusMode);
      setManualStatus(originalValues.manualStatus);
    },
  });

  useEffect(() => {
    loadPatientInfo();
  }, [loadPatientInfo]);

  const handleDelete = () => {
    Alert.alert(
      'Delete Patient',
      'Are you sure you want to permanently delete this patient and all associated data? This action cannot be undone.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const { deletePatient, getPatientById } = await import('@/utils/localStorage');
              
              await deletePatient(patientId as string);
              
              const deletedPatient = await getPatientById(patientId as string);
              if (deletedPatient) {
                throw new Error('Failed to verify patient was deleted');
              }
              
              Alert.alert('Success', 'Patient deleted successfully');
              navigation.navigate('Home' as never);
            } catch (error: any) {
              console.error('[PatientInfo] Error deleting patient:', error);
              Alert.alert('Storage Error', 'Failed to delete patient from local storage. Please try again.', [
                { text: 'Retry', onPress: handleDelete },
                { text: 'Cancel', style: 'cancel' }
              ]);
            }
          },
        },
      ]
    );
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

  const dateText = formatDate(operationDateTime);
  const isSaving = saving || isNavigating;

  // Set header options
  useEffect(() => {
    navigation.setOptions({
      headerShown: true,
      title: 'Patient Information',
      headerBackTitle: 'Back',
      headerStyle: {
        backgroundColor: colors.backgroundAlt,
      },
      headerTintColor: colors.primary,
      headerLeft: () => (
        <TouchableOpacity onPress={handleBackPress} style={styles.backButton}>
          <IconSymbol
            ios_icon_name="chevron.left"
            android_material_icon_name="arrow-back"
            size={24}
            color={colors.primary}
          />
        </TouchableOpacity>
      ),
    });
  }, [navigation, handleBackPress]);

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading patient information...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Patient Name */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Patient Identification</Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Patient Name</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="Enter patient name"
              placeholderTextColor={colors.textLight}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>ID Statement</Text>
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
            <Text style={styles.label}>Type of Surgery</Text>
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
            <Text style={styles.label}>Specimens Taken</Text>
            <TextInput
              style={styles.input}
              value={specimensTaken}
              onChangeText={setSpecimensTaken}
              placeholder="e.g., Gallbladder, Appendix"
              placeholderTextColor={colors.textLight}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Estimated Blood Loss</Text>
            <TextInput
              style={styles.input}
              value={estimatedBloodLoss}
              onChangeText={setEstimatedBloodLoss}
              placeholder="e.g., 50 mL"
              placeholderTextColor={colors.textLight}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Complications</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={complications}
              onChangeText={setComplications}
              placeholder="Intra-operative or post-operative complications"
              placeholderTextColor={colors.textLight}
              multiline
              numberOfLines={3}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Date and Time of Operation</Text>
            <TouchableOpacity
              style={styles.dateButton}
              onPress={() => setShowDatePicker(true)}
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
            <Text style={styles.label}>Clinical Status</Text>
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
            <Text style={styles.label}>Hospital Location</Text>
            <TextInput
              style={styles.input}
              value={hospitalLocation}
              onChangeText={setHospitalLocation}
              placeholder="e.g., Floor 4, Room 412"
              placeholderTextColor={colors.textLight}
            />
          </View>
        </View>

        {/* Manual Status Override */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Alert Status Override</Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Status Mode</Text>
            <View style={styles.statusModeToggle}>
              <TouchableOpacity
                style={[styles.statusModeButton, statusMode === 'auto' && styles.statusModeButtonActive]}
                onPress={() => setStatusMode('auto')}
              >
                <IconSymbol
                  ios_icon_name="wand.and.stars"
                  android_material_icon_name="auto-fix-high"
                  size={18}
                  color={statusMode === 'auto' ? '#FFFFFF' : colors.textSecondary}
                />
                <Text style={[styles.statusModeButtonText, statusMode === 'auto' && styles.statusModeButtonTextActive]}>
                  Auto (Rule-Based)
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.statusModeButton, statusMode === 'manual' && styles.statusModeButtonActive]}
                onPress={() => setStatusMode('manual')}
              >
                <IconSymbol
                  ios_icon_name="hand.raised.fill"
                  android_material_icon_name="pan-tool"
                  size={18}
                  color={statusMode === 'manual' ? '#FFFFFF' : colors.textSecondary}
                />
                <Text style={[styles.statusModeButtonText, statusMode === 'manual' && styles.statusModeButtonTextActive]}>
                  Manual Override
                </Text>
              </TouchableOpacity>
            </View>
            
            {statusMode === 'auto' && (
              <Text style={styles.helperText}>
                Status is automatically calculated based on vital signs and lab trends
              </Text>
            )}
            {statusMode === 'manual' && (
              <Text style={styles.helperText}>
                You are manually controlling the alert status. Auto-calculation is disabled.
              </Text>
            )}
          </View>

          {statusMode === 'manual' && (
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Manual Status</Text>
              <View style={styles.statusGrid}>
                <TouchableOpacity
                  style={[
                    styles.statusCard,
                    { borderColor: colors.alertGreenBorder },
                    manualStatus === 'green' && { backgroundColor: colors.alertGreenBg, borderWidth: 3 }
                  ]}
                  onPress={() => setManualStatus('green')}
                >
                  <IconSymbol
                    ios_icon_name="checkmark.circle.fill"
                    android_material_icon_name="check-circle"
                    size={32}
                    color={colors.alertGreen}
                  />
                  <Text style={[styles.statusCardTitle, { color: colors.alertGreen }]}>
                    Stable
                  </Text>
                  <Text style={styles.statusCardSubtitle}>No concerns</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.statusCard,
                    { borderColor: colors.alertYellowBorder },
                    manualStatus === 'orange' && { backgroundColor: colors.alertYellowBg, borderWidth: 3 }
                  ]}
                  onPress={() => setManualStatus('orange')}
                >
                  <IconSymbol
                    ios_icon_name="exclamationmark.triangle.fill"
                    android_material_icon_name="warning"
                    size={32}
                    color={colors.alertYellow}
                  />
                  <Text style={[styles.statusCardTitle, { color: colors.alertYellow }]}>
                    Monitor
                  </Text>
                  <Text style={styles.statusCardSubtitle}>Watch closely</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.statusCard,
                    { borderColor: colors.alertRedBorder },
                    manualStatus === 'red' && { backgroundColor: colors.alertRedBg, borderWidth: 3 }
                  ]}
                  onPress={() => setManualStatus('red')}
                >
                  <IconSymbol
                    ios_icon_name="exclamationmark.octagon.fill"
                    android_material_icon_name="error"
                    size={32}
                    color={colors.alertRed}
                  />
                  <Text style={[styles.statusCardTitle, { color: colors.alertRed }]}>
                    Reassess
                  </Text>
                  <Text style={styles.statusCardSubtitle}>Urgent review</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>

        {/* Action Buttons */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
            onPress={() => handleSave(true)}
            disabled={isSaving}
          >
            {isSaving ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <IconSymbol
                  ios_icon_name="checkmark"
                  android_material_icon_name="check"
                  size={20}
                  color="#FFFFFF"
                />
                <Text style={styles.saveButtonText}>Save Changes</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
            <IconSymbol
              ios_icon_name="trash"
              android_material_icon_name="delete"
              size={20}
              color={colors.error}
            />
            <Text style={styles.deleteButtonText}>Delete Patient</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
    paddingTop: Platform.OS === 'android' ? 48 : 0,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: spacing.xxxxl,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.lg,
  },
  loadingText: {
    fontSize: typography.body,
    color: colors.textSecondary,
  },
  section: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xxl,
  },
  sectionTitle: {
    fontSize: typography.h4,
    fontWeight: typography.bold,
    color: colors.text,
    marginBottom: spacing.lg,
    letterSpacing: -0.2,
  },
  inputGroup: {
    marginBottom: spacing.lg,
  },
  label: {
    fontSize: typography.bodySmall,
    fontWeight: typography.semibold,
    color: colors.text,
    marginBottom: spacing.sm,
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
  actions: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xxxl,
    gap: spacing.md,
  },
  saveButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.lg,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.sm,
    ...shadows.md,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    fontSize: typography.body,
    fontWeight: typography.bold,
    color: '#FFFFFF',
  },
  deleteButton: {
    backgroundColor: colors.backgroundAlt,
    borderWidth: 2,
    borderColor: colors.error,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.lg,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.sm,
  },
  deleteButtonText: {
    fontSize: typography.body,
    fontWeight: typography.bold,
    color: colors.error,
  },
  bottomSpacer: {
    height: spacing.xxxxl,
  },
  statusModeToggle: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  statusModeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.backgroundAlt,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
  },
  statusModeButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  statusModeButtonText: {
    fontSize: typography.bodySmall,
    fontWeight: typography.semibold,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  statusModeButtonTextActive: {
    color: '#FFFFFF',
  },
  helperText: {
    fontSize: typography.caption,
    fontWeight: typography.regular,
    color: colors.textLight,
    marginTop: spacing.sm,
    lineHeight: 18,
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
    fontSize: typography.body,
    fontWeight: typography.bold,
    textAlign: 'center',
  },
  statusCardSubtitle: {
    fontSize: typography.tiny,
    fontWeight: typography.regular,
    color: colors.textLight,
    textAlign: 'center',
  },
  backButton: {
    padding: spacing.sm,
  },
});
