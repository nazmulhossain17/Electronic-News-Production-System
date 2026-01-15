// ============================================================================
// File: app/api/app-user/profile/route.ts
// Description: Get current user's app profile
// ============================================================================

import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth-config"
import db from "@/db"
import { appUsers, user } from "@/db/schema"
import { eq } from "drizzle-orm"

export async function GET(request: NextRequest) {
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

    // Get app user with relations
    const appUser = await db
      .select({
        id: appUsers.id,
        displayName: appUsers.displayName,
        phone: appUsers.phone,
        role: appUsers.role,
        deskId: appUsers.deskId,
        isActive: appUsers.isActive,
        lastActiveAt: appUsers.lastActiveAt,
        createdAt: appUsers.createdAt,
        updatedAt: appUsers.updatedAt,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image,
        },
      })
      .from(appUsers)
      .leftJoin(user, eq(appUsers.userId, user.id))
      .where(eq(appUsers.userId, session.user.id))
      .limit(1)

    if (appUser.length === 0) {
      return NextResponse.json(
        { error: "App user not found" },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      appUser: appUser[0],
    })
  } catch (error) {
    console.error("Get app user profile error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
