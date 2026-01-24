
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Patient } from '@/types/patient';

const PATIENTS_KEY = '@opmgmt_patients';
const MIGRATION_FLAG_KEY = '@opmgmt_migrated';

/**
 * Local storage service for patient data
 * All patient data is stored locally on the device using AsyncStorage
 * No backend API calls - fully offline, single-user experience
 */

/**
 * Generate a unique ID for a new patient
 */
function generateId(): string {
  return `patient_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Get all patients from local storage
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
    
    // Convert date strings back to Date objects
    const patientsWithDates = patients.map((patient: any) => ({
      ...patient,
      operationDateTime: patient.operationDateTime ? new Date(patient.operationDateTime) : undefined,
      createdAt: new Date(patient.createdAt),
      updatedAt: new Date(patient.updatedAt),
      vitals: patient.vitals?.map((v: any) => ({
        ...v,
        timestamp: new Date(v.timestamp),
      })) || [],
      labs: patient.labs?.map((l: any) => ({
        ...l,
        timestamp: new Date(l.timestamp),
      })) || [],
    }));
    
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
 * Returns the created patient with generated ID and timestamps
 */
export async function createPatient(patientData: Omit<Patient, 'id' | 'userId' | 'createdAt' | 'updatedAt'>): Promise<Patient> {
  try {
    console.log('[LocalStorage] ========== CREATE PATIENT START ==========');
    console.log('[LocalStorage] Creating new patient:', patientData.name);
    
    // STEP 1: Load existing patients
    const existingPatients = await getAllPatients();
    console.log('[LocalStorage] Current patient count BEFORE create:', existingPatients.length);
    
    // STEP 2: Generate unique ID
    const newId = generateId();
    console.log('[LocalStorage] Generated new patient ID:', newId);
    
    // STEP 3: Create new patient object
    const newPatient: Patient = {
      ...patientData,
      id: newId,
      userId: 'local-user', // Single-user app, no real user ID needed
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    console.log('[LocalStorage] New patient object created with ID:', newPatient.id, 'Name:', newPatient.name);
    
    // STEP 4: Append to existing list (NOT replace)
    const updatedPatients = [...existingPatients, newPatient];
    console.log('[LocalStorage] Patient list updated. New count:', updatedPatients.length, '(was', existingPatients.length, ')');
    
    // STEP 5: Save the updated list
    await saveAllPatients(updatedPatients);
    
    // STEP 6: Verify by re-reading from storage
    console.log('[LocalStorage] Verifying patient was saved...');
    const verifyPatients = await getAllPatients();
    console.log('[LocalStorage] Verification: Storage now contains', verifyPatients.length, 'patients');
    
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
    
    console.log('[LocalStorage] Updated patient name:', updatedPatient.name);
    
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
      return;
    }
    
    console.log('[LocalStorage] Running one-time data migration');
    
    // Check if there's any existing patient data in the new format
    const existingPatients = await getAllPatients();
    if (existingPatients.length > 0) {
      console.log('[LocalStorage] Found', existingPatients.length, 'existing patients, skipping migration');
      await AsyncStorage.setItem(MIGRATION_FLAG_KEY, 'true');
      return;
    }
    
    // TODO: If there was cached data from the old backend system, import it here
    // For now, we just mark migration as complete
    
    await AsyncStorage.setItem(MIGRATION_FLAG_KEY, 'true');
    console.log('[LocalStorage] Migration complete');
  } catch (error) {
    console.error('[LocalStorage] Error during migration:', error);
    // Don't throw - migration failure shouldn't break the app
  }
}
