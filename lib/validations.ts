// ============================================================================
// File: lib/validations.ts
// Description: Zod validation schemas for all API inputs
// ============================================================================

import { z } from "zod"

// ═══════════════════════════════════════════════════════════════════════════════
// COMMON SCHEMAS
// ═══════════════════════════════════════════════════════════════════════════════

export const uuidSchema = z.string().uuid()

export const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format (YYYY-MM-DD)")

export const timeSchema = z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/, "Invalid time format (HH:MM or HH:MM:SS)")

export const paginationSchema = z.object({
  limit: z.coerce.number().min(1).max(100).default(50),
  offset: z.coerce.number().min(0).default(0),
})

// ═══════════════════════════════════════════════════════════════════════════════
// BULLETIN SCHEMAS
// ═══════════════════════════════════════════════════════════════════════════════

export const bulletinStatusSchema = z.enum([
  "PLANNING",
  "ACTIVE",
  "LOCKED",
  "ON_AIR",
  "COMPLETED",
  "ARCHIVED",
])

export const createBulletinSchema = z.object({
  title: z.string().min(1).max(255),
  subtitle: z.string().max(255).optional(),
  code: z.string().max(50).optional(),
  airDate: dateSchema,
  startTime: timeSchema,
  endTime: timeSchema.optional(),
  plannedDurationSecs: z.number().int().positive().default(1800), // 30 minutes default
  producerId: uuidSchema.optional(),
  deskId: uuidSchema.optional(),
  notes: z.string().max(5000).optional(),
  generateTemplate: z.boolean().default(true),
})

export const updateBulletinSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  subtitle: z.string().max(255).nullable().optional(),
  code: z.string().max(50).nullable().optional(),
  airDate: dateSchema.optional(),
  startTime: timeSchema.optional(),
  endTime: timeSchema.nullable().optional(),
  plannedDurationSecs: z.number().int().positive().optional(),
  status: bulletinStatusSchema.optional(),
  producerId: uuidSchema.nullable().optional(),
  deskId: uuidSchema.nullable().optional(),
  notes: z.string().max(5000).nullable().optional(),
})

export const bulletinQuerySchema = z.object({
  date: dateSchema.optional(),
  startDate: dateSchema.optional(),
  endDate: dateSchema.optional(),
  status: bulletinStatusSchema.optional(),
  deskId: uuidSchema.optional(),
  limit: z.coerce.number().min(1).max(100).default(50),
  offset: z.coerce.number().min(0).default(0),
})

// ═══════════════════════════════════════════════════════════════════════════════
// RUNDOWN ROW SCHEMAS
// ═══════════════════════════════════════════════════════════════════════════════

export const rowTypeSchema = z.enum([
  "STORY",
  "COMMERCIAL",
  "BREAK_LINK",
  "OPEN",
  "CLOSE",
  "WELCOME",
])

export const rowStatusSchema = z.enum([
  "BLANK",
  "DRAFT",
  "READY",
  "APPROVED",
  "KILLED",
  "AIRED",
])

export const mosStatusSchema = z.enum([
  "PENDING",
  "READY",
  "PLAYING",
  "PLAYED",
  "ERROR",
])

export const createRowSchema = z.object({
  blockCode: z.string().min(1).max(10),
  rowType: rowTypeSchema.default("STORY"),
  slug: z.string().max(255).optional(),
  segment: z.string().max(50).optional(),
  estDurationSecs: z.number().int().min(0).default(0),
  reporterId: uuidSchema.nullable().optional(),
  storyProducerId: uuidSchema.nullable().optional(),
  categoryId: uuidSchema.nullable().optional(),
  insertAfter: uuidSchema.optional(),
  insertAtPosition: z.number().int().min(0).optional(),
  status: rowStatusSchema.default("BLANK"),
})

export const updateRowSchema = z.object({
  slug: z.string().max(255).optional(),
  segment: z.string().max(50).optional(),
  storyProducerId: uuidSchema.nullable().optional(),
  reporterId: uuidSchema.nullable().optional(),
  estDurationSecs: z.number().int().min(0).optional(),
  actualDurationSecs: z.number().int().min(0).nullable().optional(),
  float: z.boolean().optional(),
  status: rowStatusSchema.optional(),
  script: z.string().max(50000).nullable().optional(),
  notes: z.string().max(5000).nullable().optional(),
  categoryId: uuidSchema.nullable().optional(),
  mosObjSlug: z.string().max(255).nullable().optional(),
  mosObjectTime: z.string().max(50).nullable().optional(),
  mosStatus: mosStatusSchema.nullable().optional(),
  mosUserDuration: z.string().max(50).nullable().optional(),
  mosId: z.string().max(255).nullable().optional(),
})

