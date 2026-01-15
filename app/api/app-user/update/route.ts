// ============================================================================
// File: app/api/app-user/update/route.ts
// Description: Update app user profile (after setup)
// Note: Users cannot promote themselves to ADMIN
// ============================================================================

import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth-config"
import db from "@/db"
import { appUsers } from "@/db/schema"
import { eq } from "drizzle-orm"
import { z } from "zod"

// Regular users can only update to non-admin roles
const updateSchema = z.object({
  displayName: z.string().min(2).nullable().optional(),
  phone: z.string().max(20).nullable().optional(),
  role: z.enum(["REPORTER", "EDITOR", "PRODUCER"]).optional(),
})

export async function PATCH(request: NextRequest) {
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

    const body = await request.json()
    
    // Explicitly reject ADMIN role updates
    if (body.role === "ADMIN") {
      return NextResponse.json(
        { 
          error: "Forbidden", 
          message: "Admin role can only be assigned by system administrators" 
        },
        { status: 403 }
      )
    }
    
    const validatedData = updateSchema.parse(body)

    // Build update object only with provided fields
    const updateFields: Record<string, unknown> = {}
    
    if (validatedData.displayName !== undefined) {
      updateFields.displayName = validatedData.displayName
    }
    if (validatedData.phone !== undefined) {
      updateFields.phone = validatedData.phone
    }
    if (validatedData.role !== undefined) {
      updateFields.role = validatedData.role
    }

    // Only update if there are fields to update
    if (Object.keys(updateFields).length === 0) {
      return NextResponse.json(
        { error: "No fields to update" },
        { status: 400 }
      )
    }

    // Update app user
    const result = await db
      .update(appUsers)
      .set(updateFields)
      .where(eq(appUsers.userId, session.user.id))
      .returning()

    if (result.length === 0) {
      return NextResponse.json(
        { error: "App user not found" },
        { status: 404 }
      )
    }

    console.log(`✅ Updated app user for: ${session.user.email}`)

    return NextResponse.json({
      success: true,
      message: "Profile updated successfully",
      appUser: result[0],
    })
  } catch (error) {
    console.error("Update app user error:", error)
    
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
