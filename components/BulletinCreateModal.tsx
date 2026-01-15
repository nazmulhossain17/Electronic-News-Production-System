// ============================================================================
// File: components/BulletinCreateModal.tsx
// Description: Modal for creating new bulletins with API integration
// ============================================================================

"use client"

import { useState, useEffect } from "react"
import { X, Calendar, Clock, Plus } from "lucide-react"
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query"
import api from "@/lib/api-client"

interface BulletinCreateModalProps {
  isOpen: boolean
  onClose: () => void
}

interface Template {
  id: string
  name: string
  duration: number
}

// Preset bulletin templates for quick creation
const PRESET_BULLETINS = [
  { name: "6AM Morning News", time: "06:00", duration: 30 },
  { name: "7AM Bulletin", time: "07:00", duration: 30 },
  { name: "8AM Bulletin", time: "08:00", duration: 30 },
  { name: "9AM Bulletin", time: "09:00", duration: 30 },
  { name: "11AM Bulletin", time: "11:00", duration: 30 },
  { name: "12PM Midday News", time: "12:00", duration: 30 },
  { name: "1PM Bulletin", time: "13:00", duration: 30 },
  { name: "3PM Bulletin", time: "15:00", duration: 30 },
  { name: "5PM Evening News", time: "17:00", duration: 45 },
  { name: "7PM Prime Time", time: "19:00", duration: 60 },
  { name: "9PM Bulletin", time: "21:00", duration: 30 },
  { name: "10PM Night News", time: "22:00", duration: 30 },
  { name: "11PM Late Bulletin", time: "23:00", duration: 30 },
]

