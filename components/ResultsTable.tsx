import React, { useMemo } from 'react'
import { ResultRow } from '../lib/types'
import { formatNumber } from '../lib/calc'

type Props = {
  rows: ResultRow[]

  // Sorting
  sortKey: 'total' | 'a1a3' | 'ef' | 'clinker' | 'dosage'
  sortDir: 'asc' | 'desc'
  onSortChange: (key: Props['sortKey']) => void

  // View & search
  view: 'all' | 'compatible'
  onViewChange: (v: Props['view']) => void
  search: string
  onSearchChange: (v: string) => void

  // Compare controls
  compared: Set<string>
  onToggleCompare: (id: string) => void

  // CSV export
  onExportCsv?: () => void

  // Baseline
  baselineId?: string
  baselineEf?: number
  baselineLabel?: string

  // Legacy (unused but kept)
  pageSize: number
  onPageSize: (n: number) => void
}

function headerHelp(text: string) {
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
    baselineId,
  } = props

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

  const visible = sorted

  const worstNonBaselineId = useMemo(() => {
    const pool = visible.filter(r => r.cement.id !== baselineId)
    if (!pool.length) return undefined
    const worst = pool.reduce((m, r) => (r.gwpReductionPct < m.gwpReductionPct ? r : m), pool[0])
    return worst.cement.id
  }, [visible, baselineId])

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
      {/* Toolbar */}
      <div className="toolbar-grid" style={{ gridTemplateColumns: '1fr 200px 120px' }}>
        <input
          className="input"
          type="text"
          placeholder="Search cement name, notes, tags…"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
        />
        <select className="select" value={view} onChange={(e) => onViewChange(e.target.value as Props['view'])}>
          <option value="all">All rows</option>
          <option value="compatible">Compatible only</option>
        </select>
        <button className="button" onClick={() => onExportCsv?.()}>Export CSV</button>
      </div>

      <div className="table-scroll">
        <table className="table" role="table" aria-label="Cement results table">
          <thead>
            <tr>
              <th style={{ textAlign: 'left' }}>Cement</th>
              {th('Clinker', '%', 'clinker')}
              <th className="th-center">
                <span className="th-stack">
                  <span className="th-row">
                    <span className="th-label">EF</span>{headerHelp('Binder A1–A3 emission factor')}
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
              {/* A4: cement-only formula */}
              <th className="th-center">
                <span className="th-stack">
                  <span className="th-row">
                    <span className="th-label">A4</span>
                    {headerHelp('A4cement = distance × transport EF (kg CO₂/kg·km) × dosage × volume')}
                  </span>
                  <span className="th-unit small">kg</span>
                </span>
              </th>
              <th className="th-center">
                <span className="th-stack">
                  <span className="th-row">
                    <span className="th-label">Total CO₂ element</span>{headerHelp('A1–A3 × volume + A4cement')}
                  </span>
                  <span className="th-unit small">kg</span>
                </span>
              </th>
              <th className="th-center">Δ vs baseline</th>
              <th className="th-center" aria-label="Compare column">Compare</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((r) => {
              const isBaseline = r.cement.id === baselineId
              const rowTint = isBaseline ? 'row-baseline' : (r.gwpReductionPct >= 20 ? 'row-best' : '')
              const inCompare = compared.has(r.cement.id)

              return (
                <tr key={r.cement.id} className={rowTint}>
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

                  <td className="td-center">{Math.round(r.cement.clinker_fraction * 100)}%</td>
                  <td className="td-center">{r.cement.co2e_per_kg_binder_A1A3.toFixed(3)}</td>
                  <td className="td-center">{formatNumber(r.dosageUsed)}</td>
                  <td className="td-center">{formatNumber(r.co2ePerM3_A1A3)}</td>
                  <td className="td-center">{formatNumber(r.a4Transport)}</td>
                  <td className="td-center"><strong className="num-strong">{formatNumber(r.totalElement)}</strong></td>
                  <td className="td-center">
                    <PillDelta pct={r.gwpReductionPct} isBaseline={isBaseline} />
                  </td>
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

      <div className="table-footer">
        <div className="small">Showing {visible.length} of {rows.length} results</div>
        <div />
      </div>
    </div>
  )
}
