
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

export interface VitalSigns {
  id?: string;
  heartRate: number;
  systolicBP: number;
  diastolicBP: number;
  temperature: number;
  urineOutput?: number; // ml/hr
  timestamp: Date;
}

export interface LabValues {
  id?: string;
  wbc: number; // White blood cell count
  hemoglobin: number;
  creatinine: number;
  lactate?: number;
  timestamp: Date;
}

export interface Patient {
  id: string;
  userId: string;
  name: string;
  idStatement?: string; // Brief 1-2 line ID statement
  procedureType: string;
  postOpDay: number; // POD
  alertStatus: AlertStatus;
  
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
  
  vitals: VitalSigns[];
  labs: LabValues[];
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
