// components/ComparePanel.tsx
import React, { useMemo } from 'react'
import { InputsState, ResultRow } from '../lib/types'
import { formatNumber } from '../lib/calc'

type Props = {
  open: boolean
  onClose: () => void

  comparedIds: string[]
  rowsById: Record<string, ResultRow>
  baselineId?: string

  dosageMode?: InputsState['dosageMode']
  perCementDosage?: Record<string, number>
  onPerCementDosageChange?: (cementId: string, val: number) => void

  onRemove: (cementId: string) => void
  /** optional: provide a catalog to enable “Replace” */
  catalog?: Array<{ id: string; label: string }>
  onReplace?: (oldId: string, newId: string) => void
}

export default function ComparePanel({
  open, onClose,
  comparedIds, rowsById, baselineId,
  dosageMode, perCementDosage, onPerCementDosageChange,
  onRemove, catalog, onReplace,
}: Props) {
  const rows = useMemo(
    () => comparedIds.map(id => rowsById[id]).filter((x): x is ResultRow => !!x),
    [comparedIds, rowsById]
  )

  const best = useMemo(() => {
    if (!rows.length) return undefined
    return rows.reduce((m, r) => (r.totalElement < m.totalElement ? r : m), rows[0])
  }, [rows])
  const bestId = best?.cement.id

  return (
    <>
      {open && <div className="drawer-overlay" onClick={onClose} aria-hidden />}

      <aside className={`drawer ${open ? 'open' : ''}`} aria-hidden={!open} aria-label="Compare cements">
        <div className="drawer-header">
          <div>
            <div className="drawer-title">Compare Cements</div>
            <div className="drawer-sub">Side-by-side sustainability breakdown. Adjust dosage to reflect real usage.</div>
          </div>
          <button className="btn" onClick={onClose} aria-label="Close">Close</button>
        </div>

        {rows.length === 0 ? (
          <div className="drawer-empty">
            Pick at least two cements from the table to start comparing.
          </div>
        ) : (
          <div className="cmp-grid">
            {rows.map((r) => {
              const isBest = r.cement.id === bestId
              const dosageEditable = dosageMode === 'perCement' && !!onPerCementDosageChange
              const dosageValue = dosageEditable
                ? (perCementDosage?.[r.cement.id] ?? r.dosageUsed)
                : r.dosageUsed

              return (
                <div key={r.cement.id} className={`cmp-card ${isBest ? 'cmp-card-best' : ''}`}>
                  <div className="cmp-card-head">
                    <div className="cmp-name">{r.cement.cement_type}</div>
                    <div className="cmp-sub">
                      <span className="tag">{r.cement.strength_class}</span>
                      <span className="tag" style={{ marginLeft: 6 }}>{Math.round(r.cement.clinker_fraction * 100)}% clinker</span>
                      {r.cement.id === baselineId && (
                        <span className="tag" style={{ marginLeft: 6, background:'#fee2e2', color:'#991b1b', borderColor:'#fecaca' }}>
                          Baseline
                        </span>
                      )}
                    </div>

                    <div style={{ display:'flex', gap:8, marginTop:8 }}>
                      {onReplace && catalog && (
                        <select
                          className="select"
                          onChange={(e) => { if (e.target.value) onReplace(r.cement.id, e.target.value) }}
                          defaultValue=""
                          aria-label={`Replace ${r.cement.cement_type}`}
                        >
                          <option value="" disabled>Replace…</option>
                          {catalog.map(opt => (
                            <option key={opt.id} value={opt.id}>{opt.label}</option>
                          ))}
                        </select>
                      )}
                      <button className="btn" onClick={() => onRemove(r.cement.id)}>Remove</button>
                    </div>
                  </div>

                  {/* KPI: Total (big) */}
                  <div className="cmp-kpi">
                    <div className="cmp-kpi-label">Total CO₂ element</div>
                    <div className="cmp-kpi-value">
                      {formatNumber(r.totalElement)} <span className="cmp-kpi-unit">kg</span>
                    </div>
                    {isBest && <div className="cmp-badge-best">✓ Most sustainable</div>}
                  </div>

                  {/* Mini bars: A1–A3 vs A4 normalized */}
                  <MiniBars rows={rows} current={r} />

                  {/* Grid of details */}
                  <div className="cmp-details">
                    <Row label="A1–A3 (per m³)">{formatNumber(r.co2ePerM3_A1A3)} kg</Row>
                    <Row label="A4 transport">{formatNumber(r.a4Transport)} kg</Row>

                    <Row label="Dosage used">
                      {dosageEditable ? (
                        <input
                          className="input"
                          type="number"
                          inputMode="numeric"
                          min={0}
                          step={1}
                          value={String(dosageValue)}
                          onChange={(e)=> onPerCementDosageChange!(r.cement.id, Number(e.target.value) || 0)}
                          onWheel={(e)=> (e.currentTarget as HTMLInputElement).blur()}
                          title="Edit dosage for this cement (kg/m³)"
                        />
                      ) : (
                        <span className="num-strong">{formatNumber(dosageValue)} kg/m³</span>
                      )}
                    </Row>

                    <Row label="EF (A1–A3)">{r.cement.co2e_per_kg_binder_A1A3.toFixed(3)} kg/kg</Row>
                    <Row label="Clinker %">{Math.round(r.cement.clinker_fraction * 100)}%</Row>
                    <Row label="Exposure compatibility">
                      {r.exposureCompatible ? '✅ Compatible' : '⚠️ Check exposure class'}
                    </Row>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </aside>
    </>
  )
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="cmp-row">
      <div className="cmp-row-label">{label}</div>
      <div className="cmp-row-value">{children}</div>
    </div>
  )
}

function MiniBars({ rows, current }: { rows: ResultRow[]; current: ResultRow }) {
  const max = Math.max(...rows.map(r => r.totalElement)) || 1
  const a1a3Pct = (current.co2ePerM3_A1A3 / current.totalElement) * 100
  const a4Pct = 100 - a1a3Pct
  const widthPct = (current.totalElement / max) * 100

  return (
    <div className="cmp-bars">
      <div className="cmp-bars-track">
        <div className="cmp-bars-total" style={{ width: `${widthPct}%` }}>
          <div className="cmp-bars-a1a3" style={{ width: `${a1a3Pct}%` }} />
          <div className="cmp-bars-a4" style={{ width: `${a4Pct}%` }} />
        </div>
      </div>
      <div className="cmp-bars-legend small">
        <span className="chip" style={{ background:'#eef2ff' }}>A1–A3</span>
        <span className="chip" style={{ background:'#fef3c7' }}>A4</span>
      </div>
    </div>
  )
}
