
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import { colors } from '@/styles/commonStyles';
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

  const getTrendIcon = (trend: 'rising' | 'falling' | 'stable') => {
    if (trend === 'rising') return 'arrow-upward';
    if (trend === 'falling') return 'arrow-downward';
    return 'remove';
  };

  const getTrendColor = (trendData: TrendData) => {
    if (trendData.concerning) return colors.alertRed;
    return colors.textSecondary;
  };

  const alertColor = getAlertColor(patient.alertStatus);
  const alertBgColor = getAlertBgColor(patient.alertStatus);
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
        {/* Patient Header */}
        <View style={styles.patientHeader}>
          <View style={styles.patientHeaderInfo}>
            <Text style={styles.patientName}>{patient.name}</Text>
            <Text style={styles.procedureType}>{patient.procedureType}</Text>
            <Text style={styles.podText}>{podText}</Text>
          </View>
          <View style={[styles.alertBadgeLarge, { backgroundColor: alertBgColor }]}>
            <Text style={[styles.alertBadgeTextLarge, { color: alertColor }]}>
              {patient.alertStatus.toUpperCase()}
            </Text>
          </View>
        </View>

        {/* Alerts Section */}
        {alerts.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Active Alerts</Text>
            {alerts.map((alert, index) => {
              const severityColor = getAlertColor(alert.severity);
              const severityBgColor = getAlertBgColor(alert.severity);

              return (
                <View key={index} style={[styles.alertCard, { borderLeftColor: severityColor }]}>
                  <View style={styles.alertHeader}>
                    <IconSymbol
                      ios_icon_name="exclamationmark.triangle.fill"
                      android_material_icon_name="warning"
                      size={20}
                      color={severityColor}
                      style={styles.alertIcon}
                    />
                    <Text style={[styles.alertTitle, { color: severityColor }]}>
                      {alert.title}
                    </Text>
                  </View>
                  <Text style={styles.alertDescription}>{alert.description}</Text>

                  <View style={styles.alertSubsection}>
                    <Text style={styles.alertSubsectionTitle}>Triggered by:</Text>
                    {alert.triggeredBy.map((trigger, idx) => (
                      <View key={idx} style={styles.bulletPoint}>
                        <Text style={styles.bullet}>•</Text>
                        <Text style={styles.bulletText}>{trigger}</Text>
                      </View>
                    ))}
                  </View>

                  <View style={styles.alertSubsection}>
                    <Text style={styles.alertSubsectionTitle}>Consider:</Text>
                    {alert.considerations.map((consideration, idx) => (
                      <View key={idx} style={styles.bulletPoint}>
                        <Text style={styles.bullet}>•</Text>
                        <Text style={styles.bulletText}>{consideration}</Text>
                      </View>
                    ))}
                  </View>

                  <View style={styles.alertSubsection}>
                    <Text style={styles.alertSubsectionTitle}>Actions:</Text>
                    {alert.cognitivePrompts.map((prompt, idx) => (
                      <View key={idx} style={styles.bulletPoint}>
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
          <Text style={styles.sectionTitle}>Vital Signs</Text>
          <View style={styles.dataGrid}>
            <View style={styles.dataItem}>
              <Text style={styles.dataLabel}>Heart Rate</Text>
              <Text style={styles.dataValue}>{hrText}</Text>
              <Text style={styles.dataUnit}>bpm</Text>
            </View>
            <View style={styles.dataItem}>
              <Text style={styles.dataLabel}>Blood Pressure</Text>
              <Text style={styles.dataValue}>{bpText}</Text>
              <Text style={styles.dataUnit}>mmHg</Text>
            </View>
            <View style={styles.dataItem}>
              <Text style={styles.dataLabel}>Temperature</Text>
              <Text style={styles.dataValue}>{tempText}</Text>
              <Text style={styles.dataUnit}>°C</Text>
            </View>
            <View style={styles.dataItem}>
              <Text style={styles.dataLabel}>Urine Output</Text>
              <Text style={styles.dataValue}>{uoText}</Text>
              <Text style={styles.dataUnit}>ml/hr</Text>
            </View>
          </View>
        </View>

        {/* Laboratory Values Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Laboratory Values</Text>
          <View style={styles.dataGrid}>
            <View style={styles.dataItem}>
              <Text style={styles.dataLabel}>WBC</Text>
              <Text style={styles.dataValue}>{wbcText}</Text>
              <Text style={styles.dataUnit}>K/μL</Text>
            </View>
            <View style={styles.dataItem}>
              <Text style={styles.dataLabel}>Hemoglobin</Text>
              <Text style={styles.dataValue}>{hgbText}</Text>
              <Text style={styles.dataUnit}>g/dL</Text>
            </View>
            <View style={styles.dataItem}>
              <Text style={styles.dataLabel}>Creatinine</Text>
              <Text style={styles.dataValue}>{creatText}</Text>
              <Text style={styles.dataUnit}>mg/dL</Text>
            </View>
            <View style={styles.dataItem}>
              <Text style={styles.dataLabel}>Lactate</Text>
              <Text style={styles.dataValue}>{lactateText}</Text>
              <Text style={styles.dataUnit}>mmol/L</Text>
            </View>
          </View>
        </View>

        {/* Trends Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Trends</Text>
          {trends.map((trendData, index) => {
            const trendIcon = getTrendIcon(trendData.trend);
            const trendColor = getTrendColor(trendData);
            const firstValue = trendData.values[0].toFixed(1);
            const lastValue = trendData.values[trendData.values.length - 1].toFixed(1);
            const trendText = `${firstValue} → ${lastValue}`;

            return (
              <View key={index} style={styles.trendItem}>
                <View style={styles.trendHeader}>
                  <Text style={styles.trendLabel}>{trendData.label}</Text>
                  <View style={styles.trendIndicator}>
                    <IconSymbol
                      ios_icon_name="arrow.up"
                      android_material_icon_name={trendIcon}
                      size={16}
                      color={trendColor}
                      style={styles.trendIcon}
                    />
                    <Text style={[styles.trendValue, { color: trendColor }]}>
                      {trendText}
                    </Text>
                  </View>
                </View>
                {trendData.concerning && (
                  <Text style={styles.trendWarning}>Concerning trend</Text>
                )}
              </View>
            );
          })}
        </View>

        {/* Disclaimer */}
        <View style={styles.disclaimerSection}>
          <IconSymbol
            ios_icon_name="exclamationmark.triangle"
            android_material_icon_name="warning"
            size={18}
            color={colors.warning}
            style={styles.disclaimerIcon}
          />
          <Text style={styles.disclaimerText}>
            This tool provides educational pattern recognition only. All clinical decisions must be made by qualified healthcare professionals based on complete patient assessment.
          </Text>
        </View>
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
    paddingBottom: 32,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  patientHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    backgroundColor: colors.backgroundAlt,
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  patientHeaderInfo: {
    flex: 1,
  },
  patientName: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  procedureType: {
    fontSize: 15,
    fontWeight: '400',
    color: colors.textSecondary,
    marginBottom: 4,
  },
  podText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textLight,
  },
  alertBadgeLarge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginLeft: 12,
  },
  alertBadgeTextLarge: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  section: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 12,
  },
  alertCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderWidth: 1,
    borderColor: colors.border,
    boxShadow: '0px 1px 3px rgba(0, 0, 0, 0.1)',
    elevation: 2,
  },
  alertHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  alertIcon: {
    marginRight: 8,
  },
  alertTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  alertDescription: {
    fontSize: 14,
    fontWeight: '400',
    color: colors.text,
    marginBottom: 12,
    lineHeight: 20,
  },
  alertSubsection: {
    marginTop: 12,
  },
  alertSubsectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 6,
  },
  bulletPoint: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  bullet: {
    fontSize: 14,
    fontWeight: '400',
    color: colors.textSecondary,
    marginRight: 8,
    marginTop: 2,
  },
  bulletText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '400',
    color: colors.textSecondary,
    lineHeight: 18,
  },
  dataGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -6,
  },
  dataItem: {
    width: '50%',
    paddingHorizontal: 6,
    marginBottom: 16,
  },
  dataLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.textSecondary,
    marginBottom: 4,
  },
  dataValue: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 2,
  },
  dataUnit: {
    fontSize: 12,
    fontWeight: '400',
    color: colors.textLight,
  },
  trendItem: {
    backgroundColor: colors.card,
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  trendHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  trendLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  trendIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  trendIcon: {
    marginRight: 4,
  },
  trendValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  trendWarning: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.alertRed,
    marginTop: 4,
  },
  disclaimerSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.alertYellowBg,
    marginHorizontal: 20,
    marginTop: 8,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  disclaimerIcon: {
    marginRight: 12,
    marginTop: 2,
  },
  disclaimerText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '400',
    color: colors.text,
    lineHeight: 18,
  },
});
