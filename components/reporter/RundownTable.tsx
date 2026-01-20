// ============================================================================
// File: components/reporter/RundownTable.tsx
// Description: Rundown table with drag-and-drop, inline editing for slug,
//              segments, and EST duration
// ============================================================================

"use client"

import { useRef } from "react"
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
} from "@dnd-kit/core"
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"

import { Segment } from "@/lib/api-client"
import { RundownDisplayItem } from "@/types/reporter"
import SortableRow from "./SortableRow"
import DragOverlayRow from "./DragOverlayRow"

interface RundownTableProps {
  items: RundownDisplayItem[]
  isLoading: boolean
  selectedItemId: string | null
  selectedForDeleteIds: Set<string>
  selectedSegmentId: string | null
  activeId: string | null
  editingSlugRowId: string | null
  tempSlugValue: string
  editingSegmentId: string | null
  tempSegmentValue: string
  addingSegmentForRowId: string | null
  editingDurationRowId: string | null
  tempDurationValue: string
  onDragStart: (event: DragStartEvent) => void
  onDragEnd: (event: DragEndEvent) => void
  onRowClick: (item: RundownDisplayItem) => void
  onPgClick: (item: RundownDisplayItem, e: React.MouseEvent) => void
  onSlugDoubleClick: (rowId: string, slug: string) => void
  onSlugChange: (value: string) => void
  onSlugSave: () => void
  onSlugCancel: () => void
  onSegmentClick: (itemId: string, segment: Segment) => void
  onSegmentDoubleClick: (segment: Segment) => void
  onSegmentChange: (value: string) => void
  onSegmentSave: () => void
  onSegmentSaveNew: (rowId: string) => void
  onSegmentCancel: () => void
  onSegmentDelete: (segment: Segment) => void
  onAddSegment: (rowId: string) => void
  onFinalApprDoubleClick: (item: RundownDisplayItem) => void
  onFloatDoubleClick: (item: RundownDisplayItem) => void
  onDurationDoubleClick: (rowId: string, currentDuration: string) => void
  onDurationChange: (value: string) => void
  onDurationSave: () => void
  onDurationCancel: () => void
}

// Common border style
const cellBorder = "1px solid rgba(100, 116, 139, 0.3)"

