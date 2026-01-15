// ============================================================================
// File: app/api/pools/route.ts
// Description: Story pools API endpoints
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
import { pools, desks } from "@/db/schema"

const createPoolSchema = z.object({
  name: z.string().min(1).max(100),
  code: z.string().min(1).max(20),
  type: z.enum(["STORY_POOL", "FLOAT_POOL", "RESERVE_POOL"]).default("STORY_POOL"),
  description: z.string().max(500).optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).default("#3498db"),
  deskId: z.string().uuid().optional(),
})

/**
 * GET /api/pools
 * List all pools
 */
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth(request)
    if ("error" in authResult) return authResult.error

    const { searchParams } = new URL(request.url)
    const deskId = searchParams.get("deskId")
    const type = searchParams.get("type")

    let query = db
      .select({
        id: pools.id,
        name: pools.name,
        code: pools.code,
        type: pools.type,
        description: pools.description,
        color: pools.color,
        deskId: pools.deskId,
        deskName: desks.name,
        isActive: pools.isActive,
        createdAt: pools.createdAt,
      })
      .from(pools)
      .leftJoin(desks, eq(pools.deskId, desks.id))
      .where(eq(pools.isActive, true))
      .orderBy(asc(pools.name))

    let result = await query

    // Filter if needed
    if (deskId) {
      result = result.filter((p) => p.deskId === deskId)
    }
    if (type) {
      result = result.filter((p) => p.type === type)
    }

    return successResponse({ pools: result })
  } catch (error) {
    return serverErrorResponse(error)
  }
}

/**
 * POST /api/pools
 * Create a new pool
 */
export async function POST(request: NextRequest) {
  try {
    const authResult = await requireRole(request, ["ADMIN", "PRODUCER"])
    if ("error" in authResult) return authResult.error

    const body = await request.json()
    const validation = createPoolSchema.safeParse(body)

    if (!validation.success) {
      return validationErrorResponse(validation.error)
    }

    const data = validation.data

    const [newPool] = await db
      .insert(pools)
      .values({
        name: data.name,
        code: data.code.toUpperCase(),
        type: data.type,
        description: data.description,
        color: data.color,
        deskId: data.deskId,
      })
      .returning()

    return createdResponse(newPool, "Pool created successfully")
  } catch (error) {
    return serverErrorResponse(error)
  }
}