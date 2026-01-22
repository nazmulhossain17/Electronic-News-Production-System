// ============================================================================
// File: components/reporter/BulletinsSidebar.tsx
// Description: Bulletins sidebar with drag-and-drop reordering, edit/delete
// ============================================================================

"use client"

import { useState, useMemo, useCallback } from "react"
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
  useSortable,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import {
  Filter,
  ChevronLeft,
  ChevronRight,
  Calendar,
  GripVertical,
  Edit2,
  Trash2,
  Download,
} from "lucide-react"
import { Bulletin } from "@/lib/api-client"
import { getBulletinStatusClass } from "@/types/helpers"
import BulletinFilterModal, {
  BulletinFilters,
  defaultFilters,
} from "./BulletinFilterModal"

// Roles that are allowed to see the filter option
const FILTER_ALLOWED_ROLES = ["ADMIN", "EDITOR"]

interface BulletinsSidebarProps {
  bulletins: Bulletin[]
  isLoading: boolean
  selectedBulletinId: string | null
  selectedDate: Date
  onSelectBulletin: (id: string) => void
  onDateChange: (date: Date) => void
  onEditBulletin?: (bulletin: Bulletin) => void
  onDeleteBulletin?: (bulletinId: string) => void
  onDownloadBulletin?: (bulletinId: string) => void
  onReorderBulletins?: (bulletinIds: string[]) => void
  producers?: { id: string; name: string }[]
  desks?: { id: string; name: string }[]
  userRole?: string
}

// ─── Sortable Bulletin Item ───────────────────────────────────────
interface SortableBulletinItemProps {
  bulletin: Bulletin
  isSelected: boolean
  onSelect: (id: string) => void
  onEdit?: (bulletin: Bulletin) => void
  onDelete?: (id: string) => void
  onDownload?: (id: string) => void
  canEdit: boolean
}

