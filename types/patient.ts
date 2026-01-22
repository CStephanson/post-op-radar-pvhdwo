
// Patient data types for Post-Op Radar

export type AlertStatus = 'green' | 'yellow' | 'red';

export interface VitalSigns {
  heartRate: number;
  systolicBP: number;
  diastolicBP: number;
  temperature: number;
  urineOutput?: number; // ml/hr
  timestamp: Date;
}

export interface LabValues {
  wbc: number; // White blood cell count
  hemoglobin: number;
  creatinine: number;
  lactate?: number;
  timestamp: Date;
}

export interface Patient {
  id: string;
  name: string;
  procedureType: string;
  postOpDay: number; // POD
  alertStatus: AlertStatus;
  vitals: VitalSigns[];
  labs: LabValues[];
  notes?: string;
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
