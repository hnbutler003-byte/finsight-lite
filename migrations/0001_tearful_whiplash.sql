CREATE TABLE "deletion_log" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"org_id" text,
	"deleted_by" text NOT NULL,
	"admin_actor_id" integer,
	"deleted_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "student_feedback" (
	"id" serial PRIMARY KEY NOT NULL,
	"student_id" varchar NOT NULL,
	"teacher_id" integer NOT NULL,
	"class_id" integer NOT NULL,
	"org_id" text,
	"message" text NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "simulated_stocks" ADD COLUMN "previous_price" numeric(10, 2);--> statement-breakpoint
ALTER TABLE "simulated_stocks" ADD COLUMN "price_change_pct" numeric(5, 2) DEFAULT '0';--> statement-breakpoint
ALTER TABLE "simulated_stocks" ADD COLUMN "last_price_update_date" text;--> statement-breakpoint
ALTER TABLE "student_feedback" ADD CONSTRAINT "student_feedback_student_id_users_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_feedback" ADD CONSTRAINT "student_feedback_teacher_id_teachers_id_fk" FOREIGN KEY ("teacher_id") REFERENCES "public"."teachers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_feedback" ADD CONSTRAINT "student_feedback_class_id_classes_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE no action ON UPDATE no action;