export default function RundownTable({
  items,
  isLoading,
  selectedItemId,
  selectedForDeleteIds,
  selectedSegmentId,
  activeId,
  editingSlugRowId,
  tempSlugValue,
  editingSegmentId,
  tempSegmentValue,
  addingSegmentForRowId,
  editingDurationRowId,
  tempDurationValue,
  onDragStart,
  onDragEnd,
  onRowClick,
  onPgClick,
  onSlugDoubleClick,
  onSlugChange,
  onSlugSave,
  onSlugCancel,
  onSegmentClick,
  onSegmentDoubleClick,
  onSegmentChange,
  onSegmentSave,
  onSegmentSaveNew,
  onSegmentCancel,
  onSegmentDelete,
  onAddSegment,
  onFinalApprDoubleClick,
  onFloatDoubleClick,
  onDurationDoubleClick,
  onDurationChange,
  onDurationSave,
  onDurationCancel,
}: RundownTableProps) {
  const slugInputRef = useRef<HTMLInputElement>(null)
  const segmentInputRef = useRef<HTMLInputElement>(null)
  const durationInputRef = useRef<HTMLInputElement>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const activeItem = items.find((item) => item.id === activeId)

  // ─── Styles ─────────────────────────────────────────────────────

  const styles = {
    container: {
      flex: 1,
      overflow: "auto",
      border: cellBorder,
      borderRadius: "4px",
    },
    table: {
      width: "100%",
      borderCollapse: "collapse" as const,
      fontSize: "12px",
      userSelect: "none" as const,
    },
    th: {
      position: "sticky" as const,
      top: 0,
      background: "#2c3e50",
      color: "#ecf0f1",
      padding: "10px 8px",
      textAlign: "left" as const,
      fontWeight: 600,
      fontSize: "11px",
      textTransform: "uppercase" as const,
      letterSpacing: "0.5px",
      borderBottom: "2px solid #3498db",
      borderRight: cellBorder,
      whiteSpace: "nowrap" as const,
      zIndex: 10,
    },
    thLast: {
      position: "sticky" as const,
      top: 0,
      background: "#2c3e50",
      color: "#ecf0f1",
      padding: "10px 8px",
      textAlign: "left" as const,
      fontWeight: 600,
      fontSize: "11px",
      textTransform: "uppercase" as const,
      letterSpacing: "0.5px",
      borderBottom: "2px solid #3498db",
      whiteSpace: "nowrap" as const,
      zIndex: 10,
    },
    thDrag: {
      width: "30px",
      minWidth: "30px",
      maxWidth: "30px",
    },
    emptyRow: {
      textAlign: "center" as const,
      padding: "40px 20px",
      color: "#7f8c8d",
      fontSize: "14px",
      borderBottom: cellBorder,
    },
  }

  return (
    <div style={styles.container}>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
      >
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={{ ...styles.th, ...styles.thDrag }}></th>
              <th style={styles.th}>Pg</th>
              <th style={styles.th}>Story Slug</th>
              <th style={styles.th}>Segments</th>
              <th style={styles.th}>Story Produc</th>
              <th style={styles.th}>Final Appr</th>
              <th style={styles.th}>Float</th>
              <th style={styles.th}>Est Duration</th>
              <th style={styles.th}>Actual</th>
              <th style={styles.th}>Front</th>
              <th style={styles.th}>Cume</th>
              <th style={styles.thLast}>Last Mod By</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={12} style={styles.emptyRow}>
                  Loading stories...
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={12} style={styles.emptyRow}>
                  No stories in this bulletin yet
                </td>
              </tr>
            ) : (
              <SortableContext
                items={items.map((item) => item.id)}
                strategy={verticalListSortingStrategy}
              >
                {items.map((item) => (
                  <SortableRow
                    key={item.id}
                    item={item}
                    isSelected={selectedItemId === item.id}
                    isSelectedForDelete={selectedForDeleteIds.has(item.id)}
                    selectedSegmentId={selectedSegmentId}
                    editingSlugRowId={editingSlugRowId}
                    tempSlugValue={tempSlugValue}
                    editingSegmentId={editingSegmentId}
                    tempSegmentValue={tempSegmentValue}
                    addingSegmentForRowId={addingSegmentForRowId}
                    editingDurationRowId={editingDurationRowId}
                    tempDurationValue={tempDurationValue}
                    slugInputRef={slugInputRef}
                    segmentInputRef={segmentInputRef}
                    durationInputRef={durationInputRef}
                    onRowClick={onRowClick}
                    onPgClick={onPgClick}
                    onSlugDoubleClick={onSlugDoubleClick}
                    onSlugChange={onSlugChange}
                    onSlugKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault()
                        onSlugSave()
                      } else if (e.key === "Escape") {
                        onSlugCancel()
                      }
                    }}
                    onSlugBlur={onSlugSave}
                    onSegmentClick={onSegmentClick}
                    onSegmentDoubleClick={onSegmentDoubleClick}
                    onSegmentChange={onSegmentChange}
                    onSegmentKeyDown={(e, isNew, rowId) => {
                      if (e.key === "Enter") {
                        e.preventDefault()
                        if (isNew) {
                          onSegmentSaveNew(rowId)
                        } else {
                          onSegmentSave()
                        }
                      } else if (e.key === "Escape") {
                        onSegmentCancel()
                      }
                    }}
                    onSegmentBlur={(isNew, rowId) => {
                      if (isNew) {
                        onSegmentSaveNew(rowId)
                      } else {
                        onSegmentSave()
                      }
                    }}
                    onSegmentDelete={onSegmentDelete}
                    onAddSegment={onAddSegment}
                    onFinalApprDoubleClick={onFinalApprDoubleClick}
                    onFloatDoubleClick={onFloatDoubleClick}
                    onDurationDoubleClick={onDurationDoubleClick}
                    onDurationChange={onDurationChange}
                    onDurationKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault()
                        onDurationSave()
                      } else if (e.key === "Escape") {
                        onDurationCancel()
                      }
                    }}
                    onDurationBlur={onDurationSave}
                  />
                ))}
              </SortableContext>
            )}
          </tbody>
        </table>

        <DragOverlay>
          {activeItem ? <DragOverlayRow item={activeItem} /> : null}
        </DragOverlay>
      </DndContext>
    </div>
  )
}