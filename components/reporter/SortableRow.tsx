"use client"

import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { GripVertical } from "lucide-react"
import { Segment } from "@/lib/api-client"
import { RundownDisplayItem } from "@/types/reporter"
import { getSegmentClass } from "@/types/helpers"

interface SortableRowProps {
  item: RundownDisplayItem
  isSelected: boolean
  selectedSegmentId: string | null
  editingSlugRowId: string | null
  tempSlugValue: string
  editingSegmentId: string | null
  tempSegmentValue: string
  addingSegmentForRowId: string | null
  slugInputRef: React.RefObject<HTMLInputElement | null>
  segmentInputRef: React.RefObject<HTMLInputElement | null>
  onRowClick: (item: RundownDisplayItem) => void
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
}

export default function SortableRow({
  item,
  isSelected,
  selectedSegmentId,
  editingSlugRowId,
  tempSlugValue,
  editingSegmentId,
  tempSegmentValue,
  addingSegmentForRowId,
  slugInputRef,
  segmentInputRef,
  onRowClick,
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
}: SortableRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    backgroundColor: isDragging ? "rgba(52, 152, 219, 0.1)" : undefined,
  }

  return (
    <tr
      ref={setNodeRef}
      style={style}
      className={`rundown-row ${isSelected ? "selected" : ""} ${
        item.finalAppr ? "approved" : ""
      } ${isDragging ? "dragging" : ""}`}
      onClick={() => onRowClick(item)}
    >
      {/* Drag Handle */}
      <td className="drag-handle" {...attributes} {...listeners}>
        <GripVertical size={16} />
      </td>

      <td className="pg">{item.page}</td>

      {/* Editable Slug Cell */}
      <td
        className="slug"
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
            className="slug-edit-input"
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <span className="slug-text">{item.slug || "(empty)"}</span>
        )}
      </td>

      {/* Multiple Segments */}
      <td className="segment-cell">
        <div className="segments-container">
          {item.segments.map((seg) => (
            <div key={seg.id} className="segment-item">
              {editingSegmentId === seg.id ? (
                <input
                  ref={segmentInputRef}
                  type="text"
                  value={tempSegmentValue}
                  onChange={(e) => onSegmentChange(e.target.value.toUpperCase())}
                  onKeyDown={(e) => onSegmentKeyDown(e, false, item.id)}
                  onBlur={() => onSegmentBlur(false, item.id)}
                  className="segment-edit-input"
                  maxLength={12}
                />
              ) : (
                <>
                  <span
                    className={`segment-tag ${getSegmentClass(seg.name)} ${
                      selectedSegmentId === seg.id ? "segment-active" : ""
                    }`}
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
                    {seg.description && <span className="segment-has-desc">•</span>}
                  </span>
                  {item.segments.length > 1 && !seg.id.startsWith("temp-") && (
                    <button
                      className="segment-delete-btn"
                      onClick={(e) => {
                        e.stopPropagation()
                        onSegmentDelete(seg)
                      }}
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
            <div className="segment-item">
              <input
                ref={segmentInputRef}
                type="text"
                value={tempSegmentValue}
                onChange={(e) => onSegmentChange(e.target.value.toUpperCase())}
                onKeyDown={(e) => onSegmentKeyDown(e, true, item.id)}
                onBlur={() => onSegmentBlur(true, item.id)}
                className="segment-edit-input"
                maxLength={12}
                placeholder="TYPE..."
              />
            </div>
          ) : (
            <button
              className="segment-add-btn"
              onClick={(e) => {
                e.stopPropagation()
                onAddSegment(item.id)
              }}
              title="Add segment"
            >
              +
            </button>
          )}
        </div>
      </td>

      <td className="story-produc">{item.storyProduc}</td>
      <td className="approved">{item.finalAppr}</td>
      <td className="float">{item.float}</td>
      <td className="duration">{item.estDuration}</td>
      <td className="duration">{item.actual}</td>
      <td className="front">{item.front}</td>
      <td className="cume">{item.cume}</td>
      <td className="mod-by">{item.lastModBy}</td>
    </tr>
  )
}