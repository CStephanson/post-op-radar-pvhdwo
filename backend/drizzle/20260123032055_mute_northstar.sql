ALTER TABLE "patients" ADD COLUMN "status_mode" text DEFAULT 'auto' NOT NULL;--> statement-breakpoint
ALTER TABLE "patients" ADD COLUMN "manual_status" text;--> statement-breakpoint
ALTER TABLE "patients" ADD COLUMN "computed_status" text;