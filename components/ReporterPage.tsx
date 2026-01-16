"use client"

import { useEffect, useState, useMemo, useCallback } from "react"
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query"
import { Plus, Zap } from "lucide-react"
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

export default function ReporterPage() {
  const queryClient = useQueryClient()

  // ─── Selection State ────────────────────────────────────────────
  const [selectedBulletin, setSelectedBulletin] = useState<string | null>(null)
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null)
  const [selectedSegmentId, setSelectedSegmentId] = useState<string | null>(null)

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

  // ─── Helpers ────────────────────────────────────────────────────

  const showMessage = useCallback((msg: string) => {
    setSaveMessage(msg)
    setTimeout(() => setSaveMessage(""), 3000)
  }, [])

  // ─── Handlers ───────────────────────────────────────────────────

  const handleSelectBulletin = useCallback((id: string) => {
    setSelectedBulletin(id)
    setSelectedItemId(null)
    setSelectedSegmentId(null)
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

  // Slug editing
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

  // Segment editing
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

  // Description panel
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

  // ─── Render ─────────────────────────────────────────────────────

  const bulletinHeader = currentBulletin
    ? `${currentBulletin.title} [${new Date(currentBulletin.airDate).toLocaleDateString()} ${currentBulletin.startTime}]`
    : "Select a bulletin"

  return (
    <>
      <Navbar />
      <div className="enps-fullscreen">
        {/* Top Header */}
        <div className="top-header">
          <div className="title">AP ENPS - Newsroom</div>
          <div className="header-actions">
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
              {reorderRowsMutation.isPending && <span className="reorder-indicator">Saving order...</span>}
            </div>

            <RundownTable
              items={rundownItems}
              isLoading={rowsLoading}
              selectedItemId={selectedItemId}
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

      <BulletinCreateModal isOpen={showBulletinModal} onClose={() => setShowBulletinModal(false)} />
    </>
  )
}