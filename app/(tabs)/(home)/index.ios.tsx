
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
import { colors, commonStyles } from '@/styles/commonStyles';
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

  const getAlertLabel = (status: AlertStatus) => {
    if (status === 'green') return 'No Concerns';
    if (status === 'yellow') return 'Monitor Closely';
    return 'Reassess';
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>Post-Op Radar</Text>
            <Text style={styles.headerSubtitle}>Patient Dashboard</Text>
          </View>
          <IconSymbol
            ios_icon_name="info.circle"
            android_material_icon_name="info"
            size={24}
            color={colors.primary}
          />
        </View>

        {/* Disclaimer Banner */}
        <View style={styles.disclaimerBanner}>
          <IconSymbol
            ios_icon_name="exclamationmark.triangle"
            android_material_icon_name="warning"
            size={20}
            color={colors.warning}
            style={styles.disclaimerIcon}
          />
          <Text style={styles.disclaimerText}>
            For educational and demonstration purposes only. Not intended for clinical use or patient care decisions.
          </Text>
        </View>

        {/* Patient List */}
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {patients.map((patient, index) => {
            const alertColor = getAlertColor(patient.alertStatus);
            const alertBgColor = getAlertBgColor(patient.alertStatus);
            const alertLabel = getAlertLabel(patient.alertStatus);
            const podText = `POD ${patient.postOpDay}`;

            return (
              <TouchableOpacity
                key={index}
                style={styles.patientCard}
                onPress={() => handlePatientPress(patient.id)}
                activeOpacity={0.7}
              >
                {/* Alert Status Indicator */}
                <View style={[styles.alertIndicator, { backgroundColor: alertColor }]} />

                <View style={styles.patientCardContent}>
                  {/* Patient Info */}
                  <View style={styles.patientInfo}>
                    <Text style={styles.patientName}>{patient.name}</Text>
                    <Text style={styles.procedureType}>{patient.procedureType}</Text>
                    <Text style={styles.podText}>{podText}</Text>
                  </View>

                  {/* Alert Badge */}
                  <View style={[styles.alertBadge, { backgroundColor: alertBgColor }]}>
                    <Text style={[styles.alertBadgeText, { color: alertColor }]}>
                      {alertLabel}
                    </Text>
                  </View>
                </View>

                {/* Chevron */}
                <IconSymbol
                  ios_icon_name="chevron.right"
                  android_material_icon_name="chevron-right"
                  size={20}
                  color={colors.textSecondary}
                  style={styles.chevron}
                />
              </TouchableOpacity>
            );
          })}
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: colors.backgroundAlt,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 2,
  },
  headerSubtitle: {
    fontSize: 14,
    fontWeight: '400',
    color: colors.textSecondary,
  },
  disclaimerBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.alertYellowBg,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  disclaimerIcon: {
    marginRight: 8,
  },
  disclaimerText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '500',
    color: colors.text,
    lineHeight: 16,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingVertical: 12,
  },
  patientCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    marginHorizontal: 16,
    marginVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  alertIndicator: {
    width: 4,
    height: '100%',
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
  },
  patientCardContent: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingLeft: 16,
    paddingRight: 8,
  },
  patientInfo: {
    flex: 1,
  },
  patientName: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  procedureType: {
    fontSize: 14,
    fontWeight: '400',
    color: colors.textSecondary,
    marginBottom: 4,
  },
  podText: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.textLight,
  },
  alertBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginLeft: 8,
  },
  alertBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  chevron: {
    marginLeft: 8,
    marginRight: 12,
  },
});
