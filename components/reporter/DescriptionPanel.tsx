// ============================================================================
// File: components/reporter/DescriptionPanel.tsx
// Description: Right panel showing segment details, history, and description
//              with collapsible history and expandable panel
// ============================================================================

"use client"

import { useState } from "react"
import { X, Trash2, Save, User, Clock, Edit3, ChevronDown, ChevronUp, Maximize2, Minimize2, Download } from "lucide-react"
import { Segment } from "@/lib/api-client"
import { RundownDisplayItem } from "@/types/reporter"
import RichTextEditor from "./RichTextEditor"

interface Category {
  id: string
  name: string
  color?: string
}

interface DescriptionPanelProps {
  selectedItem: RundownDisplayItem
  selectedSegment: Segment
  selectedSegmentId: string | null
  categories: Category[]
  selectedCategoryId?: string
  editDescription: string
  isSaving: boolean
  saveMessage: string
  isDeletePending: boolean
  onClose: () => void
  onSegmentSelect: (segmentId: string) => void
  onCategoryChange: (categoryId: string) => void
  onDescriptionChange: (html: string) => void
  onManualSave: () => void
  onDeleteSegment: (segment: Segment) => void
}

export default function DescriptionPanel({
  selectedItem,
  selectedSegment,
  selectedSegmentId,
  categories,
  selectedCategoryId,
  editDescription,
  isSaving,
  saveMessage,
  isDeletePending,
  onClose,
  onSegmentSelect,
  onCategoryChange,
  onDescriptionChange,
  onManualSave,
  onDeleteSegment,
}: DescriptionPanelProps) {
  const isPlaceholder = selectedSegmentId?.startsWith("temp-")
  const [showHistory, setShowHistory] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)

  const panelWidth = isExpanded ? "70vw" : "320px"

  // Function to download PDF with Unicode/Bangla support
  const handleDownloadPDF = async () => {
    try {
      // Strip HTML tags for plain text, but preserve line breaks
      const plainDescription = editDescription
        .replace(/<br\s*\/?>/gi, "\n")
        .replace(/<\/p>/gi, "\n\n")
        .replace(/<\/li>/gi, "\n")
        .replace(/<li>/gi, "• ")
        .replace(/<[^>]+>/g, "")
        .trim()

      // Create HTML content for printing to PDF
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Bengali:wght@400;600;700&display=swap');
            
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            
            body {
              font-family: 'Noto Sans Bengali', 'Segoe UI', Arial, sans-serif;
              padding: 40px;
              color: #2c3e50;
              line-height: 1.6;
            }
            
            .header {
              border-bottom: 3px solid #3498db;
              padding-bottom: 20px;
              margin-bottom: 25px;
            }
            
            .title {
              font-size: 28px;
              font-weight: 700;
              color: #2c3e50;
              margin-bottom: 10px;
            }
            
            .metadata {
              font-size: 12px;
              color: #666;
            }
            
            .metadata span {
              margin-right: 20px;
            }
            
            .section-title {
              font-size: 14px;
              font-weight: 600;
              color: #3498db;
              text-transform: uppercase;
              margin-bottom: 15px;
              letter-spacing: 1px;
            }
            
            .description {
              font-size: 14px;
              line-height: 1.8;
              white-space: pre-wrap;
              color: #2c3e50;
            }
            
            .footer {
              margin-top: 40px;
              padding-top: 20px;
              border-top: 1px solid #eee;
              font-size: 10px;
              color: #999;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="title">${selectedItem.slug || "Untitled"}</div>
            <div class="metadata">
              <span><strong>Page:</strong> ${selectedItem.page}</span>
              <span><strong>Segment:</strong> ${selectedSegment.name}</span>
              <span><strong>Duration:</strong> ${selectedItem.estDuration}</span>
            </div>
          </div>
          
          <div class="section-title">Segment Description</div>
          <div class="description">${plainDescription || "No description available."}</div>
          
          <div class="footer">
            <p>Generated on: ${new Date().toLocaleString()}</p>
            <p>AP ENPS Newsroom System</p>
          </div>
        </body>
        </html>
      `

      // Create a new window for printing
      const printWindow = window.open('', '_blank', 'width=800,height=600')
      
      if (!printWindow) {
        alert("Please allow popups to download PDF")
        return
      }

      printWindow.document.write(htmlContent)
      printWindow.document.close()

      // Wait for fonts to load
      setTimeout(() => {
        printWindow.print()
        printWindow.close()
      }, 500)
      
    } catch (error) {
      console.error("Error generating PDF:", error)
      alert("Failed to generate PDF. Please try again.")
    }
  }

  return (
    <div style={{ ...styles.panel, width: panelWidth }}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerTitle}>
          <span style={styles.pageCode}>{selectedItem.page}</span>
          <span style={styles.slug}>{selectedItem.slug}</span>
          <span style={styles.segmentName}>- {selectedSegment.name}</span>
        </div>
        <div style={styles.headerActions}>
          <button
            style={styles.actionBtn}
            onClick={handleDownloadPDF}
            title="Download as PDF"
          >
            <Download size={16} />
          </button>
          <button
            style={styles.actionBtn}
            onClick={() => setIsExpanded(!isExpanded)}
            title={isExpanded ? "Collapse panel" : "Expand panel"}
          >
            {isExpanded ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </button>
          <button style={styles.closeBtn} onClick={onClose}>
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Content */}
      <div style={styles.content}>
        {/* Segment Selection */}
        <div style={styles.section}>
          <label style={styles.label}>SELECT SEGMENT</label>
          <div style={styles.segmentTabs}>
            {selectedItem.segments.map((seg) => (
              <button
                key={seg.id}
                style={{
                  ...styles.segmentTab,
                  ...(selectedSegmentId === seg.id ? styles.segmentTabActive : {}),
                }}
                onClick={() => onSegmentSelect(seg.id)}
              >
                {seg.name}
              </button>
            ))}
          </div>
        </div>

        {/* Category Selection */}
        <div style={styles.section}>
          <label style={styles.label}>CATEGORY</label>
          <select
            style={styles.select}
            value={selectedCategoryId || ""}
            onChange={(e) => onCategoryChange(e.target.value)}
          >
            <option value="">Select category...</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
        </div>

        {/* History Section - Collapsible */}
        <div style={styles.section}>
          <button
            style={styles.historyToggle}
            onClick={() => setShowHistory(!showHistory)}
          >
            <span style={styles.label}>HISTORY</span>
            {showHistory ? (
              <ChevronUp size={16} style={styles.toggleIcon} />
            ) : (
              <ChevronDown size={16} style={styles.toggleIcon} />
            )}
          </button>
          
          {showHistory && (
            <div style={styles.historyContainer}>
              {/* Created By */}
              <div style={styles.historyItem}>
                <User size={14} style={styles.historyIcon} />
                <div style={styles.historyContent}>
                  <span style={styles.historyLabel}>Created by</span>
                  <span style={styles.historyValue}>
                    {selectedItem.createdByName || "Unknown"}
                  </span>
                </div>
              </div>
              
              {/* Last Modified By */}
              <div style={styles.historyItem}>
                <Edit3 size={14} style={styles.historyIcon} />
                <div style={styles.historyContent}>
                  <span style={styles.historyLabel}>Last edited by</span>
                  <span style={styles.historyValue}>
                    {selectedItem.lastModBy || "SYSTEM"}
                  </span>
                </div>
              </div>

              {/* Timing Info */}
              <div style={styles.historyItemLast}>
                <Clock size={14} style={styles.historyIcon} />
                <div style={styles.historyContent}>
                  <span style={styles.historyLabel}>Duration</span>
                  <span style={styles.historyValue}>
                    Est: {selectedItem.estDuration}
                    {selectedItem.actual && ` • Actual: ${selectedItem.actual}`}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Segment Description */}
        <div style={{ ...styles.section, flex: isExpanded ? 1 : "none" }}>
          <div style={styles.labelRow}>
            <label style={styles.label}>SEGMENT DESCRIPTION</label>
            {isSaving && <span style={styles.savingIndicator}>Saving...</span>}
            {saveMessage && !isSaving && (
              <span style={styles.savedIndicator}>{saveMessage}</span>
            )}
          </div>
          <RichTextEditor
            content={editDescription}
            onChange={onDescriptionChange}
            placeholder={
              isPlaceholder
                ? "Save this segment first to add description"
                : "Enter segment description..."
            }
            disabled={isPlaceholder}
            minHeight={isExpanded ? "calc(100vh - 400px)" : "120px"}
          />
        </div>

        {/* Action Buttons */}
        <div style={styles.actions}>
          <button
            style={styles.saveBtn}
            onClick={onManualSave}
            disabled={isPlaceholder || isSaving}
          >
            <Save size={14} />
            Save
          </button>
          <button
            style={{
              ...styles.deleteBtn,
              ...(isPlaceholder || selectedItem.segments.length <= 1
                ? styles.deleteBtnDisabled
                : {}),
            }}
            onClick={() => onDeleteSegment(selectedSegment)}
            disabled={isPlaceholder || isDeletePending || selectedItem.segments.length <= 1}
            title={
              selectedItem.segments.length <= 1
                ? "Cannot delete the last segment"
                : "Delete this segment"
            }
          >
            <Trash2 size={14} />
            {isDeletePending ? "Deleting..." : "Delete Segment"}
          </button>
        </div>
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  panel: {
    backgroundColor: "#ffffff",
    borderLeftWidth: "1px",
    borderLeftStyle: "solid",
    borderLeftColor: "#e0e0e0",
    display: "flex",
    flexDirection: "column",
    height: "100%",
    transition: "width 0.3s ease",
    boxShadow: "-4px 0 20px rgba(0, 0, 0, 0.1)",
    zIndex: 100,
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "12px 16px",
    borderBottomWidth: "1px",
    borderBottomStyle: "solid",
    borderBottomColor: "#e0e0e0",
    backgroundColor: "#f8f9fa",
  },
  headerTitle: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    fontSize: "14px",
    fontWeight: 600,
    color: "#2c3e50",
    overflow: "hidden",
    flex: 1,
  },
  headerActions: {
    display: "flex",
    alignItems: "center",
    gap: "4px",
  },
  pageCode: {
    backgroundColor: "#3498db",
    color: "white",
    padding: "2px 6px",
    borderRadius: "4px",
    fontSize: "12px",
    fontWeight: 600,
    flexShrink: 0,
  },
  slug: {
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    color: "#2c3e50",
  },
  segmentName: {
    color: "#e67e22",
    fontSize: "12px",
    flexShrink: 0,
    fontWeight: 600,
  },
  actionBtn: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: "28px",
    height: "28px",
    backgroundColor: "transparent",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "#d0d0d0",
    borderRadius: "4px",
    color: "#666666",
    cursor: "pointer",
    flexShrink: 0,
    transition: "all 0.2s",
  },
  closeBtn: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: "28px",
    height: "28px",
    backgroundColor: "transparent",
    borderWidth: 0,
    borderRadius: "4px",
    color: "#666666",
    cursor: "pointer",
    flexShrink: 0,
  },
  content: {
    flex: 1,
    padding: "16px",
    overflowY: "auto",
    display: "flex",
    flexDirection: "column",
    backgroundColor: "#ffffff",
  },
  section: {
    marginBottom: "16px",
  },
  label: {
    display: "block",
    fontSize: "11px",
    fontWeight: 600,
    color: "#666666",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
  },
  labelRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: "8px",
  },
  savingIndicator: {
    fontSize: "11px",
    color: "#e67e22",
  },
  savedIndicator: {
    fontSize: "11px",
    color: "#27ae60",
  },
  segmentTabs: {
    display: "flex",
    flexWrap: "wrap",
    gap: "8px",
    marginTop: "8px",
  },
  segmentTab: {
    padding: "6px 12px",
    backgroundColor: "#f5f5f5",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "#d0d0d0",
    borderRadius: "4px",
    color: "#555555",
    fontSize: "12px",
    cursor: "pointer",
    transition: "all 0.2s",
  },
  segmentTabActive: {
    backgroundColor: "#f39c12",
    borderColor: "#f39c12",
    color: "white",
  },
  select: {
    width: "100%",
    padding: "10px 12px",
    backgroundColor: "#ffffff",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "#d0d0d0",
    borderRadius: "4px",
    color: "#2c3e50",
    fontSize: "13px",
    cursor: "pointer",
    marginTop: "8px",
  },
  historyToggle: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    padding: "8px 12px",
    backgroundColor: "#f5f5f5",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "#d0d0d0",
    borderRadius: "4px",
    cursor: "pointer",
    transition: "all 0.2s",
  },
  toggleIcon: {
    color: "#666666",
  },
  historyContainer: {
    backgroundColor: "#f9f9f9",
    borderRadius: "0 0 6px 6px",
    borderWidth: "0 1px 1px 1px",
    borderStyle: "solid",
    borderColor: "#d0d0d0",
    padding: "4px 12px",
    marginTop: "-1px",
  },
  historyItem: {
    display: "flex",
    alignItems: "flex-start",
    gap: "10px",
    paddingTop: "10px",
    paddingBottom: "10px",
    borderBottomWidth: "1px",
    borderBottomStyle: "solid",
    borderBottomColor: "#e0e0e0",
  },
  historyItemLast: {
    display: "flex",
    alignItems: "flex-start",
    gap: "10px",
    paddingTop: "10px",
    paddingBottom: "10px",
  },
  historyIcon: {
    color: "#888888",
    marginTop: "2px",
    flexShrink: 0,
  },
  historyContent: {
    display: "flex",
    flexDirection: "column",
    gap: "2px",
    flex: 1,
    minWidth: 0,
  },
  historyLabel: {
    fontSize: "10px",
    color: "#888888",
    textTransform: "uppercase",
  },
  historyValue: {
    fontSize: "13px",
    color: "#2c3e50",
    fontWeight: 500,
  },
  actions: {
    display: "flex",
    gap: "10px",
    marginTop: "auto",
    paddingTop: "16px",
  },
  saveBtn: {
    flex: 1,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "6px",
    padding: "10px 16px",
    backgroundColor: "#27ae60",
    borderWidth: 0,
    borderRadius: "4px",
    color: "white",
    fontSize: "13px",
    fontWeight: 500,
    cursor: "pointer",
  },
  deleteBtn: {
    flex: 1,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "6px",
    padding: "10px 16px",
    backgroundColor: "#e74c3c",
    borderWidth: 0,
    borderRadius: "4px",
    color: "white",
    fontSize: "13px",
    fontWeight: 500,
    cursor: "pointer",
  },
  deleteBtnDisabled: {
    opacity: 0.5,
    cursor: "not-allowed",
  },
}