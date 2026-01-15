// ============================================================================
// File: app/api/bulletins/templates/route.ts
// Description: Bulletin template definitions
// ============================================================================

import { NextRequest } from "next/server"
import { requireAuth } from "@/lib/auth"
import { successResponse, serverErrorResponse } from "@/lib/api-response"

// Static template definitions
const TEMPLATES = [
  {
    id: "standard-30",
    name: "Standard 30-min",
    description: "Standard 30-minute bulletin with 4 blocks and 3 commercial breaks",
    durationSecs: 1800,
    blocks: ["A", "B", "C", "D"],
    commercialBreaks: 3,
    structure: [
      { block: "A", slots: 7, hasOpen: true, hasWelcome: true },
      { block: "B", slots: 2, hasBreakLink: true },
      { block: "C", slots: 2, hasBreakLink: true },
      { block: "D", slots: 4, hasClose: true },
    ],
  },
  {
    id: "extended-45",
    name: "Extended 45-min",
    description: "Extended 45-minute bulletin with 5 blocks and 4 commercial breaks",
    durationSecs: 2700,
    blocks: ["A", "B", "C", "D", "E"],
    commercialBreaks: 4,
    structure: [
      { block: "A", slots: 8, hasOpen: true, hasWelcome: true },
      { block: "B", slots: 3, hasBreakLink: true },
      { block: "C", slots: 3, hasBreakLink: true },
      { block: "D", slots: 3, hasBreakLink: true },
      { block: "E", slots: 4, hasClose: true },
    ],
  },
  {
    id: "prime-time-60",
    name: "Prime Time 60-min",
    description: "Prime time 60-minute bulletin with 6 blocks and 5 commercial breaks",
    durationSecs: 3600,
    blocks: ["A", "B", "C", "D", "E", "F"],
    commercialBreaks: 5,
    structure: [
      { block: "A", slots: 10, hasOpen: true, hasWelcome: true },
      { block: "B", slots: 4, hasBreakLink: true },
      { block: "C", slots: 4, hasBreakLink: true },
      { block: "D", slots: 4, hasBreakLink: true },
      { block: "E", slots: 4, hasBreakLink: true },
      { block: "F", slots: 5, hasClose: true },
    ],
  },
  {
    id: "breaking-15",
    name: "Breaking News 15-min",
    description: "Short breaking news bulletin with 2 blocks",
    durationSecs: 900,
    blocks: ["A", "B"],
    commercialBreaks: 1,
    structure: [
      { block: "A", slots: 4, hasOpen: true },
      { block: "B", slots: 3, hasClose: true },
    ],
  },
  {
    id: "sports-20",
    name: "Sports 20-min",
    description: "Sports bulletin with 3 blocks and 2 commercial breaks",
    durationSecs: 1200,
    blocks: ["S", "T", "Z"],
    commercialBreaks: 2,
    structure: [
      { block: "S", slots: 5, hasOpen: true },
      { block: "T", slots: 4, hasBreakLink: true },
      { block: "Z", slots: 4, hasClose: true },
    ],
  },
]

/**
 * GET /api/bulletins/templates
 * Get available bulletin templates
 */
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth(request)
    if ("error" in authResult) return authResult.error

    return successResponse({ templates: TEMPLATES })
  } catch (error) {
    return serverErrorResponse(error)
  }
}