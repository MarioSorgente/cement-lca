// components/ResultsTable.tsx
import React, { useMemo } from 'react'
import { InputsState, ResultRow } from '../lib/types'
import { formatNumber } from '../lib/calc'
import Tooltip from './Tooltip'

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
}

const SCM_MEANINGS: Record<string, string> = {
  OPC: 'Ordinary Portland cement (no SCMs).',
  S:   'GGBS / Slag: improves chloride resistance & lowers CO₂.',
  V:   'Fly ash: moderates heat; slower early strength; CO₂ cut.',
  P:   'Natural pozzolana: long-term strength; CO₂ cut.',
  LL:  'High-purity limestone: workability & modest CO₂ cut.',
  CC:  'Calcined clay: strong CO₂ cut when blended with limestone.',
}

/** Header cell with unified tooltip + sorting */
function Th({
  k, label, sortKey, sortDir, onSortChange, help,
}: {
  k: SortKey
  label: string
  sortKey: SortKey
  sortDir: 'asc' | 'desc'
  onSortChange: (k: SortKey) => void
  help?: string
}) {
  const active = sortKey === k
  return (
    <th
      className="th-sort"
      onClick={() => onSortChange(k)}
      style={{ whiteSpace: 'nowrap', cursor: 'pointer' }}
    >
      <span className="th-label">{label}</span>
      {help && <Tooltip text={help} portal />} {/* use portal in headers */}
      <span className="sort-caret">{active ? (sortDir === 'asc' ? ' ▲' : ' ▼') : ''}</span>
    </th>
  )
}

