
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { colors, typography, spacing, borderRadius, shadows } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import { useAuth } from '@/contexts/AuthContext';
import { UserProfile } from '@/types/patient';

export default function ProfileScreen() {
  console.log('ProfileScreen rendered');
  const router = useRouter();
  const { user, signOut } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadProfile();
    }
  }, [user]);

  const loadProfile = async () => {
    console.log('Loading user profile');
    setLoading(true);
    try {
      const { authenticatedGet } = await import('@/utils/api');
      const profileData = await authenticatedGet<any>('/api/profile');
      setProfile(profileData);
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEditProfile = () => {
    console.log('User tapped edit profile button');
    router.push('/profile-setup');
  };

  const handleSignOut = () => {
    console.log('User tapped sign out button');
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            console.log('User confirmed sign out');
            try {
              await signOut();
              router.replace('/auth');
            } catch (error) {
              console.error('Error signing out:', error);
              Alert.alert('Error', 'Failed to sign out');
            }
          },
        },
      ]
    );
  };

  const getRoleLabel = (role: string, roleYear?: number, residencyProgram?: string) => {
    if (role === 'medical_student') {
      const yearText = roleYear ? ` (Year ${roleYear})` : '';
      return `Medical Student${yearText}`;
    }
    if (role === 'resident') {
      const programText = residencyProgram ? ` - ${residencyProgram}` : '';
      const yearText = roleYear ? ` (PGY-${roleYear})` : '';
      return `Resident${programText}${yearText}`;
    }
    if (role === 'fellow') return 'Fellow';
    return 'Staff Physician';
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  const roleLabel = profile ? getRoleLabel(profile.role, profile.roleYear, profile.residencyProgram) : '';

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Profile</Text>
        </View>

        <View style={styles.profileCard}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              <IconSymbol
                ios_icon_name="person.fill"
                android_material_icon_name="person"
                size={44}
                color={colors.primary}
              />
            </View>
          </View>

          <Text style={styles.name}>{profile?.fullName || user?.name}</Text>
          {profile?.pronouns && (
            <Text style={styles.pronouns}>{profile.pronouns}</Text>
          )}
          <Text style={styles.email}>{user?.email}</Text>

          <TouchableOpacity style={styles.editButton} onPress={handleEditProfile}>
            <IconSymbol
              ios_icon_name="pencil"
              android_material_icon_name="edit"
              size={14}
              color={colors.primary}
            />
            <Text style={styles.editButtonText}>Edit Profile</Text>
          </TouchableOpacity>
        </View>

        {profile && (
          <>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Professional Information</Text>
              
              <View style={styles.infoRow}>
                <View style={styles.infoIcon}>
                  <IconSymbol
                    ios_icon_name="briefcase.fill"
                    android_material_icon_name="work"
                    size={18}
                    color={colors.iconSecondary}
                  />
                </View>
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Role</Text>
                  <Text style={styles.infoValue}>{roleLabel}</Text>
                </View>
              </View>

              {profile.affiliation && (
                <View style={styles.infoRow}>
                  <View style={styles.infoIcon}>
                    <IconSymbol
                      ios_icon_name="building.2.fill"
                      android_material_icon_name="business"
                      size={18}
                      color={colors.iconSecondary}
                    />
                  </View>
                  <View style={styles.infoContent}>
                    <Text style={styles.infoLabel}>Affiliation</Text>
                    <Text style={styles.infoValue}>{profile.affiliation}</Text>
                  </View>
                </View>
              )}
            </View>
          </>
        )}

        <View style={styles.disclaimerCard}>
          <IconSymbol
            ios_icon_name="info.circle"
            android_material_icon_name="info"
            size={18}
            color={colors.textLight}
            style={styles.disclaimerIcon}
          />
          <View style={styles.disclaimerContent}>
            <Text style={styles.disclaimerTitle}>Educational Use Only</Text>
            <Text style={styles.disclaimerText}>
              Post-Op Radar is designed for educational and simulation purposes only. 
              It is not intended for clinical use or patient care decisions.
            </Text>
          </View>
        </View>

        <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
          <IconSymbol
            ios_icon_name="arrow.right.square"
            android_material_icon_name="logout"
            size={18}
            color={colors.error}
          />
          <Text style={styles.signOutButtonText}>Sign Out</Text>
        </TouchableOpacity>

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: spacing.xxxxl * 2,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    backgroundColor: colors.backgroundAlt,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md - 2,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  headerTitle: {
    fontSize: typography.h2,
    fontWeight: typography.bold,
    color: colors.text,
    letterSpacing: -0.4,
  },
  profileCard: {
    backgroundColor: colors.backgroundAlt,
    marginHorizontal: spacing.xl,
    marginTop: spacing.xxl,
    padding: spacing.xxl + spacing.xs,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.sm,
  },
  avatarContainer: {
    marginBottom: spacing.lg + spacing.xs,
  },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: colors.borderLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  name: {
    fontSize: typography.h2,
    fontWeight: typography.bold,
    color: colors.text,
    marginBottom: spacing.xs,
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  pronouns: {
    fontSize: typography.bodySmall,
    fontWeight: typography.medium,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  email: {
    fontSize: typography.body,
    fontWeight: typography.regular,
    color: colors.textLight,
    marginBottom: spacing.lg + spacing.xs,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    backgroundColor: colors.borderLight,
    borderRadius: borderRadius.md,
  },
  editButtonText: {
    fontSize: typography.bodySmall,
    fontWeight: typography.semibold,
    color: colors.primary,
  },
  section: {
    marginHorizontal: spacing.xl,
    marginTop: spacing.xxl + spacing.sm,
  },
  sectionTitle: {
    fontSize: typography.h4,
    fontWeight: typography.bold,
    color: colors.text,
    marginBottom: spacing.lg,
    letterSpacing: -0.2,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.backgroundAlt,
    padding: spacing.lg,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  infoIcon: {
    marginRight: spacing.md,
    marginTop: 2,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: typography.caption,
    fontWeight: typography.medium,
    color: colors.textLight,
    marginBottom: spacing.xs - 1,
  },
  infoValue: {
    fontSize: typography.body,
    fontWeight: typography.semibold,
    color: colors.text,
    lineHeight: 22,
  },
  disclaimerCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.borderLight,
    marginHorizontal: spacing.xl,
    marginTop: spacing.xxl + spacing.sm,
    padding: spacing.lg,
    borderRadius: borderRadius.md,
  },
  disclaimerIcon: {
    marginRight: spacing.md,
    marginTop: 1,
    opacity: 0.7,
  },
  disclaimerContent: {
    flex: 1,
  },
  disclaimerTitle: {
    fontSize: typography.bodySmall,
    fontWeight: typography.bold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  disclaimerText: {
    fontSize: typography.caption,
    fontWeight: typography.regular,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.backgroundAlt,
    marginHorizontal: spacing.xl,
    marginTop: spacing.xl + spacing.sm,
    paddingVertical: spacing.lg,
    borderRadius: borderRadius.md,
    borderWidth: 2,
    borderColor: colors.error,
  },
  signOutButtonText: {
    fontSize: typography.body,
    fontWeight: typography.bold,
    color: colors.error,
  },
  bottomSpacer: {
    height: spacing.xxxxl,
  },
});
