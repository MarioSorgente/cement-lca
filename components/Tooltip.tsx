// components/Tooltip.tsx
import React, { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

type Props = {
  text: string
  portal?: boolean
  children?: React.ReactNode
}

export default function Tooltip({ text, portal = false, children }: Props) {
  const [open, setOpen] = useState(false)
  const [coords, setCoords] = useState<{x:number;y:number;width:number;height:number}>({x:0,y:0,width:0,height:0})
  const ref = useRef<HTMLSpanElement | null>(null)

  useEffect(() => {
    if (!open || !ref.current) return
    const rect = ref.current.getBoundingClientRect()
    setCoords({ x: rect.left, y: rect.top, width: rect.width, height: rect.height })
  }, [open])

  const Tip = (
    <div
      className="tip"
      style={{
        position: portal ? 'fixed' : 'absolute',
        top: portal ? coords.y + coords.height + 8 : '100%',
        left: portal ? Math.min(coords.x, window.innerWidth - 240) : 0,
        zIndex: 1000,
        maxWidth: 220,
        background: '#111827',
        color: 'white',
        padding: '6px 8px',
        borderRadius: 6,
        fontSize: 12,
        boxShadow: '0 6px 16px rgba(0,0,0,.18)',
        pointerEvents: 'none',
        transform: portal ? undefined : 'translateY(8px)',
        whiteSpace: 'normal',
      }}
      role="tooltip"
    >
      {text}
    </div>
  )

  return (
    <span
      ref={ref}
      className="tip-anchor"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      style={{ position: 'relative', display: 'inline-flex', alignItems:'center' }}
    >
      {children ?? (
        <span
          aria-label="Help"
          style={{
            display:'inline-flex',
            width:18, height:18,
            borderRadius:999,
            border:'1px solid #cbd5e1',
            color:'#111827', background:'#fff',
            alignItems:'center', justifyContent:'center',
            lineHeight:1, fontSize:12, fontWeight:700
          }}
        >
          i
        </span>
      )}
      {open && (portal ? createPortal(Tip, document.body) : Tip)}
    </span>
  )
}
