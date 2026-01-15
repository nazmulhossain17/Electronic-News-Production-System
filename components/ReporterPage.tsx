"use client"

import { useEffect, useState, useMemo, useRef } from "react"
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query"
import { Plus, Zap, Trash2 } from "lucide-react"

import api, { Bulletin, RundownRow, Category, Segment } from "@/lib/api-client"
import Navbar from "./Navbar"
import BulletinCreateModal from "./BulletinCreateModal"

// ────────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────────

type SegmentType = Segment["type"]

interface RundownDisplayItem {
  id: string
  page: string
  slug: string
  segments: Segment[]
  storyProduc: string
  finalAppr: string
  float: string
  estDuration: string
  actual: string
  front: string
  cume: string
  lastModBy: string
  categoryId: string
  status: string
  script?: string
  notes?: string
  rowType: string
}

// ────────────────────────────────────────────────────────────────
// Helper Functions
// ────────────────────────────────────────────────────────────────

function formatDuration(secs: number): string {
  if (!secs) return "0:00"
  const mins = Math.floor(secs / 60)
  const seconds = Math.floor(secs % 60)
  return `${mins}:${seconds.toString().padStart(2, "0")}`
}

function getSegmentClass(seg: string) {
  const s = seg.toUpperCase()
  if (s === "LIVE") return "segment-live"
  if (s === "SOT" || s === "VOSOT") return "segment-sot"
  if (s === "PKG") return "segment-pkg"
  if (s.includes("IV") || s === "INTRO") return "segment-iv"
  if (s === "VO") return "segment-vo"
  if (s === "READER") return "segment-reader"
  if (s === "GRAPHIC") return "segment-graphic"
  if (s === "WEATHER") return "segment-weather"
  if (s === "SPORTS") return "segment-sports"
  if (s === "PHONER") return "segment-phoner"
  return ""
}

function getBulletinStatusClass(status: string) {
  return `status-${status.toLowerCase().replace("_", "-")}`
}

// Helper to create a placeholder segment
function createPlaceholderSegment(rowId: string, name: string, description: string = ""): Segment {
  const validTypes: SegmentType[] = ["LIVE", "PKG", "VO", "VOSOT", "SOT", "READER", "GRAPHIC", "VT", "IV", "PHONER", "WEATHER", "SPORTS"]
  const upperName = name.toUpperCase()
  const segmentType: SegmentType = validTypes.includes(upperName as SegmentType) 
    ? (upperName as SegmentType) 
    : "LIVE"

  return {
    id: `temp-${rowId}`,
    rowId,
    name: upperName || "LIVE",
    type: segmentType,
    description,
    estDurationSecs: 0,
    sortOrder: 0,
    createdAt: "",
    updatedAt: "",
  }
}

// ────────────────────────────────────────────────────────────────
// Main Component
// ────────────────────────────────────────────────────────────────

