// ============================================================================
// File: app/api/segments/[id]/route.ts
// ============================================================================

import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth-config"
import db from "@/db"
import { rowSegments } from "@/db/schema"
import { eq } from "drizzle-orm"
import { z } from "zod"

const updateSegmentSchema = z.object({
  name: z.string().min(1).max(50).optional(),
  type: z
    .enum(["LIVE", "PKG", "VO", "VOSOT", "SOT", "READER", "GRAPHIC", "VT", "IV", "PHONER", "WEATHER", "SPORTS"])
    .optional(),
  description: z.string().optional(),
  estDurationSecs: z.number().optional(),
  sortOrder: z.number().optional(),
})

// GET - Get single segment
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const [segment] = await db
      .select()
      .from(rowSegments)
      .where(eq(rowSegments.id, id))
      .limit(1)

    if (!segment) {
      return NextResponse.json({ error: "Segment not found" }, { status: 404 })
    }

    return NextResponse.json({ segment })
  } catch (error) {
    console.error("Get segment error:", error)
    return NextResponse.json(
      { error: "Failed to get segment", details: String(error) },
      { status: 500 }
    )
  }
}

// PATCH - Update segment
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth.api.getSession({ headers: request.headers })
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const data = updateSegmentSchema.parse(body)

    // Build update object
    const updateData: Record<string, unknown> = {}
    if (data.name !== undefined) updateData.name = data.name.toUpperCase()
    if (data.type !== undefined) updateData.type = data.type
    if (data.description !== undefined) updateData.description = data.description
    if (data.estDurationSecs !== undefined) updateData.estDurationSecs = data.estDurationSecs
    if (data.sortOrder !== undefined) updateData.sortOrder = data.sortOrder

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 })
    }

    const [updated] = await db
      .update(rowSegments)
      .set(updateData)
      .where(eq(rowSegments.id, id))
      .returning()

    if (!updated) {
      return NextResponse.json({ error: "Segment not found" }, { status: 404 })
    }

    return NextResponse.json({ segment: updated })
  } catch (error) {
    console.error("Update segment error:", error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: "Failed to update segment", details: String(error) },
      { status: 500 }
    )
  }
}

// DELETE - Delete segment
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth.api.getSession({ headers: request.headers })
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params

    // Get segment to find rowId
    const [segment] = await db
      .select()
      .from(rowSegments)
      .where(eq(rowSegments.id, id))
      .limit(1)

    if (!segment) {
      return NextResponse.json({ error: "Segment not found" }, { status: 404 })
    }

    // Check if last segment
    const allSegments = await db
      .select({ id: rowSegments.id })
      .from(rowSegments)
      .where(eq(rowSegments.rowId, segment.rowId))

    if (allSegments.length <= 1) {
      return NextResponse.json(
        { error: "Cannot delete the last segment" },
        { status: 400 }
      )
    }

    await db.delete(rowSegments).where(eq(rowSegments.id, id))

    return NextResponse.json({ success: true, message: "Segment deleted" })
  } catch (error) {
    console.error("Delete segment error:", error)
    return NextResponse.json(
      { error: "Failed to delete segment", details: String(error) },
      { status: 500 }
    )
  }
}
