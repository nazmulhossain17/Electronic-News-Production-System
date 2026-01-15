// ============================================================================
// File: app/api/rows/[id]/route.ts
// Description: Single row API endpoints
// ============================================================================

import { NextRequest } from "next/server"
import { eq } from "drizzle-orm"
import { requireAuth, requireRole, canEditRow } from "@/lib/auth"
import {
  successResponse,
  serverErrorResponse,
  notFoundResponse,
  validationErrorResponse,
  forbiddenResponse,
} from "@/lib/api-response"
import { z } from "zod"
import db from "@/db"
import { rundownRows, bulletins, user, categories } from "@/db/schema"
import { recalculateRundownTiming, logActivity } from "@/lib/rundown-service"

const updateRowSchema = z.object({
  slug: z.string().max(255).optional(),
  segment: z.string().max(50).nullable().optional(),
  storyProducerId: z.string().uuid().nullable().optional(),
  reporterId: z.string().uuid().nullable().optional(),
  estDurationSecs: z.number().int().min(0).optional(),
  actualDurationSecs: z.number().int().min(0).nullable().optional(),
  float: z.boolean().optional(),
  status: z.enum(["BLANK", "DRAFT", "READY", "APPROVED", "KILLED", "AIRED"]).optional(),
  script: z.string().max(50000).nullable().optional(),
  notes: z.string().max(5000).nullable().optional(),
  categoryId: z.string().uuid().nullable().optional(),
  mosObjSlug: z.string().max(255).nullable().optional(),
  mosObjectTime: z.string().max(50).nullable().optional(),
  mosStatus: z.string().max(50).nullable().optional(),
  mosUserDuration: z.string().max(50).nullable().optional(),
  mosId: z.string().max(255).nullable().optional(),
})

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * GET /api/rows/[id]
 * Get a single row
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const authResult = await requireAuth(request)
    if ("error" in authResult) return authResult.error

    const { id } = await params

    const [row] = await db
      .select({
        id: rundownRows.id,
        bulletinId: rundownRows.bulletinId,
        pageCode: rundownRows.pageCode,
        blockCode: rundownRows.blockCode,
        pageNumber: rundownRows.pageNumber,
        sortOrder: rundownRows.sortOrder,
        rowType: rundownRows.rowType,
        slug: rundownRows.slug,
        segment: rundownRows.segment,
        storyProducerId: rundownRows.storyProducerId,
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
        approvedBy: rundownRows.approvedBy,
        approvedAt: rundownRows.approvedAt,
        script: rundownRows.script,
        notes: rundownRows.notes,
        mosId: rundownRows.mosId,
        mosObjSlug: rundownRows.mosObjSlug,
        mosObjectTime: rundownRows.mosObjectTime,
        mosStatus: rundownRows.mosStatus,
        mosUserDuration: rundownRows.mosUserDuration,
        lastModifiedBy: rundownRows.lastModifiedBy,
        createdAt: rundownRows.createdAt,
        updatedAt: rundownRows.updatedAt,
      })
      .from(rundownRows)
      .leftJoin(user, eq(rundownRows.reporterId, user.id))
      .leftJoin(categories, eq(rundownRows.categoryId, categories.id))
      .where(eq(rundownRows.id, id))
      .limit(1)

    if (!row) {
      return notFoundResponse("Row")
    }

    return successResponse({ row })
  } catch (error) {
    return serverErrorResponse(error)
  }
}

