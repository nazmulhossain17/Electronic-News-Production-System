// ============================================================================
// File: app/api/bulletins/[id]/route.ts
// Description: Single bulletin API endpoints
// ============================================================================

import { NextRequest } from "next/server"
import { eq, asc } from "drizzle-orm"
import { requireAuth, requireRole } from "@/lib/auth"
import {
  successResponse,
  serverErrorResponse,
  notFoundResponse,
  validationErrorResponse,
  forbiddenResponse,
} from "@/lib/api-response"
import { z } from "zod"
import db from "@/db"
import { bulletins, rundownRows, user, categories, desks } from "@/db/schema"
import { recalculateRundownTiming, logActivity } from "@/lib/rundown-service"

const updateBulletinSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  subtitle: z.string().max(255).nullable().optional(),
  code: z.string().max(50).nullable().optional(),
  airDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  startTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  endTime: z.string().regex(/^\d{2}:\d{2}$/).nullable().optional(),
  plannedDurationSecs: z.number().int().positive().optional(),
  status: z.enum(["PLANNING", "ACTIVE", "LOCKED", "ON_AIR", "COMPLETED", "ARCHIVED"]).optional(),
  producerId: z.string().uuid().nullable().optional(),
  deskId: z.string().uuid().nullable().optional(),
  notes: z.string().max(5000).nullable().optional(),
})

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * GET /api/bulletins/[id]
 * Get a single bulletin with its rows
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const authResult = await requireAuth(request)
    if ("error" in authResult) return authResult.error

    const { id } = await params

    // Get bulletin
    const [bulletin] = await db
      .select({
        id: bulletins.id,
        title: bulletins.title,
        subtitle: bulletins.subtitle,
        code: bulletins.code,
        airDate: bulletins.airDate,
        startTime: bulletins.startTime,
        endTime: bulletins.endTime,
        plannedDurationSecs: bulletins.plannedDurationSecs,
        totalEstDurationSecs: bulletins.totalEstDurationSecs,
        totalActualDurationSecs: bulletins.totalActualDurationSecs,
        totalCommercialSecs: bulletins.totalCommercialSecs,
        timingVarianceSecs: bulletins.timingVarianceSecs,
        status: bulletins.status,
        isLocked: bulletins.isLocked,
        lockedBy: bulletins.lockedBy,
        lockedAt: bulletins.lockedAt,
        producerId: bulletins.producerId,
        producerName: user.name,
        deskId: bulletins.deskId,
        deskName: desks.name,
        notes: bulletins.notes,
        createdAt: bulletins.createdAt,
        updatedAt: bulletins.updatedAt,
      })
      .from(bulletins)
      .leftJoin(user, eq(bulletins.producerId, user.id))
      .leftJoin(desks, eq(bulletins.deskId, desks.id))
      .where(eq(bulletins.id, id))
      .limit(1)

    if (!bulletin) {
      return notFoundResponse("Bulletin")
    }

    // Get rows with related data
    const rows = await db
      .select({
        id: rundownRows.id,
        pageCode: rundownRows.pageCode,
        blockCode: rundownRows.blockCode,
        pageNumber: rundownRows.pageNumber,
        sortOrder: rundownRows.sortOrder,
        rowType: rundownRows.rowType,
        slug: rundownRows.slug,
        segment: rundownRows.segment,
        reporterId: rundownRows.reporterId,
        reporterName: user.name,
        categoryId: rundownRows.categoryId,
        categoryName: categories.name,
        categoryColor: categories.color,
        estDurationSecs: rundownRows.estDurationSecs,
        actualDurationSecs: rundownRows.actualDurationSecs,
        frontTimeSecs: rundownRows.frontTimeSecs,
        cumeTimeSecs: rundownRows.cumeTimeSecs,
        float: rundownRows.float,
        status: rundownRows.status,
        finalApproval: rundownRows.finalApproval,
        notes: rundownRows.notes,
        mosId: rundownRows.mosId,
        mosObjSlug: rundownRows.mosObjSlug,
        mosStatus: rundownRows.mosStatus,
      })
      .from(rundownRows)
      .leftJoin(user, eq(rundownRows.reporterId, user.id))
      .leftJoin(categories, eq(rundownRows.categoryId, categories.id))
      .where(eq(rundownRows.bulletinId, id))
      .orderBy(asc(rundownRows.sortOrder))

    return successResponse({ bulletin, rows })
  } catch (error) {
    return serverErrorResponse(error)
  }
}

