// ============================================================================
// File: lib/api-client.ts
// Description: Type-safe API client for ENPS application
// ============================================================================

const API_BASE = "/api"

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface Bulletin {
  id: string
  title: string
  subtitle?: string
  code?: string
  airDate: string
  startTime: string
  endTime?: string
  plannedDurationSecs: number
  totalEstDurationSecs?: number
  totalActualDurationSecs?: number
  totalCommercialSecs?: number
  timingVarianceSecs?: number
  status: "PLANNING" | "ACTIVE" | "LOCKED" | "ON_AIR" | "COMPLETED" | "ARCHIVED"
  isLocked: boolean
  producerId?: string
  producerName?: string
  deskId?: string
  notes?: string
  createdAt: string
  updatedAt: string
  // Additional display fields
  storyCount?: number
  progress?: number
}

export interface RundownRow {
  id: string
  bulletinId: string
  pageCode: string
  blockCode: string
  pageNumber: number
  sortOrder: number
  rowType: "STORY" | "COMMERCIAL" | "BREAK_LINK" | "OPEN" | "CLOSE" | "WELCOME"
  slug: string
  segment?: string
  storyProducerId?: string
  reporterId?: string
  finalApproval: boolean
  approvedBy?: string
  approvedAt?: string
  mosObjSlug?: string
  mosObjectTime?: string
  mosStatus?: string
  mosUserDuration?: string
  estDurationSecs: number
  actualDurationSecs?: number
  frontTimeSecs: number
  cumeTimeSecs: number
  float: boolean
  status: "BLANK" | "DRAFT" | "READY" | "APPROVED" | "KILLED" | "AIRED"
  breakNumber?: number
  script?: string
  notes?: string
  categoryId?: string
  lastModifiedBy: string
  lastModifiedByName?: string
  createdAt: string
  updatedAt: string
  // Display formats
  estDurationDisplay?: string
  actualDurationDisplay?: string
  frontTimeDisplay?: string
  cumeTimeDisplay?: string
}

export interface Segment {
  id: string
  rowId: string
  name: string
  type: "LIVE" | "PKG" | "VO" | "VOSOT" | "SOT" | "READER" | "GRAPHIC" | "VT" | "IV" | "PHONER" | "WEATHER" | "SPORTS"
  description: string | null  // Allow null
  estDurationSecs: number
  actualDurationSecs?: number
  sortOrder: number
  createdBy?: string
  createdAt: string
  updatedAt: string
}
export interface Category {
  id: string
  name: string
  code: string
  description?: string
  color: string
  isActive: boolean
}

export interface Pool {
  id: string
  name: string
  code: string
  type: string
  description?: string
  color: string
  storyCount: number
}

export interface PoolStory {
  id: string
  poolId: string
  slug: string
  segment: string
  estDurationSecs: number
  status: string
  reporterId?: string
  reporterName?: string
}

export interface User {
  id: string
  name: string
  email: string
  displayName?: string
  role: string
  deskId?: string
}

export interface Template {
  id: string
  name: string
  duration: number
  description?: string
}

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

async function fetchApi<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
    ...options,
  })

  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.error || data.message || "API request failed")
  }

  return data.data || data
}

// ═══════════════════════════════════════════════════════════════════════════════
// BULLETINS API
// ═══════════════════════════════════════════════════════════════════════════════

