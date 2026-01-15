// ============================================================================
// File: app/api/rows/[id]/segments/route.ts
// ============================================================================

import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth-config"
import db from "@/db"
import { rowSegments, rundownRows } from "@/db/schema"
import { eq, asc } from "drizzle-orm"
import { z } from "zod"

const createSegmentSchema = z.object({
  name: z.string().min(1).max(50),
  type: z
    .enum(["LIVE", "PKG", "VO", "VOSOT", "SOT", "READER", "GRAPHIC", "VT", "IV", "PHONER", "WEATHER", "SPORTS"])
    .optional()
    .default("LIVE"),
  description: z.string().optional().default(""),
  estDurationSecs: z.number().optional().default(0),
})

// GET - List all segments for a row
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: rowId } = await params

    const segments = await db
      .select()
      .from(rowSegments)
      .where(eq(rowSegments.rowId, rowId))
      .orderBy(asc(rowSegments.sortOrder))

    return NextResponse.json({ segments })
  } catch (error) {
    console.error("Get segments error:", error)
    return NextResponse.json(
      { error: "Failed to get segments", details: String(error) },
      { status: 500 }
    )
  }
}

// POST - Create new segment
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth.api.getSession({ headers: request.headers })
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id: rowId } = await params
    const body = await request.json()
    const data = createSegmentSchema.parse(body)

    // Check row exists
    const [row] = await db
      .select({ id: rundownRows.id })
      .from(rundownRows)
      .where(eq(rundownRows.id, rowId))
      .limit(1)

    if (!row) {
      return NextResponse.json({ error: "Row not found" }, { status: 404 })
    }

    // Get max sort order
    const existing = await db
      .select({ sortOrder: rowSegments.sortOrder })
      .from(rowSegments)
      .where(eq(rowSegments.rowId, rowId))

    const maxOrder = existing.length > 0 
      ? Math.max(...existing.map((s) => s.sortOrder)) 
      : -1

    // Create segment
    const [newSegment] = await db
      .insert(rowSegments)
      .values({
        rowId,
        name: data.name.toUpperCase(),
        type: data.type,
        description: data.description,
        estDurationSecs: data.estDurationSecs,
        sortOrder: maxOrder + 1,
        createdBy: session.user.id,
      })
      .returning()

    console.log(`✅ Created segment "${newSegment.name}" for row ${rowId}`)

    return NextResponse.json({ segment: newSegment }, { status: 201 })
  } catch (error) {
    console.error("Create segment error:", error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: "Failed to create segment", details: String(error) },
      { status: 500 }
    )
  }
}