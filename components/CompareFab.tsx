// components/CompareFab.tsx
import React from 'react'

type Item = { id: string; label: string }

type Props = {
  items: Item[]
  onOpen: () => void
  onClear?: () => void
}

export default function CompareFab({ items, onOpen, onClear }: Props) {
  if (!items || items.length === 0) return null

  return (
    <div className="cmp-fab">
      <button className="cmp-fab-btn" onClick={onOpen} aria-label="Open comparison">
        <span className="cmp-fab-dot">{items.length}</span>
        Compare
      </button>
      {onClear && (
        <button className="cmp-fab-clear" onClick={onClear} aria-label="Clear comparison">
          Clear
        </button>
      )}
    </div>
  )
}
