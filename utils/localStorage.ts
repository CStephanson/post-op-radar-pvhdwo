
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Patient, VitalEntry, LabEntry } from '@/types/patient';
import { migrateLabEntryToCanadian } from './canadianUnits';
import { calculateAutoStatus } from './autoStatus';

// CRITICAL: Single source of truth for patient storage
// All screens MUST use this exact key
const PATIENTS_KEY = 'opmgmt_patients_v1';
const MIGRATION_FLAG_KEY = '@opmgmt_migrated';
const CANADIAN_UNITS_MIGRATION_FLAG = '@opmgmt_canadian_units_migrated';

/**
 * Local storage service for patient data
 * All patient data is stored locally on the device using AsyncStorage
 * No backend API calls - fully offline, single-user experience
 */

/**
 * Generate a unique ID for a new patient, vital, or lab entry
 * Uses timestamp + random string to ensure uniqueness
 */
function generateId(): string {
  return `entry_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Get all patients from local storage
 * Returns empty array if no patients exist
 * Automatically migrates patients to include vitalEntries and labEntries arrays
 * Automatically migrates lab values from US units to Canadian units
 */
export async function getAllPatients(): Promise<Patient[]> {
  try {
    console.log('[LocalStorage] Loading all patients from local storage');
    const patientsJson = await AsyncStorage.getItem(PATIENTS_KEY);
    
    if (!patientsJson) {
      console.log('[LocalStorage] No patients found in storage, returning empty array');
      return [];
    }
    
    const patients = JSON.parse(patientsJson);
    console.log('[LocalStorage] Raw patients from storage:', patients.length, 'patients');
    
    // Convert date strings back to Date objects AND migrate to new schema
    const patientsWithDates = patients.map((patient: any) => {
      // Ensure vitalEntries and labEntries arrays exist
      const vitalEntries = patient.vitalEntries || [];
      const labEntries = patient.labEntries || [];
      
      return {
        ...patient,
        operationDateTime: patient.operationDateTime ? new Date(patient.operationDateTime) : undefined,
        createdAt: new Date(patient.createdAt),
        updatedAt: new Date(patient.updatedAt),
        // Legacy vitals/labs arrays (for backward compatibility)
        vitals: patient.vitals?.map((v: any) => ({
          ...v,
          timestamp: new Date(v.timestamp),
        })) || [],
        labs: patient.labs?.map((l: any) => ({
          ...l,
          timestamp: new Date(l.timestamp),
        })) || [],
        // NEW: Comprehensive vitals/labs arrays
        vitalEntries: vitalEntries.map((v: any) => ({
          ...v,
          timestamp: new Date(v.timestamp),
        })),
        labEntries: labEntries.map((l: any) => ({
          ...l,
          timestamp: new Date(l.timestamp),
        })),
      };
    });
    
    console.log('[LocalStorage] Loaded', patientsWithDates.length, 'patients from storage');
    return patientsWithDates;
  } catch (error) {
    console.error('[LocalStorage] Error loading patients:', error);
    throw new Error('Failed to load patients from local storage');
  }
}

/**
 * Get a single patient by ID
 */
export async function getPatientById(id: string): Promise<Patient | null> {
  try {
    console.log('[LocalStorage] Loading patient by ID:', id);
    const patients = await getAllPatients();
    const patient = patients.find(p => p.id === id);
    
    if (!patient) {
      console.log('[LocalStorage] Patient not found with ID:', id);
      return null;
    }
    
    console.log('[LocalStorage] Patient loaded:', patient.name, 'ID:', patient.id);
    console.log('[LocalStorage] Patient has', patient.vitalEntries?.length || 0, 'vital entries and', patient.labEntries?.length || 0, 'lab entries');
    return patient;
  } catch (error) {
    console.error('[LocalStorage] Error loading patient by ID:', error);
    throw new Error('Failed to load patient from local storage');
  }
}

/**
 * Save all patients to local storage
 * This is the core persistence function - all data is written here
 */
async function saveAllPatients(patients: Patient[]): Promise<void> {
  try {
    console.log('[LocalStorage] Saving', patients.length, 'patients to local storage');
    const patientsJson = JSON.stringify(patients);
    await AsyncStorage.setItem(PATIENTS_KEY, patientsJson);
    console.log('[LocalStorage] Successfully saved', patients.length, 'patients to storage');
    
    // Verify the save by reading back
    const verifyJson = await AsyncStorage.getItem(PATIENTS_KEY);
    if (verifyJson) {
      const verifyPatients = JSON.parse(verifyJson);
      console.log('[LocalStorage] Verification: Storage now contains', verifyPatients.length, 'patients');
    }
  } catch (error) {
    console.error('[LocalStorage] Error saving patients:', error);
    throw new Error('Failed to save patients to local storage');
  }
}

/**
 * Create a new patient
 * CRITICAL: This APPENDS to the existing list, does NOT overwrite
 * Returns the created patient with generated ID and timestamps
 */
export async function createPatient(patientData: Omit<Patient, 'id' | 'userId' | 'createdAt' | 'updatedAt'>): Promise<Patient> {
  try {
    console.log('[LocalStorage] ========== CREATE PATIENT START ==========');
    console.log('[LocalStorage] Creating new patient:', patientData.name);
    
    // STEP 1: Load existing patients from storage
    const existingPatients = await getAllPatients();
    console.log('[LocalStorage] Current patient count BEFORE create:', existingPatients.length);
    console.log('[LocalStorage] Existing patient names:', existingPatients.map(p => p.name).join(', ') || '(none)');
    
    // STEP 2: Generate unique ID
    const newId = `patient_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    console.log('[LocalStorage] Generated new patient ID:', newId);
    
    // STEP 3: Create new patient object with empty vitals/labs arrays
    const newPatient: Patient = {
      ...patientData,
      id: newId,
      userId: 'local-user', // Single-user app, no real user ID needed
      createdAt: new Date(),
      updatedAt: new Date(),
      // Ensure both legacy and new arrays are initialized
      vitals: patientData.vitals || [],
      labs: patientData.labs || [],
      vitalEntries: patientData.vitalEntries || [],
      labEntries: patientData.labEntries || [],
      // Initialize status mode to auto
      statusMode: 'auto',
      computedStatus: 'green',
    };
    
    console.log('[LocalStorage] New patient object created with ID:', newPatient.id, 'Name:', newPatient.name);
    
    // STEP 4: APPEND to existing list (NOT replace)
    const updatedPatients = [...existingPatients, newPatient];
    console.log('[LocalStorage] Patient list updated. New count:', updatedPatients.length, '(was', existingPatients.length, ')');
    console.log('[LocalStorage] Updated patient names:', updatedPatients.map(p => p.name).join(', '));
    
    // STEP 5: Save the updated list back to storage
    await saveAllPatients(updatedPatients);
    
    // STEP 6: Verify by re-reading from storage
    console.log('[LocalStorage] Verifying patient was saved...');
    const verifyPatients = await getAllPatients();
    console.log('[LocalStorage] Verification: Storage now contains', verifyPatients.length, 'patients');
    console.log('[LocalStorage] Verification patient names:', verifyPatients.map(p => p.name).join(', '));
    
    const savedPatient = verifyPatients.find(p => p.id === newId);
    if (!savedPatient) {
      console.error('[LocalStorage] VERIFICATION FAILED: Patient not found in storage after save!');
      throw new Error('Failed to verify patient was saved');
    }
    
    console.log('[LocalStorage] Verification SUCCESS: Patient found in storage');
    console.log('[LocalStorage] ========== CREATE PATIENT END ==========');
    
    return savedPatient;
  } catch (error) {
    console.error('[LocalStorage] Error creating patient:', error);
    throw new Error('Failed to create patient in local storage');
  }
}

