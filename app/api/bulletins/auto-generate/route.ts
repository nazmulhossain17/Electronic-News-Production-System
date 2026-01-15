// ============================================================================
// File: app/api/bulletins/auto-generate/route.ts
// Description: Auto-generate standard bulletins for a date
// ============================================================================

import { NextRequest } from "next/server"
import { eq, and, gte, lt } from "drizzle-orm"
import { requireRole } from "@/lib/auth"
import {
  successResponse,
  serverErrorResponse,
  validationErrorResponse,
} from "@/lib/api-response"
import { z } from "zod"
import db from "@/db"
import { bulletins } from "@/db/schema"
import { generateRundownTemplate, logActivity } from "@/lib/rundown-service"

const autoGenerateSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
})

// Standard bulletin schedule
const BULLETIN_SCHEDULE = [
  { time: "06:00", title: "6AM News", duration: 1800 },
  { time: "07:00", title: "7AM News", duration: 1800 },
  { time: "08:00", title: "8AM News", duration: 1800 },
  { time: "09:00", title: "9AM News", duration: 1800 },
  { time: "11:00", title: "11AM News", duration: 1800 },
  { time: "12:00", title: "12PM News", duration: 1800 },
  { time: "13:00", title: "1PM News", duration: 1800 },
  { time: "15:00", title: "3PM News", duration: 1800 },
  { time: "17:00", title: "5PM News", duration: 2700 }, // 45 min
  { time: "19:00", title: "7PM News", duration: 3600 }, // 60 min
  { time: "21:00", title: "9PM News", duration: 1800 },
  { time: "22:00", title: "10PM News", duration: 1800 },
  { time: "23:00", title: "11PM News", duration: 1800 },
]

/**
 * POST /api/bulletins/auto-generate
 * Auto-generate standard bulletins for a date
 */
export async function POST(request: NextRequest) {
  try {
    const authResult = await requireRole(request, ["ADMIN", "PRODUCER", "EDITOR"])
    if ("error" in authResult) return authResult.error

    const { user: currentUser } = authResult

    const body = await request.json()
    const validation = autoGenerateSchema.safeParse(body)

    if (!validation.success) {
      return validationErrorResponse(validation.error)
    }

    const { date } = validation.data
    const targetDate = new Date(date)
    const nextDay = new Date(targetDate)
    nextDay.setDate(nextDay.getDate() + 1)

    // Get existing bulletins for this date
    const existing = await db
      .select({ startTime: bulletins.startTime })
      .from(bulletins)
      .where(and(gte(bulletins.airDate, targetDate), lt(bulletins.airDate, nextDay)))

    const existingTimes = new Set(existing.map((b) => b.startTime))

    // Create bulletins that don't exist
    const created: string[] = []
    const skipped: string[] = []

    for (const schedule of BULLETIN_SCHEDULE) {
      if (existingTimes.has(schedule.time)) {
        skipped.push(schedule.title)
        continue
      }

      const airDate = new Date(`${date}T${schedule.time}:00`)

      const [newBulletin] = await db
        .insert(bulletins)
        .values({
          title: schedule.title,
          airDate,
          startTime: schedule.time,
          plannedDurationSecs: schedule.duration,
          status: "PLANNING",
          createdBy: currentUser.id,
        })
        .returning()

      // Generate template rows
      await generateRundownTemplate(newBulletin.id, currentUser.id)

      created.push(schedule.title)
    }

    // Log activity
    await logActivity(currentUser.id, "AUTO_GENERATE", "BULLETIN", null, {
      description: `Auto-generated ${created.length} bulletins for ${date}`,
      newValue: { created, skipped },
    })

    // Get all bulletins for the date
    const allBulletins = await db
      .select({
        id: bulletins.id,
        title: bulletins.title,
        startTime: bulletins.startTime,
        status: bulletins.status,
      })
      .from(bulletins)
      .where(and(gte(bulletins.airDate, targetDate), lt(bulletins.airDate, nextDay)))

    return successResponse({
      created: created.length,
      skipped: skipped.length,
      bulletins: allBulletins,
    })
  } catch (error) {
    return serverErrorResponse(error)
  }
}