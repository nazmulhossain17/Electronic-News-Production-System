// ============================================================================
// File: app/api/bulletins/[id]/route.ts
// Description: Get, update, delete individual bulletin
// ============================================================================

import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth-config"
import db from "@/db"
import { bulletins, rundownRows, user } from "@/db/schema"
import { eq, asc } from "drizzle-orm"
import { z } from "zod"

// Helper to format duration
function formatDuration(secs: number): string {
  if (!secs) return "0:00"
  const mins = Math.floor(secs / 60)
  const seconds = Math.floor(secs % 60)
  return `${mins}:${seconds.toString().padStart(2, "0")}`
}

// Helper to format time from seconds
function formatTimeFromSecs(baseSecs: number): string {
  const hours = Math.floor(baseSecs / 3600)
  const mins = Math.floor((baseSecs % 3600) / 60)
  return `${hours.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}`
}

// GET - Get bulletin with rows
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Get bulletin
    const [bulletin] = await db
      .select()
      .from(bulletins)
      .where(eq(bulletins.id, id))
      .limit(1)

    if (!bulletin) {
      return NextResponse.json({ error: "Bulletin not found" }, { status: 404 })
    }

    // Get rows with user names using left joins
    const rowsWithUsers = await db
      .select({
        // All row fields
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
        mosId: rundownRows.mosId,
        mosObjSlug: rundownRows.mosObjSlug,
        mosObjectTime: rundownRows.mosObjectTime,
        mosStatus: rundownRows.mosStatus,
        mosUserDuration: rundownRows.mosUserDuration,
        estDurationSecs: rundownRows.estDurationSecs,
        actualDurationSecs: rundownRows.actualDurationSecs,
        frontTimeSecs: rundownRows.frontTimeSecs,
        cumeTimeSecs: rundownRows.cumeTimeSecs,
        float: rundownRows.float,
        breakNumber: rundownRows.breakNumber,
        status: rundownRows.status,
        script: rundownRows.script,
        notes: rundownRows.notes,
        sourcePoolStoryId: rundownRows.sourcePoolStoryId,
        lastModifiedBy: rundownRows.lastModifiedBy,
        createdBy: rundownRows.createdBy,
        createdAt: rundownRows.createdAt,
        updatedAt: rundownRows.updatedAt,
        // Joined user names
        lastModifiedByName: user.name,
      })
      .from(rundownRows)
      .leftJoin(user, eq(rundownRows.lastModifiedBy, user.id))
      .where(eq(rundownRows.bulletinId, id))
      .orderBy(asc(rundownRows.sortOrder))

    // Format rows with display fields
    const formattedRows = rowsWithUsers.map((row) => ({
      ...row,
      estDurationDisplay: formatDuration(row.estDurationSecs),
      actualDurationDisplay: row.actualDurationSecs 
        ? formatDuration(row.actualDurationSecs) 
        : "",
      frontTimeDisplay: row.frontTimeSecs 
        ? formatTimeFromSecs(row.frontTimeSecs) 
        : "",
      cumeTimeDisplay: formatDuration(row.cumeTimeSecs),
      lastModifiedByName: row.lastModifiedByName || "SYSTEM",
    }))

    // Get producer name if exists
    let producerName: string | undefined
    if (bulletin.producerId) {
      const [producer] = await db
        .select({ name: user.name })
        .from(user)
        .where(eq(user.id, bulletin.producerId))
        .limit(1)
      producerName = producer?.name
    }

    return NextResponse.json({
      bulletin: {
        ...bulletin,
        producerName,
      },
      rows: formattedRows,
    })
  } catch (error) {
    console.error("Get bulletin error:", error)
    return NextResponse.json(
      { error: "Failed to get bulletin", details: String(error) },
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
    const [existing] = await db
      .select()
      .from(bulletins)
      .where(eq(bulletins.id, id))
      .limit(1)

    if (!existing) {
      return NextResponse.json({ error: "Bulletin not found" }, { status: 404 })
    }

    // Check if locked by another user
    if (existing.isLocked && existing.lockedBy !== session.user.id) {
      return NextResponse.json(
        { error: "Bulletin is locked by another user" },
        { status: 423 }
      )
    }

    // Build update object
    const updateData: Record<string, unknown> = {}
    
    if (body.title !== undefined) updateData.title = body.title
    if (body.subtitle !== undefined) updateData.subtitle = body.subtitle
    if (body.code !== undefined) updateData.code = body.code
    if (body.airDate !== undefined) updateData.airDate = new Date(body.airDate)
    if (body.startTime !== undefined) updateData.startTime = body.startTime
    if (body.endTime !== undefined) updateData.endTime = body.endTime
    if (body.plannedDurationSecs !== undefined) updateData.plannedDurationSecs = body.plannedDurationSecs
    if (body.status !== undefined) updateData.status = body.status
    if (body.producerId !== undefined) updateData.producerId = body.producerId
    if (body.deskId !== undefined) updateData.deskId = body.deskId
    if (body.notes !== undefined) updateData.notes = body.notes

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 })
    }

    const [updated] = await db
      .update(bulletins)
      .set(updateData)
      .where(eq(bulletins.id, id))
      .returning()

    return NextResponse.json({ bulletin: updated })
  } catch (error) {
    console.error("Update bulletin error:", error)
    return NextResponse.json(
      { error: "Failed to update bulletin", details: String(error) },
      { status: 500 }
    )
  }
}

// DELETE - Delete bulletin
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
    const [existing] = await db
      .select()
      .from(bulletins)
      .where(eq(bulletins.id, id))
      .limit(1)

    if (!existing) {
      return NextResponse.json({ error: "Bulletin not found" }, { status: 404 })
    }

    // Check if locked
    if (existing.isLocked) {
      return NextResponse.json(
        { error: "Cannot delete locked bulletin" },
        { status: 423 }
      )
    }

    // Delete (rows will cascade)
    await db.delete(bulletins).where(eq(bulletins.id, id))

    return NextResponse.json({ id, message: "Bulletin deleted" })
  } catch (error) {
    console.error("Delete bulletin error:", error)
    return NextResponse.json(
      { error: "Failed to delete bulletin", details: String(error) },
      { status: 500 }
    )
  }
}