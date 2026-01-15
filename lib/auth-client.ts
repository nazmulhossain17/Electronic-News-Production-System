// ============================================================================
// File: lib/auth-client.ts
// Description: Better Auth client for frontend use
// ============================================================================

import { createAuthClient } from "better-auth/react"

const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
  basePath: "/api/auth",
  fetchOptions: {
    credentials: "include",
  },
})

export default authClient
export { authClient }
export const signIn = authClient.signIn
export const signUp = authClient.signUp
export const signOut = authClient.signOut
export const useSession = authClient.useSession
export const getSession = authClient.getSession

export type AuthSession = Awaited<ReturnType<typeof authClient.getSession>>