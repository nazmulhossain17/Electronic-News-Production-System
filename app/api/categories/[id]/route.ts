// ============================================================================
// File: app/api/categories/[id]/route.ts
// Description: Single category API endpoints - get, update, delete
// ============================================================================

import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth-config"
import db from "@/db"
import { categories, appUsers } from "@/db/schema"
import { eq } from "drizzle-orm"
import { z } from "zod"

const updateCategorySchema = z.object({
  name: z.string().min(1).max(100).optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  isActive: z.boolean().optional(),
})

// GET - Get single category
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth.api.getSession({ headers: request.headers })
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params

    const [category] = await db
      .select()
      .from(categories)
      .where(eq(categories.id, id))
      .limit(1)

    if (!category) {
      return NextResponse.json({ error: "Category not found" }, { status: 404 })
    }

    return NextResponse.json(category)
  } catch (error) {
    console.error("Get category error:", error)
    return NextResponse.json(
      { error: "Failed to get category" },
      { status: 500 }
    )
  }
}

// PUT - Update category
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth.api.getSession({ headers: request.headers })
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check user role
    const [appUser] = await db
      .select({ role: appUsers.role })
      .from(appUsers)
      .where(eq(appUsers.userId, session.user.id))
      .limit(1)

    if (!appUser?.role || !["ADMIN", "EDITOR", "PRODUCER"].includes(appUser.role)) {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 })
    }

    const { id } = await params
    const body = await request.json()
    const validatedData = updateCategorySchema.parse(body)

    // Check if category exists
    const [existingCategory] = await db
      .select()
      .from(categories)
      .where(eq(categories.id, id))
      .limit(1)

    if (!existingCategory) {
      return NextResponse.json({ error: "Category not found" }, { status: 404 })
    }

    // Build update object
    const updateData: Record<string, unknown> = {
      updatedAt: new Date(),
    }

    if (validatedData.name !== undefined) {
      updateData.name = validatedData.name
    }
    if (validatedData.color !== undefined) {
      updateData.color = validatedData.color
    }
    if (validatedData.isActive !== undefined) {
      updateData.isActive = validatedData.isActive
    }

    const [updatedCategory] = await db
      .update(categories)
      .set(updateData)
      .where(eq(categories.id, id))
      .returning()

    return NextResponse.json(updatedCategory)
  } catch (error) {
    console.error("Update category error:", error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: "Failed to update category" },
      { status: 500 }
    )
  }
}

// DELETE - Delete category (soft delete by setting isActive to false)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth.api.getSession({ headers: request.headers })
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check user role
    const [appUser] = await db
      .select({ role: appUsers.role })
      .from(appUsers)
      .where(eq(appUsers.userId, session.user.id))
      .limit(1)

    if (!appUser?.role || !["ADMIN", "EDITOR"].includes(appUser.role)) {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 })
    }

    const { id } = await params

    // Check if category exists
    const [existingCategory] = await db
      .select()
      .from(categories)
      .where(eq(categories.id, id))
      .limit(1)

    if (!existingCategory) {
      return NextResponse.json({ error: "Category not found" }, { status: 404 })
    }

    // Soft delete - set isActive to false
    await db
      .update(categories)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(categories.id, id))

    return NextResponse.json({ success: true, id })
  } catch (error) {
    console.error("Delete category error:", error)
    return NextResponse.json(
      { error: "Failed to delete category" },
      { status: 500 }
    )
  }
}