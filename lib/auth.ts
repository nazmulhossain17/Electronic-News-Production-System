// ============================================================================
// File: lib/auth.ts
// Description: Authentication utilities and middleware helpers
// ============================================================================

import { NextRequest } from "next/server"
import { headers } from "next/headers"
import { auth } from "./auth-config"
import db from "@/db"
import { appUsers } from "@/db/schema"
import { eq } from "drizzle-orm"

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export type UserRole = "ADMIN" | "PRODUCER" | "EDITOR" | "REPORTER"

export interface AuthUser {
  id: string
  name: string
  email: string
  role: UserRole
  displayName: string | null
  deskId: string | null
  isActive: boolean
}

// ═══════════════════════════════════════════════════════════════════════════════
// GET CURRENT USER
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Get current authenticated user from Better Auth session
 */
export async function getCurrentUser(request: NextRequest): Promise<AuthUser | null> {
  try {
    // Use Better Auth to get session
    const session = await auth.api.getSession({
      headers: request.headers,
    })

    if (!session?.user) {
      return null
    }

    const { user: sessionUser } = session

    // Get app user details
    const appUserResult = await db
      .select({
        role: appUsers.role,
        displayName: appUsers.displayName,
        deskId: appUsers.deskId,
        isActive: appUsers.isActive,
      })
      .from(appUsers)
      .where(eq(appUsers.userId, sessionUser.id))
      .limit(1)

    const appUser = appUserResult[0]

    // Check if user is active
    if (appUser && !appUser.isActive) {
      return null
    }

    return {
      id: sessionUser.id,
      name: sessionUser.name || "",
      email: sessionUser.email,
      role: (appUser?.role as UserRole) || "REPORTER",
      displayName: appUser?.displayName || null,
      deskId: appUser?.deskId || null,
      isActive: appUser?.isActive ?? true,
    }
  } catch (error) {
    console.error("Auth error:", error)
    return null
  }
}

/**
 * Get session for server components (using headers)
 */
export async function getServerSession() {
  try {
    const headersList = await headers()
    const session = await auth.api.getSession({
      headers: headersList,
    })
    return session
  } catch (error) {
    console.error("Server session error:", error)
    return null
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// ROLE & PERMISSION CHECKS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Check if user has required role
 */
export function hasRole(user: AuthUser, requiredRoles: UserRole[]): boolean {
  return requiredRoles.includes(user.role)
}

/**
 * Role hierarchy values for comparison
 */
const roleHierarchy: Record<UserRole, number> = {
  ADMIN: 4,
  PRODUCER: 3,
  EDITOR: 2,
  REPORTER: 1,
}

/**
 * Check if user can perform action based on role hierarchy
 * ADMIN > PRODUCER > EDITOR > REPORTER
 */
export function canPerformAction(
  user: AuthUser,
  action:
    | "create_bulletin"
    | "edit_bulletin"
    | "delete_bulletin"
    | "lock_bulletin"
    | "create_row"
    | "edit_any_row"
    | "edit_own_row"
    | "delete_row"
    | "approve_row"
    | "assign_reporter"
    | "manage_pools"
    | "manage_users"
): boolean {
  const actionRequirements: Record<string, UserRole[]> = {
    create_bulletin: ["ADMIN", "PRODUCER"],
    edit_bulletin: ["ADMIN", "PRODUCER"],
    delete_bulletin: ["ADMIN"],
    lock_bulletin: ["ADMIN", "PRODUCER"],
    create_row: ["ADMIN", "PRODUCER", "EDITOR"],
    edit_any_row: ["ADMIN", "PRODUCER", "EDITOR"],
    edit_own_row: ["ADMIN", "PRODUCER", "EDITOR", "REPORTER"],
    delete_row: ["ADMIN", "PRODUCER", "EDITOR"],
    approve_row: ["ADMIN", "PRODUCER", "EDITOR"],
    assign_reporter: ["ADMIN", "PRODUCER", "EDITOR"],
    manage_pools: ["ADMIN", "PRODUCER"],
    manage_users: ["ADMIN"],
  }

  const allowedRoles = actionRequirements[action]
  if (!allowedRoles) return false

  return allowedRoles.includes(user.role)
}

/**
 * Check if user can edit a specific row
 */
export function canEditRow(
  user: AuthUser,
  row: { reporterId: string | null; createdBy: string; status: string }
): boolean {
  // Admin, Producer, Editor can edit any row
  if (hasRole(user, ["ADMIN", "PRODUCER", "EDITOR"])) {
    return true
  }

  // Reporter can only edit if:
  // 1. They are assigned as reporter
  // 2. OR the row is BLANK and they created it
  if (user.role === "REPORTER") {
    if (row.reporterId === user.id) return true
    if (row.status === "BLANK" && row.createdBy === user.id) return true
  }

  return false
}

/**
 * Get fields a user can edit based on their role
 */
export function getEditableFields(user: AuthUser): string[] {
  if (hasRole(user, ["ADMIN", "PRODUCER", "EDITOR"])) {
    // Can edit all fields
    return [
      "slug",
      "segment",
      "storyProducerId",
      "reporterId",
      "estDurationSecs",
      "actualDurationSecs",
      "float",
      "status",
      "script",
      "notes",
      "categoryId",
      "mosObjSlug",
      "mosObjectTime",
      "mosStatus",
      "mosUserDuration",
    ]
  }

  // Reporter can only edit limited fields
  return ["slug", "script", "notes", "status"]
}

/**
 * Get statuses a user can set based on their role
 */
export function getAllowedStatuses(user: AuthUser): string[] {
  if (hasRole(user, ["ADMIN", "PRODUCER", "EDITOR"])) {
    return ["BLANK", "DRAFT", "READY", "APPROVED", "KILLED", "AIRED"]
  }

  // Reporter can only set DRAFT or READY
  return ["DRAFT", "READY"]
}

// ═══════════════════════════════════════════════════════════════════════════════
// MIDDLEWARE HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Require authentication middleware helper
 */
export async function requireAuth(
  request: NextRequest
): Promise<{ user: AuthUser } | { error: Response }> {
  const currentUser = await getCurrentUser(request)

  if (!currentUser) {
    return {
      error: new Response(
        JSON.stringify({ success: false, error: "Unauthorized", message: "Please log in" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      ),
    }
  }

  return { user: currentUser }
}

/**
 * Require specific role middleware helper
 */
export async function requireRole(
  request: NextRequest,
  roles: UserRole[]
): Promise<{ user: AuthUser } | { error: Response }> {
  const authResult = await requireAuth(request)

  if ("error" in authResult) {
    return authResult
  }

  if (!hasRole(authResult.user, roles)) {
    return {
      error: new Response(
        JSON.stringify({
          success: false,
          error: "Forbidden",
          message: `This action requires one of these roles: ${roles.join(", ")}`,
        }),
        { status: 403, headers: { "Content-Type": "application/json" } }
      ),
    }
  }

  return authResult
}

/**
 * Require permission for specific action
 */
export async function requirePermission(
  request: NextRequest,
  action: Parameters<typeof canPerformAction>[1]
): Promise<{ user: AuthUser } | { error: Response }> {
  const authResult = await requireAuth(request)

  if ("error" in authResult) {
    return authResult
  }

  if (!canPerformAction(authResult.user, action)) {
    return {
      error: new Response(
        JSON.stringify({
          success: false,
          error: "Forbidden",
          message: `You don't have permission to: ${action.replace(/_/g, " ")}`,
        }),
        { status: 403, headers: { "Content-Type": "application/json" } }
      ),
    }
  }

  return authResult
}