
/**
 * Canadian Lab Units Utility
 * Handles conversion, validation, and reference ranges for Canadian-standard lab units
 */

import { VitalEntry, LabEntry } from '@/types/patient';

// ============================================================================
// CANADIAN REFERENCE RANGES (Adult defaults)
// ============================================================================

export interface ReferenceRange {
  min: number;
  max: number;
  unit: string;
}

export const CANADIAN_VITAL_RANGES: Record<string, ReferenceRange> = {
  hr: { min: 60, max: 100, unit: 'bpm' },
  bpSys: { min: 90, max: 140, unit: 'mmHg' },
  bpDia: { min: 60, max: 90, unit: 'mmHg' },
  rr: { min: 12, max: 20, unit: '/min' },
  temp: { min: 36.1, max: 37.2, unit: '°C' },
  spo2: { min: 95, max: 100, unit: '%' },
  urineOutput: { min: 30, max: 200, unit: 'ml/hr' },
};

export const CANADIAN_LAB_RANGES: Record<string, ReferenceRange> = {
  // WBC: x10^9/L (Canadian standard)
  wbc: { min: 4.0, max: 11.0, unit: 'x10⁹/L' },
  
  // Hemoglobin: g/L (Canadian) - NOT g/dL (US)
  // Example: 132 g/L (Canadian) = 13.2 g/dL (US)
  hb: { min: 120, max: 160, unit: 'g/L' },
  
  // Platelets: x10^9/L
  plt: { min: 150, max: 400, unit: 'x10⁹/L' },
  
  // Sodium: mmol/L (same in both systems)
  na: { min: 135, max: 145, unit: 'mmol/L' },
  
  // Potassium: mmol/L (same in both systems)
  k: { min: 3.5, max: 5.0, unit: 'mmol/L' },
  
  // Creatinine: µmol/L (Canadian) - NOT mg/dL (US)
  // Example: 88 µmol/L (Canadian) = 1.0 mg/dL (US)
  cr: { min: 60, max: 110, unit: 'µmol/L' },
  
  // Lactate: mmol/L (same in both systems)
  lactate: { min: 0.5, max: 2.0, unit: 'mmol/L' },
  
  // Bilirubin: µmol/L (Canadian) - NOT mg/dL (US)
  // Example: 17 µmol/L (Canadian) = 1.0 mg/dL (US)
  bili: { min: 5, max: 21, unit: 'µmol/L' },
  
  // ALT: U/L (same in both systems)
  alt: { min: 7, max: 56, unit: 'U/L' },
  
  // AST: U/L (same in both systems)
  ast: { min: 10, max: 40, unit: 'U/L' },
  
  // INR: ratio (same in both systems)
  inr: { min: 0.8, max: 1.2, unit: '' },
};

// ============================================================================
// US TO CANADIAN UNIT CONVERSION
// ============================================================================

/**
 * Detect if a hemoglobin value is likely in US units (g/dL) and convert to Canadian (g/L)
 * US range: 12-16 g/dL → Canadian range: 120-160 g/L
 */
export function convertHbToCanadian(value: number): number {
  // If value is < 30, it's likely in g/dL (US units)
  if (value < 30) {
    console.log(`[CanadianUnits] Detected US Hb value: ${value} g/dL → Converting to ${value * 10} g/L`);
    return value * 10; // Convert g/dL to g/L
  }
  return value; // Already in g/L
}

/**
 * Detect if a creatinine value is likely in US units (mg/dL) and convert to Canadian (µmol/L)
 * US range: 0.6-1.2 mg/dL → Canadian range: 53-106 µmol/L
 * Conversion: mg/dL × 88.4 = µmol/L
 */
export function convertCrToCanadian(value: number): number {
  // If value is < 20, it's likely in mg/dL (US units)
  if (value < 20) {
    console.log(`[CanadianUnits] Detected US Cr value: ${value} mg/dL → Converting to ${Math.round(value * 88.4)} µmol/L`);
    return Math.round(value * 88.4); // Convert mg/dL to µmol/L
  }
  return value; // Already in µmol/L
}