/**
 * Update an existing patient
 * ALL fields are updated - no partial saves
 * Automatically recalculates auto-status after update
 */
export async function updatePatient(id: string, patientData: Partial<Patient>): Promise<Patient> {
  try {
    console.log('[LocalStorage] ========== UPDATE PATIENT START ==========');
    console.log('[LocalStorage] Updating patient ID:', id);
    
    const patients = await getAllPatients();
    console.log('[LocalStorage] Current patient count:', patients.length);
    
    const patientIndex = patients.findIndex(p => p.id === id);
    
    if (patientIndex === -1) {
      console.error('[LocalStorage] Patient not found with ID:', id);
      throw new Error('Patient not found');
    }
    
    console.log('[LocalStorage] Found patient at index:', patientIndex);
    
    // Update ALL fields provided in patientData
    const updatedPatient: Patient = {
      ...patients[patientIndex],
      ...patientData,
      id, // Ensure ID doesn't change
      userId: 'local-user', // Ensure userId stays consistent
      updatedAt: new Date(), // Update timestamp
    };
    
    // Recalculate auto-status
    const autoStatusResult = calculateAutoStatus(updatedPatient);
    updatedPatient.computedStatus = autoStatusResult.status;
    
    // If in auto mode, update alertStatus
    if (updatedPatient.statusMode !== 'manual') {
      updatedPatient.alertStatus = autoStatusResult.status;
      console.log('[LocalStorage] Auto-status updated to:', autoStatusResult.status);
    }
    
    console.log('[LocalStorage] Updated patient name:', updatedPatient.name);
    console.log('[LocalStorage] Updated patient has', updatedPatient.vitalEntries?.length || 0, 'vital entries and', updatedPatient.labEntries?.length || 0, 'lab entries');
    
    patients[patientIndex] = updatedPatient;
    await saveAllPatients(patients);
    
    console.log('[LocalStorage] Patient updated successfully');
    
    // Re-read from storage to confirm persistence
    const savedPatient = await getPatientById(id);
    if (!savedPatient) {
      console.error('[LocalStorage] VERIFICATION FAILED: Patient not found after update!');
      throw new Error('Failed to verify patient was updated');
    }
    
    console.log('[LocalStorage] Verification SUCCESS: Updated patient found in storage');
    console.log('[LocalStorage] ========== UPDATE PATIENT END ==========');
    
    return savedPatient;
  } catch (error) {
    console.error('[LocalStorage] Error updating patient:', error);
    throw new Error('Failed to update patient in local storage');
  }
}