function SortableBulletinItem({
  bulletin,
  isSelected,
  onSelect,
  onEdit,
  onDelete,
  onDownload,
  canEdit,
}: SortableBulletinItemProps) {
  const [showActions, setShowActions] = useState(false)
  
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: bulletin.id, disabled: !canEdit })

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation()
    onEdit?.(bulletin)
    setShowActions(false)
  }

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (window.confirm(`Are you sure you want to delete "${bulletin.title}"?`)) {
      onDelete?.(bulletin.id)
    }
    setShowActions(false)
  }

  const handleDownload = (e: React.MouseEvent) => {
    e.stopPropagation()
    onDownload?.(bulletin.id)
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`bulletin-item ${isSelected ? "active" : ""}`}
      onClick={() => onSelect(bulletin.id)}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      {/* Drag Handle - Only show for admin/editor */}
      {canEdit && (
        <div
          style={itemStyles.dragHandle}
          {...attributes}
          {...listeners}
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical size={14} />
        </div>
      )}

      <div style={itemStyles.content}>
        <div className="bulletin-title">{bulletin.title}</div>
        <div className="bulletin-meta">
          <span className="bulletin-time">{bulletin.startTime}</span>
          <span className={`bulletin-status ${getBulletinStatusClass(bulletin.status)}`}>
            {bulletin.status}
          </span>
        </div>
        <div className="bulletin-stats">
          {bulletin.storyCount || 0} stories • {bulletin.progress || 0}% ready
        </div>
      </div>

      {/* Action Buttons - Show on hover */}
      {showActions && (
        <div style={itemStyles.actions}>
          {canEdit && (
            <>
              <button
                style={itemStyles.actionBtn}
                onClick={handleEdit}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = "#2980b9"
                  e.currentTarget.style.transform = "scale(1.1)"
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "#3498db"
                  e.currentTarget.style.transform = "scale(1)"
                }}
                title="Edit bulletin"
              >
                <Edit2 size={14} />
              </button>
              <button
                style={{ ...itemStyles.actionBtn, ...itemStyles.deleteBtn }}
                onClick={handleDelete}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = "#c0392b"
                  e.currentTarget.style.transform = "scale(1.1)"
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "#e74c3c"
                  e.currentTarget.style.transform = "scale(1)"
                }}
                title="Delete bulletin"
              >
                <Trash2 size={14} />
              </button>
            </>
          )}
          <button
            style={{ ...itemStyles.actionBtn, ...itemStyles.downloadBtn }}
            onClick={handleDownload}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "#1e8449"
              e.currentTarget.style.transform = "scale(1.1)"
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "#27ae60"
              e.currentTarget.style.transform = "scale(1)"
            }}
            title="Download as RTF"
          >
            <Download size={14} />
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Drag Overlay Item ────────────────────────────────────────────
function DragOverlayItem({ bulletin }: { bulletin: Bulletin }) {
  return (
    <div style={itemStyles.dragOverlay}>
      <div style={itemStyles.dragHandleOverlay}>
        <GripVertical size={14} />
      </div>
      <div style={itemStyles.content}>
        <div style={itemStyles.overlayTitle}>{bulletin.title}</div>
        <div style={itemStyles.overlayMeta}>
          <span>{bulletin.startTime}</span>
          <span style={itemStyles.overlayStatus}>{bulletin.status}</span>
        </div>
      </div>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────
export default function BulletinsSidebar({
  bulletins,
  isLoading,
  selectedBulletinId,
  selectedDate,
  onSelectBulletin,
  onDateChange,
  onEditBulletin,
  onDeleteBulletin,
  onDownloadBulletin,
  onReorderBulletins,
  producers = [],
  desks = [],
  userRole = "REPORTER",
}: BulletinsSidebarProps) {
  const [showFilterModal, setShowFilterModal] = useState(false)
  const [filters, setFilters] = useState<BulletinFilters>(defaultFilters)
  const [activeId, setActiveId] = useState<string | null>(null)

  // Check if user is allowed to see filters and edit
  const canShowFilters = FILTER_ALLOWED_ROLES.includes(userRole)
  const canEdit = FILTER_ALLOWED_ROLES.includes(userRole)

  // Setup drag sensors
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

  // Count active filters
  const activeFilterCount = useMemo(() => {
    let count = 0
    if (filters.status.length > 0) count++
    if (filters.timeRange.from || filters.timeRange.to) count++
    if (filters.producer) count++
    if (filters.desk) count++
    if (filters.hasStories !== "all") count++
    return count
  }, [filters])

  // Apply filters to bulletins
  const filteredBulletins = useMemo(() => {
    if (activeFilterCount === 0) {
      return bulletins
    }

    return bulletins.filter((bulletin) => {
      if (filters.status.length > 0 && !filters.status.includes(bulletin.status)) {
        return false
      }
      if (filters.timeRange.from || filters.timeRange.to) {
        const bulletinTime = bulletin.startTime
        if (filters.timeRange.from && bulletinTime < filters.timeRange.from) {
          return false
        }
        if (filters.timeRange.to && bulletinTime > filters.timeRange.to) {
          return false
        }
      }
      if (filters.producer && bulletin.producerId !== filters.producer) {
        return false
      }
      if (filters.desk && bulletin.deskId !== filters.desk) {
        return false
      }
      const storyCount = bulletin.storyCount || 0
      if (filters.hasStories === "with" && storyCount === 0) {
        return false
      }
      if (filters.hasStories === "without" && storyCount > 0) {
        return false
      }
      return true
    })
  }, [bulletins, filters, activeFilterCount])

  // Get active bulletin for drag overlay
  const activeBulletin = useMemo(() => {
    return filteredBulletins.find((b) => b.id === activeId)
  }, [filteredBulletins, activeId])

  const handleApplyFilters = useCallback((newFilters: BulletinFilters) => {
    setFilters(newFilters)
  }, [])

  const handleClearFilters = useCallback(() => {
    setFilters(defaultFilters)
  }, [])

  // Drag handlers
  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as string)
  }, [])

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event
      setActiveId(null)

      if (!over || active.id === over.id) return

      const oldIndex = filteredBulletins.findIndex((b) => b.id === active.id)
      const newIndex = filteredBulletins.findIndex((b) => b.id === over.id)

      if (oldIndex === -1 || newIndex === -1) return

      // Create new order
      const newOrder = [...filteredBulletins]
      const [movedItem] = newOrder.splice(oldIndex, 1)
      newOrder.splice(newIndex, 0, movedItem)

      // Call callback with new order of IDs
      onReorderBulletins?.(newOrder.map((b) => b.id))
    },
    [filteredBulletins, onReorderBulletins]
  )

  // Date navigation handlers
  const goToPreviousDay = useCallback(() => {
    const newDate = new Date(selectedDate)
    newDate.setDate(newDate.getDate() - 1)
    onDateChange(newDate)
  }, [selectedDate, onDateChange])

  const goToNextDay = useCallback(() => {
    const newDate = new Date(selectedDate)
    newDate.setDate(newDate.getDate() + 1)
    onDateChange(newDate)
  }, [selectedDate, onDateChange])

  const goToToday = useCallback(() => {
    onDateChange(new Date())
  }, [onDateChange])

  const isToday = selectedDate.toDateString() === new Date().toDateString()

  const formatDateDisplay = useCallback((date: Date) => {
    const today = new Date()
    if (date.toDateString() === today.toDateString()) return "Today"
    
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    if (date.toDateString() === yesterday.toDateString()) return "Yesterday"
    
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    if (date.toDateString() === tomorrow.toDateString()) return "Tomorrow"
    
    return date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })
  }, [])

  return (
    <div className="bulletins-panel">
      {/* Date Navigation - Only show if user can see filters (ADMIN/EDITOR) */}
      {canShowFilters && (
        <div style={styles.dateNav}>
          <button
            style={styles.dateNavBtn}
            onClick={goToPreviousDay}
            title="Previous day"
          >
            <ChevronLeft size={18} />
          </button>
          <div style={styles.dateDisplay}>
            <Calendar size={14} style={{ opacity: 0.7 }} />
            <span style={styles.dateText}>{formatDateDisplay(selectedDate)}</span>
            {!isToday && (
              <button style={styles.todayBtn} onClick={goToToday}>
                Today
              </button>
            )}
          </div>
          <button
            style={styles.dateNavBtn}
            onClick={goToNextDay}
            title="Next day"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      )}

      {/* Panel Header with Filter Button */}
      <div style={styles.panelHeader}>
        <span style={styles.panelTitle}>
          {canShowFilters ? "Bulletins" : "Today's Bulletins"}
        </span>
        {canShowFilters && (
          <button
            style={{
              ...styles.filterBtn,
              ...(activeFilterCount > 0 ? styles.filterBtnActive : {}),
            }}
            onClick={() => setShowFilterModal(true)}
            title="Filter bulletins"
          >
            <Filter size={14} />
            {activeFilterCount > 0 && (
              <span style={styles.filterBadge}>{activeFilterCount}</span>
            )}
          </button>
        )}
      </div>

      {/* Active Filters Indicator - Only show if user can see filters */}
      {canShowFilters && activeFilterCount > 0 && (
        <div style={styles.activeFiltersBar}>
          <span style={styles.activeFiltersText}>
            {filteredBulletins.length} of {bulletins.length} bulletins
          </span>
          <button style={styles.clearFiltersBtn} onClick={handleClearFilters}>
            Clear
          </button>
        </div>
      )}

      {/* Bulletins List with Drag and Drop */}
      <div className="bulletins-list">
        {isLoading ? (
          <div className="empty-bulletins">Loading...</div>
        ) : filteredBulletins.length === 0 ? (
          <div className="empty-bulletins">
            {bulletins.length === 0 
              ? `No bulletins for ${formatDateDisplay(selectedDate).toLowerCase()}`
              : "No bulletins match filters"}
          </div>
        ) : canEdit ? (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={filteredBulletins.map((b) => b.id)}
              strategy={verticalListSortingStrategy}
            >
              {filteredBulletins.map((b) => (
                <SortableBulletinItem
                  key={b.id}
                  bulletin={b}
                  isSelected={selectedBulletinId === b.id}
                  onSelect={onSelectBulletin}
                  onEdit={onEditBulletin}
                  onDelete={onDeleteBulletin}
                  onDownload={onDownloadBulletin}
                  canEdit={canEdit}
                />
              ))}
            </SortableContext>

            <DragOverlay>
              {activeBulletin ? <DragOverlayItem bulletin={activeBulletin} /> : null}
            </DragOverlay>
          </DndContext>
        ) : (
          // Non-draggable list for reporters/producers - still shows download button
          filteredBulletins.map((b) => (
            <SortableBulletinItem
              key={b.id}
              bulletin={b}
              isSelected={selectedBulletinId === b.id}
              onSelect={onSelectBulletin}
              onEdit={onEditBulletin}
              onDelete={onDeleteBulletin}
              onDownload={onDownloadBulletin}
              canEdit={false}
            />
          ))
        )}
      </div>

      {/* Filter Modal - Only render if user can see filters */}
      {canShowFilters && (
        <BulletinFilterModal
          isOpen={showFilterModal}
          onClose={() => setShowFilterModal(false)}
          filters={filters}
          onApplyFilters={handleApplyFilters}
          producers={producers}
          desks={desks}
        />
      )}
    </div>
  )
}