export const bulletinsApi = {
  list: async (params?: {
    date?: string
    startDate?: string
    endDate?: string
    status?: string
    limit?: number
    offset?: number
  }) => {
    const searchParams = new URLSearchParams()
    if (params?.date) searchParams.set("date", params.date)
    if (params?.startDate) searchParams.set("startDate", params.startDate)
    if (params?.endDate) searchParams.set("endDate", params.endDate)
    if (params?.status) searchParams.set("status", params.status)
    if (params?.limit) searchParams.set("limit", params.limit.toString())
    if (params?.offset) searchParams.set("offset", params.offset.toString())

    const query = searchParams.toString()
    return fetchApi<{ bulletins: Bulletin[]; pagination: any }>(
      `/bulletins${query ? `?${query}` : ""}`
    )
  },

  today: async (date?: string) => {
    const query = date ? `?date=${date}` : ""
    return fetchApi<{ date: string; bulletins: Bulletin[] }>(
      `/bulletins/today${query}`
    )
  },

  get: async (id: string) => {
    return fetchApi<{ bulletin: Bulletin; rows: RundownRow[] }>(
      `/bulletins/${id}`
    )
  },

  create: async (data: {
    title: string
    subtitle?: string
    code?: string
    airDate: string
    startTime: string
    endTime?: string
    plannedDurationSecs?: number
    producerId?: string
    deskId?: string
    notes?: string
    generateTemplate?: boolean
  }) => {
    return fetchApi<Bulletin>("/bulletins", {
      method: "POST",
      body: JSON.stringify(data),
    })
  },

  update: async (id: string, data: Partial<Bulletin>) => {
    return fetchApi<Bulletin>(`/bulletins/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    })
  },

  delete: async (id: string) => {
    return fetchApi<{ id: string }>(`/bulletins/${id}`, {
      method: "DELETE",
    })
  },

  lock: async (id: string) => {
    return fetchApi<Bulletin>(`/bulletins/${id}/lock`, {
      method: "POST",
    })
  },

  unlock: async (id: string) => {
    return fetchApi<Bulletin>(`/bulletins/${id}/unlock`, {
      method: "POST",
    })
  },

  recalculate: async (id: string) => {
    return fetchApi<{ rows: any[]; totals: any }>(`/bulletins/${id}/recalculate`, {
      method: "POST",
    })
  },

  autoGenerate: async (date: string) => {
    return fetchApi<{ bulletins: Bulletin[] }>("/bulletins/auto-generate", {
      method: "POST",
      body: JSON.stringify({ date }),
    })
  },
}

// ═══════════════════════════════════════════════════════════════════════════════
// SEGMENTS API
// ═══════════════════════════════════════════════════════════════════════════════

export const segmentsApi = {
  // List all segments for a row
  list: async (rowId: string) => {
    return fetchApi<{ segments: Segment[] }>(`/rows/${rowId}/segments`)
  },

  // Create a new segment for a row
  create: async (
    rowId: string,
    data: {
      name: string
      type?: Segment["type"]
      description?: string
      estDurationSecs?: number
    }
  ) => {
    return fetchApi<{ segment: Segment }>(`/rows/${rowId}/segments`, {
      method: "POST",
      body: JSON.stringify(data),
    })
  },

  // Get a single segment
  get: async (segmentId: string) => {
    return fetchApi<{ segment: Segment }>(`/segments/${segmentId}`)
  },

  // Update a segment
 // Update a segment
update: async (
  segmentId: string,
  data: Partial<{
    name: string
    type: Segment["type"]
    description: string  // Not null here - we convert null to empty string
    estDurationSecs: number
    sortOrder: number
  }>
) => {
  return fetchApi<{ segment: Segment }>(`/segments/${segmentId}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  })
},

  // Delete a segment
  delete: async (segmentId: string) => {
    return fetchApi<{ success: boolean; message: string }>(`/segments/${segmentId}`, {
      method: "DELETE",
    })
  },

  // Reorder segments within a row
  reorder: async (
    rowId: string,
    segments: Array<{ id: string; sortOrder: number }>
  ) => {
    return fetchApi<{ segments: Segment[] }>(`/rows/${rowId}/segments/reorder`, {
      method: "PUT",
      body: JSON.stringify({ segments }),
    })
  },

  // Bulk create segments for a row
  bulkCreate: async (
    rowId: string,
    segments: Array<{
      name: string
      type?: Segment["type"]
      description?: string
      estDurationSecs?: number
    }>
  ) => {
    return fetchApi<{ segments: Segment[] }>(`/rows/${rowId}/segments/bulk`, {
      method: "POST",
      body: JSON.stringify({ segments }),
    })
  },
}

// ═══════════════════════════════════════════════════════════════════════════════
// CATEGORIES API
// ═══════════════════════════════════════════════════════════════════════════════

