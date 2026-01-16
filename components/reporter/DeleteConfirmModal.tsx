"use client"

import { useEffect, useRef } from "react"
import { Trash2, X, AlertTriangle } from "lucide-react"

interface DeleteItem {
  id: string
  page: string
  slug: string
}

interface DeleteConfirmModalProps {
  isOpen: boolean
  items: DeleteItem[]
  itemType?: string
  onConfirm: () => void
  onCancel: () => void
  isDeleting?: boolean
}

export default function DeleteConfirmModal({
  isOpen,
  items,
  itemType = "story",
  onConfirm,
  onCancel,
  isDeleting = false,
}: DeleteConfirmModalProps) {
  const modalRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onCancel()
      }
    }

    document.addEventListener("keydown", handleEscape)
    return () => document.removeEventListener("keydown", handleEscape)
  }, [isOpen, onCancel])

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden"
      modalRef.current?.focus()
    } else {
      document.body.style.overflow = ""
    }

    return () => {
      document.body.style.overflow = ""
    }
  }, [isOpen])

  if (!isOpen) return null

  const isMultiple = items.length > 1
  const itemTypeText = isMultiple ? `${items.length} ${itemType}s` : itemType

  // ─── Styles ─────────────────────────────────────────────────────

  const styles = {
    overlay: {
      position: "fixed" as const,
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: "rgba(0, 0, 0, 0.7)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 1000,
    },
    modal: {
      background: "#1a1a2e",
      border: "1px solid rgba(231, 76, 60, 0.3)",
      borderRadius: "12px",
      width: "100%",
      maxWidth: "480px",
      maxHeight: "80vh",
      display: "flex",
      flexDirection: "column" as const,
      boxShadow: "0 20px 60px rgba(0, 0, 0, 0.5)",
      outline: "none",
    },
    header: {
      display: "flex",
      alignItems: "center",
      gap: "12px",
      padding: "20px",
      borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
    },
    icon: {
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      width: "48px",
      height: "48px",
      background: "rgba(231, 76, 60, 0.15)",
      borderRadius: "50%",
      color: "#e74c3c",
      flexShrink: 0,
    },
    title: {
      flex: 1,
      margin: 0,
      fontSize: "18px",
      fontWeight: 600,
      color: "#ecf0f1",
    },
    closeBtn: {
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      width: "32px",
      height: "32px",
      background: "transparent",
      border: "none",
      borderRadius: "6px",
      color: "#7f8c8d",
      cursor: "pointer",
      transition: "all 0.2s",
    },
    content: {
      padding: "20px",
      overflowY: "auto" as const,
      flex: 1,
    },
    text: {
      margin: "0 0 12px 0",
      color: "#bdc3c7",
      fontSize: "14px",
      lineHeight: 1.5,
    },
    itemsList: {
      background: "rgba(231, 76, 60, 0.1)",
      border: "1px solid rgba(231, 76, 60, 0.2)",
      borderRadius: "6px",
      padding: "12px",
      margin: "16px 0",
      maxHeight: "200px",
      overflowY: "auto" as const,
    },
    itemRow: {
      display: "flex",
      alignItems: "center",
      gap: "8px",
      padding: "6px 0",
      borderBottom: "1px solid rgba(255, 255, 255, 0.05)",
    },
    itemRowLast: {
      display: "flex",
      alignItems: "center",
      gap: "8px",
      padding: "6px 0",
    },
    itemPage: {
      color: "#e74c3c",
      fontWeight: 600,
      fontSize: "13px",
      minWidth: "36px",
    },
    itemSlug: {
      color: "#ecf0f1",
      fontSize: "13px",
      flex: 1,
      overflow: "hidden",
      textOverflow: "ellipsis",
      whiteSpace: "nowrap" as const,
    },
    warning: {
      color: "#95a5a6",
      fontSize: "13px",
      margin: 0,
    },
    actions: {
      display: "flex",
      gap: "12px",
      padding: "16px 20px 20px",
      borderTop: "1px solid rgba(255, 255, 255, 0.1)",
    },
    btnCancel: {
      flex: 1,
      padding: "10px 16px",
      background: "transparent",
      border: "1px solid rgba(255, 255, 255, 0.2)",
      borderRadius: "6px",
      color: "#bdc3c7",
      fontSize: "14px",
      fontWeight: 500,
      cursor: "pointer",
      transition: "all 0.2s",
    },
    btnDelete: {
      flex: 1,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      gap: "8px",
      padding: "10px 16px",
      background: "#e74c3c",
      border: "none",
      borderRadius: "6px",
      color: "white",
      fontSize: "14px",
      fontWeight: 500,
      cursor: isDeleting ? "not-allowed" : "pointer",
      opacity: isDeleting ? 0.7 : 1,
      transition: "all 0.2s",
    },
    spinner: {
      width: "16px",
      height: "16px",
      border: "2px solid rgba(255, 255, 255, 0.3)",
      borderTopColor: "white",
      borderRadius: "50%",
      animation: "spin 0.8s linear infinite",
    },
  }

  return (
    <>
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
      <div style={styles.overlay} onClick={onCancel}>
        <div
          ref={modalRef}
          style={styles.modal}
          onClick={(e) => e.stopPropagation()}
          tabIndex={-1}
        >
          {/* Header */}
          <div style={styles.header}>
            <div style={styles.icon}>
              <AlertTriangle size={28} />
            </div>
            <h2 style={styles.title}>Delete {itemTypeText}?</h2>
            <button
              style={styles.closeBtn}
              onClick={onCancel}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(255, 255, 255, 0.1)"
                e.currentTarget.style.color = "#ecf0f1"
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent"
                e.currentTarget.style.color = "#7f8c8d"
              }}
            >
              <X size={20} />
            </button>
          </div>

          {/* Content */}
          <div style={styles.content}>
            <p style={styles.text}>
              Are you sure you want to delete {isMultiple ? "these" : "this"} {itemTypeText}?
            </p>
            
            <div style={styles.itemsList}>
              {items.map((item, index) => (
                <div 
                  key={item.id} 
                  style={index === items.length - 1 ? styles.itemRowLast : styles.itemRow}
                >
                  <span style={styles.itemPage}>{item.page}</span>
                  <span style={styles.itemSlug}>{item.slug || "(empty)"}</span>
                </div>
              ))}
            </div>

            <p style={styles.warning}>
              This action cannot be undone. All segments and data associated with {isMultiple ? "these stories" : "this story"} will be permanently removed.
            </p>
          </div>

          {/* Actions */}
          <div style={styles.actions}>
            <button
              style={styles.btnCancel}
              onClick={onCancel}
              disabled={isDeleting}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(255, 255, 255, 0.1)"
                e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.3)"
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent"
                e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.2)"
              }}
            >
              Cancel
            </button>
            <button
              style={styles.btnDelete}
              onClick={onConfirm}
              disabled={isDeleting}
              onMouseEnter={(e) => {
                if (!isDeleting) e.currentTarget.style.background = "#c0392b"
              }}
              onMouseLeave={(e) => {
                if (!isDeleting) e.currentTarget.style.background = "#e74c3c"
              }}
            >
              {isDeleting ? (
                <>
                  <span style={styles.spinner}></span>
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 size={16} />
                  Delete {itemTypeText}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}