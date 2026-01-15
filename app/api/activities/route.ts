// ============================================================================
// File: app/api/activities/route.ts
// Description: Activity logs API endpoints
// ============================================================================

import { NextRequest } from "next/server"
import { eq, and, gte, lte, desc } from "drizzle-orm"
import { requireAuth, requireRole } from "@/lib/auth"
import {
  successResponse,
  serverErrorResponse,
} from "@/lib/api-response"
import db from "@/db"
import { activityLogs, user, bulletins } from "@/db/schema"

/**
 * GET /api/activities
 * List activity logs with filters
 */
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth(request)
    if ("error" in authResult) return authResult.error

    const { searchParams } = new URL(request.url)
    const bulletinId = searchParams.get("bulletinId")
    const rowId = searchParams.get("rowId")
    const userId = searchParams.get("userId")
    const action = searchParams.get("action")
    const entityType = searchParams.get("entityType")
    const startDate = searchParams.get("startDate")
    const endDate = searchParams.get("endDate")
    const limit = Math.min(parseInt(searchParams.get("limit") || "100"), 500)
    const offset = parseInt(searchParams.get("offset") || "0")

    // Build conditions
    const conditions = []

    if (bulletinId) {
      conditions.push(eq(activityLogs.bulletinId, bulletinId))
    }

    if (rowId) {
      conditions.push(eq(activityLogs.rowId, rowId))
    }

    if (userId) {
      conditions.push(eq(activityLogs.userId, userId))
    }

    if (action) {
      conditions.push(eq(activityLogs.action, action))
    }

    if (entityType) {
      conditions.push(eq(activityLogs.entityType, entityType))
    }

    if (startDate) {
      conditions.push(gte(activityLogs.createdAt, new Date(startDate)))
    }

    if (endDate) {
      conditions.push(lte(activityLogs.createdAt, new Date(endDate)))
    }

    const result = await db
      .select({
        id: activityLogs.id,
        userId: activityLogs.userId,
        userName: user.name,
        action: activityLogs.action,
        entityType: activityLogs.entityType,
        entityId: activityLogs.entityId,
        bulletinId: activityLogs.bulletinId,
        bulletinTitle: bulletins.title,
        rowId: activityLogs.rowId,
        description: activityLogs.description,
        createdAt: activityLogs.createdAt,
      })
      .from(activityLogs)
      .leftJoin(user, eq(activityLogs.userId, user.id))
      .leftJoin(bulletins, eq(activityLogs.bulletinId, bulletins.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(activityLogs.createdAt))
      .limit(limit)
      .offset(offset)

    return successResponse({ activities: result })
  } catch (error) {
    return serverErrorResponse(error)
  }
}