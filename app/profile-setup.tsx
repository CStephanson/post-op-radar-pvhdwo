
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, Stack } from 'expo-router';
import { colors, typography, spacing, borderRadius, shadows } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import { useAuth } from '@/contexts/AuthContext';
import { useUnsavedChanges } from '@/hooks/useUnsavedChanges';
import * as ImagePicker from 'expo-image-picker';

type UserRole = 'medical_student' | 'resident' | 'fellow' | 'staff_physician';

export default function ProfileSetupScreen() {
  console.log('[ProfileSetup] Screen rendered');
  const router = useRouter();
  const { user } = useAuth();
  
  const [fullName, setFullName] = useState('');
  const [pronouns, setPronouns] = useState('');
  const [role, setRole] = useState<UserRole>('medical_student');
  const [roleYear, setRoleYear] = useState('');
  const [residencyProgram, setResidencyProgram] = useState('');
  const [affiliation, setAffiliation] = useState('');
  const [profilePicture, setProfilePicture] = useState('');
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  
  // Track original values for dirty checking
  const [originalValues, setOriginalValues] = useState({
    fullName: '',
    pronouns: '',
    role: 'medical_student' as UserRole,
    roleYear: '',
    residencyProgram: '',
    affiliation: '',
    profilePicture: '',
  });

  // Check if form has unsaved changes
  const hasUnsavedChanges =
    fullName !== originalValues.fullName ||
    pronouns !== originalValues.pronouns ||
    role !== originalValues.role ||
    roleYear !== originalValues.roleYear ||
    residencyProgram !== originalValues.residencyProgram ||
    affiliation !== originalValues.affiliation ||
    profilePicture !== originalValues.profilePicture;

  // Unsaved changes protection
  const { handleBackPress, isNavigating } = useUnsavedChanges({
    hasUnsavedChanges,
    onSave: async () => {
      await handleSave(false); // Save without navigating
    },
    onDiscard: () => {
      // Revert to original values
      setFullName(originalValues.fullName);
      setPronouns(originalValues.pronouns);
      setRole(originalValues.role);
      setRoleYear(originalValues.roleYear);
      setResidencyProgram(originalValues.residencyProgram);
      setAffiliation(originalValues.affiliation);
      setProfilePicture(originalValues.profilePicture);
    },
  });

  useEffect(() => {
    loadExistingProfile();
  }, []);

  const loadExistingProfile = async () => {
    try {
      const { authenticatedGet } = await import('@/utils/api');
      const profile = await authenticatedGet<any>('/api/profile');
      
      // Profile exists, populate the form
      const values = {
        fullName: profile.fullName || '',
        pronouns: profile.pronouns || '',
        role: profile.role || 'medical_student',
        roleYear: profile.roleYear?.toString() || '',
        residencyProgram: profile.residencyProgram || '',
        affiliation: profile.affiliation || '',
        profilePicture: profile.profilePicture || '',
      };
      
      setFullName(values.fullName);
      setPronouns(values.pronouns);
      setRole(values.role);
      setRoleYear(values.roleYear);
      setResidencyProgram(values.residencyProgram);
      setAffiliation(values.affiliation);
      setProfilePicture(values.profilePicture);
      setOriginalValues(values);
      setIsEditing(true);
    } catch (error: any) {
      // Profile doesn't exist yet, that's okay
      console.log('[ProfileSetup] No existing profile found, creating new one');
      setIsEditing(false);
    }
  };

  const pickImage = async () => {
    console.log('[ProfileSetup] User tapped pick image button');
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setProfilePicture(result.assets[0].uri);
    }
  };

  const handleSave = async (shouldNavigate: boolean = true) => {
    console.log('[ProfileSetup] Saving profile, shouldNavigate:', shouldNavigate);
    
    setLoading(true);
    
    try {
      const { authenticatedPost, authenticatedPut, authenticatedGet } = await import('@/utils/api');
      
      // ALWAYS include ALL fields in the save payload (no partial saves)
      const profileData = {
        fullName: fullName.trim() || '',
        pronouns: pronouns.trim() || '',
        role,
        roleYear: roleYear ? parseInt(roleYear) : null,
        residencyProgram: residencyProgram.trim() || '',
        affiliation: affiliation.trim() || '',
        profilePicture: profilePicture || '',
      };
      
      console.log('[ProfileSetup] Saving ALL profile fields:', profileData);
      
      // Single atomic update - either all fields save or it fails
      if (isEditing) {
        await authenticatedPut('/api/profile', profileData);
      } else {
        await authenticatedPost('/api/profile', profileData);
      }
      
      // Re-fetch the saved record to ensure UI matches persisted data
      console.log('[ProfileSetup] Re-fetching saved profile to sync state');
      const savedProfile = await authenticatedGet<any>('/api/profile');
      
      // Update local state with canonical version from storage
      const savedValues = {
        fullName: savedProfile.fullName || '',
        pronouns: savedProfile.pronouns || '',
        role: savedProfile.role || 'medical_student',
        roleYear: savedProfile.roleYear?.toString() || '',
        residencyProgram: savedProfile.residencyProgram || '',
        affiliation: savedProfile.affiliation || '',
        profilePicture: savedProfile.profilePicture || '',
      };
      
      setFullName(savedValues.fullName);
      setPronouns(savedValues.pronouns);
      setRole(savedValues.role);
      setRoleYear(savedValues.roleYear);
      setResidencyProgram(savedValues.residencyProgram);
      setAffiliation(savedValues.affiliation);
      setProfilePicture(savedValues.profilePicture);
      setOriginalValues(savedValues);
      
      // Show success feedback
      Alert.alert('Saved', 'Profile saved successfully!');
      
      // Navigate after save completes (if requested)
      if (shouldNavigate) {
        console.log('[ProfileSetup] Navigating to dashboard after save');
        router.replace('/(tabs)/(home)/');
      }
    } catch (error: any) {
      console.error('[ProfileSetup] Error saving profile:', error);
      // Show clear error feedback - do not silently drop fields
      Alert.alert('Error', error.message || 'Failed to save profile. Please try again.');
      throw error; // Re-throw so useUnsavedChanges knows save failed
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = () => {
    console.log('[ProfileSetup] User clicked Skip for now');
    
    if (hasUnsavedChanges) {
      Alert.alert(
        'Skip Profile Setup?',
        'You have unsaved changes. Are you sure you want to skip?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Skip',
            style: 'destructive',
            onPress: () => {
              console.log('[ProfileSetup] Skipping to dashboard');
              router.replace('/(tabs)/(home)/');
            },
          },
        ]
      );
    } else {
      console.log('[ProfileSetup] Skipping to dashboard (no changes)');
      router.replace('/(tabs)/(home)/');
    }
  };

  const getRoleLabel = (roleValue: UserRole) => {
    if (roleValue === 'medical_student') return 'Medical Student';
    if (roleValue === 'resident') return 'Resident';
    if (roleValue === 'fellow') return 'Fellow';
    return 'Staff Physician';
  };

  const showYearField = role === 'medical_student' || role === 'resident';
  const showResidencyField = role === 'resident';
  
  const isSaving = loading || isNavigating;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: isEditing ? 'Edit Profile' : 'Complete Profile',
          headerBackTitle: 'Back',
          headerLeft: () => (
            <TouchableOpacity onPress={handleBackPress} style={styles.backButton}>
              <IconSymbol
                ios_icon_name="chevron.left"
                android_material_icon_name="arrow-back"
                size={24}
                color={colors.primary}
              />
            </TouchableOpacity>
          ),
        }}
      />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.title}>{isEditing ? 'Edit Your Profile' : 'Complete Your Profile'}</Text>
          <Text style={styles.subtitle}>
            Help us personalize your Post-Op Radar experience (optional)
          </Text>
        </View>

        {/* Profile Picture */}
        <View style={styles.section}>
          <Text style={styles.label}>Profile Picture</Text>
          <TouchableOpacity style={styles.imagePicker} onPress={pickImage}>
            {profilePicture ? (
              <View style={styles.imagePreview}>
                <Text style={styles.imagePreviewText}>Image selected</Text>
              </View>
            ) : (
              <View style={styles.imagePickerContent}>
                <IconSymbol
                  ios_icon_name="camera.fill"
                  android_material_icon_name="camera"
                  size={32}
                  color={colors.iconLight}
                />
                <Text style={styles.imagePickerText}>Tap to select photo</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Full Name */}
        <View style={styles.section}>
          <Text style={styles.label}>Full Name</Text>
          <TextInput
            style={styles.input}
            value={fullName}
            onChangeText={setFullName}
            placeholder="e.g., Dr. Jane Smith"
            placeholderTextColor={colors.textLight}
          />
        </View>

        {/* Pronouns */}
        <View style={styles.section}>
          <Text style={styles.label}>Pronouns</Text>
          <TextInput
            style={styles.input}
            value={pronouns}
            onChangeText={setPronouns}
            placeholder="e.g., she/her, he/him, they/them"
            placeholderTextColor={colors.textLight}
          />
        </View>

        {/* Role */}
        <View style={styles.section}>
          <Text style={styles.label}>Role / Training Level</Text>
          <View style={styles.roleGrid}>
            <TouchableOpacity
              style={[styles.roleButton, role === 'medical_student' && styles.roleButtonActive]}
              onPress={() => setRole('medical_student')}
            >
              <Text style={[styles.roleButtonText, role === 'medical_student' && styles.roleButtonTextActive]}>
                Medical Student
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.roleButton, role === 'resident' && styles.roleButtonActive]}
              onPress={() => setRole('resident')}
            >
              <Text style={[styles.roleButtonText, role === 'resident' && styles.roleButtonTextActive]}>
                Resident
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.roleButton, role === 'fellow' && styles.roleButtonActive]}
              onPress={() => setRole('fellow')}
            >
              <Text style={[styles.roleButtonText, role === 'fellow' && styles.roleButtonTextActive]}>
                Fellow
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.roleButton, role === 'staff_physician' && styles.roleButtonActive]}
              onPress={() => setRole('staff_physician')}
            >
              <Text style={[styles.roleButtonText, role === 'staff_physician' && styles.roleButtonTextActive]}>
                Staff Physician
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Year (for students and residents) */}
        {showYearField && (
          <View style={styles.section}>
            <Text style={styles.label}>
              {role === 'medical_student' ? 'Year (1-4)' : 'Residency Year'}
            </Text>
            <TextInput
              style={styles.input}
              value={roleYear}
              onChangeText={setRoleYear}
              placeholder={role === 'medical_student' ? 'e.g., 3' : 'e.g., PGY-2'}
              placeholderTextColor={colors.textLight}
              keyboardType="numeric"
            />
          </View>
        )}

        {/* Residency Program */}
        {showResidencyField && (
          <View style={styles.section}>
            <Text style={styles.label}>Residency Program</Text>
            <TextInput
              style={styles.input}
              value={residencyProgram}
              onChangeText={setResidencyProgram}
              placeholder="e.g., General Surgery"
              placeholderTextColor={colors.textLight}
            />
          </View>
        )}

        {/* Affiliation */}
        <View style={styles.section}>
          <Text style={styles.label}>Hospital / University Affiliation</Text>
          <TextInput
            style={styles.input}
            value={affiliation}
            onChangeText={setAffiliation}
            placeholder="e.g., Johns Hopkins Hospital"
            placeholderTextColor={colors.textLight}
          />
        </View>

        {/* Save Button */}
        <TouchableOpacity
          style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
          onPress={() => handleSave(true)}
          disabled={isSaving}
        >
          {isSaving ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.saveButtonText}>{isEditing ? 'Save Changes' : 'Complete Setup'}</Text>
          )}
        </TouchableOpacity>

        {/* Skip Button */}
        {!isEditing && (
          <TouchableOpacity
            style={styles.skipButton}
            onPress={handleSkip}
            disabled={isSaving}
          >
            <Text style={styles.skipButtonText}>Skip for now</Text>
          </TouchableOpacity>
        )}

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
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xxl,
  },
  header: {
    marginBottom: spacing.xxxl,
  },
  title: {
    fontSize: typography.h1,
    fontWeight: typography.bold,
    color: colors.text,
    marginBottom: spacing.sm,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: typography.body,
    fontWeight: typography.regular,
    color: colors.textSecondary,
    lineHeight: 22,
  },
  section: {
    marginBottom: spacing.xxl,
  },
  label: {
    fontSize: typography.bodySmall,
    fontWeight: typography.semibold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  input: {
    backgroundColor: colors.backgroundAlt,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    fontSize: typography.body,
    color: colors.text,
  },
  imagePicker: {
    backgroundColor: colors.backgroundAlt,
    borderWidth: 2,
    borderColor: colors.border,
    borderStyle: 'dashed',
    borderRadius: borderRadius.md,
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imagePickerContent: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  imagePickerText: {
    fontSize: typography.bodySmall,
    fontWeight: typography.medium,
    color: colors.textLight,
  },
  imagePreview: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  imagePreviewText: {
    fontSize: typography.bodySmall,
    fontWeight: typography.medium,
    color: colors.primary,
  },
  roleGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  roleButton: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: colors.backgroundAlt,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
  },
  roleButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  roleButtonText: {
    fontSize: typography.bodySmall,
    fontWeight: typography.semibold,
    color: colors.text,
    textAlign: 'center',
  },
  roleButtonTextActive: {
    color: '#FFFFFF',
  },
  saveButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.lg,
    alignItems: 'center',
    marginTop: spacing.xl,
    ...shadows.md,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    fontSize: typography.body,
    fontWeight: typography.bold,
    color: '#FFFFFF',
  },
  skipButton: {
    backgroundColor: 'transparent',
    borderRadius: borderRadius.md,
    paddingVertical: spacing.lg,
    alignItems: 'center',
    marginTop: spacing.md,
  },
  skipButtonText: {
    fontSize: typography.body,
    fontWeight: typography.semibold,
    color: colors.textSecondary,
  },
  bottomSpacer: {
    height: spacing.xxxxl,
  },
  backButton: {
    padding: spacing.sm,
  },
});
