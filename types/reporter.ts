// ============================================================================
// File: types/reporter.ts
// Description: Type definitions for reporter interface components
// ============================================================================

// types/reporter.ts
// Updated RundownDisplayItem type with creator info

import { Segment } from "@/lib/api-client"

export interface RundownDisplayItem {
  id: string
  page: string
  slug: string
  segments: Segment[]
  storyProduc: string
  finalAppr: string
  float: string
  estDuration: string
  estDurationSecs?: number // Add raw seconds for editing
  actual: string
  front: string
  cume: string
  lastModBy: string
  createdByName?: string  // NEW: Creator name
  categoryId: string
  status: string
  script?: string | null
  notes?: string | null
  rowType: string
  blockCode?: string
  sortOrder: number
}