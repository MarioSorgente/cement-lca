// components/Tooltip.tsx
import React, { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

type Props = {
  text: string
  portal?: boolean
  children?: React.ReactNode
}

const PREFERRED_WIDTH = 320 // readable, horizontal layout

const Tooltip: React.FC<Props> = ({ text, portal = false, children }) => {
  const [open, setOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [rect, setRect] = useState<DOMRect | null>(null)
  const ref = useRef<HTMLSpanElement | null>(null)

  useEffect(() => { setMounted(true) }, [])

  useEffect(() => {
    if (!open || !mounted || !ref.current) return
    setRect(ref.current.getBoundingClientRect())
  }, [open, mounted])

  // Center under trigger, clamp inside viewport
  const left = (() => {
    if (!mounted || !rect || typeof window === 'undefined') return 0
    const centered = rect.left + rect.width / 2 - PREFERRED_WIDTH / 2
    const min = 8
    const max = window.innerWidth - PREFERRED_WIDTH - 8
    return Math.max(min, Math.min(centered, max))
  })()

  const top = rect ? rect.top + rect.height + 8 : 0

  const Tip = (
    <div
      className="tooltip-portal"
      style={{
        position: portal ? 'fixed' as const : 'absolute' as const,
        top: portal ? top : '100%',
        left: portal ? left : 0,
        width: PREFERRED_WIDTH,
        maxWidth: PREFERRED_WIDTH,
      }}
      role="tooltip"
    >
      {text}
    </div>
  )

  // Smaller “i” icon
  const icon = (
    <span
      aria-label="Help"
      style={{
        display:'inline-flex',
        width:14, height:14,
        borderRadius:999,
        border:'1px solid #cbd5e1',
        color:'#334155', background:'#eef2f7',
        alignItems:'center', justifyContent:'center',
        lineHeight:1, fontSize:10, fontWeight:700
      }}
    >
      i
    </span>
  )

  return (
    <span
      ref={ref}
      className="tooltip-trigger"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      style={{ position: 'relative', display: 'inline-flex', alignItems:'center' }}
    >
      {children ?? icon}
      {open && (portal && mounted ? createPortal(Tip, document.body) : Tip)}
    </span>
  )
}

export default Tooltip
