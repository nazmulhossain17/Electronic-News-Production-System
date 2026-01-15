// ============================================================================
// File: app/api/bulletins/route.ts
// Description: Bulletins (rundowns) API endpoints
// ============================================================================

import { NextRequest } from "next/server"
import { eq, and, gte, lte, asc } from "drizzle-orm"
import { requireAuth, requireRole } from "@/lib/auth"
import {
  successResponse,
  createdResponse,
  serverErrorResponse,
  validationErrorResponse,
} from "@/lib/api-response"
import { z } from "zod"
import db from "@/db"
import { bulletins, desks, user, rundownRows } from "@/db/schema"
import { generateRundownTemplate, logActivity } from "@/lib/rundown-service"

const createBulletinSchema = z.object({
  title: z.string().min(1).max(255),
  subtitle: z.string().max(255).optional(),
  code: z.string().max(50).optional(),
  airDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  plannedDurationSecs: z.number().int().positive().default(1800),
  producerId: z.string().uuid().optional(),
  deskId: z.string().uuid().optional(),
  notes: z.string().max(5000).optional(),
  generateTemplate: z.boolean().default(true),
})

/**
 * GET /api/bulletins
 * List bulletins with optional filters
 */
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth(request)
    if ("error" in authResult) return authResult.error

    const { searchParams } = new URL(request.url)
    const date = searchParams.get("date")
    const startDate = searchParams.get("startDate")
    const endDate = searchParams.get("endDate")
    const status = searchParams.get("status")
    const deskId = searchParams.get("deskId")

    // Build conditions
    const conditions = []

    if (date) {
      const targetDate = new Date(date)
      const nextDay = new Date(targetDate)
      nextDay.setDate(nextDay.getDate() + 1)
      conditions.push(gte(bulletins.airDate, targetDate))
      conditions.push(lte(bulletins.airDate, nextDay))
    } else if (startDate && endDate) {
      conditions.push(gte(bulletins.airDate, new Date(startDate)))
      conditions.push(lte(bulletins.airDate, new Date(endDate)))
    }

    if (status) {
      conditions.push(eq(bulletins.status, status as any))
    }

    if (deskId) {
      conditions.push(eq(bulletins.deskId, deskId))
    }

    const result = await db
      .select({
        id: bulletins.id,
        title: bulletins.title,
        subtitle: bulletins.subtitle,
        code: bulletins.code,
        airDate: bulletins.airDate,
        startTime: bulletins.startTime,
        endTime: bulletins.endTime,
        plannedDurationSecs: bulletins.plannedDurationSecs,
        totalEstDurationSecs: bulletins.totalEstDurationSecs,
        totalActualDurationSecs: bulletins.totalActualDurationSecs,
        timingVarianceSecs: bulletins.timingVarianceSecs,
        status: bulletins.status,
        isLocked: bulletins.isLocked,
        producerId: bulletins.producerId,
        producerName: user.name,
        deskId: bulletins.deskId,
        deskName: desks.name,
        createdAt: bulletins.createdAt,
        updatedAt: bulletins.updatedAt,
      })
      .from(bulletins)
      .leftJoin(user, eq(bulletins.producerId, user.id))
      .leftJoin(desks, eq(bulletins.deskId, desks.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(asc(bulletins.airDate), asc(bulletins.startTime))

    return successResponse({ bulletins: result })
  } catch (error) {
    return serverErrorResponse(error)
  }
}

/**
 * POST /api/bulletins
 * Create a new bulletin
 */
export async function POST(request: NextRequest) {
  try {
    const authResult = await requireRole(request, ["ADMIN", "PRODUCER"])
    if ("error" in authResult) return authResult.error

    const { user: currentUser } = authResult
    const body = await request.json()
    const validation = createBulletinSchema.safeParse(body)

    if (!validation.success) {
      return validationErrorResponse(validation.error)
    }

    const data = validation.data
    const airDate = new Date(`${data.airDate}T${data.startTime}:00`)

    const [newBulletin] = await db
      .insert(bulletins)
      .values({
        title: data.title,
        subtitle: data.subtitle,
        code: data.code,
        airDate,
        startTime: data.startTime,
        endTime: data.endTime,
        plannedDurationSecs: data.plannedDurationSecs,
        producerId: data.producerId || currentUser.id,
        deskId: data.deskId,
        notes: data.notes,
        createdBy: currentUser.id,
      })
      .returning()

    // Generate template rows if requested
    if (data.generateTemplate) {
      await generateRundownTemplate(newBulletin.id, currentUser.id)
    }

    // Log activity
    await logActivity(currentUser.id, "CREATE", "BULLETIN", newBulletin.id, {
      bulletinId: newBulletin.id,
      description: `Created bulletin: ${data.title}`,
    })

    return createdResponse(newBulletin, "Bulletin created successfully")
  } catch (error) {
    return serverErrorResponse(error)
  }
}