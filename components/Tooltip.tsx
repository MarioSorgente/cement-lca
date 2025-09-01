import React, { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

type Props = {
  text: string
}

/**
 * Portal-based tooltip:
 * - Renders the bubble into document.body (no clipping by sticky headers/overflow)
 * - Positions to the RIGHT of the “i” icon, vertically centered
 * - Follows scroll/resize while open
 */
export default function Tooltip({ text }: Props) {
  const [open, setOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null)
  const triggerRef = useRef<HTMLSpanElement>(null)

  useEffect(() => setMounted(true), [])

  useEffect(() => {
    if (!open) return

    const update = () => {
      const el = triggerRef.current
      if (!el) return
      const r = el.getBoundingClientRect()
      const top = r.top + r.height / 2
      const left = r.right + 8
      setPos({ top, left })
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
