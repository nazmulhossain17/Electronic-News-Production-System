// ============================================================================
// File: db/schema.ts
// Description: Database schema for ENPS (Electronic News Production System)
// ============================================================================

import {
  pgTable,
  pgEnum,
  varchar,
  text,
  timestamp,
  boolean,
  index,
  integer,
  uuid,
} from "drizzle-orm/pg-core"
import { relations, type InferSelectModel } from "drizzle-orm"

/* ═══════════════════════════════════════════════════════════════════════════════
   ENUMS
   ═══════════════════════════════════════════════════════════════════════════════ */

export const userRoleEnum = pgEnum("user_role", [
  "ADMIN",
  "PRODUCER",
  "EDITOR",
  "REPORTER",
])

export const bulletinStatusEnum = pgEnum("bulletin_status", [
  "PLANNING",
  "ACTIVE",
  "LOCKED",
  "ON_AIR",
  "COMPLETED",
  "ARCHIVED",
])

export const rowTypeEnum = pgEnum("row_type", [
  "STORY",
  "COMMERCIAL",
  "BREAK_LINK",
  "OPEN",
  "CLOSE",
  "WELCOME",
])

export const rowStatusEnum = pgEnum("row_status", [
  "BLANK",
  "DRAFT",
  "READY",
  "APPROVED",
  "KILLED",
  "AIRED",
])

export const segmentTypeEnum = pgEnum("segment_type", [
  "LIVE",
  "PKG",
  "VO",
  "VOSOT",
  "SOT",
  "READER",
  "GRAPHIC",
  "VT",
  "IV",
  "PHONER",
  "WEATHER",
  "SPORTS",
])

export const poolTypeEnum = pgEnum("pool_type", [
  "STORY_POOL",
  "FLOAT_POOL",
  "RESERVE_POOL",
])

export const storyStatusEnum = pgEnum("story_status", [
  "DRAFT",
  "READY",
  "ASSIGNED",
  "USED",
])

/* ═══════════════════════════════════════════════════════════════════════════════
   BETTER AUTH TABLES (Required - Do not modify structure)
   ═══════════════════════════════════════════════════════════════════════════════ */

export const user = pgTable(
  "user",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    email: text("email").notNull().unique(),
    emailVerified: boolean("email_verified").default(false).notNull(),
    image: text("image"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [index("user_email_idx").on(table.email)]
)

export const session = pgTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: timestamp("expires_at").notNull(),
    token: text("token").notNull().unique(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [
    index("session_user_id_idx").on(table.userId),
    index("session_token_idx").on(table.token),
  ]
)

export const account = pgTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at"),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
    scope: text("scope"),
    password: text("password"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [index("account_user_id_idx").on(table.userId)]
)

export const verification = pgTable(
  "verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [index("verification_identifier_idx").on(table.identifier)]
)

/* ═══════════════════════════════════════════════════════════════════════════════
   DESKS (News Desks/Departments)
   ═══════════════════════════════════════════════════════════════════════════════ */

export const desks = pgTable(
  "desks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: varchar("name", { length: 100 }).notNull().unique(),
    code: varchar("code", { length: 20 }).notNull().unique(),
    description: text("description"),
    color: varchar("color", { length: 7 }).default("#3498db"),
    isActive: boolean("is_active").default(true).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [index("desks_code_idx").on(table.code)]
)

/* ═══════════════════════════════════════════════════════════════════════════════
   APP USERS (Extended Profile)
   ═══════════════════════════════════════════════════════════════════════════════ */

export const appUsers = pgTable(
  "app_users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .references(() => user.id, { onDelete: "cascade" })
      .notNull()
      .unique(),

    // Profile
    displayName: varchar("display_name", { length: 50 }),
    phone: varchar("phone", { length: 20 }),

    // Role & Assignment
    role: userRoleEnum("role").notNull().default("REPORTER"),
    deskId: uuid("desk_id").references(() => desks.id),

    // Status
    isActive: boolean("is_active").default(true).notNull(),
    lastActiveAt: timestamp("last_active_at"),

    // Audit
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("app_users_user_id_idx").on(table.userId),
    index("app_users_role_idx").on(table.role),
    index("app_users_desk_id_idx").on(table.deskId),
  ]
)

/* ═══════════════════════════════════════════════════════════════════════════════
   CATEGORIES
   ═══════════════════════════════════════════════════════════════════════════════ */

export const categories = pgTable(
  "categories",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: varchar("name", { length: 100 }).notNull(),
    color: varchar("color", { length: 7 }).default("#3498db"),
    deskId: uuid("desk_id").references(() => desks.id),
    isActive: boolean("is_active").default(true).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("categories_name_idx").on(table.name),  // Changed from code to name
    index("categories_desk_id_idx").on(table.deskId),
  ]
)