/**
 * PUT /api/bulletins/[id]
 * Update a bulletin
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const authResult = await requireRole(request, ["ADMIN", "PRODUCER"])
    if ("error" in authResult) return authResult.error

    const { user: currentUser } = authResult
    const { id } = await params

    // Check if bulletin exists and is not locked
    const [existing] = await db
      .select({
        id: bulletins.id,
        isLocked: bulletins.isLocked,
        lockedBy: bulletins.lockedBy,
      })
      .from(bulletins)
      .where(eq(bulletins.id, id))
      .limit(1)

    if (!existing) {
      return notFoundResponse("Bulletin")
    }

    if (existing.isLocked && existing.lockedBy !== currentUser.id) {
      return forbiddenResponse("Bulletin is locked by another user")
    }

    const body = await request.json()
    const validation = updateBulletinSchema.safeParse(body)

    if (!validation.success) {
      return validationErrorResponse(validation.error)
    }

    const data = validation.data
    const updateData: Record<string, unknown> = {}

    // Build update object with only provided fields
    if (data.title !== undefined) updateData.title = data.title
    if (data.subtitle !== undefined) updateData.subtitle = data.subtitle
    if (data.code !== undefined) updateData.code = data.code
    if (data.startTime !== undefined) updateData.startTime = data.startTime
    if (data.endTime !== undefined) updateData.endTime = data.endTime
    if (data.plannedDurationSecs !== undefined) updateData.plannedDurationSecs = data.plannedDurationSecs
    if (data.status !== undefined) updateData.status = data.status
    if (data.producerId !== undefined) updateData.producerId = data.producerId
    if (data.deskId !== undefined) updateData.deskId = data.deskId
    if (data.notes !== undefined) updateData.notes = data.notes

    // Handle airDate + startTime
    if (data.airDate && data.startTime) {
      updateData.airDate = new Date(`${data.airDate}T${data.startTime}:00`)
    } else if (data.airDate) {
      updateData.airDate = new Date(data.airDate)
    }

    const [updated] = await db
      .update(bulletins)
      .set(updateData)
      .where(eq(bulletins.id, id))
      .returning()

    // Recalculate timing if duration changed
    if (data.plannedDurationSecs !== undefined || data.startTime !== undefined) {
      await recalculateRundownTiming(id)
    }

    // Log activity
    await logActivity(currentUser.id, "UPDATE", "BULLETIN", id, {
      bulletinId: id,
      description: "Updated bulletin",
      newValue: data,
    })

    return successResponse(updated, "Bulletin updated successfully")
  } catch (error) {
    return serverErrorResponse(error)
  }
}

/**
 * DELETE /api/bulletins/[id]
 * Delete a bulletin
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const authResult = await requireRole(request, ["ADMIN"])
    if ("error" in authResult) return authResult.error

    const { user: currentUser } = authResult
    const { id } = await params

    const [existing] = await db
      .select({ id: bulletins.id, title: bulletins.title })
      .from(bulletins)
      .where(eq(bulletins.id, id))
      .limit(1)

    if (!existing) {
      return notFoundResponse("Bulletin")
    }

    // Delete bulletin (cascade will delete rows)
    await db.delete(bulletins).where(eq(bulletins.id, id))

    // Log activity
    await logActivity(currentUser.id, "DELETE", "BULLETIN", id, {
      description: `Deleted bulletin: ${existing.title}`,
    })

    return successResponse({ deleted: true }, "Bulletin deleted successfully")
  } catch (error) {
    return serverErrorResponse(error)
  }
}