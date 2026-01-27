// ============================================================================
// File: app/api/bulletins/[id]/route.ts
// Description: Single bulletin API endpoints - get, update, delete
// ============================================================================

import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth-config"
import db from "@/db"
import { bulletins, rundownRows, user } from "@/db/schema"
import { eq, asc, isNull, and } from "drizzle-orm"

// Helper to format duration
function formatDuration(seconds: number | null | undefined): string {
  if (!seconds) return "0:00"
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, "0")}`
}

// GET - Get single bulletin with rows
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

    // Get bulletin (exclude soft-deleted)
    const [bulletin] = await db
      .select()
      .from(bulletins)
      .where(and(eq(bulletins.id, id), isNull(bulletins.deletedAt)))
      .limit(1)

    if (!bulletin) {
      return NextResponse.json({ error: "Bulletin not found" }, { status: 404 })
    }

    // Get rows with lastModifiedBy user info (exclude soft-deleted rows)
    const rows = await db
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
        status: rundownRows.status,
        script: rundownRows.script,
        notes: rundownRows.notes,
        lastModifiedBy: rundownRows.lastModifiedBy,
        createdAt: rundownRows.createdAt,
        updatedAt: rundownRows.updatedAt,
        // Join user name for lastModifiedBy
        lastModifiedByName: user.name,
      })
      .from(rundownRows)
      .leftJoin(user, eq(rundownRows.lastModifiedBy, user.id))
      .where(and(eq(rundownRows.bulletinId, id), isNull(rundownRows.deletedAt)))
      .orderBy(asc(rundownRows.sortOrder))

    // Format rows with display values
    // Note: createdByName uses lastModifiedByName as fallback since createdBy column doesn't exist
    const formattedRows = rows.map((row) => ({
      ...row,
      estDurationDisplay: formatDuration(row.estDurationSecs),
      actualDurationDisplay: row.actualDurationSecs
        ? formatDuration(row.actualDurationSecs)
        : "",
      frontTimeDisplay: formatDuration(row.frontTimeSecs),
      cumeTimeDisplay: formatDuration(row.cumeTimeSecs),
      lastModifiedByName: row.lastModifiedByName || "SYSTEM",
      // Use lastModifiedByName as createdByName fallback (or could derive from bulletin creator)
      createdByName: row.lastModifiedByName || "SYSTEM",
    }))

    return NextResponse.json({
      bulletin,
      rows: formattedRows,
    })
  } catch (error) {
    console.error("Get bulletin error:", error)
    return NextResponse.json(
      { 
        error: "Failed to get bulletin",
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    )
  }
}

// PUT - Update bulletin
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

    // Check if bulletin exists
    const [existingBulletin] = await db
      .select()
      .from(bulletins)
      .where(eq(bulletins.id, id))
      .limit(1)

    if (!existingBulletin) {
      return NextResponse.json({ error: "Bulletin not found" }, { status: 404 })
    }

    // Build update data
    const updateData: Record<string, unknown> = {
      updatedAt: new Date(),
    }

    const allowedFields = [
      "title",
      "subtitle",
      "code",
      "airDate",
      "startTime",
      "endTime",
      "plannedDurationSecs",
      "totalEstDurationSecs",
      "totalActualDurationSecs",
      "totalCommercialSecs",
      "timingVarianceSecs",
      "status",
      "isLocked",
      "producerId",
      "deskId",
      "notes",
    ]

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field]
      }
    }

    const [updatedBulletin] = await db
      .update(bulletins)
      .set(updateData)
      .where(eq(bulletins.id, id))
      .returning()

    return NextResponse.json(updatedBulletin)
  } catch (error) {
    console.error("Update bulletin error:", error)
    return NextResponse.json(
      { error: "Failed to update bulletin" },
      { status: 500 }
    )
  }
}

// DELETE - Soft delete bulletin (moves to trash for 7 days)
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

    // Check if bulletin exists
    const [existingBulletin] = await db
      .select()
      .from(bulletins)
      .where(eq(bulletins.id, id))
      .limit(1)

    if (!existingBulletin) {
      return NextResponse.json({ error: "Bulletin not found" }, { status: 404 })
    }

    // Soft delete bulletin (set deletedAt and deletedBy)
    const [deletedBulletin] = await db
      .update(bulletins)
      .set({
        deletedAt: new Date(),
        deletedBy: session.user.id,
        updatedAt: new Date(),
      })
      .where(eq(bulletins.id, id))
      .returning()

    console.log(`🗑️ Soft deleted bulletin: ${deletedBulletin.title} (will be permanently deleted in 7 days)`)

    return NextResponse.json({ 
      success: true, 
      id,
      message: "Bulletin moved to trash. It will be permanently deleted in 7 days.",
    })
  } catch (error) {
    console.error("Delete bulletin error:", error)
    return NextResponse.json(
      { error: "Failed to delete bulletin" },
      { status: 500 }
    )
  }
}