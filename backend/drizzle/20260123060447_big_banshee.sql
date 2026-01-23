ALTER TABLE "user_profiles" ADD COLUMN "last_opened_patient_id" uuid;--> statement-breakpoint
ALTER TABLE "user_profiles" ADD COLUMN "last_opened_at" timestamp;--> statement-breakpoint
ALTER TABLE "user_profiles" ADD CONSTRAINT "user_profiles_last_opened_patient_id_patients_id_fk" FOREIGN KEY ("last_opened_patient_id") REFERENCES "public"."patients"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "user_profiles_last_opened_patient_id_idx" ON "user_profiles" USING btree ("last_opened_patient_id");