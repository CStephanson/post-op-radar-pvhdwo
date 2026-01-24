
import React, { useState, useEffect, useCallback } from 'react';
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
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, typography, spacing, borderRadius, shadows } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import { Patient, Alert as PatientAlert, AlertStatus, TrendData, VitalEntry, LabEntry } from '@/types/patient';
import { calculateTrends, generateAlerts, calculateAlertStatus } from '@/utils/alertLogic';
import { getPatientById, addVitalEntry, addLabEntry, deleteVitalEntry, deleteLabEntry } from '@/utils/localStorage';

export default function PatientDetailScreen({ route, navigation }: any) {
  console.log('[PatientDetail] Component rendered');
  const { id } = route.params;
  console.log('[PatientDetail] Patient ID from route params:', id);
  
  const [patient, setPatient] = useState<Patient | null>(null);
  const [alerts, setAlerts] = useState<PatientAlert[]>([]);
  const [trends, setTrends] = useState<TrendData[]>([]);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editType, setEditType] = useState<'vitals' | 'labs'>('vitals');
  
  // Edit form state for vitals
  const [editHr, setEditHr] = useState('');
  const [editBpSys, setEditBpSys] = useState('');
  const [editBpDia, setEditBpDia] = useState('');
  const [editRr, setEditRr] = useState('');
  const [editTemp, setEditTemp] = useState('');
  const [editSpo2, setEditSpo2] = useState('');
  const [editUrineOutput, setEditUrineOutput] = useState('');
  const [editPain, setEditPain] = useState('');
  const [editVitalNotes, setEditVitalNotes] = useState('');
  
  // Edit form state for labs
  const [editWbc, setEditWbc] = useState('');
  const [editHb, setEditHb] = useState('');
  const [editPlt, setEditPlt] = useState('');
  const [editNa, setEditNa] = useState('');
  const [editK, setEditK] = useState('');
  const [editCr, setEditCr] = useState('');
  const [editLactate, setEditLactate] = useState('');
  const [editBili, setEditBili] = useState('');
  const [editAlt, setEditAlt] = useState('');
  const [editAst, setEditAst] = useState('');
  const [editInr, setEditInr] = useState('');
  const [editLabNotes, setEditLabNotes] = useState('');

  const loadPatientData = useCallback(async () => {
    console.log('[PatientDetail] ========== LOAD PATIENT DATA START ==========');
    console.log('[PatientDetail] Loading patient data for ID:', id);
    try {
      const patientData = await getPatientById(id as string);
      
      if (!patientData) {
        console.error('[PatientDetail] Patient not found in local storage');
        Alert.alert('Error', 'Patient not found', [
          { text: 'OK', onPress: () => navigation.goBack() }
        ]);
        return;
      }
      
      console.log('[PatientDetail] Patient loaded from local storage:', patientData.name);
      console.log('[PatientDetail] Patient ID:', patientData.id);
      console.log('[PatientDetail] Patient has', patientData.vitalEntries?.length || 0, 'vital entries');
      console.log('[PatientDetail] Patient has', patientData.labEntries?.length || 0, 'lab entries');
      
      if (patientData.vitalEntries && patientData.vitalEntries.length > 0) {
        console.log('[PatientDetail] First vital entry:', JSON.stringify(patientData.vitalEntries[0]));
      }
      if (patientData.labEntries && patientData.labEntries.length > 0) {
        console.log('[PatientDetail] First lab entry:', JSON.stringify(patientData.labEntries[0]));
      }
      
      setPatient(patientData);
      updatePatientAnalysis(patientData);
      console.log('[PatientDetail] ========== LOAD PATIENT DATA END ==========');
    } catch (error: any) {
      console.error('[PatientDetail] Error loading patient data:', error);
      Alert.alert('Storage Error', 'Failed to load patient data from local storage', [
        { text: 'Retry', onPress: loadPatientData },
        { text: 'Cancel', onPress: () => navigation.goBack() }
      ]);
    }
  }, [id, navigation]);

  useEffect(() => {
    loadPatientData();
  }, [loadPatientData]);

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
      console.log('[PatientDetail] Manual status override active - using manual status:', updatedPatient.manualStatus);
      updatedPatient.alertStatus = updatedPatient.manualStatus;
    } else {
      console.log('[PatientDetail] Auto status mode - using computed status:', computedStatus);
      updatedPatient.alertStatus = computedStatus;
    }
  };

  const openEditModal = (type: 'vitals' | 'labs') => {
    console.log('[PatientDetail] User tapped Add button for:', type);
    setEditType(type);
    
    // Clear all form fields for new entry
    if (type === 'vitals') {
      setEditHr('');
      setEditBpSys('');
      setEditBpDia('');
      setEditRr('');
      setEditTemp('');
      setEditSpo2('');
      setEditUrineOutput('');
      setEditPain('');
      setEditVitalNotes('');
    } else {
      setEditWbc('');
      setEditHb('');
      setEditPlt('');
      setEditNa('');
      setEditK('');
      setEditCr('');
      setEditLactate('');
      setEditBili('');
      setEditAlt('');
      setEditAst('');
      setEditInr('');
      setEditLabNotes('');
    }
    
    setEditModalVisible(true);
  };

  const saveEdits = async () => {
    console.log('[PatientDetail] ========== SAVE ENTRY START ==========');
    console.log('[PatientDetail] User tapped Save button for:', editType);
    if (!patient) {
      console.error('[PatientDetail] Cannot save - patient is null');
      return;
    }
    
    console.log('[PatientDetail] Current patient ID:', patient.id);
    console.log('[PatientDetail] Current patient name:', patient.name);
    
    try {
      if (editType === 'vitals') {
        // Validate: at least one vital value must be entered
        const hasValue = editHr || editBpSys || editBpDia || editRr || editTemp || editSpo2 || editUrineOutput || editPain;
        if (!hasValue) {
          console.log('[PatientDetail] Validation failed - no vital values entered');
          Alert.alert('Validation Error', 'Please enter at least one vital sign value');
          return;
        }
        
        console.log('[PatientDetail] Validation passed - creating vital entry');
        
        // Create new vital entry
        const newVitalEntry: Omit<VitalEntry, 'id'> = {
          timestamp: new Date(),
          hr: editHr ? parseFloat(editHr) : undefined,
          bpSys: editBpSys ? parseFloat(editBpSys) : undefined,
          bpDia: editBpDia ? parseFloat(editBpDia) : undefined,
          rr: editRr ? parseFloat(editRr) : undefined,
          temp: editTemp ? parseFloat(editTemp) : undefined,
          spo2: editSpo2 ? parseFloat(editSpo2) : undefined,
          urineOutput: editUrineOutput ? parseFloat(editUrineOutput) : undefined,
          pain: editPain ? parseFloat(editPain) : undefined,
          notes: editVitalNotes.trim() || undefined,
        };
        
        console.log('[PatientDetail] New vital entry to save:', JSON.stringify(newVitalEntry));
        console.log('[PatientDetail] Calling addVitalEntry for patient:', patient.id);
        
        // Add vital entry to patient (this saves to storage)
        const updatedPatient = await addVitalEntry(patient.id, newVitalEntry);
        
        console.log('[PatientDetail] addVitalEntry returned successfully');
        console.log('[PatientDetail] Updated patient has', updatedPatient.vitalEntries?.length || 0, 'vital entries');
        
        // Update local state
        setPatient(updatedPatient);
        updatePatientAnalysis(updatedPatient);
        
        const successMessage = `Vital signs saved! Total entries: ${updatedPatient.vitalEntries?.length || 0}`;
        console.log('[PatientDetail]', successMessage);
        Alert.alert('Success', successMessage);
      } else {
        // Validate: at least one lab value must be entered
        const hasValue = editWbc || editHb || editPlt || editNa || editK || editCr || editLactate || editBili || editAlt || editAst || editInr;
        if (!hasValue) {
          console.log('[PatientDetail] Validation failed - no lab values entered');
          Alert.alert('Validation Error', 'Please enter at least one lab value');
          return;
        }
        
        console.log('[PatientDetail] Validation passed - creating lab entry');
        
        // Create new lab entry
        const newLabEntry: Omit<LabEntry, 'id'> = {
          timestamp: new Date(),
          wbc: editWbc ? parseFloat(editWbc) : undefined,
          hb: editHb ? parseFloat(editHb) : undefined,
          plt: editPlt ? parseFloat(editPlt) : undefined,
          na: editNa ? parseFloat(editNa) : undefined,
          k: editK ? parseFloat(editK) : undefined,
          cr: editCr ? parseFloat(editCr) : undefined,
          lactate: editLactate ? parseFloat(editLactate) : undefined,
          bili: editBili ? parseFloat(editBili) : undefined,
          alt: editAlt ? parseFloat(editAlt) : undefined,
          ast: editAst ? parseFloat(editAst) : undefined,
          inr: editInr ? parseFloat(editInr) : undefined,
          notes: editLabNotes.trim() || undefined,
        };
        
        console.log('[PatientDetail] New lab entry to save:', JSON.stringify(newLabEntry));
        console.log('[PatientDetail] Calling addLabEntry for patient:', patient.id);
        
        // Add lab entry to patient (this saves to storage)
        const updatedPatient = await addLabEntry(patient.id, newLabEntry);
        
        console.log('[PatientDetail] addLabEntry returned successfully');
        console.log('[PatientDetail] Updated patient has', updatedPatient.labEntries?.length || 0, 'lab entries');
        
        // Update local state
        setPatient(updatedPatient);
        updatePatientAnalysis(updatedPatient);
        
        const successMessage = `Lab values saved! Total entries: ${updatedPatient.labEntries?.length || 0}`;
        console.log('[PatientDetail]', successMessage);
        Alert.alert('Success', successMessage);
      }
      
      setEditModalVisible(false);
      console.log('[PatientDetail] ========== SAVE ENTRY END ==========');
    } catch (error: any) {
      console.error('[PatientDetail] ========== SAVE ENTRY ERROR ==========');
      console.error('[PatientDetail] Error saving entry:', error);
      console.error('[PatientDetail] Error message:', error.message);
      console.error('[PatientDetail] Error stack:', error.stack);
      Alert.alert('Storage Error', 'Failed to save data to local storage. Please try again.', [
        { text: 'Retry', onPress: saveEdits },
        { text: 'Cancel', style: 'cancel' }
      ]);
    }
  };

  const handleDeleteVital = async (vitalId: string) => {
    if (!patient) return;
    
    console.log('[PatientDetail] User requested to delete vital entry:', vitalId);
    
    Alert.alert(
      'Delete Vital Entry',
      'Are you sure you want to delete this vital signs entry?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              console.log('[PatientDetail] Deleting vital entry:', vitalId);
              const updatedPatient = await deleteVitalEntry(patient.id, vitalId);
              setPatient(updatedPatient);
              updatePatientAnalysis(updatedPatient);
              console.log('[PatientDetail] Vital entry deleted successfully');
              Alert.alert('Success', 'Vital entry deleted');
            } catch (error) {
              console.error('[PatientDetail] Error deleting vital entry:', error);
              Alert.alert('Error', 'Failed to delete vital entry');
            }
          },
        },
      ]
    );
  };

  const handleDeleteLab = async (labId: string) => {
    if (!patient) return;
    
    console.log('[PatientDetail] User requested to delete lab entry:', labId);
    
    Alert.alert(
      'Delete Lab Entry',
      'Are you sure you want to delete this lab values entry?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              console.log('[PatientDetail] Deleting lab entry:', labId);
              const updatedPatient = await deleteLabEntry(patient.id, labId);
              setPatient(updatedPatient);
              updatePatientAnalysis(updatedPatient);
              console.log('[PatientDetail] Lab entry deleted successfully');
              Alert.alert('Success', 'Lab entry deleted');
            } catch (error) {
              console.error('[PatientDetail] Error deleting lab entry:', error);
              Alert.alert('Error', 'Failed to delete lab entry');
            }
          },
        },
      ]
    );
  };

  if (!patient) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading patient data...</Text>
        </View>
      </SafeAreaView>
    );
  }

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

  const formatTimestamp = (date: Date) => {
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const alertColor = getAlertColor(patient.alertStatus);
  const alertBgColor = getAlertBgColor(patient.alertStatus);
  const alertBorderColor = getAlertBorderColor(patient.alertStatus);
  const podText = `Post-Operative Day ${patient.postOpDay}`;

  // Sort entries by timestamp (most recent first)
  const sortedVitals = [...(patient.vitalEntries || [])].sort((a, b) => 
    new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
  const sortedLabs = [...(patient.labEntries || [])].sort((a, b) => 
    new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  const vitalCountText = `${sortedVitals.length}`;
  const labCountText = `${sortedLabs.length}`;

  console.log('[PatientDetail] Rendering with', sortedVitals.length, 'vitals and', sortedLabs.length, 'labs');

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
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
            onPress={() => navigation.navigate('PatientInfo', { id })}
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
              <View style={styles.countBadge}>
                <Text style={styles.countText}>{vitalCountText}</Text>
              </View>
            </View>
            <TouchableOpacity 
              style={styles.addButton}
              onPress={() => openEditModal('vitals')}
            >
              <IconSymbol
                ios_icon_name="plus"
                android_material_icon_name="add"
                size={16}
                color={colors.primary}
              />
              <Text style={styles.addButtonText}>Add</Text>
            </TouchableOpacity>
          </View>

          {sortedVitals.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>No vital signs recorded yet</Text>
              <Text style={styles.emptyStateSubtext}>Tap Add to record vital signs</Text>
            </View>
          ) : (
            <View style={styles.entriesList}>
              {sortedVitals.map((vital) => {
                const timestampText = formatTimestamp(new Date(vital.timestamp));
                const hrText = vital.hr ? `HR: ${vital.hr}` : null;
                const bpText = vital.bpSys && vital.bpDia ? `BP: ${vital.bpSys}/${vital.bpDia}` : null;
                const tempText = vital.temp ? `Temp: ${vital.temp.toFixed(1)}°C` : null;
                const spo2Text = vital.spo2 ? `SpO2: ${vital.spo2}%` : null;
                const rrText = vital.rr ? `RR: ${vital.rr}` : null;
                const uoText = vital.urineOutput ? `UO: ${vital.urineOutput} ml/hr` : null;
                const painText = vital.pain !== undefined ? `Pain: ${vital.pain}/10` : null;

                return (
                  <View key={vital.id} style={styles.entryCard}>
                    <View style={styles.entryHeader}>
                      <Text style={styles.entryTimestamp}>{timestampText}</Text>
                      <TouchableOpacity onPress={() => handleDeleteVital(vital.id)}>
                        <IconSymbol
                          ios_icon_name="trash"
                          android_material_icon_name="delete"
                          size={18}
                          color={colors.error}
                        />
                      </TouchableOpacity>
                    </View>
                    <View style={styles.entryValues}>
                      {hrText && <Text style={styles.entryValue}>{hrText}</Text>}
                      {bpText && <Text style={styles.entryValue}>{bpText}</Text>}
                      {tempText && <Text style={styles.entryValue}>{tempText}</Text>}
                      {spo2Text && <Text style={styles.entryValue}>{spo2Text}</Text>}
                      {rrText && <Text style={styles.entryValue}>{rrText}</Text>}
                      {uoText && <Text style={styles.entryValue}>{uoText}</Text>}
                      {painText && <Text style={styles.entryValue}>{painText}</Text>}
                    </View>
                    {vital.notes && (
                      <Text style={styles.entryNotes}>{vital.notes}</Text>
                    )}
                  </View>
                );
              })}
            </View>
          )}
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
              <View style={styles.countBadge}>
                <Text style={styles.countText}>{labCountText}</Text>
              </View>
            </View>
            <TouchableOpacity 
              style={styles.addButton}
              onPress={() => openEditModal('labs')}
            >
              <IconSymbol
                ios_icon_name="plus"
                android_material_icon_name="add"
                size={16}
                color={colors.primary}
              />
              <Text style={styles.addButtonText}>Add</Text>
            </TouchableOpacity>
          </View>

          {sortedLabs.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>No lab values recorded yet</Text>
              <Text style={styles.emptyStateSubtext}>Tap Add to record lab values</Text>
            </View>
          ) : (
            <View style={styles.entriesList}>
              {sortedLabs.map((lab) => {
                const timestampText = formatTimestamp(new Date(lab.timestamp));
                const wbcText = lab.wbc ? `WBC: ${lab.wbc.toFixed(1)}` : null;
                const hbText = lab.hb ? `Hb: ${lab.hb.toFixed(1)}` : null;
                const pltText = lab.plt ? `Plt: ${lab.plt}` : null;
                const naText = lab.na ? `Na: ${lab.na}` : null;
                const kText = lab.k ? `K: ${lab.k.toFixed(1)}` : null;
                const crText = lab.cr ? `Cr: ${lab.cr.toFixed(1)}` : null;
                const lactateText = lab.lactate ? `Lactate: ${lab.lactate.toFixed(1)}` : null;
                const biliText = lab.bili ? `Bili: ${lab.bili.toFixed(1)}` : null;
                const altText = lab.alt ? `ALT: ${lab.alt}` : null;
                const astText = lab.ast ? `AST: ${lab.ast}` : null;
                const inrText = lab.inr ? `INR: ${lab.inr.toFixed(2)}` : null;

                return (
                  <View key={lab.id} style={styles.entryCard}>
                    <View style={styles.entryHeader}>
                      <Text style={styles.entryTimestamp}>{timestampText}</Text>
                      <TouchableOpacity onPress={() => handleDeleteLab(lab.id)}>
                        <IconSymbol
                          ios_icon_name="trash"
                          android_material_icon_name="delete"
                          size={18}
                          color={colors.error}
                        />
                      </TouchableOpacity>
                    </View>
                    <View style={styles.entryValues}>
                      {wbcText && <Text style={styles.entryValue}>{wbcText}</Text>}
                      {hbText && <Text style={styles.entryValue}>{hbText}</Text>}
                      {pltText && <Text style={styles.entryValue}>{pltText}</Text>}
                      {naText && <Text style={styles.entryValue}>{naText}</Text>}
                      {kText && <Text style={styles.entryValue}>{kText}</Text>}
                      {crText && <Text style={styles.entryValue}>{crText}</Text>}
                      {lactateText && <Text style={styles.entryValue}>{lactateText}</Text>}
                      {biliText && <Text style={styles.entryValue}>{biliText}</Text>}
                      {altText && <Text style={styles.entryValue}>{altText}</Text>}
                      {astText && <Text style={styles.entryValue}>{astText}</Text>}
                      {inrText && <Text style={styles.entryValue}>{inrText}</Text>}
                    </View>
                    {lab.notes && (
                      <Text style={styles.entryNotes}>{lab.notes}</Text>
                    )}
                  </View>
                );
              })}
            </View>
          )}
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

      {/* Add/Edit Modal */}
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
                {editType === 'vitals' ? 'Add Vital Signs' : 'Add Laboratory Values'}
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
                      value={editHr}
                      onChangeText={setEditHr}
                      keyboardType="numeric"
                      placeholder="e.g., 75"
                      placeholderTextColor={colors.textLight}
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Systolic BP (mmHg)</Text>
                    <TextInput
                      style={styles.input}
                      value={editBpSys}
                      onChangeText={setEditBpSys}
                      keyboardType="numeric"
                      placeholder="e.g., 120"
                      placeholderTextColor={colors.textLight}
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Diastolic BP (mmHg)</Text>
                    <TextInput
                      style={styles.input}
                      value={editBpDia}
                      onChangeText={setEditBpDia}
                      keyboardType="numeric"
                      placeholder="e.g., 80"
                      placeholderTextColor={colors.textLight}
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Respiratory Rate (breaths/min)</Text>
                    <TextInput
                      style={styles.input}
                      value={editRr}
                      onChangeText={setEditRr}
                      keyboardType="numeric"
                      placeholder="e.g., 16"
                      placeholderTextColor={colors.textLight}
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Temperature (°C)</Text>
                    <TextInput
                      style={styles.input}
                      value={editTemp}
                      onChangeText={setEditTemp}
                      keyboardType="decimal-pad"
                      placeholder="e.g., 37.2"
                      placeholderTextColor={colors.textLight}
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>SpO2 (%)</Text>
                    <TextInput
                      style={styles.input}
                      value={editSpo2}
                      onChangeText={setEditSpo2}
                      keyboardType="numeric"
                      placeholder="e.g., 98"
                      placeholderTextColor={colors.textLight}
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
                      placeholderTextColor={colors.textLight}
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Pain Scale (0-10)</Text>
                    <TextInput
                      style={styles.input}
                      value={editPain}
                      onChangeText={setEditPain}
                      keyboardType="numeric"
                      placeholder="e.g., 3"
                      placeholderTextColor={colors.textLight}
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Notes (optional)</Text>
                    <TextInput
                      style={[styles.input, styles.textArea]}
                      value={editVitalNotes}
                      onChangeText={setEditVitalNotes}
                      placeholder="Additional notes"
                      placeholderTextColor={colors.textLight}
                      multiline
                      numberOfLines={3}
                    />
                  </View>
                </>
              ) : (
                <>
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>WBC (K/μL)</Text>
                    <TextInput
                      style={styles.input}
                      value={editWbc}
                      onChangeText={setEditWbc}
                      keyboardType="decimal-pad"
                      placeholder="e.g., 9.5"
                      placeholderTextColor={colors.textLight}
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Hemoglobin (g/dL)</Text>
                    <TextInput
                      style={styles.input}
                      value={editHb}
                      onChangeText={setEditHb}
                      keyboardType="decimal-pad"
                      placeholder="e.g., 13.2"
                      placeholderTextColor={colors.textLight}
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Platelets (K/μL)</Text>
                    <TextInput
                      style={styles.input}
                      value={editPlt}
                      onChangeText={setEditPlt}
                      keyboardType="numeric"
                      placeholder="e.g., 250"
                      placeholderTextColor={colors.textLight}
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Sodium (mEq/L)</Text>
                    <TextInput
                      style={styles.input}
                      value={editNa}
                      onChangeText={setEditNa}
                      keyboardType="numeric"
                      placeholder="e.g., 140"
                      placeholderTextColor={colors.textLight}
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Potassium (mEq/L)</Text>
                    <TextInput
                      style={styles.input}
                      value={editK}
                      onChangeText={setEditK}
                      keyboardType="decimal-pad"
                      placeholder="e.g., 4.2"
                      placeholderTextColor={colors.textLight}
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Creatinine (mg/dL)</Text>
                    <TextInput
                      style={styles.input}
                      value={editCr}
                      onChangeText={setEditCr}
                      keyboardType="decimal-pad"
                      placeholder="e.g., 0.9"
                      placeholderTextColor={colors.textLight}
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
                      placeholderTextColor={colors.textLight}
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Bilirubin (mg/dL)</Text>
                    <TextInput
                      style={styles.input}
                      value={editBili}
                      onChangeText={setEditBili}
                      keyboardType="decimal-pad"
                      placeholder="e.g., 0.8"
                      placeholderTextColor={colors.textLight}
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>ALT (U/L)</Text>
                    <TextInput
                      style={styles.input}
                      value={editAlt}
                      onChangeText={setEditAlt}
                      keyboardType="numeric"
                      placeholder="e.g., 25"
                      placeholderTextColor={colors.textLight}
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>AST (U/L)</Text>
                    <TextInput
                      style={styles.input}
                      value={editAst}
                      onChangeText={setEditAst}
                      keyboardType="numeric"
                      placeholder="e.g., 30"
                      placeholderTextColor={colors.textLight}
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>INR</Text>
                    <TextInput
                      style={styles.input}
                      value={editInr}
                      onChangeText={setEditInr}
                      keyboardType="decimal-pad"
                      placeholder="e.g., 1.0"
                      placeholderTextColor={colors.textLight}
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Notes (optional)</Text>
                    <TextInput
                      style={[styles.input, styles.textArea]}
                      value={editLabNotes}
                      onChangeText={setEditLabNotes}
                      placeholder="Additional notes"
                      placeholderTextColor={colors.textLight}
                      multiline
                      numberOfLines={3}
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
  countBadge: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    marginLeft: spacing.sm,
    minWidth: 24,
    alignItems: 'center',
  },
  countText: {
    fontSize: typography.tiny,
    fontWeight: typography.bold,
    color: '#FFFFFF',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.borderLight,
  },
  addButtonText: {
    fontSize: typography.caption,
    fontWeight: typography.semibold,
    color: colors.primary,
  },
  emptyState: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.xxl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
  },
  emptyStateText: {
    fontSize: typography.body,
    fontWeight: typography.semibold,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  emptyStateSubtext: {
    fontSize: typography.caption,
    fontWeight: typography.regular,
    color: colors.textLight,
  },
  entriesList: {
    gap: spacing.md,
  },
  entryCard: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.sm,
  },
  entryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  entryTimestamp: {
    fontSize: typography.caption,
    fontWeight: typography.semibold,
    color: colors.textSecondary,
  },
  entryValues: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  entryValue: {
    fontSize: typography.bodySmall,
    fontWeight: typography.medium,
    color: colors.text,
    backgroundColor: colors.backgroundAlt,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  entryNotes: {
    fontSize: typography.caption,
    fontWeight: typography.regular,
    color: colors.textSecondary,
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    lineHeight: 18,
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
  textArea: {
    minHeight: 80,
    paddingTop: spacing.md,
    textAlignVertical: 'top',
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
