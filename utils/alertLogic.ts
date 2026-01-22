
import { Patient, Alert, AlertStatus, TrendData } from '@/types/patient';

// Rule-based alert logic - transparent and explainable
export function calculateAlertStatus(patient: Patient): AlertStatus {
  console.log('Calculating alert status for patient:', patient.name);
  
  const alerts = generateAlerts(patient);
  
  if (alerts.some(a => a.severity === 'red')) {
    return 'red';
  }
  if (alerts.some(a => a.severity === 'yellow')) {
    return 'yellow';
  }
  return 'green';
}

export function generateAlerts(patient: Patient): Alert[] {
  console.log('Generating alerts for patient:', patient.name);
  
  const alerts: Alert[] = [];
  const trends = calculateTrends(patient);
  
  // Rule 1: Rising HR + Rising WBC on POD 3-5
  if (patient.postOpDay >= 3 && patient.postOpDay <= 5) {
    const hrTrend = trends.find(t => t.label === 'Heart Rate');
    const wbcTrend = trends.find(t => t.label === 'WBC');
    
    if (hrTrend?.trend === 'rising' && wbcTrend?.trend === 'rising') {
      const latestHR = hrTrend.values[hrTrend.values.length - 1];
      const latestWBC = wbcTrend.values[wbcTrend.values.length - 1];
      
      if (latestHR > 90 && latestWBC > 12) {
        alerts.push({
          id: `alert-${patient.id}-1`,
          patientId: patient.id,
          severity: 'yellow',
          title: 'Monitor Closely',
          description: 'Pattern concerning for possible clinical deterioration',
          triggeredBy: [
            `Rising heart rate (${hrTrend.values[0]} → ${latestHR} bpm)`,
            `Rising WBC (${wbcTrend.values[0].toFixed(1)} → ${latestWBC.toFixed(1)})`,
          ],
          considerations: [
            'Surgical site infection',
            'Intra-abdominal abscess',
            'Pneumonia',
            'Urinary tract infection',
          ],
          cognitivePrompts: [
            'Re-examine the patient',
            'Review recent labs and imaging',
            'Consider discussing with senior resident',
          ],
          timestamp: new Date(),
        });
      }
    }
  }
  
  // Rule 2: Decreasing Hgb + Tachycardia
  const hgbTrend = trends.find(t => t.label === 'Hemoglobin');
  const hrTrend = trends.find(t => t.label === 'Heart Rate');
  
  if (hgbTrend?.trend === 'falling' && hrTrend) {
    const latestHgb = hgbTrend.values[hgbTrend.values.length - 1];
    const latestHR = hrTrend.values[hrTrend.values.length - 1];
    const hgbDrop = hgbTrend.values[0] - latestHgb;
    
    if (hgbDrop > 1.5 && latestHR > 100) {
      alerts.push({
        id: `alert-${patient.id}-2`,
        patientId: patient.id,
        severity: 'red',
        title: 'Consider Reassessment and Escalation',
        description: 'Pattern concerning for possible bleeding',
        triggeredBy: [
          `Decreasing hemoglobin (${hgbTrend.values[0].toFixed(1)} → ${latestHgb.toFixed(1)})`,
          `Tachycardia (${latestHR} bpm)`,
        ],
        considerations: [
          'Post-operative bleeding',
          'Intra-abdominal hemorrhage',
          'Anastomotic bleeding',
        ],
        cognitivePrompts: [
          'URGENT: Re-examine patient immediately',
          'Check for signs of bleeding',
          'Discuss with attending surgeon',
          'Consider need for imaging or return to OR',
        ],
        timestamp: new Date(),
      });
    }
  }
  
  // Rule 3: Persistent fever beyond POD 2
  if (patient.postOpDay > 2) {
    const tempTrend = trends.find(t => t.label === 'Temperature');
    if (tempTrend) {
      const latestTemp = tempTrend.values[tempTrend.values.length - 1];
      if (latestTemp >= 38.0) {
        const existingAlert = alerts.find(a => a.triggeredBy.some(t => t.includes('fever')));
        if (!existingAlert) {
          alerts.push({
            id: `alert-${patient.id}-3`,
            patientId: patient.id,
            severity: 'yellow',
            title: 'Monitor Closely',
            description: 'Persistent fever beyond POD 2',
            triggeredBy: [
              `Persistent fever (${latestTemp.toFixed(1)}°C)`,
            ],
            considerations: [
              'Surgical site infection',
              'Pneumonia',
              'Urinary tract infection',
              'Deep vein thrombosis',
            ],
            cognitivePrompts: [
              'Re-examine the patient',
              'Review wound site',
              'Consider chest X-ray',
              'Consider urinalysis',
            ],
            timestamp: new Date(),
          });
        }
      }
    }
  }
  
  // Rule 4: Rising creatinine + reduced urine output
  const creatTrend = trends.find(t => t.label === 'Creatinine');
  const uoTrend = trends.find(t => t.label === 'Urine Output');
  
  if (creatTrend?.trend === 'rising' && uoTrend?.trend === 'falling') {
    const latestCreat = creatTrend.values[creatTrend.values.length - 1];
    const latestUO = uoTrend.values[uoTrend.values.length - 1];
    
    if (latestCreat > 1.2 && latestUO < 30) {
      alerts.push({
        id: `alert-${patient.id}-4`,
        patientId: patient.id,
        severity: 'red',
        title: 'Consider Reassessment and Escalation',
        description: 'Pattern concerning for acute kidney injury',
        triggeredBy: [
          `Rising creatinine (${creatTrend.values[0].toFixed(1)} → ${latestCreat.toFixed(1)})`,
          `Reduced urine output (${latestUO} ml/hr)`,
        ],
        considerations: [
          'Acute kidney injury',
          'Hypovolemia',
          'Sepsis',
          'Medication-related',
        ],
        cognitivePrompts: [
          'Re-examine patient for volume status',
          'Review fluid balance',
          'Discuss with senior resident',
          'Consider nephrology consultation',
        ],
        timestamp: new Date(),
      });
    }
  }
  
  // Rule 5: Multiple severe abnormalities (sepsis pattern)
  const latestVitals = patient.vitals[patient.vitals.length - 1];
  const latestLabs = patient.labs[patient.labs.length - 1];
  
  let severeAbnormalities = 0;
  const severeFindings: string[] = [];
  
  if (latestVitals.heartRate > 110) {
    severeAbnormalities++;
    severeFindings.push(`Severe tachycardia (${latestVitals.heartRate} bpm)`);
  }
  if (latestVitals.temperature >= 38.5) {
    severeAbnormalities++;
    severeFindings.push(`High fever (${latestVitals.temperature.toFixed(1)}°C)`);
  }
  if (latestLabs.wbc > 15) {
    severeAbnormalities++;
    severeFindings.push(`Significantly elevated WBC (${latestLabs.wbc.toFixed(1)})`);
  }
  if (latestLabs.lactate && latestLabs.lactate > 2.5) {
    severeAbnormalities++;
    severeFindings.push(`Elevated lactate (${latestLabs.lactate.toFixed(1)})`);
  }
  
  if (severeAbnormalities >= 3) {
    alerts.push({
      id: `alert-${patient.id}-5`,
      patientId: patient.id,
      severity: 'red',
      title: 'Consider Reassessment and Escalation',
      description: 'Multiple concerning trends detected',
      triggeredBy: severeFindings,
      considerations: [
        'Sepsis',
        'Severe infection',
        'Anastomotic leak',
        'Intra-abdominal abscess',
      ],
      cognitivePrompts: [
        'URGENT: Re-examine patient immediately',
        'Consider ICU consultation',
        'Discuss with attending surgeon NOW',
        'Initiate sepsis protocol if indicated',
      ],
      timestamp: new Date(),
    });
  }
  
  return alerts;
}

