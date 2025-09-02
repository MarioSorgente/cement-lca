import React, { useMemo, useState } from 'react'
import { InputsState, ResultRow } from '../lib/types'
import { formatNumber } from '../lib/calc'

type CatalogItem = { id: string; label: string }

type Props = {
  open: boolean
  onClose: () => void
  comparedIds: string[]
  rowsById: Record<string, ResultRow>
  inputs: InputsState

  /** Allow adding from the panel (already present) */
  onAdd: (id: string) => void
  catalog: CatalogItem[]

  /** NEW: remove a single cement from comparison */
  onRemove: (id: string) => void
}

export default function ComparePanel({
  open, onClose, comparedIds, rowsById, inputs, onAdd, catalog, onRemove
}: Props) {
  const baseRows = comparedIds.map(id => rowsById[id]).filter(Boolean)

  // Local dosage overrides only for the panel; start from current dosageUsed
  const [localDosage, setLocalDosage] = useState<Record<string, number>>({})
  const getDosage = (id: string, fallback: number) => (localDosage[id] ?? fallback)

  // Simple “add cement” picker
  const [pickerOpen, setPickerOpen] = useState(false)
  const [pickerQuery, setPickerQuery] = useState('')

  const addCandidates = useMemo(() => {
    const q = pickerQuery.trim().toLowerCase()
    return catalog
      .filter(x => !comparedIds.includes(x.id))
      .filter(x => (q ? x.label.toLowerCase().includes(q) : true))
      .slice(0, 50)
  }, [catalog, comparedIds, pickerQuery])

  const rows = useMemo(() => {
    return baseRows.map(r => {
      const dosage = getDosage(r.cement.id, r.dosageUsed)
      const ef = Number(r.cement.co2e_per_kg_binder_A1A3 ?? 0)
      const a1a3 = dosage * ef

      // Cement-only A4: distance × EF(kg CO2/kg·km) × (dosage × volume)
      const dist = Number(inputs.distanceKm ?? 0)
      const vol  = Number(inputs.volumeM3 ?? 0)
      const efKgPerKgKm = Number((r.cement as any).transport_ef_kg_per_kg_km ?? 0)
      const a4 = inputs.includeA4 ? dist * efKgPerKgKm * (dosage * vol) : 0

      const total = a1a3 * vol + a4
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
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <button className="btn" onClick={() => setPickerOpen(p => !p)}>
              ＋ Add cement
            </button>
            <button className="btn ghost" onClick={onClose} aria-label="Close">✕</button>
          </div>
        </div>

        {/* Picker panel */}
        {pickerOpen && (
          <div className="cmp-drawer-body" style={{ borderBottom:'1px solid var(--border)', paddingBottom: 10 }}>
            <div style={{ display:'flex', gap:8, alignItems:'center', marginBottom:8 }}>
              <input
                className="input"
                placeholder="Search cement…"
                value={pickerQuery}
                onChange={(e) => setPickerQuery(e.target.value)}
              />
            </div>
            <div style={{ display:'grid', gap:8, maxHeight: 220, overflow:'auto' }}>
              {addCandidates.length === 0 && (
                <div className="small" style={{ color:'var(--muted)' }}>No results.</div>
              )}
              {addCandidates.map(c => (
                <button
                  key={c.id}
                  className="btn"
                  style={{ justifyContent:'space-between' }}
                  onClick={() => { onAdd(c.id); setPickerOpen(false); }}
                >
                  <span>{c.label}</span>
                  <span className="small" style={{ opacity: 0.7 }}>Add</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Body */}
        <div className="cmp-drawer-body">
          {rows.length === 0 && (
            <div className="small" style={{ padding: 12 }}>
              No items yet. Click <b>＋ Add cement</b> to start comparing.
            </div>
          )}

          {rows.map(x => (
            <div key={x.id} className="cmp-drawer-row">
              <div
                className="cmp-drawer-title"
                style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom: 6 }}
              >
                <div className="name">
                  {x.name}
                  {x.id === bestId && (
                    <span className="pill pill-deepgreen" style={{ marginLeft: 8 }}>
                      Most sustainable
                    </span>
                  )}
                </div>

                {/* Remove */}
                <button
                  className="btn ghost"
                  aria-label={`Remove ${x.name} from comparison`}
                  title="Remove"
                  onClick={() => onRemove(x.id)}
                  style={{
                    width: 28, height: 28, borderRadius: 999,
                    display:'inline-flex', alignItems:'center', justifyContent:'center', padding:0
                  }}
                >
                  ✕
                </button>
              </div>

              {/* Metric box row */}
              <div style={{ display:'flex', gap:10, alignItems:'center', marginBottom:10, flexWrap:'wrap' }}>
                <div className="metric-box" aria-label="Total CO2 element">
                  <span>Total CO₂ element</span>
                  <span className="metric-sub">(kg)</span>
                  <span style={{ fontWeight:800, marginLeft:6 }}>{formatNumber(x.total)}</span>
                </div>

                <div className="chip">
                  A1–A3
                  <span className="metric-sub" style={{ marginLeft:6 }}>kg/m³</span>
                  <span style={{ fontWeight:700, marginLeft:6 }}>{formatNumber(x.a1a3)}</span>
                </div>

                <div className="chip">
                  A4
                  <span className="metric-sub" style={{ marginLeft:6 }}>kg</span>
                  <span style={{ fontWeight:700, marginLeft:6 }}>{formatNumber(x.a4)}</span>
                </div>
              </div>

              {/* Inputs */}
              <div className="grid" style={{ gridTemplateColumns:'1fr', gap: 8, alignItems:'end' }}>
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
              </div>
            </div>
          ))}
        </div>
      </aside>
    </>
  )
}
