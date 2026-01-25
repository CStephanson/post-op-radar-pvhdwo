
/**
 * Automatic Patient Status Calculation
 * Based on Canadian reference ranges and abnormal value counting
 */

import { Patient, AlertStatus, VitalEntry, LabEntry } from '@/types/patient';
import { checkVitalAbnormalities, checkLabAbnormalities, AbnormalValue } from './canadianUnits';

export interface AutoStatusResult {
  status: AlertStatus;
  abnormalCount: number;
  abnormalities: AbnormalValue[];
  summary: string;
  mostRecentAbnormalTimestamp?: Date;
}

/**
 * Calculate automatic patient status based on most recent vitals and labs
 * 
 * Rules:
 * - 0 abnormal values → Green (Stable)
 * - 1 abnormal value → Yellow (Monitor)
 * - 2+ abnormal values → Red (Reassess)
 */
export function calculateAutoStatus(patient: Patient): AutoStatusResult {
  console.log('[AutoStatus] Calculating auto-status for patient:', patient.name);
  
  const allAbnormalities: AbnormalValue[] = [];
  let mostRecentAbnormalTimestamp: Date | undefined;
  
  // Check most recent vital entry
  if (patient.vitalEntries && patient.vitalEntries.length > 0) {
    const sortedVitals = [...patient.vitalEntries].sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
    const latestVital = sortedVitals[0];
    
    console.log('[AutoStatus] Checking latest vital entry from:', new Date(latestVital.timestamp).toLocaleString());
    const vitalAbnormalities = checkVitalAbnormalities(latestVital);
    console.log('[AutoStatus] Found', vitalAbnormalities.length, 'vital abnormalities');
    
    if (vitalAbnormalities.length > 0) {
      allAbnormalities.push(...vitalAbnormalities);
      const vitalTimestamp = new Date(latestVital.timestamp);
      if (!mostRecentAbnormalTimestamp || vitalTimestamp > mostRecentAbnormalTimestamp) {
        mostRecentAbnormalTimestamp = vitalTimestamp;
      }
    }
  }
  
  // Check most recent lab entry
  if (patient.labEntries && patient.labEntries.length > 0) {
    const sortedLabs = [...patient.labEntries].sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
    const latestLab = sortedLabs[0];
    
    console.log('[AutoStatus] Checking latest lab entry from:', new Date(latestLab.timestamp).toLocaleString());
    const labAbnormalities = checkLabAbnormalities(latestLab);
    console.log('[AutoStatus] Found', labAbnormalities.length, 'lab abnormalities');
    
    if (labAbnormalities.length > 0) {
      allAbnormalities.push(...labAbnormalities);
      const labTimestamp = new Date(latestLab.timestamp);
      if (!mostRecentAbnormalTimestamp || labTimestamp > mostRecentAbnormalTimestamp) {
        mostRecentAbnormalTimestamp = labTimestamp;
      }
    }
  }
  
  const abnormalCount = allAbnormalities.length;
  console.log('[AutoStatus] Total abnormalities:', abnormalCount);
  console.log('[AutoStatus] Most recent abnormal timestamp:', mostRecentAbnormalTimestamp?.toLocaleString() || 'none');
  
  // Determine status based on abnormal count
  let status: AlertStatus;
  if (abnormalCount === 0) {
    status = 'green';
  } else if (abnormalCount === 1) {
    status = 'yellow';
  } else {
    status = 'red';
  }
  
  // Generate summary
  let summary = '';
  if (abnormalCount === 0) {
    summary = 'All values within normal range';
  } else {
    const labels = allAbnormalities.map(a => a.label).join(', ');
    summary = `Auto-status: ${abnormalCount} ${abnormalCount === 1 ? 'abnormality' : 'abnormalities'} (${labels})`;
  }
  
  console.log('[AutoStatus] Calculated status:', status, '|', summary);
  
  return {
    status,
    abnormalCount,
    abnormalities: allAbnormalities,
    summary,
    mostRecentAbnormalTimestamp,
  };
}

/**
 * Get the effective status for a patient
 * If manual override is ON, return manual status
 * Otherwise, return computed auto-status
 */
export function getEffectiveStatus(patient: Patient): AlertStatus {
  if (patient.statusMode === 'manual' && patient.manualStatus) {
    console.log('[AutoStatus] Manual override active - using manual status:', patient.manualStatus);
    return patient.manualStatus;
  }
  
  if (patient.computedStatus) {
    console.log('[AutoStatus] Using computed auto-status:', patient.computedStatus);
    return patient.computedStatus;
  }
  
  // Fallback to existing alertStatus
  console.log('[AutoStatus] Using existing alertStatus:', patient.alertStatus);
  return patient.alertStatus;
}
