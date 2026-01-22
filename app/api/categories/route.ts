// ============================================================================
// File: app/api/categories/route.ts
// Description: News categories API endpoints
// ============================================================================

import { NextRequest } from "next/server"
import { eq, asc, and } from "drizzle-orm"
import { requireAuth, requireRole } from "@/lib/auth"
import {
  successResponse,
  createdResponse,
  serverErrorResponse,
  validationErrorResponse,
} from "@/lib/api-response"
import { z } from "zod"
import db from "@/db"
import { categories, desks } from "@/db/schema"

const createCategorySchema = z.object({
  name: z.string().min(1).max(100),
  deskId: z.string().uuid().optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).default("#3498db"),
})

/**
 * GET /api/categories
 * List all categories
 */
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth(request)
    if ("error" in authResult) return authResult.error

    const { searchParams } = new URL(request.url)
    const deskId = searchParams.get("deskId")

    const query = db
      .select({
        id: categories.id,
        name: categories.name,
        deskId: categories.deskId,
        deskName: desks.name,
        color: categories.color,
        isActive: categories.isActive,
        createdAt: categories.createdAt,
      })
      .from(categories)
      .leftJoin(desks, eq(categories.deskId, desks.id))
      .where(
        deskId
          ? and(eq(categories.isActive, true), eq(categories.deskId, deskId))
          : eq(categories.isActive, true)
      )
      .orderBy(asc(categories.name))

    const result = await query

    return successResponse({ categories: result })
  } catch (error) {
    return serverErrorResponse(error)
  }
}

/**
 * POST /api/categories
 * Create a new category
 */
export async function POST(request: NextRequest) {
  try {
    const authResult = await requireRole(request, ["ADMIN", "EDITOR"])
    if ("error" in authResult) return authResult.error

    const body = await request.json()
    const validation = createCategorySchema.safeParse(body)

    if (!validation.success) {
      return validationErrorResponse(validation.error)
    }

    const data = validation.data

    const [newCategory] = await db
      .insert(categories)
      .values({
        name: data.name,
        deskId: data.deskId,
        color: data.color,
      })
      .returning()

    return createdResponse(newCategory, "Category created successfully")
  } catch (error) {
    return serverErrorResponse(error)
  }
}