export const categoriesApi = {
  list: async (deskId?: string) => {
    const query = deskId ? `?deskId=${deskId}` : ""
    return fetchApi<{ categories: Category[] }>(`/categories${query}`)
  },

  create: async (data: {
    name: string
    code: string
    description?: string
    color?: string
    deskId?: string
  }) => {
    return fetchApi<Category>("/categories", {
      method: "POST",
      body: JSON.stringify(data),
    })
  },

  update: async (
    id: string,
    data: Partial<{
      name: string
      code: string
      description: string
      color: string
      isActive: boolean
    }>
  ) => {
    return fetchApi<Category>(`/categories/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    })
  },

  delete: async (id: string) => {
    return fetchApi<{ id: string }>(`/categories/${id}`, {
      method: "DELETE",
    })
  },
}

// ═══════════════════════════════════════════════════════════════════════════════
// POOLS API
// ═══════════════════════════════════════════════════════════════════════════════

export const poolsApi = {
  list: async () => {
    return fetchApi<{ pools: Pool[] }>("/pools")
  },

  get: async (poolId: string) => {
    return fetchApi<{ pool: Pool }>(`/pools/${poolId}`)
  },

  getStories: async (poolId: string) => {
    return fetchApi<{ pool: Pool; stories: PoolStory[] }>(`/pools/${poolId}/stories`)
  },

  createStory: async (
    poolId: string,
    data: {
      slug: string
      segment?: string
      estDurationSecs?: number
      reporterId?: string
      status?: string
    }
  ) => {
    return fetchApi<PoolStory>(`/pools/${poolId}/stories`, {
      method: "POST",
      body: JSON.stringify(data),
    })
  },

  updateStory: async (
    storyId: string,
    data: Partial<{
      slug: string
      segment: string
      estDurationSecs: number
      reporterId: string | null
      status: string
    }>
  ) => {
    return fetchApi<PoolStory>(`/pool-stories/${storyId}`, {
      method: "PUT",
      body: JSON.stringify(data),
    })
  },

  deleteStory: async (storyId: string) => {
    return fetchApi<{ id: string }>(`/pool-stories/${storyId}`, {
      method: "DELETE",
    })
  },

  assignStory: async (
    storyId: string,
    data: {
      bulletinId: string
      blockCode: string
      insertAfter?: string
      insertAtPosition?: number
    }
  ) => {
    return fetchApi<{ row: RundownRow; pageCode: string }>(
      `/pool-stories/${storyId}/assign`,
      {
        method: "POST",
        body: JSON.stringify(data),
      }
    )
  },
}

// ═══════════════════════════════════════════════════════════════════════════════
// USERS API
// ═══════════════════════════════════════════════════════════════════════════════

export const usersApi = {
  list: async () => {
    return fetchApi<{ users: User[] }>("/users")
  },

  get: async (userId: string) => {
    return fetchApi<{ user: User }>(`/users/${userId}`)
  },

  me: async () => {
    return fetchApi<{ user: User }>("/me")
  },

  updateMe: async (data: { displayName?: string; phone?: string }) => {
    return fetchApi<User>("/me", {
      method: "PUT",
      body: JSON.stringify(data),
    })
  },
}

// ═══════════════════════════════════════════════════════════════════════════════
// DESKS API
// ═══════════════════════════════════════════════════════════════════════════════

export const desksApi = {
  list: async () => {
    return fetchApi<{ desks: any[] }>("/desks")
  },

  get: async (deskId: string) => {
    return fetchApi<{ desk: any }>(`/desks/${deskId}`)
  },

  create: async (data: {
    name: string
    code: string
    description?: string
    color?: string
  }) => {
    return fetchApi<any>("/desks", {
      method: "POST",
      body: JSON.stringify(data),
    })
  },

  update: async (
    id: string,
    data: Partial<{
      name: string
      code: string
      description: string
      color: string
      isActive: boolean
    }>
  ) => {
    return fetchApi<any>(`/desks/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    })
  },

  delete: async (id: string) => {
    return fetchApi<{ id: string }>(`/desks/${id}`, {
      method: "DELETE",
    })
  },
}

// ═══════════════════════════════════════════════════════════════════════════════
// TEMPLATES API
// ═══════════════════════════════════════════════════════════════════════════════

export const templatesApi = {
  list: async () => {
    try {
      return fetchApi<{ templates: Template[] }>("/bulletins/templates")
    } catch {
      return { templates: [] }
    }
  },

  get: async (templateId: string) => {
    return fetchApi<{ template: Template }>(`/bulletins/templates/${templateId}`)
  },

  create: async (data: {
    name: string
    duration: number
    description?: string
  }) => {
    return fetchApi<Template>("/bulletins/templates", {
      method: "POST",
      body: JSON.stringify(data),
    })
  },
}

// ═══════════════════════════════════════════════════════════════════════════════
// ACTIVITY LOGS API
// ═══════════════════════════════════════════════════════════════════════════════

export const activitiesApi = {
  list: async (params?: {
    bulletinId?: string
    userId?: string
    entityType?: string
    limit?: number
    offset?: number
  }) => {
    const searchParams = new URLSearchParams()
    if (params?.bulletinId) searchParams.set("bulletinId", params.bulletinId)
    if (params?.userId) searchParams.set("userId", params.userId)
    if (params?.entityType) searchParams.set("entityType", params.entityType)
    if (params?.limit) searchParams.set("limit", params.limit.toString())
    if (params?.offset) searchParams.set("offset", params.offset.toString())

    const query = searchParams.toString()
    return fetchApi<{ activities: any[]; pagination: any }>(
      `/activities${query ? `?${query}` : ""}`
    )
  },

  getBulletinActivities: async (bulletinId: string, limit?: number) => {
    const query = limit ? `?limit=${limit}` : ""
    return fetchApi<{ activities: any[] }>(`/bulletins/${bulletinId}/activities${query}`)
  },
}

