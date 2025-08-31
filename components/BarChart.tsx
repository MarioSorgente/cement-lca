import { ResultRow } from '../lib/types'
import { formatNumber } from '../lib/calc'

export default function BarChart({
  rows, bestId, opcBaselineId, baselineEf, baselineLabel
}: {
  rows: ResultRow[]
  bestId?: string
  opcBaselineId?: string
  baselineEf?: number
  baselineLabel?: string
}) {
  if (!rows.length) return null

  const max = Math.max(...rows.map(r => r.totalElement))
  const w = 900, h = 380
  const m = { top: 10, right: 10, bottom: 100, left: 50 }
  const iw = w - m.left - m.right
  const ih = h - m.top - m.bottom
  const step = iw / rows.length
  const bar = step * 0.72

  const yTicks = 6
  const tickValues = Array.from({ length: yTicks + 1 }, (_, i) => Math.round((max * i) / yTicks))

  const colorFor = (pct: number) => {
    if (pct <= 0) return '#ef4444'        // red
    if (pct <= 10) return '#f59e0b'       // yellow
    if (pct <= 20) return '#22c55e'       // green
    return '#10b981'                       // deep green
  }

  const baselineText = baselineEf
    ? `Baseline (worst OPC): ${baselineLabel ?? '—'} · EF ${baselineEf.toFixed(2)} kg/kg`
    : 'Baseline: not available'

  return (
    <div className="card">
      <h2 style={{ fontSize: 18, fontWeight: 600, marginTop: 0, marginBottom: 4 }}>Total Element CO₂e Comparison</h2>
      <div className="small" style={{ marginBottom: 8, color: '#475569' }}>{baselineText}</div>

      <svg viewBox={`0 0 ${w} ${h}`} style={{ width: '100%', height: 'auto' }} role="img" aria-label="Bar chart of total CO2e">
        <g transform={`translate(${m.left},${m.top})`}>
          {/* Grid + y axis */}
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
            const fill = colorFor(r.gwpReductionPct)
            const label = r.gwpReductionPct >= 0
              ? `↓ ${r.gwpReductionPct.toFixed(0)}%`
              : `↑ ${Math.abs(r.gwpReductionPct).toFixed(0)}%`
            return (
              <g key={r.cement.id}>
                <rect x={x} y={y} width={bar} height={hBar} fill={fill} rx={4} />
                {/* Reduction labels on bars */}
                <text x={x + bar / 2} y={Math.max(12, y - 6)} textAnchor="middle" fontSize="11" fill="#475569">
                  {label}
                </text>
                {/* Tooltip */}
                <title>{`${r.cement.cement_type}
Total: ${formatNumber(r.totalElement)} kg
Reduction vs baseline: ${label}`}</title>
              </g>
            )
          })}

          {/* X labels */}
          {rows.map((r, i) => {
            const x = i * step + step / 2
            const label = r.cement.cement_type
            const isBest = r.cement.id === bestId
            const isBaseline = r.cement.id === opcBaselineId
            return (
              <g key={r.cement.id} transform={`translate(${x},${ih + 18}) rotate(-45)`}>
                <text fontSize="11" fill={isBest ? '#065f46' : isBaseline ? '#991b1b' : '#475569'} textAnchor="end">
                  {label}
                </text>
              </g>
            )
          })}
        </g>
      </svg>

      <div className="small" style={{ display:'flex', gap: 12, marginTop: 8, alignItems:'center' }}>
        <span className="chip chip-deepgreen" /> &gt;20% better
        <span className="chip chip-green" /> 10–20%
        <span className="chip chip-yellow" /> ≤10%
        <span className="chip chip-red" /> ≤0%
      </div>
    </div>
  )
}