/* ═══════════════════════════════════════════════════════════════════════════════
   BULLETINS (Rundowns/Shows)
   ═══════════════════════════════════════════════════════════════════════════════ */

export const bulletins = pgTable(
  "bulletins",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    // Basic Info
    title: varchar("title", { length: 255 }).notNull(),
    subtitle: varchar("subtitle", { length: 255 }),
    code: varchar("code", { length: 50 }),

    // Timing
    airDate: timestamp("air_date").notNull(),
    startTime: varchar("start_time", { length: 10 }).notNull(),
    endTime: varchar("end_time", { length: 10 }),
    plannedDurationSecs: integer("planned_duration_secs").notNull().default(1800),

    // Calculated Totals
    totalEstDurationSecs: integer("total_est_duration_secs").default(0),
    totalActualDurationSecs: integer("total_actual_duration_secs"),
    totalCommercialSecs: integer("total_commercial_secs").default(0),
    timingVarianceSecs: integer("timing_variance_secs").default(0),

    // Status
    status: bulletinStatusEnum("status").notNull().default("PLANNING"),
    isLocked: boolean("is_locked").default(false).notNull(),
    lockedBy: text("locked_by").references(() => user.id),
    lockedAt: timestamp("locked_at"),

    // Assignment
    producerId: text("producer_id").references(() => user.id),
    deskId: uuid("desk_id").references(() => desks.id),
    sortOrder: integer("sort_order").default(0),

    // Notes
    notes: text("notes"),

    // Audit
    createdBy: text("created_by")
      .references(() => user.id)
      .notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("bulletins_air_date_idx").on(table.airDate),
    index("bulletins_status_idx").on(table.status),
    index("bulletins_producer_id_idx").on(table.producerId),
    index("bulletins_desk_id_idx").on(table.deskId),
  ]
)

/* ═══════════════════════════════════════════════════════════════════════════════
   RUNDOWN ROWS (Stories/Items in a Bulletin)
   ═══════════════════════════════════════════════════════════════════════════════ */

export const rundownRows = pgTable(
  "rundown_rows",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    bulletinId: uuid("bulletin_id")
      .notNull()
      .references(() => bulletins.id, { onDelete: "cascade" }),

    // Page/Block
    pageCode: varchar("page_code", { length: 10 }),
    blockCode: varchar("block_code", { length: 5 }),
    pageNumber: integer("page_number"),
    sortOrder: integer("sort_order").notNull().default(0),

    // Type & Content
    rowType: rowTypeEnum("row_type").notNull().default("STORY"),
    slug: varchar("slug", { length: 255 }),
    segment: varchar("segment", { length: 50 }),

    // Assignment
    storyProducerId: text("story_producer_id").references(() => user.id),
    reporterId: text("reporter_id").references(() => user.id),
    categoryId: uuid("category_id").references(() => categories.id),

    // Approval
    finalApproval: boolean("final_approval").default(false),
    approvedBy: text("approved_by").references(() => user.id),
    approvedAt: timestamp("approved_at"),

    // Timing
    estDurationSecs: integer("est_duration_secs").default(90),
    actualDurationSecs: integer("actual_duration_secs"),
    frontTimeSecs: integer("front_time_secs").default(0),
    cumeTimeSecs: integer("cume_time_secs").default(0),

    // Flags
    float: boolean("float").default(false),

    // Status
    status: rowStatusEnum("status").notNull().default("BLANK"),

    // Content
    script: text("script"),
    notes: text("notes"),

    // Audit
    lastModifiedBy: text("last_modified_by").references(() => user.id),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("rundown_rows_bulletin_id_idx").on(table.bulletinId),
    index("rundown_rows_sort_order_idx").on(table.sortOrder),
    index("rundown_rows_status_idx").on(table.status),
  ]
)

/* ═══════════════════════════════════════════════════════════════════════════════
   ROW SEGMENTS (Multiple Segments per Story)
   ═══════════════════════════════════════════════════════════════════════════════ */

export const rowSegments = pgTable(
  "row_segments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    rowId: uuid("row_id")
      .references(() => rundownRows.id, { onDelete: "cascade" })
      .notNull(),

    // Segment Info
    name: varchar("name", { length: 50 }).notNull(),
    type: segmentTypeEnum("type").default("LIVE"),
    description: text("description").default(""), // Already text type - supports HTML

    // Timing
    estDurationSecs: integer("est_duration_secs").default(0),
    actualDurationSecs: integer("actual_duration_secs"),

    // Order
    sortOrder: integer("sort_order").notNull().default(0),

    // Audit
    createdBy: text("created_by").references(() => user.id),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("row_segments_row_id_idx").on(table.rowId),
    index("row_segments_sort_order_idx").on(table.sortOrder),
  ]
)
/* ═══════════════════════════════════════════════════════════════════════════════
   STORY POOLS
   ═══════════════════════════════════════════════════════════════════════════════ */

