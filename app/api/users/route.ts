// ============================================================================
// File: app/api/users/route.ts
// Description: Users API endpoints
// ============================================================================

import { NextRequest } from "next/server"
import { eq, asc, and, or, ilike } from "drizzle-orm"
import { requireAuth, requireRole } from "@/lib/auth"
import {
  successResponse,
  serverErrorResponse,
} from "@/lib/api-response"
import db from "@/db"
import { user, appUsers, desks } from "@/db/schema"

/**
 * GET /api/users
 * List users with optional filters
 */
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth(request)
    if ("error" in authResult) return authResult.error

    const { searchParams } = new URL(request.url)
    const role = searchParams.get("role")
    const deskId = searchParams.get("deskId")
    const search = searchParams.get("search")
    const activeOnly = searchParams.get("activeOnly") !== "false"

    const result = await db
      .select({
        id: user.id,
        name: user.name,
        email: user.email,
        image: user.image,
        displayName: appUsers.displayName,
        role: appUsers.role,
        deskId: appUsers.deskId,
        deskName: desks.name,
        isActive: appUsers.isActive,
        lastActiveAt: appUsers.lastActiveAt,
        createdAt: user.createdAt,
      })
      .from(user)
      .leftJoin(appUsers, eq(user.id, appUsers.userId))
      .leftJoin(desks, eq(appUsers.deskId, desks.id))
      .orderBy(asc(user.name))

    // Apply filters
    let filtered = result

    if (activeOnly) {
      filtered = filtered.filter((u) => u.isActive !== false)
    }

    if (role) {
      filtered = filtered.filter((u) => u.role === role)
    }

    if (deskId) {
      filtered = filtered.filter((u) => u.deskId === deskId)
    }

    if (search) {
      const searchLower = search.toLowerCase()
      filtered = filtered.filter(
        (u) =>
          u.name.toLowerCase().includes(searchLower) ||
          u.email.toLowerCase().includes(searchLower) ||
          u.displayName?.toLowerCase().includes(searchLower)
      )
    }

    return successResponse({ users: filtered })
  } catch (error) {
    return serverErrorResponse(error)
  }
}