import { Segment } from "@/lib/api-client"
import { SegmentType } from "./reporter"

export function formatDuration(secs: number): string {
  if (!secs) return "0:00"
  const mins = Math.floor(secs / 60)
  const seconds = Math.floor(secs % 60)
  return `${mins}:${seconds.toString().padStart(2, "0")}`
}

export function getSegmentClass(seg: string): string {
  const s = seg.toUpperCase()
  if (s === "LIVE") return "segment-live"
  if (s === "SOT" || s === "VOSOT") return "segment-sot"
  if (s === "PKG") return "segment-pkg"
  if (s.includes("IV") || s === "INTRO") return "segment-iv"
  if (s === "VO") return "segment-vo"
  if (s === "READER") return "segment-reader"
  if (s === "GRAPHIC") return "segment-graphic"
  if (s === "WEATHER") return "segment-weather"
  if (s === "SPORTS") return "segment-sports"
  if (s === "PHONER") return "segment-phoner"
  return ""
}

export function getBulletinStatusClass(status: string): string {
  return `status-${status.toLowerCase().replace("_", "-")}`
}

export function createPlaceholderSegment(
  rowId: string,
  name: string,
  description: string = ""
): Segment {
  const validTypes: SegmentType[] = [
    "LIVE", "PKG", "VO", "VOSOT", "SOT", "READER",
    "GRAPHIC", "VT", "IV", "PHONER", "WEATHER", "SPORTS"
  ]
  const upperName = name.toUpperCase()
  const segmentType: SegmentType = validTypes.includes(upperName as SegmentType)
    ? (upperName as SegmentType)
    : "LIVE"

  return {
    id: `temp-${rowId}`,
    rowId,
    name: upperName || "LIVE",
    type: segmentType,
    description,
    estDurationSecs: 0,
    sortOrder: 0,
    createdAt: "",
    updatedAt: "",
  }
}