/**
 * Add a vital entry to a patient
 * Generates unique ID and appends to vitalEntries array
 * Automatically recalculates auto-status
 */
export async function addVitalEntry(patientId: string, vitalEntry: Omit<VitalEntry, 'id'>): Promise<Patient> {
  try {
    console.log('[LocalStorage] ========== ADD VITAL ENTRY START ==========');
    console.log('[LocalStorage] Adding vital entry to patient:', patientId);
    
    const patients = await getAllPatients();
    const patientIndex = patients.findIndex(p => p.id === patientId);
    
    if (patientIndex === -1) {
      console.error('[LocalStorage] Patient not found with ID:', patientId);
      throw new Error('Patient not found');
    }
    
    const patient = patients[patientIndex];
    console.log('[LocalStorage] Found patient:', patient.name);
    console.log('[LocalStorage] Current vital entries count:', patient.vitalEntries?.length || 0);
    
    // Generate unique ID for the vital entry
    const newVitalEntry: VitalEntry = {
      ...vitalEntry,
      id: generateId(),
    };
    
    console.log('[LocalStorage] Generated vital entry ID:', newVitalEntry.id);
    console.log('[LocalStorage] Vital entry data:', JSON.stringify(newVitalEntry));
    
    // Append to vitalEntries array
    const updatedVitalEntries = [...(patient.vitalEntries || []), newVitalEntry];
    console.log('[LocalStorage] New vital entries count:', updatedVitalEntries.length);
    
    // Update patient with new vitalEntries array
    const updatedPatient = await updatePatient(patientId, {
      vitalEntries: updatedVitalEntries,
    });
    
    console.log('[LocalStorage] Vital entry added successfully');
    console.log('[LocalStorage] Verification: Patient now has', updatedPatient.vitalEntries?.length || 0, 'vital entries');
    console.log('[LocalStorage] ========== ADD VITAL ENTRY END ==========');
    
    return updatedPatient;
  } catch (error) {
    console.error('[LocalStorage] Error adding vital entry:', error);
    throw new Error('Failed to add vital entry to patient');
  }
}

/**
 * Add a lab entry to a patient
 * Generates unique ID and appends to labEntries array
 * Automatically converts US units to Canadian units if detected
 * Automatically recalculates auto-status
 */
