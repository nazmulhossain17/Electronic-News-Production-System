// ============================================================================
// File: lib/rtf-generator.ts
// Description: Utility to generate RTF files from bulletin data
// ============================================================================

interface SegmentData {
  name: string
  description?: string
}

interface RowData {
  page: string
  slug: string
  segments: SegmentData[]
  estDuration: string
  actual?: string
  lastModBy?: string
}

interface BulletinData {
  title: string
  date: string
  startTime: string
  status: string
  rows: RowData[]
}

// RTF escape special characters
function escapeRtf(text: string): string {
  if (!text) return ""
  return text
    .replace(/\\/g, "\\\\")
    .replace(/\{/g, "\\{")
    .replace(/\}/g, "\\}")
    .replace(/\n/g, "\\par ")
    // Handle Unicode characters (including Bangla)
    .split("")
    .map((char) => {
      const code = char.charCodeAt(0)
      if (code > 127) {
        return `\\u${code}?`
      }
      return char
    })
    .join("")
}

// Strip HTML tags from description
function stripHtml(html: string): string {
  if (!html) return ""
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<\/li>/gi, "\n")
    .replace(/<li>/gi, "• ")
    .replace(/<[^>]+>/g, "")
    .trim()
}

export function generateBulletinRtf(bulletin: BulletinData): string {
  const rows = bulletin.rows || []
  
  // RTF Header with Unicode support
  let rtf = "{\\rtf1\\ansi\\ansicpg1252\\deff0\\nouicompat\\deflang1033"
  
  // Font table
  rtf += "{\\fonttbl{\\f0\\fswiss\\fcharset0 Arial;}{\\f1\\fmodern\\fcharset0 Courier New;}{\\f2\\fnil\\fcharset0 Noto Sans Bengali;}}"
  
  // Color table
  rtf += "{\\colortbl ;\\red52\\green152\\blue219;\\red44\\green62\\blue80;\\red149\\green165\\blue166;\\red39\\green174\\blue96;\\red231\\green76\\blue60;}"
  
  // Document settings
  rtf += "\\viewkind4\\uc1\\pard\\sa200\\sl276\\slmult1"
  
  // Title
  rtf += "\\cf1\\b\\fs36 " + escapeRtf(bulletin.title) + "\\b0\\par"
  
  // Metadata
  rtf += "\\cf3\\fs20 Date: " + escapeRtf(bulletin.date) + " | Time: " + escapeRtf(bulletin.startTime) + " | Status: " + escapeRtf(bulletin.status) + "\\par"
  
  // Horizontal line
  rtf += "\\pard\\brdrb\\brdrs\\brdrw10\\brsp20 \\par"
  rtf += "\\pard\\sa200\\sl276\\slmult1"
  
  // Stories section header
  rtf += "\\cf1\\b\\fs24 RUNDOWN\\b0\\par"
  rtf += "\\cf2\\fs20"
  
  // Table header
  rtf += "\\trowd\\trgaph70\\trleft0"
  rtf += "\\clbrdrt\\brdrw10\\brdrs\\clbrdrl\\brdrw10\\brdrs\\clbrdrb\\brdrw10\\brdrs\\clbrdrr\\brdrw10\\brdrs\\cellx1000"
  rtf += "\\clbrdrt\\brdrw10\\brdrs\\clbrdrl\\brdrw10\\brdrs\\clbrdrb\\brdrw10\\brdrs\\clbrdrr\\brdrw10\\brdrs\\cellx4000"
  rtf += "\\clbrdrt\\brdrw10\\brdrs\\clbrdrl\\brdrw10\\brdrs\\clbrdrb\\brdrw10\\brdrs\\clbrdrr\\brdrw10\\brdrs\\cellx6000"
  rtf += "\\clbrdrt\\brdrw10\\brdrs\\clbrdrl\\brdrw10\\brdrs\\clbrdrb\\brdrw10\\brdrs\\clbrdrr\\brdrw10\\brdrs\\cellx7500"
  rtf += "\\pard\\intbl\\b PAGE\\cell STORY SLUG\\cell SEGMENTS\\cell DURATION\\cell\\b0\\row"
  
  // Table rows
  rows.forEach((row, index) => {
    rtf += "\\trowd\\trgaph70\\trleft0"
    rtf += "\\clbrdrt\\brdrw10\\brdrs\\clbrdrl\\brdrw10\\brdrs\\clbrdrb\\brdrw10\\brdrs\\clbrdrr\\brdrw10\\brdrs\\cellx1000"
    rtf += "\\clbrdrt\\brdrw10\\brdrs\\clbrdrl\\brdrw10\\brdrs\\clbrdrb\\brdrw10\\brdrs\\clbrdrr\\brdrw10\\brdrs\\cellx4000"
    rtf += "\\clbrdrt\\brdrw10\\brdrs\\clbrdrl\\brdrw10\\brdrs\\clbrdrb\\brdrw10\\brdrs\\clbrdrr\\brdrw10\\brdrs\\cellx6000"
    rtf += "\\clbrdrt\\brdrw10\\brdrs\\clbrdrl\\brdrw10\\brdrs\\clbrdrb\\brdrw10\\brdrs\\clbrdrr\\brdrw10\\brdrs\\cellx7500"
    
    const segments = row.segments.map(s => s.name).join(", ")
    
    rtf += "\\pard\\intbl " + escapeRtf(row.page) + "\\cell "
    rtf += escapeRtf(row.slug || "(empty)") + "\\cell "
    rtf += escapeRtf(segments) + "\\cell "
    rtf += escapeRtf(row.estDuration || "0:00") + "\\cell\\row"
  })
  
  rtf += "\\pard\\sa200\\sl276\\slmult1\\par"
  
  // Detailed segments section
  rtf += "\\cf1\\b\\fs24 SEGMENT DETAILS\\b0\\par"
  rtf += "\\cf2\\fs20"
  
  rows.forEach((row) => {
    if (row.slug && row.slug !== "(empty)") {
      // Story header
      rtf += "\\pard\\sa100\\cf1\\b\\fs22 " + escapeRtf(row.page) + " - " + escapeRtf(row.slug) + "\\b0\\par"
      
      row.segments.forEach((segment) => {
        rtf += "\\cf4\\b " + escapeRtf(segment.name) + ":\\b0\\cf2 "
        
        const desc = stripHtml(segment.description || "")
        if (desc) {
          rtf += escapeRtf(desc)
        } else {
          rtf += "\\i (No description)\\i0"
        }
        rtf += "\\par"
      })
      
      rtf += "\\par"
    }
  })
  
  // Footer
  rtf += "\\pard\\brdrb\\brdrs\\brdrw10\\brsp20 \\par"
  rtf += "\\pard\\cf3\\fs16 Generated on: " + escapeRtf(new Date().toLocaleString()) + "\\par"
  rtf += "AP ENPS Newsroom System\\par"
  
  // Close RTF
  rtf += "}"
  
  return rtf
}

export function downloadRtf(content: string, filename: string): void {
  const blob = new Blob([content], { type: "application/rtf" })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}