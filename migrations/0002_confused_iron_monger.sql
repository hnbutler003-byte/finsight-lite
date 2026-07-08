ALTER TABLE "exam_papers" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "extracted_questions" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "exam_papers" CASCADE;--> statement-breakpoint
DROP TABLE "extracted_questions" CASCADE;--> statement-breakpoint
ALTER TABLE "game_sessions" DROP CONSTRAINT "game_sessions_paper_id_exam_papers_id_fk";
--> statement-breakpoint
ALTER TABLE "game_sessions" DROP COLUMN "paper_id";