export async function addLabEntry(patientId: string, labEntry: Omit<LabEntry, 'id'>): Promise<Patient> {
  try {
    console.log('[LocalStorage] ========== ADD LAB ENTRY START ==========');
    console.log('[LocalStorage] Adding lab entry to patient:', patientId);
    
    const patients = await getAllPatients();
    const patientIndex = patients.findIndex(p => p.id === patientId);
    
    if (patientIndex === -1) {
      console.error('[LocalStorage] Patient not found with ID:', patientId);
      throw new Error('Patient not found');
    }
    
    const patient = patients[patientIndex];
    console.log('[LocalStorage] Found patient:', patient.name);
    console.log('[LocalStorage] Current lab entries count:', patient.labEntries?.length || 0);
    
    // Migrate to Canadian units if needed
    const migratedLabEntry = migrateLabEntryToCanadian(labEntry);
    
    // Generate unique ID for the lab entry
    const newLabEntry: LabEntry = {
      ...migratedLabEntry,
      id: generateId(),
    };
    
    console.log('[LocalStorage] Generated lab entry ID:', newLabEntry.id);
    console.log('[LocalStorage] Lab entry data (Canadian units):', JSON.stringify(newLabEntry));
    
    // Append to labEntries array
    const updatedLabEntries = [...(patient.labEntries || []), newLabEntry];
    console.log('[LocalStorage] New lab entries count:', updatedLabEntries.length);
    
    // Update patient with new labEntries array
    const updatedPatient = await updatePatient(patientId, {
      labEntries: updatedLabEntries,
    });
    
    console.log('[LocalStorage] Lab entry added successfully');
    console.log('[LocalStorage] Verification: Patient now has', updatedPatient.labEntries?.length || 0, 'lab entries');
    console.log('[LocalStorage] ========== ADD LAB ENTRY END ==========');
    
    return updatedPatient;
  } catch (error) {
    console.error('[LocalStorage] Error adding lab entry:', error);
    throw new Error('Failed to add lab entry to patient');
  }
}

/**
 * Delete a vital entry from a patient
 * Automatically recalculates auto-status
 */
export async function deleteVitalEntry(patientId: string, vitalEntryId: string): Promise<Patient> {
  try {
    console.log('[LocalStorage] Deleting vital entry:', vitalEntryId, 'from patient:', patientId);
    
    const patient = await getPatientById(patientId);
    if (!patient) {
      throw new Error('Patient not found');
    }
    
    const updatedVitalEntries = (patient.vitalEntries || []).filter(v => v.id !== vitalEntryId);
    console.log('[LocalStorage] Vital entries count after delete:', updatedVitalEntries.length);
    
    return await updatePatient(patientId, {
      vitalEntries: updatedVitalEntries,
    });
  } catch (error) {
    console.error('[LocalStorage] Error deleting vital entry:', error);
    throw new Error('Failed to delete vital entry');
  }
}

/**
 * Delete a lab entry from a patient
 * Automatically recalculates auto-status
 */
export async function deleteLabEntry(patientId: string, labEntryId: string): Promise<Patient> {
  try {
    console.log('[LocalStorage] Deleting lab entry:', labEntryId, 'from patient:', patientId);
    
    const patient = await getPatientById(patientId);
    if (!patient) {
      throw new Error('Patient not found');
    }
    
    const updatedLabEntries = (patient.labEntries || []).filter(l => l.id !== labEntryId);
    console.log('[LocalStorage] Lab entries count after delete:', updatedLabEntries.length);
    
    return await updatePatient(patientId, {
      labEntries: updatedLabEntries,
    });
  } catch (error) {
    console.error('[LocalStorage] Error deleting lab entry:', error);
    throw new Error('Failed to delete lab entry');
  }
}

/**
 * Delete a patient permanently
 */
export async function deletePatient(id: string): Promise<void> {
  try {
    console.log('[LocalStorage] ========== DELETE PATIENT START ==========');
    console.log('[LocalStorage] Deleting patient ID:', id);
    
    const patients = await getAllPatients();
    console.log('[LocalStorage] Current patient count BEFORE delete:', patients.length);
    
    const filteredPatients = patients.filter(p => p.id !== id);
    
    if (filteredPatients.length === patients.length) {
      console.error('[LocalStorage] Patient not found with ID:', id);
      throw new Error('Patient not found');
    }
    
    console.log('[LocalStorage] Patient count AFTER delete:', filteredPatients.length);
    
    await saveAllPatients(filteredPatients);
    
    console.log('[LocalStorage] Patient deleted from storage');
    
    // Verify deletion
    const deletedPatient = await getPatientById(id);
    if (deletedPatient) {
      console.error('[LocalStorage] VERIFICATION FAILED: Patient still exists after delete!');
      throw new Error('Failed to verify patient was deleted');
    }
    
    console.log('[LocalStorage] Verification SUCCESS: Patient no longer in storage');
    console.log('[LocalStorage] ========== DELETE PATIENT END ==========');
  } catch (error) {
    console.error('[LocalStorage] Error deleting patient:', error);
    throw new Error('Failed to delete patient from local storage');
  }
}

/**
 * Clear all patient data (for testing/reset purposes)
 */
