import React, { useMemo, useState } from 'react'
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

  comparedIds?: string[]
  onToggleCompare?: (cementId: string) => void
}

/** Stacked header: label + (unit below). `align` controls text alignment. */
function ThStack({
  k, label, unit, sortKey, sortDir, onSortChange, help, align = 'left',
}: {
  k: SortKey
  label: string
  unit?: string
  sortKey: SortKey
  sortDir: 'asc' | 'desc'
  onSortChange: (k: SortKey) => void
  help?: string
  align?: 'left' | 'right' | 'center'
}) {
  const active = sortKey === k
  return (
    <th
      onClick={() => onSortChange(k)}
      style={{ cursor: 'pointer', whiteSpace: 'nowrap', textAlign: align }}
    >
      <div className="th-stack">
        <div className="th-row">
          <span className="th-label">{label}</span>
          {help && <Tooltip text={help} portal />}
          {active && <span className="sort-caret">{sortDir === 'asc' ? ' ▲' : ' ▼'}</span>}
        </div>
        {unit && <div className="th-unit small">{unit}</div>}
      </div>
    </th>
  )
}

/** SCM/acronym -> friendly explanation used in tag tooltips */
function tagHelp(tag: string): string {
  const t = tag.toLowerCase().replace(/\s+/g, '')
  if (t === 'opc') return 'OPC: Ordinary Portland Cement — no SCMs, high clinker.'
  if (t === 'slag' || t === 's') return 'S = Slag (GGBFS): SCM that reduces clinker & GWP.'
  if (t === 'flyash' || t === 'v' || t === 'fly') return 'V = Fly ash: Pozzolanic SCM; can lower embodied carbon.'
  if (t === 'pozzolana' || t === 'p') return 'P = Pozzolana: Natural/artificial pozzolan; reduces clinker.'
  if (t === 'limestone' || t === 'll' || t === 'limestonefiller') return 'LL = Limestone filler: Inert filler; lowers clinker share.'
  if (t === 'calcinedclay' || t === 'cc' || t === 'lc3') return 'CC = Calcined clay: High reactivity; enables major clinker cuts.'
  if (t === 'composite' || t === 'blend' || t === 'compos') return 'Composite: Blend of SCMs (e.g., S, V, P, LL, CC).'
  return `Tag: ${tag}`
}

