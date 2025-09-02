import React from 'react'

type Item = { id: string; label: string }

type Props = {
  items: Item[]
  onOpen: () => void
  onClear?: () => void
}

export default function CompareFab({ items = [], onOpen, onClear }: Props) {
  const count = items?.length ?? 0

  return (
    <div className="cmp-fab">
      <button
        className="cmp-fab-btn"
        onClick={onOpen}
        aria-label="Open comparison"
        // always enabled so users can add from the panel
      >
        {count > 0 && <span className="cmp-fab-dot">{count}</span>}
        Compare
      </button>

      {count > 0 && onClear && (
        <button className="cmp-fab-clear" onClick={onClear} aria-label="Clear comparison">
          Clear
        </button>
      )}
    </div>
  )
}
