// ============================================================================
// File: app/api/auth/[...all]/route.ts
// Description: Better Auth catch-all route handler
// ============================================================================

import { auth } from "@/lib/auth-config"
import { toNextJsHandler } from "better-auth/next-js"

export const { GET, POST } = toNextJsHandler(auth)