// ═══════════════════════════════════════════════════════════════════════════════
// APP USER API
// ═══════════════════════════════════════════════════════════════════════════════

export const appUserApi = {
  check: async () => {
    return fetchApi<{ isSetup: boolean; hasAppUser: boolean; appUser: any | null }>(
      "/app-user/check"
    )
  },

  setup: async (data: {
    displayName: string | null
    phone: string | null
    role: "REPORTER" | "EDITOR" | "PRODUCER"
  }) => {
    return fetchApi<{ success: boolean; message: string }>("/app-user/setup", {
      method: "POST",
      body: JSON.stringify(data),
    })
  },

  getProfile: async () => {
    return fetchApi<{ success: boolean; appUser: any }>("/app-user/profile")
  },

  updateProfile: async (data: {
    displayName?: string | null
    phone?: string | null
    role?: "REPORTER" | "EDITOR" | "PRODUCER"
  }) => {
    return fetchApi<{ success: boolean; message: string; appUser: any }>(
      "/app-user/update",
      {
        method: "PATCH",
        body: JSON.stringify(data),
      }
    )
  },
}

// ═══════════════════════════════════════════════════════════════════════════════
// RUNDOWN ROWS API
// ═══════════════════════════════════════════════════════════════════════════════

export const rowsApi = {
  list: async (bulletinId: string) => {
    return fetchApi<{ rows: RundownRow[] }>(`/bulletins/${bulletinId}/rows`)
  },

  create: async (
    bulletinId: string,
    data: {
      blockCode: string
      rowType?: string
      slug?: string
      segment?: string
      estDurationSecs?: number
      reporterId?: string
      storyProducerId?: string
      insertAfter?: string
      insertAtPosition?: number
      status?: string
    }
  ) => {
    return fetchApi<RundownRow>(`/bulletins/${bulletinId}/rows`, {
      method: "POST",
      body: JSON.stringify(data),
    })
  },

  reorder: async (
    bulletinId: string,
    rows: Array<{ id: string; sortOrder: number; pageCode?: string; blockCode?: string }>
  ) => {
    return fetchApi<{ rows: any[]; totals: any }>(`/bulletins/${bulletinId}/rows/reorder`, {
      method: "PUT",
      body: JSON.stringify({ rows }),
    })
  },

  get: async (id: string) => {
    return fetchApi<{ row: RundownRow }>(`/rows/${id}`)
  },

  update: async (
    id: string,
    data: Partial<{
      slug: string
      segment: string
      rowType: string
      storyProducerId: string | null
      reporterId: string | null
      estDurationSecs: number
      actualDurationSecs: number | null
      float: boolean
      finalApproval: boolean  // ADDED THIS
      status: string
      script: string
      notes: string
      categoryId: string | null
    }>
  ) => {
    return fetchApi<RundownRow>(`/rows/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    })
  },

  delete: async (id: string) => {
    return fetchApi<{ id: string }>(`/rows/${id}`, {
      method: "DELETE",
    })
  },

  approve: async (id: string, approved: boolean, reason?: string) => {
    return fetchApi<RundownRow>(`/rows/${id}/approve`, {
      method: "POST",
      body: JSON.stringify({ approved, reason }),
    })
  },
}

// ═══════════════════════════════════════════════════════════════════════════════
// ADMIN API
// ═══════════════════════════════════════════════════════════════════════════════

export const adminApi = {
  assignRole: async (data: {
    targetUserId: string
    role: "REPORTER" | "EDITOR" | "PRODUCER" | "ADMIN"
  }) => {
    return fetchApi<{ success: boolean; message: string; appUser: any }>(
      "/app-user/admin/assign-role",
      {
        method: "POST",
        body: JSON.stringify(data),
      }
    )
  },

  listUsers: async () => {
    return fetchApi<{ users: any[] }>("/admin/users")
  },

  updateUser: async (
    userId: string,
    data: Partial<{
      role: string
      isActive: boolean
      deskId: string | null
    }>
  ) => {
    return fetchApi<{ user: any }>(`/admin/users/${userId}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    })
  },
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORT DEFAULT CLIENT
// ═══════════════════════════════════════════════════════════════════════════════

const api = {
  bulletins: bulletinsApi,
  rows: rowsApi,
  segments: segmentsApi,
  categories: categoriesApi,
  pools: poolsApi,
  users: usersApi,
  desks: desksApi,
  templates: templatesApi,
  activities: activitiesApi,
  appUser: appUserApi,
  admin: adminApi,
}

export default api