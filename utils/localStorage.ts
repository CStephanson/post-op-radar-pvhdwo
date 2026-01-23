
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
      console.log('[LocalStorage] No patients found in storage');
      return [];
    }
    
    const patients = JSON.parse(patientsJson);
    
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
    
    console.log('[LocalStorage] Loaded', patientsWithDates.length, 'patients');
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
    console.log('[LocalStorage] Loading patient:', id);
    const patients = await getAllPatients();
    const patient = patients.find(p => p.id === id);
    
    if (!patient) {
      console.log('[LocalStorage] Patient not found:', id);
      return null;
    }
    
    console.log('[LocalStorage] Patient loaded:', patient.name);
    return patient;
  } catch (error) {
    console.error('[LocalStorage] Error loading patient:', error);
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
    console.log('[LocalStorage] Patients saved successfully');
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
    console.log('[LocalStorage] Creating new patient:', patientData.name);
    
    const patients = await getAllPatients();
    
    const newPatient: Patient = {
      ...patientData,
      id: generateId(),
      userId: 'local-user', // Single-user app, no real user ID needed
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    patients.push(newPatient);
    await saveAllPatients(patients);
    
    console.log('[LocalStorage] Patient created successfully:', newPatient.id);
    
    // Re-read from storage to confirm persistence
    const savedPatient = await getPatientById(newPatient.id);
    if (!savedPatient) {
      throw new Error('Failed to verify patient was saved');
    }
    
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
    console.log('[LocalStorage] Updating patient:', id);
    
    const patients = await getAllPatients();
    const patientIndex = patients.findIndex(p => p.id === id);
    
    if (patientIndex === -1) {
      throw new Error('Patient not found');
    }
    
    // Update ALL fields provided in patientData
    const updatedPatient: Patient = {
      ...patients[patientIndex],
      ...patientData,
      id, // Ensure ID doesn't change
      userId: 'local-user', // Ensure userId stays consistent
      updatedAt: new Date(), // Update timestamp
    };
    
    patients[patientIndex] = updatedPatient;
    await saveAllPatients(patients);
    
    console.log('[LocalStorage] Patient updated successfully');
    
    // Re-read from storage to confirm persistence
    const savedPatient = await getPatientById(id);
    if (!savedPatient) {
      throw new Error('Failed to verify patient was updated');
    }
    
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
    console.log('[LocalStorage] Deleting patient:', id);
    
    const patients = await getAllPatients();
    const filteredPatients = patients.filter(p => p.id !== id);
    
    if (filteredPatients.length === patients.length) {
      throw new Error('Patient not found');
    }
    
    await saveAllPatients(filteredPatients);
    
    console.log('[LocalStorage] Patient deleted successfully');
    
    // Verify deletion
    const deletedPatient = await getPatientById(id);
    if (deletedPatient) {
      throw new Error('Failed to verify patient was deleted');
    }
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
