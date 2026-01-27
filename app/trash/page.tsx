// ============================================================================
// File: app/trash/page.tsx
// Description: Trash page for viewing and restoring soft-deleted items (Admin only)
// ============================================================================

"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import {
  Trash2,
  RotateCcw,
  AlertTriangle,
  Clock,
  FileText,
  List,
  ArrowLeft,
  Search,
  RefreshCw,
  Shield,
} from "lucide-react"

interface DeletedBulletin {
  id: string
  type: "bulletin"
  title: string
  date: string
  startTime: string
  status: string
  deletedAt: string
  deletedByName: string | null
  daysLeft: number
}

interface DeletedRow {
  id: string
  type: "row"
  slug: string | null
  pageCode: string | null
  bulletinId: string
  bulletinTitle: string | null
  deletedAt: string
  deletedByName: string | null
  daysLeft: number
}

type DeletedItem = DeletedBulletin | DeletedRow

export default function TrashPage() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState<"bulletins" | "rows">("bulletins")
  const [searchTerm, setSearchTerm] = useState("")
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [userRole, setUserRole] = useState<string | null>(null)
  const [isCheckingAuth, setIsCheckingAuth] = useState(true)

  // Check user role on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch("/api/me", { credentials: "include" })
        if (!response.ok) {
          router.push("/login")
          return
        }
        const data = await response.json()
        if (data.user?.role !== "ADMIN") {
          router.push("/reporter")
          return
        }
        setUserRole(data.user.role)
      } catch {
        router.push("/login")
      } finally {
        setIsCheckingAuth(false)
      }
    }
    checkAuth()
  }, [router])

  // Fetch deleted items
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["trash"],
    queryFn: async () => {
      const response = await fetch("/api/trash", { credentials: "include" })
      if (!response.ok) throw new Error("Failed to fetch trash")
      const result = await response.json()
      return result.data as { bulletins: DeletedBulletin[]; rows: DeletedRow[] }
    },
    enabled: userRole === "ADMIN",
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
      if (!response.ok) {
        const err = await response.json()
        throw new Error(err.error || "Failed to restore item")
      }
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trash"] })
      queryClient.invalidateQueries({ queryKey: ["bulletins"] })
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
      if (!response.ok) {
        const err = await response.json()
        throw new Error(err.error || "Failed to permanently delete item")
      }
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trash"] })
      setConfirmDelete(null)
    },
  })

  // Cleanup mutation (delete items older than 7 days)
  const cleanupMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/trash", {
        method: "DELETE",
        credentials: "include",
      })
      if (!response.ok) throw new Error("Failed to cleanup trash")
      return response.json()
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["trash"] })
      alert(`Cleanup complete: ${data.deleted.bulletins} bulletins and ${data.deleted.rows} rows permanently deleted`)
    },
  })

  if (isCheckingAuth) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.loadingSpinner}>Loading...</div>
      </div>
    )
  }

  if (userRole !== "ADMIN") {
    return null
  }

  const bulletins = data?.bulletins || []
  const rows = data?.rows || []

  // Filter items based on search term
  const filteredBulletins = bulletins.filter(
    (b) =>
      b.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.date.includes(searchTerm)
  )

  const filteredRows = rows.filter(
    (r) =>
      (r.slug || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (r.pageCode || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (r.bulletinTitle || "").toLowerCase().includes(searchTerm.toLowerCase())
  )

  const totalItems = bulletins.length + rows.length

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString()
  }

  const getDaysLeftColor = (daysLeft: number) => {
    if (daysLeft <= 1) return "#e74c3c"
    if (daysLeft <= 3) return "#f39c12"
    return "#27ae60"
  }

  const getDaysLeftBg = (daysLeft: number) => {
    if (daysLeft <= 1) return "rgba(231, 76, 60, 0.1)"
    if (daysLeft <= 3) return "rgba(243, 156, 18, 0.1)"
    return "rgba(39, 174, 96, 0.1)"
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <header style={styles.header}>
        <div style={styles.headerLeft}>
          <button style={styles.backBtn} onClick={() => router.push("/reporter")}>
            <ArrowLeft size={20} />
          </button>
          <div style={styles.headerTitle}>
            <Trash2 size={24} />
            <h1>Trash</h1>
            {totalItems > 0 && <span style={styles.badge}>{totalItems}</span>}
          </div>
        </div>
        <div style={styles.headerRight}>
          <div style={styles.adminBadge}>
            <Shield size={14} />
            Admin Only
          </div>
          <button
            style={styles.cleanupBtn}
            onClick={() => cleanupMutation.mutate()}
            disabled={cleanupMutation.isPending}
          >
            <RefreshCw size={16} className={cleanupMutation.isPending ? "spin" : ""} />
            {cleanupMutation.isPending ? "Cleaning..." : "Run Cleanup"}
          </button>
        </div>
      </header>

      {/* Info Banner */}
      <div style={styles.infoBanner}>
        <AlertTriangle size={18} />
        <span>
          Items in trash will be <strong>automatically deleted after 7 days</strong>. 
          Only administrators can restore deleted items.
        </span>
      </div>

      {/* Search and Tabs */}
      <div style={styles.toolbar}>
        <div style={styles.searchContainer}>
          <Search size={18} style={styles.searchIcon} />
          <input
            type="text"
            placeholder="Search deleted items..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={styles.searchInput}
          />
        </div>
        <div style={styles.tabs}>
          <button
            style={{
              ...styles.tab,
              ...(activeTab === "bulletins" ? styles.tabActive : {}),
            }}
            onClick={() => setActiveTab("bulletins")}
          >
            <FileText size={16} />
            Bulletins ({filteredBulletins.length})
          </button>
          <button
            style={{
              ...styles.tab,
              ...(activeTab === "rows" ? styles.tabActive : {}),
            }}
            onClick={() => setActiveTab("rows")}
          >
            <List size={16} />
            Stories ({filteredRows.length})
          </button>
        </div>
        <button style={styles.refreshBtn} onClick={() => refetch()}>
          <RefreshCw size={16} />
        </button>
      </div>

      {/* Content */}
      <div style={styles.content}>
        {isLoading ? (
          <div style={styles.emptyState}>
            <div style={styles.spinner}></div>
            <p>Loading deleted items...</p>
          </div>
        ) : error ? (
          <div style={styles.emptyState}>
            <AlertTriangle size={48} color="#e74c3c" />
            <p>Failed to load trash items</p>
            <button style={styles.retryBtn} onClick={() => refetch()}>
              Try Again
            </button>
          </div>
        ) : activeTab === "bulletins" ? (
          filteredBulletins.length === 0 ? (
            <div style={styles.emptyState}>
              <Trash2 size={48} color="#64748b" />
              <p>No deleted bulletins</p>
            </div>
          ) : (
            <div style={styles.itemGrid}>
              {filteredBulletins.map((item) => (
                <div key={item.id} style={styles.itemCard}>
                  <div style={styles.itemHeader}>
                    <div style={styles.itemType}>
                      <FileText size={16} />
                      Bulletin
                    </div>
                    <div
                      style={{
                        ...styles.daysLeftBadge,
                        backgroundColor: getDaysLeftBg(item.daysLeft),
                        color: getDaysLeftColor(item.daysLeft),
                      }}
                    >
                      <Clock size={12} />
                      {item.daysLeft} day{item.daysLeft !== 1 ? "s" : ""} left
                    </div>
                  </div>
                  <h3 style={styles.itemTitle}>{item.title}</h3>
                  <div style={styles.itemMeta}>
                    <span>{item.date}</span>
                    <span>•</span>
                    <span>{item.startTime}</span>
                    <span>•</span>
                    <span style={styles.statusBadge}>{item.status}</span>
                  </div>
                  <div style={styles.itemFooter}>
                    <div style={styles.deletedInfo}>
                      <Clock size={14} />
                      <span>Deleted {formatDate(item.deletedAt)}</span>
                      {item.deletedByName && (
                        <span style={styles.deletedBy}>by {item.deletedByName}</span>
                      )}
                    </div>
                  </div>
                  <div style={styles.itemActions}>
                    <button
                      style={styles.restoreBtn}
                      onClick={() => restoreMutation.mutate({ type: "bulletin", id: item.id })}
                      disabled={restoreMutation.isPending}
                    >
                      <RotateCcw size={16} />
                      {restoreMutation.isPending ? "Restoring..." : "Restore"}
                    </button>
                    {confirmDelete === item.id ? (
                      <div style={styles.confirmGroup}>
                        <button
                          style={styles.confirmDeleteBtn}
                          onClick={() =>
                            permanentDeleteMutation.mutate({ type: "bulletin", id: item.id })
                          }
                          disabled={permanentDeleteMutation.isPending}
                        >
                          {permanentDeleteMutation.isPending ? "Deleting..." : "Confirm Delete"}
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
                        style={styles.permanentDeleteBtn}
                        onClick={() => setConfirmDelete(item.id)}
                      >
                        <Trash2 size={16} />
                        Delete Forever
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )
        ) : filteredRows.length === 0 ? (
          <div style={styles.emptyState}>
            <Trash2 size={48} color="#64748b" />
            <p>No deleted stories</p>
          </div>
        ) : (
          <div style={styles.itemGrid}>
            {filteredRows.map((item) => (
              <div key={item.id} style={styles.itemCard}>
                <div style={styles.itemHeader}>
                  <div style={styles.itemType}>
                    <List size={16} />
                    Story
                  </div>
                  <div
                    style={{
                      ...styles.daysLeftBadge,
                      backgroundColor: getDaysLeftBg(item.daysLeft),
                      color: getDaysLeftColor(item.daysLeft),
                    }}
                  >
                    <Clock size={12} />
                    {item.daysLeft} day{item.daysLeft !== 1 ? "s" : ""} left
                  </div>
                </div>
                <h3 style={styles.itemTitle}>
                  {item.pageCode && <span style={styles.pageCode}>{item.pageCode}</span>}
                  {item.slug || "(empty)"}
                </h3>
                <div style={styles.itemMeta}>
                  <span>From: {item.bulletinTitle || "Unknown bulletin"}</span>
                </div>
                <div style={styles.itemFooter}>
                  <div style={styles.deletedInfo}>
                    <Clock size={14} />
                    <span>Deleted {formatDate(item.deletedAt)}</span>
                    {item.deletedByName && (
                      <span style={styles.deletedBy}>by {item.deletedByName}</span>
                    )}
                  </div>
                </div>
                <div style={styles.itemActions}>
                  <button
                    style={styles.restoreBtn}
                    onClick={() => restoreMutation.mutate({ type: "row", id: item.id })}
                    disabled={restoreMutation.isPending}
                  >
                    <RotateCcw size={16} />
                    {restoreMutation.isPending ? "Restoring..." : "Restore"}
                  </button>
                  {confirmDelete === item.id ? (
                    <div style={styles.confirmGroup}>
                      <button
                        style={styles.confirmDeleteBtn}
                        onClick={() =>
                          permanentDeleteMutation.mutate({ type: "row", id: item.id })
                        }
                        disabled={permanentDeleteMutation.isPending}
                      >
                        {permanentDeleteMutation.isPending ? "Deleting..." : "Confirm Delete"}
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
                      style={styles.permanentDeleteBtn}
                      onClick={() => setConfirmDelete(item.id)}
                    >
                      <Trash2 size={16} />
                      Delete Forever
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: "100vh",
    backgroundColor: "#0f172a",
    color: "#f1f5f9",
  },
  loadingContainer: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: "100vh",
    backgroundColor: "#0f172a",
  },
  loadingSpinner: {
    color: "#64748b",
    fontSize: "16px",
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "16px 24px",
    backgroundColor: "#1e293b",
    borderBottom: "1px solid #334155",
  },
  headerLeft: {
    display: "flex",
    alignItems: "center",
    gap: "16px",
  },
  backBtn: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: "40px",
    height: "40px",
    backgroundColor: "transparent",
    border: "1px solid #475569",
    borderRadius: "8px",
    color: "#94a3b8",
    cursor: "pointer",
    transition: "all 0.2s",
  },
  headerTitle: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    fontSize: "24px",
    fontWeight: 600,
  },
  badge: {
    backgroundColor: "#e74c3c",
    color: "white",
    padding: "4px 10px",
    borderRadius: "12px",
    fontSize: "14px",
    fontWeight: 600,
  },
  headerRight: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
  },
  adminBadge: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    padding: "6px 12px",
    backgroundColor: "rgba(52, 152, 219, 0.1)",
    border: "1px solid rgba(52, 152, 219, 0.3)",
    borderRadius: "6px",
    color: "#3498db",
    fontSize: "12px",
    fontWeight: 500,
  },
  cleanupBtn: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "10px 16px",
    backgroundColor: "#475569",
    border: "none",
    borderRadius: "8px",
    color: "white",
    fontSize: "14px",
    fontWeight: 500,
    cursor: "pointer",
    transition: "background 0.2s",
  },
  infoBanner: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    padding: "16px 24px",
    backgroundColor: "rgba(245, 158, 11, 0.1)",
    borderBottom: "1px solid rgba(245, 158, 11, 0.2)",
    color: "#f59e0b",
    fontSize: "14px",
  },
  toolbar: {
    display: "flex",
    alignItems: "center",
    gap: "16px",
    padding: "16px 24px",
    backgroundColor: "#1e293b",
    borderBottom: "1px solid #334155",
  },
  searchContainer: {
    position: "relative",
    flex: 1,
    maxWidth: "400px",
  },
  searchIcon: {
    position: "absolute",
    left: "12px",
    top: "50%",
    transform: "translateY(-50%)",
    color: "#64748b",
  },
  searchInput: {
    width: "100%",
    padding: "10px 12px 10px 40px",
    backgroundColor: "#0f172a",
    border: "1px solid #334155",
    borderRadius: "8px",
    color: "#f1f5f9",
    fontSize: "14px",
    outline: "none",
  },
  tabs: {
    display: "flex",
    gap: "8px",
  },
  tab: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "10px 16px",
    backgroundColor: "transparent",
    border: "1px solid #334155",
    borderRadius: "8px",
    color: "#94a3b8",
    fontSize: "14px",
    cursor: "pointer",
    transition: "all 0.2s",
  },
  tabActive: {
    backgroundColor: "#3498db",
    borderColor: "#3498db",
    color: "white",
  },
  refreshBtn: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: "40px",
    height: "40px",
    backgroundColor: "transparent",
    border: "1px solid #334155",
    borderRadius: "8px",
    color: "#94a3b8",
    cursor: "pointer",
  },
  content: {
    padding: "24px",
  },
  emptyState: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: "16px",
    padding: "80px 20px",
    color: "#64748b",
    fontSize: "16px",
  },
  spinner: {
    width: "32px",
    height: "32px",
    border: "3px solid #334155",
    borderTopColor: "#3498db",
    borderRadius: "50%",
    animation: "spin 1s linear infinite",
  },
  retryBtn: {
    padding: "10px 20px",
    backgroundColor: "#3498db",
    border: "none",
    borderRadius: "8px",
    color: "white",
    fontSize: "14px",
    cursor: "pointer",
  },
  itemGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(350px, 1fr))",
    gap: "16px",
  },
  itemCard: {
    backgroundColor: "#1e293b",
    borderRadius: "12px",
    border: "1px solid #334155",
    padding: "20px",
    transition: "border-color 0.2s",
  },
  itemHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: "12px",
  },
  itemType: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    color: "#64748b",
    fontSize: "12px",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
  },
  daysLeftBadge: {
    display: "flex",
    alignItems: "center",
    gap: "4px",
    padding: "4px 8px",
    borderRadius: "6px",
    fontSize: "12px",
    fontWeight: 500,
  },
  itemTitle: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    fontSize: "18px",
    fontWeight: 600,
    marginBottom: "8px",
    color: "#f1f5f9",
  },
  pageCode: {
    backgroundColor: "#3498db",
    color: "white",
    padding: "2px 8px",
    borderRadius: "4px",
    fontSize: "12px",
    fontWeight: 600,
  },
  itemMeta: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    fontSize: "13px",
    color: "#94a3b8",
    marginBottom: "12px",
  },
  statusBadge: {
    backgroundColor: "rgba(52, 152, 219, 0.1)",
    color: "#3498db",
    padding: "2px 8px",
    borderRadius: "4px",
    fontSize: "11px",
    fontWeight: 500,
  },
  itemFooter: {
    paddingTop: "12px",
    borderTop: "1px solid #334155",
    marginBottom: "16px",
  },
  deletedInfo: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    fontSize: "12px",
    color: "#64748b",
  },
  deletedBy: {
    marginLeft: "4px",
    fontWeight: 500,
    color: "#94a3b8",
  },
  itemActions: {
    display: "flex",
    gap: "8px",
  },
  restoreBtn: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    flex: 1,
    padding: "10px 16px",
    backgroundColor: "#27ae60",
    border: "none",
    borderRadius: "8px",
    color: "white",
    fontSize: "14px",
    fontWeight: 500,
    cursor: "pointer",
    justifyContent: "center",
    transition: "background 0.2s",
  },
  permanentDeleteBtn: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    padding: "10px 16px",
    backgroundColor: "rgba(231, 76, 60, 0.1)",
    border: "1px solid rgba(231, 76, 60, 0.3)",
    borderRadius: "8px",
    color: "#e74c3c",
    fontSize: "14px",
    fontWeight: 500,
    cursor: "pointer",
    transition: "all 0.2s",
  },
  confirmGroup: {
    display: "flex",
    gap: "8px",
  },
  confirmDeleteBtn: {
    padding: "10px 16px",
    backgroundColor: "#e74c3c",
    border: "none",
    borderRadius: "8px",
    color: "white",
    fontSize: "14px",
    fontWeight: 500,
    cursor: "pointer",
  },
  cancelBtn: {
    padding: "10px 16px",
    backgroundColor: "transparent",
    border: "1px solid #475569",
    borderRadius: "8px",
    color: "#94a3b8",
    fontSize: "14px",
    cursor: "pointer",
  },
}