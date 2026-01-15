import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { user, appUsers, newsDesks } from "@/lib/schema"
import { eq, asc, sql, and, like, or } from "drizzle-orm"
import { requireRole } from "@/lib/auth"
import {
  successResponse,
  notFoundResponse,
  errorResponse,
  serverErrorResponse,
  validationErrorResponse,
} from "@/lib/api-response"
import { z } from "zod"

// Validation schemas
const updateUserRoleSchema = z.object({
  role: z.enum(["ADMIN", "PRODUCER", "EDITOR", "REPORTER"]),
})

const updateUserStatusSchema = z.object({
  isActive: z.boolean(),
})

const bulkUpdateSchema = z.object({
  userIds: z.array(z.string()).min(1),
  action: z.enum(["activate", "deactivate", "setRole"]),
  role: z.enum(["ADMIN", "PRODUCER", "EDITOR", "REPORTER"]).optional(),
})

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * GET /api/admin/users
 * List all users with filtering and search (admin only)
 */
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireRole(request, ["ADMIN"])
    if ("error" in authResult) return authResult.error

    const { searchParams } = new URL(request.url)
    const search = searchParams.get("search")
    const role = searchParams.get("role")
    const status = searchParams.get("status") // "active" | "inactive" | "all"
    const deskId = searchParams.get("deskId")
    const limit = parseInt(searchParams.get("limit") || "50")
    const offset = parseInt(searchParams.get("offset") || "0")

    // Build conditions
    const conditions = []

    if (search) {
      conditions.push(
        or(
          like(user.name, `%${search}%`),
          like(user.email, `%${search}%`),
          like(appUsers.displayName, `%${search}%`)
        )
      )
    }

    if (role) {
      conditions.push(eq(appUsers.role, role as any))
    }

    if (status === "active") {
      conditions.push(eq(appUsers.isActive, true))
    } else if (status === "inactive") {
      conditions.push(eq(appUsers.isActive, false))
    }

    if (deskId) {
      conditions.push(eq(appUsers.deskId, deskId))
    }

    // Query
    const users = await db
      .select({
        id: user.id,
        name: user.name,
        email: user.email,
        emailVerified: user.emailVerified,
        image: user.image,
        displayName: appUsers.displayName,
        phone: appUsers.phone,
        role: appUsers.role,
        isActive: appUsers.isActive,
        deskId: appUsers.deskId,
        deskName: newsDesks.name,
        userCreatedAt: user.createdAt,
        appUserCreatedAt: appUsers.createdAt,
      })
      .from(user)
      .leftJoin(appUsers, eq(user.id, appUsers.userId))
      .leftJoin(newsDesks, eq(appUsers.deskId, newsDesks.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(asc(user.name))
      .limit(limit)
      .offset(offset)

    // Get total count
    const countResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(user)
      .leftJoin(appUsers, eq(user.id, appUsers.userId))
      .where(conditions.length > 0 ? and(...conditions) : undefined)

    const total = countResult[0]?.count ?? 0

    // Format response
    const formattedUsers = users.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      emailVerified: u.emailVerified,
      image: u.image,
      displayName: u.displayName,
      phone: u.phone,
      role: u.role || "REPORTER",
      isActive: u.isActive ?? true,
      deskId: u.deskId,
      deskName: u.deskName,
      createdAt: u.userCreatedAt,
      hasAppProfile: !!u.role,
    }))

    return successResponse({
      users: formattedUsers,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + users.length < total,
      },
    })
  } catch (error) {
    return serverErrorResponse(error)
  }
}

/**
 * POST /api/admin/users/bulk
 * Bulk update users (admin only)
 */
export async function POST(request: NextRequest) {
  try {
    const authResult = await requireRole(request, ["ADMIN"])
    if ("error" in authResult) return authResult.error

    const body = await request.json()
    const validation = bulkUpdateSchema.safeParse(body)

    if (!validation.success) {
      return validationErrorResponse(validation.error)
    }

    const { userIds, action, role } = validation.data

    let updated = 0

    for (const userId of userIds) {
      // Check if app_users record exists
      const existing = await db
        .select()
        .from(appUsers)
        .where(eq(appUsers.userId, userId))
        .limit(1)

      if (existing.length === 0) {
        // Create app_users record
        await db.insert(appUsers).values({
          userId,
          role: role || "REPORTER",
          isActive: action !== "deactivate",
        })
        updated++
        continue
      }

      // Update based on action
      if (action === "activate") {
        await db
          .update(appUsers)
          .set({ isActive: true })
          .where(eq(appUsers.userId, userId))
        updated++
      } else if (action === "deactivate") {
        await db
          .update(appUsers)
          .set({ isActive: false })
          .where(eq(appUsers.userId, userId))
        updated++
      } else if (action === "setRole" && role) {
        await db
          .update(appUsers)
          .set({ role })
          .where(eq(appUsers.userId, userId))
        updated++
      }
    }

    return successResponse(
      { updated },
      `Successfully updated ${updated} user(s)`
    )
  } catch (error) {
    return serverErrorResponse(error)
  }
}
