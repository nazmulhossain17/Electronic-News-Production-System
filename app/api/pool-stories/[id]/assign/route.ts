import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { poolStories, bulletins, rundownRows } from "@/lib/schema"
import { eq, asc } from "drizzle-orm"
import { requireRole } from "@/lib/auth"
import {
  successResponse,
  errorResponse,
  notFoundResponse,
  forbiddenResponse,
  serverErrorResponse,
  validationErrorResponse,
} from "@/lib/api-response"
import { assignPoolStorySchema } from "@/lib/validations"
import {
  recalculateRundownTiming,
  generateNextPageCode,
  getNextSortOrder,
  shiftSortOrders,
  logActivity,
} from "@/lib/rundown-service"

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * POST /api/pool-stories/[id]/assign
 * Assign a pool story to a bulletin
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const authResult = await requireRole(request, ["ADMIN", "PRODUCER", "EDITOR"])
    if ("error" in authResult) return authResult.error

    const { user: currentUser } = authResult
    const { id } = await params

    // Get pool story
    const storyResult = await db
      .select()
      .from(poolStories)
      .where(eq(poolStories.id, id))
      .limit(1)

    if (storyResult.length === 0) {
      return notFoundResponse("Pool story")
    }

    const story = storyResult[0]

    // Check if already assigned
    if (story.assignedToBulletinId) {
      return errorResponse("Story is already assigned to a bulletin", 400)
    }

    const body = await request.json()
    const validation = assignPoolStorySchema.safeParse(body)

    if (!validation.success) {
      return validationErrorResponse(validation.error)
    }

    const { bulletinId, blockCode, insertAfter, insertAtPosition } = validation.data

    // Check bulletin exists and not locked
    const bulletinResult = await db
      .select()
      .from(bulletins)
      .where(eq(bulletins.id, bulletinId))
      .limit(1)

    if (bulletinResult.length === 0) {
      return notFoundResponse("Bulletin")
    }

    const bulletin = bulletinResult[0]

    if (bulletin.isLocked && bulletin.lockedBy !== currentUser.id) {
      return forbiddenResponse("Bulletin is locked")
    }

    // Get existing rows for page code generation
    const existingRows = await db
      .select({ pageCode: rundownRows.pageCode, sortOrder: rundownRows.sortOrder })
      .from(rundownRows)
      .where(eq(rundownRows.bulletinId, bulletinId))
      .orderBy(asc(rundownRows.sortOrder))

    const existingPageCodes = existingRows.map((r) => r.pageCode)

    // Generate page code
    const pageCode = generateNextPageCode(blockCode, existingPageCodes)
    const match = pageCode.match(/(\d+)$/)
    const pageNumber = match ? parseInt(match[1], 10) : 1

    // Determine sort order
    let sortOrder: number

    if (insertAfter) {
      const afterRow = existingRows.find((r) => r.pageCode === insertAfter)
      if (afterRow) {
        sortOrder = afterRow.sortOrder + 1
        await shiftSortOrders(bulletinId, sortOrder)
      } else {
        sortOrder = await getNextSortOrder(bulletinId)
      }
    } else if (insertAtPosition !== undefined) {
      sortOrder = insertAtPosition
      await shiftSortOrders(bulletinId, sortOrder)
    } else {
      sortOrder = await getNextSortOrder(bulletinId)
    }

    // Create rundown row from pool story
    const [newRow] = await db
      .insert(rundownRows)
      .values({
        bulletinId,
        pageCode,
        blockCode,
        pageNumber,
        sortOrder,
        rowType: "STORY",
        slug: story.slug,
        segment: story.segment,
        reporterId: story.reporterId,
        storyProducerId: story.producerId,
        estDurationSecs: story.estDurationSecs,
        status: story.status,
        script: story.script,
        notes: story.notes,
        categoryId: story.categoryId,
        sourcePoolId: story.poolId,
        createdBy: currentUser.id,
        lastModifiedBy: currentUser.id,
      })
      .returning()

    // Update pool story to mark as assigned
    await db
      .update(poolStories)
      .set({
        assignedToBulletinId: bulletinId,
        assignedToRowId: newRow.id,
        assignedAt: new Date(),
        lastModifiedBy: currentUser.id,
      })
      .where(eq(poolStories.id, id))

    // Recalculate timing
    await recalculateRundownTiming(bulletinId)

    // Log activity
    await logActivity(currentUser.id, "STORY_ASSIGNED", "ROW", newRow.id, {
      bulletinId,
      rowId: newRow.id,
      description: `Assigned pool story to ${pageCode}: ${story.slug}`,
    })

    return successResponse(
      {
        row: newRow,
        pageCode,
      },
      "Story assigned to bulletin successfully"
    )
  } catch (error) {
    return serverErrorResponse(error)
  }
}
