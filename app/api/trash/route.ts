// ============================================================================
// File: app/api/trash/route.ts
// Description: API route for managing soft-deleted items (bulletins and rows)
// ============================================================================

import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth-config"
import db from "@/db"
import { bulletins, rundownRows, user, appUsers } from "@/db/schema"
import { eq, isNotNull, and, lt, sql } from "drizzle-orm"

// GET - List all deleted items (within 7 days)
export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers })
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Calculate 7 days ago
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

    // Get deleted bulletins (within 7 days)
    const deletedBulletins = await db
      .select({
        id: bulletins.id,
        title: bulletins.title,
        airDate: bulletins.airDate,
        startTime: bulletins.startTime,
        status: bulletins.status,
        deletedAt: bulletins.deletedAt,
        deletedByName: user.name,
      })
      .from(bulletins)
      .leftJoin(user, eq(bulletins.deletedBy, user.id))
      .where(
        and(
          isNotNull(bulletins.deletedAt),
          sql`${bulletins.deletedAt} > ${sevenDaysAgo}`
        )
      )
      .orderBy(sql`${bulletins.deletedAt} DESC`)

    // Get deleted rows (within 7 days)
    const deletedRows = await db
      .select({
        id: rundownRows.id,
        slug: rundownRows.slug,
        pageCode: rundownRows.pageCode,
        bulletinId: rundownRows.bulletinId,
        deletedAt: rundownRows.deletedAt,
        deletedByName: user.name,
        bulletinTitle: bulletins.title,
      })
      .from(rundownRows)
      .leftJoin(user, eq(rundownRows.deletedBy, user.id))
      .leftJoin(bulletins, eq(rundownRows.bulletinId, bulletins.id))
      .where(
        and(
          isNotNull(rundownRows.deletedAt),
          sql`${rundownRows.deletedAt} > ${sevenDaysAgo}`
        )
      )
      .orderBy(sql`${rundownRows.deletedAt} DESC`)

    return NextResponse.json({
      data: {
        bulletins: deletedBulletins.map(b => ({
          ...b,
          date: b.airDate ? new Date(b.airDate).toISOString().split("T")[0] : null,
          type: "bulletin",
          daysLeft: Math.ceil((new Date(b.deletedAt!).getTime() + 7 * 24 * 60 * 60 * 1000 - Date.now()) / (24 * 60 * 60 * 1000)),
        })),
        rows: deletedRows.map(r => ({
          ...r,
          type: "row",
          daysLeft: Math.ceil((new Date(r.deletedAt!).getTime() + 7 * 24 * 60 * 60 * 1000 - Date.now()) / (24 * 60 * 60 * 1000)),
        })),
      },
    })
  } catch (error) {
    console.error("Get trash error:", error)
    return NextResponse.json(
      { error: "Failed to get deleted items" },
      { status: 500 }
    )
  }
}

// Helper to get user role from appUsers table
async function getUserRole(userId: string): Promise<string | null> {
  const [appUser] = await db
    .select({ role: appUsers.role })
    .from(appUsers)
    .where(eq(appUsers.userId, userId))
    .limit(1)
  
  return appUser?.role || null
}

// DELETE - Permanently delete items older than 7 days (cleanup job)
export async function DELETE(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers })
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get role from appUsers table
    const userRole = await getUserRole(session.user.id)
    
    if (userRole !== "ADMIN") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 })
    }

    // Calculate 7 days ago
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

    // Permanently delete old rows first (due to foreign key)
    const deletedRowsResult = await db
      .delete(rundownRows)
      .where(
        and(
          isNotNull(rundownRows.deletedAt),
          lt(rundownRows.deletedAt, sevenDaysAgo)
        )
      )
      .returning({ id: rundownRows.id })

    // Permanently delete old bulletins
    const deletedBulletinsResult = await db
      .delete(bulletins)
      .where(
        and(
          isNotNull(bulletins.deletedAt),
          lt(bulletins.deletedAt, sevenDaysAgo)
        )
      )
      .returning({ id: bulletins.id })

    console.log(`🗑️ Cleanup: Permanently deleted ${deletedBulletinsResult.length} bulletins and ${deletedRowsResult.length} rows`)

    return NextResponse.json({
      success: true,
      deleted: {
        bulletins: deletedBulletinsResult.length,
        rows: deletedRowsResult.length,
      },
    })
  } catch (error) {
    console.error("Cleanup trash error:", error)
    return NextResponse.json(
      { error: "Failed to cleanup trash" },
      { status: 500 }
    )
  }
}