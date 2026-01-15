// ============================================================================
// File: app/api/app-user/check/route.ts
// Description: Check if current user has completed app user setup
// ============================================================================

import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth-config"
import db from "@/db"
import { appUsers } from "@/db/schema"
import { eq } from "drizzle-orm"

export async function GET(request: NextRequest) {
  try {
    // Get session
    const session = await auth.api.getSession({
      headers: request.headers,
    })

    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    // Check if app user exists and is set up
    const appUser = await db
      .select()
      .from(appUsers)
      .where(eq(appUsers.userId, session.user.id))
      .limit(1)

    // If no app user or displayName is still null, user needs to complete setup
    const isSetup = appUser.length > 0 && appUser[0].displayName !== null

    return NextResponse.json({
      isSetup,
      hasAppUser: appUser.length > 0,
      appUser: appUser[0] || null,
    })
  } catch (error) {
    console.error("Check app user error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