// ─── Styles ───────────────────────────────────────────────────────

const styles: Record<string, React.CSSProperties> = {
  dateNav: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "10px 12px",
    borderBottomWidth: "1px",
    borderBottomStyle: "solid",
    borderBottomColor: "#34495e",
    backgroundColor: "rgba(0, 0, 0, 0.1)",
  },
  dateNavBtn: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: "28px",
    height: "28px",
    backgroundColor: "transparent",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "#4a5568",
    borderRadius: "4px",
    color: "#95a5a6",
    cursor: "pointer",
    transition: "all 0.2s",
  },
  dateDisplay: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    color: "#ecf0f1",
    fontSize: "13px",
  },
  dateText: {
    fontWeight: 500,
  },
  todayBtn: {
    padding: "2px 8px",
    backgroundColor: "#3498db",
    borderWidth: 0,
    borderRadius: "10px",
    color: "white",
    fontSize: "10px",
    fontWeight: 500,
    cursor: "pointer",
    marginLeft: "4px",
  },
  panelHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "12px",
    borderBottomWidth: "1px",
    borderBottomStyle: "solid",
    borderBottomColor: "#34495e",
  },
  panelTitle: {
    fontSize: "14px",
    fontWeight: 600,
    color: "#ecf0f1",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
  },
  filterBtn: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    position: "relative" as const,
    width: "32px",
    height: "32px",
    backgroundColor: "transparent",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "#4a5568",
    borderRadius: "6px",
    color: "#95a5a6",
    cursor: "pointer",
    transition: "all 0.2s",
  },
  filterBtnActive: {
    backgroundColor: "rgba(52, 152, 219, 0.2)",
    borderColor: "#3498db",
    color: "#3498db",
  },
  filterBadge: {
    position: "absolute" as const,
    top: "-4px",
    right: "-4px",
    minWidth: "16px",
    height: "16px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#e74c3c",
    color: "white",
    fontSize: "10px",
    fontWeight: 600,
    borderRadius: "8px",
    padding: "0 4px",
  },
  activeFiltersBar: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "8px 12px",
    backgroundColor: "rgba(52, 152, 219, 0.1)",
    borderBottomWidth: "1px",
    borderBottomStyle: "solid",
    borderBottomColor: "rgba(52, 152, 219, 0.2)",
  },
  activeFiltersText: {
    fontSize: "11px",
    color: "#3498db",
  },
  clearFiltersBtn: {
    padding: "2px 8px",
    backgroundColor: "transparent",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "#3498db",
    borderRadius: "4px",
    color: "#3498db",
    fontSize: "11px",
    cursor: "pointer",
  },
}

