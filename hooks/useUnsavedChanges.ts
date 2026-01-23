
import { useEffect, useRef, useState, useCallback } from 'react';
import { Alert, BackHandler } from 'react-native';
import { useRouter } from 'expo-router';

interface UnsavedChangesOptions {
  hasUnsavedChanges: boolean;
  onSave: () => Promise<void>;
  onDiscard: () => void;
  enabled?: boolean;
}

/**
 * Hook to detect unsaved changes and show confirmation dialog before navigation
 * 
 * Usage:
 * const { setHasUnsavedChanges, handleBackPress } = useUnsavedChanges({
 *   hasUnsavedChanges: isDirty,
 *   onSave: async () => { await saveData(); },
 *   onDiscard: () => { resetForm(); },
 * });
 */
export function useUnsavedChanges({
  hasUnsavedChanges,
  onSave,
  onDiscard,
  enabled = true,
}: UnsavedChangesOptions) {
  const router = useRouter();
  const [isNavigating, setIsNavigating] = useState(false);
  const navigationAttemptRef = useRef<(() => void) | null>(null);

  // Show confirmation dialog
  const showUnsavedChangesDialog = useCallback(
    (onConfirm?: () => void) => {
      console.log('User attempted to navigate with unsaved changes');
      
      Alert.alert(
        'Unsaved Changes',
        'You have unsaved changes. Save before leaving?',
        [
          {
            text: 'Cancel',
            style: 'cancel',
            onPress: () => {
              console.log('User cancelled navigation');
              navigationAttemptRef.current = null;
            },
          },
          {
            text: 'Discard',
            style: 'destructive',
            onPress: () => {
              console.log('User chose to discard changes');
              onDiscard();
              navigationAttemptRef.current = null;
              if (onConfirm) {
                onConfirm();
              }
            },
          },
          {
            text: 'Save',
            onPress: async () => {
              console.log('User chose to save changes before leaving');
              try {
                setIsNavigating(true);
                await onSave();
                console.log('Save successful, proceeding with navigation');
                navigationAttemptRef.current = null;
                if (onConfirm) {
                  onConfirm();
                }
              } catch (error) {
                console.error('Save failed:', error);
                // Keep user on page if save fails
                Alert.alert('Error', 'Failed to save changes. Please try again.');
              } finally {
                setIsNavigating(false);
              }
            },
          },
        ],
        { cancelable: true }
      );
    },
    [onSave, onDiscard]
  );

  // Handle hardware back button (Android)
  useEffect(() => {
    if (!enabled || !hasUnsavedChanges) {
      return;
    }

    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      console.log('Hardware back button pressed with unsaved changes');
      showUnsavedChangesDialog(() => {
        router.back();
      });
      return true; // Prevent default back behavior
    });

    return () => backHandler.remove();
  }, [enabled, hasUnsavedChanges, showUnsavedChangesDialog, router]);

  // Custom back handler for manual back button presses
  const handleBackPress = useCallback(() => {
    if (hasUnsavedChanges && enabled) {
      showUnsavedChangesDialog(() => {
        router.back();
      });
    } else {
      router.back();
    }
  }, [hasUnsavedChanges, enabled, showUnsavedChangesDialog, router]);

  // Check before navigation
  const checkUnsavedChanges = useCallback(
    (callback: () => void) => {
      if (hasUnsavedChanges && enabled) {
        showUnsavedChangesDialog(callback);
      } else {
        callback();
      }
    },
    [hasUnsavedChanges, enabled, showUnsavedChangesDialog]
  );

  return {
    handleBackPress,
    checkUnsavedChanges,
    isNavigating,
  };
}
