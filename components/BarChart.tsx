import { ResultRow } from '../lib/types'
import { formatNumber } from '../lib/calc'

export default function BarChart({
  rows, bestId, opcBaselineId
}: { rows: ResultRow[]; bestId?: string; opcBaselineId?: string }) {
  if (!rows.length) return null

  const max = Math.max(...rows.map(r => r.totalElement))
  const w = 900, h = 360
  const m = { top: 10, right: 10, bottom: 90, left: 50 }
  const iw = w - m.left - m.right
  const ih = h - m.top - m.bottom
  const step = iw / rows.length
  const bar = step * 0.72

  const yTicks = 6
  const tickValues = Array.from({ length: yTicks + 1 }, (_, i) => Math.round((max * i) / yTicks))

  const colorFor = (id: string) => {
    if (id === bestId) return '#10b981'       // green
    if (id === opcBaselineId) return '#ef4444' // red
    return '#22c55e'                          // mid green
  }

  return (
    <div className="card">
      <h2 style={{ fontSize: 18, fontWeight: 600, marginTop: 0 }}>Total Element CO₂e Comparison</h2>

      <svg viewBox={`0 0 ${w} ${h}`} style={{ width: '100%', height: 'auto' }} role="img" aria-label="Bar chart of total CO2e">
        {/* Y grid + axis */}
        <g transform={`translate(${m.left},${m.top})`}>
          {tickValues.map((tv, i) => {
            const y = ih - (tv / max) * ih
            return (
              <g key={i}>
                <line x1={0} x2={iw} y1={y} y2={y} stroke="#e5e7eb" />
                <text x={-8} y={y + 4} textAnchor="end" fontSize="11" fill="#475569">{tv}</text>
              </g>
            )
          })}

          {/* Bars */}
          {rows.map((r, i) => {
            const x = i * step + (step - bar) / 2
            const hBar = (r.totalElement / max) * ih
            const y = ih - hBar
            return (
              <g key={r.cement.id}>
                <rect x={x} y={y} width={bar} height={hBar} fill={colorFor(r.cement.id)} rx={4} />
                {/* Value label */}
                <title>{`${r.cement.cement_type}: ${formatNumber(r.totalElement)} kg`}</title>
              </g>
            )
          })}

          {/* X labels */}
          {rows.map((r, i) => {
            const x = i * step + step / 2
            const label = r.cement.cement_type
            return (
              <g key={r.cement.id} transform={`translate(${x},${ih + 16}) rotate(-45)`}>
                <text fontSize="11" fill="#475569" textAnchor="end">{label}</text>
              </g>
            )
          })}
        </g>
      </svg>

      <div className="small" style={{ display:'flex', gap: 12, marginTop: 8, alignItems:'center' }}>
        <span className="legend-swatch best" /> Best (lowest)
        <span className="legend-swatch baseline" /> OPC baseline
        <span className="legend-swatch other" /> Others
      </div>
    </div>
  )
}
