
import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  ActivityIndicator,
  Alert,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { colors, typography, spacing, borderRadius, shadows } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import { Patient, AlertStatus, SortOption } from '@/types/patient';
import { getAllPatients } from '@/utils/localStorage';

export default function HomeScreen({ navigation }: any) {
  console.log('[HomeScreen] Component rendered');
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<SortOption>('status');
  const [showSortMenu, setShowSortMenu] = useState(false);

  const loadPatients = useCallback(async () => {
    console.log('[HomeScreen] ========== LOAD PATIENTS START ==========');
    console.log('[HomeScreen] Loading patients from local storage');
    setLoading(true);
    try {
      const patientsData = await getAllPatients();
      console.log('[HomeScreen] Loaded', patientsData.length, 'patients from local storage');
      console.log('[HomeScreen] Patient IDs:', patientsData.map(p => p.id).join(', '));
      console.log('[HomeScreen] Patient names:', patientsData.map(p => p.name).join(', '));
      setPatients(patientsData);
      console.log('[HomeScreen] State updated with', patientsData.length, 'patients');
      console.log('[HomeScreen] ========== LOAD PATIENTS END ==========');
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

  // Refresh patient list when screen comes into focus (e.g., after adding/editing a patient)
  useFocusEffect(
    useCallback(() => {
      console.log('[HomeScreen] Screen focused - refreshing patient list');
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
      sorted.sort((a, b) => statusOrder[a.alertStatus] - statusOrder[b.alertStatus]);
    }
    
    return sorted;
  };

  const handlePatientPress = (patientId: string) => {
    console.log('[HomeScreen] User tapped patient card:', patientId);
    navigation.navigate('PatientDetail', { id: patientId });
  };

  const handleAddPatient = () => {
    console.log('[HomeScreen] ========== ADD PATIENT BUTTON PRESSED ==========');
    console.log('[HomeScreen] User tapped Add Patient button');
    Alert.alert('Add Patient button pressed', 'Navigation will occur now', [
      {
        text: 'OK',
        onPress: () => {
          console.log('[HomeScreen] Navigating to AddPatient screen');
          navigation.navigate('AddPatient');
        }
      }
    ]);
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

  const sortedPatients = sortPatients(patients, sortBy);
  const currentSortLabel = getSortLabel(sortBy);
  const patientCountText = `${sortedPatients.length}`;
  const debugLoadedText = `Loaded patients: ${sortedPatients.length}`;

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
                <Text style={styles.disclaimerText}>Educational use only</Text>
              </View>
            </View>
          </View>
          <View style={styles.debugBadge}>
            <Text style={styles.debugText}>{debugLoadedText}</Text>
          </View>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.listHeader}>
            <View style={styles.listHeaderLeft}>
              <Text style={styles.listTitle}>Patients</Text>
              <View style={styles.countBadge}>
                <Text style={styles.patientCount}>{patientCountText}</Text>
              </View>
            </View>
            
            <TouchableOpacity
              style={styles.sortButton}
              onPress={() => {
                console.log('[HomeScreen] User tapped sort button');
                setShowSortMenu(!showSortMenu);
              }}
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
                        console.log('[HomeScreen] User selected sort option:', option);
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
            <>
              {sortedPatients.map((patient, index) => {
                const alertColor = getAlertColor(patient.alertStatus);
                const alertBgColor = getAlertBgColor(patient.alertStatus);
                const alertBorderColor = getAlertBorderColor(patient.alertStatus);
                const alertLabel = getAlertLabel(patient.alertStatus);
                const alertIcon = getAlertIcon(patient.alertStatus);
                const podText = `POD ${patient.postOpDay}`;
                
                const displayName = patient.name && patient.name.trim() ? patient.name : 'Unnamed Patient';
                
                const isManualStatus = patient.statusMode === 'manual';

                return (
                  <React.Fragment key={index}>
                    <TouchableOpacity
                      style={styles.patientCard}
                      onPress={() => handlePatientPress(patient.id)}
                      activeOpacity={0.7}
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
                  </React.Fragment>
                );
              })}
            </>
          )}

          <View style={styles.bottomSpacer} />
        </ScrollView>

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
  debugBadge: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xs,
    backgroundColor: colors.primarySubtle,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  debugText: {
    fontSize: typography.caption,
    fontWeight: typography.semibold,
    color: colors.primary,
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: spacing.xxl + spacing.sm,
  },
  listHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
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
  patientCard: {
    backgroundColor: colors.card,
    marginHorizontal: spacing.xl,
    marginBottom: spacing.lg + spacing.xs,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    ...shadows.sm,
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
  bottomSpacer: {
    height: spacing.xxxxl * 2,
  },
});
