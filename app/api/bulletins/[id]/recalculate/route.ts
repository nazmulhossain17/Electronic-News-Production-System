// ============================================================================
// File: app/api/bulletins/[id]/recalculate/route.ts
// Description: Recalculate bulletin timing
// ============================================================================

import { NextRequest } from "next/server"
import { eq } from "drizzle-orm"
import { requireAuth } from "@/lib/auth"
import {
  successResponse,
  serverErrorResponse,
  notFoundResponse,
} from "@/lib/api-response"
import db from "@/db"
import { bulletins } from "@/db/schema"
import { recalculateRundownTiming } from "@/lib/rundown-service"

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * POST /api/bulletins/[id]/recalculate
 * Recalculate all timing for a bulletin
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const authResult = await requireAuth(request)
    if ("error" in authResult) return authResult.error

    const { id } = await params

    const [bulletin] = await db
      .select({ id: bulletins.id })
      .from(bulletins)
      .where(eq(bulletins.id, id))
      .limit(1)

    if (!bulletin) {
      return notFoundResponse("Bulletin")
    }

    const result = await recalculateRundownTiming(id)

    return successResponse(result, "Timing recalculated successfully")
  } catch (error) {
    return serverErrorResponse(error)
  }
}