import { NextRequest } from "next/server"
import { db } from "@/db"
import { bulletins } from "@/db/schema"
import { eq } from "drizzle-orm"
import { requireRole } from "@/lib/auth"
import {
  successResponse,
  notFoundResponse,
  forbiddenResponse,
  serverErrorResponse,
} from "@/lib/api-response"
import { logActivity } from "@/lib/rundown-service"

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * POST /api/bulletins/[id]/unlock
 * Unlock a bulletin
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const authResult = await requireRole(request, ["ADMIN", "PRODUCER"])
    if ("error" in authResult) return authResult.error

    const { user: currentUser } = authResult
    const { id } = await params

    // Check bulletin exists
    const existing = await db
      .select()
      .from(bulletins)
      .where(eq(bulletins.id, id))
      .limit(1)

    if (existing.length === 0) {
      return notFoundResponse("Bulletin")
    }

    const bulletin = existing[0]

    // Only admin can unlock someone else's lock
    if (
      bulletin.isLocked &&
      bulletin.lockedBy !== currentUser.id &&
      currentUser.role !== "ADMIN"
    ) {
      return forbiddenResponse("Only admin can unlock another user's lock")
    }

    // Unlock the bulletin
    const [updated] = await db
      .update(bulletins)
      .set({
        isLocked: false,
        lockedAt: null,
        lockedBy: null,
        status: "ACTIVE",
      })
      .where(eq(bulletins.id, id))
      .returning()

    // Log activity
    await logActivity(currentUser.id, "BULLETIN_UNLOCKED", "BULLETIN", id, {
      bulletinId: id,
      description: `Unlocked bulletin: ${bulletin.title}`,
    })

    return successResponse(updated, "Bulletin unlocked successfully")
  } catch (error) {
    return serverErrorResponse(error)
  }
}
