// components/ResultsTable.tsx
import React from 'react'
import { ResultRow, InputsState } from '../lib/types'

type SortKey =
  | 'cement' | 'strength' | 'clinker' | 'ef' | 'dosage' | 'a1a3' | 'a4' | 'total' | 'reduction'
type Scope = 'all' | 'compatible' | 'common'

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
  /** NEW: to enable per-cement dosage editing */
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
              <Th k="cement" label="Cement" sortKey={sortKey} sortDir={sortDir} onSortChange={onSortChange}/>
              <Th k="strength" label="Strength" sortKey={sortKey} sortDir={sortDir} onSortChange={onSortChange}/>
              <Th k="clinker" label="Clinker" sortKey={sortKey} sortDir={sortDir} onSortChange={onSortChange}/>
              <Th k="ef" label="EF (kgCO₂/kg)" sortKey={sortKey} sortDir={sortDir} onSortChange={onSortChange}/>
              <Th k="dosage" label="Dosage (kg/m³)" sortKey={sortKey} sortDir={sortDir} onSortChange={onSortChange}/>
              <Th k="a1a3" label="CO₂e A1–A3 (kg/m³)" sortKey={sortKey} sortDir={sortDir} onSortChange={onSortChange}/>
              <Th k="a4" label="A4 (kg)" sortKey={sortKey} sortDir={sortDir} onSortChange={onSortChange}/>
              <Th k="total" label="Total element (kg)" sortKey={sortKey} sortDir={sortDir} onSortChange={onSortChange}/>
              <Th k="reduction" label="Δ vs baseline" sortKey={sortKey} sortDir={sortDir} onSortChange={onSortChange}/>
            </tr>
          </thead>
          <tbody>
            {rows.map(r => {
              const isSel = selectedId === r.cement.id
              const isBest = r.cement.id === bestId
              const isBase = r.cement.id === baselineId
              const dim = !r.exposureCompatible

              // left color stripe based on reduction
              const pct = r.gwpReductionPct
              const stripe =
                isBase ? '#ef4444' :
                pct <= 0 ? '#ef4444' :
                pct <= 10 ? '#f59e0b' :
                pct <= 20 ? '#22c55e' : '#10b981'

              const trClass = [
                'tr-elevated',
                isSel ? 'tr-selected' : '',
                isBest ? 'row-best' : '',
                isBase ? 'row-baseline' : '',
                dim ? 'row-dim' : ''
              ].join(' ').trim()

              const scmBadge = r.cement.scms.length
                ? r.cement.scms.map(s => s.type).join('+')
                : 'OPC'

              const pillClass =
                isBase || pct <= 0 ? 'pill pill-red' :
                pct <= 10 ? 'pill pill-amber' :
                pct <= 20 ? 'pill pill-green' : 'pill pill-deepgreen'

              const showEditor = dosageMode === 'perCement'
              const curOverride = perCementDosage?.[r.cement.id]

              return (
                <tr key={r.cement.id} className={trClass}
                    onClick={() => onRowClick?.(r.cement.id)}
                    style={{ boxShadow: '0 1px 0 0 rgba(0,0,0,0.02)',
                             borderLeft: `6px solid ${stripe}` }}>
                  <td>
                    <div className="cell-title">
                      <div className="title">{r.cement.cement_type}</div>
                      <div className="subtitle">
                        {scmBadge.split('+').map((t, i) => <span key={i} className="tag">{t}</span>)}
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
                        type="number"
                        min={200} max={600} step={5}
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
                      {pct >= 0 ? `↓ ${pct.toFixed(0)}%` : `↑ ${Math.abs(pct).toFixed(0)}%`}
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

function Th({
  k, label, sortKey, sortDir, onSortChange
}: {
  k: SortKey
  label: string
  sortKey: SortKey
  sortDir: 'asc' | 'desc'
  onSortChange: (k: SortKey) => void
}) {
  const active = sortKey === k
  return (
    <th
      onClick={() => onSortChange(k)}
      className={active ? `th-sort th-${sortDir}` : 'th-sort'}
      role="button"
      tabIndex={0}
    >
      {label}
      <span className="sort-caret">{active ? (sortDir === 'asc' ? '▲' : '▼') : ''}</span>
    </th>
  )
}
