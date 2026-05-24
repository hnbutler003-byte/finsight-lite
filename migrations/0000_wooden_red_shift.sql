CREATE TABLE "ai_usage_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar,
	"org_id" text,
	"env_id" text,
	"kind" text NOT NULL,
	"model" text,
	"tokens_in" integer DEFAULT 0 NOT NULL,
	"tokens_out" integer DEFAULT 0 NOT NULL,
	"cached" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai_usage_purge_runs" (
	"id" serial PRIMARY KEY NOT NULL,
	"month_key" text NOT NULL,
	"ran_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "audit_log" (
	"id" serial PRIMARY KEY NOT NULL,
	"actor_type" text NOT NULL,
	"actor_id" text,
	"actor_email" text,
	"action" text NOT NULL,
	"target_type" text,
	"target_id" text,
	"org_id" text,
	"meta" jsonb DEFAULT '{}'::jsonb,
	"ip" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bill_reminders" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"name" text NOT NULL,
	"amount" numeric(10, 2) NOT NULL,
	"currency" text DEFAULT 'BSD' NOT NULL,
	"frequency" text DEFAULT 'monthly' NOT NULL,
	"next_due_date" timestamp NOT NULL,
	"category_id" integer,
	"is_auto_detected" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "budgets" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"category_id" integer NOT NULL,
	"amount" numeric(10, 2) NOT NULL,
	"period" text DEFAULT 'monthly' NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "categories" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"type" text NOT NULL,
	"icon" text,
	"color" text,
	"is_default" boolean DEFAULT false,
	"user_id" varchar
);
--> statement-breakpoint
CREATE TABLE "challenges" (
	"id" serial PRIMARY KEY NOT NULL,
	"class_id" integer NOT NULL,
	"teacher_id" integer NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"type" text DEFAULT 'quiz' NOT NULL,
	"start_date" timestamp NOT NULL,
	"end_date" timestamp NOT NULL,
	"target_value" numeric(12, 2),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "class_enrollments" (
	"id" serial PRIMARY KEY NOT NULL,
	"class_id" integer NOT NULL,
	"student_id" varchar NOT NULL,
	"joined_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "class_notifications" (
	"id" serial PRIMARY KEY NOT NULL,
	"class_id" integer NOT NULL,
	"teacher_id" integer NOT NULL,
	"title" text NOT NULL,
	"message" text NOT NULL,
	"type" text DEFAULT 'announcement' NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "classes" (
	"id" serial PRIMARY KEY NOT NULL,
	"teacher_id" integer NOT NULL,
	"name" text NOT NULL,
	"subject" text DEFAULT 'Financial Literacy' NOT NULL,
	"code" text NOT NULL,
	"sponsor_name" text,
	"env_id" text,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "classes_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "document_uploads" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"file_name" text NOT NULL,
	"file_type" text NOT NULL,
	"status" text DEFAULT 'processing' NOT NULL,
	"transactions_created" integer DEFAULT 0,
	"error_message" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "email_contacts" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_kind" text NOT NULL,
	"user_id" text NOT NULL,
	"email" text NOT NULL,
	"verified" boolean DEFAULT false NOT NULL,
	"weekly_digest" boolean DEFAULT true NOT NULL,
	"class_notifications" boolean DEFAULT true NOT NULL,
	"org_id" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "email_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_id" text,
	"user_kind" text,
	"user_id" text,
	"kind" text NOT NULL,
	"recipient" text NOT NULL,
	"subject" text,
	"status" text NOT NULL,
	"provider_id" text,
	"error" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "email_verification_tokens" (
	"id" serial PRIMARY KEY NOT NULL,
	"contact_id" integer NOT NULL,
	"token" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"used_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "email_verification_tokens_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "exam_papers" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"title" text NOT NULL,
	"subject" text NOT NULL,
	"file_name" text NOT NULL,
	"file_type" text NOT NULL,
	"status" text DEFAULT 'processing' NOT NULL,
	"question_count" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "extracted_questions" (
	"id" serial PRIMARY KEY NOT NULL,
	"paper_id" integer NOT NULL,
	"question_text" text NOT NULL,
	"options" text[] NOT NULL,
	"correct_answer" text NOT NULL,
	"subject" text,
	"difficulty" text DEFAULT 'medium',
	"order" integer DEFAULT 0
);
--> statement-breakpoint
CREATE TABLE "game_sessions" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"paper_id" integer,
	"mode" text NOT NULL,
	"score" integer NOT NULL,
	"total_questions" integer NOT NULL,
	"correct_answers" integer NOT NULL,
	"time_spent" integer,
	"xp_earned" integer DEFAULT 0,
	"completed_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "jobs" (
	"id" serial PRIMARY KEY NOT NULL,
	"kind" text NOT NULL,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"result" jsonb,
	"status" text DEFAULT 'queued' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"max_attempts" integer DEFAULT 3 NOT NULL,
	"last_error" text,
	"owner_id" varchar,
	"scheduled_at" timestamp DEFAULT now() NOT NULL,
	"started_at" timestamp,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "learning_modules" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"slug" text NOT NULL,
	"description" text NOT NULL,
	"content" text NOT NULL,
	"order" integer NOT NULL,
	"icon" text,
	CONSTRAINT "learning_modules_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "linked_cards" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"last_four" text NOT NULL,
	"bank_name" text NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "org_admins" (
	"id" serial PRIMARY KEY NOT NULL,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"email" text NOT NULL,
	"password_hash" text,
	"org_id" text NOT NULL,
	"env_id" text NOT NULL,
	"role" text DEFAULT 'admin' NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "org_admins_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "org_ai_quotas" (
	"org_id" text PRIMARY KEY NOT NULL,
	"guide_chat_per_user_daily" integer,
	"tutor_explain_per_user_daily" integer,
	"ai_insights_per_user_daily" integer,
	"guide_chat_per_org_daily" integer,
	"tutor_explain_per_org_daily" integer,
	"ai_insights_per_org_daily" integer,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "portfolio_holdings" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"stock_id" integer NOT NULL,
	"quantity" integer NOT NULL,
	"avg_purchase_price" numeric(10, 2) NOT NULL,
	"purchased_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "portfolio_transactions" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"stock_id" integer NOT NULL,
	"type" text NOT NULL,
	"quantity" integer NOT NULL,
	"price_per_unit" numeric(10, 2) NOT NULL,
	"currency" text DEFAULT 'BSD' NOT NULL,
	"executed_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "savings_goals" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"name" text NOT NULL,
	"target_amount" numeric(10, 2) NOT NULL,
	"current_amount" numeric(10, 2) DEFAULT '0' NOT NULL,
	"currency" text DEFAULT 'BSD' NOT NULL,
	"deadline" timestamp,
	"icon" text,
	"color" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "schools" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"country" text DEFAULT 'Bahamas' NOT NULL,
	"city" text,
	"website" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "simulated_stocks" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"ticker" text NOT NULL,
	"type" text NOT NULL,
	"description" text NOT NULL,
	"current_price" numeric(10, 2) NOT NULL,
	"currency" text DEFAULT 'BSD' NOT NULL,
	"issuer" text,
	"region" text,
	"risk_level" text DEFAULT 'medium' NOT NULL,
	"annual_return_pct" numeric(5, 2)
);
--> statement-breakpoint
CREATE TABLE "sponsors" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"type" text DEFAULT 'business' NOT NULL,
	"contact_name" text,
	"contact_email" text,
	"website" text,
	"country" text DEFAULT 'Bahamas',
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "teachers" (
	"id" serial PRIMARY KEY NOT NULL,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"email" text NOT NULL,
	"password_hash" text,
	"school_name" text NOT NULL,
	"is_verified" boolean DEFAULT false NOT NULL,
	"org_id" text,
	"env_id" text,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "teachers_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "transactions" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"amount" numeric(10, 2) NOT NULL,
	"type" text DEFAULT 'expense' NOT NULL,
	"currency" text DEFAULT 'BSD' NOT NULL,
	"category_id" integer,
	"date" timestamp NOT NULL,
	"description" text,
	"is_auto_synced" boolean DEFAULT false,
	"document_upload_id" integer,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "tutor_explanations" (
	"id" serial PRIMARY KEY NOT NULL,
	"question_hash" varchar(64) NOT NULL,
	"model_version" text NOT NULL,
	"explanation" text NOT NULL,
	"hits" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"last_used_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_badges" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"badge_id" text NOT NULL,
	"earned_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "user_learning_progress" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"module_id" integer NOT NULL,
	"completed" boolean DEFAULT false NOT NULL,
	"completed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "user_virtual_balance" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"balance" numeric(12, 2) DEFAULT '10000' NOT NULL,
	"currency" text DEFAULT 'BSD' NOT NULL,
	CONSTRAINT "user_virtual_balance_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "user_xp" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"total_xp" integer DEFAULT 0 NOT NULL,
	"level" integer DEFAULT 1 NOT NULL,
	"current_streak" integer DEFAULT 0 NOT NULL,
	"longest_streak" integer DEFAULT 0 NOT NULL,
	"last_played_at" timestamp,
	CONSTRAINT "user_xp_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "weekly_digest_runs" (
	"id" serial PRIMARY KEY NOT NULL,
	"week_start" text NOT NULL,
	"audience" text NOT NULL,
	"ran_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"sid" varchar PRIMARY KEY NOT NULL,
	"sess" jsonb NOT NULL,
	"expire" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"username" varchar NOT NULL,
	"email" varchar,
	"avatar" varchar NOT NULL,
	"first_name" varchar,
	"last_name" varchar,
	"profile_image_url" varchar,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "users_username_unique" UNIQUE("username")
);
--> statement-breakpoint
CREATE TABLE "conversations" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"conversation_id" integer NOT NULL,
	"role" text NOT NULL,
	"content" text NOT NULL,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
ALTER TABLE "bill_reminders" ADD CONSTRAINT "bill_reminders_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bill_reminders" ADD CONSTRAINT "bill_reminders_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "budgets" ADD CONSTRAINT "budgets_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "budgets" ADD CONSTRAINT "budgets_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "categories" ADD CONSTRAINT "categories_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "challenges" ADD CONSTRAINT "challenges_class_id_classes_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "challenges" ADD CONSTRAINT "challenges_teacher_id_teachers_id_fk" FOREIGN KEY ("teacher_id") REFERENCES "public"."teachers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "class_enrollments" ADD CONSTRAINT "class_enrollments_class_id_classes_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "class_enrollments" ADD CONSTRAINT "class_enrollments_student_id_users_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "class_notifications" ADD CONSTRAINT "class_notifications_class_id_classes_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "class_notifications" ADD CONSTRAINT "class_notifications_teacher_id_teachers_id_fk" FOREIGN KEY ("teacher_id") REFERENCES "public"."teachers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "classes" ADD CONSTRAINT "classes_teacher_id_teachers_id_fk" FOREIGN KEY ("teacher_id") REFERENCES "public"."teachers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_uploads" ADD CONSTRAINT "document_uploads_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_verification_tokens" ADD CONSTRAINT "email_verification_tokens_contact_id_email_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."email_contacts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exam_papers" ADD CONSTRAINT "exam_papers_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "extracted_questions" ADD CONSTRAINT "extracted_questions_paper_id_exam_papers_id_fk" FOREIGN KEY ("paper_id") REFERENCES "public"."exam_papers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_sessions" ADD CONSTRAINT "game_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_sessions" ADD CONSTRAINT "game_sessions_paper_id_exam_papers_id_fk" FOREIGN KEY ("paper_id") REFERENCES "public"."exam_papers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "linked_cards" ADD CONSTRAINT "linked_cards_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portfolio_holdings" ADD CONSTRAINT "portfolio_holdings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portfolio_holdings" ADD CONSTRAINT "portfolio_holdings_stock_id_simulated_stocks_id_fk" FOREIGN KEY ("stock_id") REFERENCES "public"."simulated_stocks"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portfolio_transactions" ADD CONSTRAINT "portfolio_transactions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portfolio_transactions" ADD CONSTRAINT "portfolio_transactions_stock_id_simulated_stocks_id_fk" FOREIGN KEY ("stock_id") REFERENCES "public"."simulated_stocks"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "savings_goals" ADD CONSTRAINT "savings_goals_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_document_upload_id_document_uploads_id_fk" FOREIGN KEY ("document_upload_id") REFERENCES "public"."document_uploads"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_badges" ADD CONSTRAINT "user_badges_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_learning_progress" ADD CONSTRAINT "user_learning_progress_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_learning_progress" ADD CONSTRAINT "user_learning_progress_module_id_learning_modules_id_fk" FOREIGN KEY ("module_id") REFERENCES "public"."learning_modules"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_virtual_balance" ADD CONSTRAINT "user_virtual_balance_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_xp" ADD CONSTRAINT "user_xp_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_ai_usage_user_kind_created" ON "ai_usage_events" USING btree ("user_id","kind","created_at");--> statement-breakpoint
CREATE INDEX "idx_ai_usage_org_kind_created" ON "ai_usage_events" USING btree ("org_id","kind","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "uniq_ai_usage_purge_month" ON "ai_usage_purge_runs" USING btree ("month_key");--> statement-breakpoint
CREATE INDEX "idx_audit_log_actor" ON "audit_log" USING btree ("actor_type","actor_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_audit_log_action" ON "audit_log" USING btree ("action","created_at");--> statement-breakpoint
CREATE INDEX "idx_audit_log_created" ON "audit_log" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_class_enrollments_class" ON "class_enrollments" USING btree ("class_id");--> statement-breakpoint
CREATE INDEX "idx_class_enrollments_student" ON "class_enrollments" USING btree ("student_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uniq_email_contacts_user" ON "email_contacts" USING btree ("user_kind","user_id");--> statement-breakpoint
CREATE INDEX "idx_email_contacts_org" ON "email_contacts" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "idx_email_events_org_created" ON "email_events" USING btree ("org_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_email_events_provider" ON "email_events" USING btree ("provider_id");--> statement-breakpoint
CREATE INDEX "idx_exam_papers_status_created" ON "exam_papers" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "idx_exam_papers_user" ON "exam_papers" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_game_sessions_user_completed" ON "game_sessions" USING btree ("user_id","completed_at");--> statement-breakpoint
CREATE INDEX "idx_game_sessions_completed" ON "game_sessions" USING btree ("completed_at");--> statement-breakpoint
CREATE INDEX "idx_jobs_status_scheduled" ON "jobs" USING btree ("status","scheduled_at");--> statement-breakpoint
CREATE INDEX "idx_jobs_owner_created" ON "jobs" USING btree ("owner_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_transactions_user_date" ON "transactions" USING btree ("user_id","date");--> statement-breakpoint
CREATE INDEX "idx_transactions_user_category" ON "transactions" USING btree ("user_id","category_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_tutor_explanations_hash_model" ON "tutor_explanations" USING btree ("question_hash","model_version");--> statement-breakpoint
CREATE INDEX "idx_user_badges_user" ON "user_badges" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uniq_weekly_digest_week_audience" ON "weekly_digest_runs" USING btree ("week_start","audience");--> statement-breakpoint
CREATE INDEX "IDX_session_expire" ON "sessions" USING btree ("expire");