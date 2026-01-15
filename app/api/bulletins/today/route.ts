// ============================================================================
// File: app/api/bulletins/today/route.ts
// Description: Get today's bulletins
// ============================================================================

import { NextRequest } from "next/server"
import { eq, and, gte, lt, asc } from "drizzle-orm"
import { requireAuth } from "@/lib/auth"
import { successResponse, serverErrorResponse } from "@/lib/api-response"
import db from "@/db"
import { bulletins, desks, user } from "@/db/schema"

/**
 * GET /api/bulletins/today
 * Get all bulletins for today
 */
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth(request)
    if ("error" in authResult) return authResult.error

    // Get today's date range
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    const result = await db
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
        timingVarianceSecs: bulletins.timingVarianceSecs,
        status: bulletins.status,
        isLocked: bulletins.isLocked,
        producerId: bulletins.producerId,
        producerName: user.name,
        deskId: bulletins.deskId,
        deskName: desks.name,
        createdAt: bulletins.createdAt,
      })
      .from(bulletins)
      .leftJoin(user, eq(bulletins.producerId, user.id))
      .leftJoin(desks, eq(bulletins.deskId, desks.id))
      .where(and(gte(bulletins.airDate, today), lt(bulletins.airDate, tomorrow)))
      .orderBy(asc(bulletins.startTime))

    return successResponse({ bulletins: result })
  } catch (error) {
    return serverErrorResponse(error)
  }
}