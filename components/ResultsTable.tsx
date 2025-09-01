// components/ResultsTable.tsx
import React, { useMemo } from 'react'
import { InputsState, ResultRow } from '../lib/types'
import { formatNumber } from '../lib/calc'
import Tooltip from './Tooltip'
import CompareToggle from './CompareToggle'

type SortKey =
  | 'cement' | 'strength' | 'clinker' | 'ef' | 'dosage' | 'a1a3' | 'a4' | 'total' | 'reduction'
type Scope = 'all' | 'compatible' | 'common'

type Props = {
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

  /* compare */
  comparedIds?: string[]
  onToggleCompare?: (cementId: string) => void
}

function Th({
  onClick, active, dir, children, help,
}: { onClick?: () => void; active?: boolean; dir?: 'asc'|'desc'; children: React.ReactNode; help?: string }) {
  return (
    <th onClick={onClick} title={help} style={{ cursor: onClick ? 'pointer' : 'default', whiteSpace:'nowrap' }}>
      {children}{' '}
      {active ? (dir === 'asc' ? '▲' : '▼') : null}
    </th>
  )
}

export default function ResultsTable({
  rows, pageSize, onPageSize,
  sortKey, sortDir, onSortChange,
  search, onSearch,
  scope, onScope,
  onExport,
  onRowClick, selectedId,
  bestId, baselineId,
  dosageMode, perCementDosage, onPerCementDosageChange,
  comparedIds, onToggleCompare,
}: Props) {
  const pageRows = useMemo(() => rows.slice(0, Math.max(1, pageSize)), [rows, pageSize])

  const headerHelp = {
    clinker:   'Clinker content by fraction; lower is typically better for GWP.',
    ef:        'Embodied carbon per kg of binder (A1–A3).',
    dosage:    'Binder dosage in kg per m³ of concrete.',
    a1a3:      'A1–A3 contribution per m³ (dosage × EF).',
    a4:        'Transport stage A4 for the whole element (distance × transport EF × volume).',
    total:     'A1–A3 per element + optional A4 transport.',
    reduction: 'Reduction vs OPC baseline EF (worst OPC).',
  } as const

  return (
    <>
      {/* Toolbar */}
      <div className="card" style={{ marginBottom: 8 }}>
        <div className="toolbar-grid">
          <input
            className="input"
            placeholder="Search cement name, notes, tags…"
            value={search}
            onChange={(e) => onSearch(e.target.value)}
          />
          <select className="select" value={scope} onChange={(e) => onScope(e.target.value as Scope)}>
            <option value="all">All rows</option>
            <option value="compatible">Exposure-compatible</option>
            <option value="common">Common</option>
          </select>
          <select className="select" value={pageSize} onChange={(e) => onPageSize(Number(e.target.value))}>
            {[25, 50, 100, 250].map(n => <option key={n} value={n}>{n}/page</option>)}
          </select>
          <button className="button" onClick={onExport}>Export CSV</button>
        </div>
      </div>

      {/* Table */}
      <div className="card">
        <table className="table">
          <thead>
            <tr>
              <th className="th-center" style={{ width: 40 }} aria-label="Compare column" />
              <Th onClick={() => onSortChange('cement')} active={sortKey==='cement'} dir={sortDir}>Cement</Th>
              <Th onClick={() => onSortChange('clinker')} active={sortKey==='clinker'} dir={sortDir} help={headerHelp.clinker}>Clinker</Th>
              <Th onClick={() => onSortChange('ef')} active={sortKey==='ef'} dir={sortDir} help={headerHelp.ef}>EF (kg CO₂/kg)</Th>
              <Th onClick={() => onSortChange('dosage')} active={sortKey==='dosage'} dir={sortDir} help={headerHelp.dosage}>Dosage</Th>
              <Th onClick={() => onSortChange('a1a3')} active={sortKey==='a1a3'} dir={sortDir} help={headerHelp.a1a3}>A1–A3</Th>
              <Th onClick={() => onSortChange('a4')} active={sortKey==='a4'} dir={sortDir} help={headerHelp.a4}>A4</Th>
              <Th onClick={() => onSortChange('total')} active={sortKey==='total'} dir={sortDir} help={headerHelp.total}>Total</Th>
              <Th onClick={() => onSortChange('reduction')} active={sortKey==='reduction'} dir={sortDir} help={headerHelp.reduction}>Δ vs baseline</Th>
            </tr>
          </thead>
          <tbody>
            {pageRows.map(r => {
              const id = r.cement.id
              const inCompare = (comparedIds ?? []).includes(id)
              const isBest = bestId === id
              const isBaseline = baselineId === id

              const rowStyle: React.CSSProperties = isBest
                ? { background:'#f0fdf4' }
                : isBaseline
                ? { background:'#fef2f2' }
                : {}

              return (
                <tr
                  key={id}
                  style={rowStyle}
                  className={onRowClick ? 'row-click' : undefined}
                  onClick={onRowClick ? () => onRowClick(id) : undefined}
                >
                  <td className="td-center" onClick={(e) => e.stopPropagation()}>
                    <CompareToggle
                      selected={inCompare}
                      onToggle={() => onToggleCompare?.(id)}
                      title={inCompare ? 'In compare' : 'Add to compare'}
                    />
                  </td>

                  <td>
                    <div style={{ fontWeight: 600 }}>{r.cement.cement_type}</div>
                    <div className="small" style={{ display:'flex', gap:6, marginTop: 4 }}>
                      {(r.tags ?? []).map(t => <span key={t} className="chip">{t}</span>)}
                    </div>
                  </td>

                  <td style={{ whiteSpace:'nowrap' }}>{Math.round(r.cement.clinker_fraction * 100)}%</td>
                  <td>{Number(r.cement.co2e_per_kg_binder_A1A3).toFixed(3)}</td>
                  <td style={{ whiteSpace:'nowrap' }}>
                    {typeof r.dosageUsed === 'number' ? Math.round(r.dosageUsed) : r.dosageUsed}
                  </td>
                  <td>{formatNumber(Math.round(r.co2ePerM3_A1A3))}</td>
                  <td>{formatNumber(Math.round(r.a4Transport))}</td>
                  <td>{formatNumber(Math.round(r.totalElement))}</td>

                  <td>
                    {r.gwpReductionPct === 0
                      ? <span className="chip chip-red">0%</span>
                      : r.gwpReductionPct > 20
                      ? <span className="chip chip-deepgreen">↓ {Math.round(r.gwpReductionPct)}%</span>
                      : r.gwpReductionPct > 10
                      ? <span className="chip chip-green">↓ {Math.round(r.gwpReductionPct)}%</span>
                      : r.gwpReductionPct > 0
                      ? <span className="chip chip-yellow">↓ {Math.round(r.gwpReductionPct)}%</span>
                      : <span className="chip chip-red">↑ {Math.abs(Math.round(r.gwpReductionPct))}%</span>
                    }
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>

        <div className="table-footer" style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <div className="footer">Showing {formatNumber(pageRows.length)} of {formatNumber(rows.length)} results</div>
          <div className="pager" style={{ display:'flex', gap:8 }}>
            <button className="button" onClick={() => onPageSize(Math.max(25, pageSize - 25))} disabled={pageSize <= 25}>–25</button>
            <button className="button" onClick={() => onPageSize(pageSize + 25)}>+25</button>
          </div>
        </div>
      </div>
    </>
  )
}
