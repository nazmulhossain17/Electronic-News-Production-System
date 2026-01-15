// ============================================================================
// File: lib/auth-provider.tsx
// Description: React auth context, provider, and hooks
// ============================================================================

"use client"

import React, { createContext, useContext, useEffect, useState } from "react"
import authClient from "./auth-client"

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export type UserRole = "ADMIN" | "PRODUCER" | "EDITOR" | "REPORTER"

export interface User {
  id: string
  name: string
  email: string
  image?: string | null
  role: UserRole
  displayName?: string | null
  deskId?: string | null
  isActive: boolean
}

// Session user from Better Auth (before enrichment)
interface SessionUser {
  id: string
  name: string
  email: string
  image?: string | null
  emailVerified?: boolean
  createdAt?: Date
  updatedAt?: Date
  // These are added by session callback in auth-config
  role?: UserRole
  displayName?: string | null
  deskId?: string | null
  isActive?: boolean
}

export interface AuthContextType {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
  signIn: (email: string, password: string) => Promise<{ error?: string }>
  signUp: (email: string, password: string, name: string) => Promise<{ error?: string }>
  signOut: () => Promise<void>
  refreshSession: () => Promise<void>
}

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Convert session user to our User type with defaults
 */
function sessionUserToUser(sessionUser: SessionUser): User {
  return {
    id: sessionUser.id,
    name: sessionUser.name,
    email: sessionUser.email,
    image: sessionUser.image ?? null,
    role: sessionUser.role ?? "REPORTER",
    displayName: sessionUser.displayName ?? null,
    deskId: sessionUser.deskId ?? null,
    isActive: sessionUser.isActive ?? true,
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONTEXT
// ═══════════════════════════════════════════════════════════════════════════════

const AuthContext = createContext<AuthContextType | undefined>(undefined)

// ═══════════════════════════════════════════════════════════════════════════════
// PROVIDER COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Fetch session on mount
  useEffect(() => {
    refreshSession()
  }, [])

  const refreshSession = async () => {
    try {
      setIsLoading(true)
      const session = await authClient.getSession()

      if (session?.data?.user) {
        // Convert session user to our User type
        const sessionUser = session.data.user as SessionUser
        setUser(sessionUserToUser(sessionUser))
      } else {
        setUser(null)
      }
    } catch (error) {
      console.error("Failed to fetch session:", error)
      setUser(null)
    } finally {
      setIsLoading(false)
    }
  }

  const signIn = async (email: string, password: string) => {
    try {
      const result = await authClient.signIn.email({
        email,
        password,
      })

      if (result.error) {
        return { error: result.error.message || "Failed to sign in" }
      }

      await refreshSession()
      return {}
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to sign in"
      return { error: message }
    }
  }

  const signUp = async (email: string, password: string, name: string) => {
    try {
      const result = await authClient.signUp.email({
        email,
        password,
        name,
      })

      if (result.error) {
        return { error: result.error.message || "Failed to create account" }
      }

      await refreshSession()
      return {}
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to create account"
      return { error: message }
    }
  }

  const handleSignOut = async () => {
    try {
      await authClient.signOut()
      setUser(null)
    } catch (error) {
      console.error("Sign out error:", error)
    }
  }

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated: !!user,
    signIn,
    signUp,
    signOut: handleSignOut,
    refreshSession,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// ═══════════════════════════════════════════════════════════════════════════════
// HOOKS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Hook to access auth context
 */
export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}

/**
 * Hook to require authentication - redirects to login if not authenticated
 */
export function useRequireAuth(redirectTo = "/login") {
  const { user, isLoading, isAuthenticated } = useAuth()

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      window.location.href = `${redirectTo}?callbackUrl=${encodeURIComponent(window.location.pathname)}`
    }
  }, [isLoading, isAuthenticated, redirectTo])

  return { user, isLoading }
}

/**
 * Hook to require specific role - redirects if user doesn't have required role
 */
export function useRequireRole(
  allowedRoles: UserRole[],
  redirectTo = "/unauthorized"
) {
  const { user, isLoading } = useRequireAuth()

  useEffect(() => {
    if (!isLoading && user && !allowedRoles.includes(user.role)) {
      window.location.href = redirectTo
    }
  }, [isLoading, user, allowedRoles, redirectTo])

  const hasAccess = user && allowedRoles.includes(user.role)

  return { user, isLoading, hasAccess }
}

/**
 * Hook for checking permissions based on role
 */
export function usePermissions() {
  const { user } = useAuth()

  const can = (action: string): boolean => {
    if (!user) return false

    const permissions: Record<string, UserRole[]> = {
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

    const allowedRoles = permissions[action]
    return allowedRoles ? allowedRoles.includes(user.role) : false
  }

  const isAdmin = user?.role === "ADMIN"
  const isProducer = user?.role === "PRODUCER"
  const isEditor = user?.role === "EDITOR"
  const isReporter = user?.role === "REPORTER"

  return {
    can,
    isAdmin,
    isProducer,
    isEditor,
    isReporter,
    role: user?.role,
  }
}