/**
 * PUT /api/rows/[id]
 * Update a row
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const authResult = await requireAuth(request)
    if ("error" in authResult) return authResult.error

    const { user: currentUser } = authResult
    const { id } = await params

    // Get existing row with bulletin info
    const [existing] = await db
      .select({
        id: rundownRows.id,
        bulletinId: rundownRows.bulletinId,
        reporterId: rundownRows.reporterId,
        createdBy: rundownRows.createdBy,
        status: rundownRows.status,
        isLocked: bulletins.isLocked,
        lockedBy: bulletins.lockedBy,
      })
      .from(rundownRows)
      .innerJoin(bulletins, eq(rundownRows.bulletinId, bulletins.id))
      .where(eq(rundownRows.id, id))
      .limit(1)

    if (!existing) {
      return notFoundResponse("Row")
    }

    // Check if bulletin is locked
    if (existing.isLocked && existing.lockedBy !== currentUser.id) {
      return forbiddenResponse("Bulletin is locked")
    }

    // Check edit permission
    const canEdit = canEditRow(currentUser, {
      reporterId: existing.reporterId,
      createdBy: existing.createdBy,
      status: existing.status,
    })

    if (!canEdit) {
      return forbiddenResponse("You don't have permission to edit this row")
    }

    const body = await request.json()
    const validation = updateRowSchema.safeParse(body)

    if (!validation.success) {
      return validationErrorResponse(validation.error)
    }

    const data = validation.data
    const updateData: Record<string, unknown> = {
      lastModifiedBy: currentUser.id,
    }

    // Build update object
    if (data.slug !== undefined) updateData.slug = data.slug
    if (data.segment !== undefined) updateData.segment = data.segment
    if (data.storyProducerId !== undefined) updateData.storyProducerId = data.storyProducerId
    if (data.reporterId !== undefined) updateData.reporterId = data.reporterId
    if (data.estDurationSecs !== undefined) updateData.estDurationSecs = data.estDurationSecs
    if (data.actualDurationSecs !== undefined) updateData.actualDurationSecs = data.actualDurationSecs
    if (data.float !== undefined) updateData.float = data.float
    if (data.status !== undefined) updateData.status = data.status
    if (data.script !== undefined) updateData.script = data.script
    if (data.notes !== undefined) updateData.notes = data.notes
    if (data.categoryId !== undefined) updateData.categoryId = data.categoryId
    if (data.mosObjSlug !== undefined) updateData.mosObjSlug = data.mosObjSlug
    if (data.mosObjectTime !== undefined) updateData.mosObjectTime = data.mosObjectTime
    if (data.mosStatus !== undefined) updateData.mosStatus = data.mosStatus
    if (data.mosUserDuration !== undefined) updateData.mosUserDuration = data.mosUserDuration
    if (data.mosId !== undefined) updateData.mosId = data.mosId

    const [updated] = await db
      .update(rundownRows)
      .set(updateData)
      .where(eq(rundownRows.id, id))
      .returning()

    // Recalculate timing if duration changed
    if (data.estDurationSecs !== undefined || data.actualDurationSecs !== undefined) {
      await recalculateRundownTiming(existing.bulletinId)
    }

    // Log activity
    await logActivity(currentUser.id, "UPDATE", "ROW", id, {
      bulletinId: existing.bulletinId,
      rowId: id,
      description: `Updated row: ${updated.slug || id}`,
      newValue: data,
    })

    return successResponse(updated, "Row updated successfully")
  } catch (error) {
    return serverErrorResponse(error)
  }
}

/**
 * DELETE /api/rows/[id]
 * Delete a row
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const authResult = await requireRole(request, ["ADMIN", "PRODUCER", "EDITOR"])
    if ("error" in authResult) return authResult.error

    const { user: currentUser } = authResult
    const { id } = await params

    const [existing] = await db
      .select({
        id: rundownRows.id,
        bulletinId: rundownRows.bulletinId,
        slug: rundownRows.slug,
        isLocked: bulletins.isLocked,
      })
      .from(rundownRows)
      .innerJoin(bulletins, eq(rundownRows.bulletinId, bulletins.id))
      .where(eq(rundownRows.id, id))
      .limit(1)

    if (!existing) {
      return notFoundResponse("Row")
    }

    if (existing.isLocked) {
      return forbiddenResponse("Bulletin is locked")
    }

    await db.delete(rundownRows).where(eq(rundownRows.id, id))

    // Recalculate timing
    await recalculateRundownTiming(existing.bulletinId)

    // Log activity
    await logActivity(currentUser.id, "DELETE", "ROW", id, {
      bulletinId: existing.bulletinId,
      description: `Deleted row: ${existing.slug || id}`,
    })

    return successResponse({ deleted: true }, "Row deleted successfully")
  } catch (error) {
    return serverErrorResponse(error)
  }
}