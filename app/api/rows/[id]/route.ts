// ============================================================================
// File: app/api/rows/[id]/route.ts
// Description: API route for individual row CRUD operations
// ============================================================================

import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth-config"
import db from "@/db"
import { rundownRows, rowSegments } from "@/db/schema"
import { eq } from "drizzle-orm"
import { z } from "zod"

const updateRowSchema = z.object({
  slug: z.string().optional(),
  segment: z.string().optional(),
  rowType: z.enum(["STORY", "COMMERCIAL", "BREAK_LINK", "OPEN", "CLOSE", "WELCOME"]).optional(),
  status: z.enum(["BLANK", "DRAFT", "READY", "APPROVED", "KILLED", "AIRED"]).optional(),
  storyProducerId: z.string().optional().nullable(),
  storyProducer: z.string().optional().nullable(), // New: producer name as text
  reporterId: z.string().optional().nullable(),
  categoryId: z.string().uuid().optional().nullable(),
  estDurationSecs: z.number().int().min(0).optional(),
  actualDurationSecs: z.number().int().min(0).optional().nullable(),
  frontTime: z.string().optional().nullable(), // New: front time as text (H:MM:SS)
  float: z.boolean().optional(),
  finalApproval: z.boolean().optional(),
  script: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
})

// GET - Get single row
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth.api.getSession({ headers: request.headers })
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params

    const [row] = await db
      .select()
      .from(rundownRows)
      .where(eq(rundownRows.id, id))
      .limit(1)

    if (!row) {
      return NextResponse.json({ error: "Row not found" }, { status: 404 })
    }

    return NextResponse.json(row)
  } catch (error) {
    console.error("Get row error:", error)
    return NextResponse.json(
      { error: "Failed to get row" },
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
    const validatedData = updateRowSchema.parse(body)

    // Check if row exists
    const [existingRow] = await db
      .select()
      .from(rundownRows)
      .where(eq(rundownRows.id, id))
      .limit(1)

    if (!existingRow) {
      return NextResponse.json({ error: "Row not found" }, { status: 404 })
    }

    // Build update object
    const updateData: Record<string, unknown> = {
      lastModifiedBy: session.user.id,
      updatedAt: new Date(),
    }

    if (validatedData.slug !== undefined) {
      updateData.slug = validatedData.slug
    }
    if (validatedData.segment !== undefined) {
      updateData.segment = validatedData.segment
    }
    if (validatedData.rowType !== undefined) {
      updateData.rowType = validatedData.rowType
    }
    if (validatedData.status !== undefined) {
      updateData.status = validatedData.status
    }
    if (validatedData.storyProducerId !== undefined) {
      updateData.storyProducerId = validatedData.storyProducerId
    }
    if (validatedData.storyProducer !== undefined) {
      updateData.storyProducer = validatedData.storyProducer
    }
    if (validatedData.reporterId !== undefined) {
      updateData.reporterId = validatedData.reporterId
    }
    if (validatedData.categoryId !== undefined) {
      updateData.categoryId = validatedData.categoryId
    }
    if (validatedData.estDurationSecs !== undefined) {
      updateData.estDurationSecs = validatedData.estDurationSecs
    }
    if (validatedData.actualDurationSecs !== undefined) {
      updateData.actualDurationSecs = validatedData.actualDurationSecs
    }
    if (validatedData.frontTime !== undefined) {
      updateData.frontTime = validatedData.frontTime
    }
    if (validatedData.float !== undefined) {
      updateData.float = validatedData.float
    }
    if (validatedData.finalApproval !== undefined) {
      updateData.finalApproval = validatedData.finalApproval
      // Also set approvedBy and approvedAt when approving
      if (validatedData.finalApproval) {
        updateData.approvedBy = session.user.id
        updateData.approvedAt = new Date()
      } else {
        updateData.approvedBy = null
        updateData.approvedAt = null
      }
    }
    if (validatedData.script !== undefined) {
      updateData.script = validatedData.script
    }
    if (validatedData.notes !== undefined) {
      updateData.notes = validatedData.notes
    }

    const [updatedRow] = await db
      .update(rundownRows)
      .set(updateData)
      .where(eq(rundownRows.id, id))
      .returning()

    console.log(`✅ Updated row ${id}:`, Object.keys(validatedData))

    return NextResponse.json(updatedRow)
  } catch (error) {
    console.error("Update row error:", error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: "Failed to update row" },
      { status: 500 }
    )
  }
}

// DELETE - Soft delete row (moves to trash for 7 days)
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
    const [existingRow] = await db
      .select()
      .from(rundownRows)
      .where(eq(rundownRows.id, id))
      .limit(1)

    if (!existingRow) {
      return NextResponse.json({ error: "Row not found" }, { status: 404 })
    }

    // Soft delete the row (set deletedAt and deletedBy)
    const [deletedRow] = await db
      .update(rundownRows)
      .set({
        deletedAt: new Date(),
        deletedBy: session.user.id,
        updatedAt: new Date(),
      })
      .where(eq(rundownRows.id, id))
      .returning()

    console.log(`🗑️ Soft deleted row ${id}: ${deletedRow.slug} (will be permanently deleted in 7 days)`)

    return NextResponse.json({ 
      success: true, 
      id,
      message: "Story moved to trash. It will be permanently deleted in 7 days.",
    })
  } catch (error) {
    console.error("Delete row error:", error)
    return NextResponse.json(
      { error: "Failed to delete row" },
      { status: 500 }
    )
  }
}