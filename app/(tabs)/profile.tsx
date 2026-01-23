
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  Alert,
  ActivityIndicator,
  TextInput,
  Modal,
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
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [debugMessage, setDebugMessage] = useState('');

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

  const handleDeleteAccount = () => {
    console.log('User tapped delete account button');
    setDebugMessage('Delete Account clicked - opening confirmation modal');
    setShowDeleteModal(true);
  };

  const confirmDeleteAccount = async () => {
    console.log('User confirmed delete account');
    setDebugMessage('Confirming deletion...');
    
    if (deleteConfirmation !== 'DELETE') {
      setDebugMessage('Delete failed: Confirmation text does not match');
      Alert.alert('Error', 'Please type DELETE to confirm account deletion');
      return;
    }

    setDeleting(true);
    setDebugMessage('Deleting account and all data...');

    try {
      const { authenticatedDelete } = await import('@/utils/api');
      
      console.log('Calling DELETE /api/account endpoint');
      await authenticatedDelete('/api/account', { confirmation: 'DELETE' });
      
      console.log('Account deleted successfully');
      setDebugMessage('Delete success - account and all data removed');
      
      // Clear local session
      await signOut();
      
      Alert.alert(
        'Account Deleted',
        'Your account and all associated data have been permanently deleted.',
        [
          {
            text: 'OK',
            onPress: () => {
              console.log('Navigating to login screen');
              router.replace('/auth');
            },
          },
        ]
      );
    } catch (error: any) {
      console.error('Error deleting account:', error);
      const errorMsg = error.message || 'Failed to delete account. Please try again.';
      setDebugMessage(`Delete failed: ${errorMsg}`);
      Alert.alert('Error', errorMsg);
    } finally {
      setDeleting(false);
      setShowDeleteModal(false);
      setDeleteConfirmation('');
    }
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

  const getRoleLabel = (role: string) => {
    if (!profile) return '';
    
    const roleYear = profile.roleYear;
    const residencyProgram = profile.residencyProgram;
    
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

  const roleLabel = profile ? getRoleLabel(profile.role) : '';

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Debug message (temporary for preview mode) */}
        {debugMessage ? (
          <View style={styles.debugContainer}>
            <Text style={styles.debugText}>{debugMessage}</Text>
          </View>
        ) : null}

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

        <TouchableOpacity style={styles.deleteButton} onPress={handleDeleteAccount}>
          <IconSymbol
            ios_icon_name="trash.fill"
            android_material_icon_name="delete"
            size={18}
            color="#FFFFFF"
          />
          <Text style={styles.deleteButtonText}>Delete Account</Text>
        </TouchableOpacity>

        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* Delete Account Confirmation Modal */}
      <Modal
        visible={showDeleteModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDeleteModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <IconSymbol
                ios_icon_name="exclamationmark.triangle.fill"
                android_material_icon_name="warning"
                size={32}
                color={colors.error}
              />
              <Text style={styles.modalTitle}>Delete Account</Text>
            </View>

            <Text style={styles.modalText}>
              This action cannot be undone. All your data, including patient records, vitals, and labs, will be permanently deleted.
            </Text>

            <Text style={styles.modalInstructions}>
              Type DELETE to confirm:
            </Text>

            <TextInput
              style={styles.modalInput}
              value={deleteConfirmation}
              onChangeText={setDeleteConfirmation}
              placeholder="Type DELETE"
              placeholderTextColor={colors.textLight}
              autoCapitalize="characters"
              autoCorrect={false}
              editable={!deleting}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => {
                  setShowDeleteModal(false);
                  setDeleteConfirmation('');
                  setDebugMessage('');
                }}
                disabled={deleting}
              >
                <Text style={styles.modalCancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalDeleteButton, deleting && styles.modalDeleteButtonDisabled]}
                onPress={confirmDeleteAccount}
                disabled={deleting}
              >
                {deleting ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <React.Fragment>
                    <IconSymbol
                      ios_icon_name="trash.fill"
                      android_material_icon_name="delete"
                      size={16}
                      color="#FFFFFF"
                    />
                    <Text style={styles.modalDeleteButtonText}>Delete Forever</Text>
                  </React.Fragment>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
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
    paddingBottom: spacing.xxxxl * 2,
  },
  debugContainer: {
    backgroundColor: colors.alertYellowBg,
    borderWidth: 2,
    borderColor: colors.alertYellowBorder,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginHorizontal: spacing.xl,
    marginTop: spacing.lg,
  },
  debugText: {
    fontSize: typography.bodySmall,
    fontWeight: typography.semibold,
    color: colors.alertYellow,
    textAlign: 'center',
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
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.error,
    marginHorizontal: spacing.xl,
    marginTop: spacing.md,
    paddingVertical: spacing.lg,
    borderRadius: borderRadius.md,
    ...shadows.md,
  },
  deleteButtonText: {
    fontSize: typography.body,
    fontWeight: typography.bold,
    color: '#FFFFFF',
  },
  bottomSpacer: {
    height: spacing.xxxxl,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  modalContent: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.xxl,
    width: '100%',
    maxWidth: 400,
    ...shadows.lg,
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  modalTitle: {
    fontSize: typography.h3,
    fontWeight: typography.bold,
    color: colors.text,
    marginTop: spacing.md,
  },
  modalText: {
    fontSize: typography.body,
    fontWeight: typography.regular,
    color: colors.textSecondary,
    lineHeight: 24,
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
  modalInstructions: {
    fontSize: typography.bodySmall,
    fontWeight: typography.semibold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  modalInput: {
    backgroundColor: colors.backgroundAlt,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    fontSize: typography.body,
    color: colors.text,
    marginBottom: spacing.xl,
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
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  modalCancelButtonText: {
    fontSize: typography.body,
    fontWeight: typography.bold,
    color: colors.textSecondary,
  },
  modalDeleteButton: {
    flex: 1,
    backgroundColor: colors.error,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.xs,
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
