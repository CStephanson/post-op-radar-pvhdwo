
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { colors, typography, spacing, borderRadius, shadows } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import { mockPatients } from '@/data/mockPatients';
import { Patient, AlertStatus } from '@/types/patient';

function resolveImageSource(source: string | number | any): any {
  if (!source) return { uri: '' };
  if (typeof source === 'string') return { uri: source };
  return source;
}

export default function HomeScreen() {
  console.log('HomeScreen rendered (iOS)');
  const router = useRouter();
  const [patients] = useState<Patient[]>(mockPatients);

  const handlePatientPress = (patientId: string) => {
    console.log('User tapped patient card:', patientId);
    router.push(`/patient/${patientId}`);
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

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.container}>
        {/* Compact Header */}
        <View style={styles.header}>
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

        {/* Patient List */}
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.listHeader}>
            <Text style={styles.listTitle}>Active Patients</Text>
            <View style={styles.countBadge}>
              <Text style={styles.patientCount}>{patients.length}</Text>
            </View>
          </View>

          {patients.map((patient, index) => {
            const alertColor = getAlertColor(patient.alertStatus);
            const alertBgColor = getAlertBgColor(patient.alertStatus);
            const alertBorderColor = getAlertBorderColor(patient.alertStatus);
            const alertLabel = getAlertLabel(patient.alertStatus);
            const alertIcon = getAlertIcon(patient.alertStatus);
            const podText = `POD ${patient.postOpDay}`;

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
                </View>

                <View style={styles.cardContent}>
                  {/* Patient Info - Clear Hierarchy */}
                  <View style={styles.patientInfo}>
                    <Text style={styles.patientName}>{patient.name}</Text>
                    
                    <View style={styles.metaRow}>
                      <View style={styles.podBadge}>
                        <Text style={styles.podText}>{podText}</Text>
                      </View>
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
  headerTitle: {
    fontSize: typography.h3,
    fontWeight: typography.semibold,
    color: colors.text,
    letterSpacing: -0.3,
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
  patientCard: {
    backgroundColor: colors.card,
    marginHorizontal: spacing.xl,
    marginBottom: spacing.lg,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
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
  bottomSpacer: {
    height: spacing.xxxxl,
  },
});
