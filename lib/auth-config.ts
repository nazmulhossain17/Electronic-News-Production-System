// ============================================================================
// File: lib/auth-config.ts
// Description: Better Auth server configuration
// ============================================================================

import { betterAuth } from "better-auth"
import { drizzleAdapter } from "better-auth/adapters/drizzle"
import { eq } from "drizzle-orm"
import db from "@/db"
import { account, session, user, verification, appUsers } from "@/db/schema"

// Define user type for callbacks
interface AuthUser {
  id: string
  email: string
  name?: string | null
  image?: string | null
  emailVerified: boolean
  createdAt: Date
  updatedAt: Date
}

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user,
      session,
      account,
      verification,
    },
  }),

  baseURL: process.env.BETTER_AUTH_URL || "http://localhost:3000",
  basePath: "/api/auth",
  secret: process.env.BETTER_AUTH_SECRET || "your-secret-key-change-in-production",

  trustedOrigins: [
    process.env.BETTER_AUTH_URL || "http://localhost:3000",
  ],

  // Email & Password authentication ONLY
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
    minPasswordLength: 8,
    maxPasswordLength: 128,
  },

  // Session configuration
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // Update session every 24 hours
    cookieCache: {
      enabled: true,
      maxAge: 60 * 5, // 5 minutes
    },
  },

  // Advanced configuration
  advanced: {
    cookiePrefix: "enps",
    useSecureCookies: process.env.NODE_ENV === "production",
  },

  // IMPORTANT: Do NOT add custom fields to user table
  // Role management is in appUsers table with relationName
  // This prevents Better Auth from trying to add "role" field to user table

  // Callbacks
  callbacks: {
    // Called after a new user is created
    async onUserCreated({ user: createdUser }: { user: AuthUser }) {
      try {
        console.log("✅ User created:", createdUser.email)
        console.log("📝 Creating app profile with default REPORTER role...")

        // Create app user profile with REPORTER role as default
        await db.insert(appUsers).values({
          userId: createdUser.id,
          displayName: createdUser.name?.split(" ")[0]?.toUpperCase() || "USER",
          role: "REPORTER", // Always default to REPORTER
          isActive: true,
        })

        console.log("✅ App profile created with REPORTER role")
      } catch (error) {
        console.error("⚠️ Failed to create app profile:", error)
        if (error instanceof Error) {
          console.error("Error message:", error.message)
        }
        // Don't throw - let user creation succeed
      }
    },

    // Called after successful sign-in
    async onSignInSuccess({ user: signedInUser }: { user: AuthUser }) {
      try {
        // Update last active timestamp
        await db
          .update(appUsers)
          .set({ lastActiveAt: new Date() })
          .where(eq(appUsers.userId, signedInUser.id))
      } catch (error) {
        console.error("Failed to update last active:", error)
      }
    },
  },
})

export type Session = typeof auth.$Infer.Session
export type User = typeof auth.$Infer.Session.user