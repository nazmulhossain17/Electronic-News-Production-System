// ============================================================================
// File: components/reporter/TrashModal.tsx
// Description: Modal for viewing and restoring soft-deleted bulletins and rows
// ============================================================================

"use client"

import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { X, Trash2, RotateCcw, AlertTriangle, Clock, FileText, List } from "lucide-react"

interface DeletedItem {
  id: string
  type: "bulletin" | "row"
  title?: string
  slug?: string
  pageCode?: string
  date?: string
  startTime?: string
  bulletinTitle?: string
  deletedAt: string
  deletedByName: string | null
  daysLeft: number
}

interface TrashModalProps {
  isOpen: boolean
  onClose: () => void
  userRole?: string
}

export default function TrashModal({ isOpen, onClose, userRole = "REPORTER" }: TrashModalProps) {
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState<"bulletins" | "rows">("bulletins")
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  const canPermanentDelete = ["ADMIN", "EDITOR"].includes(userRole)

  // Fetch deleted items
  const { data, isLoading, error } = useQuery({
    queryKey: ["trash"],
    queryFn: async () => {
      const response = await fetch("/api/trash", { credentials: "include" })
      if (!response.ok) throw new Error("Failed to fetch trash")
      const result = await response.json()
      return result.data as { bulletins: DeletedItem[]; rows: DeletedItem[] }
    },
    enabled: isOpen,
  })

  // Restore mutation
  const restoreMutation = useMutation({
    mutationFn: async ({ type, id }: { type: "bulletin" | "row"; id: string }) => {
      const response = await fetch("/api/trash/restore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ type, id }),
      })
      if (!response.ok) throw new Error("Failed to restore item")
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trash"] })
      queryClient.invalidateQueries({ queryKey: ["bulletins"] })
      queryClient.invalidateQueries({ queryKey: ["bulletin"] })
    },
  })

  // Permanent delete mutation
  const permanentDeleteMutation = useMutation({
    mutationFn: async ({ type, id }: { type: "bulletin" | "row"; id: string }) => {
      const response = await fetch("/api/trash/permanent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ type, id }),
      })
      if (!response.ok) throw new Error("Failed to permanently delete item")
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trash"] })
      setConfirmDelete(null)
    },
  })

  if (!isOpen) return null

  const bulletins = data?.bulletins || []
  const rows = data?.rows || []
  const totalItems = bulletins.length + rows.length

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString()
  }

  const getDaysLeftColor = (daysLeft: number) => {
    if (daysLeft <= 1) return "#e74c3c"
    if (daysLeft <= 3) return "#f39c12"
    return "#27ae60"
  }

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={styles.header}>
          <div style={styles.headerTitle}>
            <Trash2 size={20} />
            <span>Trash</span>
            {totalItems > 0 && (
              <span style={styles.badge}>{totalItems}</span>
            )}
          </div>
          <button style={styles.closeBtn} onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {/* Info Banner */}
        <div style={styles.infoBanner}>
          <AlertTriangle size={16} />
          <span>Items in trash will be automatically deleted after 7 days</span>
        </div>

        {/* Tabs */}
        <div style={styles.tabs}>
          <button
            style={{
              ...styles.tab,
              ...(activeTab === "bulletins" ? styles.tabActive : {}),
            }}
            onClick={() => setActiveTab("bulletins")}
          >
            <FileText size={16} />
            Bulletins ({bulletins.length})
          </button>
          <button
            style={{
              ...styles.tab,
              ...(activeTab === "rows" ? styles.tabActive : {}),
            }}
            onClick={() => setActiveTab("rows")}
          >
            <List size={16} />
            Stories ({rows.length})
          </button>
        </div>

        {/* Content */}
        <div style={styles.content}>
          {isLoading ? (
            <div style={styles.emptyState}>Loading...</div>
          ) : error ? (
            <div style={styles.emptyState}>Failed to load trash items</div>
          ) : activeTab === "bulletins" ? (
            bulletins.length === 0 ? (
              <div style={styles.emptyState}>No deleted bulletins</div>
            ) : (
              <div style={styles.itemList}>
                {bulletins.map((item) => (
                  <div key={item.id} style={styles.item}>
                    <div style={styles.itemInfo}>
                      <div style={styles.itemTitle}>{item.title}</div>
                      <div style={styles.itemMeta}>
                        <span>{item.date} • {item.startTime}</span>
                        <span>Deleted by: {item.deletedByName || "Unknown"}</span>
                      </div>
                      <div style={styles.itemTime}>
                        <Clock size={12} />
                        <span>Deleted: {formatDate(item.deletedAt)}</span>
                        <span
                          style={{
                            ...styles.daysLeft,
                            color: getDaysLeftColor(item.daysLeft),
                          }}
                        >
                          {item.daysLeft} day{item.daysLeft !== 1 ? "s" : ""} left
                        </span>
                      </div>
                    </div>
                    <div style={styles.itemActions}>
                      <button
                        style={styles.restoreBtn}
                        onClick={() => restoreMutation.mutate({ type: "bulletin", id: item.id })}
                        disabled={restoreMutation.isPending}
                        title="Restore bulletin"
                      >
                        <RotateCcw size={16} />
                        Restore
                      </button>
                      {canPermanentDelete && (
                        confirmDelete === item.id ? (
                          <div style={styles.confirmActions}>
                            <button
                              style={styles.confirmDeleteBtn}
                              onClick={() => permanentDeleteMutation.mutate({ type: "bulletin", id: item.id })}
                              disabled={permanentDeleteMutation.isPending}
                            >
                              Confirm
                            </button>
                            <button
                              style={styles.cancelBtn}
                              onClick={() => setConfirmDelete(null)}
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            style={styles.deleteBtn}
                            onClick={() => setConfirmDelete(item.id)}
                            title="Delete permanently"
                          >
                            <Trash2 size={16} />
                          </button>
                        )
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : (
            rows.length === 0 ? (
              <div style={styles.emptyState}>No deleted stories</div>
            ) : (
              <div style={styles.itemList}>
                {rows.map((item) => (
                  <div key={item.id} style={styles.item}>
                    <div style={styles.itemInfo}>
                      <div style={styles.itemTitle}>
                        <span style={styles.pageCode}>{item.pageCode}</span>
                        {item.slug || "(empty)"}
                      </div>
                      <div style={styles.itemMeta}>
                        <span>From: {item.bulletinTitle || "Unknown bulletin"}</span>
                        <span>Deleted by: {item.deletedByName || "Unknown"}</span>
                      </div>
                      <div style={styles.itemTime}>
                        <Clock size={12} />
                        <span>Deleted: {formatDate(item.deletedAt)}</span>
                        <span
                          style={{
                            ...styles.daysLeft,
                            color: getDaysLeftColor(item.daysLeft),
                          }}
                        >
                          {item.daysLeft} day{item.daysLeft !== 1 ? "s" : ""} left
                        </span>
                      </div>
                    </div>
                    <div style={styles.itemActions}>
                      <button
                        style={styles.restoreBtn}
                        onClick={() => restoreMutation.mutate({ type: "row", id: item.id })}
                        disabled={restoreMutation.isPending}
                        title="Restore story"
                      >
                        <RotateCcw size={16} />
                        Restore
                      </button>
                      {canPermanentDelete && (
                        confirmDelete === item.id ? (
                          <div style={styles.confirmActions}>
                            <button
                              style={styles.confirmDeleteBtn}
                              onClick={() => permanentDeleteMutation.mutate({ type: "row", id: item.id })}
                              disabled={permanentDeleteMutation.isPending}
                            >
                              Confirm
                            </button>
                            <button
                              style={styles.cancelBtn}
                              onClick={() => setConfirmDelete(null)}
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            style={styles.deleteBtn}
                            onClick={() => setConfirmDelete(item.id)}
                            title="Delete permanently"
                          >
                            <Trash2 size={16} />
                          </button>
                        )
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )
          )}
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
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
  },
  modal: {
    width: "600px",
    maxWidth: "90vw",
    maxHeight: "80vh",
    backgroundColor: "#1e293b",
    borderRadius: "12px",
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
    boxShadow: "0 20px 60px rgba(0, 0, 0, 0.4)",
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "16px 20px",
    borderBottom: "1px solid #334155",
    backgroundColor: "#0f172a",
  },
  headerTitle: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    fontSize: "18px",
    fontWeight: 600,
    color: "#f1f5f9",
  },
  badge: {
    backgroundColor: "#e74c3c",
    color: "white",
    padding: "2px 8px",
    borderRadius: "10px",
    fontSize: "12px",
    fontWeight: 600,
  },
  closeBtn: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: "32px",
    height: "32px",
    backgroundColor: "transparent",
    border: "none",
    borderRadius: "6px",
    color: "#94a3b8",
    cursor: "pointer",
  },
  infoBanner: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    padding: "12px 20px",
    backgroundColor: "rgba(245, 158, 11, 0.1)",
    borderBottom: "1px solid rgba(245, 158, 11, 0.2)",
    color: "#f59e0b",
    fontSize: "13px",
  },
  tabs: {
    display: "flex",
    gap: "4px",
    padding: "12px 20px",
    borderBottom: "1px solid #334155",
  },
  tab: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "10px 16px",
    backgroundColor: "transparent",
    border: "1px solid #334155",
    borderRadius: "6px",
    color: "#94a3b8",
    fontSize: "13px",
    cursor: "pointer",
    transition: "all 0.2s",
  },
  tabActive: {
    backgroundColor: "#3498db",
    borderColor: "#3498db",
    color: "white",
  },
  content: {
    flex: 1,
    overflow: "auto",
    padding: "16px 20px",
  },
  emptyState: {
    textAlign: "center",
    padding: "40px 20px",
    color: "#64748b",
    fontSize: "14px",
  },
  itemList: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },
  item: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: "16px",
    padding: "14px 16px",
    backgroundColor: "#0f172a",
    borderRadius: "8px",
    border: "1px solid #334155",
  },
  itemInfo: {
    flex: 1,
    minWidth: 0,
  },
  itemTitle: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    fontSize: "14px",
    fontWeight: 600,
    color: "#f1f5f9",
    marginBottom: "6px",
  },
  pageCode: {
    backgroundColor: "#3498db",
    color: "white",
    padding: "2px 6px",
    borderRadius: "4px",
    fontSize: "11px",
    fontWeight: 600,
  },
  itemMeta: {
    display: "flex",
    flexWrap: "wrap",
    gap: "12px",
    fontSize: "12px",
    color: "#64748b",
    marginBottom: "6px",
  },
  itemTime: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    fontSize: "11px",
    color: "#64748b",
  },
  daysLeft: {
    fontWeight: 600,
    marginLeft: "auto",
  },
  itemActions: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    flexShrink: 0,
  },
  restoreBtn: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    padding: "8px 12px",
    backgroundColor: "#27ae60",
    border: "none",
    borderRadius: "6px",
    color: "white",
    fontSize: "12px",
    fontWeight: 500,
    cursor: "pointer",
    transition: "background 0.2s",
  },
  deleteBtn: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: "36px",
    height: "36px",
    backgroundColor: "rgba(231, 76, 60, 0.1)",
    border: "1px solid rgba(231, 76, 60, 0.3)",
    borderRadius: "6px",
    color: "#e74c3c",
    cursor: "pointer",
    transition: "all 0.2s",
  },
  confirmActions: {
    display: "flex",
    gap: "6px",
  },
  confirmDeleteBtn: {
    padding: "8px 12px",
    backgroundColor: "#e74c3c",
    border: "none",
    borderRadius: "6px",
    color: "white",
    fontSize: "12px",
    fontWeight: 500,
    cursor: "pointer",
  },
  cancelBtn: {
    padding: "8px 12px",
    backgroundColor: "transparent",
    border: "1px solid #475569",
    borderRadius: "6px",
    color: "#94a3b8",
    fontSize: "12px",
    cursor: "pointer",
  },
}