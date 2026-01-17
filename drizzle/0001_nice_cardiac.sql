ALTER TABLE "rundown_rows" DROP CONSTRAINT "rundown_rows_created_by_user_id_fk";
--> statement-breakpoint
DROP INDEX "rundown_rows_reporter_id_idx";--> statement-breakpoint
DROP INDEX "rundown_rows_block_code_idx";--> statement-breakpoint
ALTER TABLE "rundown_rows" ALTER COLUMN "page_code" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "rundown_rows" ALTER COLUMN "block_code" SET DATA TYPE varchar(5);--> statement-breakpoint
ALTER TABLE "rundown_rows" ALTER COLUMN "block_code" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "rundown_rows" ALTER COLUMN "page_number" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "rundown_rows" ALTER COLUMN "page_number" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "rundown_rows" ALTER COLUMN "slug" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "rundown_rows" ALTER COLUMN "slug" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "rundown_rows" ALTER COLUMN "final_approval" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "rundown_rows" ALTER COLUMN "est_duration_secs" SET DEFAULT 90;--> statement-breakpoint
ALTER TABLE "rundown_rows" ALTER COLUMN "est_duration_secs" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "rundown_rows" ALTER COLUMN "front_time_secs" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "rundown_rows" ALTER COLUMN "cume_time_secs" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "rundown_rows" ALTER COLUMN "float" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "rundown_rows" ALTER COLUMN "last_modified_by" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "rundown_rows" DROP COLUMN "mos_id";--> statement-breakpoint
ALTER TABLE "rundown_rows" DROP COLUMN "mos_obj_slug";--> statement-breakpoint
ALTER TABLE "rundown_rows" DROP COLUMN "mos_object_time";--> statement-breakpoint
ALTER TABLE "rundown_rows" DROP COLUMN "mos_status";--> statement-breakpoint
ALTER TABLE "rundown_rows" DROP COLUMN "mos_user_duration";--> statement-breakpoint
ALTER TABLE "rundown_rows" DROP COLUMN "break_number";--> statement-breakpoint
ALTER TABLE "rundown_rows" DROP COLUMN "source_pool_story_id";--> statement-breakpoint
ALTER TABLE "rundown_rows" DROP COLUMN "created_by";