const itemStyles: Record<string, React.CSSProperties> = {
  dragHandle: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: "20px",
    color: "#7f8c8d",
    cursor: "grab",
    flexShrink: 0,
    marginRight: "8px",
    opacity: 0.5,
    transition: "all 0.2s",
  },
  dragHandleOverlay: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: "20px",
    color: "white",
    cursor: "grabbing",
    flexShrink: 0,
    marginRight: "8px",
  },
  content: {
    flex: 1,
    minWidth: 0,
  },
  actions: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    marginLeft: "8px",
    padding: "4px",
    backgroundColor: "rgba(0, 0, 0, 0.2)",
    borderRadius: "6px",
  },
  actionBtn: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: "28px",
    height: "28px",
    backgroundColor: "#3498db",
    borderWidth: 0,
    borderRadius: "6px",
    color: "white",
    cursor: "pointer",
    transition: "all 0.2s ease",
    boxShadow: "0 2px 4px rgba(0, 0, 0, 0.2)",
  },
  deleteBtn: {
    backgroundColor: "#e74c3c",
  },
  downloadBtn: {
    backgroundColor: "#27ae60",
  },
  dragOverlay: {
    display: "flex",
    alignItems: "center",
    padding: "12px",
    backgroundColor: "#3498db",
    borderRadius: "6px",
    boxShadow: "0 4px 12px rgba(0, 0, 0, 0.3)",
    cursor: "grabbing",
    width: "220px",
  },
  overlayTitle: {
    fontSize: "13px",
    fontWeight: 600,
    color: "white",
    marginBottom: "4px",
  },
  overlayMeta: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    fontSize: "11px",
    color: "rgba(255, 255, 255, 0.8)",
  },
  overlayStatus: {
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    padding: "2px 6px",
    borderRadius: "3px",
    fontSize: "10px",
  },
}