export const reorderRowsSchema = z.object({
  rows: z.array(
    z.object({
      id: uuidSchema,
      sortOrder: z.number().int().min(0),
      pageCode: z.string().max(10).optional(),
      blockCode: z.string().max(10).optional(),
    })
  ).min(1),
})

export const approveRowSchema = z.object({
  approved: z.boolean(),
  reason: z.string().max(500).optional(),
})

// ═══════════════════════════════════════════════════════════════════════════════
// POOL SCHEMAS
// ═══════════════════════════════════════════════════════════════════════════════

export const poolTypeSchema = z.enum([
  "STORY_POOL",
  "FLOAT_POOL",
  "RESERVE_POOL",
])

export const createPoolSchema = z.object({
  name: z.string().min(1).max(100),
  code: z.string().min(1).max(20),
  type: poolTypeSchema.default("STORY_POOL"),
  description: z.string().max(500).optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).default("#3498db"),
  deskId: uuidSchema.optional(),
})

export const createPoolStorySchema = z.object({
  slug: z.string().min(1).max(255),
  segment: z.string().max(50).default("LIVE"),
  estDurationSecs: z.number().int().min(0).default(90),
  reporterId: uuidSchema.optional(),
  status: z.enum(["DRAFT", "READY"]).default("DRAFT"),
})

export const assignPoolStorySchema = z.object({
  bulletinId: uuidSchema,
  blockCode: z.string().min(1).max(10),
  insertAfter: uuidSchema.optional(),
  insertAtPosition: z.number().int().min(0).optional(),
})

// ═══════════════════════════════════════════════════════════════════════════════
// USER SCHEMAS
// ═══════════════════════════════════════════════════════════════════════════════

export const userRoleSchema = z.enum([
  "ADMIN",
  "PRODUCER",
  "EDITOR",
  "REPORTER",
])

export const updateUserSchema = z.object({
  displayName: z.string().max(50).nullable().optional(),
  phone: z.string().max(20).nullable().optional(),
})

export const adminUpdateUserSchema = z.object({
  displayName: z.string().max(50).nullable().optional(),
  phone: z.string().max(20).nullable().optional(),
  role: userRoleSchema.optional(),
  isActive: z.boolean().optional(),
  deskId: uuidSchema.nullable().optional(),
})

export const bulkUpdateUsersSchema = z.object({
  userIds: z.array(uuidSchema).min(1),
  action: z.enum(["activate", "deactivate", "setRole"]),
  role: userRoleSchema.optional(),
})

// ═══════════════════════════════════════════════════════════════════════════════
// DESK & CATEGORY SCHEMAS
// ═══════════════════════════════════════════════════════════════════════════════

export const createDeskSchema = z.object({
  name: z.string().min(1).max(100),
  code: z.string().min(1).max(20),
  description: z.string().max(500).optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).default("#3498db"),
})

export const createCategorySchema = z.object({
  name: z.string().min(1).max(100),
  code: z.string().min(1).max(20),
  description: z.string().max(500).optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).default("#3498db"),
  deskId: uuidSchema.optional(),
})

// ═══════════════════════════════════════════════════════════════════════════════
// ACTIVITY QUERY SCHEMA
// ═══════════════════════════════════════════════════════════════════════════════

export const activityQuerySchema = z.object({
  bulletinId: uuidSchema.optional(),
  rowId: uuidSchema.optional(),
  userId: uuidSchema.optional(),
  action: z.string().optional(),
  entityType: z.string().optional(),
  startDate: dateSchema.optional(),
  endDate: dateSchema.optional(),
  limit: z.coerce.number().min(1).max(500).default(100),
  offset: z.coerce.number().min(0).default(0),
})

// ═══════════════════════════════════════════════════════════════════════════════
// TYPE EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════

export type CreateBulletinInput = z.infer<typeof createBulletinSchema>
export type UpdateBulletinInput = z.infer<typeof updateBulletinSchema>
export type BulletinQuery = z.infer<typeof bulletinQuerySchema>

export type CreateRowInput = z.infer<typeof createRowSchema>
export type UpdateRowInput = z.infer<typeof updateRowSchema>
export type ReorderRowsInput = z.infer<typeof reorderRowsSchema>
export type ApproveRowInput = z.infer<typeof approveRowSchema>

export type CreatePoolInput = z.infer<typeof createPoolSchema>
export type CreatePoolStoryInput = z.infer<typeof createPoolStorySchema>
export type AssignPoolStoryInput = z.infer<typeof assignPoolStorySchema>

export type UpdateUserInput = z.infer<typeof updateUserSchema>
export type AdminUpdateUserInput = z.infer<typeof adminUpdateUserSchema>
export type BulkUpdateUsersInput = z.infer<typeof bulkUpdateUsersSchema>

export type CreateDeskInput = z.infer<typeof createDeskSchema>
export type CreateCategoryInput = z.infer<typeof createCategorySchema>

export type ActivityQuery = z.infer<typeof activityQuerySchema>