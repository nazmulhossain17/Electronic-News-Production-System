// ============================================================================
// File: components/reporter/CategoryModal.tsx
// Description: Modal for managing categories (create, edit, delete)
// =============================================================================

"use client"

import { useState, useEffect } from "react"
import { X, Plus, Edit2, Trash2, Save, Loader2 } from "lucide-react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"

interface Category {
  id: string
  name: string
  color: string
  isActive: boolean
  createdAt: string
}

interface CategoryModalProps {
  isOpen: boolean
  onClose: () => void
}

const DEFAULT_COLORS = [
  "#e74c3c", // Red
  "#e67e22", // Orange
  "#f1c40f", // Yellow
  "#2ecc71", // Green
  "#1abc9c", // Teal
  "#3498db", // Blue
  "#9b59b6", // Purple
  "#34495e", // Dark Gray
  "#e91e63", // Pink
  "#00bcd4", // Cyan
]

export default function CategoryModal({ isOpen, onClose }: CategoryModalProps) {
  const queryClient = useQueryClient()

  // Form state
  const [isCreating, setIsCreating] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formName, setFormName] = useState("")
  const [formColor, setFormColor] = useState(DEFAULT_COLORS[0])

  // Fetch categories
  const { data: categoriesData, isLoading } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const response = await fetch("/api/categories", { credentials: "include" })
      if (!response.ok) throw new Error("Failed to fetch categories")
      const data = await response.json()
      // Handle different response structures
      if (Array.isArray(data)) return data
      if (data.data?.categories) return data.data.categories
      if (data.categories) return data.categories
      if (Array.isArray(data.data)) return data.data
      return []
    },
    enabled: isOpen,
  })

  const categories: Category[] = Array.isArray(categoriesData) ? categoriesData : []

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data: { name: string; color: string }) => {
      const response = await fetch("/api/categories", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      if (!response.ok) throw new Error("Failed to create category")
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] })
      resetForm()
    },
  })

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: { name: string; color: string } }) => {
      const response = await fetch(`/api/categories/${id}`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      if (!response.ok) throw new Error("Failed to update category")
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] })
      resetForm()
    },
  })

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/categories/${id}`, {
        method: "DELETE",
        credentials: "include",
      })
      if (!response.ok) throw new Error("Failed to delete category")
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] })
    },
  })

  const resetForm = () => {
    setIsCreating(false)
    setEditingId(null)
    setFormName("")
    setFormColor(DEFAULT_COLORS[0])
  }

  const handleEdit = (category: Category) => {
    setEditingId(category.id)
    setIsCreating(false)
    setFormName(category.name)
    setFormColor(category.color)
  }

  const handleDelete = (id: string, name: string) => {
    if (window.confirm(`Are you sure you want to delete "${name}"?`)) {
      deleteMutation.mutate(id)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    const data = {
      name: formName.trim(),
      color: formColor,
    }

    if (editingId) {
      updateMutation.mutate({ id: editingId, data })
    } else {
      createMutation.mutate(data)
    }
  }

  const handleStartCreate = () => {
    resetForm()
    setIsCreating(true)
  }

  useEffect(() => {
    if (!isOpen) {
      resetForm()
    }
  }, [isOpen])

  if (!isOpen) return null

  const isSaving = createMutation.isPending || updateMutation.isPending

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={styles.header}>
          <h2 style={styles.headerTitle}>Manage Categories</h2>
          <button style={styles.closeBtn} onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div style={styles.content}>
          {/* Create/Edit Form */}
          {(isCreating || editingId) && (
            <form onSubmit={handleSubmit} style={styles.form}>
              <div style={styles.formHeader}>
                <h3 style={styles.formTitle}>
                  {editingId ? "Edit Category" : "Create Category"}
                </h3>
              </div>

              <div style={styles.formField}>
                <label style={styles.label}>Name *</label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  style={styles.input}
                  placeholder="e.g., National News"
                  required
                />
              </div>

              <div style={styles.formField}>
                <label style={styles.label}>Color</label>
                <div style={styles.colorPicker}>
                  {DEFAULT_COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      style={{
                        ...styles.colorOption,
                        backgroundColor: color,
                        border: formColor === color ? "3px solid white" : "2px solid transparent",
                        boxShadow: formColor === color ? `0 0 0 2px ${color}` : "none",
                      }}
                      onClick={() => setFormColor(color)}
                    />
                  ))}
                </div>
              </div>

              <div style={styles.formActions}>
                <button
                  type="button"
                  style={styles.btnCancel}
                  onClick={resetForm}
                  disabled={isSaving}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={styles.btnSave}
                  disabled={isSaving || !formName.trim()}
                >
                  {isSaving ? (
                    <>
                      <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save size={16} />
                      {editingId ? "Update" : "Create"}
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* Add Button */}
          {!isCreating && !editingId && (
            <button style={styles.addBtn} onClick={handleStartCreate}>
              <Plus size={18} />
              Add New Category
            </button>
          )}

          {/* Categories List */}
          <div style={styles.listSection}>
            <h3 style={styles.listTitle}>Categories ({categories.length})</h3>
            
            {isLoading ? (
              <div style={styles.loading}>Loading categories...</div>
            ) : categories.length === 0 ? (
              <div style={styles.empty}>No categories yet. Create one above.</div>
            ) : (
              <div style={styles.list}>
                {categories.map((category) => (
                  <div
                    key={category.id}
                    style={{
                      ...styles.listItem,
                      borderLeftColor: category.color,
                      backgroundColor: editingId === category.id ? "rgba(52, 152, 219, 0.1)" : "transparent",
                    }}
                  >
                    <div style={styles.listItemInfo}>
                      <div style={styles.listItemHeader}>
                        <span
                          style={{
                            ...styles.colorDot,
                            backgroundColor: category.color,
                          }}
                        />
                        <span style={styles.categoryName}>{category.name}</span>
                      </div>
                    </div>
                    <div style={styles.listItemActions}>
                      <button
                        style={styles.actionBtn}
                        onClick={() => handleEdit(category)}
                        title="Edit"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        style={{ ...styles.actionBtn, ...styles.deleteActionBtn }}
                        onClick={() => handleDelete(category.id, category.name)}
                        disabled={deleteMutation.isPending}
                        title="Delete"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
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
    width: "560px",
    maxWidth: "90vw",
    maxHeight: "85vh",
    display: "flex",
    flexDirection: "column",
    boxShadow: "0 4px 20px rgba(0, 0, 0, 0.3)",
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "16px 20px",
    borderBottom: "1px solid #34495e",
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
    border: "none",
    borderRadius: "4px",
    color: "#95a5a6",
    cursor: "pointer",
  },
  content: {
    padding: "20px",
    overflowY: "auto",
    flex: 1,
  },
  form: {
    backgroundColor: "#34495e",
    borderRadius: "8px",
    padding: "16px",
    marginBottom: "20px",
  },
  formHeader: {
    marginBottom: "16px",
  },
  formTitle: {
    fontSize: "14px",
    fontWeight: 600,
    color: "#ecf0f1",
    margin: 0,
  },
  formRow: {
    display: "flex",
    gap: "12px",
    marginBottom: "12px",
  },
  formField: {
    flex: 1,
    marginBottom: "12px",
  },
  formFieldSmall: {
    width: "120px",
    flexShrink: 0,
  },
  label: {
    display: "block",
    fontSize: "11px",
    fontWeight: 500,
    color: "#bdc3c7",
    marginBottom: "6px",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
  },
  input: {
    width: "100%",
    padding: "10px 12px",
    backgroundColor: "#2c3e50",
    border: "1px solid #4a5568",
    borderRadius: "4px",
    color: "#ecf0f1",
    fontSize: "14px",
  },
  colorPicker: {
    display: "flex",
    gap: "8px",
    flexWrap: "wrap",
  },
  colorOption: {
    width: "28px",
    height: "28px",
    borderRadius: "4px",
    cursor: "pointer",
    transition: "transform 0.2s",
  },
  formActions: {
    display: "flex",
    justifyContent: "flex-end",
    gap: "10px",
    marginTop: "16px",
    paddingTop: "12px",
    borderTop: "1px solid #4a5568",
  },
  btnCancel: {
    padding: "8px 16px",
    backgroundColor: "transparent",
    border: "1px solid #4a5568",
    borderRadius: "4px",
    color: "#bdc3c7",
    fontSize: "13px",
    cursor: "pointer",
  },
  btnSave: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    padding: "8px 16px",
    backgroundColor: "#27ae60",
    border: "none",
    borderRadius: "4px",
    color: "white",
    fontSize: "13px",
    fontWeight: 500,
    cursor: "pointer",
  },
  addBtn: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    width: "100%",
    padding: "12px",
    backgroundColor: "transparent",
    border: "2px dashed #4a5568",
    borderRadius: "6px",
    color: "#95a5a6",
    fontSize: "14px",
    cursor: "pointer",
    marginBottom: "20px",
    transition: "all 0.2s",
  },
  listSection: {
    borderTop: "1px solid #34495e",
    paddingTop: "16px",
  },
  listTitle: {
    fontSize: "13px",
    fontWeight: 600,
    color: "#95a5a6",
    margin: "0 0 12px 0",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
  },
  loading: {
    textAlign: "center",
    padding: "20px",
    color: "#7f8c8d",
    fontSize: "14px",
  },
  empty: {
    textAlign: "center",
    padding: "20px",
    color: "#7f8c8d",
    fontSize: "14px",
  },
  list: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    maxHeight: "300px",
    overflowY: "auto",
  },
  listItem: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "12px",
    backgroundColor: "#34495e",
    borderRadius: "6px",
    borderLeft: "4px solid",
  },
  listItemInfo: {
    flex: 1,
    minWidth: 0,
  },
  listItemHeader: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
  },
  colorDot: {
    width: "12px",
    height: "12px",
    borderRadius: "50%",
    flexShrink: 0,
  },
  categoryName: {
    fontSize: "14px",
    fontWeight: 500,
    color: "#ecf0f1",
  },
  listItemActions: {
    display: "flex",
    gap: "6px",
    marginLeft: "12px",
  },
  actionBtn: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: "28px",
    height: "28px",
    backgroundColor: "#3498db",
    border: "none",
    borderRadius: "4px",
    color: "white",
    cursor: "pointer",
    transition: "background 0.2s",
  },
  deleteActionBtn: {
    backgroundColor: "#e74c3c",
  },
}