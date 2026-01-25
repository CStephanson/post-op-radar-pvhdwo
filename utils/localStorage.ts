
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
 * PRODUCTION-HARDENED Local storage service for patient data
 * All patient data is stored locally on the device using AsyncStorage
 * No backend API calls - fully offline, single-user experience
 * 
 * CRITICAL GUARANTEES:
 * - getAllPatients() NEVER throws - always returns valid array
 * - Corrupted data is automatically reset to empty array
 * - Missing fields are automatically added with defaults
 * - All writes are verified by reading back
 */

/**
 * Generate a unique ID for a new patient, vital, or lab entry
 * Uses timestamp + random string to ensure uniqueness
 */
function generateId(): string {
  return `entry_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * HARDENED: Ensure patient has all required fields
 * This prevents crashes from missing data
 * NEVER throws - always returns valid patient object
 */
function ensurePatientIntegrity(patient: any): Patient {
  try {
    return {
      ...patient,
      id: patient.id || generateId(),
      userId: patient.userId || 'local-user',
      name: patient.name || 'Unnamed Patient',
      procedureType: patient.procedureType || 'Unknown Procedure',
      postOpDay: typeof patient.postOpDay === 'number' ? patient.postOpDay : 0,
      alertStatus: patient.alertStatus || 'green',
      statusMode: patient.statusMode || 'auto',
      computedStatus: patient.computedStatus || 'green',
      abnormalCount: typeof patient.abnormalCount === 'number' ? patient.abnormalCount : 0,
      mostRecentAbnormalTimestamp: patient.mostRecentAbnormalTimestamp || undefined,
      // CRITICAL: Ensure vitals and labs arrays exist (never undefined)
      vitals: Array.isArray(patient.vitals) ? patient.vitals : [],
      labs: Array.isArray(patient.labs) ? patient.labs : [],
      vitalEntries: Array.isArray(patient.vitalEntries) ? patient.vitalEntries : [],
      labEntries: Array.isArray(patient.labEntries) ? patient.labEntries : [],
      createdAt: patient.createdAt ? new Date(patient.createdAt) : new Date(),
      updatedAt: patient.updatedAt ? new Date(patient.updatedAt) : new Date(),
      operationDateTime: patient.operationDateTime ? new Date(patient.operationDateTime) : undefined,
    };
  } catch (error) {
    console.error('[LocalStorage] Error ensuring patient integrity, returning minimal patient:', error);
    // FALLBACK: Return minimal valid patient if anything fails
    return {
      id: generateId(),
      userId: 'local-user',
      name: 'Unnamed Patient',
      procedureType: 'Unknown Procedure',
      postOpDay: 0,
      alertStatus: 'green',
      statusMode: 'auto',
      computedStatus: 'green',
      abnormalCount: 0,
      vitals: [],
      labs: [],
      vitalEntries: [],
      labEntries: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }
}

/**
 * PRODUCTION-HARDENED: Get all patients from local storage
 * NEVER throws errors - always returns valid array
 * Automatically fixes corrupted data
 * 
 * GUARANTEES:
 * - Returns empty array [] if no data exists
 * - Returns empty array [] if data is corrupted
 * - Returns empty array [] if JSON parse fails
 * - Ensures all patients have required fields
 * - Converts date strings back to Date objects
 */
export async function getAllPatients(): Promise<Patient[]> {
  try {
    console.log('[LocalStorage] ========== GET ALL PATIENTS START ==========');
    console.log('[LocalStorage] Reading from AsyncStorage key:', PATIENTS_KEY);
    
    const patientsJson = await AsyncStorage.getItem(PATIENTS_KEY);
    
    // CASE 1: No data exists yet (first launch or after clear)
    if (!patientsJson || patientsJson === '' || patientsJson === 'null' || patientsJson === 'undefined') {
      console.log('[LocalStorage] No patients found in storage (null/empty), returning empty array');
      return [];
    }
    
    console.log('[LocalStorage] Raw data length:', patientsJson.length, 'characters');
    
    // CASE 2: Try to parse the data
    let patients: any[];
    try {
      patients = JSON.parse(patientsJson);
      console.log('[LocalStorage] JSON parse successful');
    } catch (parseError) {
      console.error('[LocalStorage] JSON parse FAILED - data corrupted. Resetting to empty array.', parseError);
      // Data is corrupted - reset to empty array and save
      try {
        await AsyncStorage.setItem(PATIENTS_KEY, JSON.stringify([]));
        console.log('[LocalStorage] Corrupted data reset to empty array');
      } catch (resetError) {
        console.error('[LocalStorage] Failed to reset corrupted data:', resetError);
      }
      return [];
    }
    
    // CASE 3: Parsed data is not an array
    if (!Array.isArray(patients)) {
      console.error('[LocalStorage] Parsed data is not an array (type:', typeof patients, '). Resetting to empty array.');
      try {
        await AsyncStorage.setItem(PATIENTS_KEY, JSON.stringify([]));
        console.log('[LocalStorage] Non-array data reset to empty array');
      } catch (resetError) {
        console.error('[LocalStorage] Failed to reset non-array data:', resetError);
      }
      return [];
    }
    
    console.log('[LocalStorage] Found', patients.length, 'patients in storage');
    
    // CASE 4: Ensure all patients have required fields and convert dates
    const validPatients: Patient[] = [];
    let skippedCount = 0;
    
    for (let i = 0; i < patients.length; i++) {
      try {
        const patient = patients[i];
        
        // Ensure patient integrity (adds missing fields)
        const validPatient = ensurePatientIntegrity(patient);
        
        // Convert date strings back to Date objects
        const patientWithDates: Patient = {
          ...validPatient,
          operationDateTime: validPatient.operationDateTime ? new Date(validPatient.operationDateTime) : undefined,
          createdAt: new Date(validPatient.createdAt),
          updatedAt: new Date(validPatient.updatedAt),
          // Convert vitals timestamps
          vitals: (validPatient.vitals || []).map((v: any) => ({
            ...v,
            timestamp: new Date(v.timestamp),
          })),
          // Convert labs timestamps
          labs: (validPatient.labs || []).map((l: any) => ({
            ...l,
            timestamp: new Date(l.timestamp),
          })),
          // Convert vitalEntries timestamps
          vitalEntries: (validPatient.vitalEntries || []).map((v: any) => ({
            ...v,
            timestamp: new Date(v.timestamp),
          })),
          // Convert labEntries timestamps
          labEntries: (validPatient.labEntries || []).map((l: any) => ({
            ...l,
            timestamp: new Date(l.timestamp),
          })),
        };
        
        validPatients.push(patientWithDates);
      } catch (patientError) {
        console.error('[LocalStorage] Error processing patient at index', i, '- skipping:', patientError);
        skippedCount++;
      }
    }
    
    console.log('[LocalStorage] Successfully processed', validPatients.length, 'valid patients');
    if (skippedCount > 0) {
      console.log('[LocalStorage] Skipped', skippedCount, 'corrupted patients');
    }
    
    // If we had to skip any patients, save the cleaned array back
    if (skippedCount > 0) {
      console.log('[LocalStorage] Saving cleaned patient data back to storage');
      try {
        await saveAllPatients(validPatients);
      } catch (saveError) {
        console.error('[LocalStorage] Failed to save cleaned data (non-fatal):', saveError);
      }
    }
    
    console.log('[LocalStorage] ========== GET ALL PATIENTS END ==========');
    return validPatients;
  } catch (error) {
    console.error('[LocalStorage] CRITICAL ERROR in getAllPatients - returning empty array:', error);
    // NEVER throw - return empty array so app doesn't crash
    return [];
  }
}

/**
 * PRODUCTION-HARDENED: Get a single patient by ID
 * Returns null if not found (never throws)
 * Automatically reloads from storage to ensure fresh data
 */
export async function getPatientById(id: string): Promise<Patient | null> {
  try {
    console.log('[LocalStorage] ========== GET PATIENT BY ID START ==========');
    console.log('[LocalStorage] Looking for patient ID:', id);
    
    const patients = await getAllPatients();
    console.log('[LocalStorage] Loaded', patients.length, 'patients from storage');
    
    const patient = patients.find(p => p.id === id);
    
    if (!patient) {
      console.log('[LocalStorage] Patient NOT FOUND with ID:', id);
      return null;
    }
    
    console.log('[LocalStorage] Patient FOUND:', patient.name, '| ID:', patient.id);
    console.log('[LocalStorage] Patient has', patient.vitalEntries?.length || 0, 'vital entries and', patient.labEntries?.length || 0, 'lab entries');
    console.log('[LocalStorage] ========== GET PATIENT BY ID END ==========');
    
    return patient;
  } catch (error) {
    console.error('[LocalStorage] Error in getPatientById - returning null:', error);
    // NEVER throw - return null so app doesn't crash
    return null;
  }
}

/**
 * PRODUCTION-HARDENED: Save all patients to local storage
 * Verifies write succeeded by reading back
 * Throws error if verification fails (caller should handle)
 */
async function saveAllPatients(patients: Patient[]): Promise<void> {
  try {
    console.log('[LocalStorage] ========== SAVE ALL PATIENTS START ==========');
    console.log('[LocalStorage] Saving', patients.length, 'patients to AsyncStorage');
    
    // Ensure all patients have required fields before saving
    const validPatients = patients.map(ensurePatientIntegrity);
    
    const patientsJson = JSON.stringify(validPatients);
    console.log('[LocalStorage] Serialized data length:', patientsJson.length, 'characters');
    
    await AsyncStorage.setItem(PATIENTS_KEY, patientsJson);
    console.log('[LocalStorage] AsyncStorage.setItem completed');
    
    // CRITICAL: Verify the save by reading back
    console.log('[LocalStorage] Verifying save by reading back...');
    const verifyJson = await AsyncStorage.getItem(PATIENTS_KEY);
    
    if (!verifyJson) {
      throw new Error('Verification FAILED: Storage returned null after save');
    }
    
    let verifyPatients: any[];
    try {
      verifyPatients = JSON.parse(verifyJson);
    } catch (parseError) {
      throw new Error('Verification FAILED: Cannot parse saved data');
    }
    
    if (!Array.isArray(verifyPatients)) {
      throw new Error('Verification FAILED: Saved data is not an array');
    }
    
    if (verifyPatients.length !== validPatients.length) {
      throw new Error(`Verification FAILED: Expected ${validPatients.length} patients, got ${verifyPatients.length}`);
    }
    
    console.log('[LocalStorage] Verification SUCCESS: Storage contains', verifyPatients.length, 'patients');
    console.log('[LocalStorage] ========== SAVE ALL PATIENTS END ==========');
  } catch (error) {
    console.error('[LocalStorage] CRITICAL ERROR in saveAllPatients:', error);
    throw new Error(`Failed to save patients to local storage: ${error}`);
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
    
    // STEP 2: Generate unique ID
    const newId = `patient_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    console.log('[LocalStorage] Generated new patient ID:', newId);
    
    // STEP 3: Create new patient object with all required fields
    const newPatient: Patient = ensurePatientIntegrity({
      ...patientData,
      id: newId,
      userId: 'local-user',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    
    console.log('[LocalStorage] New patient object created with ID:', newPatient.id, '| Name:', newPatient.name);
    
    // STEP 4: APPEND to existing list (NOT replace)
    const updatedPatients = [...existingPatients, newPatient];
    console.log('[LocalStorage] Patient list updated. New count:', updatedPatients.length);
    
    // STEP 5: Save the updated list back to storage
    await saveAllPatients(updatedPatients);
    
    // STEP 6: Verify by re-reading from storage
    console.log('[LocalStorage] Verifying patient was saved...');
    const savedPatient = await getPatientById(newId);
    if (!savedPatient) {
      throw new Error('Verification FAILED: Patient not found after save');
    }
    
    console.log('[LocalStorage] Verification SUCCESS: Patient found in storage');
    console.log('[LocalStorage] ========== CREATE PATIENT END ==========');
    
    return savedPatient;
  } catch (error) {
    console.error('[LocalStorage] Error creating patient:', error);
    throw new Error(`Failed to create patient in local storage: ${error}`);
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
      console.error('[LocalStorage] Patient NOT FOUND with ID:', id);
      throw new Error('Patient not found');
    }
    
    console.log('[LocalStorage] Found patient at index:', patientIndex);
    
    // Update ALL fields provided in patientData
    const updatedPatient: Patient = ensurePatientIntegrity({
      ...patients[patientIndex],
      ...patientData,
      id, // Ensure ID doesn't change
      userId: 'local-user', // Ensure userId stays consistent
      updatedAt: new Date(), // Update timestamp
    });
    
    // Recalculate auto-status
    const autoStatusResult = calculateAutoStatus(updatedPatient);
    updatedPatient.computedStatus = autoStatusResult.status;
    updatedPatient.abnormalCount = autoStatusResult.abnormalCount;
    updatedPatient.mostRecentAbnormalTimestamp = autoStatusResult.mostRecentAbnormalTimestamp;
    
    // If in auto mode, update alertStatus
    if (updatedPatient.statusMode !== 'manual') {
      updatedPatient.alertStatus = autoStatusResult.status;
      console.log('[LocalStorage] Auto-status updated to:', autoStatusResult.status, '| Abnormalities:', autoStatusResult.abnormalCount);
    }
    
    console.log('[LocalStorage] Updated patient name:', updatedPatient.name);
    console.log('[LocalStorage] Updated patient has', updatedPatient.vitalEntries?.length || 0, 'vital entries and', updatedPatient.labEntries?.length || 0, 'lab entries');
    
    patients[patientIndex] = updatedPatient;
    await saveAllPatients(patients);
    
    console.log('[LocalStorage] Patient updated successfully');
    
    // Re-read from storage to confirm persistence
    const savedPatient = await getPatientById(id);
    if (!savedPatient) {
      throw new Error('Verification FAILED: Patient not found after update');
    }
    
    console.log('[LocalStorage] Verification SUCCESS: Updated patient found in storage');
    console.log('[LocalStorage] ========== UPDATE PATIENT END ==========');
    
    return savedPatient;
  } catch (error) {
    console.error('[LocalStorage] Error updating patient:', error);
    throw new Error(`Failed to update patient in local storage: ${error}`);
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
      console.error('[LocalStorage] Patient NOT FOUND with ID:', patientId);
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
    throw new Error(`Failed to add vital entry to patient: ${error}`);
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
      console.error('[LocalStorage] Patient NOT FOUND with ID:', patientId);
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
    throw new Error(`Failed to add lab entry to patient: ${error}`);
  }
}

