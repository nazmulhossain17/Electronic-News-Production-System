import { type NextRequest, NextResponse } from "next/server"

export function proxy(request: NextRequest) {
  // Allow auth routes
  if (request.nextUrl.pathname.startsWith("/api/auth")) {
    return NextResponse.next()
  }

  // Allow public routes
  const publicRoutes = ["/", "/register", "/forgot-password", "/"]
  if (publicRoutes.includes(request.nextUrl.pathname)) {
    return NextResponse.next()
  }

  // For protected routes, auth check happens client-side via Better Auth
  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
}