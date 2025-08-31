import React, { useMemo } from 'react'
import { ResultRow, InputsState } from '../lib/types'

type SortKey =
  | 'cement' | 'strength' | 'clinker' | 'ef' | 'dosage' | 'a1a3' | 'a4' | 'total' | 'reduction'
type Scope = 'all' | 'compatible' | 'common'

const SCM_MEANINGS: Record<string, string> = {
  S: 'GGBS / Slag: improves chloride resistance & lowers CO₂.',
  V: 'Fly ash: moderates heat; slower early strength; CO₂ cut.',
  P: 'Natural pozzolana: long-term strength; CO₂ cut.',
  LL: 'High-purity limestone: workability & modest CO₂ cut.',
  CC: 'Calcined clay: strong CO₂ cut when blended with limestone.',
  OPC: 'Ordinary Portland cement (no SCMs).',
}

interface Props {
  rows: ResultRow[]
  pageSize: number
  onPageSize: (n: number) => void
  sortKey: SortKey
  sortDir: 'asc' | 'desc'
  onSortChange: (k: SortKey) => void
  search: string
  onSearch: (s: string) => void
  scope: Scope
  onScope: (s: Scope) => void
  onExport: () => void
  onRowClick?: (id: string) => void
  selectedId?: string | null
  bestId?: string
  baselineId?: string
  dosageMode?: InputsState['dosageMode']
  perCementDosage?: Record<string, number>
  onPerCementDosageChange?: (cementId: string, val: number) => void
}