export default function ResultsTable(props: Props) {
  const {
    rows, pageSize, onPageSize,
    sortKey, sortDir, onSortChange,
    search, onSearch,
    scope, onScope,
    onExport,
    onRowClick, selectedId,
    bestId, baselineId,
    dosageMode, perCementDosage, onPerCementDosageChange,
    comparedIds, onToggleCompare,
  } = props

  const [collapsed, setCollapsed] = useState(false)

  const headerHelp = {
    clinker:   'Clinker fraction; lower tends to reduce GWP.',
    ef:        'Embodied carbon of binder A1–A3 (kg CO₂ per kg).',
    dosage:    'Binder dosage per m³ of concrete (kg/m³).',
    a1a3:      'A1–A3 per m³ = dosage × EF.',
    a4:        'A4 for the element = distance × transport EF × volume.',
    total:     'A1–A3 per element + (optional) A4.',
    reduction: 'Reduction vs worst OPC EF (baseline).',
  } as const

  const pageRows = useMemo(() => rows.slice(0, Math.max(1, pageSize)), [rows, pageSize])

  const worstNonBaselineId = useMemo(() => {
    const pool = rows.filter(r => r.cement.id !== baselineId)
    if (!pool.length) return undefined
    const worst = pool.reduce((m, r) => (r.gwpReductionPct < m.gwpReductionPct ? r : m), pool[0])
    return worst.cement.id
  }, [rows, baselineId])

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

      {/* Table card with collapse control */}
      <div className="card">
        <div className="card-head" style={{ marginBottom: 6 }}>
          <div className="app-chip">Results</div>
          <button
            type="button"
            className="collapse-btn"
            onClick={() => setCollapsed(v => !v)}
            aria-expanded={!collapsed}
            aria-controls="results-table"
            title={collapsed ? 'Show table' : 'Hide table'}
          >
            <span className="collapse-text">{collapsed ? 'Show' : 'Hide'}</span>
            <span className={`chev ${collapsed ? '' : 'open'}`} aria-hidden>▾</span>
          </button>
        </div>

        {!collapsed && (
          <>
            <div id="results-table" className="table-scroll">
              <table className="table">
                <thead>
                  <tr>
                    <th className="th-center" style={{ width: 40 }} aria-label="Compare column" />
                    <ThStack k="cement"  label="Cement"                 sortKey={sortKey} sortDir={sortDir} onSortChange={onSortChange} />
                    <ThStack k="clinker" label="Clinker" unit="%"       sortKey={sortKey} sortDir={sortDir} onSortChange={onSortChange} help={headerHelp.clinker} align="right" />
                    <ThStack k="ef"      label="EF"      unit="kg CO₂/kg" sortKey={sortKey} sortDir={sortDir} onSortChange={onSortChange} help={headerHelp.ef} align="right" />
                    <ThStack k="dosage"  label="Dosage"  unit="kg/m³"   sortKey={sortKey} sortDir={sortDir} onSortChange={onSortChange} help={headerHelp.dosage} align="right" />
                    <ThStack k="a1a3"    label="CO₂e A1–A3" unit="kg/m³" sortKey={sortKey} sortDir={sortDir} onSortChange={onSortChange} help={headerHelp.a1a3} align="right" />
                    <ThStack k="a4"      label="A4"      unit="kg"      sortKey={sortKey} sortDir={sortDir} onSortChange={onSortChange} help={headerHelp.a4} align="right" />
                    <ThStack k="total"   label="Total CO₂ element" unit="kg" sortKey={sortKey} sortDir={sortDir} onSortChange={onSortChange} help={headerHelp.total} align="right" />
                    <ThStack k="reduction" label="Δ vs baseline" sortKey={sortKey} sortDir={sortDir} onSortChange={onSortChange} help={headerHelp.reduction} align="right" />
                  </tr>
                </thead>

                <tbody>
                  {pageRows.map(r => {
                    const id = r.cement.id
                    const inCompare = (comparedIds ?? []).includes(id)
                    const isBest  = id === bestId
                    const isBase  = id === baselineId
                    const isWorst = id === worstNonBaselineId
                    const dim     = !r.exposureCompatible

                    // Soft background tint (no clipping issues)
                    let rowStyle: React.CSSProperties = {}
                    if (isBase)        rowStyle = { background: 'rgba(239,68,68,0.06)' }
                    else if (isWorst)  rowStyle = { background: 'rgba(245,158,11,0.06)' }
                    else if (isBest)   rowStyle = { background: 'rgba(16,185,129,0.06)' }

                    const leftStripe = isBest ? '#10b981' : (isBase ? '#ef4444' : (isWorst ? '#f59e0b' : '#e5e7eb'))

                    // Pill logic (includes Baseline)
                    const pct = r.gwpReductionPct
                    let pill: JSX.Element
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
                    const dosageValue = dosageEditable ? (perCementDosage?.[id] ?? r.dosageUsed) : r.dosageUsed

                    return (
                      <tr
                        key={id}
                        className={['tr-elevated', selectedId === id ? 'tr-selected' : '', dim ? 'row-dim' : ''].join(' ').trim()}
                        onClick={() => onRowClick?.(id)}
                        style={{ ...rowStyle, cursor: onRowClick ? 'pointer' : 'default', borderLeft: `4px solid ${leftStripe}` }}
                      >
                        {/* Compare toggle */}
                        <td className="td-center" onClick={(e) => e.stopPropagation()}>
                          <CompareToggle
                            selected={inCompare}
                            onToggle={() => onToggleCompare?.(id)}
                            title={inCompare ? 'In compare' : 'Add to compare'}
                          />
                        </td>

                        {/* Cement name + SCM tags with portal tooltips */}
                        <td>
                          <div style={{ fontWeight: 600 }}>{r.cement.cement_type}</div>
                          {(r.tags?.length ?? 0) > 0 && (
                            <div className="small" style={{ display:'flex', gap:6, marginTop: 4, flexWrap:'wrap' }}>
                              {r.tags!.map(t => (
                                <Tooltip key={t} text={tagHelp(t)} portal>
                                  <span className="chip">{t}</span>
                                </Tooltip>
                              ))}
                            </div>
                          )}
                        </td>

                        {/* NUMERIC COLUMNS — RIGHT ALIGNED */}
                        <td className="num-strong" style={{ whiteSpace:'nowrap', textAlign:'right' }}>
                          {Math.round(r.cement.clinker_fraction * 100)}%
                        </td>
                        <td className="num-strong" style={{ textAlign:'right' }}>
                          {Number(r.cement.co2e_per_kg_binder_A1A3).toFixed(3)}
                        </td>
                        <td style={{ whiteSpace:'nowrap', textAlign:'right' }}>
                          {dosageEditable ? (
                            <input
                              className="input sm"
                              type="number"
                              min={0}
                              value={String(dosageValue)}
                              onClick={(e) => e.stopPropagation()}
                              onChange={(e) => onPerCementDosageChange!(id, Number(e.target.value) || 0)}
                              title="Edit dosage for this cement (kg/m³)"
                            />
                          ) : (
                            <span className="num-strong">{formatNumber(dosageValue)}</span>
                          )}
                        </td>
                        <td className="num-strong" style={{ textAlign:'right' }}>{formatNumber(r.co2ePerM3_A1A3)}</td>
                        <td className="num-strong" style={{ textAlign:'right' }}>{formatNumber(r.a4Transport)}</td>
                        <td className="num-strong" style={{ textAlign:'right' }}>{formatNumber(r.totalElement)}</td>
                        <td style={{ textAlign:'right' }}>{pill}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            <div className="table-footer" style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <div className="footer">Showing {formatNumber(pageRows.length)} of {formatNumber(rows.length)} results</div>
              <div className="pager" style={{ display:'flex', gap:8 }}>
                <button className="button" onClick={() => onPageSize(Math.max(25, pageSize - 25))} disabled={pageSize <= 25}>–25</button>
                <button className="button" onClick={() => onPageSize(pageSize + 25)}>+25</button>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  )
}
