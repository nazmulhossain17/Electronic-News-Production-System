// ============================================================================
// File: app/api/app-user/admin/assign-role/route.ts
// Description: Admin-only endpoint for assigning roles (including ADMIN)
// ============================================================================

import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth-config"
import db from "@/db"
import { appUsers } from "@/db/schema"
import { eq } from "drizzle-orm"
import { z } from "zod"

// Admin can assign any role including ADMIN
const assignRoleSchema = z.object({
  targetUserId: z.string().min(1, "Target user ID is required"),
  role: z.enum(["REPORTER", "EDITOR", "PRODUCER", "ADMIN"]),
})

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    })

    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    // Check if current user is an admin
    const currentAppUser = await db
      .select({ role: appUsers.role })
      .from(appUsers)
      .where(eq(appUsers.userId, session.user.id))
      .limit(1)

    if (currentAppUser.length === 0 || currentAppUser[0].role !== "ADMIN") {
      return NextResponse.json(
        { error: "Forbidden", message: "Only administrators can assign roles" },
        { status: 403 }
      )
    }

    const body = await request.json()
    const validatedData = assignRoleSchema.parse(body)

    // Update target user's role
    const result = await db
      .update(appUsers)
      .set({ role: validatedData.role })
      .where(eq(appUsers.userId, validatedData.targetUserId))
      .returning()

    if (result.length === 0) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      )
    }

    console.log(`✅ Admin ${session.user.email} assigned role ${validatedData.role} to user ${validatedData.targetUserId}`)

    return NextResponse.json({
      success: true,
      message: `Role updated to ${validatedData.role}`,
      appUser: result[0],
    })
  } catch (error) {
    console.error("Assign role error:", error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", message: error.errors[0]?.message || "Invalid input" },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
