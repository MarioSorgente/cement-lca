import React, { useMemo } from 'react'
import { ResultRow } from '../lib/types'
import { formatNumber } from '../lib/calc'

/** Keep the same props shape you already pass from index.tsx.
 *  pageSize/onPageSize are kept but unused (safe no-op) so nothing breaks upstream.
 */
type Props = {
  rows: ResultRow[]

  // Sorting
  sortKey: 'total' | 'a1a3' | 'ef' | 'clinker' | 'dosage'
  sortDir: 'asc' | 'desc'
  onSortChange: (key: Props['sortKey']) => void

  // View & search from parent (kept as-is)
  view: 'all' | 'compatible'
  onViewChange: (v: Props['view']) => void
  search: string
  onSearchChange: (v: string) => void

  // Compare controls (kept compact)
  compared: Set<string>
  onToggleCompare: (id: string) => void

  // CSV export — parent handles (uses inputs for assumptions)
  onExportCsv?: () => void

  // Baseline info (worst OPC)
  baselineId?: string
  baselineEf?: number
  baselineLabel?: string

  // Legacy, now ignored (kept only to avoid touching index.tsx)
  pageSize: number
  onPageSize: (n: number) => void
}

function headerHelp(text: string) {
  // Inline tooltip — matches your previous CSS (smaller “i” icon)
  return (
    <span className="tooltip-wrapper" aria-label={text}>
      <span className="tooltip-icon" style={{ width: 14, height: 14, lineHeight: '14px', fontSize: 10 }}>i</span>
      <div className="tooltip-box tooltip-right">{text}</div>
    </span>
  )
}

function PillDelta({ pct, isBaseline }: { pct: number; isBaseline: boolean }) {
  const text = isBaseline ? 'Baseline' : (pct >= 0 ? `↓ ${pct.toFixed(0)}%` : `↑ ${Math.abs(pct).toFixed(0)}%`)
  const cls = isBaseline
    ? 'pill pill-red'
    : pct >= 20
    ? 'pill pill-deepgreen'
    : pct >= 10
    ? 'pill pill-green'
    : pct >= 0
    ? 'pill pill-amber'
    : 'pill pill-red'
  return <span className={cls}>{text}</span>
}

