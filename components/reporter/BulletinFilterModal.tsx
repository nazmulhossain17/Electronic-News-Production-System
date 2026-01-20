"use client"

import { useState, useEffect } from "react"
import { X, Filter, RotateCcw } from "lucide-react"

export interface BulletinFilters {
  status: string[]
  timeRange: {
    from: string
    to: string
  }
  producer: string
  desk: string
  hasStories: "all" | "with" | "without"
}

export const defaultFilters: BulletinFilters = {
  status: [],
  timeRange: {
    from: "",
    to: "",
  },
  producer: "",
  desk: "",
  hasStories: "all",
}

interface BulletinFilterModalProps {
  isOpen: boolean
  onClose: () => void
  filters: BulletinFilters
  onApplyFilters: (filters: BulletinFilters) => void
  producers?: { id: string; name: string }[]
  desks?: { id: string; name: string }[]
}

const BULLETIN_STATUSES = [
  { value: "PLANNING", label: "Planning", color: "#95a5a6" },
  { value: "ACTIVE", label: "Active", color: "#3498db" },
  { value: "LOCKED", label: "Locked", color: "#f39c12" },
  { value: "ON_AIR", label: "On Air", color: "#e74c3c" },
  { value: "COMPLETED", label: "Completed", color: "#27ae60" },
  { value: "ARCHIVED", label: "Archived", color: "#7f8c8d" },
]