export const pools = pgTable(
  "pools",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: varchar("name", { length: 100 }).notNull(),
    code: varchar("code", { length: 20 }).notNull().unique(),
    type: poolTypeEnum("type").notNull().default("STORY_POOL"),
    description: text("description"),
    color: varchar("color", { length: 7 }).default("#3498db"),
    deskId: uuid("desk_id").references(() => desks.id),
    isActive: boolean("is_active").default(true).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("pools_code_idx").on(table.code),
    index("pools_desk_id_idx").on(table.deskId),
  ]
)

export const poolStories = pgTable(
  "pool_stories",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    poolId: uuid("pool_id")
      .references(() => pools.id, { onDelete: "cascade" })
      .notNull(),

    // Content
    slug: varchar("slug", { length: 255 }).notNull(),
    segment: varchar("segment", { length: 50 }).default("LIVE"),
    description: text("description"),

    // Timing
    estDurationSecs: integer("est_duration_secs").notNull().default(90),

    // Assignment
    reporterId: text("reporter_id").references(() => user.id),
    categoryId: uuid("category_id").references(() => categories.id),

    // Status
    status: storyStatusEnum("status").notNull().default("DRAFT"),

    // Used tracking
    usedInBulletinId: uuid("used_in_bulletin_id").references(() => bulletins.id),
    usedAt: timestamp("used_at"),

    // Audit
    createdBy: text("created_by")
      .references(() => user.id)
      .notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("pool_stories_pool_id_idx").on(table.poolId),
    index("pool_stories_status_idx").on(table.status),
    index("pool_stories_reporter_id_idx").on(table.reporterId),
  ]
)

/* ═══════════════════════════════════════════════════════════════════════════════
   ACTIVITY LOGS (Audit Trail)
   ═══════════════════════════════════════════════════════════════════════════════ */

export const activityLogs = pgTable(
  "activity_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    // Who
    userId: text("user_id")
      .references(() => user.id)
      .notNull(),

    // What
    action: varchar("action", { length: 100 }).notNull(),
    entityType: varchar("entity_type", { length: 50 }).notNull(),
    entityId: varchar("entity_id", { length: 255 }),

    // Context
    bulletinId: uuid("bulletin_id").references(() => bulletins.id),
    rowId: uuid("row_id").references(() => rundownRows.id),

    // Details
    description: text("description"),
    oldValue: text("old_value"),
    newValue: text("new_value"),

    // Request Info
    ipAddress: varchar("ip_address", { length: 45 }),
    userAgent: text("user_agent"),

    // Timestamp
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("activity_logs_user_id_idx").on(table.userId),
    index("activity_logs_entity_idx").on(table.entityType, table.entityId),
    index("activity_logs_bulletin_id_idx").on(table.bulletinId),
    index("activity_logs_created_at_idx").on(table.createdAt),
  ]
)

/* ═══════════════════════════════════════════════════════════════════════════════
   RELATIONS
   ═══════════════════════════════════════════════════════════════════════════════ */

// User Relations
export const userRelations = relations(user, ({ many, one }) => ({
  sessions: many(session),
  accounts: many(account),
  appUser: one(appUsers, {
    fields: [user.id],
    references: [appUsers.userId],
  }),
  producedBulletins: many(bulletins, { relationName: "producer" }),
  assignedRows: many(rundownRows, { relationName: "reporter" }),
  activities: many(activityLogs),
}))

export const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, {
    fields: [session.userId],
    references: [user.id],
  }),
}))

export const accountRelations = relations(account, ({ one }) => ({
  user: one(user, {
    fields: [account.userId],
    references: [user.id],
  }),
}))

// App Users Relations
export const appUsersRelations = relations(appUsers, ({ one }) => ({
  user: one(user, {
    fields: [appUsers.userId],
    references: [user.id],
  }),
  desk: one(desks, {
    fields: [appUsers.deskId],
    references: [desks.id],
  }),
}))

// Desks Relations
export const desksRelations = relations(desks, ({ many }) => ({
  users: many(appUsers),
  bulletins: many(bulletins),
  categories: many(categories),
  pools: many(pools),
}))