const ReporterPage: React.FC = () => {
  const queryClient = useQueryClient()
  
  // Selection state
  const [selectedBulletin, setSelectedBulletin] = useState<string | null>(null)
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null)
  const [selectedSegmentId, setSelectedSegmentId] = useState<string | null>(null)
  
  // Edit state
  const [editDescription, setEditDescription] = useState("")
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>()
  
  // UI state
  const [isSaving, setIsSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState("")
  const [autoSaveTimeout, setAutoSaveTimeout] = useState<NodeJS.Timeout | null>(null)
  const [showBulletinModal, setShowBulletinModal] = useState(false)

  // Inline segment editing
  const [editingSegmentId, setEditingSegmentId] = useState<string | null>(null)
  const [tempSegmentValue, setTempSegmentValue] = useState("")
  const [addingSegmentForRowId, setAddingSegmentForRowId] = useState<string | null>(null)
  const segmentInputRef = useRef<HTMLInputElement>(null)

  // Inline slug editing
  const [editingSlugRowId, setEditingSlugRowId] = useState<string | null>(null)
  const [tempSlugValue, setTempSlugValue] = useState("")
  const slugInputRef = useRef<HTMLInputElement>(null)

  // ─── Queries ─────────────────────────────────────────────────────

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

  // Fetch segments for all rows
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
              createPlaceholderSegment(row.id, row.segment || "LIVE", row.notes || "")
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

  // ─── Mutations ───────────────────────────────────────────────────

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

  // ─── Convert rows to display items ──────────────────────────────

  const rundownItems = useMemo<RundownDisplayItem[]>(() => {
    return rows.map((row, index) => {
      const segments = segmentsByRow[row.id] || []
      
      const displaySegments: Segment[] = segments.length > 0 
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
      }
    })
  }, [rows, segmentsByRow])

  const selectedItem = rundownItems.find((item) => item.id === selectedItemId)
  const selectedSegment = selectedItem?.segments.find((s) => s.id === selectedSegmentId)

  // ─── Auto-select effects ─────────────────────────────────────────

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
    if ((editingSegmentId || addingSegmentForRowId) && segmentInputRef.current) {
      segmentInputRef.current.focus()
    }
  }, [editingSegmentId, addingSegmentForRowId])

  // Focus slug input when editing
  useEffect(() => {
    if (editingSlugRowId && slugInputRef.current) {
      slugInputRef.current.focus()
      slugInputRef.current.select()
    }
  }, [editingSlugRowId])

  // ─── Helper Functions ──────────────────────────────────────────

  const showMessage = (msg: string) => {
    setSaveMessage(msg)
    setTimeout(() => setSaveMessage(""), 3000)
  }

  // ─── Handlers ───────────────────────────────────────────────────

  const handleSegmentClick = (itemId: string, segment: Segment) => {
    setSelectedItemId(itemId)
    setSelectedSegmentId(segment.id)
  }

  const handleDescriptionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
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
  }

  const handleManualSave = async () => {
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
  }

  const handleCategoryChange = async (categoryId: string) => {
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
  }

  const addNewStory = () => {
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
  }

  // ─── Inline Segment Editing ─────────────────────────────────────

  const startSegmentEdit = (segment: Segment) => {
    if (segment.id.startsWith("temp-")) return
    setEditingSegmentId(segment.id)
    setTempSegmentValue(segment.name)
  }

  const startAddingSegment = (rowId: string) => {
    setAddingSegmentForRowId(rowId)
    setTempSegmentValue("")
  }

  const saveSegmentEdit = async () => {
    if (!editingSegmentId || !tempSegmentValue.trim()) {
      cancelSegmentEdit()
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

    cancelSegmentEdit()
  }

  const saveNewSegment = async (rowId: string) => {
    if (!tempSegmentValue.trim()) {
      cancelSegmentEdit()
      return
    }

    createSegmentMutation.mutate({
      rowId,
      data: { 
        name: tempSegmentValue.toUpperCase(),
        description: ""
      },
    })

    cancelSegmentEdit()
  }

  const deleteSegment = (segment: Segment) => {
    if (segment.id.startsWith("temp-")) return
    deleteSegmentMutation.mutate(segment.id)
  }

  const cancelSegmentEdit = () => {
    setEditingSegmentId(null)
    setAddingSegmentForRowId(null)
    setTempSegmentValue("")
  }

  // ─── Inline Slug Editing ────────────────────────────────────────

  const startSlugEdit = (rowId: string, currentSlug: string) => {
    setEditingSlugRowId(rowId)
    setTempSlugValue(currentSlug)
  }

  const saveSlugEdit = async () => {
    if (!editingSlugRowId) {
      cancelSlugEdit()
      return
    }

    const trimmedSlug = tempSlugValue.trim()
    if (!trimmedSlug) {
      showMessage("Slug cannot be empty")
      cancelSlugEdit()
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

    cancelSlugEdit()
  }

  const cancelSlugEdit = () => {
    setEditingSlugRowId(null)
    setTempSlugValue("")
  }

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
            <button
              className="btn-create-bulletin"
              onClick={() => setShowBulletinModal(true)}
            >
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
          <div className="bulletins-panel">
            <div className="panel-header">Today&apos;s Bulletins</div>
            <div className="bulletins-list">
              {bulletinsLoading ? (
                <div className="empty-bulletins">Loading...</div>
              ) : bulletins.length === 0 ? (
                <div className="empty-bulletins">No bulletins for today</div>
              ) : (
                bulletins.map((b: Bulletin) => (
                  <div
                    key={b.id}
                    className={`bulletin-item ${selectedBulletin === b.id ? "active" : ""}`}
                    onClick={() => {
                      setSelectedBulletin(b.id)
                      setSelectedItemId(null)
                      setSelectedSegmentId(null)
                    }}
                  >
                    <div className="bulletin-title">{b.title}</div>
                    <div className="bulletin-meta">
                      <span className="bulletin-time">{b.startTime}</span>
                      <span className={`bulletin-status ${getBulletinStatusClass(b.status)}`}>
                        {b.status}
                      </span>
                    </div>
                    <div className="bulletin-stats">
                      {b.storyCount || 0} stories • {b.progress || 0}% ready
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Main Rundown Area */}
          <div className="rundown-scroll-wrapper">
            <div className="rundown-header">
              <div className="rundown-title">{bulletinHeader}</div>
            </div>

            <div className="table-container">
              <table className="enps-rundown-table">
                <thead>
                  <tr>
                    <th>Pg</th>
                    <th>Story Slug</th>
                    <th>Segments</th>
                    <th>Story Produc</th>
                    <th>Final Appr</th>
                    <th>Float</th>
                    <th>Est Duration</th>
                    <th>Actual</th>
                    <th>Front</th>
                    <th>Cume</th>
                    <th>Last Mod By</th>
                  </tr>
                </thead>
                <tbody>
                  {rowsLoading ? (
                    <tr>
                      <td colSpan={11} className="empty-row">Loading stories...</td>
                    </tr>
                  ) : rundownItems.length === 0 ? (
                    <tr>
                      <td colSpan={11} className="empty-row">No stories in this bulletin yet</td>
                    </tr>
                  ) : (
                    rundownItems.map((item) => (
                      <tr
                        key={item.id}
                        className={`rundown-row ${selectedItemId === item.id ? "selected" : ""} ${
                          item.finalAppr ? "approved" : ""
                        }`}
                        onClick={() => {
                          setSelectedItemId(item.id)
                          if (item.segments.length > 0) {
                            setSelectedSegmentId(item.segments[0].id)
                          }
                        }}
                      >
                        <td className="pg">{item.page}</td>
                        
                        {/* Editable Slug Cell */}
                        <td 
                          className="slug"
                          onDoubleClick={(e) => {
                            e.stopPropagation()
                            startSlugEdit(item.id, item.slug)
                          }}
                          title="Double-click to edit"
                        >
                          {editingSlugRowId === item.id ? (
                            <input
                              ref={slugInputRef}
                              type="text"
                              value={tempSlugValue}
                              onChange={(e) => setTempSlugValue(e.target.value.toUpperCase())}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  e.preventDefault()
                                  saveSlugEdit()
                                } else if (e.key === "Escape") {
                                  cancelSlugEdit()
                                }
                              }}
                              onBlur={saveSlugEdit}
                              className="slug-edit-input"
                              onClick={(e) => e.stopPropagation()}
                            />
                          ) : (
                            <span className="slug-text">{item.slug || "(empty)"}</span>
                          )}
                        </td>

                        {/* Multiple Segments */}
                        <td className="segment-cell">
                          <div className="segments-container">
                            {item.segments.map((seg) => (
                              <div key={seg.id} className="segment-item">
                                {editingSegmentId === seg.id ? (
                                  <input
                                    ref={segmentInputRef}
                                    type="text"
                                    value={tempSegmentValue}
                                    onChange={(e) => setTempSegmentValue(e.target.value.toUpperCase())}
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter") {
                                        e.preventDefault()
                                        saveSegmentEdit()
                                      } else if (e.key === "Escape") {
                                        cancelSegmentEdit()
                                      }
                                    }}
                                    onBlur={saveSegmentEdit}
                                    className="segment-edit-input"
                                    maxLength={12}
                                  />
                                ) : (
                                  <>
                                    <span
                                      className={`segment-tag ${getSegmentClass(seg.name)} ${
                                        selectedSegmentId === seg.id ? "segment-active" : ""
                                      }`}
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        handleSegmentClick(item.id, seg)
                                      }}
                                      onDoubleClick={(e) => {
                                        e.stopPropagation()
                                        startSegmentEdit(seg)
                                      }}
                                      title={seg.description || "Double-click to edit name"}
                                    >
                                      {seg.name}
                                      {seg.description && (
                                        <span className="segment-has-desc">•</span>
                                      )}
                                    </span>
                                    {item.segments.length > 1 && !seg.id.startsWith("temp-") && (
                                      <button
                                        className="segment-delete-btn"
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          deleteSegment(seg)
                                        }}
                                        title="Delete segment"
                                      >
                                        ×
                                      </button>
                                    )}
                                  </>
                                )}
                              </div>
                            ))}

                            {/* Add New Segment Input */}
                            {addingSegmentForRowId === item.id ? (
                              <div className="segment-item">
                                <input
                                  ref={segmentInputRef}
                                  type="text"
                                  value={tempSegmentValue}
                                  onChange={(e) => setTempSegmentValue(e.target.value.toUpperCase())}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                      e.preventDefault()
                                      saveNewSegment(item.id)
                                    } else if (e.key === "Escape") {
                                      cancelSegmentEdit()
                                    }
                                  }}
                                  onBlur={() => saveNewSegment(item.id)}
                                  className="segment-edit-input"
                                  maxLength={12}
                                  placeholder="TYPE..."
                                />
                              </div>
                            ) : (
                              <button
                                className="segment-add-btn"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  startAddingSegment(item.id)
                                }}
                                title="Add segment"
                              >
                                +
                              </button>
                            )}
                          </div>
                        </td>

                        <td className="story-produc">{item.storyProduc}</td>
                        <td className="approved">{item.finalAppr}</td>
                        <td className="float">{item.float}</td>
                        <td className="duration">{item.estDuration}</td>
                        <td className="duration">{item.actual}</td>
                        <td className="front">{item.front}</td>
                        <td className="cume">{item.cume}</td>
                        <td className="mod-by">{item.lastModBy}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

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
            <div className="description-panel">
              <div className="panel-header">
                <div className="panel-title">
                  {selectedItem.slug} - {selectedSegment.name}
                </div>
                <button className="close-btn" onClick={() => {
                  setSelectedItemId(null)
                  setSelectedSegmentId(null)
                }}>
                  ×
                </button>
              </div>

              <div className="panel-content">
                {/* Save Status */}
                {saveMessage && (
                  <div className={`save-message ${isSaving ? "saving" : "saved"}`}>
                    {isSaving ? "Saving..." : saveMessage}
                  </div>
                )}

                {/* Segment Selector */}
                <div className="field">
                  <label>Select Segment</label>
                  <div className="segment-selector">
                    {selectedItem.segments.map((seg) => (
                      <button
                        key={seg.id}
                        className={`segment-selector-btn ${
                          selectedSegmentId === seg.id ? "active" : ""
                        } ${getSegmentClass(seg.name)}`}
                        onClick={() => setSelectedSegmentId(seg.id)}
                      >
                        {seg.name}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Category */}
                <div className="field">
                  <label>Category</label>
                  <select
                    value={selectedCategoryId || ""}
                    onChange={(e) => handleCategoryChange(e.target.value)}
                  >
                    <option value="">Select category...</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Segment Description */}
                <div className="field">
                  <label>
                    Segment Description
                    {isSaving && <span className="saving-indicator">●</span>}
                  </label>
                  <textarea
                    value={editDescription}
                    onChange={handleDescriptionChange}
                    rows={12}
                    placeholder={`Enter description for ${selectedSegment.name} segment...`}
                    className="description-textarea"
                    disabled={selectedSegmentId?.startsWith("temp-")}
                  />
                  {selectedSegmentId?.startsWith("temp-") && (
                    <p style={{ fontSize: "11px", color: "#f39c12", marginTop: "4px" }}>
                      ⚠️ Add a real segment first to enable description editing
                    </p>
                  )}
                </div>

                {/* Delete Segment Button */}
                {!selectedSegmentId?.startsWith("temp-") && selectedItem.segments.length > 1 && (
                  <div className="field">
                    <button
                      className="btn cancel"
                      style={{ background: "#e74c3c", color: "white" }}
                      onClick={() => deleteSegment(selectedSegment)}
                      disabled={deleteSegmentMutation.isPending}
                    >
                      <Trash2 size={14} style={{ marginRight: "6px" }} />
                      Delete This Segment
                    </button>
                  </div>
                )}

                {/* Actions */}
                <div className="actions">
                  <button 
                    className="btn save" 
                    onClick={handleManualSave} 
                    disabled={isSaving || selectedSegmentId?.startsWith("temp-")}
                  >
                    {isSaving ? "SAVING..." : "SAVE NOW"}
                  </button>
                  <button 
                    className="btn cancel" 
                    onClick={() => {
                      setSelectedItemId(null)
                      setSelectedSegmentId(null)
                    }}
                  >
                    CLOSE
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bulletin Create Modal */}
      <BulletinCreateModal 
        isOpen={showBulletinModal} 
        onClose={() => setShowBulletinModal(false)} 
      />
    </>
  )
}

export default ReporterPage