/**
 * Detect if a bilirubin value is likely in US units (mg/dL) and convert to Canadian (µmol/L)
 * US range: 0.3-1.2 mg/dL → Canadian range: 5-21 µmol/L
 * Conversion: mg/dL × 17.1 = µmol/L
 */
export function convertBiliToCanadian(value: number): number {
  // If value is < 5, it's likely in mg/dL (US units)
  if (value < 5) {
    console.log(`[CanadianUnits] Detected US Bili value: ${value} mg/dL → Converting to ${Math.round(value * 17.1)} µmol/L`);
    return Math.round(value * 17.1); // Convert mg/dL to µmol/L
  }
  return value; // Already in µmol/L
}

/**
 * Migrate a lab entry from US units to Canadian units
 */
export function migrateLabEntryToCanadian(labEntry: LabEntry): LabEntry {
  const migrated = { ...labEntry };
  
  if (migrated.hb !== undefined) {
    migrated.hb = convertHbToCanadian(migrated.hb);
  }
  
  if (migrated.cr !== undefined) {
    migrated.cr = convertCrToCanadian(migrated.cr);
  }
  
  if (migrated.bili !== undefined) {
    migrated.bili = convertBiliToCanadian(migrated.bili);
  }
  
  return migrated;
}

// ============================================================================
// OUT-OF-RANGE DETECTION
// ============================================================================

export interface AbnormalValue {
  field: string;
  value: number;
  range: ReferenceRange;
  label: string;
}

/**
 * Check if a vital entry has any out-of-range values
 * Returns array of abnormal values
 */
export function checkVitalAbnormalities(vital: VitalEntry): AbnormalValue[] {
  const abnormalities: AbnormalValue[] = [];
  
  if (vital.hr !== undefined) {
    const range = CANADIAN_VITAL_RANGES.hr;
    if (vital.hr < range.min || vital.hr > range.max) {
      abnormalities.push({
        field: 'hr',
        value: vital.hr,
        range,
        label: 'HR',
      });
    }
  }
  
  if (vital.bpSys !== undefined) {
    const range = CANADIAN_VITAL_RANGES.bpSys;
    if (vital.bpSys < range.min || vital.bpSys > range.max) {
      abnormalities.push({
        field: 'bpSys',
        value: vital.bpSys,
        range,
        label: 'Systolic BP',
      });
    }
  }
  
  if (vital.bpDia !== undefined) {
    const range = CANADIAN_VITAL_RANGES.bpDia;
    if (vital.bpDia < range.min || vital.bpDia > range.max) {
      abnormalities.push({
        field: 'bpDia',
        value: vital.bpDia,
        range,
        label: 'Diastolic BP',
      });
    }
  }
  
  if (vital.rr !== undefined) {
    const range = CANADIAN_VITAL_RANGES.rr;
    if (vital.rr < range.min || vital.rr > range.max) {
      abnormalities.push({
        field: 'rr',
        value: vital.rr,
        range,
        label: 'RR',
      });
    }
  }
  
  if (vital.temp !== undefined) {
    const range = CANADIAN_VITAL_RANGES.temp;
    if (vital.temp < range.min || vital.temp > range.max) {
      abnormalities.push({
        field: 'temp',
        value: vital.temp,
        range,
        label: 'Temperature',
      });
    }
  }
  
  if (vital.spo2 !== undefined) {
    const range = CANADIAN_VITAL_RANGES.spo2;
    if (vital.spo2 < range.min || vital.spo2 > range.max) {
      abnormalities.push({
        field: 'spo2',
        value: vital.spo2,
        range,
        label: 'SpO₂',
      });
    }
  }
  
  if (vital.urineOutput !== undefined) {
    const range = CANADIAN_VITAL_RANGES.urineOutput;
    if (vital.urineOutput < range.min || vital.urineOutput > range.max) {
      abnormalities.push({
        field: 'urineOutput',
        value: vital.urineOutput,
        range,
        label: 'Urine Output',
      });
    }
  }
  
  return abnormalities;
}

/**
 * Check if a lab entry has any out-of-range values
 * Returns array of abnormal values
 */
