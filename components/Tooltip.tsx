import React, { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

type Props = {
  text: string
  /** Use a portal so the tooltip can't be clipped by sticky headers/overflow (e.g., table headers) */
  portal?: boolean
}

export default function Tooltip({ text, portal = false }: Props) {
  const [open, setOpen] = useState(false)

  // ----- Inline (legacy) tooltip — uses your existing CSS classes -----
  if (!portal) {
    return (
      <span
        className="tooltip-wrapper"
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        aria-label={text}
      >
        <span className="tooltip-icon">i</span>
        {open && <span className="tooltip-box tooltip-right">{text}</span>}
      </span>
    )
  }

  // ----- Portal tooltip (for table headers) -----
  const triggerRef = useRef<HTMLSpanElement>(null)
  const [mounted, setMounted] = useState(false)
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null)

  useEffect(() => setMounted(true), [])

  useEffect(() => {
    if (!open) return
    const update = () => {
      const el = triggerRef.current
      if (!el) return
      const r = el.getBoundingClientRect()
      setPos({ top: r.top + r.height / 2, left: r.right + 8 })
    }
    update()
    window.addEventListener('scroll', update, true)
    window.addEventListener('resize', update)
    return () => {
      window.removeEventListener('scroll', update, true)
      window.removeEventListener('resize', update)
    }
  }, [open])

  return (
    <span
      ref={triggerRef}
      className="tooltip-trigger"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
      aria-label={text}
    >
      <span className="tooltip-icon">i</span>
      {mounted && open && pos && createPortal(
        <div className="tooltip-portal" style={{ top: pos.top, left: pos.left }}>
          {text}
        </div>,
        document.body
      )}
    </span>
  )
}
