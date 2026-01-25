
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Patient, VitalEntry, LabEntry } from '@/types/patient';
import { migrateLabEntryToCanadian } from './canadianUnits';
import { calculateAutoStatus } from './autoStatus';

// CRITICAL: Single source of truth for patient storage
const PATIENTS_KEY = 'opmgmt_patients_v1';
const MIGRATION_FLAG_KEY = '@opmgmt_migrated';
const CANADIAN_UNITS_MIGRATION_FLAG = '@opmgmt_canadian_units_migrated';
const PATIENTID_MIGRATION_FLAG = '@opmgmt_patientid_migrated';

/**
 * Generate a unique ID for a new patient, vital, or lab entry
 */
function generateId(): string {
  return `entry_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * HARDENED: Ensure patient has all required fields
 * CRITICAL: Ensures patientId exists and is stable (never regenerated)
 */
function ensurePatientIntegrity(patient: any): Patient {
  try {
    // CRITICAL: Use existing patientId if present, otherwise migrate from id, otherwise generate new
    let patientId: string;
    if (patient.patientId) {
      patientId = patient.patientId;
    } else if (patient.id) {
      // Migrate from old id field
      patientId = patient.id;
      console.log('[LocalStorage] Migrating patient.id to patient.patientId:', patientId);
    } else {
      // Generate new patientId
      patientId = generateId();
      console.log('[LocalStorage] Generated new patientId:', patientId);
    }
    
    return {
      ...patient,
      patientId,
      userId: patient.userId || 'local-user',
      name: patient.name || 'Unnamed Patient',
      procedureType: patient.procedureType || 'Unknown Procedure',
      postOpDay: typeof patient.postOpDay === 'number' ? patient.postOpDay : 0,
      alertStatus: patient.alertStatus || 'green',
      statusMode: patient.statusMode || 'auto',
      computedStatus: patient.computedStatus || 'green',
      abnormalCount: typeof patient.abnormalCount === 'number' ? patient.abnormalCount : 0,
      mostRecentAbnormalTimestamp: patient.mostRecentAbnormalTimestamp || undefined,
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
    return {
      patientId: generateId(),
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
 */
export async function getAllPatients(): Promise<Patient[]> {
  try {
    console.log('[LocalStorage] ========== GET ALL PATIENTS START ==========');
    console.log('[LocalStorage] Reading from AsyncStorage key:', PATIENTS_KEY);
    
    const patientsJson = await AsyncStorage.getItem(PATIENTS_KEY);
    
    if (!patientsJson || patientsJson === '' || patientsJson === 'null' || patientsJson === 'undefined') {
      console.log('[LocalStorage] No patients found in storage, returning empty array');
      return [];
    }
    
    console.log('[LocalStorage] Raw data length:', patientsJson.length, 'characters');
    
    let patients: any[];
    try {
      patients = JSON.parse(patientsJson);
      console.log('[LocalStorage] JSON parse successful');
    } catch (parseError) {
      console.error('[LocalStorage] JSON parse FAILED - data corrupted. Resetting to empty array.', parseError);
      try {
        await AsyncStorage.setItem(PATIENTS_KEY, JSON.stringify([]));
        console.log('[LocalStorage] Corrupted data reset to empty array');
      } catch (resetError) {
        console.error('[LocalStorage] Failed to reset corrupted data:', resetError);
      }
      return [];
    }
    
    if (!Array.isArray(patients)) {
      console.error('[LocalStorage] Parsed data is not an array. Resetting to empty array.');
      try {
        await AsyncStorage.setItem(PATIENTS_KEY, JSON.stringify([]));
        console.log('[LocalStorage] Non-array data reset to empty array');
      } catch (resetError) {
        console.error('[LocalStorage] Failed to reset non-array data:', resetError);
      }
      return [];
    }
    
    console.log('[LocalStorage] Found', patients.length, 'patients in storage');
    
    const validPatients: Patient[] = [];
    let skippedCount = 0;
    
    for (let i = 0; i < patients.length; i++) {
      try {
        const patient = patients[i];
        const validPatient = ensurePatientIntegrity(patient);
        
        const patientWithDates: Patient = {
          ...validPatient,
          operationDateTime: validPatient.operationDateTime ? new Date(validPatient.operationDateTime) : undefined,
          createdAt: new Date(validPatient.createdAt),
          updatedAt: new Date(validPatient.updatedAt),
          vitals: (validPatient.vitals || []).map((v: any) => ({
            ...v,
            timestamp: new Date(v.timestamp),
          })),
          labs: (validPatient.labs || []).map((l: any) => ({
            ...l,
            timestamp: new Date(l.timestamp),
          })),
          vitalEntries: (validPatient.vitalEntries || []).map((v: any) => ({
            ...v,
            timestamp: new Date(v.timestamp),
          })),
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
    return [];
  }
}

/**
 * PRODUCTION-HARDENED: Get a single patient by patientId
 */
export async function getPatientById(patientId: string): Promise<Patient | null> {
  try {
    console.log('[LocalStorage] ========== GET PATIENT BY ID START ==========');
    console.log('[LocalStorage] Looking for patientId:', patientId);
    
    const patients = await getAllPatients();
    console.log('[LocalStorage] Loaded', patients.length, 'patients from storage');
    
    const patient = patients.find(p => p.patientId === patientId);
    
    if (!patient) {
      console.log('[LocalStorage] Patient NOT FOUND with patientId:', patientId);
      return null;
    }
    
    console.log('[LocalStorage] Patient FOUND:', patient.name, '| patientId:', patient.patientId);
    console.log('[LocalStorage] Patient has', patient.vitalEntries?.length || 0, 'vital entries and', patient.labEntries?.length || 0, 'lab entries');
    console.log('[LocalStorage] ========== GET PATIENT BY ID END ==========');
    
    return patient;
  } catch (error) {
    console.error('[LocalStorage] Error in getPatientById - returning null:', error);
    return null;
  }
}

/**
 * PRODUCTION-HARDENED: Save all patients to local storage
 */
export async function saveAllPatients(patients: Patient[]): Promise<void> {
  try {
    console.log('[LocalStorage] ========== SAVE ALL PATIENTS START ==========');
    console.log('[LocalStorage] Saving', patients.length, 'patients to AsyncStorage');
    
    const validPatients = patients.map(ensurePatientIntegrity);
    
    const patientsJson = JSON.stringify(validPatients);
    console.log('[LocalStorage] Serialized data length:', patientsJson.length, 'characters');
    
    await AsyncStorage.setItem(PATIENTS_KEY, patientsJson);
    console.log('[LocalStorage] AsyncStorage.setItem completed');
    
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
 */
export async function createPatient(patientData: Omit<Patient, 'patientId' | 'userId' | 'createdAt' | 'updatedAt'>): Promise<Patient> {
  try {
    console.log('[LocalStorage] ========== CREATE PATIENT START ==========');
    console.log('[LocalStorage] Creating new patient:', patientData.name);
    
    const existingPatients = await getAllPatients();
    console.log('[LocalStorage] Current patient count BEFORE create:', existingPatients.length);
    
    const newPatientId = `patient_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    console.log('[LocalStorage] Generated new patientId:', newPatientId);
    
    const newPatient: Patient = ensurePatientIntegrity({
      ...patientData,
      patientId: newPatientId,
      userId: 'local-user',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    
    console.log('[LocalStorage] New patient object created with patientId:', newPatient.patientId, '| Name:', newPatient.name);
    
    const updatedPatients = [...existingPatients, newPatient];
    console.log('[LocalStorage] Patient list updated. New count:', updatedPatients.length);
    
    await saveAllPatients(updatedPatients);
    
    console.log('[LocalStorage] Verifying patient was saved...');
    const savedPatient = await getPatientById(newPatientId);
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
 */
export async function updatePatient(patientId: string, patientData: Partial<Patient>): Promise<Patient> {
  try {
    console.log('[LocalStorage] ========== UPDATE PATIENT START ==========');
    console.log('[LocalStorage] Updating patientId:', patientId);
    
    const patients = await getAllPatients();
    console.log('[LocalStorage] Current patient count:', patients.length);
    
    const patientIndex = patients.findIndex(p => p.patientId === patientId);
    
    if (patientIndex === -1) {
      console.error('[LocalStorage] Patient NOT FOUND with patientId:', patientId);
      throw new Error('Patient not found');
    }
    
    console.log('[LocalStorage] Found patient at index:', patientIndex);
    
    const updatedPatient: Patient = ensurePatientIntegrity({
      ...patients[patientIndex],
      ...patientData,
      patientId,
      userId: 'local-user',
      updatedAt: new Date(),
    });
    
    const autoStatusResult = calculateAutoStatus(updatedPatient);
    updatedPatient.computedStatus = autoStatusResult.status;
    updatedPatient.abnormalCount = autoStatusResult.abnormalCount;
    updatedPatient.mostRecentAbnormalTimestamp = autoStatusResult.mostRecentAbnormalTimestamp;
    
    if (updatedPatient.statusMode !== 'manual') {
      updatedPatient.alertStatus = autoStatusResult.status;
      console.log('[LocalStorage] Auto-status updated to:', autoStatusResult.status, '| Abnormalities:', autoStatusResult.abnormalCount);
    }
    
    console.log('[LocalStorage] Updated patient name:', updatedPatient.name);
    console.log('[LocalStorage] Updated patient has', updatedPatient.vitalEntries?.length || 0, 'vital entries and', updatedPatient.labEntries?.length || 0, 'lab entries');
    
    patients[patientIndex] = updatedPatient;
    await saveAllPatients(patients);
    
    console.log('[LocalStorage] Patient updated successfully');
    
    const savedPatient = await getPatientById(patientId);
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
 */
export async function addVitalEntry(patientId: string, vitalEntry: Omit<VitalEntry, 'id'>): Promise<Patient> {
  try {
    console.log('[LocalStorage] ========== ADD VITAL ENTRY START ==========');
    console.log('[LocalStorage] Adding vital entry to patientId:', patientId);
    
    const patients = await getAllPatients();
    const patientIndex = patients.findIndex(p => p.patientId === patientId);
    
    if (patientIndex === -1) {
      console.error('[LocalStorage] Patient NOT FOUND with patientId:', patientId);
      throw new Error('Patient not found');
    }
    
    const patient = patients[patientIndex];
    console.log('[LocalStorage] Found patient:', patient.name);
    console.log('[LocalStorage] Current vital entries count:', patient.vitalEntries?.length || 0);
    
    const newVitalEntry: VitalEntry = {
      ...vitalEntry,
      id: generateId(),
    };
    
    console.log('[LocalStorage] Generated vital entry ID:', newVitalEntry.id);
    
    const updatedVitalEntries = [...(patient.vitalEntries || []), newVitalEntry];
    console.log('[LocalStorage] New vital entries count:', updatedVitalEntries.length);
    
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
 */
export async function addLabEntry(patientId: string, labEntry: Omit<LabEntry, 'id'>): Promise<Patient> {
  try {
    console.log('[LocalStorage] ========== ADD LAB ENTRY START ==========');
    console.log('[LocalStorage] Adding lab entry to patientId:', patientId);
    
    const patients = await getAllPatients();
    const patientIndex = patients.findIndex(p => p.patientId === patientId);
    
    if (patientIndex === -1) {
      console.error('[LocalStorage] Patient NOT FOUND with patientId:', patientId);
      throw new Error('Patient not found');
    }
    
    const patient = patients[patientIndex];
    console.log('[LocalStorage] Found patient:', patient.name);
    console.log('[LocalStorage] Current lab entries count:', patient.labEntries?.length || 0);
    
    const migratedLabEntry = migrateLabEntryToCanadian(labEntry);
    
    const newLabEntry: LabEntry = {
      ...migratedLabEntry,
      id: generateId(),
    };
    
    console.log('[LocalStorage] Generated lab entry ID:', newLabEntry.id);
    
    const updatedLabEntries = [...(patient.labEntries || []), newLabEntry];
    console.log('[LocalStorage] New lab entries count:', updatedLabEntries.length);
    
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
 */
export async function deleteVitalEntry(patientId: string, vitalEntryId: string): Promise<Patient> {
  try {
    console.log('[LocalStorage] ========== DELETE VITAL ENTRY START ==========');
    console.log('[LocalStorage] Deleting vital entry:', vitalEntryId, 'from patientId:', patientId);
    
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
 */
export async function deleteLabEntry(patientId: string, labEntryId: string): Promise<Patient> {
  try {
    console.log('[LocalStorage] ========== DELETE LAB ENTRY START ==========');
    console.log('[LocalStorage] Deleting lab entry:', labEntryId, 'from patientId:', patientId);
    
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
export async function deletePatient(patientId: string): Promise<void> {
  try {
    console.log('[LocalStorage] ========== DELETE PATIENT START ==========');
    console.log('[LocalStorage] Deleting patientId:', patientId);
    
    const patients = await getAllPatients();
    console.log('[LocalStorage] Current patient count BEFORE delete:', patients.length);
    
    const filteredPatients = patients.filter(p => p.patientId !== patientId);
    
    if (filteredPatients.length === patients.length) {
      console.error('[LocalStorage] Patient NOT FOUND with patientId:', patientId);
      throw new Error('Patient not found');
    }
    
    console.log('[LocalStorage] Patient count AFTER delete:', filteredPatients.length);
    
    await saveAllPatients(filteredPatients);
    
    console.log('[LocalStorage] Patient deleted from storage');
    
    const deletedPatient = await getPatientById(patientId);
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
 * Clear all patient data
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
 * CRITICAL: Migrates id -> patientId field name
 */
export async function migrateExistingData(): Promise<void> {
  try {
    console.log('[LocalStorage] ========== MIGRATION START ==========');
    
    // Check if patientId migration already ran
    const patientIdMigrated = await AsyncStorage.getItem(PATIENTID_MIGRATION_FLAG);
    if (patientIdMigrated !== 'true') {
      console.log('[LocalStorage] Running patientId field migration (id -> patientId)');
      
      const patients = await getAllPatients();
      if (patients.length > 0) {
        console.log('[LocalStorage] Migrating', patients.length, 'patients to use patientId field');
        
        // ensurePatientIntegrity already handles id -> patientId migration
        const migratedPatients = patients.map(ensurePatientIntegrity);
        
        await saveAllPatients(migratedPatients);
        console.log('[LocalStorage] patientId migration complete');
      }
      
      await AsyncStorage.setItem(PATIENTID_MIGRATION_FLAG, 'true');
    } else {
      console.log('[LocalStorage] patientId migration already completed');
    }
    
    // Check if basic migration already ran
    const migrated = await AsyncStorage.getItem(MIGRATION_FLAG_KEY);
    if (migrated === 'true') {
      console.log('[LocalStorage] Basic migration already completed');
    } else {
      console.log('[LocalStorage] Running one-time data migration');
      
      const oldKey = '@opmgmt_patients';
      const oldData = await AsyncStorage.getItem(oldKey);
      
      if (oldData) {
        try {
          console.log('[LocalStorage] Found old patient data, migrating to new key');
          const oldPatients = JSON.parse(oldData);
          console.log('[LocalStorage] Migrating', oldPatients.length, 'patients from old storage');
          
          const migratedPatients = oldPatients.map((patient: any) => ensurePatientIntegrity(patient));
          
          await AsyncStorage.setItem(PATIENTS_KEY, JSON.stringify(migratedPatients));
          console.log('[LocalStorage] Migration complete, removing old key');
          
          await AsyncStorage.removeItem(oldKey);
        } catch (oldDataError) {
          console.error('[LocalStorage] Error migrating old data (non-fatal), skipping:', oldDataError);
        }
      }
      
      await AsyncStorage.setItem(MIGRATION_FLAG_KEY, 'true');
      console.log('[LocalStorage] Basic migration complete');
    }
    
    console.log('[LocalStorage] Ensuring all patients have required fields...');
    const existingPatients = await getAllPatients();
    console.log('[LocalStorage] Found', existingPatients.length, 'patients in storage');
    
    if (existingPatients.length > 0) {
      let needsSave = false;
      const updatedPatients = existingPatients.map(patient => {
        if (!patient.vitalEntries || !patient.labEntries || !patient.patientId) {
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
    try {
      await AsyncStorage.setItem(MIGRATION_FLAG_KEY, 'true');
      await AsyncStorage.setItem(CANADIAN_UNITS_MIGRATION_FLAG, 'true');
      await AsyncStorage.setItem(PATIENTID_MIGRATION_FLAG, 'true');
      console.log('[LocalStorage] Migration flags set despite error to prevent retry loop');
    } catch (flagError) {
      console.error('[LocalStorage] Could not set migration flags:', flagError);
    }
  }
}
