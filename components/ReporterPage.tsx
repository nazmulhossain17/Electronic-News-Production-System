// ============================================================================
// File: components/ReporterPage.tsx
// Description: Main reporter interface for ENPS newsroom system
// ============================================================================

"use client"

import { useEffect, useState, useMemo, useCallback } from "react"
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query"
import { Plus, Zap, Trash2, X, CheckSquare, Square, PanelLeftClose, PanelLeft, Tags } from "lucide-react"
import { DragEndEvent, DragStartEvent } from "@dnd-kit/core"
import { arrayMove } from "@dnd-kit/sortable"

import api, { Segment, Bulletin } from "@/lib/api-client"
import { generateBulletinRtf, downloadRtf } from "@/lib/rtf-generator"
import Navbar from "@/components/Navbar"
import BulletinCreateModal from "@/components/BulletinCreateModal"
import { createPlaceholderSegment, formatDuration } from "@/types/helpers"
import { RundownDisplayItem } from "@/types/reporter"
import BulletinsSidebar from "./reporter/BulletinsSidebar"
import BulletinEditModal, { BulletinUpdateData } from "./reporter/BulletinEditModal"
import CategoryModal from "./reporter/CategoryModal"
import RundownTable from "./reporter/RundownTable"
import DescriptionPanel from "./reporter/DescriptionPanel"
import DeleteConfirmModal from "./reporter/DeleteConfirmModal"

