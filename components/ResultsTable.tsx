import React from 'react'
import { ResultRow } from '../lib/types'

type SortKey =
  | 'cement'
  | 'strength'
  | 'clinker'
  | 'ef'
  | 'dosage'
  | 'a1a3'
  | 'a4'
  | 'total'
  | 'reduction'

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
}

export default function ResultsTableToolbar(props: Props) {
  const {
    rows, pageSize, onPageSize,
    sortKey, sortDir, onSortChange,
    search, onSearch,
    scope, onScope,
    onExport, onRowClick, selectedId
  } = props

  return (
    <div className="table-toolbar">
      <div className="toolbar-left">
        <input
          className="input"
          placeholder="Search cement name…"
          value={search}
          onChange={e => onSearch(e.target.value)}
        />
        <select
          className="select"
          value={scope}
          onChange={e => onScope(e.target.value as Scope)}
          title="Row filter"
          aria-label="Row filter"
        >
          <option value="all">All rows</option>
          <option value="compatible">Compatible only</option>
          <option value="common">Most common</option>
        </select>
      </div>
      <div className="toolbar-right">
        <select
          className="select"
          value={pageSize}
          onChange={e => onPageSize(parseInt(e.target.value, 10))}
          aria-label="Rows per page"
          title="Rows per page"
        >
          <option value={10}>10/page</option>
          <option value={20}>20/page</option>
          <option value={50}>50/page</option>
          <option value={100}>100/page</option>
        </select>
        <button className="btn" onClick={onExport}>Export CSV</button>
      </div>

      {/* Table */}
      <div className="table-scroll">
        <table className="table">
          <thead>
            <tr>
              <Th k="cement" label="Cement" sortKey={sortKey} sortDir={sortDir} onSortChange={onSortChange} />
              <Th k="strength" label="Strength" sortKey={sortKey} sortDir={sortDir} onSortChange={onSortChange} />
              <Th k="clinker" label="Clinker" sortKey={sortKey} sortDir={sortDir} onSortChange={onSortChange} />
              <Th k="ef" label="EF (kgCO₂/kg)" sortKey={sortKey} sortDir={sortDir} onSortChange={onSortChange} />
              <Th k="dosage" label="Dosage (kg/m³)" sortKey={sortKey} sortDir={sortDir} onSortChange={onSortChange} />
              <Th k="a1a3" label="CO₂e A1–A3 (kg/m³)" sortKey={sortKey} sortDir={sortDir} onSortChange={onSortChange} />
              <Th k="a4" label="A4 (kg)" sortKey={sortKey} sortDir={sortDir} onSortChange={onSortChange} />
              <Th k="total" label="Total element (kg)" sortKey={sortKey} sortDir={sortDir} onSortChange={onSortChange} />
              <Th k="reduction" label="Δ vs baseline" sortKey={sortKey} sortDir={sortDir} onSortChange={onSortChange} />
            </tr>
          </thead>
          <tbody>
            {rows.map(r => {
              const isSel = selectedId === r.cement.id
              return (
                <tr key={r.cement.id} className={isSel ? 'tr-selected' : undefined} onClick={() => onRowClick?.(r.cement.id)}>
                  <td>
                    <div className="cell-title">
                      <div className="title">{r.cement.cement_type}</div>
                      <div className="subtitle">{r.cement.scms.length ? r.cement.scms.map(s => s.type).join('+') : 'OPC'}</div>
                    </div>
                  </td>
                  <td>{r.cement.strength_class}</td>
                  <td>{Math.round(r.cement.clinker_fraction * 100)}%</td>
                  <td>{r.cement.co2e_per_kg_binder_A1A3.toFixed(3)}</td>
                  <td>{Math.round(r.dosageUsed)}</td>
                  <td>{Math.round(r.co2ePerM3_A1A3)}</td>
                  <td>{Math.round(r.a4Transport)}</td>
                  <td>{Math.round(r.totalElement)}</td>
                  <td>{r.gwpReductionPct >= 0 ? `↓ ${r.gwpReductionPct.toFixed(0)}%` : `↑ ${Math.abs(r.gwpReductionPct).toFixed(0)}%`}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
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
    >
      {label}
      {active ? (sortDir === 'asc' ? ' ▲' : ' ▼') : ''}
    </th>
  )
}