export function checkLabAbnormalities(lab: LabEntry): AbnormalValue[] {
  const abnormalities: AbnormalValue[] = [];
  
  if (lab.wbc !== undefined) {
    const range = CANADIAN_LAB_RANGES.wbc;
    if (lab.wbc < range.min || lab.wbc > range.max) {
      abnormalities.push({
        field: 'wbc',
        value: lab.wbc,
        range,
        label: 'WBC',
      });
    }
  }
  
  if (lab.hb !== undefined) {
    const range = CANADIAN_LAB_RANGES.hb;
    if (lab.hb < range.min || lab.hb > range.max) {
      abnormalities.push({
        field: 'hb',
        value: lab.hb,
        range,
        label: 'Hb',
      });
    }
  }
  
  if (lab.plt !== undefined) {
    const range = CANADIAN_LAB_RANGES.plt;
    if (lab.plt < range.min || lab.plt > range.max) {
      abnormalities.push({
        field: 'plt',
        value: lab.plt,
        range,
        label: 'Platelets',
      });
    }
  }
  
  if (lab.na !== undefined) {
    const range = CANADIAN_LAB_RANGES.na;
    if (lab.na < range.min || lab.na > range.max) {
      abnormalities.push({
        field: 'na',
        value: lab.na,
        range,
        label: 'Na',
      });
    }
  }
  
  if (lab.k !== undefined) {
    const range = CANADIAN_LAB_RANGES.k;
    if (lab.k < range.min || lab.k > range.max) {
      abnormalities.push({
        field: 'k',
        value: lab.k,
        range,
        label: 'K',
      });
    }
  }
  
  if (lab.cr !== undefined) {
    const range = CANADIAN_LAB_RANGES.cr;
    if (lab.cr < range.min || lab.cr > range.max) {
      abnormalities.push({
        field: 'cr',
        value: lab.cr,
        range,
        label: 'Creatinine',
      });
    }
  }
  
  if (lab.lactate !== undefined) {
    const range = CANADIAN_LAB_RANGES.lactate;
    if (lab.lactate < range.min || lab.lactate > range.max) {
      abnormalities.push({
        field: 'lactate',
        value: lab.lactate,
        range,
        label: 'Lactate',
      });
    }
  }
  
  if (lab.bili !== undefined) {
    const range = CANADIAN_LAB_RANGES.bili;
    if (lab.bili < range.min || lab.bili > range.max) {
      abnormalities.push({
        field: 'bili',
        value: lab.bili,
        range,
        label: 'Bilirubin',
      });
    }
  }
  
  if (lab.alt !== undefined) {
    const range = CANADIAN_LAB_RANGES.alt;
    if (lab.alt < range.min || lab.alt > range.max) {
      abnormalities.push({
        field: 'alt',
        value: lab.alt,
        range,
        label: 'ALT',
      });
    }
  }
  
  if (lab.ast !== undefined) {
    const range = CANADIAN_LAB_RANGES.ast;
    if (lab.ast < range.min || lab.ast > range.max) {
      abnormalities.push({
        field: 'ast',
        value: lab.ast,
        range,
        label: 'AST',
      });
    }
  }
  
  if (lab.inr !== undefined) {
    const range = CANADIAN_LAB_RANGES.inr;
    if (lab.inr < range.min || lab.inr > range.max) {
      abnormalities.push({
        field: 'inr',
        value: lab.inr,
        range,
        label: 'INR',
      });
    }
  }
  
  return abnormalities;
}

/**
 * Format a value with its Canadian unit
 */
export function formatValueWithUnit(field: string, value: number, isLab: boolean): string {
  const ranges = isLab ? CANADIAN_LAB_RANGES : CANADIAN_VITAL_RANGES;
  const range = ranges[field];
  
  if (!range) {
    return `${value}`;
  }
  
  if (field === 'hb') {
    return `${Math.round(value)} ${range.unit}`;
  }
  
  if (field === 'cr' || field === 'bili') {
    return `${Math.round(value)} ${range.unit}`;
  }
  
  if (field === 'wbc' || field === 'plt' || field === 'lactate' || field === 'k') {
    return `${value.toFixed(1)} ${range.unit}`;
  }
  
  return `${value} ${range.unit}`;
}
