// ============================================================================
// File: components/reporter/DescriptionPanel.tsx
// Description: Right panel showing segment details, history, and description
// ============================================================================

"use client"

import { X, Trash2, Save, User, Clock, Edit3 } from "lucide-react"
import { Segment } from "@/lib/api-client"
import { RundownDisplayItem } from "@/types/reporter"

interface Category {
  id: string
  name: string
  color?: string
}

interface DescriptionPanelProps {
  selectedItem: RundownDisplayItem
  selectedSegment: Segment
  selectedSegmentId: string | null
  categories: Category[]
  selectedCategoryId?: string
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
  const isPlaceholder = selectedSegmentId?.startsWith("temp-")

  return (
    <div style={styles.panel}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerTitle}>
          <span style={styles.pageCode}>{selectedItem.page}</span>
          <span style={styles.slug}>{selectedItem.slug}</span>
          <span style={styles.segmentName}>- {selectedSegment.name}</span>
        </div>
        <button style={styles.closeBtn} onClick={onClose}>
          <X size={18} />
        </button>
      </div>

      {/* Content */}
      <div style={styles.content}>
        {/* Segment Selection */}
        <div style={styles.section}>
          <label style={styles.label}>SELECT SEGMENT</label>
          <div style={styles.segmentTabs}>
            {selectedItem.segments.map((seg) => (
              <button
                key={seg.id}
                style={{
                  ...styles.segmentTab,
                  ...(selectedSegmentId === seg.id ? styles.segmentTabActive : {}),
                }}
                onClick={() => onSegmentSelect(seg.id)}
              >
                {seg.name}
              </button>
            ))}
          </div>
        </div>

        {/* Category Selection */}
        <div style={styles.section}>
          <label style={styles.label}>CATEGORY</label>
          <select
            style={styles.select}
            value={selectedCategoryId || ""}
            onChange={(e) => onCategoryChange(e.target.value)}
          >
            <option value="">Select category...</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
        </div>

        {/* Creator & Last Editor Info */}
        <div style={styles.section}>
          <label style={styles.label}>HISTORY</label>
          <div style={styles.historyContainer}>
            {/* Created By */}
            <div style={styles.historyItem}>
              <User size={14} style={styles.historyIcon} />
              <div style={styles.historyContent}>
                <span style={styles.historyLabel}>Created by</span>
                <span style={styles.historyValue}>
                  {selectedItem.createdByName || "Unknown"}
                </span>
              </div>
            </div>
            
            {/* Last Modified By */}
            <div style={styles.historyItem}>
              <Edit3 size={14} style={styles.historyIcon} />
              <div style={styles.historyContent}>
                <span style={styles.historyLabel}>Last edited by</span>
                <span style={styles.historyValue}>
                  {selectedItem.lastModBy || "SYSTEM"}
                </span>
              </div>
            </div>

