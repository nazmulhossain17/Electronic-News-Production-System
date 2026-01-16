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
import SortableRow from "./SortableRow"
import DragOverlayRow from "./DragOverlayRow"
import { RundownDisplayItem } from "@/types/reporter"

interface RundownTableProps {
  items: RundownDisplayItem[]
  isLoading: boolean
  selectedItemId: string | null
  selectedSegmentId: string | null
  activeId: string | null
  editingSlugRowId: string | null
  tempSlugValue: string
  editingSegmentId: string | null
  tempSegmentValue: string
  addingSegmentForRowId: string | null
  onDragStart: (event: DragStartEvent) => void
  onDragEnd: (event: DragEndEvent) => void
  onRowClick: (item: RundownDisplayItem) => void
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
}

export default function RundownTable({
  items,
  isLoading,
  selectedItemId,
  selectedSegmentId,
  activeId,
  editingSlugRowId,
  tempSlugValue,
  editingSegmentId,
  tempSegmentValue,
  addingSegmentForRowId,
  onDragStart,
  onDragEnd,
  onRowClick,
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
}: RundownTableProps) {
  const slugInputRef = useRef<HTMLInputElement>(null)
  const segmentInputRef = useRef<HTMLInputElement>(null)

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

  return (
    <div className="table-container">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
      >
        <table className="enps-rundown-table">
          <thead>
            <tr>
              <th className="drag-col"></th>
              <th>Pg</th>
              <th>Story Slug</th>
              <th>Segments</th>
              <th>Story Produc</th>
              <th>Final Appr</th>
              <th>Float</th>
              <th>Est Duration</th>
              <th>Actual</th>
              <th>Front</th>
              <th>Cume</th>
              <th>Last Mod By</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={12} className="empty-row">
                  Loading stories...
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={12} className="empty-row">
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
                    selectedSegmentId={selectedSegmentId}
                    editingSlugRowId={editingSlugRowId}
                    tempSlugValue={tempSlugValue}
                    editingSegmentId={editingSegmentId}
                    tempSegmentValue={tempSegmentValue}
                    addingSegmentForRowId={addingSegmentForRowId}
                    slugInputRef={slugInputRef}
                    segmentInputRef={segmentInputRef}
                    onRowClick={onRowClick}
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