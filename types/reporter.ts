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
  actual: string
  front: string
  cume: string
  lastModBy: string
  categoryId: string
  status: string
  script?: string
  notes?: string
  rowType: string
  blockCode: string
  sortOrder: number
}

export type SegmentType = Segment["type"]