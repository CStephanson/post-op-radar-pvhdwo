
// Patient data types for Post-Op Radar

export type AlertStatus = 'green' | 'yellow' | 'red';

export type UserRole = 'medical_student' | 'resident' | 'fellow' | 'staff_physician';

export interface UserProfile {
  id: string;
  userId: string;
  fullName: string;
  pronouns?: string;
  role: UserRole;
  roleYear?: number; // 1-4 for medical students, year for residents
  residencyProgram?: string;
  affiliation?: string; // Hospital or university
  profilePicture?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Legacy VitalSigns interface (kept for backward compatibility)
export interface VitalSigns {
  id?: string;
  heartRate: number;
  systolicBP: number;
  diastolicBP: number;
  temperature: number;
  urineOutput?: number; // ml/hr
  timestamp: Date;
}

// Legacy LabValues interface (kept for backward compatibility)
export interface LabValues {
  id?: string;
  wbc: number; // White blood cell count
  hemoglobin: number;
  creatinine: number;
  lactate?: number;
  timestamp: Date;
}

// NEW: Comprehensive VitalEntry interface with all fields
export interface VitalEntry {
  id: string;
  timestamp: Date;
  hr?: number; // Heart rate
  bpSys?: number; // Systolic BP
  bpDia?: number; // Diastolic BP
  rr?: number; // Respiratory rate
  temp?: number; // Temperature
  spo2?: number; // SpO2
  urineOutput?: number; // ml/hr
  pain?: number; // Pain scale 0-10
  notes?: string;
}

// NEW: Comprehensive LabEntry interface with all fields
export interface LabEntry {
  id: string;
  timestamp: Date;
  wbc?: number; // White blood cell count
  hb?: number; // Hemoglobin
  plt?: number; // Platelets
  na?: number; // Sodium
  k?: number; // Potassium
  cr?: number; // Creatinine
  lactate?: number;
  bili?: number; // Bilirubin
  alt?: number; // ALT
  ast?: number; // AST
  inr?: number; // INR
  notes?: string;
}

export interface Patient {
  id: string;
  userId: string;
  name: string;
  idStatement?: string; // Brief 1-2 line ID statement
  procedureType: string;
  postOpDay: number; // POD
  alertStatus: AlertStatus;
  
  // Manual status override fields
  statusMode?: 'auto' | 'manual'; // Default: 'auto'
  manualStatus?: AlertStatus; // User-selected status when statusMode is 'manual'
  computedStatus?: AlertStatus; // Auto-calculated status for reference
  
  // Priority sorting fields (for Red status patients)
  abnormalCount?: number; // Number of out-of-range values
  mostRecentAbnormalTimestamp?: Date; // Timestamp of most recent abnormal value
  
  // Operation details
  preOpDiagnosis?: string;
  postOpDiagnosis?: string;
  specimensTaken?: string;
  estimatedBloodLoss?: string;
  complications?: string;
  operationDateTime?: Date;
  surgeon?: string;
  anesthesiologist?: string;
  anesthesiaType?: string;
  clinicalStatus?: string;
  hospitalLocation?: string;
  
  // Legacy vitals/labs arrays (kept for backward compatibility)
  vitals: VitalSigns[];
  labs: LabValues[];
  
  // NEW: Comprehensive vitals/labs arrays
  vitalEntries?: VitalEntry[];
  labEntries?: LabEntry[];
  
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Alert {
  id: string;
  patientId: string;
  severity: AlertStatus;
  title: string;
  description: string;
  triggeredBy: string[]; // Which trends triggered this
  considerations: string[]; // What to consider
  cognitivePrompts: string[]; // Actions to take
  timestamp: Date;
}

export interface TrendData {
  label: string;
  values: number[];
  timestamps: Date[];
  trend: 'rising' | 'falling' | 'stable';
  concerning: boolean;
}

export type SortOption = 'name' | 'date' | 'location' | 'status';
