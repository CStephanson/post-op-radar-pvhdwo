
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
  Pressable,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, typography, spacing, borderRadius, shadows } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import { Patient, Alert as PatientAlert, AlertStatus, TrendData, VitalEntry, LabEntry } from '@/types/patient';
import { calculateTrends, generateAlerts, calculateAlertStatus } from '@/utils/alertLogic';
import { getAllPatients, getPatientById, addVitalEntry, addLabEntry, deleteVitalEntry, deleteLabEntry, saveAllPatients } from '@/utils/localStorage';
import { CANADIAN_LAB_RANGES, CANADIAN_VITAL_RANGES, checkVitalAbnormalities, checkLabAbnormalities } from '@/utils/canadianUnits';
import { calculateAutoStatus } from '@/utils/autoStatus';

export default function PatientDetailScreen({ route, navigation }: any) {
  // CRITICAL: Read BOTH patientId AND patient object from route params
  const { patientId, patient: routePatient } = route.params || {};
  
  console.log('[PatientDetail] ========== SCREEN MOUNTED ==========');
  console.log('[PatientDetail] Route patientId:', patientId);
  console.log('[PatientDetail] Route has patient object:', !!routePatient);
  if (routePatient) {
    console.log('[PatientDetail] Route patient name:', routePatient.name, '| patientId:', routePatient.patientId);
  }
  
  const [patient, setPatient] = useState<Patient | null>(routePatient || null);
  const [alerts, setAlerts] = useState<PatientAlert[]>([]);
  const [trends, setTrends] = useState<TrendData[]>([]);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editType, setEditType] = useState<'vitals' | 'labs'>('vitals');
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'vitals' | 'labs', id: string, timestamp: string } | null>(null);
  const [loadError, setLoadError] = useState(false);
  // CRITICAL: Track AsyncStorage loading state separately
  const [isLoadingPatients, setIsLoadingPatients] = useState(true);
  const [showDebug, setShowDebug] = useState(false);
  const [debugInfo, setDebugInfo] = useState<any>(null);
  
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

  // CRITICAL: Background reconciliation with storage
  // MUST complete before evaluating patient existence
  const reconcileWithStorage = useCallback(async () => {
    try {
      console.log('[PatientDetail] ========== RECONCILIATION START ==========');
      console.log('[PatientDetail] Reconciling patientId:', patientId);
      console.log('[PatientDetail] isLoadingPatients: true (AsyncStorage read starting)');
      
      setIsLoadingPatients(true);
      
      const allPatients = await getAllPatients();
      console.log('[PatientDetail] Loaded', allPatients.length, 'patients from storage');
      console.log('[PatientDetail] AsyncStorage read complete');
      
      // Build debug info
      const debugData = {
        routePatientId: patientId,
        routePatientIdType: typeof patientId,
        hasRoutePatient: !!routePatient,
        storageKey: 'opmgmt_patients_v1',
        loadedPatientsCount: allPatients.length,
        firstThreePatientIds: allPatients.slice(0, 3).map(p => p.patientId).join(', '),
        allPatientIds: allPatients.map(p => p.patientId),
        matchFound: false,
      };
      
      // Try to find patient in storage
      const storedPatient = allPatients.find(p => String(p.patientId) === String(patientId));
      
      if (storedPatient) {
        console.log('[PatientDetail] FOUND patient in storage:', storedPatient.name);
        debugData.matchFound = true;
        setPatient(storedPatient);
        updatePatientAnalysis(storedPatient);
        setLoadError(false);
      } else {
        console.log('[PatientDetail] Patient NOT FOUND in storage');
        
        // If we have routePatient but it's not in storage, upsert it
        if (routePatient) {
          console.log('[PatientDetail] Upserting route patient into storage');
          
          // Ensure patientId is set correctly
          const patientToUpsert = {
            ...routePatient,
            patientId: String(patientId),
            updatedAt: new Date(),
          };
          
          const updatedPatients = [...allPatients, patientToUpsert];
          await saveAllPatients(updatedPatients);
          
          console.log('[PatientDetail] Patient upserted successfully');
          setPatient(patientToUpsert);
          updatePatientAnalysis(patientToUpsert);
          setLoadError(false);
        } else {
          console.log('[PatientDetail] No route patient to upsert - showing error');
          setLoadError(true);
        }
      }
      
      setDebugInfo(debugData);
      console.log('[PatientDetail] isLoadingPatients: false (AsyncStorage read finished)');
      console.log('[PatientDetail] ========== RECONCILIATION END ==========');
    } catch (error: any) {
      console.error('[PatientDetail] Error during reconciliation:', error);
      setLoadError(true);
    } finally {
      setIsLoadingPatients(false);
    }
  }, [patientId, routePatient]);

  useEffect(() => {
    // CRITICAL: Always reconcile with storage before evaluating patient existence
    // If we have routePatient, render immediately but STILL wait for storage to load
    if (routePatient) {
      console.log('[PatientDetail] Using route patient immediately:', routePatient.name);
      setPatient(routePatient);
      updatePatientAnalysis(routePatient);
      
      // CRITICAL: Still reconcile with storage to ensure data consistency
      // isLoadingPatients will remain true until reconciliation completes
      reconcileWithStorage();
    } else {
      // No route patient, must load from storage
      console.log('[PatientDetail] No route patient, loading from storage');
      reconcileWithStorage();
    }
  }, [routePatient, reconcileWithStorage]);

  const updatePatientAnalysis = (updatedPatient: Patient) => {
    const patientTrends = calculateTrends(updatedPatient);
    setTrends(patientTrends);
    const patientAlerts = generateAlerts(updatedPatient);
    setAlerts(patientAlerts);
    
    const autoStatusResult = calculateAutoStatus(updatedPatient);
    updatedPatient.computedStatus = autoStatusResult.status;
    
    if (updatedPatient.statusMode === 'manual' && updatedPatient.manualStatus) {
      updatedPatient.alertStatus = updatedPatient.manualStatus;
    } else {
      updatedPatient.alertStatus = autoStatusResult.status;
    }
  };

  const openEditModal = (type: 'vitals' | 'labs') => {
    console.log('[PatientDetail] User opened', type, 'edit modal');
    setEditType(type);
    
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
    if (!patient) {
      return;
    }
    
    try {
      console.log('[PatientDetail] User saving', editType, 'entry for patient:', patient.name);
      
      if (editType === 'vitals') {
        const hasValue = editHr || editBpSys || editBpDia || editRr || editTemp || editSpo2 || editUrineOutput || editPain;
        if (!hasValue) {
          Alert.alert('Validation Error', 'Please enter at least one vital sign value');
          return;
        }
        
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
        
        console.log('[PatientDetail] Adding vital entry:', newVitalEntry);
        const updatedPatient = await addVitalEntry(patient.patientId, newVitalEntry);
        
        console.log('[PatientDetail] Vital entry saved successfully');
        setPatient(updatedPatient);
        updatePatientAnalysis(updatedPatient);
        
        Alert.alert('Success', 'Vital signs saved successfully');
      } else {
        const hasValue = editWbc || editHb || editPlt || editNa || editK || editCr || editLactate || editBili || editAlt || editAst || editInr;
        if (!hasValue) {
          Alert.alert('Validation Error', 'Please enter at least one lab value');
          return;
        }
        
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
        
        console.log('[PatientDetail] Adding lab entry:', newLabEntry);
        const updatedPatient = await addLabEntry(patient.patientId, newLabEntry);
        
        console.log('[PatientDetail] Lab entry saved successfully');
        setPatient(updatedPatient);
        updatePatientAnalysis(updatedPatient);
        
        Alert.alert('Success', 'Lab values saved successfully');
      }
      
      setEditModalVisible(false);
    } catch (error: any) {
      console.error('[PatientDetail] Error saving entry:', error);
      Alert.alert(
        'Storage Error', 
        'Failed to save data to local storage. Please try again.',
        [
          { text: 'Retry', onPress: saveEdits },
          { text: 'Cancel', style: 'cancel' }
        ]
      );
    }
  };

  const confirmDeleteVital = (vitalId: string, timestamp: Date) => {
    const timestampText = formatTimestamp(timestamp);
    setDeleteTarget({ type: 'vitals', id: vitalId, timestamp: timestampText });
    setDeleteModalVisible(true);
  };

  const confirmDeleteLab = (labId: string, timestamp: Date) => {
    const timestampText = formatTimestamp(timestamp);
    setDeleteTarget({ type: 'labs', id: labId, timestamp: timestampText });
    setDeleteModalVisible(true);
  };

  const executeDelete = async () => {
    if (!patient || !deleteTarget) {
      return;
    }
    
    try {
      let updatedPatient: Patient;
      
      if (deleteTarget.type === 'vitals') {
        updatedPatient = await deleteVitalEntry(patient.patientId, deleteTarget.id);
      } else {
        updatedPatient = await deleteLabEntry(patient.patientId, deleteTarget.id);
      }
      
      setPatient(updatedPatient);
      updatePatientAnalysis(updatedPatient);
      
      setDeleteModalVisible(false);
      setDeleteTarget(null);
      
      const entryType = deleteTarget.type === 'vitals' ? 'Vital entry' : 'Lab entry';
      Alert.alert('Deleted', `${entryType} deleted successfully`);
    } catch (error: any) {
      console.error('[PatientDetail] Error deleting entry:', error);
      
      setDeleteModalVisible(false);
      setDeleteTarget(null);
      
      Alert.alert('Error', 'Failed to delete entry. Please try again.');
    }
  };

  const cancelDelete = () => {
    setDeleteModalVisible(false);
    setDeleteTarget(null);
  };

  // CRITICAL: Show loading state while AsyncStorage is being read
  // DO NOT evaluate patient existence until isLoadingPatients === false
  if (isLoadingPatients) {
    console.log('[PatientDetail] Rendering loading state (AsyncStorage still loading)');
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading patient data...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // CRITICAL: Only show "Patient Not Found" AFTER storage has finished loading
  // AND patient is still not found
  if (loadError || !patient) {
    console.log('[PatientDetail] Rendering error state (storage loaded, patient not found)');
    const routePatientIdStr = String(patientId || 'undefined');
    const hasRoutePatientStr = routePatient ? 'yes' : 'no';
    const storageKeyStr = 'opmgmt_patients_v1';
    const loadedCountStr = debugInfo ? String(debugInfo.loadedPatientsCount) : 'unknown';
    const firstThreeIdsStr = debugInfo ? debugInfo.firstThreePatientIds : 'unknown';
    const matchFoundStr = debugInfo ? (debugInfo.matchFound ? 'yes' : 'no') : 'unknown';

    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.errorContainer}>
          <IconSymbol
            ios_icon_name="exclamationmark.triangle.fill"
            android_material_icon_name="warning"
            size={64}
            color={colors.error}
          />
          <Text style={styles.errorTitle}>Patient Not Found</Text>
          <Text style={styles.errorMessage}>
            This patient could not be loaded from local storage. The patient may have been deleted or the data may be corrupted.
          </Text>

          <View style={styles.debugPanel}>
            <Text style={styles.debugTitle}>Debug Information</Text>
            <View style={styles.debugRow}>
              <Text style={styles.debugLabel}>Route patientId:</Text>
              <Text style={styles.debugValue}>{routePatientIdStr}</Text>
            </View>
            <View style={styles.debugRow}>
              <Text style={styles.debugLabel}>Route has patient object:</Text>
              <Text style={styles.debugValue}>{hasRoutePatientStr}</Text>
            </View>
            <View style={styles.debugRow}>
              <Text style={styles.debugLabel}>Storage key used:</Text>
              <Text style={styles.debugValue}>{storageKeyStr}</Text>
            </View>
            <View style={styles.debugRow}>
              <Text style={styles.debugLabel}>Loaded patients count:</Text>
              <Text style={styles.debugValue}>{loadedCountStr}</Text>
            </View>
            <View style={styles.debugRow}>
              <Text style={styles.debugLabel}>First 3 patientIds:</Text>
              <Text style={styles.debugValue}>{firstThreeIdsStr}</Text>
            </View>
            <View style={styles.debugRow}>
              <Text style={styles.debugLabel}>Match found:</Text>
              <Text style={styles.debugValue}>{matchFoundStr}</Text>
            </View>
            <View style={styles.debugRow}>
              <Text style={styles.debugLabel}>Storage loaded:</Text>
              <Text style={styles.debugValue}>yes</Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.errorButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.errorButtonText}>Return to Dashboard</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.errorRetryButton}
            onPress={reconcileWithStorage}
          >
            <Text style={styles.errorRetryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const getAlertColor = (status: AlertStatus) => {
    if (status === 'green') {
      return colors.alertGreen;
    }
    if (status === 'yellow') {
      return colors.alertYellow;
    }
    return colors.alertRed;
  };

  const getAlertBgColor = (status: AlertStatus) => {
    if (status === 'green') {
      return colors.alertGreenBg;
    }
    if (status === 'yellow') {
      return colors.alertYellowBg;
    }
    return colors.alertRedBg;
  };

  const getAlertBorderColor = (status: AlertStatus) => {
    if (status === 'green') {
      return colors.alertGreenBorder;
    }
    if (status === 'yellow') {
      return colors.alertYellowBorder;
    }
    return colors.alertRedBorder;
  };

  const getTrendIcon = (trend: 'rising' | 'falling' | 'stable') => {
    if (trend === 'rising') {
      return 'arrow-upward';
    }
    if (trend === 'falling') {
      return 'arrow-downward';
    }
    return 'remove';
  };

  const getTrendColor = (trendData: TrendData) => {
    if (trendData.concerning) {
      return colors.alertRed;
    }
    if (trendData.trend === 'stable') {
      return colors.textLight;
    }
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

  const sortedVitals = [...(patient.vitalEntries || [])].sort((a, b) => 
    new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
  const sortedLabs = [...(patient.labEntries || [])].sort((a, b) => 
    new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  const vitalCountText = `${sortedVitals.length}`;
  const labCountText = `${sortedLabs.length}`;

  const renderVitalEntry = ({ item }: { item: VitalEntry }) => {
    const timestampText = formatTimestamp(new Date(item.timestamp));
    
    const abnormalities = checkVitalAbnormalities(item);
    const abnormalFields = new Set(abnormalities.map(a => a.field));
    
    const primaryValues = [];
    if (item.hr) {
      primaryValues.push({ 
        label: 'HR', 
        value: `${item.hr}`, 
        unit: 'bpm',
        isAbnormal: abnormalFields.has('hr'),
      });
    }
    if (item.bpSys && item.bpDia) {
      const bpAbnormal = abnormalFields.has('bpSys') || abnormalFields.has('bpDia');
      primaryValues.push({ 
        label: 'BP', 
        value: `${item.bpSys}/${item.bpDia}`, 
        unit: 'mmHg',
        isAbnormal: bpAbnormal,
      });
    }
    if (item.temp) {
      primaryValues.push({ 
        label: 'Temp', 
        value: `${item.temp.toFixed(1)}`, 
        unit: '°C',
        isAbnormal: abnormalFields.has('temp'),
      });
    }
    
    const secondaryValues = [];
    if (item.rr) {
      secondaryValues.push({ 
        label: 'RR', 
        value: `${item.rr}`, 
        unit: '/min',
        isAbnormal: abnormalFields.has('rr'),
      });
    }
    if (item.spo2) {
      secondaryValues.push({ 
        label: 'SpO₂', 
        value: `${item.spo2}`, 
        unit: '%',
        isAbnormal: abnormalFields.has('spo2'),
      });
    }
    if (item.urineOutput) {
      secondaryValues.push({ 
        label: 'UO', 
        value: `${item.urineOutput}`, 
        unit: 'ml/hr',
        isAbnormal: abnormalFields.has('urineOutput'),
      });
    }
    if (item.pain !== undefined) {
      secondaryValues.push({ 
        label: 'Pain', 
        value: `${item.pain}`, 
        unit: '/10',
        isAbnormal: false,
      });
    }

    return (
      <View style={styles.cleanEntryCard}>
        <View style={styles.cleanEntryHeader}>
          <Text style={styles.cleanTimestamp}>{timestampText}</Text>
          <Pressable 
            onPress={() => confirmDeleteVital(item.id, new Date(item.timestamp))}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            style={styles.deleteButton}
          >
            <IconSymbol
              ios_icon_name="trash"
              android_material_icon_name="delete"
              size={18}
              color={colors.error}
            />
          </Pressable>
        </View>

        {primaryValues.length > 0 && (
          <View style={styles.primaryValuesGrid}>
            {primaryValues.map((val, idx) => (
              <View key={idx} style={[
                styles.primaryValueItem,
                val.isAbnormal && styles.abnormalValueItem,
              ]}>
                <View style={styles.primaryValueLabelRow}>
                  <Text style={styles.primaryValueLabel}>{val.label}</Text>
                  {val.isAbnormal && (
                    <IconSymbol
                      ios_icon_name="exclamationmark.triangle.fill"
                      android_material_icon_name="warning"
                      size={12}
                      color={colors.alertRed}
                    />
                  )}
                </View>
                <View style={styles.primaryValueRow}>
                  <Text style={[
                    styles.primaryValueText,
                    val.isAbnormal && styles.abnormalValueText,
                  ]}>{val.value}</Text>
                  <Text style={styles.primaryValueUnit}>{val.unit}</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {secondaryValues.length > 0 && (
          <View style={styles.secondaryValuesGrid}>
            {secondaryValues.map((val, idx) => (
              <View key={idx} style={[
                styles.secondaryValueItem,
                val.isAbnormal && styles.abnormalValueItem,
              ]}>
                <View style={styles.secondaryValueLabelRow}>
                  <Text style={styles.secondaryValueLabel}>{val.label}</Text>
                  {val.isAbnormal && (
                    <IconSymbol
                      ios_icon_name="exclamationmark.triangle.fill"
                      android_material_icon_name="warning"
                      size={10}
                      color={colors.alertRed}
                    />
                  )}
                </View>
                <Text style={[
                  styles.secondaryValueText,
                  val.isAbnormal && styles.abnormalValueText,
                ]}>
                  {val.value}
                  <Text style={styles.secondaryValueUnit}> {val.unit}</Text>
                </Text>
              </View>
            ))}
          </View>
        )}

        {abnormalities.length > 0 && (
          <View style={styles.abnormalSummary}>
            <IconSymbol
              ios_icon_name="exclamationmark.triangle.fill"
              android_material_icon_name="warning"
              size={14}
              color={colors.alertRed}
            />
            <Text style={styles.abnormalSummaryText}>
              {abnormalities.length} {abnormalities.length === 1 ? 'value' : 'values'} out of range
            </Text>
          </View>
        )}

        {item.notes && (
          <View style={styles.notesContainer}>
            <Text style={styles.notesText}>{item.notes}</Text>
          </View>
        )}
      </View>
    );
  };

  const renderLabEntry = ({ item }: { item: LabEntry }) => {
    const timestampText = formatTimestamp(new Date(item.timestamp));
    
    const abnormalities = checkLabAbnormalities(item);
    const abnormalFields = new Set(abnormalities.map(a => a.field));
    
    const primaryValues = [];
    if (item.wbc) {
      primaryValues.push({ 
        label: 'WBC', 
        value: item.wbc.toFixed(1), 
        unit: 'x10⁹/L',
        isAbnormal: abnormalFields.has('wbc'),
      });
    }
    if (item.hb) {
      primaryValues.push({ 
        label: 'Hb', 
        value: Math.round(item.hb).toString(), 
        unit: 'g/L',
        isAbnormal: abnormalFields.has('hb'),
      });
    }
    if (item.cr) {
      primaryValues.push({ 
        label: 'Cr', 
        value: Math.round(item.cr).toString(), 
        unit: 'µmol/L',
        isAbnormal: abnormalFields.has('cr'),
      });
    }
    if (item.lactate) {
      primaryValues.push({ 
        label: 'Lactate', 
        value: item.lactate.toFixed(1), 
        unit: 'mmol/L',
        isAbnormal: abnormalFields.has('lactate'),
      });
    }
    
    const secondaryValues = [];
    if (item.na) {
      secondaryValues.push({ 
        label: 'Na', 
        value: `${item.na}`, 
        unit: 'mmol/L',
        isAbnormal: abnormalFields.has('na'),
      });
    }
    if (item.k) {
      secondaryValues.push({ 
        label: 'K', 
        value: item.k.toFixed(1), 
        unit: 'mmol/L',
        isAbnormal: abnormalFields.has('k'),
      });
    }
    if (item.plt) {
      secondaryValues.push({ 
        label: 'Plt', 
        value: `${item.plt}`, 
        unit: 'x10⁹/L',
        isAbnormal: abnormalFields.has('plt'),
      });
    }
    if (item.inr) {
      secondaryValues.push({ 
        label: 'INR', 
        value: item.inr.toFixed(2), 
        unit: '',
        isAbnormal: abnormalFields.has('inr'),
      });
    }
    if (item.bili) {
      secondaryValues.push({ 
        label: 'Bili', 
        value: Math.round(item.bili).toString(), 
        unit: 'µmol/L',
        isAbnormal: abnormalFields.has('bili'),
      });
    }
    if (item.alt) {
      secondaryValues.push({ 
        label: 'ALT', 
        value: `${item.alt}`, 
        unit: 'U/L',
        isAbnormal: abnormalFields.has('alt'),
      });
    }
    if (item.ast) {
      secondaryValues.push({ 
        label: 'AST', 
        value: `${item.ast}`, 
        unit: 'U/L',
        isAbnormal: abnormalFields.has('ast'),
      });
    }

    return (
      <View style={styles.cleanEntryCard}>
        <View style={styles.cleanEntryHeader}>
          <Text style={styles.cleanTimestamp}>{timestampText}</Text>
          <Pressable 
            onPress={() => confirmDeleteLab(item.id, new Date(item.timestamp))}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            style={styles.deleteButton}
          >
            <IconSymbol
              ios_icon_name="trash"
              android_material_icon_name="delete"
              size={18}
              color={colors.error}
            />
          </Pressable>
        </View>

        {primaryValues.length > 0 && (
          <View style={styles.primaryValuesGrid}>
            {primaryValues.map((val, idx) => (
              <View key={idx} style={[
                styles.primaryValueItem,
                val.isAbnormal && styles.abnormalValueItem,
              ]}>
                <View style={styles.primaryValueLabelRow}>
                  <Text style={styles.primaryValueLabel}>{val.label}</Text>
                  {val.isAbnormal && (
                    <IconSymbol
                      ios_icon_name="exclamationmark.triangle.fill"
                      android_material_icon_name="warning"
                      size={12}
                      color={colors.alertRed}
                    />
                  )}
                </View>
                <View style={styles.primaryValueRow}>
                  <Text style={[
                    styles.primaryValueText,
                    val.isAbnormal && styles.abnormalValueText,
                  ]}>{val.value}</Text>
                  {val.unit && <Text style={styles.primaryValueUnit}>{val.unit}</Text>}
                </View>
              </View>
            ))}
          </View>
        )}

        {secondaryValues.length > 0 && (
          <View style={styles.secondaryValuesGrid}>
            {secondaryValues.map((val, idx) => (
              <View key={idx} style={[
                styles.secondaryValueItem,
                val.isAbnormal && styles.abnormalValueItem,
              ]}>
                <View style={styles.secondaryValueLabelRow}>
                  <Text style={styles.secondaryValueLabel}>{val.label}</Text>
                  {val.isAbnormal && (
                    <IconSymbol
                      ios_icon_name="exclamationmark.triangle.fill"
                      android_material_icon_name="warning"
                      size={10}
                      color={colors.alertRed}
                    />
                  )}
                </View>
                <Text style={[
                  styles.secondaryValueText,
                  val.isAbnormal && styles.abnormalValueText,
                ]}>
                  {val.value}
                  {val.unit && <Text style={styles.secondaryValueUnit}> {val.unit}</Text>}
                </Text>
              </View>
            ))}
          </View>
        )}

        {abnormalities.length > 0 && (
          <View style={styles.abnormalSummary}>
            <IconSymbol
              ios_icon_name="exclamationmark.triangle.fill"
              android_material_icon_name="warning"
              size={14}
              color={colors.alertRed}
            />
            <Text style={styles.abnormalSummaryText}>
              {abnormalities.length} {abnormalities.length === 1 ? 'value' : 'values'} out of range
            </Text>
          </View>
        )}

        {item.notes && (
          <View style={styles.notesContainer}>
            <Text style={styles.notesText}>{item.notes}</Text>
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
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
          
          {patient.statusMode !== 'manual' && patient.computedStatus && (
            <View style={styles.autoStatusSummary}>
              <IconSymbol
                ios_icon_name="chart.bar.fill"
                android_material_icon_name="assessment"
                size={14}
                color={colors.textSecondary}
              />
              <Text style={styles.autoStatusText}>
                {(() => {
                  const autoStatus = calculateAutoStatus(patient);
                  return autoStatus.summary;
                })()}
              </Text>
            </View>
          )}
        </View>

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

        <View style={styles.section}>
          <TouchableOpacity
            style={styles.infoLinkCard}
            onPress={() => navigation.navigate('PatientInfo', { patientId })}
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
            <FlatList
              data={sortedVitals}
              renderItem={renderVitalEntry}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
              contentContainerStyle={styles.entriesList}
            />
          )}
        </View>

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
            <FlatList
              data={sortedLabs}
              renderItem={renderLabEntry}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
              contentContainerStyle={styles.entriesList}
            />
          )}
        </View>

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

      <Modal
        visible={deleteModalVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={cancelDelete}
      >
        <View style={styles.deleteModalOverlay}>
          <View style={styles.deleteModalContent}>
            <Text style={styles.deleteModalTitle}>Delete this entry?</Text>
            {deleteTarget && (
              <Text style={styles.deleteModalMessage}>
                {deleteTarget.type === 'vitals' ? 'Vital signs' : 'Lab values'} from {deleteTarget.timestamp}
              </Text>
            )}
            <View style={styles.deleteModalActions}>
              <Pressable style={styles.deleteModalCancelButton} onPress={cancelDelete}>
                <Text style={styles.deleteModalCancelText}>Cancel</Text>
              </Pressable>
              <Pressable style={styles.deleteModalDeleteButton} onPress={executeDelete}>
                <Text style={styles.deleteModalDeleteText}>Delete</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

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
                    <Text style={styles.inputLabel}>WBC (x10⁹/L)</Text>
                    <TextInput
                      style={styles.input}
                      value={editWbc}
                      onChangeText={setEditWbc}
                      keyboardType="decimal-pad"
                      placeholder="e.g., 9.5 (normal: 4.0-11.0)"
                      placeholderTextColor={colors.textLight}
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Hemoglobin (g/L) - Canadian units</Text>
                    <TextInput
                      style={styles.input}
                      value={editHb}
                      onChangeText={setEditHb}
                      keyboardType="numeric"
                      placeholder="e.g., 132 (normal: 120-160)"
                      placeholderTextColor={colors.textLight}
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Platelets (x10⁹/L)</Text>
                    <TextInput
                      style={styles.input}
                      value={editPlt}
                      onChangeText={setEditPlt}
                      keyboardType="numeric"
                      placeholder="e.g., 250 (normal: 150-400)"
                      placeholderTextColor={colors.textLight}
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Sodium (mmol/L)</Text>
                    <TextInput
                      style={styles.input}
                      value={editNa}
                      onChangeText={setEditNa}
                      keyboardType="numeric"
                      placeholder="e.g., 140 (normal: 135-145)"
                      placeholderTextColor={colors.textLight}
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Potassium (mmol/L)</Text>
                    <TextInput
                      style={styles.input}
                      value={editK}
                      onChangeText={setEditK}
                      keyboardType="decimal-pad"
                      placeholder="e.g., 4.2 (normal: 3.5-5.0)"
                      placeholderTextColor={colors.textLight}
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Creatinine (µmol/L) - Canadian units</Text>
                    <TextInput
                      style={styles.input}
                      value={editCr}
                      onChangeText={setEditCr}
                      keyboardType="numeric"
                      placeholder="e.g., 88 (normal: 60-110)"
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
                      placeholder="e.g., 1.2 (normal: 0.5-2.0)"
                      placeholderTextColor={colors.textLight}
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Bilirubin (µmol/L) - Canadian units</Text>
                    <TextInput
                      style={styles.input}
                      value={editBili}
                      onChangeText={setEditBili}
                      keyboardType="numeric"
                      placeholder="e.g., 17 (normal: 5-21)"
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
    gap: spacing.lg,
  },
  loadingText: {
    fontSize: typography.body,
    color: colors.textSecondary,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xxl,
    gap: spacing.lg,
  },
  errorTitle: {
    fontSize: typography.h2,
    fontWeight: typography.bold,
    color: colors.text,
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: typography.body,
    fontWeight: typography.regular,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
  },
  debugPanel: {
    backgroundColor: colors.backgroundAlt,
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    width: '100%',
    marginTop: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  debugTitle: {
    fontSize: typography.bodySmall,
    fontWeight: typography.bold,
    color: colors.text,
    marginBottom: spacing.md,
  },
  debugRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  debugLabel: {
    fontSize: typography.caption,
    fontWeight: typography.semibold,
    color: colors.textSecondary,
    flex: 1,
  },
  debugValue: {
    fontSize: typography.caption,
    fontWeight: typography.regular,
    color: colors.text,
    flex: 1,
    textAlign: 'right',
  },
  errorButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xxl,
    paddingVertical: spacing.lg,
    borderRadius: borderRadius.lg,
    marginTop: spacing.md,
  },
  errorButtonText: {
    fontSize: typography.body,
    fontWeight: typography.bold,
    color: '#FFFFFF',
  },
  errorRetryButton: {
    backgroundColor: colors.backgroundAlt,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  errorRetryButtonText: {
    fontSize: typography.bodySmall,
    fontWeight: typography.semibold,
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
  autoStatusSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  autoStatusText: {
    flex: 1,
    fontSize: typography.caption,
    fontWeight: typography.medium,
    color: colors.textSecondary,
    lineHeight: 18,
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
  cleanEntryCard: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.sm,
  },
  cleanEntryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  cleanTimestamp: {
    fontSize: typography.bodySmall,
    fontWeight: typography.semibold,
    color: colors.textSecondary,
    letterSpacing: 0.2,
  },
  deleteButton: {
    padding: spacing.xs,
  },
  primaryValuesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.lg,
    marginBottom: spacing.sm,
  },
  primaryValueItem: {
    minWidth: 80,
  },
  abnormalValueItem: {
    backgroundColor: colors.alertRedBg,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.alertRedBorder,
  },
  primaryValueLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs - 2,
    marginBottom: spacing.xs,
  },
  primaryValueLabel: {
    fontSize: typography.caption,
    fontWeight: typography.medium,
    color: colors.textLight,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  abnormalValueText: {
    color: colors.alertRed,
  },
  primaryValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.xs,
  },
  primaryValueText: {
    fontSize: typography.h4,
    fontWeight: typography.bold,
    color: colors.text,
    letterSpacing: -0.3,
  },
  primaryValueUnit: {
    fontSize: typography.caption,
    fontWeight: typography.medium,
    color: colors.textSecondary,
  },
  secondaryValuesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  secondaryValueItem: {
    minWidth: 70,
  },
  secondaryValueLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs - 3,
    marginBottom: 2,
  },
  secondaryValueLabel: {
    fontSize: typography.tiny,
    fontWeight: typography.medium,
    color: colors.textLight,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  secondaryValueText: {
    fontSize: typography.bodySmall,
    fontWeight: typography.semibold,
    color: colors.textSecondary,
  },
  secondaryValueUnit: {
    fontSize: typography.tiny,
    fontWeight: typography.regular,
    color: colors.textLight,
  },
  abnormalSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.alertRedBorder,
  },
  abnormalSummaryText: {
    fontSize: typography.caption,
    fontWeight: typography.semibold,
    color: colors.alertRed,
  },
  notesContainer: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  notesText: {
    fontSize: typography.caption,
    fontWeight: typography.regular,
    color: colors.textSecondary,
    lineHeight: 18,
    fontStyle: 'italic',
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
  deleteModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  deleteModalContent: {
    backgroundColor: colors.backgroundAlt,
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    width: '100%',
    maxWidth: 400,
    ...shadows.lg,
  },
  deleteModalTitle: {
    fontSize: typography.h4,
    fontWeight: typography.bold,
    color: colors.text,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  deleteModalMessage: {
    fontSize: typography.body,
    fontWeight: typography.regular,
    color: colors.textSecondary,
    marginBottom: spacing.xl,
    textAlign: 'center',
    lineHeight: 22,
  },
  deleteModalActions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  deleteModalCancelButton: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: colors.borderLight,
    alignItems: 'center',
  },
  deleteModalCancelText: {
    fontSize: typography.body,
    fontWeight: typography.semibold,
    color: colors.textSecondary,
  },
  deleteModalDeleteButton: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: colors.error,
    alignItems: 'center',
  },
  deleteModalDeleteText: {
    fontSize: typography.body,
    fontWeight: typography.semibold,
    color: '#FFFFFF',
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
