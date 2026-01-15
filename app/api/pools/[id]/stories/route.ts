// ============================================================================
// File: app/api/pools/[id]/stories/route.ts
// Description: Pool stories API endpoints
// ============================================================================

import { NextRequest } from "next/server"
import { eq, asc, and, sql } from "drizzle-orm"
import { requireAuth, requireRole } from "@/lib/auth"
import {
  successResponse,
  createdResponse,
  serverErrorResponse,
  notFoundResponse,
  validationErrorResponse,
} from "@/lib/api-response"
import { z } from "zod"
import db from "@/db"
import { pools, poolStories, user, categories, rundownRows, bulletins } from "@/db/schema"
import { recalculateRundownTiming, logActivity, getNextSortOrder } from "@/lib/rundown-service"

const createPoolStorySchema = z.object({
  slug: z.string().min(1).max(255),
  segment: z.string().max(50).default("LIVE"),
  description: z.string().max(5000).optional(),
  estDurationSecs: z.number().int().min(0).default(90),
  reporterId: z.string().uuid().optional(),
  categoryId: z.string().uuid().optional(),
  status: z.enum(["DRAFT", "READY"]).default("DRAFT"),
})

const assignStorySchema = z.object({
  bulletinId: z.string().uuid(),
  blockCode: z.string().min(1).max(10),
  insertAfter: z.string().uuid().optional(),
})

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * GET /api/pools/[id]/stories
 * Get stories in a pool
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const authResult = await requireAuth(request)
    if ("error" in authResult) return authResult.error

    const { id } = await params

    // Check pool exists
    const [pool] = await db
      .select({ id: pools.id })
      .from(pools)
      .where(eq(pools.id, id))
      .limit(1)

    if (!pool) {
      return notFoundResponse("Pool")
    }

    const stories = await db
      .select({
        id: poolStories.id,
        slug: poolStories.slug,
        segment: poolStories.segment,
        description: poolStories.description,
        estDurationSecs: poolStories.estDurationSecs,
        reporterId: poolStories.reporterId,
        reporterName: user.name,
        categoryId: poolStories.categoryId,
        categoryName: categories.name,
        categoryColor: categories.color,
        status: poolStories.status,
        usedInBulletinId: poolStories.usedInBulletinId,
        usedAt: poolStories.usedAt,
        createdAt: poolStories.createdAt,
      })
      .from(poolStories)
      .leftJoin(user, eq(poolStories.reporterId, user.id))
      .leftJoin(categories, eq(poolStories.categoryId, categories.id))
      .where(eq(poolStories.poolId, id))
      .orderBy(asc(poolStories.createdAt))

    return successResponse({ stories })
  } catch (error) {
    return serverErrorResponse(error)
  }
}

/**
 * POST /api/pools/[id]/stories
 * Add a story to a pool
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const authResult = await requireRole(request, ["ADMIN", "PRODUCER", "EDITOR"])
    if ("error" in authResult) return authResult.error

    const { user: currentUser } = authResult
    const { id } = await params

    // Check pool exists
    const [pool] = await db
      .select({ id: pools.id })
      .from(pools)
      .where(eq(pools.id, id))
      .limit(1)

    if (!pool) {
      return notFoundResponse("Pool")
    }

    const body = await request.json()
    const validation = createPoolStorySchema.safeParse(body)

    if (!validation.success) {
      return validationErrorResponse(validation.error)
    }

    const data = validation.data

    const [newStory] = await db
      .insert(poolStories)
      .values({
        poolId: id,
        slug: data.slug,
        segment: data.segment,
        description: data.description,
        estDurationSecs: data.estDurationSecs,
        reporterId: data.reporterId,
        categoryId: data.categoryId,
        status: data.status,
        createdBy: currentUser.id,
      })
      .returning()

    return createdResponse(newStory, "Story added to pool")
  } catch (error) {
    return serverErrorResponse(error)
  }
}

interface StoryRouteParams {
  params: Promise<{ id: string; storyId: string }>
}

/**
 * POST /api/pools/[id]/stories/[storyId]/assign
 * Assign a pool story to a bulletin
 */
export async function assignStory(request: NextRequest, { params }: StoryRouteParams) {
  try {
    const authResult = await requireRole(request, ["ADMIN", "PRODUCER", "EDITOR"])
    if ("error" in authResult) return authResult.error

    const { user: currentUser } = authResult
    const { id, storyId } = await params

    // Get pool story
    const [story] = await db
      .select()
      .from(poolStories)
      .where(and(eq(poolStories.id, storyId), eq(poolStories.poolId, id)))
      .limit(1)

    if (!story) {
      return notFoundResponse("Pool story")
    }

    if (story.usedInBulletinId) {
      return validationErrorResponse("Story has already been used")
    }

    const body = await request.json()
    const validation = assignStorySchema.safeParse(body)

    if (!validation.success) {
      return validationErrorResponse(validation.error)
    }

    const data = validation.data

    // Check bulletin exists
    const [bulletin] = await db
      .select({ id: bulletins.id, isLocked: bulletins.isLocked })
      .from(bulletins)
      .where(eq(bulletins.id, data.bulletinId))
      .limit(1)

    if (!bulletin) {
      return notFoundResponse("Bulletin")
    }

    if (bulletin.isLocked) {
      return validationErrorResponse("Bulletin is locked")
    }

    // Get sort order
    let sortOrder: number
    if (data.insertAfter) {
      const [afterRow] = await db
        .select({ sortOrder: rundownRows.sortOrder })
        .from(rundownRows)
        .where(eq(rundownRows.id, data.insertAfter))
        .limit(1)

      if (afterRow) {
        sortOrder = afterRow.sortOrder + 1
        await db
          .update(rundownRows)
          .set({ sortOrder: sql`${rundownRows.sortOrder} + 1` })
          .where(eq(rundownRows.bulletinId, data.bulletinId))
      } else {
        sortOrder = await getNextSortOrder(data.bulletinId)
      }
    } else {
      sortOrder = await getNextSortOrder(data.bulletinId)
    }

    // Create rundown row
    const pageCode = `${data.blockCode}${sortOrder + 1}`

    const [newRow] = await db
      .insert(rundownRows)
      .values({
        bulletinId: data.bulletinId,
        pageCode,
        blockCode: data.blockCode,
        pageNumber: sortOrder + 1,
        sortOrder,
        rowType: "STORY",
        slug: story.slug,
        segment: story.segment,
        estDurationSecs: story.estDurationSecs,
        reporterId: story.reporterId,
        categoryId: story.categoryId,
        status: story.status === "READY" ? "READY" : "DRAFT",
        notes: story.description,
        sourcePoolStoryId: story.id,
        lastModifiedBy: currentUser.id,
        createdBy: currentUser.id,
      })
      .returning()

    // Mark pool story as used
    await db
      .update(poolStories)
      .set({
        status: "USED",
        usedInBulletinId: data.bulletinId,
        usedAt: new Date(),
      })
      .where(eq(poolStories.id, storyId))

    // Recalculate timing
    await recalculateRundownTiming(data.bulletinId)

    // Log activity
    await logActivity(currentUser.id, "ASSIGN_FROM_POOL", "ROW", newRow.id, {
      bulletinId: data.bulletinId,
      rowId: newRow.id,
      description: `Assigned pool story: ${story.slug}`,
    })

    return successResponse({ row: newRow }, "Story assigned to bulletin")
  } catch (error) {
    return serverErrorResponse(error)
  }
}