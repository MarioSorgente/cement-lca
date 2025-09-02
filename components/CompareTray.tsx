import React from 'react'

type ItemLite = { id: string; label: string }

type Props = {
  items: ItemLite[]
  onOpen: () => void
  onClear?: () => void
}

export default function CompareTray({ items, onOpen, onClear }: Props) {
  const count = items.length
  return (
    <div className="cmp-fab" aria-live="polite">
      <button className="cmp-fab-btn" onClick={onOpen} aria-label="Open compare panel">
        <span className="cmp-fab-dot">{count}</span>
        <span>Compare</span>
      </button>
      {!!count && onClear && (
        <button className="cmp-fab-clear" onClick={onClear} aria-label="Clear compare selection">
          Clear
        </button>
      )}
    </div>
  )
}
