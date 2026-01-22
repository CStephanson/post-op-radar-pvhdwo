
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import { colors, typography, spacing, borderRadius, shadows } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import { mockPatients, mockAlerts } from '@/data/mockPatients';
import { Patient, Alert, AlertStatus, TrendData } from '@/types/patient';
import { calculateTrends, generateAlerts } from '@/utils/alertLogic';

export default function PatientDetailScreen() {
  console.log('PatientDetailScreen rendered');
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const [patient, setPatient] = useState<Patient | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [trends, setTrends] = useState<TrendData[]>([]);

  useEffect(() => {
    console.log('Loading patient data for ID:', id);
    const foundPatient = mockPatients.find(p => p.id === id);
    if (foundPatient) {
      setPatient(foundPatient);
      const patientTrends = calculateTrends(foundPatient);
      setTrends(patientTrends);
      const patientAlerts = generateAlerts(foundPatient);
      setAlerts(patientAlerts);
    }
  }, [id]);

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

  const latestVitals = patient.vitals[patient.vitals.length - 1];
  const latestLabs = patient.labs[patient.labs.length - 1];

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
              <Text style={styles.procedureType}>{patient.procedureType}</Text>
              <Text style={styles.podText}>{podText}</Text>
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
                size={20}
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

        {/* Vital Signs Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <IconSymbol
              ios_icon_name="heart.fill"
              android_material_icon_name="favorite"
              size={20}
              color={colors.iconPrimary}
              style={styles.sectionIcon}
            />
            <Text style={styles.sectionTitle}>Vital Signs</Text>
          </View>

          <View style={styles.dataGrid}>
            <View style={styles.dataCard}>
              <View style={styles.dataIconContainer}>
                <IconSymbol
                  ios_icon_name="heart.fill"
                  android_material_icon_name="favorite"
                  size={18}
                  color={colors.iconSecondary}
                />
              </View>
              <Text style={styles.dataLabel}>Heart Rate</Text>
              <Text style={styles.dataValue}>{hrText}</Text>
              <Text style={styles.dataUnit}>bpm</Text>
            </View>

            <View style={styles.dataCard}>
              <View style={styles.dataIconContainer}>
                <IconSymbol
                  ios_icon_name="waveform.path.ecg"
                  android_material_icon_name="show-chart"
                  size={18}
                  color={colors.iconSecondary}
                />
              </View>
              <Text style={styles.dataLabel}>Blood Pressure</Text>
              <Text style={styles.dataValue}>{bpText}</Text>
              <Text style={styles.dataUnit}>mmHg</Text>
            </View>

            <View style={styles.dataCard}>
              <View style={styles.dataIconContainer}>
                <IconSymbol
                  ios_icon_name="thermometer"
                  android_material_icon_name="thermostat"
                  size={18}
                  color={colors.iconSecondary}
                />
              </View>
              <Text style={styles.dataLabel}>Temperature</Text>
              <Text style={styles.dataValue}>{tempText}</Text>
              <Text style={styles.dataUnit}>°C</Text>
            </View>

            <View style={styles.dataCard}>
              <View style={styles.dataIconContainer}>
                <IconSymbol
                  ios_icon_name="drop.fill"
                  android_material_icon_name="water-drop"
                  size={18}
                  color={colors.iconSecondary}
                />
              </View>
              <Text style={styles.dataLabel}>Urine Output</Text>
              <Text style={styles.dataValue}>{uoText}</Text>
              <Text style={styles.dataUnit}>ml/hr</Text>
            </View>
          </View>
        </View>

        {/* Laboratory Values Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <IconSymbol
              ios_icon_name="flask.fill"
              android_material_icon_name="science"
              size={20}
              color={colors.iconPrimary}
              style={styles.sectionIcon}
            />
            <Text style={styles.sectionTitle}>Laboratory Values</Text>
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
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <IconSymbol
              ios_icon_name="chart.line.uptrend.xyaxis"
              android_material_icon_name="trending-up"
              size={20}
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

        {/* Disclaimer */}
        <View style={styles.disclaimerCard}>
          <IconSymbol
            ios_icon_name="info.circle.fill"
            android_material_icon_name="info"
            size={18}
            color={colors.info}
            style={styles.disclaimerIcon}
          />
          <Text style={styles.disclaimerText}>
            This tool provides educational pattern recognition only. All clinical decisions must be made by qualified healthcare professionals based on complete patient assessment.
          </Text>
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
    paddingBottom: spacing.xxxl,
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
  },
  procedureType: {
    fontSize: typography.body,
    fontWeight: typography.regular,
    color: colors.textSecondary,
    lineHeight: 22,
  },
  podText: {
    fontSize: typography.bodySmall,
    fontWeight: typography.medium,
    color: colors.textLight,
  },
  statusBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1.5,
    marginLeft: spacing.md,
  },
  statusText: {
    fontSize: typography.caption,
    fontWeight: typography.bold,
    letterSpacing: 0.5,
  },
  section: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  sectionIcon: {
    marginRight: spacing.sm,
  },
  sectionTitle: {
    fontSize: typography.h4,
    fontWeight: typography.semibold,
    color: colors.text,
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
    marginBottom: spacing.md,
  },
  dataIconContainer: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.md,
    backgroundColor: colors.borderLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  dataLabel: {
    fontSize: typography.caption,
    fontWeight: typography.medium,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  dataValue: {
    fontSize: 28,
    fontWeight: typography.bold,
    color: colors.text,
    marginBottom: 2,
    letterSpacing: -0.5,
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
    backgroundColor: colors.alertYellowBg,
    marginHorizontal: spacing.xl,
    marginTop: spacing.xl,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.alertYellowBorder,
  },
  disclaimerIcon: {
    marginRight: spacing.md,
    marginTop: 2,
  },
  disclaimerText: {
    flex: 1,
    fontSize: typography.caption,
    fontWeight: typography.regular,
    color: colors.text,
    lineHeight: 18,
  },
  bottomSpacer: {
    height: spacing.xxxl,
  },
});
