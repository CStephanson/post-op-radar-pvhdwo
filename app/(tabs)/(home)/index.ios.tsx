
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
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>Post-Op Radar</Text>
            <Text style={styles.headerSubtitle}>Patient Monitoring Dashboard</Text>
          </View>
        </View>

        {/* Disclaimer Banner */}
        <View style={styles.disclaimerBanner}>
          <IconSymbol
            ios_icon_name="info.circle.fill"
            android_material_icon_name="info"
            size={18}
            color={colors.info}
            style={styles.disclaimerIcon}
          />
          <Text style={styles.disclaimerText}>
            Educational use only • Not for clinical decisions
          </Text>
        </View>

        {/* Patient List */}
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.listHeader}>
            <Text style={styles.listTitle}>Active Patients</Text>
            <Text style={styles.patientCount}>{patients.length}</Text>
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
                activeOpacity={0.6}
              >
                <View style={styles.cardContent}>
                  {/* Left: Patient Info */}
                  <View style={styles.patientInfo}>
                    <Text style={styles.patientName}>{patient.name}</Text>
                    <Text style={styles.procedureType}>{patient.procedureType}</Text>
                    
                    <View style={styles.metaRow}>
                      <View style={styles.podBadge}>
                        <Text style={styles.podText}>{podText}</Text>
                      </View>
                    </View>
                  </View>

                  {/* Right: Alert Status */}
                  <View style={styles.alertSection}>
                    <View style={[styles.alertBadge, { 
                      backgroundColor: alertBgColor,
                      borderColor: alertBorderColor,
                    }]}>
                      <IconSymbol
                        ios_icon_name="circle.fill"
                        android_material_icon_name={alertIcon}
                        size={16}
                        color={alertColor}
                        style={styles.alertBadgeIcon}
                      />
                      <Text style={[styles.alertBadgeText, { color: alertColor }]}>
                        {alertLabel}
                      </Text>
                    </View>
                    
                    <IconSymbol
                      ios_icon_name="chevron.right"
                      android_material_icon_name="chevron-right"
                      size={20}
                      color={colors.iconLight}
                      style={styles.chevron}
                    />
                  </View>
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
    paddingTop: spacing.lg,
    paddingBottom: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  headerContent: {
    gap: spacing.xs,
  },
  headerTitle: {
    fontSize: typography.h2,
    fontWeight: typography.bold,
    color: colors.text,
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: typography.bodySmall,
    fontWeight: typography.regular,
    color: colors.textSecondary,
  },
  disclaimerBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.alertYellowBg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.alertYellowBorder,
  },
  disclaimerIcon: {
    marginRight: spacing.sm,
  },
  disclaimerText: {
    flex: 1,
    fontSize: typography.caption,
    fontWeight: typography.medium,
    color: colors.text,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: spacing.lg,
  },
  listHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    marginBottom: spacing.md,
  },
  listTitle: {
    fontSize: typography.h4,
    fontWeight: typography.semibold,
    color: colors.text,
  },
  patientCount: {
    fontSize: typography.bodySmall,
    fontWeight: typography.semibold,
    color: colors.textLight,
    backgroundColor: colors.borderLight,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  patientCard: {
    backgroundColor: colors.card,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.lg,
  },
  patientInfo: {
    flex: 1,
    gap: spacing.xs,
  },
  patientName: {
    fontSize: typography.h4,
    fontWeight: typography.semibold,
    color: colors.text,
    marginBottom: 2,
  },
  procedureType: {
    fontSize: typography.bodySmall,
    fontWeight: typography.regular,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  podBadge: {
    backgroundColor: colors.borderLight,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  podText: {
    fontSize: typography.tiny,
    fontWeight: typography.semibold,
    color: colors.textSecondary,
    letterSpacing: 0.3,
  },
  alertSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginLeft: spacing.md,
  },
  alertBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    gap: spacing.xs,
  },
  alertBadgeIcon: {
    marginTop: 1,
  },
  alertBadgeText: {
    fontSize: typography.caption,
    fontWeight: typography.semibold,
    letterSpacing: 0.2,
  },
  chevron: {
    opacity: 0.4,
  },
  bottomSpacer: {
    height: spacing.xxxl,
  },
});