const BulletinCreateModal: React.FC<BulletinCreateModalProps> = ({ isOpen, onClose }) => {
  const queryClient = useQueryClient()
  const [error, setError] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    program: "",
    startDate: new Date().toISOString().split("T")[0],
    startTime: "19:00",
    endDate: new Date().toISOString().split("T")[0],
    endTime: "19:30",
    duration: "30:00",
    durationBased: true,
    templateId: "",
    generateTemplate: true,
  })

  const [options, setOptions] = useState({
    allowExternalModification: false,
    approvedScriptsOnly: false,
    continuousContent: false,
    continuousContentInterval: false,
    duplicateSlugOptions: false,
    addMOSDurations: false,
    mosStatus: false,
    lastStatusMOS: false,
    mosStatusTime: false,
    nameDropperFile: false,
    ndLogoEachLine: false,
    onAir: false,
    overwriteStoryFields: false,
    publishingDays: false,
    publishingActive: false,
  })

  // Fetch templates from API
  const { data: templatesData } = useQuery({
    queryKey: ["bulletin-templates"],
    queryFn: () => api.templates.list(),
    enabled: isOpen,
  })

  const templates = templatesData?.templates || []

  // Create bulletin mutation
  const createBulletinMutation = useMutation({
    mutationFn: async (data: {
      title: string
      airDate: string
      startTime: string
      endTime?: string
      plannedDurationSecs: number
      generateTemplate: boolean
      notes?: string
    }) => {
      return api.bulletins.create(data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bulletins"] })
      onClose()
      resetForm()
      setError(null)
    },
    onError: (err: Error) => {
      setError(err.message || "Failed to create bulletin")
    },
  })

  const resetForm = () => {
    setFormData({
      program: "",
      startDate: new Date().toISOString().split("T")[0],
      startTime: "19:00",
      endDate: new Date().toISOString().split("T")[0],
      endTime: "19:30",
      duration: "30:00",
      durationBased: true,
      templateId: "",
      generateTemplate: true,
    })
    setOptions({
      allowExternalModification: false,
      approvedScriptsOnly: false,
      continuousContent: false,
      continuousContentInterval: false,
      duplicateSlugOptions: false,
      addMOSDurations: false,
      mosStatus: false,
      lastStatusMOS: false,
      mosStatusTime: false,
      nameDropperFile: false,
      ndLogoEachLine: false,
      onAir: false,
      overwriteStoryFields: false,
      publishingDays: false,
      publishingActive: false,
    })
    setError(null)
  }

  // Parse duration string "MM:SS" to seconds
  const parseDuration = (durationStr: string): number => {
    const parts = durationStr.split(":")
    if (parts.length === 2) {
      const mins = parseInt(parts[0], 10) || 0
      const secs = parseInt(parts[1], 10) || 0
      return mins * 60 + secs
    }
    return parseInt(durationStr, 10) * 60 || 1800
  }

  // Format seconds to "MM:SS"
  const formatDuration = (secs: number): string => {
    const mins = Math.floor(secs / 60)
    const seconds = secs % 60
    return `${mins}:${seconds.toString().padStart(2, "0")}`
  }

  const handleSubmit = () => {
    if (!formData.program.trim()) {
      setError("Please enter a program name")
      return
    }

    const plannedDurationSecs = parseDuration(formData.duration)

    const bulletinData = {
      title: formData.program,
      airDate: formData.startDate,
      startTime: formData.startTime,
      endTime: formData.endTime,
      plannedDurationSecs,
      generateTemplate: formData.generateTemplate,
      notes: JSON.stringify({ options, durationBased: formData.durationBased }),
    }

    createBulletinMutation.mutate(bulletinData)
  }

  // Calculate duration based on times
  const calculateDuration = () => {
    if (!formData.durationBased && formData.startTime && formData.endTime) {
      const startParts = formData.startTime.split(":").map(Number)
      const endParts = formData.endTime.split(":").map(Number)

      const startMins = startParts[0] * 60 + startParts[1]
      const endMins = endParts[0] * 60 + endParts[1]

      let diffMins = endMins - startMins
      if (diffMins < 0) diffMins += 24 * 60

      setFormData((prev) => ({
        ...prev,
        duration: formatDuration(diffMins * 60),
      }))
    }
  }

  // Calculate end time based on start and duration
  const calculateEndTime = () => {
    if (formData.durationBased && formData.startTime && formData.duration) {
      const startParts = formData.startTime.split(":").map(Number)
      const durationSecs = parseDuration(formData.duration)

      const startMins = startParts[0] * 60 + startParts[1]
      const endMins = startMins + Math.floor(durationSecs / 60)

      const endHours = Math.floor(endMins / 60) % 24
      const endMinutes = endMins % 60

      setFormData((prev) => ({
        ...prev,
        endTime: `${endHours.toString().padStart(2, "0")}:${endMinutes.toString().padStart(2, "0")}`,
      }))
    }
  }

  // Update end time when duration changes
  useEffect(() => {
    if (formData.durationBased) {
      calculateEndTime()
    }
  }, [formData.startTime, formData.duration, formData.durationBased])

  // Select a preset bulletin
  const selectPreset = (preset: (typeof PRESET_BULLETINS)[0]) => {
    const durationSecs = preset.duration * 60
    const startParts = preset.time.split(":").map(Number)
    const endMins = startParts[0] * 60 + startParts[1] + preset.duration
    const endHours = Math.floor(endMins / 60) % 24
    const endMinutes = endMins % 60

    setFormData((prev) => ({
      ...prev,
      program: preset.name,
      startTime: preset.time,
      endTime: `${endHours.toString().padStart(2, "0")}:${endMinutes.toString().padStart(2, "0")}`,
      duration: formatDuration(durationSecs),
    }))
  }

  if (!isOpen) return null

  return (
    <div className="bulletin-modal-overlay" onClick={onClose}>
      <div className="bulletin-modal-dialog" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="bulletin-modal-header">
          <div className="bulletin-modal-title">
            <Plus size={18} />
            Create Bulletin/Rundown
          </div>
          <button className="bulletin-modal-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="bulletin-modal-body">
          {/* Error Message */}
          {error && (
            <div
              style={{
                padding: "8px 12px",
                background: "#ffebee",
                color: "#c62828",
                fontSize: "11px",
                border: "1px solid #ef9a9a",
                marginBottom: "8px",
              }}
            >
              {error}
            </div>
          )}

          {/* Left Section - Main Form */}
          <div className="bulletin-modal-left">
            <div className="bulletin-form-section">
              <div className="bulletin-form-group">
                <label>Program</label>
                <input
                  type="text"
                  value={formData.program}
                  onChange={(e) => setFormData({ ...formData, program: e.target.value })}
                  placeholder="Enter bulletin name (e.g., 11PM BULLETIN)"
                />
              </div>

              <div className="bulletin-form-row">
                <div className="bulletin-form-group">
                  <label>
                    <Calendar size={14} />
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => {
                      setFormData({ ...formData, startDate: e.target.value, endDate: e.target.value })
                    }}
                  />
                </div>

                <div className="bulletin-form-group">
                  <label>
                    <Clock size={14} />
                    Start Time
                  </label>
                  <input
                    type="time"
                    value={formData.startTime}
                    onChange={(e) => {
                      setFormData({ ...formData, startTime: e.target.value })
                    }}
                  />
                </div>
              </div>

              <div className="bulletin-form-row">
                <div className="bulletin-form-group">
                  <label>
                    <Calendar size={14} />
                    End Date
                  </label>
                  <input
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => {
                      setFormData({ ...formData, endDate: e.target.value })
                      if (!formData.durationBased) calculateDuration()
                    }}
                  />
                </div>

                <div className="bulletin-form-group">
                  <label>
                    <Clock size={14} />
                    End Time
                  </label>
                  <input
                    type="time"
                    value={formData.endTime}
                    onChange={(e) => {
                      setFormData({ ...formData, endTime: e.target.value })
                      if (!formData.durationBased) calculateDuration()
                    }}
                    disabled={formData.durationBased}
                  />
                </div>
              </div>

              <div className="bulletin-form-group">
                <label>Duration (MM:SS)</label>
                <input
                  type="text"
                  value={formData.duration}
                  onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                  placeholder="30:00"
                  disabled={!formData.durationBased}
                />
              </div>

              <div className="bulletin-checkbox-group">
                <label className="bulletin-checkbox-label">
                  <input
                    type="checkbox"
                    checked={formData.durationBased}
                    onChange={(e) => {
                      setFormData({ ...formData, durationBased: e.target.checked })
                      if (!e.target.checked) calculateDuration()
                    }}
                  />
                  <span>Duration based</span>
                </label>
                <label className="bulletin-checkbox-label">
                  <input
                    type="checkbox"
                    checked={formData.generateTemplate}
                    onChange={(e) => setFormData({ ...formData, generateTemplate: e.target.checked })}
                  />
                  <span>Generate rundown template</span>
                </label>
              </div>
            </div>

            {/* Bulletin Template Dropdown */}
            <div className="bulletin-form-section">
              <div className="bulletin-section-title">Quick Select Bulletin</div>
              <div className="bulletin-form-group">
                <label>Template:</label>
                <select
                  value={formData.templateId}
                  onChange={(e) => setFormData({ ...formData, templateId: e.target.value })}
                  className="bulletin-template-select"
                >
                  <option value="">Blank Script</option>
                  {templates.map((template: Template) => (
                    <option key={template.id} value={template.id}>
                      {template.name} ({Math.floor(template.duration / 60)} min)
                    </option>
                  ))}
                </select>
              </div>

              {/* Predefined Bulletins List */}
              <div className="bulletin-list-box">
                <div className="bulletin-list-title">Available Presets:</div>
                {PRESET_BULLETINS.map((preset, index) => (
                  <div
                    key={index}
                    className={`bulletin-list-item ${formData.program === preset.name ? "selected" : ""}`}
                    onClick={() => selectPreset(preset)}
                  >
                    {preset.time} - {preset.name} ({preset.duration} min)
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Section - Options */}
          <div className="bulletin-modal-right">
            <div className="bulletin-options-container">
              <div className="bulletin-options-title">Bulletin Options</div>
              <div className="bulletin-options-list">
                {Object.entries(options).map(([key, value]) => (
                  <label key={key} className="bulletin-option-item">
                    <input
                      type="checkbox"
                      checked={value}
                      onChange={(e) => setOptions({ ...options, [key]: e.target.checked })}
                    />
                    <span>{key.replace(/([A-Z])/g, " $1").replace(/^./, (str) => str.toUpperCase())}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Footer Buttons */}
        <div className="bulletin-modal-footer">
          <button
            className="bulletin-btn bulletin-btn-primary"
            onClick={handleSubmit}
            disabled={createBulletinMutation.isPending}
          >
            {createBulletinMutation.isPending ? "Creating..." : "Go"}
          </button>
          <button
            className="bulletin-btn bulletin-btn-secondary"
            onClick={onClose}
            disabled={createBulletinMutation.isPending}
          >
            Cancel
          </button>
          <button
            className="bulletin-btn bulletin-btn-secondary"
            onClick={resetForm}
            disabled={createBulletinMutation.isPending}
          >
            Reset
          </button>
        </div>
      </div>
    </div>
  )
}

export default BulletinCreateModal