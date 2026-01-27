// ============================================================================
// File: app/api/trash/restore/route.ts
// Description: API route for restoring soft-deleted items
// ============================================================================

import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth-config"
import db from "@/db"
import { bulletins, rundownRows } from "@/db/schema"
import { eq } from "drizzle-orm"
import { z } from "zod"

const restoreSchema = z.object({
  type: z.enum(["bulletin", "row"]),
  id: z.string().uuid(),
})

// POST - Restore a deleted item (Admin only)
export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers })
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Only admins can restore items
    const userRole = (session.user as { role?: string }).role
    if (userRole !== "ADMIN") {
      return NextResponse.json({ error: "Admin access required to restore items" }, { status: 403 })
    }

    const body = await request.json()
    const { type, id } = restoreSchema.parse(body)

    if (type === "bulletin") {
      // Restore bulletin
      const [restored] = await db
        .update(bulletins)
        .set({
          deletedAt: null,
          deletedBy: null,
          updatedAt: new Date(),
        })
        .where(eq(bulletins.id, id))
        .returning()

      if (!restored) {
        return NextResponse.json({ error: "Bulletin not found" }, { status: 404 })
      }

      console.log(`✅ Restored bulletin: ${restored.title}`)
      return NextResponse.json({ success: true, data: restored })

    } else if (type === "row") {
      // Restore row
      const [restored] = await db
        .update(rundownRows)
        .set({
          deletedAt: null,
          deletedBy: null,
          updatedAt: new Date(),
        })
        .where(eq(rundownRows.id, id))
        .returning()

      if (!restored) {
        return NextResponse.json({ error: "Row not found" }, { status: 404 })
      }

      console.log(`✅ Restored row: ${restored.slug}`)
      return NextResponse.json({ success: true, data: restored })
    }

    return NextResponse.json({ error: "Invalid type" }, { status: 400 })
  } catch (error) {
    console.error("Restore error:", error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.message },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: "Failed to restore item" },
      { status: 500 }
    )
  }
}