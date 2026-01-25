
import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Platform,
  ActivityIndicator,
  Alert,
  Pressable,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { colors, typography, spacing, borderRadius, shadows } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import { Patient, AlertStatus, SortOption } from '@/types/patient';
import { getAllPatients, deletePatient, updatePatient } from '@/utils/localStorage';
import { calculateAutoStatus } from '@/utils/autoStatus';

export default function HomeScreen() {
  const navigation = useNavigation();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<SortOption>('status');
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [patientToDelete, setPatientToDelete] = useState<Patient | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadPatients = useCallback(async () => {
    setLoading(true);
    try {
      const patientsData = await getAllPatients();
      
      const patientsWithIds = patientsData.map(p => {
        if (!p.id) {
          return { ...p, id: `patient_${Date.now()}_${Math.random().toString(36).substr(2, 9)}` };
        }
        return p;
      });
      
      const patientsWithAutoStatus = patientsWithIds.map(patient => {
        const autoStatusResult = calculateAutoStatus(patient);
        const updatedPatient = {
          ...patient,
          computedStatus: autoStatusResult.status,
          abnormalCount: autoStatusResult.abnormalCount,
          mostRecentAbnormalTimestamp: autoStatusResult.mostRecentAbnormalTimestamp,
        };
        
        if (updatedPatient.statusMode !== 'manual') {
          updatedPatient.alertStatus = autoStatusResult.status;
        }
        
        return updatedPatient;
      });
      
      setPatients(patientsWithAutoStatus);
    } catch (err: any) {
      console.error('[HomeScreen] Error loading patients:', err);
      Alert.alert(
        'Storage Error',
        'Failed to load patients from local storage. Please try again.',
        [
          { 
            text: 'Retry', 
            onPress: () => loadPatients() 
          },
          { 
            text: 'OK', 
            style: 'cancel' 
          }
        ]
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadPatients();
    }, [loadPatients])
  );

  const sortPatients = (patientsToSort: Patient[], sortOption: SortOption): Patient[] => {
    const sorted = [...patientsToSort];
    
    if (sortOption === 'name') {
      sorted.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortOption === 'date') {
      sorted.sort((a, b) => {
        const dateA = a.operationDateTime ? new Date(a.operationDateTime).getTime() : 0;
        const dateB = b.operationDateTime ? new Date(b.operationDateTime).getTime() : 0;
        return dateB - dateA;
      });
    } else if (sortOption === 'location') {
      sorted.sort((a, b) => {
        const locA = a.hospitalLocation || '';
        const locB = b.hospitalLocation || '';
        return locA.localeCompare(locB);
      });
    } else if (sortOption === 'status') {
      const statusOrder = { red: 0, yellow: 1, green: 2 };
      sorted.sort((a, b) => {
        const statusDiff = statusOrder[a.alertStatus] - statusOrder[b.alertStatus];
        if (statusDiff !== 0) {
          return statusDiff;
        }
        
        if (a.alertStatus === 'red' && b.alertStatus === 'red') {
          const abnormalCountA = a.abnormalCount || 0;
          const abnormalCountB = b.abnormalCount || 0;
          
          if (abnormalCountA !== abnormalCountB) {
            return abnormalCountB - abnormalCountA;
          }
          
          const timestampA = a.mostRecentAbnormalTimestamp ? new Date(a.mostRecentAbnormalTimestamp).getTime() : 0;
          const timestampB = b.mostRecentAbnormalTimestamp ? new Date(b.mostRecentAbnormalTimestamp).getTime() : 0;
          
          if (timestampA !== timestampB) {
            return timestampB - timestampA;
          }
          
          return a.name.localeCompare(b.name);
        }
        
        return 0;
      });
    }
    
    return sorted;
  };

  const handlePatientPress = (patientId: string) => {
    navigation.navigate('PatientDetail' as never, { id: patientId } as never);
  };

  const handleAddPatient = () => {
    navigation.navigate('AddPatient' as never);
  };

  const requestDeletePatient = (patient: Patient) => {
    setPatientToDelete(patient);
    setDeleteModalVisible(true);
  };

  const confirmDelete = async () => {
    if (!patientToDelete) {
      return;
    }
    
    setDeleting(true);
    
    try {
      await deletePatient(patientToDelete.id);
      
      const verifyPatients = await getAllPatients();
      
      const stillExists = verifyPatients.find(p => p.id === patientToDelete.id);
      if (stillExists) {
        throw new Error('Failed to verify patient was deleted');
      }
      
      setPatients(verifyPatients);
      setDeleteModalVisible(false);
      setPatientToDelete(null);
      
      Alert.alert('Success', `${patientToDelete.name} has been deleted.`);
      
    } catch (error: any) {
      console.error('[HomeScreen] Error deleting patient:', error);
      Alert.alert(
        'Delete Failed',
        'Failed to delete patient from local storage. Please try again.',
        [
          { text: 'Retry', onPress: confirmDelete },
          { text: 'Cancel', style: 'cancel' }
        ]
      );
    } finally {
      setDeleting(false);
    }
  };

  const cancelDelete = () => {
    setDeleteModalVisible(false);
    setPatientToDelete(null);
  };

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

  const getAlertLabel = (status: AlertStatus) => {
    if (status === 'green') return 'Stable';
    if (status === 'yellow') return 'Monitor';
    return 'Reassess';
  };

  const getAlertIcon = (status: AlertStatus) => {
    if (status === 'green') return 'check-circle';
    if (status === 'yellow') return 'warning';
    return 'error';
  };

  const getSortLabel = (option: SortOption) => {
    if (option === 'name') return 'Name';
    if (option === 'date') return 'Date';
    if (option === 'location') return 'Location';
    return 'Status';
  };

  const getSortIcon = (option: SortOption) => {
    if (option === 'name') return 'sort-by-alpha';
    if (option === 'date') return 'calendar-today';
    if (option === 'location') return 'location-on';
    return 'warning';
  };

  const renderPatientCard = ({ item: patient }: { item: Patient }) => {
    const alertColor = getAlertColor(patient.alertStatus);
    const alertBgColor = getAlertBgColor(patient.alertStatus);
    const alertBorderColor = getAlertBorderColor(patient.alertStatus);
    const alertLabel = getAlertLabel(patient.alertStatus);
    const alertIcon = getAlertIcon(patient.alertStatus);
    const podText = `POD ${patient.postOpDay}`;
    
    const displayName = patient.name && patient.name.trim() ? patient.name : 'Unnamed Patient';
    
    const isManualStatus = patient.statusMode === 'manual';
    const isRedStatus = patient.alertStatus === 'red';
    const abnormalCountValue = patient.abnormalCount || 0;
    const abnormalCountText = `Abnormal: ${abnormalCountValue}`;

    return (
      <View style={styles.patientCard}>
        <TouchableOpacity
          onPress={() => handlePatientPress(patient.id)}
          activeOpacity={0.7}
          style={styles.patientCardTouchable}
        >
          <View style={[styles.alertBar, { 
            backgroundColor: alertBgColor,
            borderLeftColor: alertColor,
          }]}>
            <IconSymbol
              ios_icon_name="circle.fill"
              android_material_icon_name={alertIcon}
              size={10}
              color={alertColor}
            />
            <Text style={[styles.alertLabel, { color: alertColor }]}>
              {alertLabel}
            </Text>
            {isManualStatus && (
              <View style={styles.manualBadge}>
                <Text style={styles.manualBadgeText}>MANUAL</Text>
              </View>
            )}
            {isRedStatus && abnormalCountValue > 0 && (
              <View style={styles.abnormalBadge}>
                <Text style={styles.abnormalBadgeText}>{abnormalCountText}</Text>
              </View>
            )}
          </View>

          <View style={styles.cardContent}>
            <View style={styles.patientInfo}>
              <Text style={styles.patientName}>{displayName}</Text>
              
              <View style={styles.metaRow}>
                <View style={styles.podBadge}>
                  <Text style={styles.podText}>{podText}</Text>
                </View>
                {patient.hospitalLocation && (
                  <View style={styles.locationBadge}>
                    <IconSymbol
                      ios_icon_name="location"
                      android_material_icon_name="location-on"
                      size={9}
                      color={colors.textMuted}
                    />
                    <Text style={styles.locationText}>{patient.hospitalLocation}</Text>
                  </View>
                )}
              </View>
              
              <Text style={styles.procedureType}>{patient.procedureType}</Text>
            </View>

            <IconSymbol
              ios_icon_name="chevron.right"
              android_material_icon_name="chevron-right"
              size={16}
              color={colors.iconLight}
              style={styles.chevron}
            />
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => requestDeletePatient(patient)}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <IconSymbol
            ios_icon_name="trash"
            android_material_icon_name="delete"
            size={20}
            color={colors.error}
          />
        </TouchableOpacity>
      </View>
    );
  };

  const sortedPatients = sortPatients(patients, sortBy);
  const currentSortLabel = getSortLabel(sortBy);
  const patientCountText = `${sortedPatients.length}`;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <View style={styles.headerLeft}>
              <Text style={styles.headerTitle}>OpMGMT</Text>
              <View style={styles.disclaimerBadge}>
                <IconSymbol
                  ios_icon_name="info.circle.fill"
                  android_material_icon_name="info"
                  size={10}
                  color={colors.textMuted}
                />
                <Text style={styles.disclaimerText}>Educational use only • Canadian units</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.listHeader}>
          <View style={styles.listHeaderLeft}>
            <Text style={styles.listTitle}>Patients</Text>
            <View style={styles.countBadge}>
              <Text style={styles.patientCount}>{patientCountText}</Text>
            </View>
          </View>
          
          <TouchableOpacity
            style={styles.sortButton}
            onPress={() => setShowSortMenu(!showSortMenu)}
          >
            <IconSymbol
              ios_icon_name="arrow.up.arrow.down"
              android_material_icon_name="sort"
              size={14}
              color={colors.iconSecondary}
            />
            <Text style={styles.sortButtonText}>{currentSortLabel}</Text>
          </TouchableOpacity>
        </View>

        {showSortMenu && (
          <View style={styles.sortMenu}>
            {(['status', 'name', 'date', 'location'] as SortOption[]).map((option, index) => {
              const label = getSortLabel(option);
              const icon = getSortIcon(option);
              const isActive = sortBy === option;
              
              return (
                <React.Fragment key={index}>
                  <TouchableOpacity
                    style={[styles.sortMenuItem, isActive && styles.sortMenuItemActive]}
                    onPress={() => {
                      setSortBy(option);
                      setShowSortMenu(false);
                    }}
                  >
                    <IconSymbol
                      ios_icon_name="checkmark"
                      android_material_icon_name={icon}
                      size={18}
                      color={isActive ? colors.primary : colors.iconLight}
                    />
                    <Text style={[styles.sortMenuItemText, isActive && styles.sortMenuItemTextActive]}>
                      {label}
                    </Text>
                  </TouchableOpacity>
                </React.Fragment>
              );
            })}
          </View>
        )}

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Loading patients...</Text>
          </View>
        ) : sortedPatients.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconContainer}>
              <IconSymbol
                ios_icon_name="person.badge.plus"
                android_material_icon_name="person-add"
                size={56}
                color={colors.iconLight}
              />
            </View>
            <Text style={styles.emptyStateTitle}>No Patients Yet</Text>
            <Text style={styles.emptyStateText}>
              Add your first patient to start monitoring post-operative recovery
            </Text>
            <TouchableOpacity style={styles.addButton} onPress={handleAddPatient}>
              <IconSymbol
                ios_icon_name="plus"
                android_material_icon_name="add"
                size={20}
                color="#FFFFFF"
              />
              <Text style={styles.addButtonText}>Add Patient</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={sortedPatients}
            renderItem={renderPatientCard}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          />
        )}

        <Pressable
          onPress={handleAddPatient}
          style={({ pressed }) => [
            styles.fabButton,
            pressed && styles.fabButtonPressed
          ]}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <IconSymbol
            ios_icon_name="plus"
            android_material_icon_name="add"
            size={28}
            color="#FFFFFF"
          />
        </Pressable>

        <Modal
          visible={deleteModalVisible}
          transparent={true}
          animationType="fade"
          onRequestClose={cancelDelete}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <IconSymbol
                  ios_icon_name="exclamationmark.triangle.fill"
                  android_material_icon_name="warning"
                  size={48}
                  color={colors.error}
                />
                <Text style={styles.modalTitle}>Delete patient?</Text>
              </View>

              <Text style={styles.modalBody}>
                Delete {patientToDelete?.name || 'this patient'}?
              </Text>

              <Text style={styles.modalWarning}>
                This will permanently delete all patient data including vitals, labs, and notes. This action cannot be undone.
              </Text>

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.modalCancelButton}
                  onPress={cancelDelete}
                  disabled={deleting}
                >
                  <Text style={styles.modalCancelButtonText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.modalDeleteButton, deleting && styles.modalDeleteButtonDisabled]}
                  onPress={confirmDelete}
                  disabled={deleting}
                >
                  {deleting ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <Text style={styles.modalDeleteButtonText}>Delete</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </View>
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
    backgroundColor: colors.background,
  },
  header: {
    backgroundColor: colors.backgroundAlt,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md - 2,
  },
  headerLeft: {
    flex: 1,
    gap: spacing.xs - 3,
  },
  headerTitle: {
    fontSize: typography.h5,
    fontWeight: typography.semibold,
    color: colors.text,
    letterSpacing: -0.1,
  },
  disclaimerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs - 3,
  },
  disclaimerText: {
    fontSize: typography.tiny - 2,
    fontWeight: typography.medium,
    color: colors.textMuted,
    letterSpacing: 0.1,
  },
  listHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    marginTop: spacing.xxl + spacing.sm,
    marginBottom: spacing.lg + spacing.xs,
  },
  listHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  listTitle: {
    fontSize: typography.h2,
    fontWeight: typography.bold,
    color: colors.text,
    letterSpacing: -0.4,
  },
  countBadge: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md - 2,
    paddingVertical: spacing.xs - 3,
    borderRadius: borderRadius.full,
    minWidth: 26,
    alignItems: 'center',
  },
  patientCount: {
    fontSize: typography.caption - 1,
    fontWeight: typography.bold,
    color: '#FFFFFF',
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs - 1,
    paddingHorizontal: spacing.md - 2,
    paddingVertical: spacing.sm - 1,
    backgroundColor: colors.backgroundAlt,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sortButtonText: {
    fontSize: typography.caption - 1,
    fontWeight: typography.semibold,
    color: colors.textSecondary,
  },
  sortMenu: {
    backgroundColor: colors.backgroundAlt,
    marginHorizontal: spacing.xl,
    marginBottom: spacing.lg,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.md,
    overflow: 'hidden',
  },
  sortMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md + 2,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  sortMenuItemActive: {
    backgroundColor: colors.primarySubtle,
  },
  sortMenuItemText: {
    fontSize: typography.body,
    fontWeight: typography.regular,
    color: colors.text,
  },
  sortMenuItemTextActive: {
    fontWeight: typography.bold,
    color: colors.primary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.xxxxl,
    gap: spacing.lg,
  },
  loadingText: {
    fontSize: typography.body,
    color: colors.textSecondary,
  },
  emptyState: {
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xxxxl,
    gap: spacing.lg,
  },
  emptyIconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.borderLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  emptyStateTitle: {
    fontSize: typography.h2,
    fontWeight: typography.bold,
    color: colors.text,
    textAlign: 'center',
  },
  emptyStateText: {
    fontSize: typography.body,
    fontWeight: typography.regular,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    maxWidth: 320,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xxl,
    paddingVertical: spacing.lg,
    borderRadius: borderRadius.lg,
    marginTop: spacing.md,
    ...shadows.md,
  },
  addButtonText: {
    fontSize: typography.body,
    fontWeight: typography.bold,
    color: '#FFFFFF',
  },
  listContent: {
    paddingBottom: spacing.xxxxl * 2,
  },
  patientCard: {
    backgroundColor: colors.card,
    marginHorizontal: spacing.xl,
    marginBottom: spacing.lg + spacing.xs,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    ...shadows.sm,
    position: 'relative',
  },
  patientCardTouchable: {
    flex: 1,
  },
  alertBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    gap: spacing.sm - 1,
    borderLeftWidth: 4,
  },
  alertLabel: {
    fontSize: typography.caption - 1,
    fontWeight: typography.bold,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  manualBadge: {
    marginLeft: spacing.sm,
    paddingHorizontal: spacing.sm - 1,
    paddingVertical: 1,
    backgroundColor: colors.textLight,
    borderRadius: borderRadius.xs,
  },
  manualBadgeText: {
    fontSize: 8,
    fontWeight: typography.bold,
    color: '#FFFFFF',
    letterSpacing: 0.6,
  },
  abnormalBadge: {
    marginLeft: spacing.sm,
    paddingHorizontal: spacing.sm + 1,
    paddingVertical: 2,
    backgroundColor: 'rgba(220, 38, 38, 0.12)',
    borderRadius: borderRadius.xs,
    borderWidth: 1,
    borderColor: 'rgba(220, 38, 38, 0.2)',
  },
  abnormalBadgeText: {
    fontSize: 9,
    fontWeight: typography.semibold,
    color: colors.alertRed,
    letterSpacing: 0.3,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg + spacing.xs,
    paddingTop: spacing.lg + spacing.xs,
    paddingBottom: spacing.lg + spacing.sm,
  },
  patientInfo: {
    flex: 1,
    gap: spacing.sm + 3,
  },
  patientName: {
    fontSize: typography.h1 - 2,
    fontWeight: typography.bold,
    color: colors.text,
    letterSpacing: -0.6,
    lineHeight: 32,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm + 3,
  },
  podBadge: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md - 2,
    paddingVertical: spacing.xs - 2,
    borderRadius: borderRadius.sm,
  },
  podText: {
    fontSize: typography.tiny - 1,
    fontWeight: typography.bold,
    color: '#FFFFFF',
    letterSpacing: 0.6,
  },
  locationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs - 3,
  },
  locationText: {
    fontSize: typography.tiny - 1,
    fontWeight: typography.medium,
    color: colors.textMuted,
  },
  procedureType: {
    fontSize: typography.caption - 1,
    fontWeight: typography.regular,
    color: colors.textLight,
    lineHeight: 17,
  },
  chevron: {
    opacity: 0.2,
    marginLeft: spacing.md,
  },
  deleteButton: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
    padding: spacing.sm,
    backgroundColor: colors.backgroundAlt,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.error,
    zIndex: 10,
  },
  fabButton: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
    elevation: 10,
    ...shadows.lg,
  },
  fabButtonPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.95 }],
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  modalContent: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.xl,
    padding: spacing.xxl,
    width: '100%',
    maxWidth: 400,
    ...shadows.xl,
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: spacing.lg,
    gap: spacing.md,
  },
  modalTitle: {
    fontSize: typography.h3,
    fontWeight: typography.bold,
    color: colors.text,
    textAlign: 'center',
  },
  modalBody: {
    fontSize: typography.h4,
    fontWeight: typography.semibold,
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  modalWarning: {
    fontSize: typography.bodySmall,
    fontWeight: typography.regular,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: spacing.xxl,
  },
  modalActions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  modalCancelButton: {
    flex: 1,
    backgroundColor: colors.backgroundAlt,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },
  modalCancelButtonText: {
    fontSize: typography.body,
    fontWeight: typography.bold,
    color: colors.text,
  },
  modalDeleteButton: {
    flex: 1,
    backgroundColor: colors.error,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },
  modalDeleteButtonDisabled: {
    opacity: 0.6,
  },
  modalDeleteButtonText: {
    fontSize: typography.body,
    fontWeight: typography.bold,
    color: '#FFFFFF',
  },
});
