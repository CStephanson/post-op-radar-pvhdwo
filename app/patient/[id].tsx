
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Platform,
  TouchableOpacity,
  TextInput,
  Modal,
  KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import { colors, typography, spacing, borderRadius, shadows } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import { Patient, Alert, AlertStatus, TrendData, VitalSigns, LabValues } from '@/types/patient';
import { calculateTrends, generateAlerts, calculateAlertStatus } from '@/utils/alertLogic';

export default function PatientDetailScreen() {
  console.log('PatientDetailScreen rendered');
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const [patient, setPatient] = useState<Patient | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [trends, setTrends] = useState<TrendData[]>([]);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editType, setEditType] = useState<'vitals' | 'labs'>('vitals');
  
  // Edit form state
  const [editHeartRate, setEditHeartRate] = useState('');
  const [editSystolicBP, setEditSystolicBP] = useState('');
  const [editDiastolicBP, setEditDiastolicBP] = useState('');
  const [editTemperature, setEditTemperature] = useState('');
  const [editUrineOutput, setEditUrineOutput] = useState('');
  const [editWBC, setEditWBC] = useState('');
  const [editHemoglobin, setEditHemoglobin] = useState('');
  const [editCreatinine, setEditCreatinine] = useState('');
  const [editLactate, setEditLactate] = useState('');

  useEffect(() => {
    loadPatientData();
  }, [id]);

  const loadPatientData = async () => {
    console.log('Loading patient data for ID:', id);
    try {
      const { authenticatedGet } = await import('@/utils/api');
      const patientData = await authenticatedGet<any>(`/api/patients/${id}`);
      
      // Convert date strings to Date objects
      const patientWithDates = {
        ...patientData,
        operationDateTime: patientData.operationDateTime ? new Date(patientData.operationDateTime) : undefined,
        createdAt: new Date(patientData.createdAt),
        updatedAt: new Date(patientData.updatedAt),
        vitals: patientData.vitalSigns?.map((v: any) => ({
          ...v,
          timestamp: new Date(v.timestamp),
        })) || [],
        labs: patientData.labValues?.map((l: any) => ({
          ...l,
          timestamp: new Date(l.timestamp),
        })) || [],
        // Load manual status override fields
        statusMode: patientData.statusMode || 'auto',
        manualStatus: patientData.manualStatus,
        computedStatus: patientData.computedStatus,
      };
      
      setPatient(patientWithDates);
      updatePatientAnalysis(patientWithDates);
    } catch (error: any) {
      console.error('Error loading patient data:', error);
    }
  };

  const updatePatientAnalysis = (updatedPatient: Patient) => {
    const patientTrends = calculateTrends(updatedPatient);
    setTrends(patientTrends);
    const patientAlerts = generateAlerts(updatedPatient);
    setAlerts(patientAlerts);
    
    // Calculate the auto status
    const computedStatus = calculateAlertStatus(updatedPatient);
    updatedPatient.computedStatus = computedStatus;
    
    // Respect manual status override - do NOT overwrite user-selected status
    if (updatedPatient.statusMode === 'manual' && updatedPatient.manualStatus) {
      console.log('Manual status override active - using manual status:', updatedPatient.manualStatus);
      updatedPatient.alertStatus = updatedPatient.manualStatus;
    } else {
      console.log('Auto status mode - using computed status:', computedStatus);
      updatedPatient.alertStatus = computedStatus;
    }
  };

  const openEditModal = (type: 'vitals' | 'labs') => {
    console.log('User tapped edit button for:', type);
    if (!patient) return;
    
    setEditType(type);
    
    if (type === 'vitals') {
      const latestVitals = patient.vitals && patient.vitals.length > 0 
        ? patient.vitals[patient.vitals.length - 1]
        : null;
      
      setEditHeartRate(latestVitals?.heartRate.toString() || '');
      setEditSystolicBP(latestVitals?.systolicBP.toString() || '');
      setEditDiastolicBP(latestVitals?.diastolicBP.toString() || '');
      setEditTemperature(latestVitals?.temperature.toFixed(1) || '');
      setEditUrineOutput(latestVitals?.urineOutput?.toString() || '');
    } else {
      const latestLabs = patient.labs && patient.labs.length > 0
        ? patient.labs[patient.labs.length - 1]
        : null;
      
      setEditWBC(latestLabs?.wbc.toFixed(1) || '');
      setEditHemoglobin(latestLabs?.hemoglobin.toFixed(1) || '');
      setEditCreatinine(latestLabs?.creatinine.toFixed(1) || '');
      setEditLactate(latestLabs?.lactate?.toFixed(1) || '');
    }
    
    setEditModalVisible(true);
  };

  const saveEdits = async () => {
    console.log('User saved edits for:', editType);
    if (!patient) return;
    
    try {
      const { authenticatedPost, authenticatedPut } = await import('@/utils/api');
      
      if (editType === 'vitals') {
        const vitalsData = {
          heartRate: parseFloat(editHeartRate) || undefined,
          systolicBP: parseFloat(editSystolicBP) || undefined,
          diastolicBP: parseFloat(editDiastolicBP) || undefined,
          temperature: editTemperature || undefined,
          urineOutput: editUrineOutput || undefined,
          timestamp: new Date().toISOString(),
        };
        
        console.log('Saving vitals:', vitalsData);
        await authenticatedPost(`/api/patients/${patient.id}/vitals`, vitalsData);
        
        // Add to local state
        const newVitals: VitalSigns = {
          heartRate: parseFloat(editHeartRate) || 0,
          systolicBP: parseFloat(editSystolicBP) || 0,
          diastolicBP: parseFloat(editDiastolicBP) || 0,
          temperature: parseFloat(editTemperature) || 0,
          urineOutput: editUrineOutput ? parseFloat(editUrineOutput) : undefined,
          timestamp: new Date(),
        };
        const updatedPatient = { ...patient, vitals: [...patient.vitals, newVitals] };
        setPatient(updatedPatient);
        updatePatientAnalysis(updatedPatient);
        
        // Update patient record with new computed status (only if in auto mode)
        if (updatedPatient.statusMode !== 'manual') {
          console.log('Auto mode - updating patient with computed status');
          await authenticatedPut(`/api/patients/${patient.id}`, {
            computedStatus: updatedPatient.computedStatus,
            alertStatus: updatedPatient.alertStatus,
          });
        }
      } else {
        const labsData = {
          wbc: editWBC || undefined,
          hemoglobin: editHemoglobin || undefined,
          creatinine: editCreatinine || undefined,
          lactate: editLactate || undefined,
          timestamp: new Date().toISOString(),
        };
        
        console.log('Saving labs:', labsData);
        await authenticatedPost(`/api/patients/${patient.id}/labs`, labsData);
        
        // Add to local state
        const newLabs: LabValues = {
          wbc: parseFloat(editWBC) || 0,
          hemoglobin: parseFloat(editHemoglobin) || 0,
          creatinine: parseFloat(editCreatinine) || 0,
          lactate: editLactate ? parseFloat(editLactate) : undefined,
          timestamp: new Date(),
        };
        const updatedPatient = { ...patient, labs: [...patient.labs, newLabs] };
        setPatient(updatedPatient);
        updatePatientAnalysis(updatedPatient);
        
        // Update patient record with new computed status (only if in auto mode)
        if (updatedPatient.statusMode !== 'manual') {
          console.log('Auto mode - updating patient with computed status');
          await authenticatedPut(`/api/patients/${patient.id}`, {
            computedStatus: updatedPatient.computedStatus,
            alertStatus: updatedPatient.alertStatus,
          });
        }
      }
      
      setEditModalVisible(false);
    } catch (error: any) {
      console.error('Error saving data:', error);
      Alert.alert('Error', error.message || 'Failed to save data');
    }
  };

  if (!patient) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <Stack.Screen
          options={{
            headerShown: true,
            title: 'Patient Details',
            headerBackTitle: 'Back',
          }}
        />
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading patient data...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const latestVitals = patient.vitals && patient.vitals.length > 0 
    ? patient.vitals[patient.vitals.length - 1]
    : { heartRate: 0, systolicBP: 0, diastolicBP: 0, temperature: 0, urineOutput: undefined, timestamp: new Date() };
  const latestLabs = patient.labs && patient.labs.length > 0
    ? patient.labs[patient.labs.length - 1]
    : { wbc: 0, hemoglobin: 0, creatinine: 0, lactate: undefined, timestamp: new Date() };

  const getAlertColor = (status: AlertStatus) => {
    if (status === 'green') return colors.alertGreen;
    if (status === 'yellow') return colors.alertYellow;
    return colors.alertRed;
  };

  const getAlertBgColor = (status: AlertStatus) => {
    if (status === 'green') return colors.alertGreenBg;
    if (status === 'yellow') return colors.alertYellowBg;
    return colors.alertRedBg;
  };

  const getAlertBorderColor = (status: AlertStatus) => {
    if (status === 'green') return colors.alertGreenBorder;
    if (status === 'yellow') return colors.alertYellowBorder;
    return colors.alertRedBorder;
  };

  const getTrendIcon = (trend: 'rising' | 'falling' | 'stable') => {
    if (trend === 'rising') return 'arrow-upward';
    if (trend === 'falling') return 'arrow-downward';
    return 'remove';
  };

  const getTrendColor = (trendData: TrendData) => {
    if (trendData.concerning) return colors.alertRed;
    if (trendData.trend === 'stable') return colors.textLight;
    return colors.textSecondary;
  };

  const alertColor = getAlertColor(patient.alertStatus);
  const alertBgColor = getAlertBgColor(patient.alertStatus);
  const alertBorderColor = getAlertBorderColor(patient.alertStatus);
  const podText = `Post-Operative Day ${patient.postOpDay}`;
  const bpText = `${latestVitals.systolicBP}/${latestVitals.diastolicBP}`;
  const hrText = `${latestVitals.heartRate}`;
  const tempText = `${latestVitals.temperature.toFixed(1)}`;
  const uoText = latestVitals.urineOutput ? `${latestVitals.urineOutput}` : 'N/A';
  const wbcText = `${latestLabs.wbc.toFixed(1)}`;
  const hgbText = `${latestLabs.hemoglobin.toFixed(1)}`;
  const creatText = `${latestLabs.creatinine.toFixed(1)}`;
  const lactateText = latestLabs.lactate ? `${latestLabs.lactate.toFixed(1)}` : 'N/A';

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: patient.name,
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
        {/* Patient Header Card */}
        <View style={styles.headerCard}>
          <View style={styles.headerTop}>
            <View style={styles.headerInfo}>
              <Text style={styles.patientName}>{patient.name}</Text>
              <Text style={styles.podText}>{podText}</Text>
              <Text style={styles.procedureType}>{patient.procedureType}</Text>
            </View>
            <View style={[styles.statusBadge, { 
              backgroundColor: alertBgColor,
              borderColor: alertBorderColor,
            }]}>
              <Text style={[styles.statusText, { color: alertColor }]}>
                {patient.alertStatus.toUpperCase()}
              </Text>
            </View>
          </View>
        </View>

        {/* Alerts Section */}
        {alerts.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <IconSymbol
                ios_icon_name="exclamationmark.triangle.fill"
                android_material_icon_name="warning"
                size={18}
                color={colors.warning}
                style={styles.sectionIcon}
              />
              <Text style={styles.sectionTitle}>Active Alerts</Text>
            </View>

            {alerts.map((alert, index) => {
              const severityColor = getAlertColor(alert.severity);
              const severityBgColor = getAlertBgColor(alert.severity);
              const severityBorderColor = getAlertBorderColor(alert.severity);

              return (
                <View key={index} style={[styles.alertCard, { 
                  backgroundColor: severityBgColor,
                  borderColor: severityBorderColor,
                }]}>
                  <View style={styles.alertHeader}>
                    <Text style={[styles.alertTitle, { color: severityColor }]}>
                      {alert.title}
                    </Text>
                  </View>
                  <Text style={styles.alertDescription}>{alert.description}</Text>

                  <View style={styles.alertSubsection}>
                    <Text style={styles.subsectionTitle}>Triggered by:</Text>
                    {alert.triggeredBy.map((trigger, idx) => (
                      <View key={idx} style={styles.bulletRow}>
                        <Text style={styles.bullet}>•</Text>
                        <Text style={styles.bulletText}>{trigger}</Text>
                      </View>
                    ))}
                  </View>

                  <View style={styles.alertSubsection}>
                    <Text style={styles.subsectionTitle}>Consider:</Text>
                    {alert.considerations.map((consideration, idx) => (
                      <View key={idx} style={styles.bulletRow}>
                        <Text style={styles.bullet}>•</Text>
                        <Text style={styles.bulletText}>{consideration}</Text>
                      </View>
                    ))}
                  </View>

                  <View style={styles.alertSubsection}>
                    <Text style={styles.subsectionTitle}>Recommended Actions:</Text>
                    {alert.cognitivePrompts.map((prompt, idx) => (
                      <View key={idx} style={styles.bulletRow}>
                        <Text style={styles.bullet}>•</Text>
                        <Text style={styles.bulletText}>{prompt}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* Patient Information Link */}
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.infoLinkCard}
            onPress={() => router.push(`/patient-info/${id}`)}
          >
            <View style={styles.infoLinkLeft}>
              <IconSymbol
                ios_icon_name="doc.text.fill"
                android_material_icon_name="description"
                size={24}
                color={colors.primary}
              />
              <View style={styles.infoLinkText}>
                <Text style={styles.infoLinkTitle}>Patient Information</Text>
                <Text style={styles.infoLinkSubtitle}>
                  View and edit operation details, diagnoses, and clinical status
                </Text>
              </View>
            </View>
            <IconSymbol
              ios_icon_name="chevron.right"
              android_material_icon_name="chevron-right"
              size={20}
              color={colors.iconLight}
            />
          </TouchableOpacity>
        </View>

        {/* Vital Signs Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionHeader}>
              <IconSymbol
                ios_icon_name="heart.fill"
                android_material_icon_name="favorite"
                size={18}
                color={colors.iconPrimary}
                style={styles.sectionIcon}
              />
              <Text style={styles.sectionTitle}>Vital Signs</Text>
            </View>
            <TouchableOpacity 
              style={styles.editButton}
              onPress={() => openEditModal('vitals')}
            >
              <IconSymbol
                ios_icon_name="pencil"
                android_material_icon_name="edit"
                size={16}
                color={colors.primary}
              />
              <Text style={styles.editButtonText}>Edit</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.dataGrid}>
            <View style={styles.dataCard}>
              <Text style={styles.dataLabel}>Heart Rate</Text>
              <Text style={styles.dataValue}>{hrText}</Text>
              <Text style={styles.dataUnit}>bpm</Text>
            </View>

            <View style={styles.dataCard}>
              <Text style={styles.dataLabel}>Blood Pressure</Text>
              <Text style={styles.dataValue}>{bpText}</Text>
              <Text style={styles.dataUnit}>mmHg</Text>
            </View>

            <View style={styles.dataCard}>
              <Text style={styles.dataLabel}>Temperature</Text>
              <Text style={styles.dataValue}>{tempText}</Text>
              <Text style={styles.dataUnit}>°C</Text>
            </View>

            <View style={styles.dataCard}>
              <Text style={styles.dataLabel}>Urine Output</Text>
              <Text style={styles.dataValue}>{uoText}</Text>
              <Text style={styles.dataUnit}>ml/hr</Text>
            </View>
          </View>
        </View>

        {/* Laboratory Values Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionHeader}>
              <IconSymbol
                ios_icon_name="flask.fill"
                android_material_icon_name="science"
                size={18}
                color={colors.iconPrimary}
                style={styles.sectionIcon}
              />
              <Text style={styles.sectionTitle}>Laboratory Values</Text>
            </View>
            <TouchableOpacity 
              style={styles.editButton}
              onPress={() => openEditModal('labs')}
            >
              <IconSymbol
                ios_icon_name="pencil"
                android_material_icon_name="edit"
                size={16}
                color={colors.primary}
              />
              <Text style={styles.editButtonText}>Edit</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.dataGrid}>
            <View style={styles.dataCard}>
              <Text style={styles.dataLabel}>WBC</Text>
              <Text style={styles.dataValue}>{wbcText}</Text>
              <Text style={styles.dataUnit}>K/μL</Text>
            </View>

            <View style={styles.dataCard}>
              <Text style={styles.dataLabel}>Hemoglobin</Text>
              <Text style={styles.dataValue}>{hgbText}</Text>
              <Text style={styles.dataUnit}>g/dL</Text>
            </View>

            <View style={styles.dataCard}>
              <Text style={styles.dataLabel}>Creatinine</Text>
              <Text style={styles.dataValue}>{creatText}</Text>
              <Text style={styles.dataUnit}>mg/dL</Text>
            </View>

            <View style={styles.dataCard}>
              <Text style={styles.dataLabel}>Lactate</Text>
              <Text style={styles.dataValue}>{lactateText}</Text>
              <Text style={styles.dataUnit}>mmol/L</Text>
            </View>
          </View>
        </View>

        {/* Trends Section */}
        {trends.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <IconSymbol
                ios_icon_name="chart.line.uptrend.xyaxis"
                android_material_icon_name="trending-up"
                size={18}
                color={colors.iconPrimary}
                style={styles.sectionIcon}
              />
              <Text style={styles.sectionTitle}>Trends</Text>
            </View>

            {trends.map((trendData, index) => {
              const trendIcon = getTrendIcon(trendData.trend);
              const trendColor = getTrendColor(trendData);
              const firstValue = trendData.values[0].toFixed(1);
              const lastValue = trendData.values[trendData.values.length - 1].toFixed(1);
              const trendText = `${firstValue} → ${lastValue}`;

              return (
                <View key={index} style={styles.trendCard}>
                  <View style={styles.trendRow}>
                    <Text style={styles.trendLabel}>{trendData.label}</Text>
                    <View style={styles.trendValueContainer}>
                      <IconSymbol
                        ios_icon_name="arrow.up"
                        android_material_icon_name={trendIcon}
                        size={14}
                        color={trendColor}
                        style={styles.trendIcon}
                      />
                      <Text style={[styles.trendValue, { color: trendColor }]}>
                        {trendText}
                      </Text>
                    </View>
                  </View>
                  {trendData.concerning && (
                    <View style={styles.concerningBadge}>
                      <Text style={styles.concerningText}>Concerning trend</Text>
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        )}

        {/* Disclaimer */}
        <View style={styles.disclaimerCard}>
          <IconSymbol
            ios_icon_name="info.circle"
            android_material_icon_name="info"
            size={16}
            color={colors.textLight}
            style={styles.disclaimerIcon}
          />
          <Text style={styles.disclaimerText}>
            Educational pattern recognition only. Clinical decisions must be made by qualified healthcare professionals.
          </Text>
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* Edit Modal */}
      <Modal
        visible={editModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setEditModalVisible(false)}
      >
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editType === 'vitals' ? 'Edit Vital Signs' : 'Edit Laboratory Values'}
              </Text>
              <TouchableOpacity onPress={() => setEditModalVisible(false)}>
                <IconSymbol
                  ios_icon_name="xmark"
                  android_material_icon_name="close"
                  size={24}
                  color={colors.textSecondary}
                />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScroll}>
              {editType === 'vitals' ? (
                <>
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Heart Rate (bpm)</Text>
                    <TextInput
                      style={styles.input}
                      value={editHeartRate}
                      onChangeText={setEditHeartRate}
                      keyboardType="numeric"
                      placeholder="e.g., 75"
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Systolic BP (mmHg)</Text>
                    <TextInput
                      style={styles.input}
                      value={editSystolicBP}
                      onChangeText={setEditSystolicBP}
                      keyboardType="numeric"
                      placeholder="e.g., 120"
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Diastolic BP (mmHg)</Text>
                    <TextInput
                      style={styles.input}
                      value={editDiastolicBP}
                      onChangeText={setEditDiastolicBP}
                      keyboardType="numeric"
                      placeholder="e.g., 80"
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Temperature (°C)</Text>
                    <TextInput
                      style={styles.input}
                      value={editTemperature}
                      onChangeText={setEditTemperature}
                      keyboardType="decimal-pad"
                      placeholder="e.g., 37.2"
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Urine Output (ml/hr)</Text>
                    <TextInput
                      style={styles.input}
                      value={editUrineOutput}
                      onChangeText={setEditUrineOutput}
                      keyboardType="numeric"
                      placeholder="e.g., 50"
                    />
                  </View>
                </>
              ) : (
                <>
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>WBC (K/μL)</Text>
                    <TextInput
                      style={styles.input}
                      value={editWBC}
                      onChangeText={setEditWBC}
                      keyboardType="decimal-pad"
                      placeholder="e.g., 9.5"
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Hemoglobin (g/dL)</Text>
                    <TextInput
                      style={styles.input}
                      value={editHemoglobin}
                      onChangeText={setEditHemoglobin}
                      keyboardType="decimal-pad"
                      placeholder="e.g., 13.2"
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Creatinine (mg/dL)</Text>
                    <TextInput
                      style={styles.input}
                      value={editCreatinine}
                      onChangeText={setEditCreatinine}
                      keyboardType="decimal-pad"
                      placeholder="e.g., 0.9"
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Lactate (mmol/L)</Text>
                    <TextInput
                      style={styles.input}
                      value={editLactate}
                      onChangeText={setEditLactate}
                      keyboardType="decimal-pad"
                      placeholder="e.g., 1.2"
                    />
                  </View>
                </>
              )}
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity 
                style={styles.cancelButton}
                onPress={() => setEditModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.saveButton}
                onPress={saveEdits}
              >
                <Text style={styles.saveButtonText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
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
  },
  loadingText: {
    fontSize: typography.body,
    color: colors.textSecondary,
  },
  headerCard: {
    backgroundColor: colors.backgroundAlt,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xl,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerInfo: {
    flex: 1,
    gap: spacing.xs,
  },
  patientName: {
    fontSize: typography.h2,
    fontWeight: typography.bold,
    color: colors.text,
    letterSpacing: -0.3,
    lineHeight: 28,
  },
  podText: {
    fontSize: typography.bodySmall,
    fontWeight: typography.medium,
    color: colors.textSecondary,
  },
  procedureType: {
    fontSize: typography.caption,
    fontWeight: typography.regular,
    color: colors.textLight,
    lineHeight: 18,
  },
  statusBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1.5,
    marginLeft: spacing.md,
  },
  statusText: {
    fontSize: typography.tiny,
    fontWeight: typography.bold,
    letterSpacing: 0.5,
  },
  section: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xxl,
  },
  infoLinkCard: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.sm,
  },
  infoLinkLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  infoLinkText: {
    flex: 1,
  },
  infoLinkTitle: {
    fontSize: typography.body,
    fontWeight: typography.bold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  infoLinkSubtitle: {
    fontSize: typography.caption,
    fontWeight: typography.regular,
    color: colors.textLight,
    lineHeight: 18,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionIcon: {
    marginRight: spacing.sm,
  },
  sectionTitle: {
    fontSize: typography.h4,
    fontWeight: typography.semibold,
    color: colors.text,
    letterSpacing: -0.2,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.borderLight,
  },
  editButtonText: {
    fontSize: typography.caption,
    fontWeight: typography.semibold,
    color: colors.primary,
  },
  alertCard: {
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1.5,
  },
  alertHeader: {
    marginBottom: spacing.sm,
  },
  alertTitle: {
    fontSize: typography.h5,
    fontWeight: typography.bold,
    lineHeight: 22,
  },
  alertDescription: {
    fontSize: typography.bodySmall,
    fontWeight: typography.regular,
    color: colors.text,
    lineHeight: 20,
    marginBottom: spacing.md,
  },
  alertSubsection: {
    marginTop: spacing.md,
  },
  subsectionTitle: {
    fontSize: typography.bodySmall,
    fontWeight: typography.semibold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.xs,
    paddingLeft: spacing.xs,
  },
  bullet: {
    fontSize: typography.bodySmall,
    fontWeight: typography.regular,
    color: colors.textSecondary,
    marginRight: spacing.sm,
    width: 12,
  },
  bulletText: {
    flex: 1,
    fontSize: typography.caption,
    fontWeight: typography.regular,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  dataGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -spacing.xs,
  },
  dataCard: {
    width: '50%',
    paddingHorizontal: spacing.xs,
    marginBottom: spacing.lg,
  },
  dataLabel: {
    fontSize: typography.caption,
    fontWeight: typography.medium,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  dataValue: {
    fontSize: 32,
    fontWeight: typography.bold,
    color: colors.text,
    marginBottom: 2,
    letterSpacing: -0.5,
    lineHeight: 38,
  },
  dataUnit: {
    fontSize: typography.tiny,
    fontWeight: typography.regular,
    color: colors.textLight,
  },
  trendCard: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  trendRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  trendLabel: {
    fontSize: typography.bodySmall,
    fontWeight: typography.semibold,
    color: colors.text,
  },
  trendValueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  trendIcon: {
    marginTop: 1,
  },
  trendValue: {
    fontSize: typography.bodySmall,
    fontWeight: typography.semibold,
  },
  concerningBadge: {
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.alertRedBorder,
  },
  concerningText: {
    fontSize: typography.caption,
    fontWeight: typography.semibold,
    color: colors.alertRed,
  },
  disclaimerCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.borderLight,
    marginHorizontal: spacing.xl,
    marginTop: spacing.xxl,
    padding: spacing.lg,
    borderRadius: borderRadius.md,
  },
  disclaimerIcon: {
    marginRight: spacing.md,
    marginTop: 2,
    opacity: 0.7,
  },
  disclaimerText: {
    flex: 1,
    fontSize: typography.caption,
    fontWeight: typography.regular,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  bottomSpacer: {
    height: spacing.xxxxl,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.backgroundAlt,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  modalTitle: {
    fontSize: typography.h3,
    fontWeight: typography.bold,
    color: colors.text,
  },
  modalScroll: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
  },
  inputGroup: {
    marginBottom: spacing.lg,
  },
  inputLabel: {
    fontSize: typography.bodySmall,
    fontWeight: typography.semibold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  input: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    fontSize: typography.body,
    color: colors.text,
  },
  modalActions: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xl,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: spacing.lg,
    borderRadius: borderRadius.md,
    backgroundColor: colors.borderLight,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: typography.body,
    fontWeight: typography.semibold,
    color: colors.textSecondary,
  },
  saveButton: {
    flex: 1,
    paddingVertical: spacing.lg,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: typography.body,
    fontWeight: typography.semibold,
    color: '#FFFFFF',
  },
});
