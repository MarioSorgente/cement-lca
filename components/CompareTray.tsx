// components/CompareTray.tsx
import React from 'react'

type Item = { id: string; label: string }

type Props = {
  items: Item[]
  max: number
  onOpen: () => void
  onRemove: (id: string) => void
  catalog: Item[]
  onReplace: (oldId: string, newId: string) => void
}

export default function CompareTray({
  items, max, onOpen, onRemove, catalog, onReplace
}: Props) {
  return (
    <div className="cmp-tray">
      <div className="cmp-tray-items">
        {items.map(x => (
          <span key={x.id} className="chip">
            {x.label}
            <button
              className="chip-x"
              onClick={() => onRemove(x.id)}
              aria-label={`Remove ${x.label}`}
            >
              ×
            </button>
          </span>
        ))}
      </div>

      <div className="cmp-tray-right">
        <div className="small" style={{ marginRight: 8 }}>
          {items.length}/{max} selected
        </div>
        <button className="btn" onClick={onOpen} disabled={items.length < 2}>
          Compare
        </button>
      </div>
    </div>
  )
}