export default function ResultsTable(props: Props) {
  const {
    rows,
    sortKey, sortDir, onSortChange,
    view, onViewChange,
    search, onSearchChange,
    compared, onToggleCompare,
    onExportCsv,
    baselineId, baselineEf, baselineLabel,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    pageSize, onPageSize, // kept for API compatibility (unused)
  } = props

  // Filter by view + search
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    const passSearch = (r: ResultRow) => {
      if (!q) return true
      const hay = [
        r.cement.cement_type,
        r.cement.notes ?? '',
        ...(r.tags ?? []),
      ].join(' ').toLowerCase()
      return hay.includes(q)
    }
    const passView = (r: ResultRow) => (view === 'all' ? true : r.exposureCompatible)
    return rows.filter(r => passView(r) && passSearch(r))
  }, [rows, search, view])

  // Sort
  const sorted = useMemo(() => {
    const get = (r: ResultRow) => {
      switch (sortKey) {
        case 'total': return r.totalElement
        case 'a1a3': return r.co2ePerM3_A1A3
        case 'ef': return r.cement.co2e_per_kg_binder_A1A3
        case 'clinker': return r.cement.clinker_fraction
        case 'dosage': return r.dosageUsed
      }
    }
    const s = [...filtered].sort((a, b) => {
      const av = get(a)
      const bv = get(b)
      return av === bv ? 0 : av < bv ? -1 : 1
    })
    return sortDir === 'asc' ? s : s.reverse()
  }, [filtered, sortKey, sortDir])

  // Always show ALL rows (pagination removed)
  const visible = sorted

  const worstNonBaselineId = useMemo(() => {
    const pool = visible.filter(r => r.cement.id !== baselineId)
    if (!pool.length) return undefined
    const worst = pool.reduce((m, r) => (r.gwpReductionPct < m.gwpReductionPct ? r : m), pool[0])
    return worst.cement.id
  }, [visible, baselineId])

  const baselineText = baselineEf
    ? `Baseline (worst OPC): ${baselineLabel ?? '—'} · EF ${baselineEf.toFixed(2)} kg/kg`
    : 'Baseline: not available'

  const th = (label: string, unit: string | null, key?: Props['sortKey']) => (
    <th
      className={key ? 'th-sort th-center' : 'th-center'}
      onClick={() => key && onSortChange(key)}
      title={key ? 'Sort' : undefined}
    >
      <span className="th-stack">
        <span className="th-row">
          <span className="th-label">{label}</span>
          {key && <span className="sort-caret">▾</span>}
        </span>
        {unit && <span className="th-unit small">{unit}</span>}
      </span>
    </th>
  )

  return (
    <div className="card">
      {/* Toolbar — search + view + export (no page-size) */}
      <div className="toolbar-grid" style={{ gridTemplateColumns: '1fr 200px 120px' }}>
        <input
          className="input"
          type="text"
          placeholder="Search cement name, notes, tags…"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
        />

        <select
          className="select"
          value={view}
          onChange={(e) => onViewChange(e.target.value as Props['view'])}
        >
          <option value="all">All rows</option>
          <option value="compatible">Compatible only</option>
        </select>

        <button className="button" onClick={() => onExportCsv?.()}>
          Export CSV
        </button>
      </div>

      <div className="small view-banner">{baselineText}</div>

      <div className="table-scroll">
        <table className="table" role="table" aria-label="Cement results table">
          <thead>
            <tr>
              <th style={{ textAlign: 'left' }}>Cement</th>
              {th('Clinker', '%', 'clinker')}
              <th className="th-center">
                <span className="th-stack">
                  <span className="th-row">
                    <span className="th-label">EF</span>{headerHelp('A1–A3 binder emission factor')}
                  </span>
                  <span className="th-unit small">kg CO₂/kg</span>
                </span>
              </th>
              {th('Dosage', 'kg/m³', 'dosage')}
              <th className="th-center">
                <span className="th-stack">
                  <span className="th-row">
                    <span className="th-label">CO₂e A1–A3</span>{headerHelp('Per m³ of concrete')}
                  </span>
                  <span className="th-unit small">kg/m³</span>
                </span>
              </th>
              {th('A4', 'kg', 'a1a3')}
              <th className="th-center">
                <span className="th-stack">
                  <span className="th-row">
                    <span className="th-label">Total CO₂ element</span>{headerHelp('A1–A3 (+A4) for your element')}
                  </span>
                  <span className="th-unit small">kg</span>
                </span>
              </th>
              <th className="th-center">
                <span className="th-row">
                  <span className="th-label">Δ vs baseline</span>{headerHelp('Reduction vs worst OPC baseline')}
                </span>
              </th>
              <th className="th-center" aria-label="Compare column">Compare</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((r) => {
              const isBaseline = r.cement.id === baselineId
              const isWorst = r.cement.id === worstNonBaselineId
              const rowTint = isBaseline ? 'row-baseline' : (r.gwpReductionPct >= 20 ? 'row-best' : '')
              const inCompare = compared.has(r.cement.id)

              return (
                <tr key={r.cement.id} className={rowTint}>
                  {/* Cement name + tags */}
                  <td>
                    <div className="cell-title">
                      <div className="title">{r.cement.cement_type}</div>
                      <div className="small subtitle" style={{ display:'flex', gap:6, flexWrap:'wrap', marginTop:6 }}>
                        {(r.tags ?? []).map(t => (
                          <span key={t} className="tag tooltip-wrapper">
                            {t}
                            <div className="tooltip-box tooltip-right" role="tooltip">
                              <strong style={{ display:'block', marginBottom:4 }}>Tag</strong>
                              {t === 'Slag' && <>Ground granulated blast-furnace slag (S)</>}
                              {t === 'Fly ash' && <>Class F fly ash (V)</>}
                              {t === 'Pozzolana' && <>Natural pozzolana (P)</>}
                              {t === 'Limestone' && <>Limestone filler (LL)</>}
                              {t === 'Calcined clay' && <>Calcined clay (CC)</>}
                              {t === 'Composite' && <>Blend of multiple SCMs</>}
                              {t === 'OPC' && <>Ordinary Portland Cement (no SCMs)</>}
                            </div>
                          </span>
                        ))}
                      </div>
                    </div>
                  </td>

                  {/* Numbers */}
                  <td className="td-center">{Math.round(r.cement.clinker_fraction * 100)}%</td>
                  <td className="td-center">{r.cement.co2e_per_kg_binder_A1A3.toFixed(3)}</td>
                  <td className="td-center">{formatNumber(r.dosageUsed)}</td>
                  <td className="td-center">{formatNumber(r.co2ePerM3_A1A3)}</td>
                  <td className="td-center">{formatNumber(r.a4Transport)}</td>
                  <td className="td-center"><strong className="num-strong">{formatNumber(r.totalElement)}</strong></td>
                  <td className="td-center">
                    <PillDelta pct={r.gwpReductionPct} isBaseline={isBaseline} />
                  </td>

                  {/* Compare toggle — compact */}
                  <td className="td-center">
                    <button
                      className={`cmp-tgl ${inCompare ? 'selected' : ''}`}
                      aria-pressed={inCompare}
                      aria-label={inCompare ? 'Remove from compare' : 'Add to compare'}
                      onClick={() => onToggleCompare(r.cement.id)}
                    />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Footer — no pager now */}
      <div className="table-footer">
        <div className="small">Showing {visible.length} of {rows.length} results</div>
        <div />
      </div>
    </div>
  )
}