/**
 * Delete a vital entry from a patient
 * Automatically recalculates auto-status
 */
export async function deleteVitalEntry(patientId: string, vitalEntryId: string): Promise<Patient> {
  try {
    console.log('[LocalStorage] ========== DELETE VITAL ENTRY START ==========');
    console.log('[LocalStorage] Deleting vital entry:', vitalEntryId, 'from patient:', patientId);
    
    const patient = await getPatientById(patientId);
    if (!patient) {
      throw new Error('Patient not found');
    }
    
    const beforeCount = patient.vitalEntries?.length || 0;
    const updatedVitalEntries = (patient.vitalEntries || []).filter(v => v.id !== vitalEntryId);
    const afterCount = updatedVitalEntries.length;
    
    console.log('[LocalStorage] Vital entries count: before =', beforeCount, ', after =', afterCount);
    
    if (beforeCount === afterCount) {
      console.log('[LocalStorage] WARNING: Vital entry not found with ID:', vitalEntryId);
    }
    
    const updatedPatient = await updatePatient(patientId, {
      vitalEntries: updatedVitalEntries,
    });
    
    console.log('[LocalStorage] Vital entry deleted successfully');
    console.log('[LocalStorage] ========== DELETE VITAL ENTRY END ==========');
    
    return updatedPatient;
  } catch (error) {
    console.error('[LocalStorage] Error deleting vital entry:', error);
    throw new Error(`Failed to delete vital entry: ${error}`);
  }
}

