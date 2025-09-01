// components/CompareTray.tsx
import React from 'react'

type Item = { id: string; label: string }

type Props = {
  items: Item[]
  max?: number
  onOpen: () => void
  onRemove: (id: string) => void
}

export default function CompareTray({ items, max = 3, onOpen, onRemove }: Props) {
  if (items.length === 0) return null

  return (
    <div className="cmp-tray" role="region" aria-label="Compare selection tray">
      <div className="cmp-tray-left">
        {items.map((it) => (
          <span key={it.id} className="cmp-chip">
            {it.label}
            <button
              className="cmp-chip-x"
              aria-label={`Remove ${it.label} from compare`}
              onClick={() => onRemove(it.id)}
              title="Remove"
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
