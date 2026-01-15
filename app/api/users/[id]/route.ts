// ============================================================================
// File: app/api/users/[id]/route.ts
// Description: Single user API endpoints
// ============================================================================

import { NextRequest } from "next/server"
import { eq } from "drizzle-orm"
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
import { user, appUsers, desks } from "@/db/schema"
import { logActivity } from "@/lib/rundown-service"

const updateUserSchema = z.object({
  displayName: z.string().max(50).nullable().optional(),
  phone: z.string().max(20).nullable().optional(),
})

const adminUpdateUserSchema = z.object({
  displayName: z.string().max(50).nullable().optional(),
  phone: z.string().max(20).nullable().optional(),
  role: z.enum(["ADMIN", "PRODUCER", "EDITOR", "REPORTER"]).optional(),
  isActive: z.boolean().optional(),
  deskId: z.string().uuid().nullable().optional(),
})

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * GET /api/users/[id]
 * Get a single user
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const authResult = await requireAuth(request)
    if ("error" in authResult) return authResult.error

    const { id } = await params

    const [userData] = await db
      .select({
        id: user.id,
        name: user.name,
        email: user.email,
        image: user.image,
        displayName: appUsers.displayName,
        phone: appUsers.phone,
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
      .where(eq(user.id, id))
      .limit(1)

    if (!userData) {
      return notFoundResponse("User")
    }

    return successResponse({ user: userData })
  } catch (error) {
    return serverErrorResponse(error)
  }
}

/**
 * PUT /api/users/[id]
 * Update a user
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const authResult = await requireAuth(request)
    if ("error" in authResult) return authResult.error

    const { user: currentUser } = authResult
    const { id } = await params

    const isAdmin = currentUser.role === "ADMIN"
    const isSelf = currentUser.id === id

    // Non-admins can only update themselves
    if (!isAdmin && !isSelf) {
      return forbiddenResponse("You can only update your own profile")
    }

    const body = await request.json()

    // Use different schema based on role
    const schema = isAdmin ? adminUpdateUserSchema : updateUserSchema
    const validation = schema.safeParse(body)

    if (!validation.success) {
      return validationErrorResponse(validation.error)
    }

    const data = validation.data

    // Check if user exists
    const [existing] = await db
      .select({ userId: appUsers.userId })
      .from(appUsers)
      .where(eq(appUsers.userId, id))
      .limit(1)

    if (!existing) {
      // Create appUsers record if it doesn't exist
      await db.insert(appUsers).values({
        userId: id,
        displayName: data.displayName,
        phone: data.phone,
        role: (data as any).role || "REPORTER",
        isActive: (data as any).isActive ?? true,
        deskId: (data as any).deskId,
      })
    } else {
      // Update existing record
      const updateData: Record<string, unknown> = {}

      if (data.displayName !== undefined) updateData.displayName = data.displayName
      if (data.phone !== undefined) updateData.phone = data.phone

      // Admin-only fields
      if (isAdmin) {
        const adminData = data as z.infer<typeof adminUpdateUserSchema>
        if (adminData.role !== undefined) updateData.role = adminData.role
        if (adminData.isActive !== undefined) updateData.isActive = adminData.isActive
        if (adminData.deskId !== undefined) updateData.deskId = adminData.deskId
      }

      await db
        .update(appUsers)
        .set(updateData)
        .where(eq(appUsers.userId, id))
    }

    // Get updated user
    const [updated] = await db
      .select({
        id: user.id,
        name: user.name,
        email: user.email,
        displayName: appUsers.displayName,
        phone: appUsers.phone,
        role: appUsers.role,
        deskId: appUsers.deskId,
        isActive: appUsers.isActive,
      })
      .from(user)
      .leftJoin(appUsers, eq(user.id, appUsers.userId))
      .where(eq(user.id, id))
      .limit(1)

    // Log activity if admin made changes
    if (isAdmin && !isSelf) {
      await logActivity(currentUser.id, "UPDATE", "USER", id, {
        description: `Updated user: ${updated?.name}`,
        newValue: data,
      })
    }

    return successResponse(updated, "User updated successfully")
  } catch (error) {
    return serverErrorResponse(error)
  }
}