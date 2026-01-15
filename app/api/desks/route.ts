// ============================================================================
// File: app/api/desks/route.ts
// Description: News desks API endpoints
// ============================================================================

import { NextRequest } from "next/server"
import { eq, asc } from "drizzle-orm"
import { requireAuth, requireRole } from "@/lib/auth"
import {
  successResponse,
  createdResponse,
  serverErrorResponse,
  validationErrorResponse,
} from "@/lib/api-response"
import { z } from "zod"
import db from "@/db"
import { desks } from "@/db/schema"

const createDeskSchema = z.object({
  name: z.string().min(1).max(100),
  code: z.string().min(1).max(20),
  description: z.string().optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).default("#3498db"),
})

/**
 * GET /api/desks
 * List all desks
 */
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth(request)
    if ("error" in authResult) return authResult.error

    const result = await db
      .select({
        id: desks.id,
        name: desks.name,
        code: desks.code,
        description: desks.description,
        color: desks.color,
        isActive: desks.isActive,
        createdAt: desks.createdAt,
      })
      .from(desks)
      .where(eq(desks.isActive, true))
      .orderBy(asc(desks.name))

    return successResponse({ desks: result })
  } catch (error) {
    return serverErrorResponse(error)
  }
}

/**
 * POST /api/desks
 * Create a new desk
 */
export async function POST(request: NextRequest) {
  try {
    const authResult = await requireRole(request, ["ADMIN"])
    if ("error" in authResult) return authResult.error

    const body = await request.json()
    const validation = createDeskSchema.safeParse(body)

    if (!validation.success) {
      return validationErrorResponse(validation.error)
    }

    const data = validation.data

    const [newDesk] = await db
      .insert(desks)
      .values({
        name: data.name,
        code: data.code.toUpperCase(),
        description: data.description,
        color: data.color,
      })
      .returning()

    return createdResponse(newDesk, "Desk created successfully")
  } catch (error) {
    return serverErrorResponse(error)
  }
}