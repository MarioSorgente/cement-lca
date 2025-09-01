// components/ComparePanel.tsx
import React, { useMemo, useState } from 'react'
import { InputsState, ResultRow } from '../lib/types'
import { formatNumber } from '../lib/calc'

type Props = {
  open: boolean
  onClose: () => void
  comparedIds: string[]
  rowsById: Record<string, ResultRow>
  inputs: InputsState
}

export default function ComparePanel({ open, onClose, comparedIds, rowsById, inputs }: Props) {
  const baseRows = comparedIds.map(id => rowsById[id]).filter(Boolean)

  // Local dosage overrides only for the panel; start from current dosageUsed
  const [localDosage, setLocalDosage] = useState<Record<string, number>>({})
  const getDosage = (id: string, fallback: number) => (localDosage[id] ?? fallback)

  const rows = useMemo(() => {
    return baseRows.map(r => {
      const dosage = getDosage(r.cement.id, r.dosageUsed)
      const ef = Number(r.cement.co2e_per_kg_binder_A1A3 ?? 0)
      const a1a3 = dosage * ef
      const distanceKm = Number(inputs.distanceKm ?? 0)
      const a4Ef = Number(r.cement.transport_ef_kg_per_m3_km ?? 0) * (inputs.volumeM3 ?? 0)
      const a4 = inputs.includeA4 ? distanceKm * a4Ef : 0
      const total = a1a3 * (inputs.volumeM3 ?? 0) + a4
      return { id: r.cement.id, name: r.cement.cement_type, dosage, a1a3, a4, total }
    })
  }, [baseRows, localDosage, inputs])

  const bestId = useMemo(() => {
    if (!rows.length) return undefined
    return rows.reduce((m, x) => (x.total < m.total ? x : m), rows[0]).id
  }, [rows])

  return (
    <>
      <div className={`cmp-drawer-backdrop ${open ? 'open' : ''}`} onClick={onClose} />
      <aside className={`cmp-drawer ${open ? 'open' : ''}`}>
        <div className="cmp-drawer-header">
          <h3>Compare</h3>
          <button className="btn ghost" onClick={onClose} aria-label="Close">✕</button>
        </div>

        {rows.length < 2 ? (
          <div className="small" style={{ padding: 12 }}>Select at least two cements to compare.</div>
        ) : (
          <div className="cmp-drawer-body">
            {rows.map(x => (
              <div key={x.id} className="cmp-drawer-row">
                <div className="cmp-drawer-title">
                  <div className="name">
                    {x.name}
                    {x.id === bestId && <span className="pill pill-deepgreen" style={{ marginLeft: 8 }}>Most sustainable</span>}
                  </div>
                  <div className="meta small">
                    Total {formatNumber(x.total)} • A1–A3 {formatNumber(x.a1a3)} • A4 {formatNumber(x.a4)}
                  </div>
                </div>

                <div className="grid" style={{ gridTemplateColumns:'1fr 1fr', gap: 8, alignItems:'end', marginTop: 6 }}>
                  <div>
                    <label className="label" style={{ marginBottom: 6 }}>Dosage (kg/m³)</label>
                    <input
                      className="input"
                      type="number"
                      min={0}
                      value={String(x.dosage)}
                      onChange={(e) => setLocalDosage(prev => ({ ...prev, [x.id]: Number(e.target.value) || 0 }))}
                    />
                  </div>

                  <div>
                    <label className="label" style={{ marginBottom: 6 }}>Total CO₂ element (kg)</label>
                    <div className="num-strong">{formatNumber(x.total)}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </aside>
    </>
  )
}
