// components/ComparePanel.tsx
import React, { useMemo } from 'react'
import { InputsState, ResultRow } from '../lib/types'
import { formatNumber } from '../lib/calc'

type Props = {
  open: boolean
  onClose: () => void

  comparedIds: string[]
  rowsById: Record<string, ResultRow>
}

export default function ComparePanel({ open, onClose, comparedIds, rowsById }: Props) {
  const rows = comparedIds.map(id => rowsById[id]).filter(Boolean)

  const a1a3Max   = rows.length ? Math.max(...rows.map(r => r.co2ePerM3_A1A3)) : 0
  const a4Max     = rows.length ? Math.max(...rows.map(r => r.a4Transport)) : 0
  const totalMax  = rows.length ? Math.max(...rows.map(r => r.totalElement)) : 0

  return (
    <>
      {/* backdrop */}
      <div className={`cmp-drawer-backdrop ${open ? 'open' : ''}`} onClick={onClose} />

      {/* drawer */}
      <aside className={`cmp-drawer ${open ? 'open' : ''}`}>
        <div className="cmp-drawer-header">
          <h3>Comparison</h3>
          <button className="btn ghost" onClick={onClose} aria-label="Close">✕</button>
        </div>

        {rows.length < 2 ? (
          <div className="small" style={{ padding: 12 }}>Select at least two cements to compare.</div>
        ) : (
          <div className="cmp-drawer-body">
            {rows.map(r => (
              <div key={r.cement.id} className="cmp-drawer-row">
                <div className="cmp-drawer-title">
                  <div className="name">{r.cement.cement_type}</div>
                  <div className="meta small">
                    A1–A3 {formatNumber(r.co2ePerM3_A1A3)} • A4 {formatNumber(r.a4Transport)} • Total {formatNumber(r.totalElement)}
                  </div>
                </div>

                <Bars
                  a1a3={r.co2ePerM3_A1A3}
                  a4={r.a4Transport}
                  totalMax={totalMax}
                />
              </div>
            ))}
          </div>
        )}
      </aside>
    </>
  )
}

function Bars({ a1a3, a4, totalMax }: { a1a3: number; a4: number; totalMax: number }) {
  const total = a1a3 + a4
  const widthPct = totalMax > 0 ? (total / totalMax) * 100 : 0
  const a1a3Pct  = total > 0 ? (a1a3 / total) * 100 : 0
  const a4Pct    = total > 0 ? (a4   / total) * 100 : 0

  return (
    <div className="cmp-bars">
      <div className="cmp-bars-track">
        <div className="cmp-bars-total" style={{ width: `${widthPct}%` }}>
          <div className="cmp-bars-a1a3" style={{ width: `${a1a3Pct}%` }} />
          <div className="cmp-bars-a4"   style={{ width: `${a4Pct}%` }} />
        </div>
      </div>
      <div className="cmp-bars-legend small">
        <span className="chip" style={{ background:'#eef2ff' }}>A1–A3</span>
        <span className="chip" style={{ background:'#fef3c7' }}>A4</span>
      </div>
    </div>
  )
}
