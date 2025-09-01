import { useState } from 'react'

export default function Tooltip({ text }: { text: string }) {
  const [open, setOpen] = useState(false)
  return (
    <span
      className="tooltip-wrapper"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <span className="tooltip-icon">i</span>
      {open && <span className="tooltip-box tooltip-right">{text}</span>}
    </span>
  )
}
