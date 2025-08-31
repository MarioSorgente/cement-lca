import { ResultRow, InputsState } from '../lib/types'
import { formatNumber } from '../lib/calc'


export default function ResultsTable({ rows, state, dosageOverrides, setDosageOverride, onDownload }: { rows: ResultRow[]; state: InputsState; dosageOverrides: Record<string, number>; setDosageOverride: (id: string, v: number) => void; onDownload: () => void }) {
if (!rows.length) return null
const minTotal = Math.min(...rows.map(r => r.totalElement))
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
<th>Cement</th><th>Type</th><th>SCMs</th><th>Dosage (kg/m³)</th><th>CO₂e A1–A3 (kg/m³)</th><th>A4 (kg)</th><th>Total (element kg)</th><th>Exposure</th><th>Tags</th>
</tr>
</thead>
<tbody>
{rows.map((r) => {
const isBest = r.totalElement === minTotal
const scms = r.cement.scms.map(s => `${s.type}:${Math.round(s.fraction*100)}%`).join('+') || '—'
const rowClass = r.exposureCompatible ? '' : 'dimmed'
return (
<tr key={r.cement.id} className={rowClass}>
<td>
<div style={{ fontWeight: 600 }}>{r.cement.cement_type}</div>
<div className="small">{r.cement.strength_class} · {r.cement.early_strength} {isBest && <span className="badge" style={{ background:'#dcfce7', color:'#166534', marginLeft:8 }}>Lowest</span>}</div>
</td>
<td>{r.cement.standard}</td>
<td>{scms}</td>
<td>
{state.dosageMode === 'perCement' ? (
<input className="input" style={{ width: 110 }} type="number" value={dosageOverrides[r.cement.id] ?? Math.round(r.dosageUsed)} onChange={(e) => setDosageOverride(r.cement.id, Number(e.target.value) || 0)} />
) : (
<span>{formatNumber(r.dosageUsed)}</span>
)}
</td>
<td>{formatNumber(r.co2ePerM3_A1A3)}</td>
<td>{state.includeA4 ? formatNumber(r.a4Transport) : '—'}</td>
<td style={{ fontWeight: isBest ? 700 : 400, color: isBest ? '#166534' : undefined }}>{formatNumber(r.totalElement)}</td>
<td>{r.exposureCompatible ? <span className="badge">OK</span> : <span className="badge" style={{ background:'#fef3c7', color:'#92400e' }}>Check</span>}</td>
<td>
{r.tags.map(t => <span key={t} className="tag">{t}</span>)}
</td>
</tr>
)
})}
</tbody>
</table>
</div>
<p className="small" style={{ marginTop: 12 }}>Note: This teaching dataset uses indicative A1–A3 factors. Use supplier EPDs for projects.</p>
</div>
)
}
