// ============================================================================
// File: app/api/bulletins/[id]/rows/reorder/route.ts
// Description: Reorder rows within a bulletin
// ============================================================================

import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth-config"
import db from "@/db"
import { bulletins, rundownRows, user } from "@/db/schema"
import { eq, inArray } from "drizzle-orm"
import { z } from "zod"

const reorderSchema = z.object({
  rows: z.array(
    z.object({
      id: z.string().uuid(),
      sortOrder: z.number().int().min(0),
      pageCode: z.string().optional(),
      blockCode: z.string().optional(),
    })
  ),
})

// PUT - Reorder rows
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth.api.getSession({ headers: request.headers })
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id: bulletinId } = await params
    const body = await request.json()
    const { rows: rowUpdates } = reorderSchema.parse(body)

    // Check if bulletin exists
    const [bulletin] = await db
      .select()
      .from(bulletins)
      .where(eq(bulletins.id, bulletinId))
      .limit(1)

    if (!bulletin) {
      return NextResponse.json({ error: "Bulletin not found" }, { status: 404 })
    }

    // Check if bulletin is locked by another user
    if (bulletin.isLocked && bulletin.lockedBy !== session.user.id) {
      return NextResponse.json(
        { error: "Bulletin is locked by another user" },
        { status: 423 }
      )
    }

    // Update each row's sort order, page code, and block code
    const updatePromises = rowUpdates.map(async (row) => {
      const updateData: Record<string, unknown> = {
        sortOrder: row.sortOrder,
        lastModifiedBy: session.user.id,
      }

      if (row.pageCode) {
        updateData.pageCode = row.pageCode
      }

      if (row.blockCode) {
        updateData.blockCode = row.blockCode
      }

      return db
        .update(rundownRows)
        .set(updateData)
        .where(eq(rundownRows.id, row.id))
    })

    await Promise.all(updatePromises)

    // Fetch updated rows with user names
    const rowIds = rowUpdates.map((r) => r.id)
    const updatedRows = await db
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
        estDurationSecs: rundownRows.estDurationSecs,
        actualDurationSecs: rundownRows.actualDurationSecs,
        frontTimeSecs: rundownRows.frontTimeSecs,
        cumeTimeSecs: rundownRows.cumeTimeSecs,
        float: rundownRows.float,
        status: rundownRows.status,
        lastModifiedBy: rundownRows.lastModifiedBy,
        createdAt: rundownRows.createdAt,
        updatedAt: rundownRows.updatedAt,
        lastModifiedByName: user.name,
      })
      .from(rundownRows)
      .leftJoin(user, eq(rundownRows.lastModifiedBy, user.id))
      .where(inArray(rundownRows.id, rowIds))

    // Recalculate cumulative times
    const allRows = await db
      .select()
      .from(rundownRows)
      .where(eq(rundownRows.bulletinId, bulletinId))
      .orderBy(rundownRows.sortOrder)

    let cumeTime = 0
    const timeUpdates = allRows.map(async (row, index) => {
      const frontTime = cumeTime
      cumeTime += row.estDurationSecs || 0

      return db
        .update(rundownRows)
        .set({
          frontTimeSecs: frontTime,
          cumeTimeSecs: cumeTime,
          pageNumber: index + 1,
        })
        .where(eq(rundownRows.id, row.id))
    })

    await Promise.all(timeUpdates)

    // Calculate totals for bulletin
    const totalEstDuration = allRows.reduce((sum, row) => sum + (row.estDurationSecs || 0), 0)
    const totalActualDuration = allRows.reduce((sum, row) => sum + (row.actualDurationSecs || 0), 0)
    const commercialRows = allRows.filter((row) => row.rowType === "COMMERCIAL")
    const totalCommercial = commercialRows.reduce((sum, row) => sum + (row.estDurationSecs || 0), 0)
    const timingVariance = bulletin.plannedDurationSecs - totalEstDuration

    // Update bulletin totals
    await db
      .update(bulletins)
      .set({
        totalEstDurationSecs: totalEstDuration,
        totalActualDurationSecs: totalActualDuration || null,
        totalCommercialSecs: totalCommercial,
        timingVarianceSecs: timingVariance,
      })
      .where(eq(bulletins.id, bulletinId))

    console.log(`✅ Reordered ${rowUpdates.length} rows in bulletin ${bulletinId}`)

    return NextResponse.json({
      rows: updatedRows,
      totals: {
        totalEstDurationSecs: totalEstDuration,
        totalActualDurationSecs: totalActualDuration,
        totalCommercialSecs: totalCommercial,
        timingVarianceSecs: timingVariance,
      },
    })
  } catch (error) {
    console.error("Reorder rows error:", error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: "Failed to reorder rows", details: String(error) },
      { status: 500 }
    )
  }
}