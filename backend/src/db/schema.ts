import {
  pgTable,
  text,
  timestamp,
  uuid,
  integer,
  decimal,
  index,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { user } from './auth-schema.js';

// User profiles - extended profile information
export const userProfiles = pgTable(
  'user_profiles',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: text('user_id').notNull().unique().references(() => user.id, { onDelete: 'cascade' }),
    fullName: text('full_name').notNull(),
    pronouns: text('pronouns'),
    role: text('role', {
      enum: ['medical_student', 'resident', 'fellow', 'staff_physician'],
    }).notNull(),
    roleYear: integer('role_year'), // 1-4 for students, year for residents
    residencyProgram: text('residency_program'), // Only for residents
    affiliation: text('affiliation'), // Hospital or university
    profilePicture: text('profile_picture'), // Storage key
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index('user_profiles_user_id_idx').on(table.userId),
  ]
);

// Patients - each user's patient records
export const patients = pgTable(
  'patients',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    idStatement: text('id_statement'), // 1-2 line medical history summary
    procedureType: text('procedure_type').notNull(),
    postOpDay: integer('post_op_day').notNull(),
    alertStatus: text('alert_status', {
      enum: ['green', 'yellow', 'red'],
    }).notNull().default('green'),
    preOpDiagnosis: text('pre_op_diagnosis'),
    postOpDiagnosis: text('post_op_diagnosis'),
    specimensTaken: text('specimens_taken'),
    estimatedBloodLoss: text('estimated_blood_loss'),
    complications: text('complications'),
    operationDateTime: timestamp('operation_date_time'),
    surgeon: text('surgeon'),
    anesthesiologist: text('anesthesiologist'),
    anesthesiaType: text('anesthesia_type'),
    clinicalStatus: text('clinical_status'),
    hospitalLocation: text('hospital_location'),
    notes: text('notes'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index('patients_user_id_idx').on(table.userId),
    index('patients_created_at_idx').on(table.createdAt),
  ]
);

// Vital signs - tracked over time
export const vitalSigns = pgTable(
  'vital_signs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    patientId: uuid('patient_id').notNull().references(() => patients.id, { onDelete: 'cascade' }),
    heartRate: integer('heart_rate'),
    systolicBP: integer('systolic_bp'),
    diastolicBP: integer('diastolic_bp'),
    temperature: decimal('temperature', { precision: 5, scale: 2 }),
    urineOutput: text('urine_output'),
    timestamp: timestamp('timestamp').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    index('vital_signs_patient_id_idx').on(table.patientId),
    index('vital_signs_timestamp_idx').on(table.timestamp),
  ]
);

// Lab values - tracked over time
export const labValues = pgTable(
  'lab_values',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    patientId: uuid('patient_id').notNull().references(() => patients.id, { onDelete: 'cascade' }),
    wbc: decimal('wbc', { precision: 8, scale: 2 }),
    hemoglobin: decimal('hemoglobin', { precision: 8, scale: 2 }),
    creatinine: decimal('creatinine', { precision: 8, scale: 2 }),
    lactate: decimal('lactate', { precision: 8, scale: 2 }),
    timestamp: timestamp('timestamp').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    index('lab_values_patient_id_idx').on(table.patientId),
    index('lab_values_timestamp_idx').on(table.timestamp),
  ]
);

// Relations
export const userProfilesRelations = relations(userProfiles, ({ many }) => ({
  patients: many(patients),
}));

export const patientsRelations = relations(patients, ({ one, many }) => ({
  userProfile: one(userProfiles, {
    fields: [patients.userId],
    references: [userProfiles.userId],
  }),
  vitalSigns: many(vitalSigns),
  labValues: many(labValues),
}));

export const vitalSignsRelations = relations(vitalSigns, ({ one }) => ({
  patient: one(patients, {
    fields: [vitalSigns.patientId],
    references: [patients.id],
  }),
}));

export const labValuesRelations = relations(labValues, ({ one }) => ({
  patient: one(patients, {
    fields: [labValues.patientId],
    references: [patients.id],
  }),
}));