export default function ResultsTable({
  rows, pageSize, onPageSize,
  sortKey, sortDir, onSortChange,
  search, onSearch,
  scope, onScope,
  onExport, onRowClick, selectedId,
  bestId, baselineId,
  dosageMode, perCementDosage, onPerCementDosageChange,
}: Props) {

  const worstNonBaselineId = useMemo(() => {
    const pool = rows.filter(r => r.cement.id !== baselineId)
    if (!pool.length) return undefined
    const worst = pool.reduce((m, r) => (r.gwpReductionPct < m.gwpReductionPct ? r : m), pool[0])
    return worst.cement.id
  }, [rows, baselineId])

  const headerHelp = {
    clinker:   'Clinker content by fraction; lower is typically better for GWP.',
    ef:        'Embodied carbon per kg of binder for A1–A3.',
    dosage:    'Binder dosage in kg per m³ of concrete.',
    a1a3:      'A1–A3 contribution per m³ (dosage × EF).',
    a4:        'Transport stage A4 for the whole element (distance × transport EF × volume).',
    total:     'A1–A3 per element + optional A4 transport.',
    reduction: 'Percent improvement vs baseline EF (worst OPC by default).',
  }

  const pageRows = useMemo(() => rows.slice(0, pageSize), [rows, pageSize])

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
          <select
            className="select"
            value={scope}
            onChange={(e) => onScope(e.target.value as Scope)}
          >
            <option value="all">All rows</option>
            <option value="compatible">Exposure-compatible</option>
            <option value="common">Common</option>
          </select>
          <select
            className="select"
            value={pageSize}
            onChange={(e) => onPageSize(Number(e.target.value))}
          >
            {[25, 50, 100, 250].map(n => (
              <option key={n} value={n}>{n}/page</option>
            ))}
          </select>
          <button className="btn" onClick={onExport}>Export CSV</button>
        </div>
        <div className="view-banner">
          Showing {formatNumber(pageRows.length)} of {formatNumber(rows.length)} results
        </div>
      </div>

      {/* Table */}
      <div className="table-scroll">
        <table className="table">
          <thead>
            <tr>
              <Th k="cement"    label="Cement"                 sortKey={sortKey} sortDir={sortDir} onSortChange={onSortChange} />
              <Th k="clinker"   label="Clinker"                sortKey={sortKey} sortDir={sortDir} onSortChange={onSortChange} help={headerHelp.clinker} />
              <Th k="ef"        label="EF (kgCO₂/kg)"          sortKey={sortKey} sortDir={sortDir} onSortChange={onSortChange} help={headerHelp.ef} />
              <Th k="dosage"    label="Dosage (kg/m³)"         sortKey={sortKey} sortDir={sortDir} onSortChange={onSortChange} help={headerHelp.dosage} />
              <Th k="a1a3"      label="CO₂e A1–A3 (kg/m³)"     sortKey={sortKey} sortDir={sortDir} onSortChange={onSortChange} help={headerHelp.a1a3} />
              <Th k="a4"        label="A4 (kg)"                sortKey={sortKey} sortDir={sortDir} onSortChange={onSortChange} help={headerHelp.a4} />
              <Th k="total"     label="Total CO₂ element (kg)" sortKey={sortKey} sortDir={sortDir} onSortChange={onSortChange} help={headerHelp.total} />
              <Th k="reduction" label="Δ vs baseline"          sortKey={sortKey} sortDir={sortDir} onSortChange={onSortChange} help={headerHelp.reduction} />
            </tr>
          </thead>

          <tbody>
            {pageRows.map(r => {
              const isSel   = selectedId === r.cement.id
              const isBest  = r.cement.id === bestId
              const isBase  = r.cement.id === baselineId
              const isWorst = r.cement.id === worstNonBaselineId
              const dim     = !r.exposureCompatible

              // Row tints
              let rowStyle: React.CSSProperties = {}
              if (isBase)        rowStyle = { boxShadow: 'inset 0 0 0 9999px rgba(239,68,68,0.10)', borderColor: '#fecaca' }
              else if (isWorst)  rowStyle = { boxShadow: 'inset 0 0 0 9999px rgba(245,158,11,0.10)', borderColor: '#f59e0b' }
              else if (isBest)   rowStyle = { boxShadow: 'inset 0 0 0 9999px rgba(16,185,129,0.10)', borderColor: '#a7f3d0' }

              const leftStripe = isBest ? '#10b981' : (isBase ? '#ef4444' : (isWorst ? '#f59e0b' : '#e5e7eb'))
              const trClass = ['tr-elevated', isSel ? 'tr-selected' : '', dim ? 'row-dim' : ''].join(' ').trim()

              // SCM chips (codes) with tooltip help — keep inline tooltip for simplicity
              const scmChips = (r.cement.scms?.length ? r.cement.scms.map(s => s.type) : ['OPC'])

              // Pill logic per legend
              const pct = r.gwpReductionPct
              let pill
              if (isBase) {
                pill = <span className="pill pill-red">Baseline</span>
              } else if (pct <= 0) {
                pill = <span className="pill pill-red">↑ {Math.abs(Math.round(pct))}%</span>
              } else if (pct <= 10) {
                pill = <span className="pill pill-amber">↓ {Math.round(pct)}%</span>
              } else if (pct <= 20) {
                pill = <span className="pill pill-green">↓ {Math.round(pct)}%</span>
              } else {
                pill = <span className="pill pill-deepgreen">↓ {Math.round(pct)}%</span>
              }

              const dosageEditable = dosageMode === 'perCement' && !!onPerCementDosageChange
              const dosageValue = dosageEditable
                ? (perCementDosage?.[r.cement.id] ?? r.dosageUsed)
                : r.dosageUsed

              return (
                <tr
                  key={r.cement.id}
                  className={trClass}
                  onClick={() => onRowClick?.(r.cement.id)}
                  style={{ ...rowStyle, cursor: onRowClick ? 'pointer' : 'default', borderLeft: `4px solid ${leftStripe}` }}
                >
                  <td className="cell-title">
                    <div className="title">{r.cement.cement_type}</div>

                    {scmChips.length > 0 && (
                      <div style={{ marginTop: 6 }}>
                        {scmChips.map(tag => (
                          <span key={tag} className="tag tooltip-wrapper" style={{ marginRight: 6, marginBottom: 4 }}>
                            {tag}
                            <span className="tooltip-box tooltip-right">
                              {SCM_MEANINGS[tag] ?? tag}
                            </span>
                          </span>
                        ))}
                      </div>
                    )}
                  </td>

                  <td className="num-strong">{Math.round(r.cement.clinker_fraction * 100)}%</td>
                  <td className="num-strong">{r.cement.co2e_per_kg_binder_A1A3.toFixed(3)}</td>
                  <td>
                    {dosageEditable ? (
                      <input
                        className="input sm"
                        type="number"
                        min={0}
                        value={String(dosageValue)}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) =>
                          onPerCementDosageChange!(r.cement.id, Number(e.target.value) || 0)
                        }
                        title="Edit dosage for this cement (kg/m³)"
                      />
                    ) : (
                      <span className="num-strong">{formatNumber(dosageValue)}</span>
                    )}
                  </td>
                  <td className="num-strong">{formatNumber(r.co2ePerM3_A1A3)}</td>
                  <td className="num-strong">{formatNumber(r.a4Transport)}</td>
                  <td className="num-strong">{formatNumber(r.totalElement)}</td>
                  <td>{pill}</td>
                </tr>
              )
            })}
          </tbody>
        </table>

        <div className="table-footer">
          <div className="footer">Showing {formatNumber(pageRows.length)} of {formatNumber(rows.length)} results</div>
          <div className="pager">
            <button className="button" onClick={() => onPageSize(Math.max(25, pageSize - 25))} disabled={pageSize <= 25}>–25</button>
            <button className="button" onClick={() => onPageSize(pageSize + 25)}>+25</button>
          </div>
        </div>
      </div>
    </>
  )
}
