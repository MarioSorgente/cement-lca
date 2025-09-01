// components/CompareToggle.tsx
import React from 'react'

type Props = {
  selected: boolean
  onToggle: () => void
  title?: string
}

export default function CompareToggle({ selected, onToggle, title }: Props) {
  return (
    <button
      type="button"
      className={`cmp-tgl${selected ? ' selected' : ''}`}
      aria-pressed={selected}
      aria-label={selected ? 'Remove from compare' : 'Add to compare'}
      title={title ?? (selected ? 'In compare' : 'Add to compare')}
      onClick={onToggle}
    >
      {/* plus / check rendered via CSS ::before */}
    </button>
  )
}