export default function BulletinFilterModal({
  isOpen,
  onClose,
  filters,
  onApplyFilters,
  producers = [],
  desks = [],
}: BulletinFilterModalProps) {
  const [localFilters, setLocalFilters] = useState<BulletinFilters>(filters)

  useEffect(() => {
    if (isOpen) {
      setLocalFilters(filters)
    }
  }, [isOpen, filters])

  if (!isOpen) return null

  const handleStatusToggle = (status: string) => {
    setLocalFilters((prev) => ({
      ...prev,
      status: prev.status.includes(status)
        ? prev.status.filter((s) => s !== status)
        : [...prev.status, status],
    }))
  }

  const handleTimeRangeChange = (field: "from" | "to", value: string) => {
    setLocalFilters((prev) => ({
      ...prev,
      timeRange: {
        ...prev.timeRange,
        [field]: value,
      },
    }))
  }

  const handleReset = () => {
    setLocalFilters(defaultFilters)
  }

  const handleApply = () => {
    onApplyFilters(localFilters)
    onClose()
  }

  const hasActiveFilters =
    localFilters.status.length > 0 ||
    localFilters.timeRange.from !== "" ||
    localFilters.timeRange.to !== "" ||
    localFilters.producer !== "" ||
    localFilters.desk !== "" ||
    localFilters.hasStories !== "all"

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={styles.header}>
          <div style={styles.headerTitle}>
            <Filter size={18} />
            <span>Filter Bulletins</span>
          </div>
          <button style={styles.closeBtn} onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div style={styles.content}>
          {/* Status Filter */}
          <div style={styles.section}>
            <label style={styles.label}>Status</label>
            <div style={styles.statusGrid}>
              {BULLETIN_STATUSES.map((status) => {
                const isSelected = localFilters.status.includes(status.value)
                return (
                  <button
                    key={status.value}
                    style={{
                      ...styles.statusChip,
                      backgroundColor: isSelected ? status.color : "transparent",
                      borderColor: isSelected ? status.color : "#4a5568",
                      color: isSelected ? "white" : "#bdc3c7",
                    }}
                    onClick={() => handleStatusToggle(status.value)}
                  >
                    {status.label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Time Range Filter */}
          <div style={styles.section}>
            <label style={styles.label}>Time Range</label>
            <div style={styles.timeRangeRow}>
              <div style={styles.timeInputGroup}>
                <span style={styles.timeLabel}>From</span>
                <input
                  type="time"
                  value={localFilters.timeRange.from}
                  onChange={(e) => handleTimeRangeChange("from", e.target.value)}
                  style={styles.timeInput}
                />
              </div>
              <div style={styles.timeInputGroup}>
                <span style={styles.timeLabel}>To</span>
                <input
                  type="time"
                  value={localFilters.timeRange.to}
                  onChange={(e) => handleTimeRangeChange("to", e.target.value)}
                  style={styles.timeInput}
                />
              </div>
            </div>
          </div>

          {/* Producer Filter */}
          {producers.length > 0 && (
            <div style={styles.section}>
              <label style={styles.label}>Producer</label>
              <select
                value={localFilters.producer}
                onChange={(e) =>
                  setLocalFilters((prev) => ({ ...prev, producer: e.target.value }))
                }
                style={styles.select}
              >
                <option value="">All Producers</option>
                {producers.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Desk Filter */}
          {desks.length > 0 && (
            <div style={styles.section}>
              <label style={styles.label}>Desk</label>
              <select
                value={localFilters.desk}
                onChange={(e) =>
                  setLocalFilters((prev) => ({ ...prev, desk: e.target.value }))
                }
                style={styles.select}
              >
                <option value="">All Desks</option>
                {desks.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Has Stories Filter */}
          <div style={styles.section}>
            <label style={styles.label}>Stories</label>
            <div style={styles.radioGroup}>
              {[
                { value: "all", label: "All" },
                { value: "with", label: "With Stories" },
                { value: "without", label: "Empty" },
              ].map((option) => (
                <label key={option.value} style={styles.radioLabel}>
                  <input
                    type="radio"
                    name="hasStories"
                    value={option.value}
                    checked={localFilters.hasStories === option.value}
                    onChange={(e) =>
                      setLocalFilters((prev) => ({
                        ...prev,
                        hasStories: e.target.value as "all" | "with" | "without",
                      }))
                    }
                    style={styles.radio}
                  />
                  <span>{option.label}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={styles.footer}>
          <button
            style={{
              ...styles.resetBtn,
              opacity: hasActiveFilters ? 1 : 0.5,
              cursor: hasActiveFilters ? "pointer" : "not-allowed",
            }}
            onClick={handleReset}
            disabled={!hasActiveFilters}
          >
            <RotateCcw size={14} />
            Reset
          </button>
          <div style={styles.footerRight}>
            <button style={styles.cancelBtn} onClick={onClose}>
              Cancel
            </button>
            <button style={styles.applyBtn} onClick={handleApply}>
              Apply Filters
            </button>
          </div>
        </div>
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
    width: "400px",
    maxWidth: "90vw",
    maxHeight: "80vh",
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
    display: "flex",
    alignItems: "center",
    gap: "10px",
    fontSize: "16px",
    fontWeight: 600,
    color: "#ecf0f1",
  },
  closeBtn: {
    backgroundColor: "transparent",
    borderWidth: 0,
    color: "#95a5a6",
    cursor: "pointer",
    padding: "4px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: "4px",
  },
  content: {
    padding: "20px",
    overflowY: "auto",
    flex: 1,
  },
  section: {
    marginBottom: "20px",
  },
  label: {
    display: "block",
    fontSize: "13px",
    fontWeight: 500,
    color: "#bdc3c7",
    marginBottom: "8px",
  },
  statusGrid: {
    display: "flex",
    flexWrap: "wrap",
    gap: "8px",
  },
  statusChip: {
    padding: "6px 12px",
    borderRadius: "16px",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "#4a5568",
    fontSize: "12px",
    cursor: "pointer",
    transition: "all 0.2s",
  },
  timeRangeRow: {
    display: "flex",
    gap: "16px",
  },
  timeInputGroup: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    gap: "4px",
  },
  timeLabel: {
    fontSize: "11px",
    color: "#7f8c8d",
  },
  timeInput: {
    padding: "8px 12px",
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
  radioGroup: {
    display: "flex",
    gap: "16px",
  },
  radioLabel: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    fontSize: "13px",
    color: "#bdc3c7",
    cursor: "pointer",
  },
  radio: {
    accentColor: "#3498db",
  },
  footer: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "16px 20px",
    borderTopWidth: "1px",
    borderTopStyle: "solid",
    borderTopColor: "#34495e",
  },
  resetBtn: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    padding: "8px 12px",
    backgroundColor: "transparent",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "#4a5568",
    borderRadius: "4px",
    color: "#95a5a6",
    fontSize: "13px",
    cursor: "pointer",
  },
  footerRight: {
    display: "flex",
    gap: "10px",
  },
  cancelBtn: {
    padding: "8px 16px",
    backgroundColor: "transparent",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "#4a5568",
    borderRadius: "4px",
    color: "#bdc3c7",
    fontSize: "13px",
    cursor: "pointer",
  },
  applyBtn: {
    padding: "8px 16px",
    backgroundColor: "#3498db",
    borderWidth: 0,
    borderRadius: "4px",
    color: "white",
    fontSize: "13px",
    fontWeight: 500,
    cursor: "pointer",
  },
}