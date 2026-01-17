"use client"

import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { GripVertical, Check, CheckCircle } from "lucide-react"
import { Segment } from "@/lib/api-client"
import { RundownDisplayItem } from "@/types/reporter"

interface SortableRowProps {
  item: RundownDisplayItem
  isSelected: boolean
  isSelectedForDelete: boolean
  selectedSegmentId: string | null
  editingSlugRowId: string | null
  tempSlugValue: string
  editingSegmentId: string | null
  tempSegmentValue: string
  addingSegmentForRowId: string | null
  slugInputRef: React.RefObject<HTMLInputElement | null>
  segmentInputRef: React.RefObject<HTMLInputElement | null>
  onRowClick: (item: RundownDisplayItem) => void
  onPgClick: (item: RundownDisplayItem, e: React.MouseEvent) => void
  onSlugDoubleClick: (rowId: string, slug: string) => void
  onSlugChange: (value: string) => void
  onSlugKeyDown: (e: React.KeyboardEvent) => void
  onSlugBlur: () => void
  onSegmentClick: (itemId: string, segment: Segment) => void
  onSegmentDoubleClick: (segment: Segment) => void
  onSegmentChange: (value: string) => void
  onSegmentKeyDown: (e: React.KeyboardEvent, isNew: boolean, rowId: string) => void
  onSegmentBlur: (isNew: boolean, rowId: string) => void
  onSegmentDelete: (segment: Segment) => void
  onAddSegment: (rowId: string) => void
  onFinalApprDoubleClick: (item: RundownDisplayItem) => void  // NEW
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

// Common border style
const cellBorder = "1px solid rgba(100, 116, 139, 0.3)"

export default function SortableRow({
  item,
  isSelected,
  isSelectedForDelete,
  selectedSegmentId,
  editingSlugRowId,
  tempSlugValue,
  editingSegmentId,
  tempSegmentValue,
  addingSegmentForRowId,
  slugInputRef,
  segmentInputRef,
  onRowClick,
  onPgClick,
  onSlugDoubleClick,
  onSlugChange,
  onSlugKeyDown,
  onSlugBlur,
  onSegmentClick,
  onSegmentDoubleClick,
  onSegmentChange,
  onSegmentKeyDown,
  onSegmentBlur,
  onSegmentDelete,
  onAddSegment,
  onFinalApprDoubleClick,
}: SortableRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id })

  const isApproved = item.finalAppr === "✓"

  // ─── Styles ─────────────────────────────────────────────────────

  const getRowStyle = (): React.CSSProperties => ({
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    backgroundColor: isDragging
      ? "rgba(52, 152, 219, 0.1)"
      : isSelectedForDelete
      ? "rgba(231, 76, 60, 0.15)"
      : isSelected
      ? "rgba(52, 152, 219, 0.15)"
      : "transparent",
    borderLeft: isSelectedForDelete
      ? "3px solid #e74c3c"
      : isSelected
      ? "3px solid #3498db"
      : "3px solid transparent",
  })

  const styles = {
    dragHandle: {
      width: "30px",
      minWidth: "30px",
      maxWidth: "30px",
      padding: "4px",
      cursor: "grab",
      color: "#7f8c8d",
      textAlign: "center" as const,
      verticalAlign: "middle" as const,
      transition: "color 0.2s, background 0.2s",
      borderBottom: cellBorder,
      borderRight: cellBorder,
    },
    pg: {
      cursor: "pointer",
      fontWeight: isSelectedForDelete ? "bold" : "normal",
      color: isSelectedForDelete ? "#fff" : "inherit",
      background: isSelectedForDelete ? "#e74c3c" : "transparent",
      transition: "all 0.2s",
      padding: "8px",
      textAlign: "center" as const,
      position: "relative" as const,
      userSelect: "none" as const,
      borderBottom: cellBorder,
      borderRight: cellBorder,
    },
    pgCheckbox: {
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      gap: "4px",
    },
    checkIcon: {
      width: "14px",
      height: "14px",
    },
    slug: {
      cursor: "pointer",
      minWidth: "150px",
      padding: "8px",
      borderBottom: cellBorder,
      borderRight: cellBorder,
    },
    slugText: {
      display: "block",
      padding: "2px 4px",
    },
    slugInput: {
      width: "100%",
      minWidth: "120px",
      padding: "4px 6px",
      fontSize: "12px",
      fontWeight: 600,
      textTransform: "uppercase" as const,
      background: "#1a1a2e",
      border: "1px solid #3498db",
      borderRadius: "3px",
      color: "#ecf0f1",
      outline: "none",
    },
    segmentCell: {
      padding: "4px 8px",
      borderBottom: cellBorder,
      borderRight: cellBorder,
    },
    segmentsContainer: {
      display: "flex",
      flexWrap: "wrap" as const,
      gap: "4px",
      alignItems: "center",
    },
    segmentItem: {
      display: "flex",
      alignItems: "center",
      gap: "2px",
    },
    segmentTag: (name: string, isActive: boolean): React.CSSProperties => {
      const colors = segmentColors[name.toUpperCase()] || { bg: "#7f8c8d", border: "#95a5a6" }
      return {
        display: "inline-flex",
        alignItems: "center",
        gap: "4px",
        padding: "3px 8px",
        fontSize: "11px",
        fontWeight: 600,
        borderRadius: "3px",
        cursor: "pointer",
        background: colors.bg,
        border: isActive ? "2px solid #f1c40f" : `1px solid ${colors.border}`,
        color: "white",
        transition: "all 0.2s",
        boxShadow: isActive ? "0 0 8px rgba(241, 196, 15, 0.5)" : "none",
      }
    },
    segmentHasDesc: {
      marginLeft: "2px",
      color: "#f1c40f",
    },
    segmentDeleteBtn: {
      width: "16px",
      height: "16px",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "rgba(231, 76, 60, 0.8)",
      border: "none",
      borderRadius: "50%",
      color: "white",
      fontSize: "12px",
      cursor: "pointer",
      opacity: 0.7,
      transition: "opacity 0.2s",
    },
    segmentAddBtn: {
      width: "24px",
      height: "24px",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "transparent",
      border: "1px dashed #7f8c8d",
      borderRadius: "3px",
      color: "#7f8c8d",
      fontSize: "14px",
      cursor: "pointer",
      transition: "all 0.2s",
    },
    segmentInput: {
      width: "60px",
      padding: "3px 6px",
      fontSize: "11px",
      fontWeight: 600,
      textTransform: "uppercase" as const,
      background: "#1a1a2e",
      border: "1px solid #3498db",
      borderRadius: "3px",
      color: "#ecf0f1",
      outline: "none",
    },
    td: {
      padding: "8px",
      fontSize: "12px",
      borderBottom: cellBorder,
      borderRight: cellBorder,
      verticalAlign: "middle" as const,
    },
    tdLast: {
      padding: "8px",
      fontSize: "12px",
      borderBottom: cellBorder,
      verticalAlign: "middle" as const,
    },
    finalAppr: {
      padding: "8px",
      fontSize: "12px",
      borderBottom: cellBorder,
      borderRight: cellBorder,
      verticalAlign: "middle" as const,
      textAlign: "center" as const,
      cursor: "pointer",
      userSelect: "none" as const,
      transition: "background 0.2s",
    },
    approvedIcon: {
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    },
  }

  return (
    <tr
      ref={setNodeRef}
      style={getRowStyle()}
      onClick={() => onRowClick(item)}
    >
      {/* Drag Handle */}
      <td
        style={styles.dragHandle}
        {...attributes}
        {...listeners}
        onMouseEnter={(e) => {
          e.currentTarget.style.color = "#3498db"
          e.currentTarget.style.background = "rgba(52, 152, 219, 0.1)"
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.color = "#7f8c8d"
          e.currentTarget.style.background = "transparent"
        }}
      >
        <GripVertical size={16} />
      </td>

      {/* PG Cell - Click to toggle selection */}
      <td
        style={styles.pg}
        onClick={(e) => {
          e.stopPropagation()
          onPgClick(item, e)
        }}
        onMouseEnter={(e) => {
          if (!isSelectedForDelete) {
            e.currentTarget.style.background = "rgba(231, 76, 60, 0.3)"
          }
        }}
        onMouseLeave={(e) => {
          if (!isSelectedForDelete) {
            e.currentTarget.style.background = "transparent"
          }
        }}
        title="Click to select (Ctrl+Click for multi-select, Shift+Click for range)"
      >
        <div style={styles.pgCheckbox}>
          {isSelectedForDelete && <Check size={14} style={styles.checkIcon} />}
          <span>{item.page}</span>
        </div>
      </td>

      {/* Editable Slug Cell */}
      <td
        style={styles.slug}
        onDoubleClick={(e) => {
          e.stopPropagation()
          onSlugDoubleClick(item.id, item.slug)
        }}
        title="Double-click to edit"
      >
        {editingSlugRowId === item.id ? (
          <input
            ref={slugInputRef}
            type="text"
            value={tempSlugValue}
            onChange={(e) => onSlugChange(e.target.value.toUpperCase())}
            onKeyDown={onSlugKeyDown}
            onBlur={onSlugBlur}
            style={styles.slugInput}
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <span style={styles.slugText}>{item.slug || "(empty)"}</span>
        )}
      </td>

      {/* Multiple Segments */}
      <td style={styles.segmentCell}>
        <div style={styles.segmentsContainer}>
          {item.segments.map((seg) => (
            <div key={seg.id} style={styles.segmentItem}>
              {editingSegmentId === seg.id ? (
                <input
                  ref={segmentInputRef}
                  type="text"
                  value={tempSegmentValue}
                  onChange={(e) => onSegmentChange(e.target.value.toUpperCase())}
                  onKeyDown={(e) => onSegmentKeyDown(e, false, item.id)}
                  onBlur={() => onSegmentBlur(false, item.id)}
                  style={styles.segmentInput}
                  maxLength={12}
                />
              ) : (
                <>
                  <span
                    style={styles.segmentTag(seg.name, selectedSegmentId === seg.id)}
                    onClick={(e) => {
                      e.stopPropagation()
                      onSegmentClick(item.id, seg)
                    }}
                    onDoubleClick={(e) => {
                      e.stopPropagation()
                      onSegmentDoubleClick(seg)
                    }}
                    title={seg.description || "Double-click to edit name"}
                  >
                    {seg.name}
                    {seg.description && <span style={styles.segmentHasDesc}>•</span>}
                  </span>
                  {item.segments.length > 1 && !seg.id.startsWith("temp-") && (
                    <button
                      style={styles.segmentDeleteBtn}
                      onClick={(e) => {
                        e.stopPropagation()
                        onSegmentDelete(seg)
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.opacity = "1")}
                      onMouseLeave={(e) => (e.currentTarget.style.opacity = "0.7")}
                      title="Delete segment"
                    >
                      ×
                    </button>
                  )}
                </>
              )}
            </div>
          ))}

          {/* Add New Segment Input */}
          {addingSegmentForRowId === item.id ? (
            <div style={styles.segmentItem}>
              <input
                ref={segmentInputRef}
                type="text"
                value={tempSegmentValue}
                onChange={(e) => onSegmentChange(e.target.value.toUpperCase())}
                onKeyDown={(e) => onSegmentKeyDown(e, true, item.id)}
                onBlur={() => onSegmentBlur(true, item.id)}
                style={styles.segmentInput}
                maxLength={12}
                placeholder="TYPE..."
              />
            </div>
          ) : (
            <button
              style={styles.segmentAddBtn}
              onClick={(e) => {
                e.stopPropagation()
                onAddSegment(item.id)
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "#3498db"
                e.currentTarget.style.color = "#3498db"
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "#7f8c8d"
                e.currentTarget.style.color = "#7f8c8d"
              }}
              title="Add segment"
            >
              +
            </button>
          )}
        </div>
      </td>

      <td style={styles.td}>{item.storyProduc}</td>
      
      {/* Final Approval - Double click to toggle */}
      <td
        style={styles.finalAppr}
        onDoubleClick={(e) => {
          e.stopPropagation()
          onFinalApprDoubleClick(item)
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = "rgba(39, 174, 96, 0.2)"
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "transparent"
        }}
        title="Double-click to toggle approval"
      >
        {isApproved ? (
          <div style={styles.approvedIcon}>
            <CheckCircle size={18} color="#27ae60" />
          </div>
        ) : null}
      </td>

      <td style={styles.td}>{item.float}</td>
      <td style={styles.td}>{item.estDuration}</td>
      <td style={styles.td}>{item.actual}</td>
      <td style={styles.td}>{item.front}</td>
      <td style={styles.td}>{item.cume}</td>
      <td style={styles.tdLast}>{item.lastModBy}</td>
    </tr>
  )
}