/**
 * Delete a lab entry from a patient
 * Automatically recalculates auto-status
 */
export async function deleteLabEntry(patientId: string, labEntryId: string): Promise<Patient> {
  try {
    console.log('[LocalStorage] ========== DELETE LAB ENTRY START ==========');
    console.log('[LocalStorage] Deleting lab entry:', labEntryId, 'from patient:', patientId);
    
    const patient = await getPatientById(patientId);
    if (!patient) {
      throw new Error('Patient not found');
    }
    
    const beforeCount = patient.labEntries?.length || 0;
    const updatedLabEntries = (patient.labEntries || []).filter(l => l.id !== labEntryId);
    const afterCount = updatedLabEntries.length;
    
    console.log('[LocalStorage] Lab entries count: before =', beforeCount, ', after =', afterCount);
    
    if (beforeCount === afterCount) {
      console.log('[LocalStorage] WARNING: Lab entry not found with ID:', labEntryId);
    }
    
    const updatedPatient = await updatePatient(patientId, {
      labEntries: updatedLabEntries,
    });
    
    console.log('[LocalStorage] Lab entry deleted successfully');
    console.log('[LocalStorage] ========== DELETE LAB ENTRY END ==========');
    
    return updatedPatient;
  } catch (error) {
    console.error('[LocalStorage] Error deleting lab entry:', error);
    throw new Error(`Failed to delete lab entry: ${error}`);
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
      console.error('[LocalStorage] Patient NOT FOUND with ID:', id);
      throw new Error('Patient not found');
    }
    
    console.log('[LocalStorage] Patient count AFTER delete:', filteredPatients.length);
    
    await saveAllPatients(filteredPatients);
    
    console.log('[LocalStorage] Patient deleted from storage');
    
    // Verify deletion
    const deletedPatient = await getPatientById(id);
    if (deletedPatient) {
      throw new Error('Verification FAILED: Patient still exists after delete');
    }
    
    console.log('[LocalStorage] Verification SUCCESS: Patient no longer in storage');
    console.log('[LocalStorage] ========== DELETE PATIENT END ==========');
  } catch (error) {
    console.error('[LocalStorage] Error deleting patient:', error);
    throw new Error(`Failed to delete patient from local storage: ${error}`);
  }
}

