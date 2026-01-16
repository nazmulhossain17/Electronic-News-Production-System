"use client"

import { useEffect, useState, useMemo, useCallback, useRef } from "react"
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query"
import { Plus, Zap, Trash2, X, CheckSquare, Square } from "lucide-react"
import { DragEndEvent, DragStartEvent } from "@dnd-kit/core"
import { arrayMove } from "@dnd-kit/sortable"

import api, { Segment } from "@/lib/api-client"
import Navbar from "@/components/Navbar"
import BulletinCreateModal from "@/components/BulletinCreateModal"
import { createPlaceholderSegment, formatDuration } from "@/types/helpers"
import { RundownDisplayItem } from "@/types/reporter"
import BulletinsSidebar from "./reporter/BulletinsSidebar"
import RundownTable from "./reporter/RundownTable"
import DescriptionPanel from "./reporter/DescriptionPanel"
import DeleteConfirmModal from "./reporter/DeleteConfirmModal"

export default function ReporterPage() {
  const queryClient = useQueryClient()

  // ─── Selection State ────────────────────────────────────────────
  const [selectedBulletin, setSelectedBulletin] = useState<string | null>(null)
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null)
  const [selectedSegmentId, setSelectedSegmentId] = useState<string | null>(null)

  // ─── Multi-Delete State ─────────────────────────────────────────
  const [selectedForDeleteIds, setSelectedForDeleteIds] = useState<Set<string>>(new Set())
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [lastSelectedIndex, setLastSelectedIndex] = useState<number | null>(null)

  // ─── Edit State ─────────────────────────────────────────────────
  const [editDescription, setEditDescription] = useState("")
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>()

  // ─── UI State ───────────────────────────────────────────────────
  const [isSaving, setIsSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState("")
  const [autoSaveTimeout, setAutoSaveTimeout] = useState<NodeJS.Timeout | null>(null)
  const [showBulletinModal, setShowBulletinModal] = useState(false)

  // ─── Inline Editing State ───────────────────────────────────────
  const [editingSegmentId, setEditingSegmentId] = useState<string | null>(null)
  const [tempSegmentValue, setTempSegmentValue] = useState("")
  const [addingSegmentForRowId, setAddingSegmentForRowId] = useState<string | null>(null)
  const [editingSlugRowId, setEditingSlugRowId] = useState<string | null>(null)
  const [tempSlugValue, setTempSlugValue] = useState("")

  // ─── Drag State ─────────────────────────────────────────────────
  const [activeId, setActiveId] = useState<string | null>(null)

  // ─── Delete Progress ────────────────────────────────────────────
  const [isDeleting, setIsDeleting] = useState(false)

  // ─── Queries ────────────────────────────────────────────────────

  const { data: bulletinsData, isLoading: bulletinsLoading } = useQuery({
    queryKey: ["bulletins", "today"],
    queryFn: () => api.bulletins.today(),
  })

  const bulletins = bulletinsData?.bulletins || []

  const { data: bulletinData, isLoading: rowsLoading } = useQuery({
    queryKey: ["bulletin", selectedBulletin],
    queryFn: () => api.bulletins.get(selectedBulletin!),
    enabled: !!selectedBulletin,
  })

  const currentBulletin = bulletinData?.bulletin
  const rows = bulletinData?.rows || []

  const { data: segmentsData } = useQuery({
    queryKey: ["bulletin-segments", selectedBulletin, rows.length],
    queryFn: async () => {
      if (!rows.length) return {}
      const segmentsByRow: Record<string, Segment[]> = {}

      await Promise.all(
        rows.map(async (row) => {
          try {
            const result = await api.segments.list(row.id)
            segmentsByRow[row.id] = result.segments
          } catch {
            segmentsByRow[row.id] = [
              createPlaceholderSegment(row.id, row.segment || "LIVE", row.notes || ""),
            ]
          }
        })
      )
      return segmentsByRow
    },
    enabled: !!selectedBulletin && rows.length > 0,
  })

  const segmentsByRow = segmentsData || {}

  const { data: categoriesData } = useQuery({
    queryKey: ["categories"],
    queryFn: () => api.categories.list(),
  })

  const categories = categoriesData?.categories || []

  // ─── Mutations ──────────────────────────────────────────────────

  const autoGenerateMutation = useMutation({
    mutationFn: async () => {
      const today = new Date().toISOString().split("T")[0]
      return api.bulletins.autoGenerate(today)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bulletins"] })
      showMessage("Bulletins auto-generated successfully!")
    },
    onError: () => showMessage("Failed to auto-generate bulletins"),
  })

  const updateRowMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Parameters<typeof api.rows.update>[1] }) => {
      return api.rows.update(id, data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bulletin", selectedBulletin] })
    },
  })

  const reorderRowsMutation = useMutation({
    mutationFn: async (rowsData: Array<{ id: string; sortOrder: number; pageCode?: string; blockCode?: string }>) => {
      return api.rows.reorder(selectedBulletin!, rowsData)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bulletin", selectedBulletin] })
      showMessage("Rows reordered")
    },
    onError: () => showMessage("Failed to reorder rows"),
  })

  const createRowMutation = useMutation({
    mutationFn: async (data: Parameters<typeof api.rows.create>[1]) => {
      return api.rows.create(selectedBulletin!, data)
    },
    onSuccess: async (newRow) => {
      try {
        await api.segments.create(newRow.id, { name: "LIVE", description: "" })
      } catch (e) {
        console.error("Failed to create default segment:", e)
      }
      queryClient.invalidateQueries({ queryKey: ["bulletin", selectedBulletin] })
      queryClient.invalidateQueries({ queryKey: ["bulletin-segments", selectedBulletin] })
      setSelectedItemId(newRow.id)
      showMessage("New story added")
    },
    onError: () => showMessage("Failed to add new story"),
  })

  const createSegmentMutation = useMutation({
    mutationFn: async ({ rowId, data }: { rowId: string; data: { name: string; description?: string } }) => {
      return api.segments.create(rowId, data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bulletin-segments", selectedBulletin] })
      showMessage("Segment added")
    },
    onError: () => showMessage("Failed to add segment"),
  })

  const updateSegmentMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Parameters<typeof api.segments.update>[1] }) => {
      return api.segments.update(id, data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bulletin-segments", selectedBulletin] })
    },
  })

  const deleteSegmentMutation = useMutation({
    mutationFn: async (id: string) => {
      return api.segments.delete(id)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bulletin-segments", selectedBulletin] })
      showMessage("Segment deleted")
      setSelectedSegmentId(null)
    },
    onError: (error: Error) => showMessage(error.message || "Failed to delete segment"),
  })

  // ─── Computed Values ────────────────────────────────────────────

  const rundownItems = useMemo<RundownDisplayItem[]>(() => {
    return rows.map((row, index) => {
      const segments = segmentsByRow[row.id] || []

      const displaySegments: Segment[] =
        segments.length > 0
          ? segments
          : [createPlaceholderSegment(row.id, row.segment || "LIVE", row.notes || "")]

      return {
        id: row.id,
        page: row.pageCode || `A${index + 1}`,
        slug: row.slug || "",
        segments: displaySegments,
        storyProduc: row.storyProducerId ? "✓" : "",
        finalAppr: row.finalApproval ? "✓" : "",
        float: row.float ? "F" : "",
        estDuration: row.estDurationDisplay || formatDuration(row.estDurationSecs),
        actual: row.actualDurationDisplay || (row.actualDurationSecs ? formatDuration(row.actualDurationSecs) : ""),
        front: row.frontTimeDisplay || "",
        cume: row.cumeTimeDisplay || formatDuration(row.cumeTimeSecs),
        lastModBy: row.lastModifiedByName || "SYSTEM",
        categoryId: row.categoryId || "",
        status: row.status,
        script: row.script,
        notes: row.notes,
        rowType: row.rowType,
        blockCode: row.blockCode,
        sortOrder: row.sortOrder,
      }
    })
  }, [rows, segmentsByRow])

  const selectedItem = rundownItems.find((item) => item.id === selectedItemId)
  const selectedSegment = selectedItem?.segments.find((s) => s.id === selectedSegmentId)
  
  // Get items selected for deletion
  const selectedForDeleteItems = rundownItems.filter((item) => selectedForDeleteIds.has(item.id))

  // ─── Effects ────────────────────────────────────────────────────

  useEffect(() => {
    if (bulletins.length > 0 && !selectedBulletin) {
      setSelectedBulletin(bulletins[0].id)
    }
  }, [bulletins, selectedBulletin])

  useEffect(() => {
    if (categories.length > 0 && !selectedCategoryId) {
      setSelectedCategoryId(categories[0].id)
    }
  }, [categories, selectedCategoryId])

  useEffect(() => {
    if (selectedSegment) {
      setEditDescription(selectedSegment.description || "")
    } else if (selectedItem) {
      setEditDescription(selectedItem.notes || "")
    }
    if (selectedItem) {
      setSelectedCategoryId(selectedItem.categoryId || categories[0]?.id)
    }
  }, [selectedSegment, selectedItem, categories])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && selectedForDeleteIds.size > 0 && !showDeleteModal) {
        setSelectedForDeleteIds(new Set())
        setLastSelectedIndex(null)
      }
      // Delete key to open modal
      if (e.key === "Delete" && selectedForDeleteIds.size > 0 && !showDeleteModal) {
        setShowDeleteModal(true)
      }
    }

    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [selectedForDeleteIds, showDeleteModal])

  // ─── Helpers ────────────────────────────────────────────────────

  const showMessage = useCallback((msg: string) => {
    setSaveMessage(msg)
    setTimeout(() => setSaveMessage(""), 3000)
  }, [])

  // ─── Multi-Select Delete Handlers ───────────────────────────────

  const handlePgClick = useCallback((item: RundownDisplayItem, e: React.MouseEvent) => {
    const currentIndex = rundownItems.findIndex((i) => i.id === item.id)
    
    if (e.shiftKey && lastSelectedIndex !== null) {
      // Shift+Click: Select range
      const start = Math.min(lastSelectedIndex, currentIndex)
      const end = Math.max(lastSelectedIndex, currentIndex)
      const rangeIds = rundownItems.slice(start, end + 1).map((i) => i.id)
      
      setSelectedForDeleteIds((prev) => {
        const newSet = new Set(prev)
        rangeIds.forEach((id) => newSet.add(id))
        return newSet
      })
    } else if (e.ctrlKey || e.metaKey) {
      // Ctrl+Click: Toggle single item
      setSelectedForDeleteIds((prev) => {
        const newSet = new Set(prev)
        if (newSet.has(item.id)) {
          newSet.delete(item.id)
        } else {
          newSet.add(item.id)
        }
        return newSet
      })
      setLastSelectedIndex(currentIndex)
    } else {
      // Regular click: Toggle single item (clear others)
      setSelectedForDeleteIds((prev) => {
        if (prev.has(item.id) && prev.size === 1) {
          return new Set()
        }
        return new Set([item.id])
      })
      setLastSelectedIndex(currentIndex)
    }
  }, [rundownItems, lastSelectedIndex])

  const handleSelectAll = useCallback(() => {
    if (selectedForDeleteIds.size === rundownItems.length) {
      // Deselect all
      setSelectedForDeleteIds(new Set())
    } else {
      // Select all
      setSelectedForDeleteIds(new Set(rundownItems.map((item) => item.id)))
    }
  }, [rundownItems, selectedForDeleteIds])

  const handleDeleteClick = useCallback(() => {
    if (selectedForDeleteIds.size > 0) {
      setShowDeleteModal(true)
    }
  }, [selectedForDeleteIds])

  const handleConfirmDelete = useCallback(async () => {
    if (selectedForDeleteIds.size === 0) return

    setIsDeleting(true)
    const idsToDelete = Array.from(selectedForDeleteIds)
    let successCount = 0
    let failCount = 0

    for (const id of idsToDelete) {
      try {
        await api.rows.delete(id)
        successCount++
      } catch (error) {
        console.error(`Failed to delete row ${id}:`, error)
        failCount++
      }
    }

    // Refresh data
    queryClient.invalidateQueries({ queryKey: ["bulletin", selectedBulletin] })
    queryClient.invalidateQueries({ queryKey: ["bulletin-segments", selectedBulletin] })

    // Clear selection
    setSelectedForDeleteIds(new Set())
    setLastSelectedIndex(null)
    setShowDeleteModal(false)
    setIsDeleting(false)

    // Clear item selection if it was deleted
    if (selectedItemId && idsToDelete.includes(selectedItemId)) {
      setSelectedItemId(null)
      setSelectedSegmentId(null)
    }

    // Show result message
    if (failCount === 0) {
      showMessage(`${successCount} ${successCount === 1 ? "story" : "stories"} deleted successfully`)
    } else {
      showMessage(`Deleted ${successCount}, failed ${failCount}`)
    }
  }, [selectedForDeleteIds, selectedBulletin, selectedItemId, queryClient, showMessage])

  const handleCancelDelete = useCallback(() => {
    setShowDeleteModal(false)
  }, [])

  const handleClearDeleteSelection = useCallback(() => {
    setSelectedForDeleteIds(new Set())
    setLastSelectedIndex(null)
  }, [])

  // ─── Other Handlers ─────────────────────────────────────────────

  const handleSelectBulletin = useCallback((id: string) => {
    setSelectedBulletin(id)
    setSelectedItemId(null)
    setSelectedSegmentId(null)
    setSelectedForDeleteIds(new Set())
    setLastSelectedIndex(null)
  }, [])

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as string)
  }, [])

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event
      setActiveId(null)

      if (!over || active.id === over.id) return

      const oldIndex = rundownItems.findIndex((item) => item.id === active.id)
      const newIndex = rundownItems.findIndex((item) => item.id === over.id)

      if (oldIndex === -1 || newIndex === -1) return

      const reorderedItems = arrayMove(rundownItems, oldIndex, newIndex)

      const rowsToUpdate = reorderedItems.map((item, index) => {
        const blockCode = item.blockCode
        let pageNumber = 1
        for (let i = 0; i < index; i++) {
          if (reorderedItems[i].blockCode === blockCode) {
            pageNumber++
          }
        }
        const pageCode = `${blockCode}${pageNumber}`

        return {
          id: item.id,
          sortOrder: index,
          pageCode,
          blockCode,
        }
      })

      reorderRowsMutation.mutate(rowsToUpdate)
    },
    [rundownItems, reorderRowsMutation]
  )

  const handleRowClick = useCallback((item: RundownDisplayItem) => {
    setSelectedItemId(item.id)
    if (item.segments.length > 0) {
      setSelectedSegmentId(item.segments[0].id)
    }
  }, [])

  const handleSegmentClick = useCallback((itemId: string, segment: Segment) => {
    setSelectedItemId(itemId)
    setSelectedSegmentId(segment.id)
  }, [])

  const handleSlugDoubleClick = useCallback((rowId: string, slug: string) => {
    setEditingSlugRowId(rowId)
    setTempSlugValue(slug)
  }, [])

  const handleSlugSave = useCallback(async () => {
    if (!editingSlugRowId) {
      setEditingSlugRowId(null)
      setTempSlugValue("")
      return
    }

    const trimmedSlug = tempSlugValue.trim()
    if (!trimmedSlug) {
      showMessage("Slug cannot be empty")
      setEditingSlugRowId(null)
      setTempSlugValue("")
      return
    }

    try {
      await updateRowMutation.mutateAsync({
        id: editingSlugRowId,
        data: { slug: trimmedSlug.toUpperCase() },
      })
      showMessage("Slug updated")
    } catch {
      showMessage("Failed to update slug")
    }

    setEditingSlugRowId(null)
    setTempSlugValue("")
  }, [editingSlugRowId, tempSlugValue, updateRowMutation, showMessage])

  const handleSlugCancel = useCallback(() => {
    setEditingSlugRowId(null)
    setTempSlugValue("")
  }, [])

  const handleSegmentDoubleClick = useCallback((segment: Segment) => {
    if (segment.id.startsWith("temp-")) return
    setEditingSegmentId(segment.id)
    setTempSegmentValue(segment.name)
  }, [])

  const handleSegmentSave = useCallback(async () => {
    if (!editingSegmentId || !tempSegmentValue.trim()) {
      setEditingSegmentId(null)
      setAddingSegmentForRowId(null)
      setTempSegmentValue("")
      return
    }

    try {
      await updateSegmentMutation.mutateAsync({
        id: editingSegmentId,
        data: { name: tempSegmentValue.toUpperCase() },
      })
      showMessage("Segment updated")
    } catch {
      showMessage("Failed to update segment")
    }

    setEditingSegmentId(null)
    setAddingSegmentForRowId(null)
    setTempSegmentValue("")
  }, [editingSegmentId, tempSegmentValue, updateSegmentMutation, showMessage])

  const handleSegmentSaveNew = useCallback(
    async (rowId: string) => {
      if (!tempSegmentValue.trim()) {
        setEditingSegmentId(null)
        setAddingSegmentForRowId(null)
        setTempSegmentValue("")
        return
      }

      createSegmentMutation.mutate({
        rowId,
        data: {
          name: tempSegmentValue.toUpperCase(),
          description: "",
        },
      })

      setEditingSegmentId(null)
      setAddingSegmentForRowId(null)
      setTempSegmentValue("")
    },
    [tempSegmentValue, createSegmentMutation]
  )

  const handleSegmentCancel = useCallback(() => {
    setEditingSegmentId(null)
    setAddingSegmentForRowId(null)
    setTempSegmentValue("")
  }, [])

  const handleAddSegment = useCallback((rowId: string) => {
    setAddingSegmentForRowId(rowId)
    setTempSegmentValue("")
  }, [])

  const handleDeleteSegment = useCallback(
    (segment: Segment) => {
      if (segment.id.startsWith("temp-")) return
      deleteSegmentMutation.mutate(segment.id)
    },
    [deleteSegmentMutation]
  )

  const handleDescriptionChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      if (!selectedSegmentId || selectedSegmentId.startsWith("temp-")) return

      const newDescription = e.target.value
      setEditDescription(newDescription)

      if (autoSaveTimeout) clearTimeout(autoSaveTimeout)
      setIsSaving(true)

      const timeout = setTimeout(async () => {
        try {
          await updateSegmentMutation.mutateAsync({
            id: selectedSegmentId,
            data: { description: newDescription },
          })
          showMessage("Description saved")
          setIsSaving(false)
        } catch {
          showMessage("Failed to save")
          setIsSaving(false)
        }
      }, 1000)

      setAutoSaveTimeout(timeout)
    },
    [selectedSegmentId, autoSaveTimeout, updateSegmentMutation, showMessage]
  )

  const handleManualSave = useCallback(async () => {
    if (!selectedSegmentId || selectedSegmentId.startsWith("temp-")) return

    try {
      setIsSaving(true)
      await updateSegmentMutation.mutateAsync({
        id: selectedSegmentId,
        data: { description: editDescription },
      })
      showMessage("Description saved!")
      setIsSaving(false)
    } catch {
      showMessage("Failed to save")
      setIsSaving(false)
    }
  }, [selectedSegmentId, editDescription, updateSegmentMutation, showMessage])

  const handleCategoryChange = useCallback(
    async (categoryId: string) => {
      if (!selectedItemId) return

      setSelectedCategoryId(categoryId)
      try {
        await updateRowMutation.mutateAsync({
          id: selectedItemId,
          data: { categoryId: categoryId || null },
        })
        showMessage("Category updated")
      } catch {
        showMessage("Failed to update category")
      }
    },
    [selectedItemId, updateRowMutation, showMessage]
  )

  const handleClosePanel = useCallback(() => {
    setSelectedItemId(null)
    setSelectedSegmentId(null)
  }, [])

  const addNewStory = useCallback(() => {
    if (!selectedBulletin) return

    const lastRow = rows[rows.length - 1]
    const blockCode = lastRow?.blockCode || "A"

    createRowMutation.mutate({
      blockCode,
      rowType: "STORY",
      slug: "NEW STORY",
      segment: "LIVE",
      status: "BLANK",
    })
  }, [selectedBulletin, rows, createRowMutation])

  // ─── Styles ─────────────────────────────────────────────────────

  const styles = {
    deleteSelectionBar: {
      display: "flex",
      alignItems: "center",
      gap: "12px",
      background: "rgba(231, 76, 60, 0.1)",
      border: "1px solid rgba(231, 76, 60, 0.3)",
      borderRadius: "6px",
      padding: "6px 12px",
    },
    selectedCount: {
      fontSize: "13px",
      color: "#ecf0f1",
      display: "flex",
      alignItems: "center",
      gap: "6px",
    },
    selectedCountNumber: {
      background: "#e74c3c",
      color: "white",
      padding: "2px 8px",
      borderRadius: "10px",
      fontWeight: 600,
      fontSize: "12px",
    },
    btnSelectAll: {
      display: "flex",
      alignItems: "center",
      gap: "4px",
      padding: "4px 8px",
      background: "transparent",
      border: "1px solid rgba(255, 255, 255, 0.2)",
      borderRadius: "4px",
      color: "#bdc3c7",
      fontSize: "12px",
      cursor: "pointer",
      transition: "all 0.2s",
    },
    btnDeleteSelected: {
      display: "flex",
      alignItems: "center",
      gap: "6px",
      padding: "6px 12px",
      background: "#e74c3c",
      color: "white",
      border: "none",
      borderRadius: "4px",
      fontSize: "13px",
      fontWeight: 500,
      cursor: "pointer",
      transition: "all 0.2s",
    },
    btnClearSelection: {
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      width: "28px",
      height: "28px",
      background: "transparent",
      border: "1px solid rgba(255, 255, 255, 0.2)",
      borderRadius: "4px",
      color: "#95a5a6",
      cursor: "pointer",
      transition: "all 0.2s",
    },
    reorderIndicator: {
      fontSize: "12px",
      color: "#f39c12",
      marginLeft: "12px",
    },
    hint: {
      fontSize: "11px",
      color: "#7f8c8d",
      marginLeft: "8px",
    },
  }

  // ─── Render ─────────────────────────────────────────────────────

  const bulletinHeader = currentBulletin
    ? `${currentBulletin.title} [${new Date(currentBulletin.airDate).toLocaleDateString()} ${currentBulletin.startTime}]`
    : "Select a bulletin"

  const allSelected = rundownItems.length > 0 && selectedForDeleteIds.size === rundownItems.length

  return (
    <>
      <Navbar />
      <div className="enps-fullscreen">
        {/* Top Header */}
        <div className="top-header">
          <div className="title">AP ENPS - Newsroom</div>
          
          <div className="header-actions">
            {/* Delete Selection Bar - Shows when items selected */}
            {selectedForDeleteIds.size > 0 && (
              <div style={styles.deleteSelectionBar}>
                <span style={styles.selectedCount}>
                  <span style={styles.selectedCountNumber}>{selectedForDeleteIds.size}</span>
                  {selectedForDeleteIds.size === 1 ? "story" : "stories"} selected
                </span>
                
                <button
                  style={styles.btnSelectAll}
                  onClick={handleSelectAll}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "rgba(255, 255, 255, 0.1)"
                    e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.3)"
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "transparent"
                    e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.2)"
                  }}
                  title={allSelected ? "Deselect all" : "Select all"}
                >
                  {allSelected ? <CheckSquare size={14} /> : <Square size={14} />}
                  {allSelected ? "Deselect All" : "Select All"}
                </button>

                <button
                  style={styles.btnDeleteSelected}
                  onClick={handleDeleteClick}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "#c0392b")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "#e74c3c")}
                >
                  <Trash2 size={16} />
                  <span>Delete {selectedForDeleteIds.size === 1 ? "Story" : "Stories"}</span>
                </button>

                <button
                  style={styles.btnClearSelection}
                  onClick={handleClearDeleteSelection}
                  title="Clear selection (Esc)"
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "rgba(255, 255, 255, 0.1)"
                    e.currentTarget.style.color = "#ecf0f1"
                    e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.3)"
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "transparent"
                    e.currentTarget.style.color = "#95a5a6"
                    e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.2)"
                  }}
                >
                  <X size={16} />
                </button>

                <span style={styles.hint}>
                  Ctrl+Click to add • Shift+Click for range
                </span>
              </div>
            )}

            {selectedForDeleteIds.size === 0 && (
              <>
                <button
                  className="btn-create-bulletin"
                  onClick={() => autoGenerateMutation.mutate()}
                  disabled={autoGenerateMutation.isPending}
                >
                  <Zap size={16} />
                  <span>{autoGenerateMutation.isPending ? "Generating..." : "Auto-Generate"}</span>
                </button>
                <button className="btn-create-bulletin" onClick={() => setShowBulletinModal(true)}>
                  <Plus size={16} />
                  <span>New Bulletin</span>
                </button>
              </>
            )}
          </div>

          <div className="datetime">
            {new Date().toLocaleString("en-US", {
              weekday: "short",
              month: "short",
              day: "numeric",
              year: "numeric",
              hour: "numeric",
              minute: "2-digit",
            })}
          </div>
        </div>

        <div className="main-layout">
          {/* Bulletins Sidebar */}
          <BulletinsSidebar
            bulletins={bulletins}
            isLoading={bulletinsLoading}
            selectedBulletinId={selectedBulletin}
            onSelectBulletin={handleSelectBulletin}
          />

          {/* Main Rundown Area */}
          <div className="rundown-scroll-wrapper">
            <div className="rundown-header">
              <div className="rundown-title">{bulletinHeader}</div>
              {reorderRowsMutation.isPending && (
                <span style={styles.reorderIndicator}>Saving order...</span>
              )}
            </div>

            <RundownTable
              items={rundownItems}
              isLoading={rowsLoading}
              selectedItemId={selectedItemId}
              selectedForDeleteIds={selectedForDeleteIds}
              selectedSegmentId={selectedSegmentId}
              activeId={activeId}
              editingSlugRowId={editingSlugRowId}
              tempSlugValue={tempSlugValue}
              editingSegmentId={editingSegmentId}
              tempSegmentValue={tempSegmentValue}
              addingSegmentForRowId={addingSegmentForRowId}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
              onRowClick={handleRowClick}
              onPgClick={handlePgClick}
              onSlugDoubleClick={handleSlugDoubleClick}
              onSlugChange={setTempSlugValue}
              onSlugSave={handleSlugSave}
              onSlugCancel={handleSlugCancel}
              onSegmentClick={handleSegmentClick}
              onSegmentDoubleClick={handleSegmentDoubleClick}
              onSegmentChange={setTempSegmentValue}
              onSegmentSave={handleSegmentSave}
              onSegmentSaveNew={handleSegmentSaveNew}
              onSegmentCancel={handleSegmentCancel}
              onSegmentDelete={handleDeleteSegment}
              onAddSegment={handleAddSegment}
            />

            {/* Add Story Button */}
            <button
              className="add-story-btn"
              onClick={addNewStory}
              disabled={!selectedBulletin || createRowMutation.isPending}
            >
              {createRowMutation.isPending ? "Adding..." : "+ Add Story"}
            </button>

            {/* Status Bar */}
            <div className="status-bar">
              <span>
                {currentBulletin?.timingVarianceSecs !== undefined
                  ? currentBulletin.timingVarianceSecs >= 0
                    ? `Under ${formatDuration(currentBulletin.timingVarianceSecs)}`
                    : `Over ${formatDuration(Math.abs(currentBulletin.timingVarianceSecs))}`
                  : "Under 0:00"}
              </span>
              <span className={`live-indicator ${currentBulletin?.status === "ON_AIR" ? "active" : ""}`}>
                {currentBulletin?.status === "ON_AIR" ? "LIVE" : "READY"}
              </span>
            </div>
          </div>

          {/* Right Description Panel */}
          {selectedItem && selectedSegment && (
            <DescriptionPanel
              selectedItem={selectedItem}
              selectedSegment={selectedSegment}
              selectedSegmentId={selectedSegmentId}
              categories={categories}
              selectedCategoryId={selectedCategoryId}
              editDescription={editDescription}
              isSaving={isSaving}
              saveMessage={saveMessage}
              isDeletePending={deleteSegmentMutation.isPending}
              onClose={handleClosePanel}
              onSegmentSelect={setSelectedSegmentId}
              onCategoryChange={handleCategoryChange}
              onDescriptionChange={handleDescriptionChange}
              onManualSave={handleManualSave}
              onDeleteSegment={handleDeleteSegment}
            />
          )}
        </div>
      </div>

      {/* Modals */}
      <BulletinCreateModal isOpen={showBulletinModal} onClose={() => setShowBulletinModal(false)} />
      
      <DeleteConfirmModal
        isOpen={showDeleteModal}
        items={selectedForDeleteItems.map((item) => ({
          id: item.id,
          page: item.page,
          slug: item.slug,
        }))}
        itemType="story"
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
        isDeleting={isDeleting}
      />
    </>
  )
}