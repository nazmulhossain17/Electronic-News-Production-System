"use client"

import { RundownDisplayItem } from "@/types/reporter";
import { GripVertical } from "lucide-react"

interface DragOverlayRowProps {
  item: RundownDisplayItem
}

// Segment color mapping
const segmentColors: Record<string, { bg: string; border: string }> = {
  LIVE: { bg: "#27ae60", border: "#2ecc71" },
  PKG: { bg: "#8e44ad", border: "#9b59b6" },
  VO: { bg: "#2980b9", border: "#3498db" },
  SOT: { bg: "#c0392b", border: "#e74c3c" },
  VOSOT: { bg: "#c0392b", border: "#e74c3c" },
  IV: { bg: "#d35400", border: "#e67e22" },
  READER: { bg: "#16a085", border: "#1abc9c" },
  GRAPHIC: { bg: "#8e44ad", border: "#9b59b6" },
  VT: { bg: "#f39c12", border: "#f1c40f" },
  PHONER: { bg: "#1abc9c", border: "#16a085" },
  WEATHER: { bg: "#3498db", border: "#2980b9" },
  SPORTS: { bg: "#e74c3c", border: "#c0392b" },
}

export default function DragOverlayRow({ item }: DragOverlayRowProps) {
  const styles = {
    table: {
      width: "100%",
      background: "#1a1a2e",
      borderRadius: "4px",
      overflow: "hidden",
      borderCollapse: "collapse" as const,
    },
    row: {
      background: "#2c3e50",
      boxShadow: "0 4px 20px rgba(0, 0, 0, 0.4)",
      border: "2px solid #3498db",
    },
    td: {
      padding: "8px",
      fontSize: "12px",
      color: "#ecf0f1",
    },
    dragHandle: {
      width: "30px",
      padding: "4px",
      color: "#7f8c8d",
      textAlign: "center" as const,
    },
    segmentsContainer: {
      display: "flex",
      gap: "4px",
      flexWrap: "wrap" as const,
    },
    segmentTag: (name: string): React.CSSProperties => {
      const colors = segmentColors[name.toUpperCase()] || { bg: "#7f8c8d", border: "#95a5a6" }
      return {
        display: "inline-block",
        padding: "3px 8px",
        fontSize: "11px",
        fontWeight: 600,
        borderRadius: "3px",
        background: colors.bg,
        border: `1px solid ${colors.border}`,
        color: "white",
      }
    },
  }

  return (
    <table style={styles.table}>
      <tbody>
        <tr style={styles.row}>
          <td style={styles.dragHandle}>
            <GripVertical size={16} />
          </td>
          <td style={styles.td}>{item.page}</td>
          <td style={styles.td}>{item.slug || "(empty)"}</td>
          <td style={styles.td}>
            <div style={styles.segmentsContainer}>
              {item.segments.map((seg) => (
                <span key={seg.id} style={styles.segmentTag(seg.name)}>
                  {seg.name}
                </span>
              ))}
            </div>
          </td>
          <td style={styles.td}>{item.storyProduc}</td>
          <td style={styles.td}>{item.finalAppr}</td>
          <td style={styles.td}>{item.float}</td>
          <td style={styles.td}>{item.estDuration}</td>
          <td style={styles.td}>{item.actual}</td>
          <td style={styles.td}>{item.front}</td>
          <td style={styles.td}>{item.cume}</td>
          <td style={styles.td}>{item.lastModBy}</td>
        </tr>
      </tbody>
    </table>
  )
}