import { useMemo } from 'react'
import { InputsState, ResultRow } from '../lib/types'
import { formatNumber } from '../lib/calc'

/** Keep local sort and scope aliases to match index.tsx usage */
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

function Th({
  label,
  sortKey,
  activeKey,
  dir,
  onSort,
  help,
}: {
  label: string
  sortKey: SortKey
  activeKey: SortKey
  dir: 'asc' | 'desc'
  onSort: (k: SortKey) => void
  help?: string
}) {
  const isActive = activeKey === sortKey
  return (
    <th
      className="th-sort"
      onClick={() => onSort(sortKey)}
      title={help}
      style={{ whiteSpace: 'nowrap' }}
    >
      <span className="th-label">{label}</span>
      <span className="sort-caret">{isActive ? (dir === 'asc' ? ' ▲' : ' ▼') : ''}</span>
      {help && (
        <span className="th-help">
          <span className="tooltip-icon">i</span>
          <span className="tooltip-right tooltip-box">{help}</span>
        </span>
      )}
    </th>
  )
}

export default function ResultsTable({
  rows,
  pageSize,
  onPageSize,
  sortKey,
  sortDir,
  onSortChange,
  search,
  onSearch,
  scope,
  onScope,
  onExport,
  onRowClick,
  selectedId,
  bestId,
  baselineId,
  dosageMode,
  perCementDosage,
  onPerCementDosageChange,
}: Props) {
  const totalCount = rows.length

  const headerHelp = {
    clinker: 'Clinker content by fraction; lower is typically better for GWP.',
    ef: 'Embodied carbon per kg of binder for A1–A3.',
    dosage: 'Binder dosage in kg per m³ of concrete.',
    a1a3: 'A1–A3 contribution per m³ (dosage × EF).',
    a4: 'Transport stage A4 for the whole element (distance × transport EF × volume).',
    total: 'A1–A3 per element + optional A4 transport.',
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
        <div className="view-banner">Showing {formatNumber(pageRows.length)} of {formatNumber(totalCount)} results</div>
      </div>

      {/* Table */}
      <div className="table-scroll">
        <table className="table">
          <thead>
            <tr>
              <Th label="Cement" sortKey="cement" activeKey={sortKey} dir={sortDir} onSort={onSortChange} />
              <Th label="Clinker" sortKey="clinker" activeKey={sortKey} dir={sortDir} onSort={onSortChange} help={headerHelp.clinker} />
              <Th label="EF (kgCO₂/kg)" sortKey="ef" activeKey={sortKey} dir={sortDir} onSort={onSortChange} help={headerHelp.ef} />
              <Th label="Dosage (kg/m³)" sortKey="dosage" activeKey={sortKey} dir={sortDir} onSort={onSortChange} help={headerHelp.dosage} />
              <Th label="CO₂e A1–A3 (kg/m³)" sortKey="a1a3" activeKey={sortKey} dir={sortDir} onSort={onSortChange} help={headerHelp.a1a3} />
              <Th label="A4 (kg)" sortKey="a4" activeKey={sortKey} dir={sortDir} onSort={onSortChange} help={headerHelp.a4} />
              {/* ✅ Renamed column */}
              <Th label="Total CO₂ element (kg)" sortKey="total" activeKey={sortKey} dir={sortDir} onSort={onSortChange} help={headerHelp.total} />
              <Th label="Δ vs baseline" sortKey="reduction" activeKey={sortKey} dir={sortDir} onSort={onSortChange} help={headerHelp.reduction} />
            </tr>
          </thead>
          <tbody>
            {pageRows.map((r) => {
              const isBest = bestId && r.cement.id === bestId
              const isBaseline = baselineId && r.cement.id === baselineId
              const isSelected = selectedId && r.cement.id === selectedId

              const rowClass = [
                'tr-elevated',
                isBest ? 'row-best' : '',
                isBaseline ? 'row-baseline' : '',
                isSelected ? 'tr-selected' : '',
              ].join(' ').trim()

              const dosageEditable =
                dosageMode === 'perCement' && !!onPerCementDosageChange

              const dosageValue =
                dosageEditable
                  ? (perCementDosage?.[r.cement.id] ?? r.dosageUsed)
                  : r.dosageUsed

              return (
                <tr
                  key={r.cement.id}
                  className={rowClass}
                  onClick={() => onRowClick?.(r.cement.id)}
                  style={{ cursor: onRowClick ? 'pointer' : 'default' }}
                >
                  <td className="cell-title">
                    <div className="title">{r.cement.cement_type}</div>
                    <div className="small subtitle">
                      {r.cement.strength_class} • {Math.round(r.cement.clinker_fraction * 100)}% clinker
                    </div>
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

                  {/* ✅ Formatted with thousands separators */}
                  <td className="num-strong">{formatNumber(r.totalElement)}</td>

                  <td>
                    {r.gwpReductionPct > 0 ? (
                      <span className="pill pill-green">↓ {Math.round(r.gwpReductionPct)}%</span>
                    ) : r.gwpReductionPct === 0 ? (
                      <span className="pill pill-amber">Baseline</span>
                    ) : (
                      <span className="pill pill-red">↑ {Math.abs(Math.round(r.gwpReductionPct))}%</span>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>

        <div className="table-footer">
          <div className="footer">Showing {formatNumber(pageRows.length)} of {formatNumber(totalCount)} results</div>
          <div className="pager">
            <button className="button" onClick={() => onPageSize(Math.max(1, pageSize - 25))} disabled={pageSize <= 25}>–25</button>
            <button className="button" onClick={() => onPageSize(pageSize + 25)}>+25</button>
          </div>
        </div>
      </div>
    </>
  )
}
