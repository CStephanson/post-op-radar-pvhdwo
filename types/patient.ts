
// Patient data types for Post-Op Radar

export type AlertStatus = 'green' | 'yellow' | 'red';

export type UserRole = 'medical_student' | 'resident' | 'fellow' | 'staff_physician';

export interface UserProfile {
  id: string;
  userId: string;
  fullName: string;
  pronouns?: string;
  role: UserRole;
  roleYear?: number;
  residencyProgram?: string;
  affiliation?: string;
  profilePicture?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface VitalSigns {
  id?: string;
  heartRate: number;
  systolicBP: number;
  diastolicBP: number;
  temperature: number;
  urineOutput?: number;
  timestamp: Date;
}

export interface LabValues {
  id?: string;
  wbc: number;
  hemoglobin: number;
  creatinine: number;
  lactate?: number;
  timestamp: Date;
}

export interface VitalEntry {
  id: string;
  timestamp: Date;
  hr?: number;
  bpSys?: number;
  bpDia?: number;
  rr?: number;
  temp?: number;
  spo2?: number;
  urineOutput?: number;
  pain?: number;
  notes?: string;
}

export interface LabEntry {
  id: string;
  timestamp: Date;
  wbc?: number;
  hb?: number;
  plt?: number;
  na?: number;
  k?: number;
  cr?: number;
  lactate?: number;
  bili?: number;
  alt?: number;
  ast?: number;
  inr?: number;
  notes?: string;
}

export interface Patient {
  // CRITICAL: Use patientId as the single stable identifier
  patientId: string;
  userId: string;
  name: string;
  idStatement?: string;
  procedureType: string;
  postOpDay: number;
  alertStatus: AlertStatus;
  
  statusMode?: 'auto' | 'manual';
  manualStatus?: AlertStatus;
  computedStatus?: AlertStatus;
  
  abnormalCount?: number;
  mostRecentAbnormalTimestamp?: Date;
  
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
  
  vitals: VitalSigns[];
  labs: LabValues[];
  
  vitalEntries?: VitalEntry[];
  labEntries?: LabEntry[];
  
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
  
  // DEPRECATED: Keep for backward compatibility during migration
  id?: string;
}

export interface Alert {
  id: string;
  patientId: string;
  severity: AlertStatus;
  title: string;
  description: string;
  triggeredBy: string[];
  considerations: string[];
  cognitivePrompts: string[];
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
