import { NextRequest } from "next/server"
import { eq } from "drizzle-orm"
import { requireAuth } from "@/lib/auth"
import {
  successResponse,
  notFoundResponse,
  serverErrorResponse,
  validationErrorResponse,
} from "@/lib/api-response"
import { z } from "zod"
import db from "@/db"
import { appUsers, user, desks } from "@/db/schema" // Fixed: import 'desks' not 'newsDesks'

const updateProfileSchema = z.object({
  displayName: z.string().max(50).optional(),
  phone: z.string().max(20).optional(),
})

/**
 * GET /api/me
 * Get current user's profile
 */
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth(request)
    if ("error" in authResult) return authResult.error

    const { user: currentUser } = authResult

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
        deskName: desks.name,    // Fixed: use 'desks' not 'newsDesks'
        deskCode: desks.code,    // Fixed: use 'desks' not 'newsDesks'
        createdAt: user.createdAt,
      })
      .from(user)
      .leftJoin(appUsers, eq(user.id, appUsers.userId))
      .leftJoin(desks, eq(appUsers.deskId, desks.id))  // Fixed: use 'desks' not 'newsDesks'
      .where(eq(user.id, currentUser.id))
      .limit(1)

    if (result.length === 0) {
      return notFoundResponse("User")
    }

    const userData = result[0]

    return successResponse({
      user: {
        id: userData.id,
        name: userData.name,
        email: userData.email,
        emailVerified: userData.emailVerified,
        image: userData.image,
        displayName: userData.displayName,
        phone: userData.phone,
        role: userData.role || "REPORTER",
        isActive: userData.isActive ?? true,
        desk: userData.deskId
          ? {
              id: userData.deskId,
              name: userData.deskName,
              code: userData.deskCode,
            }
          : null,
        createdAt: userData.createdAt,
      },
    })
  } catch (error) {
    return serverErrorResponse(error)
  }
}

/**
 * PUT /api/me
 * Update current user's profile (limited fields)
 */
export async function PUT(request: NextRequest) {
  try {
    const authResult = await requireAuth(request)
    if ("error" in authResult) return authResult.error

    const { user: currentUser } = authResult

    const body = await request.json()
    const validation = updateProfileSchema.safeParse(body)

    if (!validation.success) {
      return validationErrorResponse(validation.error)
    }

    const data = validation.data

    // Check if app_users record exists
    const existingAppUser = await db
      .select()
      .from(appUsers)
      .where(eq(appUsers.userId, currentUser.id))
      .limit(1)

    let updated

    if (existingAppUser.length === 0) {
      // Create app_users record
      const [newAppUser] = await db
        .insert(appUsers)
        .values({
          userId: currentUser.id,
          displayName: data.displayName,
          phone: data.phone,
          role: "REPORTER",
          isActive: true,
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
        })
        .where(eq(appUsers.userId, currentUser.id))
        .returning()

      updated = updatedAppUser
    }

    return successResponse(updated, "Profile updated successfully")
  } catch (error) {
    return serverErrorResponse(error)
  }
}