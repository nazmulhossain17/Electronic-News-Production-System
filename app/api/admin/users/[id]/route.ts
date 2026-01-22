import { NextRequest } from "next/server"
import { eq } from "drizzle-orm"
import { requireRole } from "@/lib/auth"
import {
  successResponse,
  notFoundResponse,
  errorResponse,
  serverErrorResponse,
  validationErrorResponse,
} from "@/lib/api-response"
import { z } from "zod"
import { logActivity } from "@/lib/rundown-service"
import db from "@/db"
import { appUsers, user } from "@/db/schema"

const updateUserSchema = z.object({
  displayName: z.string().max(50).optional(),
  phone: z.string().max(20).optional(),
  role: z.enum(["ADMIN", "PRODUCER", "EDITOR", "REPORTER"]).optional(),
  isActive: z.boolean().optional(),
  deskId: z.string().uuid().nullable().optional(),
})

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * GET /api/admin/users/[id]
 * Get detailed user info (admin only)
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const authResult = await requireRole(request, ["ADMIN"])
    if ("error" in authResult) return authResult.error

    const { id } = await params

    const result = await db
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
        userCreatedAt: user.createdAt,
        appUserCreatedAt: appUsers.createdAt,
        appUserUpdatedAt: appUsers.updatedAt,
      })
      .from(user)
      .leftJoin(appUsers, eq(user.id, appUsers.userId))
      .where(eq(user.id, id))
      .limit(1)

    if (result.length === 0) {
      return notFoundResponse("User")
    }

    const userData = result[0]

    return successResponse({
      user: {
        ...userData,
        role: userData.role || "REPORTER",
        isActive: userData.isActive ?? true,
        hasAppProfile: !!userData.role,
      },
    })
  } catch (error) {
    return serverErrorResponse(error)
  }
}

/**
 * PUT /api/admin/users/[id]
 * Update user profile and permissions (admin only)
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const authResult = await requireRole(request, ["ADMIN"])
    if ("error" in authResult) return authResult.error

    const { user: currentUser } = authResult
    const { id } = await params

    // Check user exists
    const userResult = await db
      .select()
      .from(user)
      .where(eq(user.id, id))
      .limit(1)

    if (userResult.length === 0) {
      return notFoundResponse("User")
    }

    const body = await request.json()
    const validation = updateUserSchema.safeParse(body)

    if (!validation.success) {
      return validationErrorResponse(validation.error)
    }

    const data = validation.data

    // Check if app_users record exists
    const existingAppUser = await db
      .select()
      .from(appUsers)
      .where(eq(appUsers.userId, id))
      .limit(1)

    let updated

    if (existingAppUser.length === 0) {
      // Create app_users record
      const [newAppUser] = await db
        .insert(appUsers)
        .values({
          userId: id,
          displayName: data.displayName,
          phone: data.phone,
          role: data.role || "REPORTER",
          isActive: data.isActive ?? true,
          deskId: data.deskId,
        })
        .returning()

      updated = newAppUser
    } else {
      // Update existing
      const [updatedAppUser] = await db
        .update(appUsers)
        .set({
          ...(data.displayName !== undefined && { displayName: data.displayName }),
          ...(data.phone !== undefined && { phone: data.phone }),
          ...(data.role !== undefined && { role: data.role }),
          ...(data.isActive !== undefined && { isActive: data.isActive }),
          ...(data.deskId !== undefined && { deskId: data.deskId }),
        })
        .where(eq(appUsers.userId, id))
        .returning()

      updated = updatedAppUser
    }

    // Log activity
    await logActivity(currentUser.id, "USER_UPDATED", "USER", id, {
      description: `Updated user: ${userResult[0].email}`,
      oldValue: existingAppUser[0],
      newValue: updated,
    })

    return successResponse(updated, "User updated successfully")
  } catch (error) {
    return serverErrorResponse(error)
  }
}

/**
 * DELETE /api/admin/users/[id]
 * Deactivate user (admin only) - doesn't delete, just deactivates
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const authResult = await requireRole(request, ["ADMIN"])
    if ("error" in authResult) return authResult.error

    const { user: currentUser } = authResult
    const { id } = await params

    // Prevent self-deactivation
    if (currentUser.id === id) {
      return errorResponse("You cannot deactivate your own account", 400)
    }

    // Check user exists
    const userResult = await db
      .select()
      .from(user)
      .where(eq(user.id, id))
      .limit(1)

    if (userResult.length === 0) {
      return notFoundResponse("User")
    }

    // Check if app_users record exists
    const existingAppUser = await db
      .select()
      .from(appUsers)
      .where(eq(appUsers.userId, id))
      .limit(1)

    if (existingAppUser.length === 0) {
      // Create deactivated app_users record
      await db.insert(appUsers).values({
        userId: id,
        role: "REPORTER",
        isActive: false,
      })
    } else {
      // Deactivate
      await db
        .update(appUsers)
        .set({ isActive: false })
        .where(eq(appUsers.userId, id))
    }

    // Log activity
    await logActivity(currentUser.id, "USER_DEACTIVATED", "USER", id, {
      description: `Deactivated user: ${userResult[0].email}`,
    })

    return successResponse({ id }, "User deactivated successfully")
  } catch (error) {
    return serverErrorResponse(error)
  }
}
