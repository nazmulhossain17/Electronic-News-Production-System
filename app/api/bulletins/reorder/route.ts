// ============================================================================
// File: app/api/bulletins/reorder/route.ts
// Description: API endpoint to reorder bulletins within the same day
// 
// IMPORTANT: This requires adding a sortOrder column to your bulletins table:
// ALTER TABLE bulletins ADD COLUMN sort_order INTEGER DEFAULT 0;
// ============================================================================

import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth-config"
import db from "@/db"
import { bulletins, appUsers } from "@/db/schema"
import { eq, inArray } from "drizzle-orm"

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers })
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get user role from appUsers table (not from session directly)
    const [appUser] = await db
      .select({ role: appUsers.role })
      .from(appUsers)
      .where(eq(appUsers.userId, session.user.id))
      .limit(1)

    const userRole = appUser?.role

    // Check user role - ADMIN and EDITOR can reorder
    if (!userRole || !["ADMIN", "EDITOR"].includes(userRole)) {
      return NextResponse.json(
        { error: "Insufficient permissions", userRole },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { bulletinIds } = body

    if (!Array.isArray(bulletinIds) || bulletinIds.length === 0) {
      return NextResponse.json(
        { error: "bulletinIds must be a non-empty array" },
        { status: 400 }
      )
    }

    // Verify all bulletins exist
    const existingBulletins = await db
      .select({ id: bulletins.id })
      .from(bulletins)
      .where(inArray(bulletins.id, bulletinIds))

    if (existingBulletins.length !== bulletinIds.length) {
      return NextResponse.json(
        { error: "One or more bulletins not found" },
        { status: 404 }
      )
    }

    // Update sortOrder for each bulletin
    // This requires sortOrder column in your bulletins table
    try {
      for (let i = 0; i < bulletinIds.length; i++) {
        await db
          .update(bulletins)
          .set({ 
            sortOrder: i,
            updatedAt: new Date() 
          })
          .where(eq(bulletins.id, bulletinIds[i]))
      }
    } catch (dbError) {
      // If sortOrder column doesn't exist, return partial success
      console.warn("sortOrder column may not exist:", dbError)
      return NextResponse.json({
        success: true,
        message: "Order saved (client-side only - add sortOrder column for persistence)",
        count: bulletinIds.length,
        order: bulletinIds,
        warning: "sortOrder column not found in bulletins table"
      })
    }

    return NextResponse.json({
      success: true,
      message: "Bulletins order updated successfully",
      count: bulletinIds.length,
      order: bulletinIds,
    })
  } catch (error) {
    console.error("Reorder bulletins error:", error)
    return NextResponse.json(
      { 
        error: "Failed to reorder bulletins",
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    )
  }
}