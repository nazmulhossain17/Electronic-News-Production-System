// ============================================================================
// File: components/reporter/BulletinEditModal.tsx
// Description: Modal for editing bulletin details
// ============================================================================

"use client"

import { useState, useEffect } from "react"
import { X, Save, Loader2 } from "lucide-react"
import { Bulletin } from "@/lib/api-client"

interface BulletinEditModalProps {
  isOpen: boolean
  bulletin: Bulletin | null
  onClose: () => void
  onSave: (id: string, data: BulletinUpdateData) => Promise<void>
  isSaving?: boolean
}

export interface BulletinUpdateData {
  title?: string
  subtitle?: string
  startTime?: string
  endTime?: string
  plannedDurationSecs?: number
  status?: string
  notes?: string
}

const BULLETIN_STATUSES = [
  { value: "PLANNING", label: "Planning" },
  { value: "ACTIVE", label: "Active" },
  { value: "LOCKED", label: "Locked" },
  { value: "ON_AIR", label: "On Air" },
  { value: "COMPLETED", label: "Completed" },
  { value: "ARCHIVED", label: "Archived" },
]

export default function BulletinEditModal({
  isOpen,
  bulletin,
  onClose,
  onSave,
  isSaving = false,
}: BulletinEditModalProps) {
  const [title, setTitle] = useState("")
  const [subtitle, setSubtitle] = useState("")
  const [startTime, setStartTime] = useState("")
  const [endTime, setEndTime] = useState("")
  const [plannedDuration, setPlannedDuration] = useState("30")
  const [status, setStatus] = useState("PLANNING")
  const [notes, setNotes] = useState("")

  useEffect(() => {
    if (bulletin && isOpen) {
      setTitle(bulletin.title || "")
      setSubtitle(bulletin.subtitle || "")
      setStartTime(bulletin.startTime || "")
      setEndTime(bulletin.endTime || "")
      setPlannedDuration(
        bulletin.plannedDurationSecs
          ? String(Math.floor(bulletin.plannedDurationSecs / 60))
          : "30"
      )
      setStatus(bulletin.status || "PLANNING")
      setNotes(bulletin.notes || "")
    }
  }, [bulletin, isOpen])

  if (!isOpen || !bulletin) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const updateData: BulletinUpdateData = {
      title: title.trim(),
      subtitle: subtitle.trim() || undefined,
      startTime,
      endTime: endTime || undefined,
      plannedDurationSecs: parseInt(plannedDuration, 10) * 60,
      status,
      notes: notes.trim() || undefined,
    }

    await onSave(bulletin.id, updateData)
  }

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={styles.header}>
          <h2 style={styles.headerTitle}>Edit Bulletin</h2>
          <button style={styles.closeBtn} onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={styles.form}>
          {/* Title */}
          <div style={styles.field}>
            <label style={styles.label}>Title *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              style={styles.input}
              placeholder="e.g., 6AM News"
              required
            />
          </div>

          {/* Subtitle */}
          <div style={styles.field}>
            <label style={styles.label}>Subtitle</label>
            <input
              type="text"
              value={subtitle}
              onChange={(e) => setSubtitle(e.target.value)}
              style={styles.input}
              placeholder="Optional subtitle"
            />
          </div>

          {/* Time Row */}
          <div style={styles.row}>
            <div style={styles.fieldHalf}>
              <label style={styles.label}>Start Time *</label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                style={styles.input}
                required
              />
            </div>
            <div style={styles.fieldHalf}>
              <label style={styles.label}>End Time</label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                style={styles.input}
              />
            </div>
          </div>

          {/* Duration & Status Row */}
          <div style={styles.row}>
            <div style={styles.fieldHalf}>
              <label style={styles.label}>Duration (minutes)</label>
              <input
                type="number"
                value={plannedDuration}
                onChange={(e) => setPlannedDuration(e.target.value)}
                style={styles.input}
                min="1"
                max="180"
              />
            </div>
            <div style={styles.fieldHalf}>
              <label style={styles.label}>Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                style={styles.select}
              >
                {BULLETIN_STATUSES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Notes */}
          <div style={styles.field}>
            <label style={styles.label}>Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              style={styles.textarea}
              placeholder="Optional notes..."
              rows={3}
            />
          </div>

          {/* Actions */}
          <div style={styles.actions}>
            <button
              type="button"
              style={styles.cancelBtn}
              onClick={onClose}
              disabled={isSaving}
            >
              Cancel
            </button>
            <button
              type="submit"
              style={styles.saveBtn}
              disabled={isSaving || !title.trim() || !startTime}
            >
              {isSaving ? (
                <>
                  <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} />
                  Saving...
                </>
              ) : (
                <>
                  <Save size={16} />
                  Save Changes
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
  },
  modal: {
    backgroundColor: "#2c3e50",
    borderRadius: "8px",
    width: "480px",
    maxWidth: "90vw",
    maxHeight: "90vh",
    display: "flex",
    flexDirection: "column",
    boxShadow: "0 4px 20px rgba(0, 0, 0, 0.3)",
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "16px 20px",
    borderBottomWidth: "1px",
    borderBottomStyle: "solid",
    borderBottomColor: "#34495e",
  },
  headerTitle: {
    fontSize: "18px",
    fontWeight: 600,
    color: "#ecf0f1",
    margin: 0,
  },
  closeBtn: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: "32px",
    height: "32px",
    backgroundColor: "transparent",
    borderWidth: 0,
    borderRadius: "4px",
    color: "#95a5a6",
    cursor: "pointer",
  },
  form: {
    padding: "20px",
    overflowY: "auto",
  },
  field: {
    marginBottom: "16px",
  },
  fieldHalf: {
    flex: 1,
  },
  row: {
    display: "flex",
    gap: "16px",
    marginBottom: "16px",
  },
  label: {
    display: "block",
    fontSize: "12px",
    fontWeight: 500,
    color: "#bdc3c7",
    marginBottom: "6px",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
  },
  input: {
    width: "100%",
    padding: "10px 12px",
    backgroundColor: "#34495e",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "#4a5568",
    borderRadius: "4px",
    color: "#ecf0f1",
    fontSize: "14px",
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
    fontSize: "14px",
    cursor: "pointer",
  },
  textarea: {
    width: "100%",
    padding: "10px 12px",
    backgroundColor: "#34495e",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "#4a5568",
    borderRadius: "4px",
    color: "#ecf0f1",
    fontSize: "14px",
    resize: "vertical",
    fontFamily: "inherit",
  },
  actions: {
    display: "flex",
    justifyContent: "flex-end",
    gap: "12px",
    marginTop: "24px",
    paddingTop: "16px",
    borderTopWidth: "1px",
    borderTopStyle: "solid",
    borderTopColor: "#34495e",
  },
  cancelBtn: {
    padding: "10px 20px",
    backgroundColor: "transparent",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "#4a5568",
    borderRadius: "4px",
    color: "#bdc3c7",
    fontSize: "14px",
    cursor: "pointer",
  },
  saveBtn: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "10px 20px",
    backgroundColor: "#27ae60",
    borderWidth: 0,
    borderRadius: "4px",
    color: "white",
    fontSize: "14px",
    fontWeight: 500,
    cursor: "pointer",
  },
}