import React, { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

type Props = {
  text: string
  portal?: boolean
  /** optional content to wrap; if omitted, a small "i" icon is rendered */
  children?: React.ReactNode
}

const Tooltip: React.FC<Props> = ({ text, portal = false, children }) => {
  const [open, setOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [coords, setCoords] = useState<{x:number;y:number;width:number;height:number}>({x:0,y:0,width:0,height:0})
  const ref = useRef<HTMLSpanElement | null>(null)

  useEffect(() => { setMounted(true) }, [])

  useEffect(() => {
    if (!open || !mounted || !ref.current) return
    const rect = ref.current.getBoundingClientRect()
    setCoords({ x: rect.left, y: rect.top, width: rect.width, height: rect.height })
  }, [open, mounted])

  const maxLeft = mounted && typeof window !== 'undefined' ? window.innerWidth - 260 : 0
  const tipLeft = portal ? Math.max(8, Math.min(coords.x, maxLeft)) : 0

  const Tip = (
    <div
      className="tooltip-portal"
      style={{
        position: portal ? 'fixed' : 'absolute',
        top: portal ? coords.y + coords.height + 8 : '100%',
        left: tipLeft,
      }}
      role="tooltip"
    >
      {text}
    </div>
  )

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