export default function ReporterPage() {
  const queryClient = useQueryClient()

  // ─── Selection State ────────────────────────────────────────────
  const [selectedBulletin, setSelectedBulletin] = useState<string | null>(null)
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null)
  const [selectedSegmentId, setSelectedSegmentId] = useState<string | null>(null)

  const [selectedDate, setSelectedDate] = useState<Date>(new Date())

  // Add the date change handler:
  const handleDateChange = useCallback((date: Date) => {
    setSelectedDate(date)
    setSelectedBulletin(null)
    setSelectedItemId(null)
    setSelectedSegmentId(null)
    setSelectedForDeleteIds(new Set())
  }, [])

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
  const [editingDurationRowId, setEditingDurationRowId] = useState<string | null>(null)
  const [tempDurationValue, setTempDurationValue] = useState("")
  // New editing states
  const [editingProducerRowId, setEditingProducerRowId] = useState<string | null>(null)
  const [tempProducerValue, setTempProducerValue] = useState("")
  const [editingActualRowId, setEditingActualRowId] = useState<string | null>(null)
  const [tempActualValue, setTempActualValue] = useState("")
  const [editingFrontRowId, setEditingFrontRowId] = useState<string | null>(null)
  const [tempFrontValue, setTempFrontValue] = useState("")

  // ─── Drag State ─────────────────────────────────────────────────
  const [activeId, setActiveId] = useState<string | null>(null)

  // ─── Delete Progress ────────────────────────────────────────────
  const [isDeleting, setIsDeleting] = useState(false)

  // ─── Sidebar Toggle ────────────────────────────────────────────
  const [isSidebarVisible, setIsSidebarVisible] = useState(true)

  // ─── Category Modal ────────────────────────────────────────────
  const [showCategoryModal, setShowCategoryModal] = useState(false)

  // ─── Queries ────────────────────────────────────────────────────

  // FIXED: Use /api/bulletins with date query parameter instead of /api/bulletins/today
  const { data: bulletinsData, isLoading: bulletinsLoading } = useQuery({
    queryKey: ["bulletins", "byDate", selectedDate.toISOString().split("T")[0]],
    queryFn: async () => {
      const dateString = selectedDate.toISOString().split("T")[0]
      const response = await fetch(`/api/bulletins?date=${dateString}`, {
        credentials: "include",
      })
      if (!response.ok) {
        throw new Error("Failed to fetch bulletins")
      }
      const data = await response.json()
      return data.data || data // Handle both { data: { bulletins } } and { bulletins } formats
    },
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
  })

  const categories = Array.isArray(categoriesData) ? categoriesData : []

  // Fetch current user to get their role
  const { data: userData } = useQuery({
    queryKey: ["currentUser"],
    queryFn: async () => {
      const response = await fetch("/api/me", {
        credentials: "include",
      })
      if (!response.ok) {
        throw new Error("Failed to fetch user")
      }
      return response.json()
    },
  })

  const currentUserRole = userData?.data?.user?.role || userData?.user?.role || "REPORTER"

  // ─── Bulletin Edit Modal State ──────────────────────────────────
  const [editingBulletin, setEditingBulletin] = useState<Bulletin | null>(null)
  const [showEditBulletinModal, setShowEditBulletinModal] = useState(false)

  // ─── Mutations ──────────────────────────────────────────────────

  // FIXED: Auto-generate should use selected date, not always today
  const autoGenerateMutation = useMutation({
    mutationFn: async () => {
      const dateString = selectedDate.toISOString().split("T")[0]
      return api.bulletins.autoGenerate(dateString)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bulletins", "byDate", selectedDate.toISOString().split("T")[0]] })
      showMessage("Bulletins auto-generated successfully!")
    },
    onError: () => showMessage("Failed to auto-generate bulletins"),
  })

  // Extended row update data type to include new fields
  type ExtendedRowUpdateData = {
    slug?: string
    segment?: string
    rowType?: string
    storyProducerId?: string | null
    storyProducer?: string | null  // New field
    reporterId?: string | null
    estDurationSecs?: number
    actualDurationSecs?: number | null
    frontTime?: string | null  // New field
    float?: boolean
    finalApproval?: boolean
    script?: string | null
    notes?: string | null
    categoryId?: string | null
  }

  const updateRowMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: ExtendedRowUpdateData }) => {
      const response = await fetch(`/api/rows/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      })
      if (!response.ok) throw new Error("Failed to update row")
      return response.json()
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

  // Bulletin mutations
  const deleteBulletinMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/bulletins/${id}`, {
        method: "DELETE",
        credentials: "include",
      })
      if (!response.ok) {
        throw new Error("Failed to delete bulletin")
      }
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bulletins", "byDate", selectedDate.toISOString().split("T")[0]] })
      showMessage("Bulletin deleted successfully")
      if (selectedBulletin) {
        setSelectedBulletin(null)
        setSelectedItemId(null)
        setSelectedSegmentId(null)
      }
    },
    onError: () => showMessage("Failed to delete bulletin"),
  })

  const reorderBulletinsMutation = useMutation({
    mutationFn: async (bulletinIds: string[]) => {
      const response = await fetch("/api/bulletins/reorder", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ bulletinIds }),
      })
      if (!response.ok) {
        throw new Error("Failed to reorder bulletins")
      }
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bulletins", "byDate", selectedDate.toISOString().split("T")[0]] })
      showMessage("Bulletins reordered")
    },
    onError: () => showMessage("Failed to reorder bulletins"),
  })

  const updateBulletinMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: BulletinUpdateData }) => {
      const response = await fetch(`/api/bulletins/${id}`, {
        method: "PUT",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      })
      if (!response.ok) {
        throw new Error("Failed to update bulletin")
      }
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bulletins", "byDate", selectedDate.toISOString().split("T")[0]] })
      queryClient.invalidateQueries({ queryKey: ["bulletin", selectedBulletin] })
      showMessage("Bulletin updated successfully")
      setShowEditBulletinModal(false)
      setEditingBulletin(null)
    },
    onError: () => showMessage("Failed to update bulletin"),
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
        estDurationSecs: row.estDurationSecs, // Add raw seconds for editing
        actual: row.actualDurationDisplay || (row.actualDurationSecs ? formatDuration(row.actualDurationSecs) : ""),
        front: row.frontTimeDisplay || "",
        cume: row.cumeTimeDisplay || formatDuration(row.cumeTimeSecs),
        lastModBy: row.lastModifiedByName || "SYSTEM",
        createdByName: row.createdByName || row.lastModifiedByName || "SYSTEM", // Fallback to lastModifiedBy
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
      const start = Math.min(lastSelectedIndex, currentIndex)
      const end = Math.max(lastSelectedIndex, currentIndex)
      const rangeIds = rundownItems.slice(start, end + 1).map((i) => i.id)
      
      setSelectedForDeleteIds((prev) => {
        const newSet = new Set(prev)
        rangeIds.forEach((id) => newSet.add(id))
        return newSet
      })
    } else if (e.ctrlKey || e.metaKey) {
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
      setSelectedForDeleteIds(new Set())
    } else {
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

    queryClient.invalidateQueries({ queryKey: ["bulletin", selectedBulletin] })
    queryClient.invalidateQueries({ queryKey: ["bulletin-segments", selectedBulletin] })

    setSelectedForDeleteIds(new Set())
    setLastSelectedIndex(null)
    setShowDeleteModal(false)
    setIsDeleting(false)

    if (selectedItemId && idsToDelete.includes(selectedItemId)) {
      setSelectedItemId(null)
      setSelectedSegmentId(null)
    }

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

  // ─── Final Approval Handler ─────────────────────────────────────

  const handleFinalApprDoubleClick = useCallback(
    async (item: RundownDisplayItem) => {
      const currentApproval = item.finalAppr === "✓"
      const newApproval = !currentApproval

      try {
        await updateRowMutation.mutateAsync({
          id: item.id,
          data: { finalApproval: newApproval },
        })
        showMessage(newApproval ? "Story approved ✓" : "Approval removed")
      } catch {
        showMessage("Failed to update approval")
      }
    },
    [updateRowMutation, showMessage]
  )

  // ─── Float Toggle Handler ───────────────────────────────────────

  const handleFloatDoubleClick = useCallback(
    async (item: RundownDisplayItem) => {
      const currentFloat = item.float === "F" || item.float === "✓"
      const newFloat = !currentFloat

      try {
        await updateRowMutation.mutateAsync({
          id: item.id,
          data: { float: newFloat },
        })
        showMessage(newFloat ? "Story floated (will not air)" : "Story unfloated")
      } catch {
        showMessage("Failed to update float status")
      }
    },
    [updateRowMutation, showMessage]
  )

  // ─── Other Handlers ─────────────────────────────────────────────

  const handleSelectBulletin = useCallback((id: string) => {
    setSelectedBulletin(id)
    setSelectedItemId(null)
    setSelectedSegmentId(null)
    setSelectedForDeleteIds(new Set())
    setLastSelectedIndex(null)
  }, [])

  // ─── Bulletin Edit/Delete/Reorder Handlers ──────────────────────

  const handleEditBulletin = useCallback((bulletin: Bulletin) => {
    setEditingBulletin(bulletin)
    setShowEditBulletinModal(true)
  }, [])

  const handleSaveBulletin = useCallback(async (id: string, data: BulletinUpdateData) => {
    await updateBulletinMutation.mutateAsync({ id, data })
  }, [updateBulletinMutation])

  const handleCloseEditModal = useCallback(() => {
    setShowEditBulletinModal(false)
    setEditingBulletin(null)
  }, [])

  const handleDeleteBulletin = useCallback((bulletinId: string) => {
    deleteBulletinMutation.mutate(bulletinId)
  }, [deleteBulletinMutation])

  const handleDownloadBulletin = useCallback(async (bulletinId: string) => {
    try {
      // Find the bulletin
      const bulletin = bulletins.find((b: Bulletin) => b.id === bulletinId)
      if (!bulletin) {
        alert("Bulletin not found")
        return
      }

      // Fetch bulletin rows with segments using the rows API
      const response = await fetch(`/api/bulletins/${bulletinId}`)
      const data = await response.json()
      const rows = data.data?.rows || []

      // Define row type for mapping
      interface BulletinRow {
        id: string
        pageCode?: string
        slug?: string
        segments?: Segment[]
        estDurationSecs?: number
        actualDurationSecs?: number
        lastModifiedBy?: { name?: string }
      }

      // Prepare data for RTF
      const bulletinData = {
        title: bulletin.title,
        date: bulletin.date,
        startTime: bulletin.startTime,
        status: bulletin.status,
        rows: rows.map((row: BulletinRow) => ({
          page: row.pageCode || "",
          slug: row.slug || "",
          segments: (row.segments || []).map((seg: Segment) => ({
            name: seg.name,
            description: seg.description || "",
          })),
          estDuration: formatDuration(row.estDurationSecs || 0),
          actual: row.actualDurationSecs ? formatDuration(row.actualDurationSecs) : "",
          lastModBy: row.lastModifiedBy?.name || "",
        })),
      }

      // Generate RTF
      const rtfContent = generateBulletinRtf(bulletinData)
      
      // Download
      const filename = `${bulletin.title.replace(/[^a-zA-Z0-9]/g, "_")}_${bulletin.date}.rtf`
      downloadRtf(rtfContent, filename)

    } catch (error) {
      console.error("Error downloading bulletin:", error)
      alert("Failed to download bulletin. Please try again.")
    }
  }, [bulletins])

  const handleReorderBulletins = useCallback((bulletinIds: string[]) => {
    reorderBulletinsMutation.mutate(bulletinIds)
  }, [reorderBulletinsMutation])

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
    // Don't automatically select segment - panel only opens when segment is clicked
    // setSelectedSegmentId is NOT called here
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

  // ─── EST Duration Editing Handlers ──────────────────────────────

  const handleDurationDoubleClick = useCallback((rowId: string, currentDuration: string) => {
    setEditingDurationRowId(rowId)
    setTempDurationValue(currentDuration)
  }, [])

  const parseDurationToSeconds = useCallback((duration: string): number | null => {
    // Handle formats: "1:30", "90", "1:30:00"
    const trimmed = duration.trim()
    
    // If just a number, treat as seconds
    if (/^\d+$/.test(trimmed)) {
      return parseInt(trimmed, 10)
    }
    
    // Handle M:SS or MM:SS format
    const mmssMatch = trimmed.match(/^(\d{1,2}):(\d{2})$/)
    if (mmssMatch) {
      const minutes = parseInt(mmssMatch[1], 10)
      const seconds = parseInt(mmssMatch[2], 10)
      if (seconds >= 60) return null
      return minutes * 60 + seconds
    }
    
    // Handle H:MM:SS format
    const hmmssMatch = trimmed.match(/^(\d{1,2}):(\d{2}):(\d{2})$/)
    if (hmmssMatch) {
      const hours = parseInt(hmmssMatch[1], 10)
      const minutes = parseInt(hmmssMatch[2], 10)
      const seconds = parseInt(hmmssMatch[3], 10)
      if (minutes >= 60 || seconds >= 60) return null
      return hours * 3600 + minutes * 60 + seconds
    }
    
    return null
  }, [])

  const handleDurationSave = useCallback(async () => {
    if (!editingDurationRowId) {
      setEditingDurationRowId(null)
      setTempDurationValue("")
      return
    }

    const seconds = parseDurationToSeconds(tempDurationValue)
    
    if (seconds === null || seconds < 0) {
      showMessage("Invalid duration format. Use M:SS (e.g., 1:30)")
      setEditingDurationRowId(null)
      setTempDurationValue("")
      return
    }

    try {
      await updateRowMutation.mutateAsync({
        id: editingDurationRowId,
        data: { estDurationSecs: seconds },
      })
      showMessage("Duration updated")
    } catch {
      showMessage("Failed to update duration")
    }

    setEditingDurationRowId(null)
    setTempDurationValue("")
  }, [editingDurationRowId, tempDurationValue, parseDurationToSeconds, updateRowMutation, showMessage])

  const handleDurationCancel = useCallback(() => {
    setEditingDurationRowId(null)
    setTempDurationValue("")
  }, [])

  // ─── Producer Editing Handlers ────────────────────────────────────
  // Note: storyProducerId requires a user ID, not a name. For now, we'll store in notes or skip.
  const handleProducerDoubleClick = useCallback((rowId: string, currentValue: string) => {
    setEditingProducerRowId(rowId)
    setTempProducerValue(currentValue || "")
  }, [])

  const handleProducerSave = useCallback(async () => {
    if (!editingProducerRowId) {
      setEditingProducerRowId(null)
      setTempProducerValue("")
      return
    }

    // For now, store producer name in notes field as a workaround
    // In future, implement proper user selection dropdown
    try {
      await updateRowMutation.mutateAsync({
        id: editingProducerRowId,
        data: { notes: `Producer: ${tempProducerValue.trim()}` },
      })
      showMessage("Producer updated (stored in notes)")
    } catch {
      showMessage("Failed to update producer")
    }

    setEditingProducerRowId(null)
    setTempProducerValue("")
  }, [editingProducerRowId, tempProducerValue, updateRowMutation, showMessage])

  const handleProducerCancel = useCallback(() => {
    setEditingProducerRowId(null)
    setTempProducerValue("")
  }, [])

  // ─── Actual Duration Editing Handlers ────────────────────────────────
  const handleActualDoubleClick = useCallback((rowId: string, currentValue: string) => {
    setEditingActualRowId(rowId)
    setTempActualValue(currentValue || "")
  }, [])

  const handleActualSave = useCallback(async () => {
    if (!editingActualRowId) {
      setEditingActualRowId(null)
      setTempActualValue("")
      return
    }

    const seconds = parseDurationToSeconds(tempActualValue)
    
    if (tempActualValue.trim() && seconds === null) {
      showMessage("Invalid duration format. Use M:SS (e.g., 1:30)")
      setEditingActualRowId(null)
      setTempActualValue("")
      return
    }

    try {
      await updateRowMutation.mutateAsync({
        id: editingActualRowId,
        data: { actualDurationSecs: seconds || 0 },
      })
      showMessage("Actual duration updated")
    } catch {
      showMessage("Failed to update actual duration")
    }

    setEditingActualRowId(null)
    setTempActualValue("")
  }, [editingActualRowId, tempActualValue, parseDurationToSeconds, updateRowMutation, showMessage])

  const handleActualCancel = useCallback(() => {
    setEditingActualRowId(null)
    setTempActualValue("")
  }, [])

  // ─── Front Time Editing Handlers ────────────────────────────────────
  // Note: frontTime is a calculated/display field. Store in backTime or calculate from timing.
  const handleFrontDoubleClick = useCallback((rowId: string, currentValue: string) => {
    setEditingFrontRowId(rowId)
    setTempFrontValue(currentValue || "")
  }, [])

  const handleFrontSave = useCallback(async () => {
    if (!editingFrontRowId) {
      setEditingFrontRowId(null)
      setTempFrontValue("")
      return
    }

    try {
      await updateRowMutation.mutateAsync({
        id: editingFrontRowId,
        data: { frontTime: tempFrontValue.trim() || null },
      })
      showMessage("Front time updated")
    } catch {
      showMessage("Failed to update front time")
    }

    setEditingFrontRowId(null)
    setTempFrontValue("")
  }, [editingFrontRowId, tempFrontValue, updateRowMutation, showMessage])

  const handleFrontCancel = useCallback(() => {
    setEditingFrontRowId(null)
    setTempFrontValue("")
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
    (html: string) => {
      if (!selectedSegmentId || selectedSegmentId.startsWith("temp-")) return

      setEditDescription(html)

      if (autoSaveTimeout) clearTimeout(autoSaveTimeout)
      setIsSaving(true)

      const timeout = setTimeout(async () => {
        try {
          await updateSegmentMutation.mutateAsync({
            id: selectedSegmentId,
            data: { description: html },
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
    // Only clear segment selection, keep row selected
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

            {selectedForDeleteIds.size === 0 && currentUserRole === "ADMIN" && (
              <a
                href="/trash"
                className="btn-create-bulletin"
                style={{ backgroundColor: "#95a5a6", textDecoration: "none" }}
              >
                <Trash2 size={16} />
                <span>Trash</span>
              </a>
            )}
            {selectedForDeleteIds.size === 0 && (currentUserRole === "ADMIN" || currentUserRole === "EDITOR") && (
              <>
                <button
                  className="btn-create-bulletin"
                  onClick={() => setShowCategoryModal(true)}
                  style={{ backgroundColor: "#7f8c8d" }}
                >
                  <Tags size={16} />
                  <span>Categories</span>
                </button>
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
          {/* Bulletins Sidebar - Conditionally rendered */}
          {isSidebarVisible && (
            <BulletinsSidebar
              bulletins={bulletins}
              isLoading={bulletinsLoading}
              selectedBulletinId={selectedBulletin}
              selectedDate={selectedDate}
              onSelectBulletin={handleSelectBulletin}
              onDateChange={handleDateChange}
              onEditBulletin={handleEditBulletin}
              onDeleteBulletin={handleDeleteBulletin}
              onDownloadBulletin={handleDownloadBulletin}
              onReorderBulletins={handleReorderBulletins}
              userRole={currentUserRole}
            />
          )}

          {/* Main Rundown Area */}
          <div className="rundown-scroll-wrapper" style={{ flex: 1 }}>
            <div className="rundown-header">
              {/* Sidebar Toggle Button */}
              <button
                style={styles.sidebarToggleBtn}
                onClick={() => setIsSidebarVisible(!isSidebarVisible)}
                title={isSidebarVisible ? "Hide sidebar" : "Show sidebar"}
              >
                {isSidebarVisible ? <PanelLeftClose size={18} /> : <PanelLeft size={18} />}
              </button>
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
              editingDurationRowId={editingDurationRowId}
              tempDurationValue={tempDurationValue}
              editingProducerRowId={editingProducerRowId}
              tempProducerValue={tempProducerValue}
              editingActualRowId={editingActualRowId}
              tempActualValue={tempActualValue}
              editingFrontRowId={editingFrontRowId}
              tempFrontValue={tempFrontValue}
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
              onFinalApprDoubleClick={handleFinalApprDoubleClick}
              onFloatDoubleClick={handleFloatDoubleClick}
              onDurationDoubleClick={handleDurationDoubleClick}
              onDurationChange={setTempDurationValue}
              onDurationSave={handleDurationSave}
              onDurationCancel={handleDurationCancel}
              onProducerDoubleClick={handleProducerDoubleClick}
              onProducerChange={setTempProducerValue}
              onProducerSave={handleProducerSave}
              onProducerCancel={handleProducerCancel}
              onActualDoubleClick={handleActualDoubleClick}
              onActualChange={setTempActualValue}
              onActualSave={handleActualSave}
              onActualCancel={handleActualCancel}
              onFrontDoubleClick={handleFrontDoubleClick}
              onFrontChange={setTempFrontValue}
              onFrontSave={handleFrontSave}
              onFrontCancel={handleFrontCancel}
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

          {/* Right Description Panel - Only shows when a segment is clicked */}
          {selectedItem && selectedSegment && selectedSegmentId && (
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
      
      <BulletinEditModal
        isOpen={showEditBulletinModal}
        bulletin={editingBulletin}
        onClose={handleCloseEditModal}
        onSave={handleSaveBulletin}
        isSaving={updateBulletinMutation.isPending}
      />

      <CategoryModal
        isOpen={showCategoryModal}
        onClose={() => setShowCategoryModal(false)}
      />
      
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

// ─── Styles ─────────────────────────────────────────────────────

const styles: Record<string, React.CSSProperties> = {
  sidebarToggleBtn: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: "32px",
    height: "32px",
    backgroundColor: "transparent",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "#4a5568",
    borderRadius: "6px",
    color: "#95a5a6",
    cursor: "pointer",
    marginRight: "12px",
    transition: "all 0.2s",
    flexShrink: 0,
  },
  deleteSelectionBar: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    backgroundColor: "rgba(231, 76, 60, 0.1)",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "rgba(231, 76, 60, 0.3)",
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
    backgroundColor: "#e74c3c",
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
    backgroundColor: "transparent",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "rgba(255, 255, 255, 0.2)",
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
    backgroundColor: "#e74c3c",
    color: "white",
    borderWidth: 0,
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
    backgroundColor: "transparent",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "rgba(255, 255, 255, 0.2)",
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