export async function clearAllPatients(): Promise<void> {
  try {
    console.log('[LocalStorage] Clearing all patient data');
    await AsyncStorage.removeItem(PATIENTS_KEY);
    console.log('[LocalStorage] All patient data cleared');
  } catch (error) {
    console.error('[LocalStorage] Error clearing patients:', error);
    throw new Error('Failed to clear patient data');
  }
}

/**
 * One-time migration: Import any existing patients from old backend-based storage
 * This runs once on first app launch after removing authentication
 */
export async function migrateExistingData(): Promise<void> {
  try {
    // Check if migration already ran
    const migrated = await AsyncStorage.getItem(MIGRATION_FLAG_KEY);
    if (migrated === 'true') {
      console.log('[LocalStorage] Migration already completed, skipping');
    } else {
      console.log('[LocalStorage] Running one-time data migration');
      
      // Check for old storage key
      const oldKey = '@opmgmt_patients';
      const oldData = await AsyncStorage.getItem(oldKey);
      
      if (oldData) {
        console.log('[LocalStorage] Found old patient data, migrating to new key');
        const oldPatients = JSON.parse(oldData);
        console.log('[LocalStorage] Migrating', oldPatients.length, 'patients from old storage');
        
        // Migrate each patient to include vitalEntries and labEntries
        const migratedPatients = oldPatients.map((patient: any) => ({
          ...patient,
          vitals: patient.vitals || [],
          labs: patient.labs || [],
          vitalEntries: patient.vitalEntries || [],
          labEntries: patient.labEntries || [],
        }));
        
        // Save to new key
        await AsyncStorage.setItem(PATIENTS_KEY, JSON.stringify(migratedPatients));
        console.log('[LocalStorage] Migration complete, removing old key');
        
        // Remove old key
        await AsyncStorage.removeItem(oldKey);
      }
      
      // Check if there's any existing patient data in the new format
      const existingPatients = await getAllPatients();
      console.log('[LocalStorage] After migration, found', existingPatients.length, 'patients in new storage');
      
      // Ensure all patients have vitalEntries and labEntries arrays
      let needsSave = false;
      const updatedPatients = existingPatients.map(patient => {
        if (!patient.vitalEntries || !patient.labEntries) {
          needsSave = true;
          return {
            ...patient,
            vitals: patient.vitals || [],
            labs: patient.labs || [],
            vitalEntries: patient.vitalEntries || [],
            labEntries: patient.labEntries || [],
          };
        }
        return patient;
      });
      
      if (needsSave) {
        console.log('[LocalStorage] Migrating patients to include vitalEntries and labEntries arrays');
        await saveAllPatients(updatedPatients);
      }
      
      await AsyncStorage.setItem(MIGRATION_FLAG_KEY, 'true');
      console.log('[LocalStorage] Migration complete');
    }
    
    // Check if Canadian units migration already ran
    const canadianMigrated = await AsyncStorage.getItem(CANADIAN_UNITS_MIGRATION_FLAG);
    if (canadianMigrated === 'true') {
      console.log('[LocalStorage] Canadian units migration already completed, skipping');
      return;
    }
    
    console.log('[LocalStorage] ========== CANADIAN UNITS MIGRATION START ==========');
    console.log('[LocalStorage] Migrating existing lab values from US units to Canadian units');
    
    const patients = await getAllPatients();
    let migrationCount = 0;
    
    const migratedPatients = patients.map(patient => {
      let patientMigrated = false;
      
      // Migrate lab entries
      const migratedLabEntries = (patient.labEntries || []).map(labEntry => {
        const migrated = migrateLabEntryToCanadian(labEntry);
        if (JSON.stringify(migrated) !== JSON.stringify(labEntry)) {
          patientMigrated = true;
        }
        return migrated;
      });
      
      if (patientMigrated) {
        migrationCount++;
        console.log('[LocalStorage] Migrated lab values for patient:', patient.name);
      }
      
      return {
        ...patient,
        labEntries: migratedLabEntries,
      };
    });
    
    if (migrationCount > 0) {
      console.log('[LocalStorage] Migrated', migrationCount, 'patients to Canadian units');
      await saveAllPatients(migratedPatients);
    } else {
      console.log('[LocalStorage] No patients needed Canadian units migration');
    }
    
    await AsyncStorage.setItem(CANADIAN_UNITS_MIGRATION_FLAG, 'true');
    console.log('[LocalStorage] ========== CANADIAN UNITS MIGRATION END ==========');
  } catch (error) {
    console.error('[LocalStorage] Error during migration:', error);
    // Don't throw - migration failure shouldn't break the app
  }
}
