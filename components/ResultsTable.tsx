import { ResultRow, InputsState } from '../lib/types'
import { formatNumber } from '../lib/calc'

export default function ResultsTable({
  rows,
  state,
  dosageOverrides,
  setDosageOverride,
  onDownload,
  bestId,
  opcBaselineId
}: {
  rows: ResultRow[]
  state: InputsState
  dosageOverrides: Record<string, number>
  setDosageOverride: (id: string, v: number) => void
  onDownload: () => void
  bestId?: string
  opcBaselineId?: string
}) {
  if (!rows.length) return (
    <div className="card">
      <h2 style={{ fontSize: 18, fontWeight: 600, marginTop: 0 }}>Comparison</h2>
      <p className="small" style={{ marginTop: 8 }}>No matching cement types with current filters.</p>
    </div>
  )

  return (
    <div className="card">
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
        <h2 style={{ fontSize: 18, fontWeight: 600, margin: 0 }}>Comparison</h2>
        <button className="button" onClick={onDownload}>Export CSV</button>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table className="table">
          <thead>
            <tr>
              <th>Cement</th>
              <th>Strength</th>
              <th>Clinker</th>
              <th>SCMs</th>
              <th>EF (kgCO₂/kg)</th>
              <th>Dosage (kg/m³)</th>
              <th>CO₂e A1–A3 (kg/m³)</th>
              <th>A4 (kg)</th>
              <th>Total (element kg)</th>
              <th>Exposure</th>
              <th>Notes</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => {
              const scms = r.cement.scms.map(s => `${s.type}:${Math.round(s.fraction*100)}%`).join('+') || 'None'
              const rowStyle =
                r.cement.id === bestId ? 'row-best' :
                r.cement.id === opcBaselineId ? 'row-baseline' : ''

              return (
                <tr key={r.cement.id} className={rowStyle + (r.exposureCompatible ? '' : ' dimmed')}>
                  <td>
                    <div style={{ fontWeight: 600 }}>{r.cement.cement_type}</div>
                    <div className="small">
                      {r.tags.map(t => <span key={t} className="tag">{t}</span>)}
                    </div>
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
                  <td style={{ fontWeight: r.cement.id === bestId ? 700 : 500 }}>
                    {formatNumber(r.totalElement)}
                  </td>
                  <td>{r.exposureCompatible ? '✓' : 'Check'}</td>
                  <td className="small">{r.cement.notes}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <div className="small" style={{ display:'flex', gap: 12, marginTop: 12, alignItems:'center' }}>
        <span className="legend-swatch best" /> Best (lowest total)
        <span className="legend-swatch baseline" /> OPC baseline (highest OPC)
        <span className="legend-swatch other" /> Others
      </div>

      <p className="small" style={{ marginTop: 8 }}>
        A4 includes transport = volume × distance × factor (per cement).
      </p>
    </div>
  )
}
