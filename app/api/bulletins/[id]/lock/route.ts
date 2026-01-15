// ============================================================================
// File: app/api/bulletins/[id]/lock/route.ts
// Description: Bulletin lock/unlock API endpoints
// ============================================================================

import { NextRequest } from "next/server"
import { eq } from "drizzle-orm"
import { requireRole } from "@/lib/auth"
import {
  successResponse,
  serverErrorResponse,
  notFoundResponse,
  conflictResponse,
} from "@/lib/api-response"
import db from "@/db"
import { bulletins, user } from "@/db/schema"
import { logActivity } from "@/lib/rundown-service"

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * POST /api/bulletins/[id]/lock
 * Lock a bulletin
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const authResult = await requireRole(request, ["ADMIN", "PRODUCER"])
    if ("error" in authResult) return authResult.error

    const { user: currentUser } = authResult
    const { id } = await params

    const [bulletin] = await db
      .select({
        id: bulletins.id,
        isLocked: bulletins.isLocked,
        lockedBy: bulletins.lockedBy,
        lockedByName: user.name,
      })
      .from(bulletins)
      .leftJoin(user, eq(bulletins.lockedBy, user.id))
      .where(eq(bulletins.id, id))
      .limit(1)

    if (!bulletin) {
      return notFoundResponse("Bulletin")
    }

    if (bulletin.isLocked && bulletin.lockedBy !== currentUser.id) {
      return conflictResponse("Bulletin is already locked", {
        lockedBy: {
          id: bulletin.lockedBy,
          name: bulletin.lockedByName,
        },
      })
    }

    const [updated] = await db
      .update(bulletins)
      .set({
        isLocked: true,
        lockedBy: currentUser.id,
        lockedAt: new Date(),
      })
      .where(eq(bulletins.id, id))
      .returning()

    await logActivity(currentUser.id, "LOCK", "BULLETIN", id, {
      bulletinId: id,
      description: "Locked bulletin",
    })

    return successResponse(updated, "Bulletin locked successfully")
  } catch (error) {
    return serverErrorResponse(error)
  }
}

/**
 * DELETE /api/bulletins/[id]/lock
 * Unlock a bulletin
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const authResult = await requireRole(request, ["ADMIN", "PRODUCER"])
    if ("error" in authResult) return authResult.error

    const { user: currentUser } = authResult
    const { id } = await params

    const [bulletin] = await db
      .select({
        id: bulletins.id,
        isLocked: bulletins.isLocked,
        lockedBy: bulletins.lockedBy,
      })
      .from(bulletins)
      .where(eq(bulletins.id, id))
      .limit(1)

    if (!bulletin) {
      return notFoundResponse("Bulletin")
    }

    // Only the user who locked it or an admin can unlock
    if (bulletin.lockedBy !== currentUser.id && currentUser.role !== "ADMIN") {
      return conflictResponse("Only the user who locked the bulletin or an admin can unlock it")
    }

    const [updated] = await db
      .update(bulletins)
      .set({
        isLocked: false,
        lockedBy: null,
        lockedAt: null,
      })
      .where(eq(bulletins.id, id))
      .returning()

    await logActivity(currentUser.id, "UNLOCK", "BULLETIN", id, {
      bulletinId: id,
      description: "Unlocked bulletin",
    })

    return successResponse(updated, "Bulletin unlocked successfully")
  } catch (error) {
    return serverErrorResponse(error)
  }
}