/**
 * Clear all patient data (for testing/reset purposes)
 */
export async function clearAllPatients(): Promise<void> {
  try {
    console.log('[LocalStorage] ========== CLEAR ALL PATIENTS START ==========');
    console.log('[LocalStorage] Clearing all patient data');
    await AsyncStorage.removeItem(PATIENTS_KEY);
    console.log('[LocalStorage] All patient data cleared');
    console.log('[LocalStorage] ========== CLEAR ALL PATIENTS END ==========');
  } catch (error) {
    console.error('[LocalStorage] Error clearing patients:', error);
    throw new Error(`Failed to clear patient data: ${error}`);
  }
}

/**
 * PRODUCTION-HARDENED: One-time migration
 * Imports any existing patients from old backend-based storage
 * Ensures all patients have required fields
 * Migrates lab values to Canadian units
 * 
 * NEVER crashes - always completes successfully
 */
export async function migrateExistingData(): Promise<void> {
  try {
    console.log('[LocalStorage] ========== MIGRATION START ==========');
    
    // Check if basic migration already ran
    const migrated = await AsyncStorage.getItem(MIGRATION_FLAG_KEY);
    if (migrated === 'true') {
      console.log('[LocalStorage] Basic migration already completed, skipping');
    } else {
      console.log('[LocalStorage] Running one-time data migration');
      
      // Check for old storage key
      const oldKey = '@opmgmt_patients';
      const oldData = await AsyncStorage.getItem(oldKey);
      
      if (oldData) {
        try {
          console.log('[LocalStorage] Found old patient data, migrating to new key');
          const oldPatients = JSON.parse(oldData);
          console.log('[LocalStorage] Migrating', oldPatients.length, 'patients from old storage');
          
          // Migrate each patient to ensure all required fields exist
          const migratedPatients = oldPatients.map((patient: any) => ensurePatientIntegrity(patient));
          
          // Save to new key
          await AsyncStorage.setItem(PATIENTS_KEY, JSON.stringify(migratedPatients));
          console.log('[LocalStorage] Migration complete, removing old key');
          
          // Remove old key
          await AsyncStorage.removeItem(oldKey);
        } catch (oldDataError) {
          console.error('[LocalStorage] Error migrating old data (non-fatal), skipping:', oldDataError);
        }
      }
      
      await AsyncStorage.setItem(MIGRATION_FLAG_KEY, 'true');
      console.log('[LocalStorage] Basic migration complete');
    }
    
    // CRITICAL: Ensure all existing patients have required fields
    console.log('[LocalStorage] Ensuring all patients have required fields...');
    const existingPatients = await getAllPatients();
    console.log('[LocalStorage] Found', existingPatients.length, 'patients in storage');
    
    if (existingPatients.length > 0) {
      let needsSave = false;
      const updatedPatients = existingPatients.map(patient => {
        // Check if patient is missing any required fields
        if (!patient.vitalEntries || !patient.labEntries || !patient.id) {
          needsSave = true;
          console.log('[LocalStorage] Fixing patient:', patient.name);
          return ensurePatientIntegrity(patient);
        }
        return patient;
      });
      
      if (needsSave) {
        console.log('[LocalStorage] Saving fixed patient data back to storage');
        await saveAllPatients(updatedPatients);
      } else {
        console.log('[LocalStorage] All patients have required fields');
      }
    }
    
    // Check if Canadian units migration already ran
    const canadianMigrated = await AsyncStorage.getItem(CANADIAN_UNITS_MIGRATION_FLAG);
    if (canadianMigrated === 'true') {
      console.log('[LocalStorage] Canadian units migration already completed');
    } else {
      console.log('[LocalStorage] Running Canadian units migration');
      
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
    }
    
    console.log('[LocalStorage] ========== MIGRATION END ==========');
  } catch (error) {
    console.error('[LocalStorage] Error during migration (non-fatal):', error);
    // Don't throw - migration failure shouldn't break the app
    // Mark migrations as complete so we don't retry on every launch
    try {
      await AsyncStorage.setItem(MIGRATION_FLAG_KEY, 'true');
      await AsyncStorage.setItem(CANADIAN_UNITS_MIGRATION_FLAG, 'true');
      console.log('[LocalStorage] Migration flags set despite error to prevent retry loop');
    } catch (flagError) {
      console.error('[LocalStorage] Could not set migration flags:', flagError);
    }
  }
}