export default function ResultsTable({
  rows, pageSize, onPageSize,
  sortKey, sortDir, onSortChange,
  search, onSearch,
  scope, onScope,
  onExport, onRowClick, selectedId,
  bestId, baselineId,
  dosageMode, perCementDosage, onPerCementDosageChange
}: Props) {

  // pick a single worst (closest to baseline) among non-baseline rows
  const worstNonBaselineId = useMemo(() => {
    const pool = rows.filter(r => r.cement.id !== baselineId)
    if (!pool.length) return undefined
    // smaller reduction% is worse (negatives are even worse)
    const worst = pool.reduce((m, r) => (r.gwpReductionPct < m.gwpReductionPct ? r : m), pool[0])
    return worst.cement.id
  }, [rows, baselineId])

  return (
    <div className="card">
      {/* Toolbar */}
      <div className="toolbar-grid">
        <input className="input" placeholder="Search cement name…" value={search}
               onChange={e => onSearch(e.target.value)} aria-label="Search cement" />
        <select className="select" value={scope} onChange={e => onScope(e.target.value as Scope)}>
          <option value="all">All rows</option>
          <option value="compatible">Compatible only</option>
          <option value="common">Most common</option>
        </select>
        <select className="select" value={pageSize}
                onChange={e => onPageSize(parseInt(e.target.value,10))}>
          <option value={10}>10/page</option><option value={20}>20/page</option>
          <option value={50}>50/page</option><option value={100}>100/page</option>
        </select>
        <button className="btn" onClick={onExport}>Export CSV</button>
      </div>

      {/* Table */}
      <div className="table-scroll">
        <table className="table">
          <thead>
            <tr>
              <Th k="cement" label="Cement" sortKey={sortKey} sortDir={sortDir} onSortChange={onSortChange} />
              <Th
                k="strength" label="Strength" sortKey={sortKey} sortDir={sortDir} onSortChange={onSortChange}
                info="EN 197 strength class (e.g., 32.5N, 42.5R)."
              />
              <Th
                k="clinker" label="Clinker" sortKey={sortKey} sortDir={sortDir} onSortChange={onSortChange}
                info="Estimated clinker fraction of the cement."
              />
              <Th
                k="ef" label="EF (kgCO₂/kg)" sortKey={sortKey} sortDir={sortDir} onSortChange={onSortChange}
                info="Emission factor of the binder (A1–A3), kg CO₂ per kg of cement."
              />
              <Th
                k="dosage" label="Dosage (kg/m³)" sortKey={sortKey} sortDir={sortDir} onSortChange={onSortChange}
                info="Binder mass per cubic metre of concrete."
              />
              <Th
                k="a1a3" label="CO₂e A1–A3 (kg/m³)" sortKey={sortKey} sortDir={sortDir} onSortChange={onSortChange}
                info="Per-m³ emissions from materials & manufacturing, i.e. dosage × EF."
              />
              <Th
                k="a4" label="A4 (kg)" sortKey={sortKey} sortDir={sortDir} onSortChange={onSortChange}
                info="Transport emissions for your distance × volume (if enabled)."
              />
              <Th
                k="total" label="Total element (kg)" sortKey={sortKey} sortDir={sortDir} onSortChange={onSortChange}
                info="A1–A3 × element volume + A4 transport."
              />
              <Th
                k="reduction" label="Δ vs baseline" sortKey={sortKey} sortDir={sortDir} onSortChange={onSortChange}
                info="Percent improvement vs the worst OPC baseline (bigger is better)."
              />
            </tr>
          </thead>

          <tbody>
            {rows.map(r => {
              const isSel = selectedId === r.cement.id
              const isBest = r.cement.id === bestId
              const isBase = r.cement.id === baselineId
              const isWorst = r.cement.id === worstNonBaselineId
              const dim = !r.exposureCompatible

              // Row tints: baseline strong red, worst light red, best light green, others neutral
              let rowStyle: React.CSSProperties = {}
              if (isBase) {
                rowStyle = { boxShadow: 'inset 0 0 0 9999px rgba(239,68,68,0.16)', borderColor: '#fecaca' }
              } else if (isWorst) {
                rowStyle = { boxShadow: 'inset 0 0 0 9999px rgba(239,68,68,0.08)', borderColor: '#fecaca' }
              } else if (isBest) {
                rowStyle = { boxShadow: 'inset 0 0 0 9999px rgba(16,185,129,0.08)', borderColor: '#a7f3d0' }
              }

              const trClass = ['tr-elevated', isSel ? 'tr-selected' : '', dim ? 'row-dim' : ''].join(' ').trim()

              const scmBadge = r.cement.scms.length ? r.cement.scms.map(s => s.type) : ['OPC']
              const pct = r.gwpReductionPct
              const pillClass =
                isBase ? 'pill pill-red' :
                pct <= 0 ? 'pill pill-red' :
                pct <= 10 ? 'pill pill-amber' :
                pct <= 20 ? 'pill pill-green' : 'pill pill-deepgreen'

              const showEditor = dosageMode === 'perCement'
              const curOverride = perCementDosage?.[r.cement.id]

              return (
                <tr key={r.cement.id}
                    className={trClass}
                    onClick={() => onRowClick?.(r.cement.id)}
                    style={{ borderLeft: `6px solid ${isBest ? '#10b981' : (isBase ? '#ef4444' : '#e5e7eb')}`, ...rowStyle }}>
                  <td>
                    <div className="cell-title">
                      <div className="title">{r.cement.cement_type}</div>
                      <div className="subtitle">
                        {scmBadge.map((t, i) => {
                          const meaning = SCM_MEANINGS[t] ?? t
                          return (
                            <span key={i} className="tag tooltip-wrapper" aria-label={meaning}>
                              <span>{t}</span>
                              <span className="tooltip-box tooltip-right">{meaning}</span>
                            </span>
                          )
                        })}
                      </div>
                    </div>
                  </td>

                  <td><span className="badge">{r.cement.strength_class}</span></td>
                  <td>{Math.round(r.cement.clinker_fraction * 100)}%</td>
                  <td>{r.cement.co2e_per_kg_binder_A1A3.toFixed(3)}</td>

                  <td>
                    {showEditor ? (
                      <input
                        className="input sm"
                        style={{ width: 88 }}
                        type="number" min={200} max={600} step={5}
                        value={curOverride ?? Math.round(r.dosageUsed)}
                        onChange={(e) => onPerCementDosageChange?.(r.cement.id, Number(e.target.value))}
                        onClick={(e)=>e.stopPropagation()}
                      />
                    ) : (
                      Math.round(r.dosageUsed)
                    )}
                  </td>

                  <td>{Math.round(r.co2ePerM3_A1A3)}</td>
                  <td>{Math.round(r.a4Transport)}</td>
                  <td className="num-strong">{Math.round(r.totalElement)}</td>

                  <td>
                    <span className={pillClass}>
                      {isBase ? 'Baseline' : (pct >= 0 ? `↓ ${pct.toFixed(0)}%` : `↑ ${Math.abs(pct).toFixed(0)}%`)}
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <div className="small" style={{ color: '#64748b', marginTop: 6 }}>
        Showing <b>{rows.length > pageSize ? pageSize : rows.length}</b> of {rows.length} results
      </div>
    </div>
  )
}

/* ---------- header cell with sort + info ---------- */
function Th({
  k, label, sortKey, sortDir, onSortChange, info
}: {
  k: SortKey
  label: string
  sortKey: SortKey
  sortDir: 'asc' | 'desc'
  onSortChange: (k: SortKey) => void
  info?: string
}) {
  const active = sortKey === k
  return (
    <th className={active ? `th-sort th-${sortDir}` : 'th-sort'} role="button" tabIndex={0}
        onClick={() => onSortChange(k)}>
      <span className="th-label">{label}</span>
      {info && (
        <span
          className="tooltip-wrapper th-help"
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
          aria-label={info}
        >
          <span className="tooltip-icon">i</span>
          <span className="tooltip-box tooltip-right">{info}</span>
        </span>
      )}
      <span className="sort-caret">{active ? (sortDir === 'asc' ? '▲' : '▼') : ''}</span>
    </th>
  )
}