export function calculateTrends(patient: Patient): TrendData[] {
  console.log('Calculating trends for patient:', patient.name);
  
  const trends: TrendData[] = [];
  
  // Heart Rate trend
  if (patient.vitals.length >= 2) {
    const hrValues = patient.vitals.map(v => v.heartRate);
    const hrTimestamps = patient.vitals.map(v => v.timestamp);
    trends.push({
      label: 'Heart Rate',
      values: hrValues,
      timestamps: hrTimestamps,
      trend: determineTrend(hrValues),
      concerning: hrValues[hrValues.length - 1] > 100 || determineTrend(hrValues) === 'rising',
    });
  }
  
  // Blood Pressure trend
  if (patient.vitals.length >= 2) {
    const bpValues = patient.vitals.map(v => v.systolicBP);
    const bpTimestamps = patient.vitals.map(v => v.timestamp);
    trends.push({
      label: 'Systolic BP',
      values: bpValues,
      timestamps: bpTimestamps,
      trend: determineTrend(bpValues),
      concerning: bpValues[bpValues.length - 1] < 100 || determineTrend(bpValues) === 'falling',
    });
  }
  
  // Temperature trend
  if (patient.vitals.length >= 2) {
    const tempValues = patient.vitals.map(v => v.temperature);
    const tempTimestamps = patient.vitals.map(v => v.timestamp);
    trends.push({
      label: 'Temperature',
      values: tempValues,
      timestamps: tempTimestamps,
      trend: determineTrend(tempValues),
      concerning: tempValues[tempValues.length - 1] >= 38.0,
    });
  }
  
  // Urine Output trend
  if (patient.vitals.length >= 2 && patient.vitals.every(v => v.urineOutput !== undefined)) {
    const uoValues = patient.vitals.map(v => v.urineOutput!);
    const uoTimestamps = patient.vitals.map(v => v.timestamp);
    trends.push({
      label: 'Urine Output',
      values: uoValues,
      timestamps: uoTimestamps,
      trend: determineTrend(uoValues),
      concerning: uoValues[uoValues.length - 1] < 30 || determineTrend(uoValues) === 'falling',
    });
  }
  
  // WBC trend
  if (patient.labs.length >= 2) {
    const wbcValues = patient.labs.map(l => l.wbc);
    const wbcTimestamps = patient.labs.map(l => l.timestamp);
    trends.push({
      label: 'WBC',
      values: wbcValues,
      timestamps: wbcTimestamps,
      trend: determineTrend(wbcValues),
      concerning: wbcValues[wbcValues.length - 1] > 12 || determineTrend(wbcValues) === 'rising',
    });
  }
  
  // Hemoglobin trend
  if (patient.labs.length >= 2) {
    const hgbValues = patient.labs.map(l => l.hemoglobin);
    const hgbTimestamps = patient.labs.map(l => l.timestamp);
    trends.push({
      label: 'Hemoglobin',
      values: hgbValues,
      timestamps: hgbTimestamps,
      trend: determineTrend(hgbValues),
      concerning: hgbValues[hgbValues.length - 1] < 10 || determineTrend(hgbValues) === 'falling',
    });
  }
  
  // Creatinine trend
  if (patient.labs.length >= 2) {
    const creatValues = patient.labs.map(l => l.creatinine);
    const creatTimestamps = patient.labs.map(l => l.timestamp);
    trends.push({
      label: 'Creatinine',
      values: creatValues,
      timestamps: creatTimestamps,
      trend: determineTrend(creatValues),
      concerning: creatValues[creatValues.length - 1] > 1.2 || determineTrend(creatValues) === 'rising',
    });
  }
  
  // Lactate trend
  if (patient.labs.length >= 2 && patient.labs.every(l => l.lactate !== undefined)) {
    const lactateValues = patient.labs.map(l => l.lactate!);
    const lactateTimestamps = patient.labs.map(l => l.timestamp);
    trends.push({
      label: 'Lactate',
      values: lactateValues,
      timestamps: lactateTimestamps,
      trend: determineTrend(lactateValues),
      concerning: lactateValues[lactateValues.length - 1] > 2.0 || determineTrend(lactateValues) === 'rising',
    });
  }
  
  return trends;
}

function determineTrend(values: number[]): 'rising' | 'falling' | 'stable' {
  if (values.length < 2) return 'stable';
  
  const first = values[0];
  const last = values[values.length - 1];
  const change = last - first;
  const percentChange = Math.abs(change / first) * 100;
  
  if (percentChange < 5) return 'stable';
  if (change > 0) return 'rising';
  return 'falling';
}
