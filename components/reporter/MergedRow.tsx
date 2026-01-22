// ============================================================================
// File: components/reporter/MergedRow.tsx
// Description: Merged row component for displaying multiple rows with same slug
// ============================================================================

"use client"

import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { GripVertical, Check, CheckCircle } from "lucide-react"
import { Segment } from "@/lib/api-client"
import { RundownDisplayItem } from "@/types/reporter"

interface MergedRowProps {
  items: RundownDisplayItem[]
  isSelected: boolean
  isSelectedForDelete: boolean
  selectedSegmentId: string | null
  editingSlugRowId: string | null
  tempSlugValue: string
  editingSegmentId: string | null
  tempSegmentValue: string
  addingSegmentForRowId: string | null
  editingDurationRowId: string | null
  tempDurationValue: string
  slugInputRef: React.RefObject<HTMLInputElement | null>
  segmentInputRef: React.RefObject<HTMLInputElement | null>
  durationInputRef: React.RefObject<HTMLInputElement | null>
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
  onFinalApprDoubleClick: (item: RundownDisplayItem) => void
  onFloatDoubleClick: (item: RundownDisplayItem) => void
  onDurationDoubleClick: (rowId: string, currentDuration: string) => void
  onDurationChange: (value: string) => void
  onDurationKeyDown: (e: React.KeyboardEvent) => void
  onDurationBlur: () => void
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

export default function MergedRow({
  items,
  isSelected,
  isSelectedForDelete,
  selectedSegmentId,
  editingSlugRowId,
  tempSlugValue,
  editingSegmentId,
  tempSegmentValue,
  addingSegmentForRowId,
  editingDurationRowId,
  tempDurationValue,
  slugInputRef,
  segmentInputRef,
  durationInputRef,
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
  onFloatDoubleClick,
  onDurationDoubleClick,
  onDurationChange,
  onDurationKeyDown,
  onDurationBlur,
}: MergedRowProps) {
  // Use the first item for sortable and main row data
  const primaryItem = items[0]
  
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: primaryItem.id })

  // Check if any item in the group is floated or approved
  const isAnyFloated = items.some(item => item.float === "F" || item.float === "✓")
  const isAnyApproved = items.some(item => item.finalAppr === "✓")

  // Combine all segments from all items
  const allSegments = items.flatMap((item, itemIndex) => 
    item.segments.map(seg => ({ ...seg, itemId: item.id, itemIndex }))
  )

  // Calculate totals
  const totalEstDuration = items.reduce((sum, item) => {
    const [mins, secs] = (item.estDuration || "0:00").split(":").map(Number)
    return sum + (mins * 60 + (secs || 0))
  }, 0)
  const totalMins = Math.floor(totalEstDuration / 60)
  const totalSecs = totalEstDuration % 60
  const totalDurationDisplay = `${totalMins}:${totalSecs.toString().padStart(2, "0")}`

  // Get merged page codes
  const pageCodes = items.map(item => item.page).join(", ")

  // ─── Styles ─────────────────────────────────────────────────────

  const getRowStyle = (): React.CSSProperties => ({
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    backgroundColor: isDragging
      ? "rgba(52, 152, 219, 0.1)"
      : isAnyFloated
      ? "rgba(139, 0, 0, 0.25)"
      : isSelectedForDelete
      ? "rgba(231, 76, 60, 0.15)"
      : isSelected
      ? "rgba(52, 152, 219, 0.15)"
      : "transparent",
    borderLeft: isAnyFloated
      ? "3px solid #8b0000"
      : isSelectedForDelete
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
      verticalAlign: "top" as const,
    },
    pgCheckbox: {
      display: "flex",
      flexDirection: "column" as const,
      alignItems: "center",
      gap: "2px",
    },
    pgItem: {
      padding: "2px 0",
      borderBottom: "1px solid rgba(100, 116, 139, 0.2)",
    },
    pgItemLast: {
      padding: "2px 0",
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
      verticalAlign: "middle" as const,
    },
    slugText: {
      display: "block",
      padding: "2px 4px",
      fontWeight: 600,
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
      verticalAlign: "top" as const,
    },
    segmentsContainer: {
      display: "flex",
      flexDirection: "column" as const,
      gap: "0px",
    },
    segmentRow: {
      display: "flex",
      flexDirection: "column" as const,
    },
    segmentRowContent: {
      display: "flex",
      alignItems: "center",
      gap: "4px",
      padding: "2px 0",
    },
    segmentSeparator: {
      height: "1px",
      backgroundColor: "rgba(100, 116, 139, 0.4)",
      margin: "2px 0",
    },
    segmentTag: (name: string, isActive: boolean): React.CSSProperties => {
      const colors = segmentColors[name.toUpperCase()] || { bg: "#7f8c8d", border: "#95a5a6" }
      return {
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "4px",
        padding: "4px 12px",
        fontSize: "11px",
        fontWeight: 600,
        borderRadius: "3px",
        cursor: "pointer",
        background: colors.bg,
        border: isActive ? "2px solid #f1c40f" : `1px solid ${colors.border}`,
        color: "white",
        transition: "all 0.2s",
        boxShadow: isActive ? "0 0 8px rgba(241, 196, 15, 0.5)" : "none",
        minWidth: "60px",
        textAlign: "center" as const,
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
      width: "100%",
      height: "20px",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "transparent",
      border: "1px dashed #7f8c8d",
      borderRadius: "3px",
      color: "#7f8c8d",
      fontSize: "12px",
      cursor: "pointer",
      transition: "all 0.2s",
      marginTop: "4px",
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
    floatCell: {
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
    floatIcon: {
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    },
    durationCell: {
      padding: "8px",
      fontSize: "12px",
      borderBottom: cellBorder,
      borderRight: cellBorder,
      verticalAlign: "middle" as const,
      cursor: "pointer",
      transition: "background 0.2s",
    },
    durationText: {
      display: "block",
      padding: "2px 4px",
    },
    durationInput: {
      width: "60px",
      padding: "4px 6px",
      fontSize: "12px",
      fontWeight: 500,
      background: "#1a1a2e",
      border: "1px solid #3498db",
      borderRadius: "3px",
      color: "#ecf0f1",
      outline: "none",
      textAlign: "center" as const,
    },
    mergedIndicator: {
      fontSize: "10px",
      color: "#7f8c8d",
      fontStyle: "italic" as const,
    },
  }

  return (
    <tr
      ref={setNodeRef}
      style={getRowStyle()}
      onClick={() => onRowClick(primaryItem)}
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

      {/* PG Cell - Show all page codes stacked */}
      <td
        style={styles.pg}
        onClick={(e) => {
          e.stopPropagation()
          onPgClick(primaryItem, e)
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
        title="Click to select"
      >
        <div style={styles.pgCheckbox}>
          {isSelectedForDelete && <Check size={14} style={styles.checkIcon} />}
          {items.map((item, idx) => (
            <div 
              key={item.id} 
              style={idx < items.length - 1 ? styles.pgItem : styles.pgItemLast}
            >
              {item.page}
            </div>
          ))}
        </div>
      </td>

      {/* Editable Slug Cell - Shows single slug for merged rows */}
      <td
        style={styles.slug}
        onDoubleClick={(e) => {
          e.stopPropagation()
          onSlugDoubleClick(primaryItem.id, primaryItem.slug)
        }}
        title="Double-click to edit"
      >
        {editingSlugRowId === primaryItem.id ? (
          <input
            ref={slugInputRef}
            type="text"
            value={tempSlugValue}
            onChange={(e) => onSlugChange(e.target.value.toUpperCase())}
            onKeyDown={onSlugKeyDown}
            onBlur={onSlugBlur}
            style={styles.slugInput}
            onClick={(e) => e.stopPropagation()}
            autoFocus
          />
        ) : (
          <>
            <span style={styles.slugText}>{primaryItem.slug || "(empty)"}</span>
            {items.length > 1 && (
              <span style={styles.mergedIndicator}>({items.length} rows merged)</span>
            )}
          </>
        )}
      </td>

      {/* Segments - Stacked vertically from all merged rows */}
      <td style={styles.segmentCell}>
        <div style={styles.segmentsContainer}>
          {items.map((item, itemIndex) => (
            <div key={item.id}>
              {item.segments.map((seg, segIndex) => (
                <div key={seg.id} style={styles.segmentRow}>
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
                      autoFocus
                    />
                  ) : (
                    <div style={styles.segmentRowContent}>
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
                      {/* Allow delete if: total segments in merged group > 1, or this item has > 1 segment */}
                      {(allSegments.length > 1 || item.segments.length > 1) && !seg.id.startsWith("temp-") && (
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
                    </div>
                  )}
                  {/* Separator between segments */}
                  {(segIndex < item.segments.length - 1 || itemIndex < items.length - 1) && (
                    <div style={styles.segmentSeparator} />
                  )}
                </div>
              ))}
              
              {/* Add segment button for each row */}
              {addingSegmentForRowId === item.id ? (
                <div style={styles.segmentRow}>
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
                    autoFocus
                  />
                </div>
              ) : null}
            </div>
          ))}
          
          {/* Single add button at the bottom */}
          <button
            style={styles.segmentAddBtn}
            onClick={(e) => {
              e.stopPropagation()
              onAddSegment(primaryItem.id)
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
        </div>
      </td>

      <td style={styles.td}>{primaryItem.storyProduc}</td>
      
      {/* Final Approval */}
      <td
        style={styles.finalAppr}
        onDoubleClick={(e) => {
          e.stopPropagation()
          onFinalApprDoubleClick(primaryItem)
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = "rgba(39, 174, 96, 0.2)"
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "transparent"
        }}
        title="Double-click to toggle approval"
      >
        {isAnyApproved ? (
          <div style={styles.approvedIcon}>
            <CheckCircle size={18} color="#27ae60" />
          </div>
        ) : null}
      </td>

      {/* Float */}
      <td
        style={{
          ...styles.floatCell,
          backgroundColor: isAnyFloated ? "rgba(139, 0, 0, 0.4)" : "transparent",
        }}
        onDoubleClick={(e) => {
          e.stopPropagation()
          onFloatDoubleClick(primaryItem)
        }}
        onMouseEnter={(e) => {
          if (!isAnyFloated) {
            e.currentTarget.style.background = "rgba(139, 0, 0, 0.2)"
          }
        }}
        onMouseLeave={(e) => {
          if (!isAnyFloated) {
            e.currentTarget.style.background = "transparent"
          }
        }}
        title="Double-click to float/unfloat"
      >
        {isAnyFloated ? (
          <div style={styles.floatIcon}>
            <Check size={16} color="#fff" strokeWidth={3} />
          </div>
        ) : null}
      </td>

      {/* EST Duration - Show total for merged rows */}
      <td
        style={styles.durationCell}
        onDoubleClick={(e) => {
          e.stopPropagation()
          onDurationDoubleClick(primaryItem.id, primaryItem.estDuration)
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = "rgba(52, 152, 219, 0.1)"
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "transparent"
        }}
        title="Double-click to edit"
      >
        {editingDurationRowId === primaryItem.id ? (
          <input
            ref={durationInputRef}
            type="text"
            value={tempDurationValue}
            onChange={(e) => onDurationChange(e.target.value)}
            onKeyDown={onDurationKeyDown}
            onBlur={onDurationBlur}
            style={styles.durationInput}
            onClick={(e) => e.stopPropagation()}
            placeholder="M:SS"
            autoFocus
          />
        ) : (
          <span style={styles.durationText}>
            {items.length > 1 ? totalDurationDisplay : primaryItem.estDuration}
          </span>
        )}
      </td>

      <td style={styles.td}>{primaryItem.actual}</td>
      <td style={styles.td}>{primaryItem.front}</td>
      <td style={styles.td}>{primaryItem.cume}</td>
      <td style={styles.tdLast}>{primaryItem.lastModBy}</td>
    </tr>
  )
}