// Categories Relations
export const categoriesRelations = relations(categories, ({ one, many }) => ({
  desk: one(desks, {
    fields: [categories.deskId],
    references: [desks.id],
  }),
  rows: many(rundownRows),
  poolStories: many(poolStories),
}))

// Bulletins Relations
export const bulletinsRelations = relations(bulletins, ({ one, many }) => ({
  producer: one(user, {
    relationName: "producer",
    fields: [bulletins.producerId],
    references: [user.id],
  }),
  desk: one(desks, {
    fields: [bulletins.deskId],
    references: [desks.id],
  }),
  lockedByUser: one(user, {
    fields: [bulletins.lockedBy],
    references: [user.id],
  }),
  rows: many(rundownRows),
  activities: many(activityLogs),
}))

// Rundown Rows Relations
export const rundownRowsRelations = relations(rundownRows, ({ one, many }) => ({
  bulletin: one(bulletins, {
    fields: [rundownRows.bulletinId],
    references: [bulletins.id],
  }),
  segments: many(rowSegments),
  storyProducer: one(user, {
    relationName: "storyProducer",
    fields: [rundownRows.storyProducerId],
    references: [user.id],
  }),
  reporter: one(user, {
    relationName: "reporter",
    fields: [rundownRows.reporterId],
    references: [user.id],
  }),
  category: one(categories, {
    fields: [rundownRows.categoryId],
    references: [categories.id],
  }),
  approvedByUser: one(user, {
    relationName: "approver",
    fields: [rundownRows.approvedBy],
    references: [user.id],
  }),
  lastModifiedByUser: one(user, {
    relationName: "lastModifier",
    fields: [rundownRows.lastModifiedBy],
    references: [user.id],
  }),
}))

// Row Segments Relations
export const rowSegmentsRelations = relations(rowSegments, ({ one }) => ({
  row: one(rundownRows, {
    fields: [rowSegments.rowId],
    references: [rundownRows.id],
  }),
  createdByUser: one(user, {
    fields: [rowSegments.createdBy],
    references: [user.id],
  }),
}))

// Pools Relations
export const poolsRelations = relations(pools, ({ one, many }) => ({
  desk: one(desks, {
    fields: [pools.deskId],
    references: [desks.id],
  }),
  stories: many(poolStories),
}))

// Pool Stories Relations
export const poolStoriesRelations = relations(poolStories, ({ one }) => ({
  pool: one(pools, {
    fields: [poolStories.poolId],
    references: [pools.id],
  }),
  reporter: one(user, {
    fields: [poolStories.reporterId],
    references: [user.id],
  }),
  category: one(categories, {
    fields: [poolStories.categoryId],
    references: [categories.id],
  }),
  usedInBulletin: one(bulletins, {
    fields: [poolStories.usedInBulletinId],
    references: [bulletins.id],
  }),
}))

// Activity Logs Relations
export const activityLogsRelations = relations(activityLogs, ({ one }) => ({
  user: one(user, {
    fields: [activityLogs.userId],
    references: [user.id],
  }),
  bulletin: one(bulletins, {
    fields: [activityLogs.bulletinId],
    references: [bulletins.id],
  }),
  row: one(rundownRows, {
    fields: [activityLogs.rowId],
    references: [rundownRows.id],
  }),
}))

/* ═══════════════════════════════════════════════════════════════════════════════
   TYPE EXPORTS
   ═══════════════════════════════════════════════════════════════════════════════ */

// Better Auth Types
export type User = InferSelectModel<typeof user>
export type Session = InferSelectModel<typeof session>
export type Account = InferSelectModel<typeof account>
export type Verification = InferSelectModel<typeof verification>

// App Types
export type AppUser = InferSelectModel<typeof appUsers>
export type NewAppUser = typeof appUsers.$inferInsert

export type Desk = InferSelectModel<typeof desks>
export type NewDesk = typeof desks.$inferInsert

export type Category = InferSelectModel<typeof categories>
export type NewCategory = typeof categories.$inferInsert

export type Bulletin = InferSelectModel<typeof bulletins>
export type NewBulletin = typeof bulletins.$inferInsert

export type RundownRow = InferSelectModel<typeof rundownRows>
export type NewRundownRow = typeof rundownRows.$inferInsert

export type RowSegment = InferSelectModel<typeof rowSegments>
export type NewRowSegment = typeof rowSegments.$inferInsert

export type Pool = InferSelectModel<typeof pools>
export type NewPool = typeof pools.$inferInsert

export type PoolStory = InferSelectModel<typeof poolStories>
export type NewPoolStory = typeof poolStories.$inferInsert

export type ActivityLog = InferSelectModel<typeof activityLogs>
export type NewActivityLog = typeof activityLogs.$inferInsert