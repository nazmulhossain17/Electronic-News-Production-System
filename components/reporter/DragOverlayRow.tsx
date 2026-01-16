"use client"

import { getSegmentClass } from "@/types/helpers"
import { RundownDisplayItem } from "@/types/reporter"
import { GripVertical } from "lucide-react"

interface DragOverlayRowProps {
  item: RundownDisplayItem
}

export default function DragOverlayRow({ item }: DragOverlayRowProps) {
  return (
    <table className="enps-rundown-table drag-overlay-table">
      <tbody>
        <tr className="rundown-row dragging-overlay">
          <td className="drag-handle">
            <GripVertical size={16} />
          </td>
          <td className="pg">{item.page}</td>
          <td className="slug">{item.slug || "(empty)"}</td>
          <td className="segment-cell">
            <div className="segments-container">
              {item.segments.map((seg) => (
                <span key={seg.id} className={`segment-tag ${getSegmentClass(seg.name)}`}>
                  {seg.name}
                </span>
              ))}
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
      </tbody>
    </table>
  )
}