            {/* Timing Info */}
            <div style={styles.historyItemLast}>
              <Clock size={14} style={styles.historyIcon} />
              <div style={styles.historyContent}>
                <span style={styles.historyLabel}>Duration</span>
                <span style={styles.historyValue}>
                  Est: {selectedItem.estDuration}
                  {selectedItem.actual && ` • Actual: ${selectedItem.actual}`}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Segment Description */}
        <div style={styles.section}>
          <div style={styles.labelRow}>
            <label style={styles.label}>SEGMENT DESCRIPTION</label>
            {isSaving && <span style={styles.savingIndicator}>Saving...</span>}
            {saveMessage && !isSaving && (
              <span style={styles.savedIndicator}>{saveMessage}</span>
            )}
          </div>
          <textarea
            style={{
              ...styles.textarea,
              ...(isPlaceholder ? styles.textareaDisabled : {}),
            }}
            value={editDescription}
            onChange={onDescriptionChange}
            placeholder={
              isPlaceholder
                ? "Save this segment first to add description"
                : "Enter segment description..."
            }
            disabled={isPlaceholder}
          />
        </div>

        {/* Action Buttons */}
        <div style={styles.actions}>
          <button
            style={styles.saveBtn}
            onClick={onManualSave}
            disabled={isPlaceholder || isSaving}
          >
            <Save size={14} />
            Save
          </button>
          <button
            style={{
              ...styles.deleteBtn,
              ...(isPlaceholder || selectedItem.segments.length <= 1
                ? styles.deleteBtnDisabled
                : {}),
            }}
            onClick={() => onDeleteSegment(selectedSegment)}
            disabled={isPlaceholder || isDeletePending || selectedItem.segments.length <= 1}
            title={
              selectedItem.segments.length <= 1
                ? "Cannot delete the last segment"
                : "Delete this segment"
            }
          >
            <Trash2 size={14} />
            {isDeletePending ? "Deleting..." : "Delete Segment"}
          </button>
        </div>
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  panel: {
    width: "320px",
    backgroundColor: "#2c3e50",
    borderLeftWidth: "1px",
    borderLeftStyle: "solid",
    borderLeftColor: "#34495e",
    display: "flex",
    flexDirection: "column",
    height: "100%",
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "12px 16px",
    borderBottomWidth: "1px",
    borderBottomStyle: "solid",
    borderBottomColor: "#34495e",
    backgroundColor: "rgba(0, 0, 0, 0.1)",
  },
  headerTitle: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    fontSize: "14px",
    fontWeight: 600,
    color: "#ecf0f1",
    overflow: "hidden",
    flex: 1,
  },
  pageCode: {
    backgroundColor: "#3498db",
    color: "white",
    padding: "2px 6px",
    borderRadius: "4px",
    fontSize: "12px",
    fontWeight: 600,
    flexShrink: 0,
  },
  slug: {
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  segmentName: {
    color: "#f39c12",
    fontSize: "12px",
    flexShrink: 0,
  },
  closeBtn: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: "28px",
    height: "28px",
    backgroundColor: "transparent",
    borderWidth: 0,
    borderRadius: "4px",
    color: "#95a5a6",
    cursor: "pointer",
    flexShrink: 0,
  },
  content: {
    flex: 1,
    padding: "16px",
    overflowY: "auto",
    display: "flex",
    flexDirection: "column",
  },
  section: {
    marginBottom: "20px",
  },
  label: {
    display: "block",
    fontSize: "11px",
    fontWeight: 600,
    color: "#7f8c8d",
    marginBottom: "8px",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
  },
  labelRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: "8px",
  },
  savingIndicator: {
    fontSize: "11px",
    color: "#f39c12",
  },
  savedIndicator: {
    fontSize: "11px",
    color: "#27ae60",
  },
  segmentTabs: {
    display: "flex",
    flexWrap: "wrap",
    gap: "8px",
  },
  segmentTab: {
    padding: "6px 12px",
    backgroundColor: "transparent",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "#4a5568",
    borderRadius: "4px",
    color: "#bdc3c7",
    fontSize: "12px",
    cursor: "pointer",
    transition: "all 0.2s",
  },
  segmentTabActive: {
    backgroundColor: "#f39c12",
    borderColor: "#f39c12",
    color: "white",
  },
  select: {
    width: "100%",
    padding: "10px 12px",
    backgroundColor: "#34495e",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "#4a5568",
    borderRadius: "4px",
    color: "#ecf0f1",
    fontSize: "13px",
    cursor: "pointer",
  },
  historyContainer: {
    backgroundColor: "#34495e",
    borderRadius: "6px",
    padding: "4px 12px",
  },
  historyItem: {
    display: "flex",
    alignItems: "flex-start",
    gap: "10px",
    paddingTop: "10px",
    paddingBottom: "10px",
    borderBottomWidth: "1px",
    borderBottomStyle: "solid",
    borderBottomColor: "#4a5568",
  },
  historyItemLast: {
    display: "flex",
    alignItems: "flex-start",
    gap: "10px",
    paddingTop: "10px",
    paddingBottom: "10px",
  },
  historyIcon: {
    color: "#7f8c8d",
    marginTop: "2px",
    flexShrink: 0,
  },
  historyContent: {
    display: "flex",
    flexDirection: "column",
    gap: "2px",
    flex: 1,
    minWidth: 0,
  },
  historyLabel: {
    fontSize: "10px",
    color: "#7f8c8d",
    textTransform: "uppercase",
  },
  historyValue: {
    fontSize: "13px",
    color: "#ecf0f1",
    fontWeight: 500,
  },
  textarea: {
    width: "100%",
    minHeight: "120px",
    padding: "12px",
    backgroundColor: "#34495e",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "#4a5568",
    borderRadius: "4px",
    color: "#ecf0f1",
    fontSize: "13px",
    resize: "vertical",
    fontFamily: "inherit",
  },
  textareaDisabled: {
    opacity: 0.6,
    cursor: "not-allowed",
  },
  actions: {
    display: "flex",
    gap: "10px",
    marginTop: "auto",
    paddingTop: "16px",
  },
  saveBtn: {
    flex: 1,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "6px",
    padding: "10px 16px",
    backgroundColor: "#27ae60",
    borderWidth: 0,
    borderRadius: "4px",
    color: "white",
    fontSize: "13px",
    fontWeight: 500,
    cursor: "pointer",
  },
  deleteBtn: {
    flex: 1,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "6px",
    padding: "10px 16px",
    backgroundColor: "#e74c3c",
    borderWidth: 0,
    borderRadius: "4px",
    color: "white",
    fontSize: "13px",
    fontWeight: 500,
    cursor: "pointer",
  },
  deleteBtnDisabled: {
    opacity: 0.5,
    cursor: "not-allowed",
  },
}