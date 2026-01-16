// middleware.ts
import { type NextRequest, NextResponse } from "next/server"
import { betterFetch } from "@better-fetch/fetch"

// Routes that don't require authentication
const publicRoutes = ["/", "/register", "/forgot-password", "/reset-password"]

// Routes that require authentication
const protectedRoutes = ["/enps", "/app-user-setup", "/dashboard", "/admin"]

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

  // Allow all auth API routes
  if (pathname.startsWith("/api/auth")) {
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

  // Check if current path is public auth page
  const isAuthPage = pathname === "/" || pathname === "/register"

  // Only validate session if needed
  if (isProtectedRoute || isAuthPage) {
    // Validate session with Better Auth
    const { data: session } = await betterFetch<Session>(
      "/api/auth/get-session",
      {
        baseURL: request.nextUrl.origin,
        headers: {
          cookie: request.headers.get("cookie") || "",
        },
      }
    )

    const isAuthenticated = !!session?.session

    // Redirect to login if accessing protected route without auth
    if (isProtectedRoute && !isAuthenticated) {
      const loginUrl = new URL("/", request.url)
      loginUrl.searchParams.set("callbackUrl", pathname)
      return NextResponse.redirect(loginUrl)
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