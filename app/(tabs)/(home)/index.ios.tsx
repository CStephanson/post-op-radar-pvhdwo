
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, Redirect } from 'expo-router';
import { colors, typography, spacing, borderRadius, shadows } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import { Patient, AlertStatus, SortOption } from '@/types/patient';
import { useAuth } from '@/contexts/AuthContext';

function resolveImageSource(source: string | number | any): any {
  if (!source) return { uri: '' };
  if (typeof source === 'string') return { uri: source };
  return source;
}

export default function HomeScreen() {
  console.log('HomeScreen rendered');
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<SortOption>('status');
  const [showSortMenu, setShowSortMenu] = useState(false);

  useEffect(() => {
    if (user) {
      loadPatients();
    }
  }, [user]);

  const loadPatients = async () => {
    console.log('Loading patients for user');
    setLoading(true);
    try {
      // TODO: Backend Integration - GET /api/patients
      // For now, use empty array
      setPatients([]);
    } catch (error) {
      console.error('Error loading patients:', error);
      Alert.alert('Error', 'Failed to load patients');
    } finally {
      setLoading(false);
    }
  };

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
    console.log('User tapped patient card:', patientId);
    router.push(`/patient/${patientId}`);
  };

  const handleAddPatient = () => {
    console.log('User tapped add patient button');
    // TODO: Navigate to add patient screen
    Alert.alert('Coming Soon', 'Add patient functionality will be available soon');
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
    if (status === 'green') return 'No Concerns';
    if (status === 'yellow') return 'Monitor';
    return 'Reassess';
  };

  const getAlertIcon = (status: AlertStatus) => {
    if (status === 'green') return 'check-circle';
    if (status === 'yellow') return 'warning';
    return 'error';
  };

  const getSortLabel = (option: SortOption) => {
    if (option === 'name') return 'Name (A-Z)';
    if (option === 'date') return 'Operation Date';
    if (option === 'location') return 'Location';
    return 'Alert Status';
  };

  const getSortIcon = (option: SortOption) => {
    if (option === 'name') return 'sort-by-alpha';
    if (option === 'date') return 'calendar-today';
    if (option === 'location') return 'location-on';
    return 'warning';
  };

  if (authLoading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (!user) {
    return <Redirect href="/auth" />;
  }

  const sortedPatients = sortPatients(patients, sortBy);
  const currentSortLabel = getSortLabel(sortBy);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.container}>
        {/* Compact Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.headerTitle}>Post-Op Radar</Text>
            <View style={styles.disclaimerCompact}>
              <IconSymbol
                ios_icon_name="info.circle"
                android_material_icon_name="info"
                size={14}
                color={colors.textLight}
                style={styles.disclaimerIcon}
              />
              <Text style={styles.disclaimerText}>Educational use only</Text>
            </View>
          </View>
          
          <TouchableOpacity
            style={styles.profileButton}
            onPress={() => router.push('/(tabs)/profile')}
          >
            <IconSymbol
              ios_icon_name="person.circle"
              android_material_icon_name="account-circle"
              size={32}
              color={colors.primary}
            />
          </TouchableOpacity>
        </View>

        {/* Patient List */}
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.listHeader}>
            <View style={styles.listHeaderLeft}>
              <Text style={styles.listTitle}>Active Patients</Text>
              <View style={styles.countBadge}>
                <Text style={styles.patientCount}>{sortedPatients.length}</Text>
              </View>
            </View>
            
            <TouchableOpacity
              style={styles.sortButton}
              onPress={() => setShowSortMenu(!showSortMenu)}
            >
              <IconSymbol
                ios_icon_name="arrow.up.arrow.down"
                android_material_icon_name="sort"
                size={18}
                color={colors.iconSecondary}
              />
              <Text style={styles.sortButtonText}>{currentSortLabel}</Text>
            </TouchableOpacity>
          </View>

          {/* Sort Menu */}
          {showSortMenu && (
            <View style={styles.sortMenu}>
              {(['status', 'name', 'date', 'location'] as SortOption[]).map((option, index) => {
                const label = getSortLabel(option);
                const icon = getSortIcon(option);
                const isActive = sortBy === option;
                
                return (
                  <TouchableOpacity
                    key={index}
                    style={[styles.sortMenuItem, isActive && styles.sortMenuItemActive]}
                    onPress={() => {
                      console.log('User selected sort option:', option);
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
              <IconSymbol
                ios_icon_name="person.badge.plus"
                android_material_icon_name="person-add"
                size={64}
                color={colors.iconLight}
              />
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
                
                // Display patient name or "Unnamed Patient" if blank
                const displayName = patient.name && patient.name.trim() ? patient.name : 'Unnamed Patient';
                
                // Check if status is manually overridden
                const isManualStatus = patient.statusMode === 'manual';

                return (
                  <TouchableOpacity
                    key={index}
                    style={styles.patientCard}
                    onPress={() => handlePatientPress(patient.id)}
                    activeOpacity={0.7}
                  >
                    {/* Alert Status Bar - Most Prominent */}
                    <View style={[styles.alertBar, { 
                      backgroundColor: alertBgColor,
                      borderLeftColor: alertColor,
                    }]}>
                      <IconSymbol
                        ios_icon_name="circle.fill"
                        android_material_icon_name={alertIcon}
                        size={14}
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
                      {/* Patient Info - Clear Hierarchy */}
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
                                size={12}
                                color={colors.textLight}
                              />
                              <Text style={styles.locationText}>{patient.hospitalLocation}</Text>
                            </View>
                          )}
                        </View>
                        
                        <Text style={styles.procedureType}>{patient.procedureType}</Text>
                      </View>

                      {/* Chevron */}
                      <IconSymbol
                        ios_icon_name="chevron.right"
                        android_material_icon_name="chevron-right"
                        size={18}
                        color={colors.iconLight}
                        style={styles.chevron}
                      />
                    </View>
                  </TouchableOpacity>
                );
              })}

              {/* Floating Add Button */}
              <TouchableOpacity style={styles.fabButton} onPress={handleAddPatient}>
                <IconSymbol
                  ios_icon_name="plus"
                  android_material_icon_name="add"
                  size={24}
                  color="#FFFFFF"
                />
              </TouchableOpacity>
            </>
          )}

          <View style={styles.bottomSpacer} />
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    backgroundColor: colors.backgroundAlt,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {
    flex: 1,
  },
  headerTitle: {
    fontSize: typography.h3,
    fontWeight: typography.semibold,
    color: colors.text,
    letterSpacing: -0.3,
    marginBottom: spacing.xs,
  },
  disclaimerCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  disclaimerIcon: {
    opacity: 0.7,
  },
  disclaimerText: {
    fontSize: typography.tiny,
    fontWeight: typography.regular,
    color: colors.textLight,
  },
  profileButton: {
    marginLeft: spacing.md,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: spacing.xl,
  },
  listHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    marginBottom: spacing.lg,
  },
  listHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  listTitle: {
    fontSize: typography.h4,
    fontWeight: typography.semibold,
    color: colors.text,
    letterSpacing: -0.2,
  },
  countBadge: {
    backgroundColor: colors.borderLight,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    minWidth: 32,
    alignItems: 'center',
  },
  patientCount: {
    fontSize: typography.caption,
    fontWeight: typography.semibold,
    color: colors.textSecondary,
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.backgroundAlt,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sortButtonText: {
    fontSize: typography.caption,
    fontWeight: typography.medium,
    color: colors.textSecondary,
  },
  sortMenu: {
    backgroundColor: colors.backgroundAlt,
    marginHorizontal: spacing.xl,
    marginBottom: spacing.lg,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.md,
  },
  sortMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  sortMenuItemActive: {
    backgroundColor: colors.borderLight,
  },
  sortMenuItemText: {
    fontSize: typography.body,
    fontWeight: typography.regular,
    color: colors.text,
  },
  sortMenuItemTextActive: {
    fontWeight: typography.semibold,
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
  emptyStateTitle: {
    fontSize: typography.h3,
    fontWeight: typography.bold,
    color: colors.text,
    textAlign: 'center',
  },
  emptyStateText: {
    fontSize: typography.body,
    fontWeight: typography.regular,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
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
    marginBottom: spacing.lg,
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
    gap: spacing.sm,
    borderLeftWidth: 4,
  },
  alertLabel: {
    fontSize: typography.caption,
    fontWeight: typography.bold,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  manualBadge: {
    marginLeft: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    backgroundColor: colors.textLight,
    borderRadius: borderRadius.xs,
  },
  manualBadgeText: {
    fontSize: typography.tiny,
    fontWeight: typography.bold,
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
  },
  patientInfo: {
    flex: 1,
    gap: spacing.sm,
  },
  patientName: {
    fontSize: typography.h3,
    fontWeight: typography.bold,
    color: colors.text,
    letterSpacing: -0.3,
    lineHeight: 26,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  podBadge: {
    backgroundColor: colors.borderLight,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  podText: {
    fontSize: typography.tiny,
    fontWeight: typography.bold,
    color: colors.textSecondary,
    letterSpacing: 0.5,
  },
  locationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  locationText: {
    fontSize: typography.tiny,
    fontWeight: typography.medium,
    color: colors.textLight,
  },
  procedureType: {
    fontSize: typography.caption,
    fontWeight: typography.regular,
    color: colors.textLight,
    lineHeight: 18,
  },
  chevron: {
    opacity: 0.3,
    marginLeft: spacing.md,
  },
  fabButton: {
    position: 'absolute',
    right: spacing.xl,
    bottom: spacing.xl,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.lg,
  },
  bottomSpacer: {
    height: spacing.xxxxl * 2,
  },
});
