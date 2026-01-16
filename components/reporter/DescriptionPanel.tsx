"use client"

import { Trash2 } from "lucide-react"
import { Category, Segment } from "@/lib/api-client"
import { RundownDisplayItem } from "@/types/reporter"
import { getSegmentClass } from "@/types/helpers"

interface DescriptionPanelProps {
  selectedItem: RundownDisplayItem
  selectedSegment: Segment
  selectedSegmentId: string | null
  categories: Category[]
  selectedCategoryId: string | undefined
  editDescription: string
  isSaving: boolean
  saveMessage: string
  isDeletePending: boolean
  onClose: () => void
  onSegmentSelect: (segmentId: string) => void
  onCategoryChange: (categoryId: string) => void
  onDescriptionChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void
  onManualSave: () => void
  onDeleteSegment: (segment: Segment) => void
}

export default function DescriptionPanel({
  selectedItem,
  selectedSegment,
  selectedSegmentId,
  categories,
  selectedCategoryId,
  editDescription,
  isSaving,
  saveMessage,
  isDeletePending,
  onClose,
  onSegmentSelect,
  onCategoryChange,
  onDescriptionChange,
  onManualSave,
  onDeleteSegment,
}: DescriptionPanelProps) {
  const isTempSegment = selectedSegmentId?.startsWith("temp-")

  return (
    <div className="description-panel">
      <div className="panel-header">
        <div className="panel-title">
          {selectedItem.slug} - {selectedSegment.name}
        </div>
        <button className="close-btn" onClick={onClose}>
          ×
        </button>
      </div>

      <div className="panel-content">
        {/* Save Status */}
        {saveMessage && (
          <div className={`save-message ${isSaving ? "saving" : "saved"}`}>
            {isSaving ? "Saving..." : saveMessage}
          </div>
        )}

        {/* Segment Selector */}
        <div className="field">
          <label>Select Segment</label>
          <div className="segment-selector">
            {selectedItem.segments.map((seg) => (
              <button
                key={seg.id}
                className={`segment-selector-btn ${
                  selectedSegmentId === seg.id ? "active" : ""
                } ${getSegmentClass(seg.name)}`}
                onClick={() => onSegmentSelect(seg.id)}
              >
                {seg.name}
              </button>
            ))}
          </div>
        </div>

        {/* Category */}
        <div className="field">
          <label>Category</label>
          <select
            value={selectedCategoryId || ""}
            onChange={(e) => onCategoryChange(e.target.value)}
          >
            <option value="">Select category...</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        {/* Segment Description */}
        <div className="field">
          <label>
            Segment Description
            {isSaving && <span className="saving-indicator">●</span>}
          </label>
          <textarea
            value={editDescription}
            onChange={onDescriptionChange}
            rows={12}
            placeholder={`Enter description for ${selectedSegment.name} segment...`}
            className="description-textarea"
            disabled={isTempSegment}
          />
          {isTempSegment && (
            <p style={{ fontSize: "11px", color: "#f39c12", marginTop: "4px" }}>
              ⚠️ Add a real segment first to enable description editing
            </p>
          )}
        </div>

        {/* Delete Segment Button */}
        {!isTempSegment && selectedItem.segments.length > 1 && (
          <div className="field">
            <button
              className="btn cancel"
              style={{ background: "#e74c3c", color: "white" }}
              onClick={() => onDeleteSegment(selectedSegment)}
              disabled={isDeletePending}
            >
              <Trash2 size={14} style={{ marginRight: "6px" }} />
              Delete This Segment
            </button>
          </div>
        )}

        {/* Actions */}
        <div className="actions">
          <button
            className="btn save"
            onClick={onManualSave}
            disabled={isSaving || isTempSegment}
          >
            {isSaving ? "SAVING..." : "SAVE NOW"}
          </button>
          <button className="btn cancel" onClick={onClose}>
            CLOSE
          </button>
        </div>
      </div>
    </div>
  )
}