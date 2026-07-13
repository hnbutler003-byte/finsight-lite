CREATE TABLE "ready_to_bank" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"territory" text NOT NULL,
	"achieved_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "ready_to_bank_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
ALTER TABLE "ready_to_bank" ADD CONSTRAINT "ready_to_bank_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;