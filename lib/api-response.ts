// ============================================================================
// File: lib/api-response.ts
// Description: Standardized API response helpers
// ============================================================================

import { NextResponse } from "next/server"
import { type ZodError, type ZodIssue } from "zod"

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

interface SuccessResponseData {
  success: true
  data: unknown
  message?: string
}

interface ErrorResponseData {
  success: false
  error: string
  message?: string
  details?: unknown
}

interface PaginationInfo {
  total: number
  limit: number
  offset: number
  hasMore: boolean
}

// ═══════════════════════════════════════════════════════════════════════════════
// SUCCESS RESPONSES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Standard success response
 */
export function successResponse(data: unknown, message?: string, status: number = 200) {
  const response: SuccessResponseData = {
    success: true,
    data,
  }

  if (message) {
    response.message = message
  }

  return NextResponse.json(response, { status })
}

/**
 * Created response (201)
 */
export function createdResponse(data: unknown, message?: string) {
  return successResponse(data, message || "Created successfully", 201)
}

/**
 * Paginated response
 */
export function paginatedResponse(
  items: unknown[],
  pagination: PaginationInfo,
  message?: string
) {
  return successResponse(
    {
      items,
      pagination,
    },
    message
  )
}

/**
 * No content response (204)
 */
export function noContentResponse() {
  return new NextResponse(null, { status: 204 })
}

// ═══════════════════════════════════════════════════════════════════════════════
// ERROR RESPONSES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Generic error response
 */
export function errorResponse(error: string, status: number = 400, details?: unknown) {
  const response: ErrorResponseData = {
    success: false,
    error,
  }

  if (details) {
    response.details = details
  }

  return NextResponse.json(response, { status })
}

/**
 * Bad request response (400)
 */
export function badRequestResponse(message: string, details?: unknown) {
  return errorResponse(message, 400, details)
}

/**
 * Unauthorized response (401)
 */
export function unauthorizedResponse(message: string = "Unauthorized") {
  return errorResponse(message, 401)
}

/**
 * Forbidden response (403)
 */
export function forbiddenResponse(message: string = "Forbidden") {
  return errorResponse(message, 403)
}

/**
 * Not found response (404)
 */
export function notFoundResponse(resource: string = "Resource") {
  return errorResponse(`${resource} not found`, 404)
}

/**
 * Conflict response (409)
 */
export function conflictResponse(message: string, details?: unknown) {
  return errorResponse(message, 409, details)
}

/**
 * Validation error response (422)
 */
export function validationErrorResponse(error: ZodError | string) {
  if (typeof error === "string") {
    return errorResponse(error, 422)
  }

  // ZodError has issues property, not errors
  const details = error.issues.map((issue: ZodIssue) => ({
    field: issue.path.join("."),
    message: issue.message,
  }))

  return errorResponse("Validation failed", 422, details)
}

/**
 * Server error response (500)
 */
export function serverErrorResponse(error: unknown) {
  console.error("Server error:", error)

  const message =
    process.env.NODE_ENV === "development"
      ? error instanceof Error
        ? error.message
        : "Internal server error"
      : "Internal server error"

  return errorResponse(message, 500)
}

// ═══════════════════════════════════════════════════════════════════════════════
// SPECIALIZED RESPONSES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Locked resource response
 */
export function lockedResponse(
  resource: string,
  lockedBy: { id: string; name: string },
  lockedAt: Date
) {
  return errorResponse(`${resource} is locked`, 423, {
    lockedBy,
    lockedAt: lockedAt.toISOString(),
  })
}

/**
 * Rate limit exceeded response
 */
export function rateLimitResponse(retryAfter?: number) {
  const response = errorResponse("Too many requests", 429)

  if (retryAfter) {
    response.headers.set("Retry-After", retryAfter.toString())
  }

  return response
}

/**
 * Service unavailable response
 */
export function serviceUnavailableResponse(message: string = "Service temporarily unavailable") {
  return errorResponse(message, 503)
}