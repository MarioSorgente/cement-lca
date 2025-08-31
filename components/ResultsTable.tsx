import { ResultRow, InputsState } from '../lib/types'
import { formatNumber } from '../lib/calc'

type SortKey = 'cement'|'strength'|'clinker'|'ef'|'dosage'|'a1a3'|'a4'|'total'
type SortDir = 'asc'|'desc'

export default function ResultsTable({
  rows, state, dosageOverrides, setDosageOverride, onDownload,
  bestId, opcBaselineId, sortKey, sortDir, onSortChange,
  // new controls
  search, onSearch, hideIncompatible, onToggleHideIncompatible,
  page, totalPages, onPageChange, pageSize, onPageSizeChange, totalCount
}: {
  rows: ResultRow[]
  state: InputsState
  dosageOverrides: Record<string, number>
  setDosageOverride: (id: string, v: number) => void
  onDownload: () => void
  bestId?: string
  opcBaselineId?: string
  sortKey: SortKey
  sortDir: SortDir
  onSortChange: (k: SortKey) => void
  search: string
  onSearch: (v: string) => void
  hideIncompatible: boolean
  onToggleHideIncompatible: (v: boolean) => void
  page: number
  totalPages: number
  onPageChange: (p: number) => void
  pageSize: number
  onPageSizeChange: (n: number) => void
  totalCount: number
}) {
  const Th = ({ k, children }: { k: SortKey; children: React.ReactNode }) => (
    <th onClick={() => onSortChange(k)} className="th-sort" role="button">
      <span>{children}</span>
      <span className={`sort-caret ${sortKey === k ? sortDir : ''}`} aria-hidden />
    </th>
  )

  return (
    <div className="card">
      <div className="card-head" style={{ gap: 12 }}>
        <h2 style={{ marginRight: 'auto' }}>Comparison</h2>

        {/* Controls: search, hide incompatible, page size, export */}
        <input
          className="input"
          style={{ width: 240 }}
          placeholder="Search: CEM type or standard…"
          value={search}
          onChange={(e) => onSearch(e.target.value)}
        />
        <label className="badge" title="Hide exposure-incompatible">
          <input
            type="checkbox"
            checked={hideIncompatible}
            onChange={(e) => onToggleHideIncompatible(e.target.checked)}
            style={{ marginRight: 6 }}
          />
          Hide incompatible
        </label>

        <select
          className="select"
          value={pageSize}
          onChange={(e) => onPageSizeChange(Number(e.target.value))}
          style={{ width: 110 }}
          title="Rows per page"
        >
          {[5,10,15,20,50].map(n => <option key={n} value={n}>{n}/page</option>)}
        </select>

        <button className="button" onClick={onDownload}>Export CSV</button>
      </div>

      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <Th k="cement">Cement</Th>
              <Th k="strength">Strength</Th>
              <Th k="clinker">Clinker</Th>
              <th>SCMs</th>
              <Th k="ef">EF (kgCO₂/kg)</Th>
              <Th k="dosage">Dosage (kg/m³)</Th>
              <Th k="a1a3">CO₂e A1–A3 (kg/m³)</Th>
              <Th k="a4">A4 (kg)</Th>
              <Th k="total">Total (element kg)</Th>
              <th>Exposure</th>
              <th>Notes</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td colSpan={11} className="small">No rows. Try different filters or search.</td></tr>
            ) : rows.map((r) => {
              const scms = r.cement.scms.map(s => `${s.type}:${Math.round(s.fraction*100)}%`).join('+') || 'None'
              const incompatible = !r.exposureCompatible
              const rowClass =
                (r.cement.id === bestId ? 'row-best ' : '') +
                (r.cement.id === opcBaselineId ? 'row-baseline ' : '') +
                (incompatible ? 'dimmed' : '')
              return (
                <tr key={r.cement.id} className={rowClass}>
                  <td>
                    <div className="cell-title">{r.cement.cement_type}</div>
                    <div className="small">{r.tags.map(t => <span key={t} className="tag">{t}</span>)}</div>
                  </td>
                  <td>{r.cement.strength_class} <span className="tag" style={{ marginLeft: 6 }}>{r.cement.early_strength}</span></td>
                  <td>{Math.round(r.cement.clinker_fraction * 100)}%</td>
                  <td>{scms}</td>
                  <td>{r.cement.co2e_per_kg_binder_A1A3.toFixed(3)}</td>
                  <td>
                    {state.dosageMode === 'perCement' ? (
                      <input
                        className="input"
                        style={{ width: 110 }}
                        type="number"
                        value={dosageOverrides[r.cement.id] ?? Math.round(r.dosageUsed)}
                        onChange={(e) => setDosageOverride(r.cement.id, Number(e.target.value) || 0)}
                      />
                    ) : (
                      <span>{formatNumber(r.dosageUsed)}</span>
                    )}
                  </td>
                  <td>{formatNumber(r.co2ePerM3_A1A3)}</td>
                  <td>{state.includeA4 ? formatNumber(r.a4Transport) : '—'}</td>
                  <td className="cell-strong">{formatNumber(r.totalElement)}</td>
                  <td>{r.exposureCompatible ? '✓' : 'Check'}</td>
                  <td className="small">{r.cement.notes}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination footer */}
      <div className="table-footer">
        <div className="small">{rows.length ? `Showing page ${page} of ${totalPages} · ${totalCount} total` : '—'}</div>
        <div className="pager">
          <button className="button" onClick={() => onPageChange(1)} disabled={page <= 1}>« First</button>
          <button className="button" onClick={() => onPageChange(page - 1)} disabled={page <= 1}>‹ Prev</button>
          <button className="button" onClick={() => onPageChange(page + 1)} disabled={page >= totalPages}>Next ›</button>
          <button className="button" onClick={() => onPageChange(totalPages)} disabled={page >= totalPages}>Last »</button>
        </div>
      </div>

      <div className="legend">
        <span className="legend-swatch best" /> Best (lowest)
        <span className="legend-swatch baseline" /> OPC baseline
        <span className="legend-swatch other" /> Others
      </div>
    </div>
  )
}
