"use client"

import { Bulletin } from "@/lib/api-client"
import { getBulletinStatusClass } from "@/types/helpers"

interface BulletinsSidebarProps {
  bulletins: Bulletin[]
  isLoading: boolean
  selectedBulletinId: string | null
  onSelectBulletin: (id: string) => void
}

export default function BulletinsSidebar({
  bulletins,
  isLoading,
  selectedBulletinId,
  onSelectBulletin,
}: BulletinsSidebarProps) {
  return (
    <div className="bulletins-panel">
      <div className="panel-header">Today&apos;s Bulletins</div>
      <div className="bulletins-list">
        {isLoading ? (
          <div className="empty-bulletins">Loading...</div>
        ) : bulletins.length === 0 ? (
          <div className="empty-bulletins">No bulletins for today</div>
        ) : (
          bulletins.map((b) => (
            <div
              key={b.id}
              className={`bulletin-item ${selectedBulletinId === b.id ? "active" : ""}`}
              onClick={() => onSelectBulletin(b.id)}
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
  )
}