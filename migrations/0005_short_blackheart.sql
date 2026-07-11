ALTER TABLE "simulated_stocks" ADD COLUMN "is_admin_managed" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "simulated_stocks" ADD COLUMN "price_updated_at" timestamp;