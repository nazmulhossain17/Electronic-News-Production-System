// ============================================================================
// File: app/api/rows/[id]/approve/route.ts
// Description: Row approval API endpoint
// ============================================================================

import { NextRequest } from "next/server"
import { eq } from "drizzle-orm"
import { requireRole } from "@/lib/auth"
import {
  successResponse,
  serverErrorResponse,
  notFoundResponse,
  validationErrorResponse,
} from "@/lib/api-response"
import { z } from "zod"
import db from "@/db"
import { rundownRows } from "@/db/schema"
import { logActivity } from "@/lib/rundown-service"

const approveSchema = z.object({
  approved: z.boolean(),
  reason: z.string().max(500).optional(),
})

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * POST /api/rows/[id]/approve
 * Approve or unapprove a row
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
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
        finalApproval: rundownRows.finalApproval,
      })
      .from(rundownRows)
      .where(eq(rundownRows.id, id))
      .limit(1)

    if (!existing) {
      return notFoundResponse("Row")
    }

    const body = await request.json()
    const validation = approveSchema.safeParse(body)

    if (!validation.success) {
      return validationErrorResponse(validation.error)
    }

    const { approved, reason } = validation.data

    const [updated] = await db
      .update(rundownRows)
      .set({
        finalApproval: approved,
        approvedBy: approved ? currentUser.id : null,
        approvedAt: approved ? new Date() : null,
        status: approved ? "APPROVED" : "READY",
        lastModifiedBy: currentUser.id,
      })
      .where(eq(rundownRows.id, id))
      .returning()

    // Log activity
    await logActivity(currentUser.id, approved ? "APPROVE" : "UNAPPROVE", "ROW", id, {
      bulletinId: existing.bulletinId,
      rowId: id,
      description: `${approved ? "Approved" : "Unapproved"} row: ${existing.slug || id}${reason ? ` - ${reason}` : ""}`,
    })

    return successResponse(updated, approved ? "Row approved" : "Row approval removed")
  } catch (error) {
    return serverErrorResponse(error)
  }
}