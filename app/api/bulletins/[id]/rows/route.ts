import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth-config"
import db from "@/db"
import { rundownRows, user } from "@/db/schema"
import { eq, asc, max } from "drizzle-orm"
import { z } from "zod"

// Helper to format duration
function formatDuration(seconds: number | null | undefined): string {
  if (!seconds) return "0:00"
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, "0")}`
}

const createRowSchema = z.object({
  blockCode: z.string().min(1).max(5),
  rowType: z.enum(["STORY", "COMMERCIAL", "BREAK_LINK", "OPEN", "CLOSE", "WELCOME"]).optional().default("STORY"),
  slug: z.string().optional(),
  segment: z.string().optional(),
  estDurationSecs: z.number().int().min(0).optional().default(90),
  reporterId: z.string().optional(),
  storyProducerId: z.string().optional(),
  insertAfter: z.string().uuid().optional(),
  insertAtPosition: z.number().int().min(0).optional(),
  status: z.enum(["BLANK", "DRAFT", "READY", "APPROVED", "KILLED", "AIRED"]).optional().default("BLANK"),
})

// GET - List all rows for a bulletin
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth.api.getSession({ headers: request.headers })
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id: bulletinId } = await params

    // Get rows with user info
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
        lastModifiedByName: user.name,
      })
      .from(rundownRows)
      .leftJoin(user, eq(rundownRows.lastModifiedBy, user.id))
      .where(eq(rundownRows.bulletinId, bulletinId))
      .orderBy(asc(rundownRows.sortOrder))

    // Format rows with display values
    const formattedRows = rows.map((row) => ({
      ...row,
      estDurationDisplay: formatDuration(row.estDurationSecs),
      actualDurationDisplay: row.actualDurationSecs
        ? formatDuration(row.actualDurationSecs)
        : "",
      frontTimeDisplay: formatDuration(row.frontTimeSecs),
      cumeTimeDisplay: formatDuration(row.cumeTimeSecs),
      lastModifiedByName: row.lastModifiedByName || "SYSTEM",
    }))

    return NextResponse.json({ rows: formattedRows })
  } catch (error) {
    console.error("List rows error:", error)
    return NextResponse.json(
      { error: "Failed to list rows" },
      { status: 500 }
    )
  }
}

// POST - Create a new row in bulletin
export async function POST(
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
    const validatedData = createRowSchema.parse(body)

    // Get max sort order for this bulletin
    const [maxSortResult] = await db
      .select({ maxSort: max(rundownRows.sortOrder) })
      .from(rundownRows)
      .where(eq(rundownRows.bulletinId, bulletinId))

    const nextSortOrder = (maxSortResult?.maxSort ?? -1) + 1

    // Count existing rows in this block to generate page code
    const existingRowsInBlock = await db
      .select({ id: rundownRows.id })
      .from(rundownRows)
      .where(eq(rundownRows.bulletinId, bulletinId))

    // Count rows with same block code
    const blockRows = existingRowsInBlock.length
    const pageNumber = blockRows + 1
    const pageCode = `${validatedData.blockCode}${pageNumber}`

    // Create the row
    const [newRow] = await db
      .insert(rundownRows)
      .values({
        bulletinId,
        blockCode: validatedData.blockCode,
        pageCode,
        pageNumber,
        sortOrder: nextSortOrder,
        rowType: validatedData.rowType,
        slug: validatedData.slug || "",
        segment: validatedData.segment || "LIVE",
        estDurationSecs: validatedData.estDurationSecs,
        storyProducerId: validatedData.storyProducerId || null,
        reporterId: validatedData.reporterId || null,
        status: validatedData.status,
        lastModifiedBy: session.user.id,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning()

    console.log(`✅ Created row ${newRow.id} in bulletin ${bulletinId}`)

    return NextResponse.json(newRow, { status: 201 })
  } catch (error) {
    console.error("Create row error:", error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.message },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: "Failed to create row" },
      { status: 500 }
    )
  }
}