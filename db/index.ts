// ============================================================================
// File: lib/db.ts
// Description: Database connection with Drizzle ORM
// ============================================================================

import { drizzle } from "drizzle-orm/node-postgres"
import { Pool } from "pg"
import * as schema from "./schema"

// Create connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL!,
  max: 20, // Maximum connections in pool
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
})

// Initialize Drizzle with schema for relational queries
export const db = drizzle(pool, { schema })

// Export pool for direct access if needed
export { pool }

export default db