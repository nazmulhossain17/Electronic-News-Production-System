// ============================================================================
// File: app/api/trash/permanent/route.ts
// Description: API route for permanently deleting items from trash
// ============================================================================

import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth-config"
import db from "@/db"
import { bulletins, rundownRows, rowSegments } from "@/db/schema"
import { eq, isNotNull, and } from "drizzle-orm"
import { z } from "zod"

const permanentDeleteSchema = z.object({
  type: z.enum(["bulletin", "row"]),
  id: z.string().uuid(),
})

// POST - Permanently delete an item
export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers })
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Only admins and editors can permanently delete
    const userRole = (session.user as { role?: string }).role
    if (!["ADMIN", "EDITOR"].includes(userRole || "")) {
      return NextResponse.json({ error: "Admin or Editor access required" }, { status: 403 })
    }

    const body = await request.json()
    const { type, id } = permanentDeleteSchema.parse(body)

    if (type === "bulletin") {
      // Check if bulletin is in trash
      const [existing] = await db
        .select()
        .from(bulletins)
        .where(and(eq(bulletins.id, id), isNotNull(bulletins.deletedAt)))
        .limit(1)

      if (!existing) {
        return NextResponse.json({ error: "Bulletin not found in trash" }, { status: 404 })
      }

      // Delete all rows and their segments first
      const rows = await db
        .select({ id: rundownRows.id })
        .from(rundownRows)
        .where(eq(rundownRows.bulletinId, id))

      for (const row of rows) {
        await db.delete(rowSegments).where(eq(rowSegments.rowId, row.id))
      }
      await db.delete(rundownRows).where(eq(rundownRows.bulletinId, id))

      // Delete the bulletin
      await db.delete(bulletins).where(eq(bulletins.id, id))

      console.log(`🗑️ Permanently deleted bulletin: ${existing.title}`)
      return NextResponse.json({ success: true, id })

    } else if (type === "row") {
      // Check if row is in trash
      const [existing] = await db
        .select()
        .from(rundownRows)
        .where(and(eq(rundownRows.id, id), isNotNull(rundownRows.deletedAt)))
        .limit(1)

      if (!existing) {
        return NextResponse.json({ error: "Row not found in trash" }, { status: 404 })
      }

      // Delete segments first
      await db.delete(rowSegments).where(eq(rowSegments.rowId, id))

      // Delete the row
      await db.delete(rundownRows).where(eq(rundownRows.id, id))

      console.log(`🗑️ Permanently deleted row: ${existing.slug}`)
      return NextResponse.json({ success: true, id })
    }

    return NextResponse.json({ error: "Invalid type" }, { status: 400 })
  } catch (error) {
    console.error("Permanent delete error:", error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.message },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: "Failed to permanently delete item" },
      { status: 500 }
    )
  }
}