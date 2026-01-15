// ============================================================================
// File: lib/rundown-service.ts
// Description: Time calculations, rundown utilities, and service functions
// ============================================================================

import db from "@/db"
import { rundownRows, bulletins, activityLogs } from "@/db/schema"
import { eq, asc, sql } from "drizzle-orm"

// ═══════════════════════════════════════════════════════════════════════════════
// TIME FORMATTING UTILITIES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Convert seconds to MM:SS.xx format (for Est/Actual Duration)
 */
export function secsToMMSS(totalSeconds: number): string {
  if (!totalSeconds || totalSeconds < 0) return "0:00"

  const mins = Math.floor(totalSeconds / 60)
  const secs = totalSeconds % 60
  const wholeSecs = Math.floor(secs)
  const centisecs = Math.round((secs - wholeSecs) * 100)

  if (centisecs > 0) {
    return `${mins}:${wholeSecs.toString().padStart(2, "0")}.${centisecs.toString().padStart(2, "0")}`
  }
  return `${mins}:${wholeSecs.toString().padStart(2, "0")}`
}

/**
 * Convert seconds to HH:MM:SS format (for Front Time - time of day)
 */
export function secsToHHMMSS(totalSeconds: number): string {
  if (!totalSeconds || totalSeconds < 0) return "00:00:00"

  const hours = Math.floor(totalSeconds / 3600)
  const mins = Math.floor((totalSeconds % 3600) / 60)
  const secs = Math.floor(totalSeconds % 60)

  return `${hours.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
}

/**
 * Convert HH:MM or HH:MM:SS string to seconds
 */
export function timeToSecs(timeStr: string): number {
  if (!timeStr) return 0

  const parts = timeStr.split(":").map(Number)

  if (parts.length === 3) {
    // HH:MM:SS
    return parts[0] * 3600 + parts[1] * 60 + parts[2]
  } else if (parts.length === 2) {
    // HH:MM or MM:SS
    if (parts[0] >= 24) {
      // Assume MM:SS if first part is >= 24
      return parts[0] * 60 + parts[1]
    }
    // Assume HH:MM
    return parts[0] * 3600 + parts[1] * 60
  }

  return 0
}

/**
 * Parse MM:SS.xx format to seconds
 */
export function parseMMSS(durationStr: string): number {
  if (!durationStr) return 0

  const [minPart, secPart] = durationStr.split(":")
  if (!secPart) return parseFloat(minPart) || 0

  const mins = parseInt(minPart, 10) || 0
  const secs = parseFloat(secPart) || 0

  return mins * 60 + secs
}

// ═══════════════════════════════════════════════════════════════════════════════
// ROW TIMING CALCULATIONS
// ═══════════════════════════════════════════════════════════════════════════════

interface RowTiming {
  id: string
  estDurationSecs: number
  actualDurationSecs: number | null
  frontTimeSecs: number
  cumeTimeSecs: number
  estDurationDisplay: string
  actualDurationDisplay: string
  frontTimeDisplay: string
  cumeTimeDisplay: string
}

/**
 * Calculate timing for a single row given previous cumulative time
 */
export function calculateRowTimings(
  row: { id: string; estDurationSecs: number; actualDurationSecs?: number | null },
  previousCumeSecs: number,
  bulletinStartSecs: number
): RowTiming {
  const estDuration = row.estDurationSecs || 0
  const actualDuration = row.actualDurationSecs || null

  // Use actual duration if available, otherwise estimated
  const effectiveDuration = actualDuration !== null ? actualDuration : estDuration

  // Front time = bulletin start time + cumulative time before this row
  const frontTimeSecs = bulletinStartSecs + previousCumeSecs

  // Cume time = previous cume + this row's duration
  const cumeTimeSecs = previousCumeSecs + effectiveDuration

  return {
    id: row.id,
    estDurationSecs: estDuration,
    actualDurationSecs: actualDuration,
    frontTimeSecs,
    cumeTimeSecs,
    estDurationDisplay: secsToMMSS(estDuration),
    actualDurationDisplay: actualDuration !== null ? secsToMMSS(actualDuration) : "",
    frontTimeDisplay: secsToHHMMSS(frontTimeSecs),
    cumeTimeDisplay: secsToMMSS(cumeTimeSecs),
  }
}

/**
 * Recalculate all row timings for a bulletin
 */
export async function recalculateRundownTiming(bulletinId: string) {
  // Get bulletin start time
  const bulletinResult = await db
    .select({
      startTime: bulletins.startTime,
      plannedDurationSecs: bulletins.plannedDurationSecs,
    })
    .from(bulletins)
    .where(eq(bulletins.id, bulletinId))
    .limit(1)

  if (bulletinResult.length === 0) {
    throw new Error("Bulletin not found")
  }

  const bulletin = bulletinResult[0]
  const bulletinStartSecs = timeToSecs(bulletin.startTime)

  // Get all rows ordered by sortOrder
  const rows = await db
    .select({
      id: rundownRows.id,
      estDurationSecs: rundownRows.estDurationSecs,
      actualDurationSecs: rundownRows.actualDurationSecs,
      rowType: rundownRows.rowType,
    })
    .from(rundownRows)
    .where(eq(rundownRows.bulletinId, bulletinId))
    .orderBy(asc(rundownRows.sortOrder))

  // Calculate timings
  let cumeSecs = 0
  let totalEstSecs = 0
  let totalActualSecs = 0
  let totalCommercialSecs = 0

  const updatedRows: RowTiming[] = []

  for (const row of rows) {
    const timing = calculateRowTimings(row, cumeSecs, bulletinStartSecs)
    updatedRows.push(timing)

    // Update cumulative
    const effectiveDuration =
      row.actualDurationSecs !== null ? row.actualDurationSecs : row.estDurationSecs || 0
    cumeSecs += effectiveDuration

    // Track totals
    totalEstSecs += row.estDurationSecs || 0
    if (row.actualDurationSecs !== null) {
      totalActualSecs += row.actualDurationSecs
    }
    if (row.rowType === "COMMERCIAL") {
      totalCommercialSecs += effectiveDuration
    }
  }

  // Update each row in database
  for (const timing of updatedRows) {
    await db
      .update(rundownRows)
      .set({
        frontTimeSecs: timing.frontTimeSecs,
        cumeTimeSecs: timing.cumeTimeSecs,
      })
      .where(eq(rundownRows.id, timing.id))
  }

  // Calculate variance
  const plannedDuration = bulletin.plannedDurationSecs || 1800
  const timingVarianceSecs = plannedDuration - (totalEstSecs + totalCommercialSecs)

  // Update bulletin totals
  await db
    .update(bulletins)
    .set({
      totalEstDurationSecs: totalEstSecs,
      totalActualDurationSecs: totalActualSecs > 0 ? totalActualSecs : null,
      totalCommercialSecs,
      timingVarianceSecs,
    })
    .where(eq(bulletins.id, bulletinId))

  return {
    rows: updatedRows,
    totals: {
      totalEstDurationSecs: totalEstSecs,
      totalActualDurationSecs: totalActualSecs > 0 ? totalActualSecs : null,
      totalCommercialSecs,
      timingVarianceSecs,
      varianceDisplay:
        timingVarianceSecs >= 0
          ? `Under ${secsToMMSS(timingVarianceSecs)}`
          : `Over ${secsToMMSS(Math.abs(timingVarianceSecs))}`,
    },
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// TEMPLATE GENERATION
// ═══════════════════════════════════════════════════════════════════════════════

interface TemplateOptions {
  openingDurationSecs?: number
  welcomeDurationSecs?: number
  closingDurationSecs?: number
  commercialDurationSecs?: number
  storyDurationSecs?: number
}

/**
 * Generate standard rundown template for a bulletin
 */
export async function generateRundownTemplate(
  bulletinId: string,
  userId: string,
  options: TemplateOptions = {}
) {
  const {
    openingDurationSecs = 15,
    welcomeDurationSecs = 12,
    closingDurationSecs = 45,
    commercialDurationSecs = 180,
    storyDurationSecs = 90,
  } = options

  // Standard template structure
  const templateRows = [
    // Block A
    { block: "A", page: 1, type: "OPEN", slug: "OPENING TITLES", duration: openingDurationSecs },
    { block: "A", page: 2, type: "WELCOME", slug: "WELCOME", duration: welcomeDurationSecs },
    { block: "A", page: 3, type: "STORY", slug: "", duration: storyDurationSecs },
    { block: "A", page: 4, type: "STORY", slug: "", duration: storyDurationSecs },
    { block: "A", page: 5, type: "STORY", slug: "", duration: storyDurationSecs },
    { block: "A", page: 6, type: "STORY", slug: "", duration: storyDurationSecs },
    { block: "A", page: 7, type: "STORY", slug: "", duration: storyDurationSecs },

    // Block B
    { block: "B", page: 0, type: "COMMERCIAL", slug: "COMMERCIAL BREAK 01", duration: commercialDurationSecs },
    { block: "B", page: 1, type: "BREAK_LINK", slug: "WELCOME BACK 1", duration: 8 },
    { block: "B", page: 2, type: "STORY", slug: "", duration: storyDurationSecs },
    { block: "B", page: 3, type: "STORY", slug: "", duration: storyDurationSecs },

    // Block C
    { block: "C", page: 0, type: "COMMERCIAL", slug: "COMMERCIAL BREAK 02", duration: commercialDurationSecs },
    { block: "C", page: 1, type: "BREAK_LINK", slug: "WELCOME BACK 2", duration: 8 },
    { block: "C", page: 2, type: "STORY", slug: "", duration: storyDurationSecs },
    { block: "C", page: 3, type: "STORY", slug: "", duration: storyDurationSecs },

    // Block D
    { block: "D", page: 0, type: "COMMERCIAL", slug: "COMMERCIAL BREAK 03", duration: commercialDurationSecs },
    { block: "D", page: 1, type: "BREAK_LINK", slug: "WELCOME BACK 3", duration: 8 },
    { block: "D", page: 2, type: "STORY", slug: "", duration: storyDurationSecs },
    { block: "D", page: 3, type: "STORY", slug: "", duration: storyDurationSecs },
    { block: "D", page: 4, type: "STORY", slug: "", duration: storyDurationSecs },
    { block: "D", page: 5, type: "STORY", slug: "", duration: storyDurationSecs },
    { block: "D", page: 6, type: "WELCOME", slug: "CLOSING SALUTATION", duration: 15 },
    { block: "D", page: 7, type: "CLOSE", slug: "CLOSING TITLES", duration: closingDurationSecs },

    // Block Z (Sports/Special)
    { block: "Z", page: 1, type: "STORY", slug: "", duration: storyDurationSecs },
    { block: "Z", page: 2, type: "STORY", slug: "", duration: storyDurationSecs },
    { block: "Z", page: 3, type: "STORY", slug: "", duration: storyDurationSecs },
    { block: "Z", page: 4, type: "STORY", slug: "", duration: storyDurationSecs },
  ]

  // Insert rows
  let sortOrder = 0
  let breakNumber = 0

  for (const row of templateRows) {
    const pageCode = `${row.block}${row.page}`

    if (row.type === "COMMERCIAL") {
      breakNumber++
    }

    await db.insert(rundownRows).values({
      bulletinId,
      pageCode,
      blockCode: row.block,
      pageNumber: row.page,
      sortOrder: sortOrder++,
      rowType: row.type as "STORY" | "COMMERCIAL" | "BREAK_LINK" | "OPEN" | "CLOSE" | "WELCOME",
      slug: row.slug,
      segment: row.type === "STORY" ? "LIVE" : null,
      estDurationSecs: row.duration,
      status: row.type === "STORY" ? "BLANK" : "READY",
      breakNumber: row.type === "COMMERCIAL" ? breakNumber : null,
      lastModifiedBy: userId,
      createdBy: userId,
    })
  }

  // Recalculate timings
  await recalculateRundownTiming(bulletinId)

  return { rowsCreated: templateRows.length }
}

// ═══════════════════════════════════════════════════════════════════════════════
// ACTIVITY LOGGING
// ═══════════════════════════════════════════════════════════════════════════════

interface LogActivityOptions {
  bulletinId?: string | null
  rowId?: string | null
  description?: string
  oldValue?: unknown
  newValue?: unknown
  ipAddress?: string
  userAgent?: string
}

/**
 * Log an activity to the audit trail
 */
export async function logActivity(
  userId: string,
  action: string,
  entityType: string,
  entityId: string | null,
  options: LogActivityOptions = {}
) {
  try {
    await db.insert(activityLogs).values({
      userId,
      action,
      entityType,
      entityId,
      bulletinId: options.bulletinId || null,
      rowId: options.rowId || null,
      description: options.description || null,
      oldValue: options.oldValue ? JSON.stringify(options.oldValue) : null,
      newValue: options.newValue ? JSON.stringify(options.newValue) : null,
      ipAddress: options.ipAddress || null,
      userAgent: options.userAgent || null,
    })
  } catch (error) {
    console.error("Failed to log activity:", error)
    // Don't throw - logging should not break main operations
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// PAGE CODE GENERATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Generate next available page code for a block
 */
export async function getNextPageCode(bulletinId: string, blockCode: string): Promise<string> {
  const result = await db
    .select({ maxPage: sql<number>`MAX(${rundownRows.pageNumber})` })
    .from(rundownRows)
    .where(eq(rundownRows.bulletinId, bulletinId))

  const maxPage = result[0]?.maxPage || 0
  const nextPage = maxPage + 1

  return `${blockCode}${nextPage}`
}

/**
 * Get next sort order for a bulletin
 */
export async function getNextSortOrder(bulletinId: string): Promise<number> {
  const result = await db
    .select({ maxSort: sql<number>`MAX(${rundownRows.sortOrder})` })
    .from(rundownRows)
    .where(eq(rundownRows.bulletinId, bulletinId))

  return (result[0]?.maxSort ?? -1) + 1
}