
import React, { useState, useEffect } from 'react';
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
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import { colors, typography, spacing, borderRadius, shadows } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import DateTimePicker from '@react-native-community/datetimepicker';

export default function PatientInfoScreen() {
  console.log('PatientInfoScreen rendered');
  const router = useRouter();
  const { id } = useLocalSearchParams();
  
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

  useEffect(() => {
    loadPatientInfo();
  }, [id]);

  const loadPatientInfo = async () => {
    console.log('Loading patient info for ID:', id);
    setLoading(true);
    try {
      const { authenticatedGet } = await import('@/utils/api');
      const patient = await authenticatedGet<any>(`/api/patients/${id}`);
      
      setName(patient.name || '');
      setIdStatement(patient.idStatement || '');
      setProcedureType(patient.procedureType || '');
      setPreOpDiagnosis(patient.preOpDiagnosis || '');
      setPostOpDiagnosis(patient.postOpDiagnosis || '');
      setSpecimensTaken(patient.specimensTaken || '');
      setEstimatedBloodLoss(patient.estimatedBloodLoss || '');
      setComplications(patient.complications || '');
      setOperationDateTime(patient.operationDateTime ? new Date(patient.operationDateTime) : new Date());
      setSurgeon(patient.surgeon || '');
      setAnesthesiologist(patient.anesthesiologist || '');
      setAnesthesiaType(patient.anesthesiaType || '');
      setClinicalStatus(patient.clinicalStatus || '');
      setHospitalLocation(patient.hospitalLocation || '');
    } catch (error: any) {
      console.error('Error loading patient info:', error);
      Alert.alert('Error', error.message || 'Failed to load patient information');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    console.log('User tapped save button');
    
    if (!name.trim()) {
      Alert.alert('Required Field', 'Please enter patient name');
      return;
    }
    
    setSaving(true);
    try {
      const { authenticatedPut } = await import('@/utils/api');
      
      const patientData = {
        name: name.trim(),
        idStatement: idStatement.trim() || undefined,
        procedureType: procedureType.trim() || undefined,
        preOpDiagnosis: preOpDiagnosis.trim() || undefined,
        postOpDiagnosis: postOpDiagnosis.trim() || undefined,
        specimensTaken: specimensTaken.trim() || undefined,
        estimatedBloodLoss: estimatedBloodLoss.trim() || undefined,
        complications: complications.trim() || undefined,
        operationDateTime: operationDateTime.toISOString(),
        surgeon: surgeon.trim() || undefined,
        anesthesiologist: anesthesiologist.trim() || undefined,
        anesthesiaType: anesthesiaType.trim() || undefined,
        clinicalStatus: clinicalStatus.trim() || undefined,
        hospitalLocation: hospitalLocation.trim() || undefined,
      };
      
      console.log('Saving patient info:', patientData);
      await authenticatedPut(`/api/patients/${id}`, patientData);
      
      Alert.alert('Success', 'Patient information updated');
      router.back();
    } catch (error: any) {
      console.error('Error saving patient info:', error);
      Alert.alert('Error', error.message || 'Failed to save patient information');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    console.log('User tapped delete button');
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
            console.log('User confirmed deletion');
            try {
              const { authenticatedDelete } = await import('@/utils/api');
              await authenticatedDelete(`/api/patients/${id}`);
              
              Alert.alert('Success', 'Patient deleted');
              router.replace('/(tabs)/(home)/');
            } catch (error: any) {
              console.error('Error deleting patient:', error);
              Alert.alert('Error', error.message || 'Failed to delete patient');
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

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <Stack.Screen
          options={{
            headerShown: true,
            title: 'Patient Information',
            headerBackTitle: 'Back',
          }}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading patient information...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Patient Information',
          headerBackTitle: 'Back',
          headerStyle: {
            backgroundColor: colors.backgroundAlt,
          },
          headerTintColor: colors.primary,
        }}
      />
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

        {/* Action Buttons */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.saveButton, saving && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={saving}
          >
            {saving ? (
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
});
