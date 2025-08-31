import { ResultRow } from '../lib/types'
import { formatNumber } from '../lib/calc'
export default function BarChart({ rows }: { rows: ResultRow[] }) {
if (!rows.length) return null
const max = Math.max(...rows.map(r => r.totalElement))
return (
<div className="card">
<h2 style={{ fontSize: 18, fontWeight: 600, marginTop: 0 }}>Total CO₂e per element</h2>
<div style={{ display:'grid', gap: 12 }}>
{rows.map(r => {
const width = (r.totalElement / max) * 100
return (
<div key={r.cement.id}>
<div className="small" style={{ display:'flex', justifyContent:'space-between', marginBottom: 4 }}>
<span>{r.cement.cement_type}</span>
<span>{formatNumber(r.totalElement)} kg</span>
</div>
<div className="bar-bg"><div className="bar-fill" style={{ width: `${width}%` }} /></div>
</div>
)
})}
</div>
</div>
)
}
