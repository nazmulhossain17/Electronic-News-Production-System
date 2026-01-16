// ============================================================================
// File: app/api/rows/[id]/route.ts
// Description: Get, update, delete individual rundown row
// ============================================================================

import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth-config"
import db from "@/db"
import { rundownRows, user } from "@/db/schema"
import { eq } from "drizzle-orm"
import { z } from "zod"

const updateRowSchema = z.object({
  slug: z.string().optional(),
  segment: z.string().optional(),
  storyProducerId: z.string().nullable().optional(),
  reporterId: z.string().nullable().optional(),
  estDurationSecs: z.number().optional(),
  actualDurationSecs: z.number().nullable().optional(),
  float: z.boolean().optional(),
  status: z.enum(["BLANK", "DRAFT", "READY", "APPROVED", "KILLED", "AIRED"]).optional(),
  script: z.string().optional(),
  notes: z.string().optional(),
  categoryId: z.string().nullable().optional(),
})

// GET - Get single row
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const [row] = await db
      .select({
        id: rundownRows.id,
        bulletinId: rundownRows.bulletinId,
        pageCode: rundownRows.pageCode,
        blockCode: rundownRows.blockCode,
        pageNumber: rundownRows.pageNumber,
        sortOrder: rundownRows.sortOrder,
        rowType: rundownRows.rowType,
        slug: rundownRows.slug,
        segment: rundownRows.segment,
        storyProducerId: rundownRows.storyProducerId,
        reporterId: rundownRows.reporterId,
        categoryId: rundownRows.categoryId,
        finalApproval: rundownRows.finalApproval,
        approvedBy: rundownRows.approvedBy,
        approvedAt: rundownRows.approvedAt,
        estDurationSecs: rundownRows.estDurationSecs,
        actualDurationSecs: rundownRows.actualDurationSecs,
        frontTimeSecs: rundownRows.frontTimeSecs,
        cumeTimeSecs: rundownRows.cumeTimeSecs,
        float: rundownRows.float,
        breakNumber: rundownRows.breakNumber,
        status: rundownRows.status,
        script: rundownRows.script,
        notes: rundownRows.notes,
        lastModifiedBy: rundownRows.lastModifiedBy,
        createdAt: rundownRows.createdAt,
        updatedAt: rundownRows.updatedAt,
        lastModifiedByName: user.name,
      })
      .from(rundownRows)
      .leftJoin(user, eq(rundownRows.lastModifiedBy, user.id))
      .where(eq(rundownRows.id, id))
      .limit(1)

    if (!row) {
      return NextResponse.json({ error: "Row not found" }, { status: 404 })
    }

    return NextResponse.json({ row })
  } catch (error) {
    console.error("Get row error:", error)
    return NextResponse.json(
      { error: "Failed to get row", details: String(error) },
      { status: 500 }
    )
  }
}

// PUT - Update row
export async function PUT(
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
    const data = updateRowSchema.parse(body)

    // Build update object
    const updateData: Record<string, unknown> = {
      lastModifiedBy: session.user.id, // Always update this
    }

    if (data.slug !== undefined) updateData.slug = data.slug
    if (data.segment !== undefined) updateData.segment = data.segment
    if (data.storyProducerId !== undefined) updateData.storyProducerId = data.storyProducerId
    if (data.reporterId !== undefined) updateData.reporterId = data.reporterId
    if (data.estDurationSecs !== undefined) updateData.estDurationSecs = data.estDurationSecs
    if (data.actualDurationSecs !== undefined) updateData.actualDurationSecs = data.actualDurationSecs
    if (data.float !== undefined) updateData.float = data.float
    if (data.status !== undefined) updateData.status = data.status
    if (data.script !== undefined) updateData.script = data.script
    if (data.notes !== undefined) updateData.notes = data.notes
    if (data.categoryId !== undefined) updateData.categoryId = data.categoryId

    const [updated] = await db
      .update(rundownRows)
      .set(updateData)
      .where(eq(rundownRows.id, id))
      .returning()

    if (!updated) {
      return NextResponse.json({ error: "Row not found" }, { status: 404 })
    }

    // Get user name for the response
    const [userRecord] = await db
      .select({ name: user.name })
      .from(user)
      .where(eq(user.id, session.user.id))
      .limit(1)

    console.log(`✅ Row ${id} updated by ${userRecord?.name || session.user.id}`)

    return NextResponse.json({
      ...updated,
      lastModifiedByName: userRecord?.name || session.user.name || "Unknown",
    })
  } catch (error) {
    console.error("Update row error:", error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: "Failed to update row", details: String(error) },
      { status: 500 }
    )
  }
}

// DELETE - Delete row
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

    // Check if row exists
    const [existing] = await db
      .select()
      .from(rundownRows)
      .where(eq(rundownRows.id, id))
      .limit(1)

    if (!existing) {
      return NextResponse.json({ error: "Row not found" }, { status: 404 })
    }

    // Delete (segments will cascade)
    await db.delete(rundownRows).where(eq(rundownRows.id, id))

    console.log(`✅ Row ${id} deleted`)

    return NextResponse.json({ id, message: "Row deleted" })
  } catch (error) {
    console.error("Delete row error:", error)
    return NextResponse.json(
      { error: "Failed to delete row", details: String(error) },
      { status: 500 }
    )
  }
}