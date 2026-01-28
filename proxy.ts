// ============================================================================
// File: middleware.ts
// Description: Next.js middleware for authentication and route protection
// ============================================================================

import { type NextRequest, NextResponse } from "next/server"
import { betterFetch } from "@better-fetch/fetch"

// Routes that don't require authentication
const publicRoutes = ["/", "/register", "/forgot-password", "/reset-password"]

// Routes that require authentication
const protectedRoutes = ["/enps", "/app-user-setup", "/dashboard", "/admin", "/trash"]

// Routes that require ADMIN role
const adminOnlyRoutes = ["/admin", "/trash"]

type Session = {
  session: {
    id: string
    userId: string
    expiresAt: Date
  }
  user: {
    id: string
    name: string
    email: string
  }
} | null

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  console.log("[Middleware] Processing:", pathname)

  // Allow all auth API routes
  if (pathname.startsWith("/api/auth")) {
    return NextResponse.next()
  }

  // Allow all other API routes (they handle their own auth)
  if (pathname.startsWith("/api/")) {
    return NextResponse.next()
  }

  // Allow static files
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/static") ||
    pathname.includes(".")
  ) {
    return NextResponse.next()
  }

  // Check if current path is protected
  const isProtectedRoute = protectedRoutes.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  )

  // Check if current path is admin-only
  const isAdminOnlyRoute = adminOnlyRoutes.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  )

  // Check if current path is public auth page
  const isAuthPage = pathname === "/" || pathname === "/register"

  console.log("[Middleware] isProtectedRoute:", isProtectedRoute, "isAdminOnlyRoute:", isAdminOnlyRoute)

  // Only validate session if needed
  if (isProtectedRoute || isAuthPage) {
    const cookieHeader = request.headers.get("cookie") || ""
    
    // Validate session with Better Auth
    const { data: session } = await betterFetch<Session>(
      "/api/auth/get-session",
      {
        baseURL: request.nextUrl.origin,
        headers: {
          cookie: cookieHeader,
        },
      }
    )

    const isAuthenticated = !!session?.session
    console.log("[Middleware] isAuthenticated:", isAuthenticated)

    // Redirect to login if accessing protected route without auth
    if (isProtectedRoute && !isAuthenticated) {
      console.log("[Middleware] Not authenticated, redirecting to login")
      const loginUrl = new URL("/", request.url)
      loginUrl.searchParams.set("callbackUrl", pathname)
      return NextResponse.redirect(loginUrl)
    }

    // Check admin-only routes - need to fetch role from /api/me
    if (isAdminOnlyRoute && isAuthenticated) {
      console.log("[Middleware] Checking admin access for:", pathname)
      
      try {
        const response = await fetch(`${request.nextUrl.origin}/api/me`, {
          headers: {
            cookie: cookieHeader,
          },
        })
        
        console.log("[Middleware] /api/me response status:", response.status)
        
        if (response.ok) {
          const meData = await response.json()
          
          console.log("[Middleware] /api/me response:", JSON.stringify(meData, null, 2))
          
          // Response format: { success: true, data: { user: { role: "ADMIN" } } }
          const userRole = meData?.data?.user?.role
          
          console.log("[Middleware] Extracted user role:", userRole)
          
          if (userRole !== "ADMIN") {
            console.log("[Middleware] User is not ADMIN (role:", userRole, "), redirecting to /enps")
            return NextResponse.redirect(new URL("/enps", request.url))
          }
          
          console.log("[Middleware] ✅ ADMIN access granted for:", pathname)
          // Allow the request to proceed
          return NextResponse.next()
        } else {
          console.error("[Middleware] Failed to fetch /api/me, status:", response.status)
          return NextResponse.redirect(new URL("/enps", request.url))
        }
      } catch (error) {
        console.error("[Middleware] Error fetching user role:", error)
        return NextResponse.redirect(new URL("/enps", request.url))
      }
    }

    // Redirect to /enps if authenticated user visits login page
    if (isAuthPage && isAuthenticated) {
      return NextResponse.redirect(new URL("/enps", request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}