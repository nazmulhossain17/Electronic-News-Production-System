CREATE TYPE "public"."bulletin_status" AS ENUM('PLANNING', 'ACTIVE', 'LOCKED', 'ON_AIR', 'COMPLETED', 'ARCHIVED');--> statement-breakpoint
CREATE TYPE "public"."pool_type" AS ENUM('STORY_POOL', 'FLOAT_POOL', 'RESERVE_POOL');--> statement-breakpoint
CREATE TYPE "public"."row_status" AS ENUM('BLANK', 'DRAFT', 'READY', 'APPROVED', 'KILLED', 'AIRED');--> statement-breakpoint
CREATE TYPE "public"."row_type" AS ENUM('STORY', 'COMMERCIAL', 'BREAK_LINK', 'OPEN', 'CLOSE', 'WELCOME');--> statement-breakpoint
CREATE TYPE "public"."segment_type" AS ENUM('LIVE', 'PKG', 'VO', 'VOSOT', 'SOT', 'READER', 'GRAPHIC', 'VT', 'IV', 'PHONER', 'WEATHER', 'SPORTS');--> statement-breakpoint
CREATE TYPE "public"."story_status" AS ENUM('DRAFT', 'READY', 'ASSIGNED', 'USED');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('ADMIN', 'PRODUCER', 'EDITOR', 'REPORTER');--> statement-breakpoint
CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp,
	"refresh_token_expires_at" timestamp,
	"scope" text,
	"password" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "activity_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"action" varchar(100) NOT NULL,
	"entity_type" varchar(50) NOT NULL,
	"entity_id" varchar(255),
	"bulletin_id" uuid,
	"row_id" uuid,
	"description" text,
	"old_value" text,
	"new_value" text,
	"ip_address" varchar(45),
	"user_agent" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "app_users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"display_name" varchar(50),
	"phone" varchar(20),
	"role" "user_role" DEFAULT 'REPORTER' NOT NULL,
	"desk_id" uuid,
	"is_active" boolean DEFAULT true NOT NULL,
	"last_active_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "app_users_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "bulletins" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" varchar(255) NOT NULL,
	"subtitle" varchar(255),
	"code" varchar(50),
	"air_date" timestamp NOT NULL,
	"start_time" varchar(10) NOT NULL,
	"end_time" varchar(10),
	"planned_duration_secs" integer DEFAULT 1800 NOT NULL,
	"total_est_duration_secs" integer DEFAULT 0,
	"total_actual_duration_secs" integer,
	"total_commercial_secs" integer DEFAULT 0,
	"timing_variance_secs" integer DEFAULT 0,
	"status" "bulletin_status" DEFAULT 'PLANNING' NOT NULL,
	"is_locked" boolean DEFAULT false NOT NULL,
	"locked_by" text,
	"locked_at" timestamp,
	"producer_id" text,
	"desk_id" uuid,
	"sort_order" integer DEFAULT 0,
	"notes" text,
	"created_by" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(100) NOT NULL,
	"code" varchar(20) NOT NULL,
	"description" text,
	"color" varchar(7) DEFAULT '#3498db',
	"desk_id" uuid,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "desks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(100) NOT NULL,
	"code" varchar(20) NOT NULL,
	"description" text,
	"color" varchar(7) DEFAULT '#3498db',
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "desks_name_unique" UNIQUE("name"),
	CONSTRAINT "desks_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "pool_stories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pool_id" uuid NOT NULL,
	"slug" varchar(255) NOT NULL,
	"segment" varchar(50) DEFAULT 'LIVE',
	"description" text,
	"est_duration_secs" integer DEFAULT 90 NOT NULL,
	"reporter_id" text,
	"category_id" uuid,
	"status" "story_status" DEFAULT 'DRAFT' NOT NULL,
	"used_in_bulletin_id" uuid,
	"used_at" timestamp,
	"created_by" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pools" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(100) NOT NULL,
	"code" varchar(20) NOT NULL,
	"type" "pool_type" DEFAULT 'STORY_POOL' NOT NULL,
	"description" text,
	"color" varchar(7) DEFAULT '#3498db',
	"desk_id" uuid,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "pools_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "row_segments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"row_id" uuid NOT NULL,
	"name" varchar(50) NOT NULL,
	"type" "segment_type" DEFAULT 'LIVE',
	"description" text DEFAULT '',
	"est_duration_secs" integer DEFAULT 0,
	"actual_duration_secs" integer,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rundown_rows" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"bulletin_id" uuid NOT NULL,
	"page_code" varchar(10),
	"block_code" varchar(5),
	"page_number" integer,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"row_type" "row_type" DEFAULT 'STORY' NOT NULL,
	"slug" varchar(255),
	"segment" varchar(50),
	"story_producer_id" text,
	"reporter_id" text,
	"category_id" uuid,
	"final_approval" boolean DEFAULT false,
	"approved_by" text,
	"approved_at" timestamp,
	"est_duration_secs" integer DEFAULT 90,
	"actual_duration_secs" integer,
	"front_time_secs" integer DEFAULT 0,
	"cume_time_secs" integer DEFAULT 0,
	"float" boolean DEFAULT false,
	"status" "row_status" DEFAULT 'BLANK' NOT NULL,
	"script" text,
	"notes" text,
	"last_modified_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_bulletin_id_bulletins_id_fk" FOREIGN KEY ("bulletin_id") REFERENCES "public"."bulletins"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_row_id_rundown_rows_id_fk" FOREIGN KEY ("row_id") REFERENCES "public"."rundown_rows"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app_users" ADD CONSTRAINT "app_users_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app_users" ADD CONSTRAINT "app_users_desk_id_desks_id_fk" FOREIGN KEY ("desk_id") REFERENCES "public"."desks"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bulletins" ADD CONSTRAINT "bulletins_locked_by_user_id_fk" FOREIGN KEY ("locked_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bulletins" ADD CONSTRAINT "bulletins_producer_id_user_id_fk" FOREIGN KEY ("producer_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bulletins" ADD CONSTRAINT "bulletins_desk_id_desks_id_fk" FOREIGN KEY ("desk_id") REFERENCES "public"."desks"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bulletins" ADD CONSTRAINT "bulletins_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "categories" ADD CONSTRAINT "categories_desk_id_desks_id_fk" FOREIGN KEY ("desk_id") REFERENCES "public"."desks"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pool_stories" ADD CONSTRAINT "pool_stories_pool_id_pools_id_fk" FOREIGN KEY ("pool_id") REFERENCES "public"."pools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pool_stories" ADD CONSTRAINT "pool_stories_reporter_id_user_id_fk" FOREIGN KEY ("reporter_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pool_stories" ADD CONSTRAINT "pool_stories_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pool_stories" ADD CONSTRAINT "pool_stories_used_in_bulletin_id_bulletins_id_fk" FOREIGN KEY ("used_in_bulletin_id") REFERENCES "public"."bulletins"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pool_stories" ADD CONSTRAINT "pool_stories_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pools" ADD CONSTRAINT "pools_desk_id_desks_id_fk" FOREIGN KEY ("desk_id") REFERENCES "public"."desks"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "row_segments" ADD CONSTRAINT "row_segments_row_id_rundown_rows_id_fk" FOREIGN KEY ("row_id") REFERENCES "public"."rundown_rows"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "row_segments" ADD CONSTRAINT "row_segments_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rundown_rows" ADD CONSTRAINT "rundown_rows_bulletin_id_bulletins_id_fk" FOREIGN KEY ("bulletin_id") REFERENCES "public"."bulletins"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rundown_rows" ADD CONSTRAINT "rundown_rows_story_producer_id_user_id_fk" FOREIGN KEY ("story_producer_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rundown_rows" ADD CONSTRAINT "rundown_rows_reporter_id_user_id_fk" FOREIGN KEY ("reporter_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rundown_rows" ADD CONSTRAINT "rundown_rows_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rundown_rows" ADD CONSTRAINT "rundown_rows_approved_by_user_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rundown_rows" ADD CONSTRAINT "rundown_rows_last_modified_by_user_id_fk" FOREIGN KEY ("last_modified_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "account_user_id_idx" ON "account" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "activity_logs_user_id_idx" ON "activity_logs" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "activity_logs_entity_idx" ON "activity_logs" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "activity_logs_bulletin_id_idx" ON "activity_logs" USING btree ("bulletin_id");--> statement-breakpoint
CREATE INDEX "activity_logs_created_at_idx" ON "activity_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "app_users_user_id_idx" ON "app_users" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "app_users_role_idx" ON "app_users" USING btree ("role");--> statement-breakpoint
CREATE INDEX "app_users_desk_id_idx" ON "app_users" USING btree ("desk_id");--> statement-breakpoint
CREATE INDEX "bulletins_air_date_idx" ON "bulletins" USING btree ("air_date");--> statement-breakpoint
CREATE INDEX "bulletins_status_idx" ON "bulletins" USING btree ("status");--> statement-breakpoint
CREATE INDEX "bulletins_producer_id_idx" ON "bulletins" USING btree ("producer_id");--> statement-breakpoint
CREATE INDEX "bulletins_desk_id_idx" ON "bulletins" USING btree ("desk_id");--> statement-breakpoint
CREATE INDEX "categories_code_idx" ON "categories" USING btree ("code");--> statement-breakpoint
CREATE INDEX "categories_desk_id_idx" ON "categories" USING btree ("desk_id");--> statement-breakpoint
CREATE INDEX "desks_code_idx" ON "desks" USING btree ("code");--> statement-breakpoint
CREATE INDEX "pool_stories_pool_id_idx" ON "pool_stories" USING btree ("pool_id");--> statement-breakpoint
CREATE INDEX "pool_stories_status_idx" ON "pool_stories" USING btree ("status");--> statement-breakpoint
CREATE INDEX "pool_stories_reporter_id_idx" ON "pool_stories" USING btree ("reporter_id");--> statement-breakpoint
CREATE INDEX "pools_code_idx" ON "pools" USING btree ("code");--> statement-breakpoint
CREATE INDEX "pools_desk_id_idx" ON "pools" USING btree ("desk_id");--> statement-breakpoint
CREATE INDEX "row_segments_row_id_idx" ON "row_segments" USING btree ("row_id");--> statement-breakpoint
CREATE INDEX "row_segments_sort_order_idx" ON "row_segments" USING btree ("sort_order");--> statement-breakpoint
CREATE INDEX "rundown_rows_bulletin_id_idx" ON "rundown_rows" USING btree ("bulletin_id");--> statement-breakpoint
CREATE INDEX "rundown_rows_sort_order_idx" ON "rundown_rows" USING btree ("sort_order");--> statement-breakpoint
CREATE INDEX "rundown_rows_status_idx" ON "rundown_rows" USING btree ("status");--> statement-breakpoint
CREATE INDEX "session_user_id_idx" ON "session" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "session_token_idx" ON "session" USING btree ("token");--> statement-breakpoint
CREATE INDEX "user_email_idx" ON "user" USING btree ("email");--> statement-breakpoint
CREATE INDEX "verification_identifier_idx" ON "verification" USING btree ("identifier");