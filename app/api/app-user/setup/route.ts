// ============================================================================
// File: app/api/app-user/setup/route.ts
// Description: Complete app user profile setup (ADMIN role not allowed)
// ============================================================================

import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth-config"
import db from "@/db"
import { appUsers } from "@/db/schema"
import { eq } from "drizzle-orm"
import { z } from "zod"

// Validation schema - ADMIN role is NOT allowed during self-setup
const setupSchema = z.object({
  displayName: z.string().min(2, "Display name must be at least 2 characters").nullable(),
  phone: z.string().max(20, "Phone must be max 20 characters").nullable(),
  role: z.enum(["REPORTER", "EDITOR", "PRODUCER"], {
    errorMap: () => ({ message: "Invalid role. Admin role can only be assigned by administrators." })
  }),
})

export async function POST(request: NextRequest) {
  try {
    // Get session
    const session = await auth.api.getSession({
      headers: request.headers,
    })

    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized", message: "Please log in first" },
        { status: 401 }
      )
    }

    // Parse request body
    const body = await request.json()
    
    // Additional check: reject ADMIN role even if somehow passed
    if (body.role === "ADMIN") {
      return NextResponse.json(
        { 
          error: "Forbidden", 
          message: "Admin role can only be assigned by system administrators" 
        },
        { status: 403 }
      )
    }
    
    // Validate input
    const validatedData = setupSchema.parse(body)

    // Check if app user already has displayName set (already completed setup)
    const existingAppUser = await db
      .select()
      .from(appUsers)
      .where(eq(appUsers.userId, session.user.id))
      .limit(1)

    if (existingAppUser.length > 0 && existingAppUser[0].displayName) {
      return NextResponse.json(
        { error: "Setup already completed", message: "Your profile has already been set up" },
        { status: 400 }
      )
    }

    // Update or create app user
    if (existingAppUser.length > 0) {
      // Update existing app user
      await db
        .update(appUsers)
        .set({
          displayName: validatedData.displayName,
          phone: validatedData.phone,
          role: validatedData.role,
        })
        .where(eq(appUsers.userId, session.user.id))

      console.log(`✅ Updated app user profile for: ${session.user.email}`)
    } else {
      // Create new app user (shouldn't happen if callback worked, but just in case)
      await db.insert(appUsers).values({
        userId: session.user.id,
        displayName: validatedData.displayName,
        phone: validatedData.phone,
        role: validatedData.role,
        isActive: true,
      })

      console.log(`✅ Created app user profile for: ${session.user.email}`)
    }

    return NextResponse.json({
      success: true,
      message: "Profile setup completed successfully",
    })
  } catch (error) {
    console.error("Setup app user error:", error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          error: "Validation error", 
          message: error.errors[0]?.message || "Invalid input data"
        },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: "Internal server error", message: "Failed to set up profile" },
      { status: 500 }
    )
  }
}
